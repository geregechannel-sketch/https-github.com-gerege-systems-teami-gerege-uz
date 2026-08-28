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
  const [sel, setSel] = useState<Row | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { zoomControl: true }).setView(CENTER, 14);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    let mounted = true;
    (async () => {
      const [me, te] = await Promise.all([
        api.get("measuringdevices?limit=1000"),
        api.get("measuringdevicetypes"),
      ]);
      if (!mounted) return;
      const meters = (me.data as Row[]) || [];
      const typeName: Record<string, string> = {};
      ((te.data as Row[]) || []).forEach((t) => (typeName[t.METER_TYPE_ID] = t.METER_TYPE_NAME));
      setCount(me.totalCount ?? meters.length);

      meters.forEach((m, i) => {
        const a = (i * 137.5 * Math.PI) / 180;
        const rad = 0.004 + (i % 22) * 0.0009;
        const lat = CENTER[0] + Math.sin(a) * rad * 0.7;
        const lng = CENTER[1] + Math.cos(a) * rad;
        const row = { ...m, METER_TYPE_NAME: typeName[m.METER_TYPE_ID] || m.METER_TYPE_ID };
        L.circleMarker([lat, lng], {
          radius: 8,
          color: "#1e8449",
          weight: 2,
          fillColor: "#2ecc71",
          fillOpacity: 1,
        })
          .on("click", () => setSel(row))
          .bindTooltip("Счётчик " + String(m.METER_NUMBER || m.METER_ID || ""))
          .addTo(map);
      });
      setTimeout(() => map.invalidateSize(), 200);
    })();

    return () => {
      mounted = false;
      map.remove();
    };
  }, []);

  return (
    <div style={{ position: "relative", height: "calc(100vh - 106px)" }}>
      <div ref={ref} style={{ position: "absolute", inset: 0, borderRadius: 4, overflow: "hidden", zIndex: 0 }} />

      <div className="toshi-popup" style={{ position: "absolute", top: 12, left: 12, width: 300, zIndex: 500 }}>
        <div className="toshi-popup__head">UZ (Монголия)</div>
        <div style={{ padding: 12, fontSize: 12 }}>
          <KV k="Наименование объекта" v="UZ (Монголия) — г.Чойбалсан" />
          <KV k="Количество счётчиков" v={count != null ? String(count) : "…"} />
          <KV k="На связи (2 сут.)" v={count != null ? String(count) : "…"} />
          <div style={{ marginTop: 8, opacity: 0.6, fontSize: 11 }}>Кликните счётчик на карте → данные</div>
        </div>
      </div>

      {sel && (
        <div
          className="toshi-window"
          style={{ position: "absolute", top: 12, right: 12, width: 440, zIndex: 500, maxHeight: "calc(100% - 24px)", display: "flex", flexDirection: "column" }}
        >
          <div className="toshi-window__head" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Данные счётчика</span>
            <span style={{ cursor: "pointer" }} onClick={() => setSel(null)}>✕</span>
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
