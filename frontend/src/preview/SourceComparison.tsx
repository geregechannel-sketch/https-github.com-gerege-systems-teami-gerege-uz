import { useState } from "react";
import snapshot from "./teamiArchiveSnapshot.json";
import ArchiveTable from "../components/ArchiveTable";

const rows = snapshot.rows.map(r => ({ ...r, UNIT: snapshot.unit }));
// Captured values have at most two decimals; integer accumulation avoids float sum drift.
const values = rows.filter(r => r.VAL !== null).map(r => Math.round(Number(r.VAL) * 100));
const sum = values.reduce((a, b) => a + b, 0);
const energy = (sum / 100 * Number(snapshot.conversionCoefficient)).toFixed(2);
const max = Math.max(...values) / 100;
const comparison = [
  ["Архивын үр дүн", "96 интервал, 24 утгатай, 72 хоосон", "Энэ хэсэгт эхийн бичлэгийг бүрэн харуулна; DEMO архив тусдаа"],
  ["Утга ба нэгж", "ML 1044: 15 минутын дундаж чадал, kW", "Хоосныг «Өгөгдөлгүй» гэж тэмдэглэнэ; 0-ийг хэвээр харуулна"],
  ["Энерги", "ML 1040 рүү хөрвүүлэх коэффициент 0.25", "Зөвхөн байгаа 24 утга: 72.27 kWh; төлбөр тооцоогүй"],
  ["Чанар", "HSS, DSS, SFS эхийн төлөвтэй", "Эхийн тэмдэглэгээг хадгална; холбоо онлайн гэж дүгнэхгүй"],
  ["Цаг", "Эхийн огноо, цаг offset-гүй", "Эхийн цагийг хэвээр харуулна; timezone баталгаажаагүй"],
  ["Тариф", "TFF_ID харагдана", "Мөнгөн тариф, хүчинтэй хугацаа, төлбөрийн дүрэм баталгаажаагүй"],
  ["Шинэ мэдээлэл", "2026-09-14-ний хэрэглэгчийн өгсөн бичлэг", "Шууд холболт болон автомат шинэчлэлт холбогдоогүй"],
];

export default function SourceComparison() {
  const [filter, setFilter] = useState("all");
  const shown = rows.filter(r => filter === "all" || (filter === "present" ? r.VAL !== null : r.VAL === null));
  return <section>
    <h2>TEAMI бодит бичлэг ↔ TOSH үзүүлэн</h2>
    <p><b>{snapshot.date}</b> · Нэг тооцооны цэг · Эх сурвалж: хэрэглэгчийн өгсөн HAR файл.</p>
    <p>Шууд таталт биш. Таних дугаар, нэвтрэх мэдээллийг оруулаагүй. Эхийн цагийн бүс баталгаажаагүй тул цагийг хөрвүүлээгүй.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {[["Нийт интервал", rows.length], ["Утгатай", values.length], ["Өгөгдөлгүй", rows.length - values.length], ["Байгаа 6 цагийн энерги", energy + " kWh"]].map(([label, value]) =>
        <div key={label} className="toshi-stat" style={{ background: "#22568c", flex: "1 1 180px" }}><div>{label}</div><div className="toshi-stat__value">{value}</div></div>)}
    </div>
    <h3>15 минутын дундаж чадал · kW</h3>
    <p>Цэнхэр багана — эхэд байгаа утга; шар тэмдэг — өгөгдөлгүй интервал. Хоосон хэсгийг тэгээр нөхөөгүй.</p>
    <svg viewBox="0 0 1000 230" role="img" aria-label="TEAMI бичлэг: эхний 6 цагт 24 утга; үлдсэн 18 цагт 72 хоосон интервал" style={{ width: "100%", maxHeight: 270, background: "#f5f7fa", borderRadius: 8 }}>
      {[0, 10, 20, 30].map(v => <g key={v}><line x1="45" x2="990" y1={190-v*5} y2={190-v*5} stroke="#d1d9e2" /><text x="8" y={194-v*5} fill="#334155" fontSize="12">{v}</text></g>)}
      {rows.map((r, i) => <rect key={i} x={47+i*9.7} y={r.VAL === null ? 196 : 190-Number(r.VAL)*5} width="7" height={r.VAL === null ? 6 : Math.max(Number(r.VAL)*5, 1)} fill={r.VAL === null ? "#d9912e" : "#2677bc"}>
        <title>{r.BT} — {r.ET}: {r.VAL === null ? "Өгөгдөлгүй" : r.VAL + " kW"}</title></rect>)}
      {[0,6,12,18,24].map(h => <text key={h} x={47+h*4*9.7} y="220" textAnchor={h === 24 ? "end" : "start"} fill="#334155" fontSize="12">{String(h).padStart(2,"0")}:00</text>)}
    </svg>
    <p>Хамгийн бага: {Math.min(...values)/100} kW · Их: {max} kW · Утгатай интервалын дундаж: {(sum/values.length/100).toFixed(3)} kW.</p>
    <p><b>{energy} kWh</b> = утгатай чадлуудын нийлбэр × {snapshot.conversionCoefficient} цаг. 72 хоосон интервалын хэрэглээ тодорхойгүй; энэ дүнгээр өдрийн төлбөр бодохгүй.</p>
    <h3>Харьцуулалт ба үлдсэн ажил</h3>
    <table className="toshi-grid" style={{ width: "100%" }}><thead><tr><th>Хэсэг</th><th>TEAMI нотолгоо</th><th>TOSH-ийн байдал</th></tr></thead><tbody>
      {comparison.map(([area, source, target]) => <tr key={area}><td>{area}</td><td>{source}</td><td>{target}</td></tr>)}
    </tbody></table>
    <h3>Эхийн 96 интервал</h3>
    <label>Харах мөрүүд: <select className="toshi-select" value={filter} onChange={e => setFilter(e.target.value)}>
      <option value="all">Бүгд — 96</option><option value="present">Утгатай — 24</option><option value="missing">Өгөгдөлгүй — 72</option>
    </select></label><p>Харагдаж буй мөр: {shown.length}. HSS / DSS / SFS / TFF_ID нь эхийн тэмдэглэгээ.</p>
    <ArchiveTable rows={shown} />
  </section>;
}
