import { ensureSchema, getDb } from "./db";
import { createDemoStore } from "./demo";
import type {
  Group,
  PilotEvent,
  Signup,
  Store,
  SurveyResponse,
  EventStatus,
  AttendanceCertainty,
  SignupStatus,
} from "./types";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function shouldSeedDemo(): boolean {
  if (process.env.SEED_DEMO === "true") return true;
  if (process.env.SEED_DEMO === "false") return false;
  return process.env.NODE_ENV !== "production";
}

function rowToEvent(row: Record<string, unknown>): PilotEvent {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    date: String(row.date),
    startTime: String(row.start_time ?? ""),
    venue: String(row.venue),
    meetingPoint: String(row.meeting_point),
    scheduleNotes: String(row.schedule_notes ?? ""),
    ticketUrl: String(row.ticket_url ?? ""),
    organizerContactName: String(row.organizer_contact_name ?? ""),
    organizerContactEmail: String(row.organizer_contact_email ?? ""),
    attendeeInstructions: String(row.attendee_instructions ?? ""),
    status: String(row.status) as EventStatus,
    surveyEntryToken: String(row.survey_entry_token ?? ""),
    reportToken: String(row.report_token ?? ""),
    createdAt: String(row.created_at),
  };
}

function rowToSignup(row: Record<string, unknown>): Signup {
  let comfortPreferences: string[] = [];
  try {
    comfortPreferences = JSON.parse(String(row.comfort_preferences ?? "[]"));
  } catch {
    comfortPreferences = [];
  }

  return {
    id: String(row.id),
    eventId: String(row.event_id),
    firstName: String(row.first_name),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : undefined,
    attendanceCertainty: String(row.attendance_certainty) as AttendanceCertainty,
    arrivalTime: String(row.arrival_time),
    preferredSession: row.preferred_session
      ? String(row.preferred_session)
      : undefined,
    preferredGroupSize: String(row.preferred_group_size) as Signup["preferredGroupSize"],
    comfortPreferences,
    willingConnector: Boolean(row.willing_connector),
    conductAcknowledged: Boolean(row.conduct_acknowledged),
    ageAcknowledged: Boolean(row.age_acknowledged),
    status: String(row.status) as SignupStatus,
    groupId: row.group_id ? String(row.group_id) : undefined,
    surveyToken: String(row.survey_token),
    createdAt: String(row.created_at),
  };
}

function rowToGroup(row: Record<string, unknown>): Group {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    name: String(row.name),
    meetingTime: String(row.meeting_time),
    meetingLocation: String(row.meeting_location),
    arrivalInstructions: String(row.arrival_instructions ?? ""),
    chatLink: row.chat_link ? String(row.chat_link) : undefined,
    connectorSignupId: row.connector_signup_id
      ? String(row.connector_signup_id)
      : undefined,
  };
}

function rowToSurvey(row: Record<string, unknown>): SurveyResponse {
  return {
    signupId: String(row.signup_id),
    eventId: String(row.event_id),
    metGroup: Boolean(row.met_group),
    madeAttendanceEasier: String(
      row.made_attendance_easier,
    ) as SurveyResponse["madeAttendanceEasier"],
    feltComfortableSafe: String(
      row.felt_comfortable_safe,
    ) as SurveyResponse["feltComfortableSafe"],
    wouldUseAgain: Boolean(row.would_use_again),
    interestedInFutureEvent: Boolean(row.interested_in_future_event),
    comments: row.comments ? String(row.comments) : undefined,
    submittedAt: String(row.submitted_at),
  };
}

async function insertEvent(event: PilotEvent): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO events (
      id, slug, name, date, start_time, venue, meeting_point, schedule_notes,
      ticket_url, organizer_contact_name, organizer_contact_email,
      attendee_instructions, status, created_at, survey_entry_token, report_token
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      event.id,
      event.slug,
      event.name,
      event.date,
      event.startTime,
      event.venue,
      event.meetingPoint,
      event.scheduleNotes,
      event.ticketUrl,
      event.organizerContactName,
      event.organizerContactEmail,
      event.attendeeInstructions,
      event.status,
      event.createdAt,
      event.surveyEntryToken,
      event.reportToken,
    ],
  });
}

