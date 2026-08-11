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
          created_at TEXT NOT NULL
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
          created_at TEXT NOT NULL
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
  })();

  return schemaReady;
}
