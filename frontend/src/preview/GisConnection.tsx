import { useState } from "react";
import snapshot from "./teamiPointsSnapshot.json";

export default function GisConnection() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const rows = snapshot.rows.map((r, i) => ({ ...r, index: i })).filter(r =>
    [r.POINT_NAME, r.POINT_CODE, r.METER_NUMBER].some(v => String(v ?? "").toLowerCase().includes(query.toLowerCase())));
  const point = selected === null ? null : snapshot.rows[selected];
  return <section>
    <h2>GIS — TEAMI тооцооны цэгүүд</h2>
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
      <input className="toshi-input" aria-label="Тооцооны цэг хайх" placeholder="Нэр, код, тоолуурын дугаараар хайх" value={query} onChange={e => setQuery(e.target.value)} style={{ minWidth: 310 }} />
      <a className="toshi-btn toshi-btn--blue" href="http://82.215.77.202:8080/teami/GIS_V2" target="_blank" rel="noopener noreferrer">Бодит TEAMI GIS нээх ↗</a>
      <a href="https://toshi.gerege.mn/gis" target="_blank" rel="noopener noreferrer">Бодит TOSH GIS нээх ↗</a>
    </div>
    <p><b>{snapshot.rows.length} бодит тооцооны цэг</b> · Хадгалсан жагсаалтын огноо: {snapshot.capturedDate}. Эдгээр нь шууд шинэчлэгдэхгүй.</p>
    <div style={{ border: "1px solid #c4cfdb", background: "#f2f5f9", padding: 22, marginBottom: 18 }}>
      <h3>Газрын зургийн координатын холболт хүлээгдэж байна</h3>
      <p>Жагсаалт холбогдсон. Өгсөн HAR файлд GIS координат болон цэг бүрийн сүүлийн заалтын цаг байхгүй тул тэмдэглэгээ, онлайн төлөвийг тооцоогүй.</p>
      <p>Таны TEAMI дэлгэцийн зурагт 87 цэг, сүүлийн 2 хоногт заалттай 85 цэг харагдсан. Энэ нь зургийн үеийн мэдээлэл; одоогийн төлөвөөр баталгаажаагүй.</p>
      <p>«Бодит TEAMI GIS нээх» нь тусдаа хуудас нээнэ. Энэ холбоос нь өгөгдөл синхрончлох холболт биш.</p>
    </div>
    {point && <aside style={{ padding: 16, border: "1px solid #87a6c4", marginBottom: 18 }}>
      <button className="toshi-btn" onClick={() => setSelected(null)} style={{ float: "right" }}>Хаах</button>
      <h3>{point.POINT_NAME}</h3>
      <p>Код: {point.POINT_CODE}</p><p>Тоолуур: {point.METER_NUMBER || "—"} · Төрөл: {point.METER_TYPE_NAME || "—"}</p>
      <p>Суурилуулалтын эхлэл: {point.MOU_BT || "—"} · Төгсгөл: {point.MOU_ET || "—"}</p>
      <p>Эхийн огноо, цагийг хөрвүүлээгүй. Бүрэн солилтын түүхийг энэ жагсаалт батлахгүй.</p>
    </aside>}
    <p>Хайлтад тохирох цэг: {rows.length}</p>
    <div style={{ overflow: "auto", maxHeight: 550 }}><table className="toshi-grid" style={{ width: "100%" }}>
      <thead><tr><th>Тооцооны цэг</th><th>Тоолуурын дугаар</th><th>Тоолуурын төрөл</th><th>Дэлгэрэнгүй</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.index}><td>{r.POINT_NAME}</td><td>{r.METER_NUMBER || "—"}</td><td>{r.METER_TYPE_NAME || "—"}</td><td>
        <button className="toshi-btn" onClick={() => setSelected(r.index)}>Харах</button>
      </td></tr>)}</tbody>
    </table></div>
  </section>;
}