async function insertSignup(signup: Signup): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO signups (
      id, event_id, first_name, email, phone, attendance_certainty, arrival_time,
      preferred_session, preferred_group_size, comfort_preferences, willing_connector,
      conduct_acknowledged, age_acknowledged, status, group_id, survey_token, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      signup.id,
      signup.eventId,
      signup.firstName,
      signup.email,
      signup.phone ?? null,
      signup.attendanceCertainty,
      signup.arrivalTime,
      signup.preferredSession ?? null,
      signup.preferredGroupSize,
      JSON.stringify(signup.comfortPreferences),
      signup.willingConnector ? 1 : 0,
      signup.conductAcknowledged ? 1 : 0,
      signup.ageAcknowledged ? 1 : 0,
      signup.status,
      signup.groupId ?? null,
      signup.surveyToken,
      signup.createdAt,
    ],
  });
}

async function insertGroup(group: Group): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO groups (
      id, event_id, name, meeting_time, meeting_location, arrival_instructions,
      chat_link, connector_signup_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      group.id,
      group.eventId,
      group.name,
      group.meetingTime,
      group.meetingLocation,
      group.arrivalInstructions,
      group.chatLink ?? null,
      group.connectorSignupId ?? null,
    ],
  });
}

async function seedDemoIfNeeded(): Promise<void> {
  if (!shouldSeedDemo()) return;

  const db = getDb();
  const count = await db.execute("SELECT COUNT(*) AS c FROM events");
  const existing = Number(count.rows[0]?.c ?? 0);
  if (existing > 0) return;

  const demo = createDemoStore();
  for (const event of demo.events) await insertEvent(event);
  for (const signup of demo.signups) await insertSignup(signup);
  for (const group of demo.groups) await insertGroup(group);
}

async function ready(): Promise<void> {
  await ensureSchema();
  await seedDemoIfNeeded();
}

export async function getStore(): Promise<Store> {
  await ready();
  const db = getDb();
  const [events, signups, groups, surveys] = await Promise.all([
    db.execute("SELECT * FROM events"),
    db.execute("SELECT * FROM signups"),
    db.execute("SELECT * FROM groups"),
    db.execute("SELECT * FROM surveys"),
  ]);

  return {
    events: events.rows.map((r) => rowToEvent(r as Record<string, unknown>)),
    signups: signups.rows.map((r) => rowToSignup(r as Record<string, unknown>)),
    groups: groups.rows.map((r) => rowToGroup(r as Record<string, unknown>)),
    surveys: surveys.rows.map((r) => rowToSurvey(r as Record<string, unknown>)),
  };
}

export async function getEventBySlug(slug: string): Promise<PilotEvent | null> {
  await ready();
  const result = await getDb().execute({
    sql: "SELECT * FROM events WHERE slug = ? LIMIT 1",
    args: [slug],
  });
  const row = result.rows[0];
  return row ? rowToEvent(row as Record<string, unknown>) : null;
}

export async function getEventBySurveyEntryToken(
  token: string,
): Promise<PilotEvent | null> {
  await ready();
  const result = await getDb().execute({
    sql: "SELECT * FROM events WHERE survey_entry_token = ? LIMIT 1",
    args: [token],
  });
  const row = result.rows[0];
  return row ? rowToEvent(row as Record<string, unknown>) : null;
}

export async function getEventByReportToken(
  token: string,
): Promise<PilotEvent | null> {
  await ready();
  const result = await getDb().execute({
    sql: "SELECT * FROM events WHERE report_token = ? LIMIT 1",
    args: [token],
  });
  const row = result.rows[0];
  return row ? rowToEvent(row as Record<string, unknown>) : null;
}

export async function findSignupByEventEmail(
  eventId: string,
  email: string,
): Promise<Signup | null> {
  await ready();
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const result = await getDb().execute({
    sql: `SELECT * FROM signups
          WHERE event_id = ? AND lower(trim(email)) = ?
          ORDER BY created_at ASC`,
    args: [eventId, normalized],
  });
  const signups = result.rows.map((row) =>
    rowToSignup(row as Record<string, unknown>),
  );
  if (signups.length === 0) return null;

  for (const signup of signups) {
    const existing = await getSurveyForSignup(signup.id);
    if (!existing) return signup;
  }
  return signups[0];
}

export async function getEventById(id: string): Promise<PilotEvent | null> {
  await ready();
  const result = await getDb().execute({
    sql: "SELECT * FROM events WHERE id = ? LIMIT 1",
    args: [id],
  });
  const row = result.rows[0];
  return row ? rowToEvent(row as Record<string, unknown>) : null;
}

export async function listEvents(): Promise<PilotEvent[]> {
  await ready();
  const result = await getDb().execute(
    "SELECT * FROM events ORDER BY date DESC",
  );
  return result.rows.map((r) => rowToEvent(r as Record<string, unknown>));
}

