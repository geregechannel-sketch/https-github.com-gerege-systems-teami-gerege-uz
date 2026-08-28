import { useEffect, useState } from "react";
import { api } from "../api";

// Simplified archive viewer: point tree (list) + period bar. Time-series data is
// served by the backend `archives/point` endpoint (empty until real archives exist).
export default function Archives() {
  const [points, setPoints] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [from, setFrom] = useState(new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    api.get("points?limit=200").then((e) => setPoints((e.data as any[]) || []));
  }, []);

  async function view() {
    if (!sel) return;
    const env = await api.post("archives/point", {
      POINT_ID: sel.POINT_ID,
      ML_ID: 1,
      MD_ID: 1,
      AGGS_ID: 1,
      FROM: from,
      TO: to,
    });
    setRows((env.data as any[]) || []);
  }

  return (
    <div>
      <div className="toshi-panel__head" style={{ marginBottom: 10 }}>Просмотр архивов</div>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div className="toshi-tree" style={{ width: 300, padding: 8, maxHeight: "70vh", overflow: "auto" }}>
          <div style={{ fontSize: 12, opacity: 0.6, padding: 4 }}>Выбор ТУ (точек учета)</div>
          {points.map((p, i) => (
            <div
              key={i}
              className={"toshi-tree__item" + (sel === p ? " is-active" : "")}
              style={{ cursor: "pointer", padding: "4px 8px" }}
              onClick={() => setSel(p)}
            >
              {p.POINT_NAME || p.POINT_CODE}
            </div>
          ))}
          {points.length === 0 && <div className="toshi-tree__empty" style={{ padding: 8 }}>Список пустой</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div className="toshi-well" style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <input className="toshi-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span>—</span>
            <input className="toshi-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <button className="toshi-btn toshi-btn--green" onClick={view} disabled={!sel}>
              Просмотр
            </button>
            {sel && <span style={{ opacity: 0.7 }}>{sel.POINT_NAME}</span>}
          </div>
          {rows.length ? (
            <table className="toshi-grid">
              <thead>
                <tr>{Object.keys(rows[0]).map((c) => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>{Object.keys(rows[0]).map((c) => <td key={c}>{String(r[c])}</td>)}</tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ opacity: 0.6, padding: 20 }}>Нет данных за выбранный период</div>
          )}
        </div>
      </div>
    </div>
  );
}
