import { ensureSchema, getDb } from "./db";
import { createDemoStore } from "./demo";
import {
  DEFAULT_TIMEZONE,
  RegistrationClosedError,
  isUpcomingPublicEvent,
  normalizeEmail,
  registrationClosedReason,
} from "./registration";
import type {
  Group,
  PilotEvent,
  Organizer,
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
    organizerId: row.organizer_id ? String(row.organizer_id) : undefined,
    timezone: String(row.timezone || DEFAULT_TIMEZONE),
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
    normalizedEmail: String(
      row.normalized_email || normalizeEmail(String(row.email ?? "")),
    ),
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
      attendee_instructions, status, created_at, survey_entry_token, report_token,
      organizer_id, timezone
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      event.organizerId ?? null,
      event.timezone || DEFAULT_TIMEZONE,
    ],
  });
}

async function insertSignup(signup: Signup): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO signups (
      id, event_id, first_name, email, phone, attendance_certainty, arrival_time,
      preferred_session, preferred_group_size, comfort_preferences, willing_connector,
      conduct_acknowledged, age_acknowledged, status, group_id, survey_token, created_at,
      normalized_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      signup.normalizedEmail,
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

export type CreateSignupResult =
  | { outcome: "created"; signup: Signup }
  | { outcome: "duplicate"; signup: Signup };

export async function createSignup(
  eventId: string,
  data: Omit<
    Signup,
    | "id"
    | "eventId"
    | "status"
    | "surveyToken"
    | "createdAt"
    | "groupId"
    | "normalizedEmail"
  >,
): Promise<CreateSignupResult> {
  await ready();
  const event = await getEventById(eventId);
  if (!event) throw new Error("Event not found");
  const closed = registrationClosedReason(event);
  if (closed) throw new RegistrationClosedError(closed);

  const existing = await findSignupByEventEmail(eventId, data.email);
  if (existing) return { outcome: "duplicate", signup: existing };

  const signup: Signup = {
    ...data,
    normalizedEmail: normalizeEmail(data.email),
    id: newId("sig"),
    eventId,
    status: "pending",
    surveyToken: newId("survey"),
    createdAt: new Date().toISOString(),
  };
  try {
    await insertSignup(signup);
  } catch (error) {
    const again = await findSignupByEventEmail(eventId, data.email);
    if (again) return { outcome: "duplicate", signup: again };
    throw error;
  }
  return { outcome: "created", signup };
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
    timezone: data.timezone || DEFAULT_TIMEZONE,
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
      organizer_contact_email = ?, attendee_instructions = ?, status = ?,
      organizer_id = ?, timezone = ?
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
      next.organizerId ?? null,
      next.timezone || DEFAULT_TIMEZONE,
      id,
    ],
  });
  return next;
}

function rowToOrganizer(row: Record<string, unknown>): Organizer {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description ?? ""),
    city: String(row.city ?? ""),
    websiteUrl: String(row.website_url ?? ""),
    contactEmail: String(row.contact_email ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listOrganizers(): Promise<Organizer[]> {
  await ready();
  const result = await getDb().execute(
    "SELECT * FROM organizers ORDER BY name ASC",
  );
  return result.rows.map((row) => rowToOrganizer(row as Record<string, unknown>));
}

export async function getOrganizerById(id: string): Promise<Organizer | null> {
  await ready();
  const result = await getDb().execute({
    sql: "SELECT * FROM organizers WHERE id = ? LIMIT 1",
    args: [id],
  });
  const row = result.rows[0];
  return row ? rowToOrganizer(row as Record<string, unknown>) : null;
}

export async function getOrganizerBySlug(slug: string): Promise<Organizer | null> {
  await ready();
  const result = await getDb().execute({
    sql: "SELECT * FROM organizers WHERE slug = ? LIMIT 1",
    args: [slug],
  });
  const row = result.rows[0];
  return row ? rowToOrganizer(row as Record<string, unknown>) : null;
}

export async function createOrganizer(data: {
  name: string;
  slug: string;
  description: string;
  city: string;
  websiteUrl: string;
  contactEmail: string;
}): Promise<Organizer> {
  await ready();
  const taken = await getOrganizerBySlug(data.slug);
  if (taken) throw new Error("That URL is already in use.");
  const now = new Date().toISOString();
  const organizer: Organizer = {
    ...data,
    id: newId("org"),
    createdAt: now,
    updatedAt: now,
  };
  await getDb().execute({
    sql: `INSERT INTO organizers (
      id, name, slug, description, city, website_url, contact_email, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      organizer.id,
      organizer.name,
      organizer.slug,
      organizer.description,
      organizer.city,
      organizer.websiteUrl,
      organizer.contactEmail,
      organizer.createdAt,
      organizer.updatedAt,
    ],
  });
  return organizer;
}

export async function updateOrganizer(
  id: string,
  patch: Partial<Omit<Organizer, "id" | "slug" | "createdAt">>,
): Promise<Organizer | null> {
  await ready();
  const existing = await getOrganizerById(id);
  if (!existing) return null;
  const next: Organizer = {
    ...existing,
    ...patch,
    slug: existing.slug,
    updatedAt: new Date().toISOString(),
  };
  await getDb().execute({
    sql: `UPDATE organizers SET
      name = ?, description = ?, city = ?, website_url = ?, contact_email = ?, updated_at = ?
      WHERE id = ?`,
    args: [
      next.name,
      next.description,
      next.city,
      next.websiteUrl,
      next.contactEmail,
      next.updatedAt,
      id,
    ],
  });
  return next;
}

export async function setEventOrganizer(
  eventId: string,
  organizerId: string | null,
): Promise<void> {
  await ready();
  await getDb().execute({
    sql: "UPDATE events SET organizer_id = ? WHERE id = ?",
    args: [organizerId, eventId],
  });
}

export async function listUpcomingEventsForOrganizer(
  organizerId: string,
  now: Date = new Date(),
): Promise<PilotEvent[]> {
  const events = await listEvents();
  return events
    .filter(
      (event) =>
        event.organizerId === organizerId && isUpcomingPublicEvent(event, now),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
    );
}

export async function createNextEvent(
  sourceId: string,
  date: string,
  slug: string,
): Promise<PilotEvent> {
  const source = await getEventById(sourceId);
  if (!source) throw new Error("Event not found");
  const taken = await getEventBySlug(slug);
  if (taken) throw new Error("That event URL is already in use.");
  return createEvent({
    name: source.name,
    slug,
    date,
    startTime: source.startTime,
    venue: source.venue,
    meetingPoint: source.meetingPoint,
    scheduleNotes: source.scheduleNotes,
    ticketUrl: source.ticketUrl,
    organizerContactName: source.organizerContactName,
    organizerContactEmail: source.organizerContactEmail,
    attendeeInstructions: source.attendeeInstructions,
    organizerId: source.organizerId,
    timezone: source.timezone,
    status: "recruiting",
  });
}

export type AttentionItem = {
  kind: "unassigned" | "declined-in-crew" | "duplicate";
  eventId: string;
  eventName: string;
  detail: string;
};

export async function listDuplicateSignups(): Promise<
  { eventId: string; email: string; count: number }[]
> {
  await ready();
  const result = await getDb().execute(
    `SELECT event_id, normalized_email, COUNT(*) AS c
     FROM signups
     WHERE normalized_email IS NOT NULL AND normalized_email != ''
     GROUP BY event_id, normalized_email
     HAVING COUNT(*) > 1`,
  );
  return result.rows.map((row) => ({
    eventId: String(row.event_id),
    email: String(row.normalized_email),
    count: Number(row.c),
  }));
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
