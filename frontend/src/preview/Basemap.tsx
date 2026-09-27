import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = { id: number; name: string; longitude: number | null; latitude: number | null; status: number | null };
export default function Basemap({ points, selected, onSelect }: { points: Point[]; selected: number | null; onSelect: (id: number) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const [notice, setNotice] = useState("Суурь зураг ачаалж байна…");
  useEffect(() => {
    if (!element.current) return;
    const m = L.map(element.current, { maxZoom: 19 });
    map.current = m;
    const valid = points.filter(p => p.latitude !== null && p.longitude !== null);
    if (valid.length) m.fitBounds(valid.map(p => [p.latitude!, p.longitude!] as L.LatLngTuple), { padding: [35,35], maxZoom: 16 });
    else m.setView([48.115,114.576],16);
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      maxZoom: 19,
    });
    let failed = false;
    tiles.on("loading", () => { failed = false; setNotice("Суурь зураг ачаалж байна…"); });
    tiles.on("tileerror", () => { failed = true; setNotice("Зарим суурь зураг ачаалагдсангүй. Интернэт холболтоо шалгана уу."); });
    tiles.on("load", () => { if (!failed) setNotice("OpenStreetMap суурь зураг · Тоолуурын цэгүүд нь хадгалсан TEAMI бичлэг."); });
    tiles.addTo(m);
    markers.current = L.layerGroup().addTo(m);
    L.control.scale({ imperial: false }).addTo(m);
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(element.current);
    return () => { observer.disconnect(); tiles.off(); m.remove(); map.current = null; markers.current = null; };
  }, []);
  useEffect(() => {
    const layer = markers.current;
    if (!layer) return;
    layer.clearLayers();
    points.filter(p => p.latitude !== null && p.longitude !== null).forEach(p => {
      const text = document.createElement("span");
      text.textContent = `${p.name} · Эхийн STATUS: ${p.status ?? "—"}`;
      L.circleMarker([p.latitude!,p.longitude!], { radius: p.id === selected ? 10 : 7, color: "#fff", weight: 2, fillColor: p.id === selected ? "#d57914" : "#2375b5", fillOpacity: 1 })
        .bindTooltip(text).on("click", () => onSelect(p.id)).addTo(layer);
    });
  }, [points, selected, onSelect]);
  useEffect(() => {
    const p = points.find(p => p.id === selected);
    if (p?.latitude != null && p.longitude != null) map.current?.panTo([p.latitude,p.longitude]);
  }, [selected]);
  return <><p role="status">{notice}</p><div ref={element} aria-label="OpenStreetMap дээрх TEAMI цэгүүд" style={{ height: 520, width: "100%", zIndex: 0 }} /></>;
}
