import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, test } from "node:test";
import { createClient } from "@libsql/client";
import {
  RegistrationClosedError,
  isPastOrClosed,
  showAlreadyHappened,
} from "./registration";
import type { EventStatus } from "./types";

const dir = mkdtempSync(path.join(tmpdir(), "mmt-"));
const dbUrl = `file:${path.join(dir, "test.db")}`;
process.env.SEED_DEMO = "false";
process.env.TURSO_DATABASE_URL = dbUrl;
delete process.env.TURSO_AUTH_TOKEN;

type StoreApi = typeof import("./store.ts");
let store: StoreApi;

function eventInput(
  overrides: Partial<{
    name: string;
    slug: string;
    date: string;
    status: EventStatus;
    organizerId?: string;
  }> = {},
) {
  return {
    name: "Wednesday Run",
    slug: "wednesday-run",
    date: "2026-12-02",
    startTime: "6:00 PM",
    venue: "Park",
    meetingPoint: "Main gate",
    scheduleNotes: "",
    ticketUrl: "",
    organizerContactName: "",
    organizerContactEmail: "",
    attendeeInstructions: "",
    timezone: "America/Los_Angeles",
    status: "recruiting" as const,
    ...overrides,
  };
}

function signupInput(email = "ada@example.com") {
  return {
    firstName: "Ada",
    email,
    attendanceCertainty: "definitely" as const,
    arrivalTime: "5:45 PM",
    preferredGroupSize: "4" as const,
    comfortPreferences: [] as string[],
    willingConnector: false,
    conductAcknowledged: true,
    ageAcknowledged: true,
  };
}

