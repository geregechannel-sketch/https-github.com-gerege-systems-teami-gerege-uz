export type IntervalRow = { BT?: unknown; ET?: unknown; SOURCE_STATUS?: unknown };
export type Segment = { from: number; to: number; kind: "data" | "gap" | "future" };

// A status label is source metadata, never an inferred quality verdict.
export function summarizeIntervals(rows: IntervalRow[], from: number, to: number, now: number) {
  if (![from, to, now].every(Number.isFinite) || to <= from) throw new Error("Invalid period");
  const cutoff = Math.max(from, Math.min(to, now));
  const statuses: Record<string, number> = Object.create(null);
  let invalid = 0;
  const intervals: { from: number; to: number }[] = [];
  for (const row of rows) {
    const status = typeof row.SOURCE_STATUS === "string" && row.SOURCE_STATUS.length ? row.SOURCE_STATUS : "(статус не указан)";
    statuses[status] = (statuses[status] || 0) + 1;
    const begin = typeof row.BT === "string" ? Date.parse(row.BT) : NaN;
    const end = typeof row.ET === "string" ? Date.parse(row.ET) : NaN;
    if (!Number.isFinite(begin) || !Number.isFinite(end) || end <= begin) { invalid++; continue; }
    const a = Math.max(from, begin), b = Math.min(cutoff, end);
    if (b > a) intervals.push({ from: a, to: b });
  }
  intervals.sort((a, b) => a.from - b.from || a.to - b.to);
  const segments: Segment[] = [];
  let cursor = from, covered = 0, overlaps = 0;
  for (const item of intervals) {
    if (item.from < cursor) overlaps++;
    if (item.from > cursor) segments.push({ from: cursor, to: item.from, kind: "gap" });
    const start = Math.max(cursor, item.from);
    if (item.to > start) {
      segments.push({ from: start, to: item.to, kind: "data" });
      covered += item.to - start;
      cursor = item.to;
    }
  }
  if (cursor < cutoff) segments.push({ from: cursor, to: cutoff, kind: "gap" });
  if (cutoff < to) segments.push({ from: cutoff, to, kind: "future" });
  return { statuses, invalid, overlaps, covered, elapsed: cutoff - from, future: to - cutoff, segments };
}

export function dateInUTC8(now = Date.now()) { return new Date(now + 8 * 3600000).toISOString().slice(0, 10); }
export function calendarRange(from: string, to: string) {
  const valid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s + "T00:00:00Z")) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
  if (!valid(from) || !valid(to) || from > to) throw new Error("Проверьте начало и конец периода");
  const begin = from + "T00:00:00+08:00";
  const end = new Date(Date.parse(to + "T00:00:00Z") + 86400000).toISOString().slice(0, 10) + "T00:00:00+08:00";
  if (Date.parse(end) - Date.parse(begin) > 366 * 86400000) throw new Error("Выберите период не больше 366 дней");
  return { begin, end };
}
