export function formatEventDate(date: string, startTime: string): string {
  const d = new Date(`${date}T12:00:00`);
  const formatted = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${formatted} · ${startTime}`;
}

export function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "N/A";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function countOf(numerator: number, denominator: number): string {
  if (denominator === 0) return "N/A";
  return `${numerator} of ${denominator} (${pct(numerator, denominator)})`;
}

export function likertSummary(
  counts: { yes: number; somewhat: number; no: number },
  total: number,
): string {
  if (total === 0) return "N/A";
  const responses = total === 1 ? "1 response" : `${total} responses`;
  return `${counts.yes} yes · ${counts.somewhat} somewhat · ${counts.no} no (${responses})`;
}
