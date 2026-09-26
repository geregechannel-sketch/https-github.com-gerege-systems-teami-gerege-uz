import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api";
import { IcInfo, IcReset, IcSearch } from "../icons";
import "../gis.css";

const CENTER: [number, number] = [48.083, 114.535];

const MAP_STYLES = {
  osm: {
    label: "Карта OSM",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  },
  satellite: {
    label: "Спутник Esri",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri",
    maxZoom: 19,
  },
} as const;

type Row = Record<string, any>;
type MapStyle = keyof typeof MAP_STYLES;

type MapItem = {
  point: Row;
  meter: Row;
  groupName: string;
  typeName: string;
  lat: number;
  lng: number;
  recent: boolean;
  searchText: string;
};

function locationFor(index: number): [number, number] {
  const angle = (index * 137.5 * Math.PI) / 180;
  const ring = 0.004 + (index % 22) * 0.0009;
  return [CENTER[0] + Math.sin(angle) * ring * 0.7, CENTER[1] + Math.cos(angle) * ring];
}

function clockText(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
}

export default function Gis() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const [items, setItems] = useState<MapItem[]>([]);
  const [groups, setGroups] = useState<Row[]>([]);
  const [selected, setSelected] = useState<MapItem | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>("osm");
  const [legendOpen, setLegendOpen] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView(CENTER, 14);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    markerLayerRef.current = L.layerGroup().addTo(map);
    window.setTimeout(() => map.invalidateSize(), 100);
    return () => {
      markerLayerRef.current = null;
      tileRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    tileRef.current?.remove();
    const style = MAP_STYLES[mapStyle];
    tileRef.current = L.tileLayer(style.url, {
      attribution: style.attribution,
      maxZoom: style.maxZoom,
    }).addTo(map);
    tileRef.current.bringToBack();
  }, [mapStyle]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      api.get<Row[]>("points?limit=5000"),
      api.get<Row[]>("measuringdevices?limit=5000"),
      api.get<Row[]>("measuringdevicetypes?limit=1000"),
      api.get<Row[]>("groups?limit=5000"),
    ]).then(([pointEnv, meterEnv, typeEnv, groupEnv]) => {
      if (!mounted) return;
      const points = pointEnv.data || [];
      const meters = meterEnv.data || [];
      const loadedGroups = groupEnv.data || [];
      const typeNames = new Map((typeEnv.data || []).map((row) => [String(row.METER_TYPE_ID), String(row.METER_TYPE_NAME || "")]));
      const groupNames = new Map(loadedGroups.map((row) => [String(row.GR_ID), String(row.GR_NAME || row.GR_CODE || "")]));
      const next = points.map((point, index): MapItem => {
        const meter = meters[index] || {};
        const [lat, lng] = locationFor(index);
        const groupName = groupNames.get(String(point.GR_ID)) || "";
        const typeName = typeNames.get(String(meter.METER_TYPE_ID)) || String(meter.METER_TYPE_NAME || "");
        const recent = Number(point.POINT_AUTO_READ_ENABLED ?? point.POINT_ENABLED ?? 0) === 1;
        return {
          point,
          meter,
          groupName,
          typeName,
          lat,
          lng,
          recent,
          searchText: [point.POINT_CODE, point.POINT_NAME, groupName, meter.METER_NUMBER, typeName].join(" ").toLowerCase(),
        };
      });
      setGroups(loadedGroups);
      setItems(next);
      setUpdatedAt(new Date());
      setError(pointEnv.success ? "" : pointEnv.message || "Не удалось загрузить объекты карты");
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setError("Не удалось загрузить объекты карты");
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = useMemo(
    () => normalizedQuery ? items.filter((item) => item.searchText.includes(normalizedQuery)) : items,
    [items, normalizedQuery],
  );
  const suggestions = normalizedQuery && searchOpen ? visibleItems.slice(0, 7) : [];

  useEffect(() => {
    const layer = markerLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    visibleItems.forEach((item) => {
      const isSelected = selected?.point.POINT_ID === item.point.POINT_ID;
      L.circleMarker([item.lat, item.lng], {
        radius: isSelected ? 10 : 8,
        color: isSelected ? "#8a6500" : item.recent ? "#167144" : "#a23b3b",
        weight: isSelected ? 3 : 2,
        fillColor: isSelected ? "#f2c94c" : item.recent ? "#2ecc71" : "#e66a6a",
        fillOpacity: 1,
      })
        .bindTooltip(`${item.point.POINT_CODE || ""} ${item.point.POINT_NAME || ""}`.trim())
        .on("click", () => setSelected(item))
        .addTo(layer);
    });
  }, [visibleItems, selected]);

  const recentCount = items.filter((item) => item.recent).length;
  const substationCount = useMemo(() => {
    const ids = new Set<string>();
    groups.forEach((group) => {
      if (/(КТП|ТП)\s*[\d№]/i.test(String(group.GR_NAME || ""))) ids.add(String(group.GR_ID));
    });
    return ids.size;
  }, [groups]);

  function focusItem(item: MapItem) {
    setSelected(item);
    setQuery(String(item.point.POINT_CODE || item.point.POINT_NAME || ""));
    setSearchOpen(false);
    mapRef.current?.setView([item.lat, item.lng], 17, { animate: true });
  }

  function resetMap() {
    setQuery("");
    setSearchOpen(false);
    setSelected(null);
    mapRef.current?.setView(CENTER, 14, { animate: true });
  }

  return (
    <div className="gis-workspace">
      <div ref={containerRef} className="gis-map" />

      <div className="gis-toolbar">
        <button className="gis-tool-button" onClick={resetMap} title="Сброс ориентации карты" aria-label="Сброс ориентации карты">
          <IcReset size={15} />
        </button>
        <div className="gis-search">
          <IcSearch size={14} />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => event.key === "Enter" && visibleItems[0] && focusItem(visibleItems[0])}
            placeholder="Текст для поиска объекта"
          />
          {query && <span className="gis-search__count">{visibleItems.length}</span>}
          {suggestions.length > 0 && (
            <div className="gis-search__results">
              {suggestions.map((item) => (
                <button key={item.point.POINT_ID} onClick={() => focusItem(item)}>
                  <b>{item.point.POINT_CODE}</b>
                  <span>{item.point.POINT_NAME || item.groupName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <select className="gis-object-select" value="UZ" aria-label="Объект карты" disabled>
          <option value="UZ">UZ (Монголия)</option>
        </select>
        <span className="gis-toolbar__spacer" />
        <select className="gis-map-select" value={mapStyle} onChange={(event) => setMapStyle(event.target.value as MapStyle)} aria-label="Тип карты">
          {Object.entries(MAP_STYLES).map(([key, style]) => <option key={key} value={key}>{style.label}</option>)}
        </select>
        <button className={`gis-legend-button${legendOpen ? " active" : ""}`} onClick={() => setLegendOpen((value) => !value)}>
          <IcInfo size={14} />
          <span>Обозначения</span>
        </button>
      </div>

      <section className="gis-summary" aria-label="Сводка объекта">
        <header>UZ (Монголия)</header>
        {loading ? <div className="gis-summary__loading">Загрузка...</div> : (
          <dl>
            <KV k="Время обновления" v={updatedAt ? clockText(updatedAt) : "—"} />
            <KV k="Текущее время" v={clockText(now)} />
            <KV k="Количество точек учета объекта" v={String(items.length)} />
            <KV k="Есть показания за последние 2 сутки" v={String(recentCount)} />
            <KV k="Наименование объекта" v="UZ (Монголия)" />
            <KV k="Общее количество ТП/КТП" v={String(substationCount)} />
          </dl>
        )}
        {error && <div className="gis-summary__error">{error}</div>}
      </section>

      {legendOpen && (
        <div className="gis-legend" role="dialog" aria-label="Обозначения карты">
          <b>Обозначения</b>
          <span><i className="gis-dot online" />Есть показания / активна</span>
          <span><i className="gis-dot offline" />Нет актуальных показаний</span>
          <span><i className="gis-dot chosen" />Выбранная точка</span>
          <small>Показано: {visibleItems.length} из {items.length}</small>
        </div>
      )}

      {selected && (
        <aside className="gis-detail">
          <header>
            <span>Данные точки учета</span>
            <button onClick={() => setSelected(null)} aria-label="Закрыть">×</button>
          </header>
          <div className="gis-detail__body">
            <h3>{selected.point.POINT_NAME || selected.point.POINT_CODE}</h3>
            <table>
              <tbody>
                <MetaRow k="Код точки" v={selected.point.POINT_CODE} />
                <MetaRow k="Группа" v={selected.groupName} />
                <MetaRow k="Состояние" v={selected.recent ? "Есть показания" : "Нет актуальных показаний"} />
                <MetaRow k="Счётчик" v={selected.meter.METER_NUMBER} />
                <MetaRow k="Тип счётчика" v={selected.typeName} />
                <MetaRow k="Класс точности" v={selected.meter.METER_CLASS} />
              </tbody>
            </table>
            <div className="gis-detail__actions">
              <a href={`/m/points?search=${encodeURIComponent(selected.point.POINT_CODE || "")}`}>Точка</a>
              <a href={`/meters?search=${encodeURIComponent(selected.meter.METER_NUMBER || selected.point.POINT_CODE || "")}`}>Счётчик</a>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt>{k}:</dt>
      <dd>{v}</dd>
    </div>
  );
}

function MetaRow({ k, v }: { k: string; v: any }) {
  return (
    <tr>
      <th>{k}</th>
      <td>{v ?? ""}</td>
    </tr>
  );
}
