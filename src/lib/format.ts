/** 2026 · 09 · 21 — the logbook date form. Returns "—" when the date is unusable. */
export function formatLogDate(date: string): string {
  const d = new Date(date);
  if (!date || Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()} · ${p(d.getMonth() + 1)} · ${p(d.getDate())}`;
}

/** September 21, 2026 */
export function formatLongDate(date: string): string | null {
  const d = new Date(date);
  if (!date || Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
