import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, test } from "node:test";
import {
  attendanceAsk,
  eventStartUtc,
  groupReminder,
} from "./emailCopy";
import type { PilotEvent, Signup } from "./types";

const dir = mkdtempSync(path.join(tmpdir(), "mmt-mail-"));
process.env.SEED_DEMO = "false";
process.env.TURSO_DATABASE_URL = `file:${path.join(dir, "test.db")}`;
delete process.env.TURSO_AUTH_TOKEN;
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_FROM;

type StoreApi = typeof import("./store");
type QueueApi = typeof import("./emailQueue");
let store: StoreApi;
let queue: QueueApi;

const baseEvent = {
  name: "Wednesday Run",
  slug: "wednesday-run",
  date: "2026-12-02",
  startTime: "6:00 PM",
  venue: "Park",
  meetingPoint: "Main gate",
  scheduleNotes: "",
  ticketUrl: "https://example.com/run",
  organizerContactName: "Jordan",
  organizerContactEmail: "crew@example.com",
  attendeeInstructions: "",
  timezone: "America/Los_Angeles",
  status: "recruiting" as const,
};

function person(overrides: Partial<Signup> = {}): Signup {
  return {
    id: "sig_ada",
    eventId: "evt",
    firstName: "Ada",
    email: "ada@example.com",
    phone: "555-0100",
    attendanceCertainty: "definitely",
    arrivalTime: "5:45 PM",
    preferredGroupSize: "4",
    comfortPreferences: [],
    willingConnector: false,
    conductAcknowledged: true,
    ageAcknowledged: true,
    status: "confirmed",
    surveyToken: "survey-ada",
    normalizedEmail: "ada@example.com",
    createdAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

before(async () => {
  store = await import("./store");
  queue = await import("./emailQueue");
});

test("a crewed note names the group and leaves out contact details", () => {
  const event = { ...baseEvent, id: "evt" } as PilotEvent;
  const ada = person();
  const bea = person({
    id: "sig_bea",
    firstName: "Bea",
    email: "bea@example.com",
    phone: "555-0199",
    groupId: "grp_1",
  });
  ada.groupId = "grp_1";
  const copy = attendanceAsk({
    person: ada,
    event,
    group: {
      id: "grp_1",
      eventId: "evt",
      name: "Group 1",
      meetingTime: "5:50 PM",
      meetingLocation: "The oak tree",
      arrivalInstructions: "Look for the teal sign",
      connectorSignupId: "sig_bea",
    },
    crew: [ada, bea],
    connector: bea,
    attendanceUrl: "https://example.com/a/token",
  });
  assert.match(copy.subject, /Group 1/);
  assert.match(copy.body, /Bea/);
  assert.match(copy.body, /The oak tree/);
  assert.match(copy.body, /teal sign/);
  assert.equal(copy.body.includes("bea@example.com"), false);
  assert.equal(copy.body.includes("555-0199"), false);
});

test("an unassigned ask does not invent a crew", () => {
  const event = { ...baseEvent, id: "evt" } as PilotEvent;
  const copy = attendanceAsk({
    person: person(),
    event,
    crew: [],
    attendanceUrl: "https://example.com/a/token",
  });
  assert.match(copy.body, /not assigned yet/);
  assert.equal(copy.body.includes("With:"), false);
});

test("the last reminder is only the group note", () => {
  const event = { ...baseEvent, id: "evt" } as PilotEvent;
  const ada = person({ groupId: "grp_1", attendanceReply: "coming" });
  const copy = groupReminder({
    person: ada,
    event,
    group: {
      id: "grp_1",
      eventId: "evt",
      name: "Group 1",
      meetingTime: "5:50 PM",
      meetingLocation: "The oak tree",
      arrivalInstructions: "",
    },
    crew: [ada, person({ id: "sig_bea", firstName: "Bea", email: "bea@example.com", groupId: "grp_1" })],
    attendanceUrl: "https://example.com/a/token",
  });
  assert.match(copy.body, /meetup note for Group 1/);
  assert.match(copy.body, /Bea/);
});

test("switches stay off and do not create email attempts", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "Meet Me There <hello@example.com>";
  const event = await store.createEvent({ ...baseEvent, slug: "off-event" });
  const start = eventStartUtc(event);
  assert.ok(start);
  const created = await store.createSignup(event.id, {
    firstName: "Ada",
    email: "ada@example.com",
    attendanceCertainty: "definitely",
    arrivalTime: "5:45 PM",
    preferredGroupSize: "4",
    comfortPreferences: [],
    willingConnector: false,
    conductAcknowledged: true,
    ageAcknowledged: true,
  });
  assert.equal(created.outcome, "created");
  const due = await queue.processDueEmails(new Date(start.getTime() - 23 * 3_600_000));
  assert.equal(due.skipped, false);
  assert.equal(due.queued, 0);
  assert.equal((await queue.listCommunications(event.id)).length, 0);
  if (created.outcome === "created") {
    assert.equal(created.signup.status, "pending");
  }
});

test("an enabled ask is queued without changing the signup status", async () => {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) => {
    calls.push(String(url));
    return new Response("{}", { status: 200 });
  }) as typeof fetch;

  const event = await store.createEvent({ ...baseEvent, slug: "ask-event", date: "2026-12-09" });
  await store.updateEmailSettings(event.id, {
    emailSignupConfirmation: false,
    emailAttendanceAsk: true,
    emailAttendanceNudge: false,
    emailGroupReminder: false,
  });
  const created = await store.createSignup(event.id, {
    firstName: "Ada",
    email: "ada-ask@example.com",
    attendanceCertainty: "definitely",
    arrivalTime: "5:45 PM",
    preferredGroupSize: "4",
    comfortPreferences: [],
    willingConnector: false,
    conductAcknowledged: true,
    ageAcknowledged: true,
  });
  assert.equal(created.outcome, "created");
  const saved = await store.getEventById(event.id);
  const start = eventStartUtc(saved!);
  assert.ok(start);
  await queue.processDueEmails(new Date(start.getTime() - 23 * 3_600_000));
  await queue.processDueEmails(new Date(start.getTime() - 23 * 3_600_000));
  const log = await queue.listCommunications(event.id);
  assert.equal(log.length, 1);
  assert.equal(log[0]?.kind, "attendance_ask");
  assert.equal(log[0]?.status, "sent");
  assert.match(log[0]?.body ?? "", /not assigned yet/);
  const signup = await store.getSignupsForEvent(event.id);
  assert.equal(signup[0]?.status, "pending");
  assert.equal(signup[0]?.attendanceReply, undefined);
  assert.equal(calls.length, 1);

  globalThis.fetch = original;
});

