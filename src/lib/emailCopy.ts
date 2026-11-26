import type { Group, PilotEvent, Signup } from "./types";
import { formatEventDate } from "./format";

export type CrewMail = {
  person: Signup;
  event: PilotEvent;
  group?: Group;
  crew: Signup[];
  connector?: Signup;
  attendanceUrl: string;
};

export function eventStartUtc(event: Pick<PilotEvent, "date" | "startTime" | "timezone">): Date | null {
  const parsed = parseStartTime(event.startTime);
  if (!parsed) return null;
  const [year, month, day] = event.date.split("-").map(Number);
  if (!year || !month || !day) return null;
  const utcGuess = new Date(Date.UTC(year, month - 1, day, parsed.hour, parsed.minute, 0));
  const offset = timeZoneOffsetMs(utcGuess, event.timezone || "America/Los_Angeles");
  return new Date(utcGuess.getTime() - offset);
}

export function dueScheduledKind(
  start: Date,
  now: Date,
): "attendance_ask" | "attendance_nudge" | "group_reminder" | null {
  const hoursUntil = (start.getTime() - now.getTime()) / 3_600_000;
  if (hoursUntil <= 0 || hoursUntil > 24) return null;
  if (hoursUntil <= 2) return "group_reminder";
  if (hoursUntil <= 12) return "attendance_nudge";
  return "attendance_ask";
}

export function activeCrewMembers(signups: Signup[], groupId: string): Signup[] {
  return signups.filter(
    (signup) =>
      signup.groupId === groupId &&
      signup.status !== "declined" &&
      signup.status !== "no-show" &&
      signup.attendanceReply !== "declined",
  );
}

export function signupConfirmation(mail: CrewMail): { subject: string; body: string } {
  const { person, event, attendanceUrl } = mail;
  const subject = `You're signed up for ${event.name}`;
  const lines = [
    `Hey ${person.firstName},`,
    "",
    `You're signed up for ${event.name}.`,
    formatEventDate(event.date, event.startTime),
    event.venue,
    event.meetingPoint ? `Meeting point: ${event.meetingPoint}` : "",
    event.ticketUrl ? `Official event page: ${event.ticketUrl}` : "",
    "",
    "We'll match you with a small crew before you arrive. This email is only for you. It does not include anyone else's name or contact information.",
    "",
    "When you're ready, tell us if you're coming:",
    attendanceUrl,
    "",
    contactLine(event),
  ];
  return { subject, body: lines.filter((line) => line !== "").join("\n") };
}

export function attendanceAsk(mail: CrewMail): { subject: string; body: string } {
  return scheduledNote(mail, "ask");
}

export function attendanceNudge(mail: CrewMail): { subject: string; body: string } {
  return scheduledNote(mail, "nudge");
}

export function groupReminder(mail: CrewMail): { subject: string; body: string } {
  const { person, event, group, attendanceUrl } = mail;
  const crewName = group?.name ?? "your crew";
  const subject = `Your ${crewName} meetup for ${event.name}`;
  const lines = [
    `Hey ${person.firstName},`,
    "",
    `This is the meetup note for ${crewName} at ${event.name}.`,
    crewLines(mail),
    "",
    "Your attendance link, if you need to change your answer:",
    attendanceUrl,
    "",
    contactLine(event),
  ];
  return { subject, body: lines.filter((line) => line !== "").join("\n") };
}

export function crewIntroduction(mail: CrewMail): { subject: string; body: string } {
  const { person, event, group, attendanceUrl } = mail;
  const crewName = group?.name ?? "your crew";
  const subject = `Meet your ${crewName} for ${event.name}`;
  const lines = [
    `Hey ${person.firstName},`,
    "",
    `Here is your crew for ${event.name}. We share first names and the public meeting spot. We do not share email addresses or phone numbers.`,
    crewLines(mail),
    "",
    "Tell us if you're coming:",
    attendanceUrl,
    "",
    contactLine(event),
  ];
  return { subject, body: lines.filter((line) => line !== "").join("\n") };
}

function scheduledNote(
  mail: CrewMail,
  tone: "ask" | "nudge",
): { subject: string; body: string } {
  const { person, event, group, attendanceUrl } = mail;
  const crewName = group?.name;
  const subject = crewName
    ? `Still joining ${crewName} for ${event.name}?`
    : `Still joining ${event.name}?`;
  const opener =
    tone === "ask"
      ? crewName
        ? `Still joining ${crewName} at ${event.name}?`
        : `Still joining ${event.name}? A crew is not assigned yet, so this note does not list anyone else.`
      : crewName
        ? `Quick nudge: we still need your answer for ${crewName}.`
        : `Quick nudge: we still need your answer for ${event.name}. A crew is not assigned yet, so this note does not list anyone else.`;
  const lines = [
    `Hey ${person.firstName},`,
    "",
    opener,
    group ? crewLines(mail) : "",
    "",
    "Open this page and choose I'm coming or I can't make it. Opening it does not change your answer.",
    attendanceUrl,
    "",
    contactLine(event),
  ];
  return { subject, body: lines.filter((line) => line !== "").join("\n") };
}

function crewLines(mail: CrewMail): string {
  const { person, group, crew, connector, event } = mail;
  const others = crew
    .filter((member) => member.id !== person.id)
    .map((member) => member.firstName);
  const names = others.length > 0 ? others.join(", ") : "You'll be the first one there";
  const connectorLine = connector
    ? connector.id === person.id
      ? "You offered to say hi first."
      : `${connector.firstName} offered to say hi first.`
    : "";
  return [
    group ? `Crew: ${group.name}` : "",
    `With: ${names}`,
    group?.meetingTime ? `Meet at ${group.meetingTime}` : `Starts ${event.startTime}`,
    `Where: ${group?.meetingLocation || event.meetingPoint || event.venue}`,
    group?.arrivalInstructions || "",
    connectorLine,
  ]
    .filter(Boolean)
    .join("\n");
}

function contactLine(event: PilotEvent): string {
  if (event.organizerContactEmail) {
    return `Questions about the event itself: ${event.organizerContactName || "the organizer"} at ${event.organizerContactEmail}.`;
  }
  return "Questions about the event itself go to the organizer. Meet Me There only helps you find your crew.";
}

function parseStartTime(value: string): { hour: number; minute: number } | null {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3]?.toLowerCase();
  if (minute > 59 || hour > 23) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === "pm" && hour !== 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
  }
  return { hour, minute };
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour") % 24,
    value("minute"),
    value("second"),
  );
  return asUtc - date.getTime();
}