before(async () => {
  const db = createClient({ url: dbUrl });
  await db.execute(`CREATE TABLE events (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL DEFAULT '',
    venue TEXT NOT NULL,
    meeting_point TEXT NOT NULL,
    schedule_notes TEXT NOT NULL DEFAULT '',
    ticket_url TEXT NOT NULL DEFAULT '',
    organizer_contact_name TEXT NOT NULL DEFAULT '',
    organizer_contact_email TEXT NOT NULL DEFAULT '',
    attendee_instructions TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);
  await db.execute(`INSERT INTO events (
    id, slug, name, date, start_time, venue, meeting_point, status, created_at
  ) VALUES (
    'evt_old', 'keep-slug', 'Keep', '2026-12-02', '6:00 PM', 'Hall', 'Door',
    'recruiting', '2026-01-01T00:00:00.000Z'
  )`);
  await db.execute(`CREATE TABLE signups (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    attendance_certainty TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    preferred_session TEXT,
    preferred_group_size TEXT NOT NULL,
    comfort_preferences TEXT NOT NULL DEFAULT '[]',
    willing_connector INTEGER NOT NULL DEFAULT 0,
    conduct_acknowledged INTEGER NOT NULL DEFAULT 0,
    age_acknowledged INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    group_id TEXT,
    survey_token TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  )`);
  await db.execute(`INSERT INTO signups (
    id, event_id, first_name, email, attendance_certainty, arrival_time,
    preferred_group_size, status, group_id, survey_token, created_at
  ) VALUES (
    'sig_old', 'evt_old', 'Maya', 'Maya@Example.com', 'definitely', '5:45 PM',
    '4', 'confirmed', 'grp_old', 'keep-token', '2026-01-02T00:00:00.000Z'
  )`);

  store = await import("./store");
  const event = await store.getEventById("evt_old");
  assert.equal(event?.name, "Keep");
  assert.equal(event?.slug, "keep-slug");
  assert.equal(event?.status, "recruiting");
  assert.equal(event?.timezone, "America/Los_Angeles");
  assert.equal(event?.organizerId, undefined);
  assert.ok(event?.surveyEntryToken);
  assert.ok(event?.reportToken);

  const signups = await store.getSignupsForEvent("evt_old");
  assert.equal(signups.length, 1);
  assert.equal(signups[0]?.email, "Maya@Example.com");
  assert.equal(signups[0]?.surveyToken, "keep-token");
  assert.equal(signups[0]?.status, "confirmed");
  assert.equal(signups[0]?.groupId, "grp_old");
  assert.equal(signups[0]?.normalizedEmail, "maya@example.com");
});

test("duplicate email on one event does not create another signup", async () => {
  const event = await store.createEvent(eventInput({ slug: "dup-event" }));
  const first = await store.createSignup(event.id, signupInput("Ada@Example.com"));
  const second = await store.createSignup(event.id, signupInput("ada@example.com"));
  assert.equal(first.outcome, "created");
  assert.equal(second.outcome, "duplicate");
  if (second.outcome === "duplicate" && first.outcome === "created") {
    assert.equal(second.signup.id, first.signup.id);
  }
  const rows = await store.getSignupsForEvent(event.id);
  assert.equal(rows.length, 1);
});

test("the same email can register for a different event", async () => {
  const other = await store.createEvent(eventInput({ slug: "other-event", name: "Other" }));
  const result = await store.createSignup(other.id, signupInput("ada@example.com"));
  assert.equal(result.outcome, "created");
});

test("closed events reject new signups", async () => {
  const past = await store.createEvent(
    eventInput({ slug: "past-event", date: "2020-01-01" }),
  );
  await assert.rejects(
    () => store.createSignup(past.id, signupInput("past@example.com")),
    RegistrationClosedError,
  );

  const cancelled = await store.createEvent(
    eventInput({ slug: "cancelled-event", status: "cancelled", date: "2026-12-09" }),
  );
  await assert.rejects(
    () => store.createSignup(cancelled.id, signupInput("cancel@example.com")),
    RegistrationClosedError,
  );

  const completed = await store.createEvent(
    eventInput({ slug: "completed-event", status: "completed", date: "2026-12-16" }),
  );
  await assert.rejects(
    () => store.createSignup(completed.id, signupInput("done@example.com")),
    RegistrationClosedError,
  );
});

test("admin lists separate a past open event from an upcoming one", () => {
  const pastOpen = {
    status: "recruiting" as const,
    date: "2020-01-01",
    timezone: "America/Los_Angeles",
  };
  const upcoming = {
    status: "recruiting" as const,
    date: "2026-12-02",
    timezone: "America/Los_Angeles",
  };
  const completed = {
    status: "completed" as const,
    date: "2026-12-16",
    timezone: "America/Los_Angeles",
  };
  assert.equal(isPastOrClosed(pastOpen), true);
  assert.equal(showAlreadyHappened(pastOpen), true);
  assert.equal(isPastOrClosed(upcoming), false);
  assert.equal(showAlreadyHappened(upcoming), false);
  assert.equal(isPastOrClosed(completed), true);
  assert.equal(showAlreadyHappened(completed), false);
});

test("organizer page lists only upcoming open events", async () => {
  const organizer = await store.createOrganizer({
    name: "Midnight Runners SF",
    slug: "midnight-runners-sf",
    description: "Weekly runs",
    city: "San Francisco",
    websiteUrl: "https://example.com",
    contactEmail: "crew@example.com",
  });
  const upcoming = await store.createEvent(
    eventInput({
      slug: "bootcamp-dec-2",
      name: "Wednesday Bootcamp",
      date: "2026-12-02",
      organizerId: organizer.id,
    }),
  );
  const past = await store.createEvent(
    eventInput({
      slug: "bootcamp-old",
      date: "2020-06-01",
      organizerId: organizer.id,
    }),
  );
  const cancelled = await store.createEvent(
    eventInput({
      slug: "bootcamp-cancelled",
      date: "2026-12-23",
      status: "cancelled",
      organizerId: organizer.id,
    }),
  );
  await store.setEventOrganizer(past.id, organizer.id);
  await store.setEventOrganizer(cancelled.id, organizer.id);

  const listed = await store.listUpcomingEventsForOrganizer(organizer.id);
  assert.deepEqual(
    listed.map((event) => event.id),
    [upcoming.id],
  );
  const saved = await store.getEventById(upcoming.id);
  assert.equal(saved?.slug, "bootcamp-dec-2");
});
