import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { api } from "../api";

// Choibalsan, Mongolia (the observed deployment tenant).
const CENTER: [number, number] = [114.535, 48.083];

export default function Gis() {
  const ref = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState<{ points: number; recent: number } | null>(null);

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

    // Scatter markers for the current points (no stored coords -> deterministic scatter).
    api.get("points?limit=200").then((env) => {
      const rows = (env.data as any[]) || [];
      setInfo({ points: env.totalCount ?? rows.length, recent: rows.length });
      rows.forEach((r, i) => {
        const a = (i * 137.5 * Math.PI) / 180;
        const rad = 0.004 + (i % 20) * 0.0008;
        const lng = CENTER[0] + Math.cos(a) * rad;
        const lat = CENTER[1] + Math.sin(a) * rad * 0.7;
        const el = document.createElement("div");
        el.style.cssText =
          "width:16px;height:22px;background:#2ecc71;border:1px solid #1e8449;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 1px 3px rgba(0,0,0,.4)";
        new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(new maplibregl.Popup({ offset: 12 }).setText(String(r.POINT_NAME || r.POINT_CODE || "точка")))
          .addTo(map);
      });
    });

    return () => map.remove();
  }, []);

  return (
    <div style={{ position: "relative", height: "calc(100vh - 106px)" }}>
      <div ref={ref} style={{ position: "absolute", inset: 0, borderRadius: 4, overflow: "hidden" }} />
      <div className="toshi-popup" style={{ position: "absolute", top: 12, left: 12, width: 300, zIndex: 5 }}>
        <div className="toshi-popup__head">UZ (Монголия)</div>
        <div style={{ padding: 12, fontSize: 12 }}>
          <Row k="Наименование объекта" v="UZ (Монголия) — г.Чойбалсан" />
          <Row k="Количество точек учета" v={info ? String(info.points) : "…"} />
          <Row k="Есть показания (2 сут.)" v={info ? String(info.recent) : "…"} />
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "3px 0" }}>
      <span style={{ opacity: 0.7 }}>{k}:</span>
      <b>{v}</b>
    </div>
  );
}
