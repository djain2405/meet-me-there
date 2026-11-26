import { ensureSchema, getDb } from "./db";
import { deliverEmail, emailProviderConfigured } from "./emailDelivery";
import { normalizeEmail, registrationClosedReason } from "./registration";
import { getEventById, getSignupById } from "./store";
import type { Signup } from "./types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

export const RETURN_LINK_REPLY =
  "If we have a signup for that email, we sent a link.";

export async function requestReturnLink(eventId: string, email: string): Promise<string> {
  try {
    if (!emailProviderConfigured()) return RETURN_LINK_REPLY;
    const normalized = normalizeEmail(email);
    if (!normalized.includes("@")) return RETURN_LINK_REPLY;
    await ensureSchema();
    const event = await getEventById(eventId);
    if (!event || registrationClosedReason(event)) return RETURN_LINK_REPLY;
    const latest = await latestSignup(normalized);
    if (!latest) return RETURN_LINK_REPLY;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await getDb().execute({
      sql: `INSERT INTO return_links (token, normalized_email, event_id, expires_at)
        VALUES (?, ?, ?, ?)`,
      args: [token, normalized, eventId, expiresAt],
    });
    const sent = await deliverEmail({
      to: latest.email,
      subject: `Your details for ${event.name}`,
      body: [
        `Use this link to fill in your saved details for ${event.name}.`,
        "It works once and expires in one hour.",
        "",
        `${siteUrl}/return/${token}`,
        "",
        "If you did not ask for this, you can ignore it.",
      ].join("\n"),
    });
    if (!sent.ok) {
      await getDb().execute({
        sql: "DELETE FROM return_links WHERE token = ?",
        args: [token],
      });
    }
  } catch {
    // The reply stays the same when lookup or mail fails.
  }
  return RETURN_LINK_REPLY;
}

export async function returnPrefill(token: string): Promise<{
  eventId: string;
  signup: Signup;
} | null> {
  await ensureSchema();
  const result = await getDb().execute({
    sql: "SELECT * FROM return_links WHERE token = ? LIMIT 1",
    args: [token],
  });
  const row = result.rows[0];
  if (!row || row.used_at) return null;
  if (String(row.expires_at) <= new Date().toISOString()) return null;
  const signup = await latestSignup(String(row.normalized_email));
  if (!signup) return null;
  return { eventId: String(row.event_id), signup };
}

export async function consumeReturnLink(token: string): Promise<boolean> {
  await ensureSchema();
  const result = await getDb().execute({
    sql: `UPDATE return_links SET used_at = ?
      WHERE token = ? AND used_at IS NULL AND expires_at > ?`,
    args: [new Date().toISOString(), token, new Date().toISOString()],
  });
  return Number(result.rowsAffected ?? 0) > 0;
}

async function latestSignup(normalizedEmail: string): Promise<Signup | null> {
  const result = await getDb().execute({
    sql: `SELECT * FROM signups
      WHERE normalized_email = ?
      ORDER BY created_at DESC
      LIMIT 1`,
    args: [normalizedEmail],
  });
  const row = result.rows[0];
  if (!row) return null;
  return getSignupById(String(row.id));
}
