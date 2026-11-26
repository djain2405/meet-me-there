import { ensureSchema, getDb } from "./db";
import { deliverEmail, emailProviderConfigured } from "./emailDelivery";
import {
  activeCrewMembers,
  attendanceAsk,
  attendanceNudge,
  crewIntroduction,
  dueScheduledKind,
  eventStartUtc,
  groupReminder,
  signupConfirmation,
  type CrewMail,
} from "./emailCopy";
import type {
  Communication,
  CommunicationKind,
  Group,
  PilotEvent,
  Signup,
} from "./types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

export async function queueSignupConfirmation(event: PilotEvent, signup: Signup): Promise<void> {
  if (!event.emailSignupConfirmation) return;
  if (!emailProviderConfigured()) return;
  await readyMail();
  const mail = await crewMail(event, signup, await loadEventSignups(event.id), await loadGroups(event.id));
  await enqueue(event.id, signup, "signup_confirmation", signupConfirmation(mail), signup.groupId);
}

export async function processDueEmails(now: Date = new Date()): Promise<{ skipped: boolean; queued: number }> {
  if (!emailProviderConfigured()) return { skipped: true, queued: 0 };
  await readyMail();
  const events = await loadEvents();
  let queued = 0;
  for (const event of events) {
    const start = eventStartUtc(event);
    if (!start) continue;
    const kind = dueScheduledKind(start, now);
    if (!kind) continue;
    if (kind === "attendance_ask" && !event.emailAttendanceAsk) continue;
    if (kind === "attendance_nudge" && !event.emailAttendanceNudge) continue;
    if (kind === "group_reminder" && !event.emailGroupReminder) continue;
    if (event.status === "cancelled" || event.status === "completed" || event.status === "draft") {
      continue;
    }
    const signups = await loadEventSignups(event.id);
    const groups = await loadGroups(event.id);
    for (const signup of signups) {
      if (!eligible(signup, kind)) continue;
      const mail = await crewMail(event, signup, signups, groups);
      const copy =
        kind === "attendance_ask"
          ? attendanceAsk(mail)
          : kind === "attendance_nudge"
            ? attendanceNudge(mail)
            : groupReminder(mail);
      const saved = await enqueue(event.id, signup, kind, copy, signup.groupId);
      if (saved) queued += 1;
    }
  }
  return { skipped: false, queued };
}

export async function previewCrewIntroduction(groupId: string): Promise<{
  recipients: { firstName: string; email: string }[];
  messages: { firstName: string; subject: string; body: string }[];
} | null> {
  await readyMail();
  const built = await introductionMails(groupId);
  if (!built) return null;
  return {
    recipients: built.map((mail) => ({
      firstName: mail.person.firstName,
      email: mail.person.email,
    })),
    messages: built.map((mail) => ({
      firstName: mail.person.firstName,
      ...crewIntroduction(mail),
    })),
  };
}

export async function sendCrewIntroduction(groupId: string): Promise<{ queued: number; skipped: boolean }> {
  if (!emailProviderConfigured()) return { queued: 0, skipped: true };
  await readyMail();
  const built = await introductionMails(groupId);
  if (!built) return { queued: 0, skipped: false };
  let queued = 0;
  for (const mail of built) {
    const saved = await enqueue(
      mail.event.id,
      mail.person,
      "crew_introduction",
      crewIntroduction(mail),
      mail.group?.id,
    );
    if (saved) queued += 1;
  }
  return { queued, skipped: false };
}

export async function listCommunications(eventId: string): Promise<Communication[]> {
  await readyMail();
  const result = await getDb().execute({
    sql: `SELECT * FROM communications WHERE event_id = ? ORDER BY created_at DESC`,
    args: [eventId],
  });
  return result.rows.map((row) => ({
    id: String(row.id),
    eventId: String(row.event_id),
    signupId: row.signup_id ? String(row.signup_id) : undefined,
    groupId: row.group_id ? String(row.group_id) : undefined,
    kind: String(row.kind) as CommunicationKind,
    recipientEmail: String(row.recipient_email),
    subject: String(row.subject),
    body: String(row.body),
    status: String(row.status) as Communication["status"],
    failureReason: row.failure_reason ? String(row.failure_reason) : undefined,
    createdAt: String(row.created_at),
    sentAt: row.sent_at ? String(row.sent_at) : undefined,
  }));
}

async function introductionMails(groupId: string): Promise<CrewMail[] | null> {
  const group = await loadGroup(groupId);
  if (!group) return null;
  const event = await loadEvent(group.eventId);
  if (!event) return null;
  const signups = await loadEventSignups(event.id);
  const members = activeCrewMembers(signups, group.id);
  const groups = [group];
  const mails: CrewMail[] = [];
  for (const person of members) {
    mails.push(await crewMail(event, person, signups, groups));
  }
  return mails;
}

function eligible(signup: Signup, kind: "attendance_ask" | "attendance_nudge" | "group_reminder"): boolean {
  if (signup.status === "declined" || signup.status === "no-show") return false;
  if (signup.attendanceReply === "declined") return false;
  if (kind === "group_reminder") {
    return signup.attendanceReply === "coming" && Boolean(signup.groupId);
  }
  return !signup.attendanceReply;
}

async function crewMail(
  event: PilotEvent,
  person: Signup,
  signups: Signup[],
  groups: Group[],
): Promise<CrewMail> {
  const group = groups.find((item) => item.id === person.groupId);
  const crew = group ? activeCrewMembers(signups, group.id) : [];
  const connector = crew.find((member) => member.id === group?.connectorSignupId);
  const token = await ensureAttendanceToken(person.id);
  return {
    person,
    event,
    group,
    crew,
    connector,
    attendanceUrl: `${siteUrl}/a/${token}`,
  };
}