export async function getSignupsForEvent(eventId: string): Promise<Signup[]> {
  await ready();
  const result = await getDb().execute({
    sql: "SELECT * FROM signups WHERE event_id = ? ORDER BY created_at DESC",
    args: [eventId],
  });
  return result.rows.map((r) => rowToSignup(r as Record<string, unknown>));
}

export async function getGroupsForEvent(eventId: string): Promise<Group[]> {
  await ready();
  const result = await getDb().execute({
    sql: "SELECT * FROM groups WHERE event_id = ?",
    args: [eventId],
  });
  return result.rows.map((r) => rowToGroup(r as Record<string, unknown>));
}

export async function getSignupBySurveyToken(
  token: string,
): Promise<{ signup: Signup; event: PilotEvent } | null> {
  await ready();
  const db = getDb();
  const signupResult = await db.execute({
    sql: "SELECT * FROM signups WHERE survey_token = ? LIMIT 1",
    args: [token],
  });
  const signupRow = signupResult.rows[0];
  if (!signupRow) return null;
  const signup = rowToSignup(signupRow as Record<string, unknown>);
  const event = await getEventById(signup.eventId);
  if (!event) return null;
  return { signup, event };
}

export async function getSurveyForSignup(
  signupId: string,
): Promise<SurveyResponse | null> {
  await ready();
  const result = await getDb().execute({
    sql: "SELECT * FROM surveys WHERE signup_id = ? LIMIT 1",
    args: [signupId],
  });
  const row = result.rows[0];
  return row ? rowToSurvey(row as Record<string, unknown>) : null;
}

export async function createSignup(
  eventId: string,
  data: Omit<
    Signup,
    "id" | "eventId" | "status" | "surveyToken" | "createdAt" | "groupId"
  >,
): Promise<Signup> {
  await ready();
  const signup: Signup = {
    ...data,
    id: newId("sig"),
    eventId,
    status: "pending",
    surveyToken: newId("survey"),
    createdAt: new Date().toISOString(),
  };
  await insertSignup(signup);
  return signup;
}

