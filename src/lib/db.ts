import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "fs";
import path from "path";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

function resolveDatabaseUrl(): string {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "TURSO_DATABASE_URL is required in production. Signups will not persist without it.",
    );
  }

  const dataDir = path.join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });
  return `file:${path.join(dataDir, "meet-me-there.db")}`;
}

/**
 * Adds share-link columns and fills tokens only where they are missing.
 * Does not update signups, groups, or surveys.
 */
async function ensureEventShareColumns(db: Client): Promise<void> {
  const info = await db.execute("PRAGMA table_info(events)");
  const names = new Set(info.rows.map((row) => String(row.name)));

  if (!names.has("survey_entry_token")) {
    await db.execute("ALTER TABLE events ADD COLUMN survey_entry_token TEXT");
  }
  if (!names.has("report_token")) {
    await db.execute("ALTER TABLE events ADD COLUMN report_token TEXT");
  }

  const missing = await db.execute(
    `SELECT id, survey_entry_token, report_token FROM events
     WHERE survey_entry_token IS NULL OR survey_entry_token = ''
        OR report_token IS NULL OR report_token = ''`,
  );

  for (const row of missing.rows) {
    const id = String(row.id);
    const surveyToken = String(row.survey_entry_token ?? "");
    const reportToken = String(row.report_token ?? "");

    if (!surveyToken) {
      await db.execute({
        sql: `UPDATE events SET survey_entry_token = ?
              WHERE id = ? AND (survey_entry_token IS NULL OR survey_entry_token = '')`,
        args: [crypto.randomUUID(), id],
      });
    }
    if (!reportToken) {
      await db.execute({
        sql: `UPDATE events SET report_token = ?
              WHERE id = ? AND (report_token IS NULL OR report_token = '')`,
        args: [crypto.randomUUID(), id],
      });
    }
  }

  await db.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_events_survey_entry_token ON events(survey_entry_token)",
  );
  await db.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_events_report_token ON events(report_token)",
  );
}

async function columnNames(db: Client, table: string): Promise<Set<string>> {
  const info = await db.execute(`PRAGMA table_info(${table})`);
  return new Set(info.rows.map((row) => String(row.name)));
}

async function addColumnIfMissing(
  db: Client,
  table: string,
  column: string,
  ddl: string,
): Promise<void> {
  const names = await columnNames(db, table);
  if (!names.has(column)) await db.execute(ddl);
}

/**
 * Adds organizer linkage and normalized emails.
 * Does not rewrite signup identity, crew assignment, or survey rows.
 */
async function ensureRelease1Columns(db: Client): Promise<void> {
  await db.execute(`CREATE TABLE IF NOT EXISTS organizers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    website_url TEXT NOT NULL DEFAULT '',
    contact_email TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  await addColumnIfMissing(
    db,
    "events",
    "organizer_id",
    "ALTER TABLE events ADD COLUMN organizer_id TEXT",
  );
  await addColumnIfMissing(
    db,
    "events",
    "timezone",
    "ALTER TABLE events ADD COLUMN timezone TEXT DEFAULT 'America/Los_Angeles'",
  );
  await addColumnIfMissing(
    db,
    "signups",
    "normalized_email",
    "ALTER TABLE signups ADD COLUMN normalized_email TEXT",
  );

  await db.execute(
    `UPDATE events SET timezone = 'America/Los_Angeles'
     WHERE timezone IS NULL OR timezone = ''`,
  );
  await db.execute(
    `UPDATE signups SET normalized_email = lower(trim(email))
     WHERE normalized_email IS NULL OR normalized_email = ''`,
  );

  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id)",
  );

  const dupes = await db.execute(
    `SELECT event_id, normalized_email, COUNT(*) AS c
     FROM signups
     WHERE normalized_email IS NOT NULL AND normalized_email != ''
     GROUP BY event_id, normalized_email
     HAVING COUNT(*) > 1`,
  );
  if (dupes.rows.length === 0) {
    await db.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_signups_event_email
       ON signups(event_id, normalized_email)`,
    );
  }
}

/**
 * Opt-in email switches and a send log.
 * Does not change signup status, crew assignment, or survey rows.
 */
async function ensureRelease2Columns(db: Client): Promise<void> {
  const eventFlags = [
    "email_signup_confirmation",
    "email_attendance_ask",
    "email_attendance_nudge",
    "email_group_reminder",
  ];
  for (const column of eventFlags) {
    await addColumnIfMissing(
      db,
      "events",
      column,
      `ALTER TABLE events ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0`,
    );
  }

  await addColumnIfMissing(
    db,
    "signups",
    "attendance_reply",
    "ALTER TABLE signups ADD COLUMN attendance_reply TEXT",
  );
  await addColumnIfMissing(
    db,
    "signups",
    "attendance_token",
    "ALTER TABLE signups ADD COLUMN attendance_token TEXT",
  );
  await addColumnIfMissing(
    db,
    "signups",
    "previous_group_id",
    "ALTER TABLE signups ADD COLUMN previous_group_id TEXT",
  );

  await db.execute(`CREATE TABLE IF NOT EXISTS communications (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    signup_id TEXT,
    group_id TEXT,
    kind TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL,
    failure_reason TEXT,
    created_at TEXT NOT NULL,
    sent_at TEXT
  )`);
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_communications_event ON communications(event_id)",
  );
  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_signups_attendance_token
     ON signups(attendance_token)
     WHERE attendance_token IS NOT NULL AND attendance_token != ''`,
  );
}

export function getDb(): Client {
  if (client) return client;

  const url = resolveDatabaseUrl();
  client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return client;
}

export async function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    const db = getDb();
    await db.batch(
      [
        `CREATE TABLE IF NOT EXISTS events (
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
          created_at TEXT NOT NULL,
          survey_entry_token TEXT,
          report_token TEXT,
          organizer_id TEXT,
          timezone TEXT DEFAULT 'America/Los_Angeles'
        )`,
        `CREATE TABLE IF NOT EXISTS signups (
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
          created_at TEXT NOT NULL,
          normalized_email TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS groups (
          id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL,
          name TEXT NOT NULL,
          meeting_time TEXT NOT NULL,
          meeting_location TEXT NOT NULL,
          arrival_instructions TEXT NOT NULL DEFAULT '',
          chat_link TEXT,
          connector_signup_id TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS surveys (
          signup_id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL,
          met_group INTEGER NOT NULL,
          made_attendance_easier TEXT NOT NULL,
          felt_comfortable_safe TEXT NOT NULL,
          would_use_again INTEGER NOT NULL,
          interested_in_future_event INTEGER NOT NULL,
          comments TEXT,
          submitted_at TEXT NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_signups_event ON signups(event_id)`,
        `CREATE INDEX IF NOT EXISTS idx_groups_event ON groups(event_id)`,
        `CREATE INDEX IF NOT EXISTS idx_surveys_event ON surveys(event_id)`,
      ],
      "write",
    );
    await ensureEventShareColumns(db);
    await ensureRelease1Columns(db);
    await ensureRelease2Columns(db);
  })();

  return schemaReady;
}