async function enqueue(
  eventId: string,
  signup: Signup,
  kind: CommunicationKind,
  copy: { subject: string; body: string },
  groupId?: string,
): Promise<boolean> {
  const db = getDb();
  const existing = await db.execute({
    sql: `SELECT id FROM communications
          WHERE event_id = ? AND signup_id = ? AND kind = ? AND IFNULL(group_id, '') = ?
            AND status IN ('queued', 'sent')
          LIMIT 1`,
    args: [eventId, signup.id, kind, groupId ?? ""],
  });
  if (existing.rows[0]) return false;

  const id = `msg_${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO communications (
      id, event_id, signup_id, group_id, kind, recipient_email, subject, body, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?)`,
    args: [
      id,
      eventId,
      signup.id,
      groupId ?? null,
      kind,
      signup.email,
      copy.subject,
      copy.body,
      createdAt,
    ],
  });

  const result = await deliverEmail({
    to: signup.email,
    subject: copy.subject,
    body: copy.body,
  });
  await db.execute({
    sql: `UPDATE communications
          SET status = ?, failure_reason = ?, sent_at = ?
          WHERE id = ?`,
    args: [
      result.ok ? "sent" : "failed",
      result.ok ? null : result.reason,
      result.ok ? new Date().toISOString() : null,
      id,
    ],
  });
  return true;
}

async function ensureAttendanceToken(signupId: string): Promise<string> {
  const db = getDb();
  const current = await db.execute({
    sql: "SELECT attendance_token FROM signups WHERE id = ? LIMIT 1",
    args: [signupId],
  });
  const existing = String(current.rows[0]?.attendance_token ?? "");
  if (existing) return existing;
  const token = crypto.randomUUID();
  await db.execute({
    sql: `UPDATE signups SET attendance_token = ?
          WHERE id = ? AND (attendance_token IS NULL OR attendance_token = '')`,
    args: [token, signupId],
  });
  const saved = await db.execute({
    sql: "SELECT attendance_token FROM signups WHERE id = ? LIMIT 1",
    args: [signupId],
  });
  return String(saved.rows[0]?.attendance_token ?? token);
}

async function readyMail(): Promise<void> {
  await ensureSchema();
}

async function loadEvents(): Promise<PilotEvent[]> {
  const result = await getDb().execute("SELECT * FROM events");
  return result.rows.map((row) => rowToEvent(row as Record<string, unknown>));
}

async function loadEvent(id: string): Promise<PilotEvent | null> {
  const result = await getDb().execute({
    sql: "SELECT * FROM events WHERE id = ? LIMIT 1",
    args: [id],
  });
  const row = result.rows[0];
  return row ? rowToEvent(row as Record<string, unknown>) : null;
}

async function loadEventSignups(eventId: string): Promise<Signup[]> {
  const result = await getDb().execute({
    sql: "SELECT * FROM signups WHERE event_id = ?",
    args: [eventId],
  });
  return result.rows.map((row) => rowToSignup(row as Record<string, unknown>));
}

async function loadGroups(eventId: string): Promise<Group[]> {
  const result = await getDb().execute({
    sql: "SELECT * FROM groups WHERE event_id = ?",
    args: [eventId],
  });
  return result.rows.map((row) => rowToGroup(row as Record<string, unknown>));
}

async function loadGroup(id: string): Promise<Group | null> {
  const result = await getDb().execute({
    sql: "SELECT * FROM groups WHERE id = ? LIMIT 1",
    args: [id],
  });
  const row = result.rows[0];
  return row ? rowToGroup(row as Record<string, unknown>) : null;
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
    timezone: String(row.timezone || "America/Los_Angeles"),
    status: String(row.status) as PilotEvent["status"],
    emailSignupConfirmation: Boolean(Number(row.email_signup_confirmation ?? 0)),
    emailAttendanceAsk: Boolean(Number(row.email_attendance_ask ?? 0)),
    emailAttendanceNudge: Boolean(Number(row.email_attendance_nudge ?? 0)),
    emailGroupReminder: Boolean(Number(row.email_group_reminder ?? 0)),
    surveyEntryToken: String(row.survey_entry_token ?? ""),
    reportToken: String(row.report_token ?? ""),
    createdAt: String(row.created_at),
  };
}

function rowToSignup(row: Record<string, unknown>): Signup {
  const reply = String(row.attendance_reply ?? "");
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    firstName: String(row.first_name),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : undefined,
    attendanceCertainty: String(row.attendance_certainty) as Signup["attendanceCertainty"],
    arrivalTime: String(row.arrival_time),
    preferredGroupSize: String(row.preferred_group_size) as Signup["preferredGroupSize"],
    comfortPreferences: [],
    willingConnector: Boolean(row.willing_connector),
    conductAcknowledged: Boolean(row.conduct_acknowledged),
    ageAcknowledged: Boolean(row.age_acknowledged),
    status: String(row.status) as Signup["status"],
    attendanceReply: reply === "coming" || reply === "declined" ? reply : undefined,
    attendanceToken: row.attendance_token ? String(row.attendance_token) : undefined,
    previousGroupId: row.previous_group_id ? String(row.previous_group_id) : undefined,
    groupId: row.group_id ? String(row.group_id) : undefined,
    surveyToken: String(row.survey_token),
    normalizedEmail: String(row.normalized_email ?? ""),
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
    connectorSignupId: row.connector_signup_id ? String(row.connector_signup_id) : undefined,
  };
}
