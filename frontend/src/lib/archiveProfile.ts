export type ArchiveProfileRow = {
  index: number;
  interval: string;
  value: number | null;
  valueText: string;
  readAt: string;
  tariff: string;
  act: string;
  status: string;
};

export function archiveSeriesKey(row: Record<string, unknown>) {
  const ids = [row.ML_ID, row.MD_ID, row.AGGS_ID];
  return ids.every((id) => id != null && String(id).trim() !== "") ? ids.join("/") : "";
}

export function selectArchiveSeries(parameters: Record<string, unknown>[], requested = "") {
  const keys = parameters.map(archiveSeriesKey).filter(Boolean);
  return requested ? (keys.includes(requested) ? requested : "") : (keys[0] || "");
}

export function archiveTime(value: unknown) {
  if (!value) return "";
  const timestamp = Date.parse(String(value));
  if (!Number.isFinite(timestamp)) return "";
  const wall = new Date(timestamp + 8 * 3600000).toISOString();
  return `${wall.slice(0, 10).split("-").reverse().join("-")} ${wall.slice(11, 19)}`;
}

// Keep original archive intervals and decimal text; no averaging or gap values.
export function archiveProfileRows(samples: Record<string, unknown>[]): ArchiveProfileRow[] {
  return [...samples].sort((a, b) => Date.parse(String(a.BT)) - Date.parse(String(b.BT))).map((row, index) => {
    const text = row.VALUE == null ? "" : String(row.VALUE);
    const value = text.trim() === "" ? null : Number(text);
    return {
      index,
      interval: `${archiveTime(row.BT)} - ${archiveTime(row.ET)}`,
      value: value == null || !Number.isFinite(value) ? null : value,
      valueText: text,
      readAt: archiveTime(row.SOURCE_READ_TIME),
      tariff: row.TARIFF_ID == null ? "" : String(row.TARIFF_ID),
      act: row.HAS_ACT == null ? "" : String(row.HAS_ACT),
      status: row.SOURCE_STATUS == null ? "" : String(row.SOURCE_STATUS),
    };
  });
}
