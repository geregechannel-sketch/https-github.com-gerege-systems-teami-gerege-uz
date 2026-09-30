import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api";
import { IcChevron, IcFunnel, IcHome, IcInfo, IcReset, IcSearch } from "../icons";
import "../gis.css";

const CENTER: [number, number] = [48.0793, 114.5550];
const INITIAL_ZOOM = 16;

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

const GIS_LANES = [
  { count: 10, start: [48.0854, 114.5508], step: [-0.00043, 0.00072] },
  { count: 15, start: [48.0838, 114.5497], step: [-0.00042, 0.00065] },
  { count: 16, start: [48.0824, 114.5513], step: [-0.00042, 0.00064] },
  { count: 16, start: [48.0803, 114.5498], step: [-0.00043, 0.00066] },
  { count: 13, start: [48.0779, 114.5514], step: [-0.00036, 0.00069] },
  { count: 10, start: [48.0830, 114.5572], step: [-0.00048, 0.00054] },
  { count: 7, start: [48.0808, 114.5468], step: [-0.00031, 0.00091] },
] as const;

function locationFor(index: number): [number, number] {
  let offset = index;
  for (let laneIndex = 0; laneIndex < GIS_LANES.length; laneIndex += 1) {
    const lane = GIS_LANES[laneIndex];
    if (offset < lane.count) {
      const jitter = ((offset * 7 + laneIndex * 3) % 5 - 2) * 0.000055;
      return [
        lane.start[0] + lane.step[0] * offset + jitter,
        lane.start[1] + lane.step[1] * offset - jitter,
      ];
    }
    offset -= lane.count;
  }
  return CENTER;
}

function markerIcon(item: MapItem, selected: boolean) {
  const state = selected ? "selected" : item.recent ? "recent" : "stale";
  return L.divIcon({
    className: "gis-marker-shell",
    html: `<span class="gis-marker gis-marker--${state}"><i></i></span>`,
    iconSize: [22, 30],
    iconAnchor: [11, 28],
    tooltipAnchor: [0, -25],
  });
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
  const previousViewRef = useRef<{ center: L.LatLng; zoom: number } | null>(null);
  const [items, setItems] = useState<MapItem[]>([]);
  const [selected, setSelected] = useState<MapItem | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>("osm");
  const [legendOpen, setLegendOpen] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);
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
    const map = L.map(containerRef.current, { zoomControl: false }).setView(CENTER, INITIAL_ZOOM);
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
    () => items.filter((item) => (!recentOnly || item.recent) && (!normalizedQuery || item.searchText.includes(normalizedQuery))),
    [items, normalizedQuery, recentOnly],
  );
  const suggestions = normalizedQuery && searchOpen ? visibleItems.slice(0, 7) : [];

  useEffect(() => {
    const layer = markerLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    visibleItems.forEach((item) => {
      const isSelected = selected?.point.POINT_ID === item.point.POINT_ID;
      L.marker([item.lat, item.lng], { icon: markerIcon(item, isSelected) })
        .bindTooltip(`${item.point.POINT_CODE || ""} ${item.point.POINT_NAME || ""}`.trim())
        .on("click", () => setSelected(item))
        .addTo(layer);
    });
  }, [visibleItems, selected]);

  const recentCount = items.filter((item) => item.recent).length;

  function focusItem(item: MapItem) {
    setSelected(item);
    setQuery(String(item.point.POINT_CODE || item.point.POINT_NAME || ""));
    setSearchOpen(false);
    moveMap([item.lat, item.lng], 17);
  }

  function moveMap(center: L.LatLngExpression, zoom: number) {
    const map = mapRef.current;
    if (!map) return;
    previousViewRef.current = { center: map.getCenter(), zoom: map.getZoom() };
    map.setView(center, zoom, { animate: true });
  }

  function resetMap() {
    setQuery("");
    setSearchOpen(false);
    setSelected(null);
    moveMap(CENTER, INITIAL_ZOOM);
  }

  function restorePreviousView() {
    const map = mapRef.current;
    const previous = previousViewRef.current;
    if (!map || !previous) return;
    previousViewRef.current = { center: map.getCenter(), zoom: map.getZoom() };
    map.setView(previous.center, previous.zoom, { animate: true });
  }

  return (
    <div className="gis-workspace">
      <div ref={containerRef} className="gis-map" />

      <div className="gis-toolbar">
        <button className="gis-tool-button gis-tool-button--home" onClick={resetMap} title="Исходный вид" aria-label="Исходный вид">
          <IcHome size={17} />
        </button>
        <button className="gis-tool-button gis-tool-button--back" onClick={restorePreviousView} title="Предыдущий вид" aria-label="Предыдущий вид">
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
        <span className="gis-toolbar__spacer" />
        <select className="gis-map-select" value={mapStyle} onChange={(event) => setMapStyle(event.target.value as MapStyle)} aria-label="Тип карты">
          {Object.entries(MAP_STYLES).map(([key, style]) => <option key={key} value={key}>{style.label}</option>)}
        </select>
        <button
          className={`gis-tool-button gis-filter-button${recentOnly ? " active" : ""}`}
          onClick={() => setRecentOnly((value) => !value)}
          title="Только точки с показаниями"
          aria-label="Только точки с показаниями"
          aria-pressed={recentOnly}
        >
          <IcFunnel size={16} />
        </button>
        <button className={`gis-legend-button${legendOpen ? " active" : ""}`} onClick={() => setLegendOpen((value) => !value)}>
          <IcInfo size={14} />
          <span>Обозначения</span>
        </button>
      </div>

      <section className="gis-summary" aria-label="Сводка объекта">
        <header>
          <span>UZ (Монголия)</span>
          <button onClick={() => setSummaryOpen((value) => !value)} aria-label={summaryOpen ? "Свернуть" : "Развернуть"}>
            <IcChevron size={18} />
          </button>
        </header>
        {summaryOpen && (loading ? <div className="gis-summary__loading">Загрузка...</div> : (
          <dl>
            <KV k="Время обновления" v={updatedAt ? clockText(updatedAt) : "—"} />
            <KV k="Текущее время" v={clockText(now)} />
            <KV k="Количество точек учета объекта" v={String(items.length)} />
            <KV k="Есть показания за последние 2 сутки" v={String(recentCount)} />
            <KV k="Наименование объекта" v="UZ (Монголия)" />
            <KV k="Общее количество ТП/КТП" v="" />
          </dl>
        ))}
        {summaryOpen && error && <div className="gis-summary__error">{error}</div>}
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