test("a decline keeps the old crew and the admin status", async () => {
  const event = await store.createEvent({ ...baseEvent, slug: "decline-event", date: "2026-12-16" });
  const created = await store.createSignup(event.id, {
    firstName: "Ada",
    email: "ada-decline@example.com",
    attendanceCertainty: "definitely",
    arrivalTime: "5:45 PM",
    preferredGroupSize: "4",
    comfortPreferences: [],
    willingConnector: false,
    conductAcknowledged: true,
    ageAcknowledged: true,
  });
  assert.equal(created.outcome, "created");
  if (created.outcome !== "created") return;
  await store.updateSignup(created.signup.id, { status: "confirmed" });
  const group = await store.createGroup({
    eventId: event.id,
    name: "Group 1",
    meetingTime: "5:50 PM",
    meetingLocation: "The oak tree",
    arrivalInstructions: "",
  });
  await store.assignSignupToGroup(created.signup.id, group.id);
  const token = "reply-token-decline";
  const { getDb } = await import("./db");
  await getDb().execute({
    sql: "UPDATE signups SET attendance_token = ? WHERE id = ?",
    args: [token, created.signup.id],
  });
  const before = await store.getSignupByAttendanceToken(token);
  assert.equal(before?.status, "confirmed");
  assert.equal(before?.attendanceReply, undefined);
  const after = await store.recordAttendanceReply(token, "declined");
  assert.equal(after?.status, "confirmed");
  assert.equal(after?.attendanceReply, "declined");
  assert.equal(after?.groupId, undefined);
  assert.equal(after?.previousGroupId, group.id);
});

test("the group reminder goes only to someone who is coming and already in a crew", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "Meet Me There <hello@example.com>";
  globalThis.fetch = (async () => new Response("{}", { status: 200 })) as typeof fetch;
  const event = await store.createEvent({ ...baseEvent, slug: "group-reminder", date: "2026-12-30" });
  await store.updateEmailSettings(event.id, {
    emailSignupConfirmation: false,
    emailAttendanceAsk: false,
    emailAttendanceNudge: false,
    emailGroupReminder: true,
  });
  const created = await store.createSignup(event.id, {
    firstName: "Ada",
    email: "ada-group@example.com",
    attendanceCertainty: "definitely",
    arrivalTime: "5:45 PM",
    preferredGroupSize: "4",
    comfortPreferences: [],
    willingConnector: false,
    conductAcknowledged: true,
    ageAcknowledged: true,
  });
  assert.equal(created.outcome, "created");
  if (created.outcome !== "created") return;
  const saved = await store.getEventById(event.id);
  const start = eventStartUtc(saved!);
  await queue.processDueEmails(new Date(start!.getTime() - 90 * 60_000));
  assert.equal((await queue.listCommunications(event.id)).length, 0);

  const group = await store.createGroup({
    eventId: event.id,
    name: "Group 1",
    meetingTime: "5:50 PM",
    meetingLocation: "The oak tree",
    arrivalInstructions: "Look for the teal sign",
  });
  await store.assignSignupToGroup(created.signup.id, group.id);
  const { getDb } = await import("./db");
  await getDb().execute({
    sql: "UPDATE signups SET attendance_reply = 'coming' WHERE id = ?",
    args: [created.signup.id],
  });
  await queue.processDueEmails(new Date(start!.getTime() - 90 * 60_000));
  const log = await queue.listCommunications(event.id);
  assert.equal(log.length, 1);
  assert.equal(log[0]?.kind, "group_reminder");
  assert.match(log[0]?.body ?? "", /Group 1/);
  assert.match(log[0]?.body ?? "", /oak tree/);
  const signup = await store.getSignupsForEvent(event.id);
  assert.equal(signup[0]?.status, "pending");
});

test("no provider means an enabled switch still sends nothing", async () => {
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  const event = await store.createEvent({ ...baseEvent, slug: "no-provider", date: "2026-12-23" });
  await store.updateEmailSettings(event.id, {
    emailSignupConfirmation: true,
    emailAttendanceAsk: true,
    emailAttendanceNudge: true,
    emailGroupReminder: true,
  });
  await store.createSignup(event.id, {
    firstName: "Ada",
    email: "ada-noconfig@example.com",
    attendanceCertainty: "definitely",
    arrivalTime: "5:45 PM",
    preferredGroupSize: "4",
    comfortPreferences: [],
    willingConnector: false,
    conductAcknowledged: true,
    ageAcknowledged: true,
  });
  const saved = await store.getEventById(event.id);
  const start = eventStartUtc(saved!);
  const due = await queue.processDueEmails(new Date(start!.getTime() - 90 * 60_000));
  assert.equal(due.skipped, true);
  assert.equal((await queue.listCommunications(event.id)).length, 0);
});
