import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, test } from "node:test";
import { cleanUtm } from "./attribution";
import { visitMetrics } from "./growth";
import { buildQrResponse } from "./qr";

const dir = mkdtempSync(path.join(tmpdir(), "mmt-r3-"));
process.env.SEED_DEMO = "false";
process.env.TURSO_DATABASE_URL = `file:${path.join(dir, "test.db")}`;
delete process.env.TURSO_AUTH_TOKEN;
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_FROM;

type StoreApi = typeof import("./store");
type GrowthApi = typeof import("./growth");
type ReturningApi = typeof import("./returning");
let store: StoreApi;
let growth: GrowthApi;
let returning: ReturningApi;

const eventInput = {
  name: "Wednesday Run",
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
};

const person = {
  firstName: "Ada",
  email: "ada@example.com",
  attendanceCertainty: "definitely" as const,
  arrivalTime: "5:45 PM",
  preferredGroupSize: "4" as const,
  comfortPreferences: ["women-only"],
  willingConnector: true,
  conductAcknowledged: true,
  ageAcknowledged: true,
};

before(async () => {
  store = await import("./store");
  growth = await import("./growth");
  returning = await import("./returning");
});

test("signup source keeps allowed labels and drops anything else", async () => {
  assert.equal(cleanUtm("instagram"), "instagram");
  assert.equal(cleanUtm("  "), undefined);
  assert.equal(cleanUtm("<script>"), undefined);
  const event = await store.createEvent({ ...eventInput, slug: "source-run" });
  const created = await store.createSignup(event.id, {
    ...person,
    utmSource: cleanUtm("instagram"),
    utmMedium: cleanUtm("social"),
    utmCampaign: cleanUtm("story"),
  });
  assert.equal(created.outcome, "created");
  const saved = await store.getSignupsForEvent(event.id);
  assert.equal(saved[0]?.utmSource, "instagram");
  assert.equal(saved[0]?.utmMedium, "social");
  assert.equal(saved[0]?.status, "pending");
});

test("a QR download requires an admin and stays on this site", async () => {
  const site = "http://127.0.0.1:3000";
  const denied = await buildQrResponse(false, `${site}/e/source-run`, site);
  assert.equal(denied.status, 401);
  const foreign = await buildQrResponse(true, "https://example.com/e/source-run", site);
  assert.equal(foreign.status, 400);
  const ok = await buildQrResponse(true, `${site}/c/local-run-club?utm_source=instagram`, site);
  assert.equal(ok.status, 200);
  assert.equal(ok.contentType, "image/png");
  assert.ok(Buffer.isBuffer(ok.body));
});

test("the report keeps admin confirmed apart from I'm coming", async () => {
  const event = await store.createEvent({ ...eventInput, slug: "report-run", date: "2026-12-09" });
  const created = await store.createSignup(event.id, {
    ...person,
    email: "ada-report@example.com",
  });
  assert.equal(created.outcome, "created");
  if (created.outcome !== "created") return;
  await store.updateSignup(created.signup.id, { status: "confirmed" });
  const summary = await store.getEventSummary(event.id);
  assert.equal(summary?.adminConfirmedCount, 1);
  assert.equal(summary?.comingCount, 0);
  assert.equal(summary?.attendanceUnknownCount, 1);
  assert.equal(summary?.meetupUnknownCount, 1);
  assert.equal(summary?.metGroupNo, 0);
  assert.equal(summary?.absentCount, 0);
});

test("a closed visit counts as a page load and not a registration start", () => {
  assert.deepEqual(visitMetrics(false), ["page_load"]);
  assert.deepEqual(visitMetrics(true), ["page_load", "registration_start"]);
});

