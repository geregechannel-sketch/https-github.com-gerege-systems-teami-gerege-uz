// Isolated presentation adapter. Never imports the production API or performs IO.
import type { Envelope } from "../api";
import { calendarRange, dateInUTC8 } from "../lib/archiveQuality";

export const previewDay = dateInUTC8(Date.now() - 86400000);
const start = Date.parse(calendarRange(previewDay, previewDay).begin);
export const previewRows = Array.from({ length: 24 }, (_, i) => ({
  POINT_ID: 1, ML_ID: 1044, MD_ID: 12, AGGS_ID: 13,
  BT: new Date(start + i * 900000).toISOString(),
  ET: new Date(start + (i + 1) * 900000).toISOString(),
  VAL: i === 0 ? "0" : "4.00", UNIT: "kW", SOURCE_STATUS: "DEMO — зохиомол өгөгдөл",
}));
const points = [{ POINT_ID: 1, GR_ID: 1, POINT_NAME: "DEMO — Туршилтын тоолуур", POINT_CODE: "DEMO.001", POINT_ENABLED: 1 }];
const ok = (data: unknown): Envelope => ({ success: true, data, totalCount: Array.isArray(data) ? data.length : undefined });
const denied = (): Envelope => ({ success: false, code: 501, message: "Урьдчилсан үзүүлэн: энэ үйлдэл холбогдоогүй. Серверт хүсэлт илгээгээгүй." });
export async function previewRequest<T = any>(method: string, path: string, body?: any): Promise<Envelope<T>> {
  const name = path.split("?")[0];
  let result: Envelope = denied();
  if (method === "GET" && name === "groups") result = ok([{ GR_ID: 1, GR_NAME: "Туршилтын орчин", PARENT_GR_ID: null }]);
  if (method === "GET" && name === "points") result = ok(points);
  if (method === "GET" && ["pointtypes", "ecoprofiles"].includes(name)) result = ok([]);
  if (method === "GET" && name === "measurementsarchives") {
    const id = new URLSearchParams(path.split("?")[1]).get("POINT_ID");
    result = ok(id === "1" ? [{ ML_ID: 1044, MD_ID: 12, AGGS_ID: 13, ML_NAME: "DEMO: P+ / 15 минут / kW" }] : []);
  }
  if (method === "POST" && name === "archives/point") {
    const begin = Date.parse(body?.FROM), end = Date.parse(body?.TO);
    if (Number.isFinite(begin) && end > begin && end - begin <= 366 * 86400000 && Number(body?.POINT_ID) === 1 && Number(body?.ML_ID) === 1044 && Number(body?.MD_ID) === 12 && Number(body?.AGGS_ID) === 13) {
      result = ok(previewRows.filter(r => (body.INCLUDE_OVERLAP ? Date.parse(r.ET) > begin : Date.parse(r.BT) >= begin) && Date.parse(r.BT) < end));
    }
  }
  if (method === "POST" && name === "homedashboard/data") result = ok([
    { TITLE: "Туршилтын тоолуур", STAT: "1", COLOR: "#22568c" },
    { TITLE: "Зохиомол архивын мөр", STAT: "24", COLOR: "#22568c" },
    { TITLE: "Бодит серверийн холболт", STAT: "Холбоогүй", COLOR: "#9a5b15" },
  ]);
  return result as Envelope<T>;
}
export const api = {
  get: <T = any>(path: string) => previewRequest<T>("GET", path),
  post: <T = any>(path: string, body?: any) => previewRequest<T>("POST", path, body),
  put: <T = any>(path: string, body?: any) => previewRequest<T>("PUT", path, body),
  del: <T = any>(path: string) => previewRequest<T>("DELETE", path),
  logout() {},
};
