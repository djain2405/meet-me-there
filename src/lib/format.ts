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