export async function createEvent(
  data: Omit<
    PilotEvent,
    "id" | "createdAt" | "surveyEntryToken" | "reportToken"
  >,
): Promise<PilotEvent> {
  await ready();
  const event: PilotEvent = {
    ...data,
    id: newId("evt"),
    surveyEntryToken: crypto.randomUUID(),
    reportToken: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await insertEvent(event);
  return event;
}

export async function updateEvent(
  id: string,
  patch: Partial<PilotEvent>,
): Promise<PilotEvent | null> {
  await ready();
  const existing = await getEventById(id);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  await getDb().execute({
    sql: `UPDATE events SET
      slug = ?, name = ?, date = ?, start_time = ?, venue = ?, meeting_point = ?,
      schedule_notes = ?, ticket_url = ?, organizer_contact_name = ?,
      organizer_contact_email = ?, attendee_instructions = ?, status = ?
      WHERE id = ?`,
    args: [
      next.slug,
      next.name,
      next.date,
      next.startTime,
      next.venue,
      next.meetingPoint,
      next.scheduleNotes,
      next.ticketUrl,
      next.organizerContactName,
      next.organizerContactEmail,
      next.attendeeInstructions,
      next.status,
      id,
    ],
  });
  return next;
}

export async function updateSignup(
  id: string,
  patch: Partial<Signup>,
): Promise<Signup | null> {
  await ready();
  const result = await getDb().execute({
    sql: "SELECT * FROM signups WHERE id = ? LIMIT 1",
    args: [id],
  });
  const row = result.rows[0];
  if (!row) return null;
  const existing = rowToSignup(row as Record<string, unknown>);
  const next = { ...existing, ...patch };
  await getDb().execute({
    sql: `UPDATE signups SET
      first_name = ?, email = ?, phone = ?, attendance_certainty = ?, arrival_time = ?,
      preferred_session = ?, preferred_group_size = ?, comfort_preferences = ?,
      willing_connector = ?, conduct_acknowledged = ?, age_acknowledged = ?,
      status = ?, group_id = ?, survey_token = ?
      WHERE id = ?`,
    args: [
      next.firstName,
      next.email,
      next.phone ?? null,
      next.attendanceCertainty,
      next.arrivalTime,
      next.preferredSession ?? null,
      next.preferredGroupSize,
      JSON.stringify(next.comfortPreferences),
      next.willingConnector ? 1 : 0,
      next.conductAcknowledged ? 1 : 0,
      next.ageAcknowledged ? 1 : 0,
      next.status,
      next.groupId ?? null,
      next.surveyToken,
      id,
    ],
  });
  return next;
}

export async function createGroup(
  data: Omit<Group, "id">,
): Promise<Group> {
  await ready();
  const group: Group = { ...data, id: newId("grp") };
  await insertGroup(group);
  return group;
}

export async function updateGroup(
  id: string,
  patch: Partial<Group>,
): Promise<Group | null> {
  await ready();
  const result = await getDb().execute({
    sql: "SELECT * FROM groups WHERE id = ? LIMIT 1",
    args: [id],
  });
  const row = result.rows[0];
  if (!row) return null;
  const existing = rowToGroup(row as Record<string, unknown>);
  const next = { ...existing, ...patch };
  await getDb().execute({
    sql: `UPDATE groups SET
      name = ?, meeting_time = ?, meeting_location = ?, arrival_instructions = ?,
      chat_link = ?, connector_signup_id = ?
      WHERE id = ?`,
    args: [
      next.name,
      next.meetingTime,
      next.meetingLocation,
      next.arrivalInstructions,
      next.chatLink ?? null,
      next.connectorSignupId ?? null,
      id,
    ],
  });
  return next;
}

export async function assignSignupToGroup(
  signupId: string,
  groupId: string | null,
): Promise<void> {
  await ready();
  await getDb().execute({
    sql: "UPDATE signups SET group_id = ? WHERE id = ?",
    args: [groupId, signupId],
  });
}

export async function submitSurvey(
  data: Omit<SurveyResponse, "submittedAt">,
): Promise<SurveyResponse> {
  await ready();
  const response: SurveyResponse = {
    ...data,
    submittedAt: new Date().toISOString(),
  };
  await getDb().execute({
    sql: `INSERT INTO surveys (
      signup_id, event_id, met_group, made_attendance_easier, felt_comfortable_safe,
      would_use_again, interested_in_future_event, comments, submitted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(signup_id) DO UPDATE SET
      met_group = excluded.met_group,
      made_attendance_easier = excluded.made_attendance_easier,
      felt_comfortable_safe = excluded.felt_comfortable_safe,
      would_use_again = excluded.would_use_again,
      interested_in_future_event = excluded.interested_in_future_event,
      comments = excluded.comments,
      submitted_at = excluded.submitted_at`,
    args: [
      response.signupId,
      response.eventId,
      response.metGroup ? 1 : 0,
      response.madeAttendanceEasier,
      response.feltComfortableSafe,
      response.wouldUseAgain ? 1 : 0,
      response.interestedInFutureEvent ? 1 : 0,
      response.comments ?? null,
      response.submittedAt,
    ],
  });
  return response;
}

export type LikertCounts = {
  yes: number;
  somewhat: number;
  no: number;
};

export type EventSummary = {
  event: PilotEvent;
  totalSignups: number;
  confirmedCount: number;
  groupCount: number;
  assignedCount: number;
  surveyCount: number;
  metGroupYes: number;
  easier: LikertCounts;
  comfortable: LikertCounts;
  wouldUseAgain: number;
};

function countLikert(
  surveys: SurveyResponse[],
  key: "madeAttendanceEasier" | "feltComfortableSafe",
): LikertCounts {
  return {
    yes: surveys.filter((survey) => survey[key] === "yes").length,
    somewhat: surveys.filter((survey) => survey[key] === "somewhat").length,
    no: surveys.filter((survey) => survey[key] === "no").length,
  };
}

export async function getEventSummary(eventId: string): Promise<EventSummary | null> {
  const event = await getEventById(eventId);
  if (!event) return null;

  const [signups, groups] = await Promise.all([
    getSignupsForEvent(eventId),
    getGroupsForEvent(eventId),
  ]);
  const surveysResult = await getDb().execute({
    sql: "SELECT * FROM surveys WHERE event_id = ?",
    args: [eventId],
  });
  const surveys = surveysResult.rows.map((r) =>
    rowToSurvey(r as Record<string, unknown>),
  );

  return {
    event,
    totalSignups: signups.length,
    confirmedCount: signups.filter((s) => s.status === "confirmed").length,
    groupCount: groups.length,
    assignedCount: signups.filter((s) => s.groupId).length,
    surveyCount: surveys.length,
    metGroupYes: surveys.filter((s) => s.metGroup).length,
    easier: countLikert(surveys, "madeAttendanceEasier"),
    comfortable: countLikert(surveys, "feltComfortableSafe"),
    wouldUseAgain: surveys.filter((s) => s.wouldUseAgain).length,
  };
}