test("a return request looks the same for a known and an unknown email", async () => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "Meet Me There <hello@example.com>";
  globalThis.fetch = (async () => new Response("{}", { status: 200 })) as typeof fetch;
  const event = await store.createEvent({ ...eventInput, slug: "return-run", date: "2026-12-16" });
  const unknown = await returning.requestReturnLink(event.id, "nobody@example.com");
  await store.createSignup(event.id, { ...person, email: "ada-return@example.com" });
  const known = await returning.requestReturnLink(event.id, "Ada-Return@example.com");
  assert.equal(known, unknown);
  assert.equal(known, returning.RETURN_LINK_REPLY);
  assert.equal(known.includes("Ada"), false);
  const { getDb } = await import("./db");
  const links = await getDb().execute("SELECT token, normalized_email FROM return_links");
  assert.equal(links.rows.length, 1);
  assert.equal(String(links.rows[0]?.normalized_email), "ada-return@example.com");
  const token = String(links.rows[0]?.token);
  const prefill = await returning.returnPrefill(token);
  assert.equal(prefill?.signup.firstName, "Ada");
  assert.equal(await returning.returnPrefill("missing-token"), null);

  const next = await store.createEvent({ ...eventInput, slug: "return-next", date: "2026-12-23" });
  const saved = await store.createSignup(next.id, {
    firstName: prefill!.signup.firstName,
    email: prefill!.signup.email,
    phone: prefill!.signup.phone,
    attendanceCertainty: "definitely",
    arrivalTime: "5:45 PM",
    preferredGroupSize: prefill!.signup.preferredGroupSize,
    comfortPreferences: prefill!.signup.comfortPreferences,
    willingConnector: prefill!.signup.willingConnector,
    conductAcknowledged: true,
    ageAcknowledged: true,
  });
  assert.equal(saved.outcome, "created");
  if (saved.outcome === "created") {
    assert.equal(saved.signup.status, "pending");
    assert.equal(saved.signup.attendanceReply, undefined);
  }
  const again = await store.createSignup(next.id, {
    ...person,
    email: "ada-return@example.com",
  });
  assert.equal(again.outcome, "duplicate");
  const rows = await store.getSignupsForEvent(next.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.status, "pending");

  assert.equal(await returning.consumeReturnLink(token), true);
  assert.equal(await returning.returnPrefill(token), null);
  await getDb().execute({
    sql: `INSERT INTO return_links (token, normalized_email, event_id, expires_at)
      VALUES ('expired-token', 'ada-return@example.com', ?, '2000-01-01T00:00:00.000Z')`,
    args: [event.id],
  });
  assert.equal(await returning.returnPrefill("expired-token"), null);
});

test("opting out blocks automatic mail and leaves the signup in place", async () => {
  const event = await store.createEvent({ ...eventInput, slug: "opt-out-run", date: "2026-12-30" });
  await store.updateEmailSettings(event.id, {
    emailSignupConfirmation: true,
    emailAttendanceAsk: false,
    emailAttendanceNudge: false,
    emailGroupReminder: false,
  });
  const created = await store.createSignup(event.id, {
    ...person,
    email: "ada-optout@example.com",
    futureEmailOptOut: true,
  });
  assert.equal(created.outcome, "created");
  const { listCommunications } = await import("./emailQueue");
  assert.equal((await listCommunications(event.id)).length, 0);
  if (created.outcome === "created") {
    assert.equal(created.signup.status, "pending");
    assert.equal(created.signup.futureEmailOptOut, true);
  }
});

test("page loads add up without storing a person", async () => {
  await growth.recordPageCount({
    subjectType: "event",
    subjectId: "evt_counts",
    metric: "page_load",
    now: new Date("2026-12-01T20:00:00.000Z"),
  });
  await growth.recordPageCount({
    subjectType: "event",
    subjectId: "evt_counts",
    metric: "page_load",
    now: new Date("2026-12-01T21:00:00.000Z"),
  });
  const totals = await growth.sumPageCounts("event", ["evt_counts"]);
  assert.equal(totals.page_load, 2);
  assert.equal(totals.registration_start, 0);
});
