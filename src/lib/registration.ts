import type { EventStatus, PilotEvent } from "./types";

export const DEFAULT_TIMEZONE = "America/Los_Angeles";

const OPEN_STATUSES: EventStatus[] = ["recruiting", "matching", "live"];

export class RegistrationClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistrationClosedError";
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function todayInTimeZone(
  timeZone: string,
  now: Date = new Date(),
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts;
}

export function isEventPast(
  date: string,
  timeZone: string,
  now: Date = new Date(),
): boolean {
  return date < todayInTimeZone(timeZone || DEFAULT_TIMEZONE, now);
}

export function registrationClosedReason(
  event: Pick<PilotEvent, "status" | "date" | "timezone">,
  now: Date = new Date(),
): string | null {
  if (event.status === "cancelled") return "This event was cancelled.";
  if (event.status === "completed") return "Signup for this event is closed.";
  if (event.status === "draft") return "This event is not open for signup.";
  if (isEventPast(event.date, event.timezone, now)) {
    return "This event has already happened.";
  }
  if (!OPEN_STATUSES.includes(event.status)) {
    return "Signup for this event is closed.";
  }
  return null;
}

export function isUpcomingPublicEvent(
  event: Pick<PilotEvent, "status" | "date" | "timezone">,
  now: Date = new Date(),
): boolean {
  return registrationClosedReason(event, now) === null;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
