import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api";

// Choibalsan, Mongolia (the observed deployment tenant).
const CENTER: [number, number] = [48.083, 114.535]; // [lat, lng]

type Row = Record<string, any>;

export default function Gis() {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState<number | null>(null);
  const [meters, setMeters] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [received, setReceived] = useState("");
  const [sel, setSel] = useState<Row | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { zoomControl: true }).setView(CENTER, 14);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    L.control.scale({ imperial: false }).addTo(map);
    let mounted = true;
    (async () => {
      const [me, te] = await Promise.all([
        api.get("measuringdevices?limit=1000"),
        api.get("measuringdevicetypes"),
      ]);
      if (!mounted) return;
      if (!me.success || !Array.isArray(me.data)) throw new Error("Invalid meter response");
      const meters = me.data as Row[];
      const typeName: Record<string, string> = {};
      ((te.data as Row[]) || []).forEach((t) => (typeName[t.METER_TYPE_ID] = t.METER_TYPE_NAME));
      setCount(me.totalCount ?? meters.length);

      // Meter metadata has no verified coordinates or last-reading timestamps.
      // Do not invent map locations or infer freshness from the device count.
      setMeters(meters.map(m => ({ ...m, METER_TYPE_NAME: typeName[m.METER_TYPE_ID] || m.METER_TYPE_ID })));
      setReceived(new Date().toLocaleString());
      map.invalidateSize();
    })().catch(() => {
      if (mounted) setError("Не удалось загрузить данные. Повторите вход или обновите страницу.");
    });

    return () => {
      mounted = false;
      map.remove();
    };
  }, []);

  return (
    <div style={{ position: "relative", height: "calc(100vh - 106px)" }}>
      <div ref={ref} style={{ position: "absolute", inset: 0, borderRadius: 4, overflow: "hidden", zIndex: 0 }} />

      <div className="toshi-popup" style={{ position: "absolute", top: 12, left: 52, width: 300, maxWidth: "calc(100% - 64px)", zIndex: 500 }}>
        <div className="toshi-popup__head">UZ (Монголия)</div>
        <div style={{ padding: 12, fontSize: 12 }}>
          <input aria-label="Поиск счётчика" placeholder="Номер или ID счётчика" value={query} onChange={e => setQuery(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />
          <select aria-label="Выбор счётчика" value={sel ? String(sel.METER_ID) : ""} onChange={e => setSel(meters.find(m => String(m.METER_ID) === e.target.value) || null)} style={{ width: "100%", margin: "6px 0" }}>
            <option value="">Выберите счётчик</option>
            {meters.filter(m => `${m.METER_NUMBER ?? ""} ${m.METER_ID ?? ""}`.toLowerCase().includes(query.toLowerCase()) || m.METER_ID === sel?.METER_ID).map(m => <option key={m.METER_ID} value={String(m.METER_ID)}>{m.METER_NUMBER || m.METER_ID}</option>)}
          </select>
          <KV k="Загружено в список" v={String(meters.length)} />
          <KV k="Наименование объекта" v="UZ (Монголия) — г.Чойбалсан" />
          <KV k="Количество счётчиков" v={count != null ? String(count) : "…"} />
          <KV k="Есть показания за последние 2 суток" v="Нет подтверждённых данных" />
          <KV k="Список получен" v={received || "—"} />
          <div role="status" style={{ marginTop: 8, fontSize: 12 }}>Координаты точек не предоставлены. Маркеры скрыты. Карта показана для ориентира.</div>
          {error && <div role="alert" style={{ color: "#b91c1c", marginTop: 8 }}>{error}</div>}
        </div>
      </div>

      {sel && (
        <div
          className="toshi-window"
          style={{ position: "absolute", top: 12, right: 12, width: 440, zIndex: 500, maxHeight: "calc(100% - 24px)", display: "flex", flexDirection: "column" }}
        >
          <div className="toshi-window__head" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Данные счётчика</span>
            <button aria-label="Закрыть данные счётчика" onClick={() => setSel(null)}>✕</button>
          </div>
          <div style={{ padding: 12, overflow: "auto" }}>
            <div style={{ marginBottom: 10, fontSize: 14, fontWeight: 600 }}>№ {sel.METER_NUMBER}</div>
            <table className="toshi-grid" style={{ fontSize: 12, width: "100%" }}>
              <tbody>
                <MetaRow k="Заводской номер" v={sel.METER_NUMBER} />
                <MetaRow k="Тип счётчика" v={sel.METER_TYPE_NAME} />
                <MetaRow k="Класс точности" v={sel.METER_CLASS} />
                <MetaRow k="Дата производства" v={fmtDate(sel.MADE)} />
                <MetaRow k="В эксплуатации с" v={fmtDate(sel.EXPL_START)} />
                <MetaRow k="ID счётчика" v={sel.METER_ID} />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "3px 0" }}>
      <span style={{ opacity: 0.7 }}>{k}:</span>
      <b>{v}</b>
    </div>
  );
}
function MetaRow({ k, v }: { k: string; v: any }) {
  return (
    <tr>
      <td style={{ opacity: 0.7, whiteSpace: "nowrap", paddingRight: 12 }}>{k}</td>
      <td style={{ fontWeight: 600 }}>{v ?? ""}</td>
    </tr>
  );
}
function fmtDate(v: any): string {
  if (!v) return "";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}
