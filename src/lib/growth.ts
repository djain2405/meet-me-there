import { ensureSchema, getDb } from "./db";
import type { Communication, Group, Signup } from "./types";

export type PageSubject = "organizer" | "event";
export type PageMetric = "page_load" | "registration_start";

function countDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function visitMetrics(registrationOpen: boolean): PageMetric[] {
  return registrationOpen ? ["page_load", "registration_start"] : ["page_load"];
}

export async function recordPageCount(input: {
  subjectType: PageSubject;
  subjectId: string;
  metric: PageMetric;
  now?: Date;
}): Promise<void> {
  try {
  await ensureSchema();
  await getDb().execute({
    sql: `INSERT INTO page_counts (day, subject_type, subject_id, metric, count)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(day, subject_type, subject_id, metric)
      DO UPDATE SET count = count + 1`,
    args: [
      countDay(input.now ?? new Date()),
      input.subjectType,
      input.subjectId,
      input.metric,
    ],
  });
  } catch {
    // A counter failure must not block the public page.
  }
}

export async function sumPageCounts(
  subjectType: PageSubject,
  subjectIds: string[],
): Promise<Record<PageMetric, number>> {
  const totals: Record<PageMetric, number> = { page_load: 0, registration_start: 0 };
  if (subjectIds.length === 0) return totals;
  await ensureSchema();
  const placeholders = subjectIds.map(() => "?").join(", ");
  const result = await getDb().execute({
    sql: `SELECT metric, SUM(count) AS total
      FROM page_counts
      WHERE subject_type = ? AND subject_id IN (${placeholders})
      GROUP BY metric`,
    args: [subjectType, ...subjectIds],
  });
  for (const row of result.rows) {
    const metric = String(row.metric);
    if (metric === "page_load" || metric === "registration_start") {
      totals[metric] = Number(row.total ?? 0);
    }
  }
  return totals;
}

function stillActive(signup: Signup): boolean {
  return (
    signup.status !== "declined" &&
    signup.status !== "no-show" &&
    signup.attendanceReply !== "declined"
  );
}

export function eventOperations(
  signups: Signup[],
  groups: Group[],
  communications: Pick<Communication, "status">[],
) {
  return {
    signups: signups.length,
    coming: signups.filter((signup) => signup.attendanceReply === "coming").length,
    declined: signups.filter(
      (signup) => signup.attendanceReply === "declined" || signup.status === "declined",
    ).length,
    unassigned: signups.filter((signup) => !signup.groupId && stillActive(signup)).length,
    crews: groups.length,
    crewsUnderMinimum: groups.filter(
      (group) =>
        signups.filter((signup) => signup.groupId === group.id && stillActive(signup))
          .length < 3,
    ).length,
    queued: communications.filter((item) => item.status === "queued").length,
    sent: communications.filter((item) => item.status === "sent").length,
    failed: communications.filter((item) => item.status === "failed").length,
  };
}

export function sourceTotals(signups: Signup[]): { source: string; count: number }[] {
  const totals = new Map<string, number>();
  for (const signup of signups) {
    const source = signup.utmSource || "not recorded";
    totals.set(source, (totals.get(source) ?? 0) + 1);
  }
  return [...totals.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
}
