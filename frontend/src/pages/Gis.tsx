import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { api } from "../api";

// Choibalsan, Mongolia (the observed deployment tenant).
const CENTER: [number, number] = [114.535, 48.083];

type Row = Record<string, any>;

export default function Gis() {
  const ref = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState<{ points: number } | null>(null);
  const [sel, setSel] = useState<{ point: Row; meters: Row[] } | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: CENTER,
      zoom: 14,
    });
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    Promise.all([
      api.get("points?limit=1000"),
      api.get("measuringdevices?limit=2000"),
      api.get("measuringdevicetypes"),
    ]).then(([pe, me, te]) => {
      const points = (pe.data as Row[]) || [];
      const meters = (me.data as Row[]) || [];
      const typeName: Record<string, string> = {};
      ((te.data as Row[]) || []).forEach((t) => (typeName[t.METER_TYPE_ID] = t.METER_TYPE_NAME));
      // group meters by point
      const byPoint: Record<string, Row[]> = {};
      meters.forEach((m) => {
        const k = String(m.POINT_ID);
        (byPoint[k] = byPoint[k] || []).push({ ...m, METER_TYPE_NAME: typeName[m.METER_TYPE_ID] || m.METER_TYPE_ID });
      });
      setInfo({ points: pe.totalCount ?? points.length });

      points.forEach((p, i) => {
        const a = (i * 137.5 * Math.PI) / 180;
        const rad = 0.004 + (i % 22) * 0.0009;
        const lng = CENTER[0] + Math.cos(a) * rad;
        const lat = CENTER[1] + Math.sin(a) * rad * 0.7;
        const el = document.createElement("div");
        el.style.cssText =
          "width:18px;height:24px;background:#2ecc71;border:1px solid #1e8449;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 1px 3px rgba(0,0,0,.4);cursor:pointer";
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSel({ point: p, meters: byPoint[String(p.POINT_ID)] || [] });
        });
        new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
      });
    });

    return () => map.remove();
  }, []);

  return (
    <div style={{ position: "relative", height: "calc(100vh - 106px)" }}>
      <div ref={ref} style={{ position: "absolute", inset: 0, borderRadius: 4, overflow: "hidden" }} />

      {/* object summary */}
      <div className="toshi-popup" style={{ position: "absolute", top: 12, left: 12, width: 300, zIndex: 5 }}>
        <div className="toshi-popup__head">UZ (Монголия)</div>
        <div style={{ padding: 12, fontSize: 12 }}>
          <KV k="Наименование объекта" v="UZ (Монголия) — г.Чойбалсан" />
          <KV k="Количество точек учета" v={info ? String(info.points) : "…"} />
          <KV k="Есть показания (2 сут.)" v={info ? String(info.points) : "…"} />
        </div>
      </div>

      {/* meter data panel (opens on marker click) */}
      {sel && (
        <div className="toshi-window" style={{ position: "absolute", top: 12, right: 12, width: 460, zIndex: 6, maxHeight: "calc(100% - 24px)", display: "flex", flexDirection: "column" }}>
          <div className="toshi-window__head" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Счетчики точки</span>
            <span style={{ cursor: "pointer" }} onClick={() => setSel(null)}>✕</span>
          </div>
          <div style={{ padding: 12, overflow: "auto" }}>
            <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 600 }}>{sel.point.POINT_NAME || sel.point.POINT_CODE}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10 }}>Код: {sel.point.POINT_CODE} · ID: {sel.point.POINT_ID}</div>
            {sel.meters.length === 0 ? (
              <div style={{ opacity: 0.6, fontSize: 12 }}>Нет счетчиков на этой точке</div>
            ) : (
              <table className="toshi-grid" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>METER_NUMBER</th>
                    <th>Тип</th>
                    <th>Класс</th>
                    <th>Дата произв.</th>
                    <th>Экспл. с</th>
                  </tr>
                </thead>
                <tbody>
                  {sel.meters.map((m, i) => (
                    <tr key={i}>
                      <td>{m.METER_NUMBER}</td>
                      <td>{m.METER_TYPE_NAME}</td>
                      <td>{m.METER_CLASS}</td>
                      <td>{fmtDate(m.MADE)}</td>
                      <td>{fmtDate(m.EXPL_START)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
function fmtDate(v: any): string {
  if (!v) return "";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}
