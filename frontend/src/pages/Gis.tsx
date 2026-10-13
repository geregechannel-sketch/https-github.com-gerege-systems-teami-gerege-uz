import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { api } from "../api";
import { IcChevron, IcExpand, IcFunnel, IcGrid, IcHome, IcInfo, IcReset, IcSearch, IcSync } from "../icons";
import "../gis.css";
import { resolveGisGeometry, type RecordedCoordinate } from "../lib/gisGeometry";

const CENTER: [number, number] = [48.075, 114.535];
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

type GisReading = {
  code: string;
  parameter: string;
  pointLabel: string;
  time: string;
};

type ReadingsPayload = { rows: Row[]; total: number };
type GeometryReference = {capturedAt:string; points:RecordedCoordinate[]; map:{X1:number; X2:number; Y1:number; Y2:number}};

type MapItem = {
  point: Row;
  meter: Row;
  groupName: string;
  typeName: string;
  lat: number | null;
  lng: number | null;
  recent: boolean;
  searchText: string;
};

const DAILY_PARAMETERS = [
  { code: "A_PLUS", label: "A+ энергия за сутки" },
  { code: "A_MINUS", label: "A- энергия за сутки" },
  { code: "R_PLUS", label: "R+ энергия за сутки" },
  { code: "R_MINUS", label: "R- энергия за сутки" },
] as const;

function markerIcon(item: MapItem, selected: boolean) {
  return L.icon({
    iconUrl: item.recent ? "/assets/gis/pinGreen.png" : "/assets/gis/pinGray.png",
    className: `gis-marker-shell${selected ? " gis-marker-shell--selected" : ""}`,
    iconSize: [22, 30],
    // ArcGIS renders the source 22x30 picture marker with yoffset: 5.
    iconAnchor: [11, 20],
    tooltipAnchor: [0, -20],
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

function isoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readingTime(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value || "");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

export default function Gis() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const previousViewRef = useRef<{ center: L.LatLng; zoom: number } | null>(null);
  const detailRequestRef = useRef(0);
  const [items, setItems] = useState<MapItem[]>([]);
  const [selected, setSelected] = useState<MapItem | null>(null);
  const [mapCenter, setMapCenter] = useState<[number,number]>(CENTER);
  const [geometryCapturedAt, setGeometryCapturedAt] = useState("");
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
  const [detailReadings, setDetailReadings] = useState<GisReading[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailSection, setDetailSection] = useState("readings");
  const [detailFilterOpen, setDetailFilterOpen] = useState(false);
  const [detailParameterFilter, setDetailParameterFilter] = useState<Set<string>>(
    () => new Set(DAILY_PARAMETERS.map((parameter) => parameter.code)),
  );
  const [detailEvents, setDetailEvents] = useState<Row[]>([]);
  const [detailEventsLoading, setDetailEventsLoading] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView(CENTER, INITIAL_ZOOM);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.scale({ position: "bottomleft", metric: true, imperial: false, maxWidth: 125 }).addTo(map);
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
      api.get<Row[]>("gis/availability"),
      api.get<GeometryReference>("gis/reference"),
    ]).then(([pointEnv, meterEnv, typeEnv, groupEnv, availabilityEnv, geometryEnv]) => {
      if (!mounted) return;
      const points = (pointEnv.data || []).filter((point) => Number(point.POINT_INTERNAL || 0) === 0);
      const meters = meterEnv.data || [];
      const observations = new Map((availabilityEnv.data || []).map(row => [String(row.POINT_ID),row]));
      const meterByID = new Map(meters.map(row => [String(row.METER_ID),row]));
      const loadedGroups = groupEnv.data || [];
      const typeNames = new Map((typeEnv.data || []).map((row) => [String(row.METER_TYPE_ID), String(row.METER_TYPE_NAME || "")]));
      const groupNames = new Map(loadedGroups.map((row) => [String(row.GR_ID), String(row.GR_NAME || row.GR_CODE || "")]));
      const reference = geometryEnv.success ? geometryEnv.data : undefined;
      setGeometryCapturedAt(reference?.capturedAt || "");
      if (reference?.map) {
        const center:[number,number] = [(reference.map.Y1+reference.map.Y2)/2,(reference.map.X1+reference.map.X2)/2];
        setMapCenter(center);
        mapRef.current?.setView(center,INITIAL_ZOOM);
      }
      const next = points.map((point): MapItem => {
        const observation = observations.get(String(point.POINT_ID));
        const meter = meterByID.get(String(observation?.METER_ID)) || {};
        const {lat,lng} = resolveGisGeometry(point, points, reference?.points || []);
        const groupName = groupNames.get(String(point.GR_ID)) || "";
        const typeName = typeNames.get(String(meter.METER_TYPE_ID)) || String(meter.METER_TYPE_NAME || "");
        const recent = Boolean(observation?.LAST_READING_AT);
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
      setError(!pointEnv.success ? pointEnv.message || "Не удалось загрузить объекты карты" : !availabilityEnv.success ? "Не удалось подтвердить время показаний" : !geometryEnv.success ? "Не удалось получить координаты источника" : "");
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
      if (item.lat == null || item.lng == null) return;
      const isSelected = selected?.point.POINT_ID === item.point.POINT_ID;
      L.marker([item.lat, item.lng], { icon: markerIcon(item, isSelected) })
        .bindTooltip(`${item.point.POINT_CODE || ""} ${item.point.POINT_NAME || ""}`.trim())
        .on("click", () => setSelected(item))
        .addTo(layer);
    });
  }, [visibleItems, selected]);

  useEffect(() => {
    if (!selected) {
      detailRequestRef.current += 1;
      setDetailReadings([]);
      return;
    }
    setDetailSection("readings");
    setDetailFilterOpen(false);
    setDetailParameterFilter(new Set(DAILY_PARAMETERS.map((parameter) => parameter.code)));
    setSelectedEvents(new Set());
    void loadDetailReadings(selected);
    void loadDetailEvents(selected);
  }, [selected]);

  const recentCount = items.filter((item) => item.recent).length;
  const visibleDetailReadings = detailReadings.filter((row) => detailParameterFilter.has(row.code));

  function focusItem(item: MapItem) {
    setSelected(item);
    setQuery(String(item.point.POINT_CODE || item.point.POINT_NAME || ""));
    setSearchOpen(false);
    if (item.lat != null && item.lng != null) moveMap([item.lat, item.lng], 17);
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
    moveMap(mapCenter, INITIAL_ZOOM);
  }

  function restorePreviousView() {
    const map = mapRef.current;
    const previous = previousViewRef.current;
    if (!map || !previous) return;
    previousViewRef.current = { center: map.getCenter(), zoom: map.getZoom() };
    map.setView(previous.center, previous.zoom, { animate: true });
  }

  async function loadDetailReadings(item: MapItem) {
    const requestID = ++detailRequestRef.current;
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const day = isoDate(date);
    setDetailLoading(true);
    setDetailError("");
    try {
      const env = await api.post<ReadingsPayload>("readings/query", {
        point_ids: [Number(item.point.POINT_ID)],
        parameters: DAILY_PARAMETERS.map((parameter) => parameter.code),
        from: day,
        to: day,
      });
      if (requestID !== detailRequestRef.current) return;
      if (!env.success) throw new Error(env.message || "Не удалось обновить показания");
      const sourceRows = env.data?.rows || [];
      const rowByCode = new Map<string, Row>();
      sourceRows.forEach((row) => {
        const code = String(row.PARAMETER_CODE || "");
        if (!rowByCode.has(code)) rowByCode.set(code, row);
      });
      const pointLabel = String(item.point.POINT_NAME || item.point.POINT_CODE || "");
      setDetailReadings(DAILY_PARAMETERS.map((parameter) => {
        const row = rowByCode.get(parameter.code);
        return {
          code: parameter.code,
          parameter: parameter.label,
          pointLabel,
          time: readingTime(row?.READING_TIME),
        };
      }));
    } catch (loadError: any) {
      if (requestID !== detailRequestRef.current) return;
      const pointLabel = String(item.point.POINT_NAME || item.point.POINT_CODE || "");
      setDetailReadings(DAILY_PARAMETERS.map((parameter) => ({
        code: parameter.code,
        parameter: parameter.label,
        pointLabel,
        time: readingTime(null),
      })));
      setDetailError(loadError?.message || "Не удалось обновить показания");
    } finally {
      if (requestID === detailRequestRef.current) setDetailLoading(false);
    }
  }

  async function loadDetailEvents(item: MapItem) {
    const today = isoDate(new Date());
    setDetailEventsLoading(true);
    try {
      const env = await api.post<Row[]>("eventlog/query", {
        category: "all",
        from: today,
        to: today,
        search: String(item.point.POINT_NAME || item.point.POINT_CODE || ""),
        limit: 200,
        offset: 0,
      });
      setDetailEvents(env.success ? env.data || [] : []);
    } catch {
      setDetailEvents([]);
    } finally {
      setDetailEventsLoading(false);
    }
  }

  function toggleDetailEvent(id: string) {
    setSelectedEvents((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function acknowledgeDetailEvents(all: boolean) {
    const ids = all
      ? new Set(detailEvents.filter((row) => !row.EV_ACKNOWLEDGED).map((row) => String(row.EV_ID)))
      : selectedEvents;
    if (!ids.size) return;
    setDetailEvents((current) => current.map((row) => ids.has(String(row.EV_ID)) ? { ...row, EV_ACKNOWLEDGED: true } : row));
    setSelectedEvents(new Set());
  }

  function exportDetailReadings() {
    if (!selected) return;
    const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Точка/группа", "Параметр", "Время"],
      ...visibleDetailReadings.map((row) => [row.pointLabel, row.parameter, row.time]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(quote).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selected.point.POINT_CODE || "gis-readings"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
          <button className="gis-search__menu" onClick={() => setSearchOpen((value) => !value)} aria-label="Параметры поиска">
            <IcChevron size={14} />
          </button>
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

      <button className="gis-compass" onClick={resetMap} title="Ориентация на север" aria-label="Ориентация на север"><span>▲</span></button>

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
            <KV k="Координаты: снимок" v={geometryCapturedAt.slice(0,10) || "—"} />
            <KV k="Без подтвержденных координат" v={String(items.filter(item => item.lat == null || item.lng == null).length)} />
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
        <aside className={`gis-detail${["events", "ack", "links"].includes(detailSection) ? " gis-detail--wide" : ""}`} aria-label="Показания точки учета">
          <header className="gis-detail__title">
            <span title={`${selected.groupName} ${selected.point.POINT_NAME || selected.point.POINT_CODE}`.trim()}>
              {[selected.groupName, selected.point.POINT_NAME || selected.point.POINT_CODE].filter(Boolean).join(". ")}
            </span>
            <div>
              <a href={`/m/points?search=${encodeURIComponent(selected.point.POINT_CODE || "")}`} title="Открыть точку" aria-label="Открыть точку">
                <IcExpand size={14} />
              </a>
              <button onClick={() => setSelected(null)} title="Закрыть" aria-label="Закрыть">×</button>
            </div>
          </header>

          <div className="gis-detail__panels">
            <DetailPanel
              label="Показания"
              id="readings"
              open={detailSection}
              onToggle={setDetailSection}
              action={<button onClick={() => loadDetailReadings(selected)} disabled={detailLoading} title="Обновить" aria-label="Обновить"><IcSync size={17} /></button>}
            >
              <div className="gis-detail__readings">
                <div className="gis-detail__table-scroll">
                  <table>
                    <thead><tr><th>Точка/группа</th><th>Параметр</th><th>Время</th></tr></thead>
                    <tbody>
                      {visibleDetailReadings.map((row) => (
                        <tr key={row.code}>
                          <td title={row.pointLabel}>{row.pointLabel}</td>
                          <td>{row.parameter}</td>
                          <td>{row.time}</td>
                        </tr>
                      ))}
                      {detailLoading && !detailReadings.length && <tr><td colSpan={3} className="gis-detail__empty">Загрузка...</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="gis-detail__table-status">
                  <span>{detailError ? "Нет связи. Показаны последние данные." : "Выделенных нет."} Всего {visibleDetailReadings.length}</span>
                  <button
                    className={`gis-detail__filter${detailFilterOpen ? " active" : ""}`}
                    onClick={() => setDetailFilterOpen((value) => !value)}
                    title="Фильтр"
                    aria-label="Фильтр"
                    aria-expanded={detailFilterOpen}
                  ><IcFunnel size={18} /></button>
                  <button className="gis-detail__excel" onClick={exportDetailReadings} title="Экспорт Excel" aria-label="Экспорт Excel"><span>X</span></button>
                  {detailFilterOpen && (
                    <div className="gis-detail__filter-menu">
                      <b>Параметры</b>
                      {DAILY_PARAMETERS.map((parameter) => (
                        <label key={parameter.code}>
                          <input
                            type="checkbox"
                            checked={detailParameterFilter.has(parameter.code)}
                            onChange={() => setDetailParameterFilter((current) => {
                              const next = new Set(current);
                              next.has(parameter.code) ? next.delete(parameter.code) : next.add(parameter.code);
                              return next;
                            })}
                          />
                          <span>{parameter.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DetailPanel>

            <DetailPanel label="Информация объекта" id="info" open={detailSection} onToggle={setDetailSection}>
              <dl>
                <KV k="Код точки" v={String(selected.point.POINT_CODE || "")} />
                <KV k="Группа" v={selected.groupName} />
                <KV k="Состояние" v={selected.recent ? "Есть показания" : "Нет актуальных показаний"} />
                <KV k="Счётчик" v={String(selected.meter.METER_NUMBER || "")} />
                <KV k="Тип счётчика" v={selected.typeName} />
                <KV k="Класс точности" v={String(selected.meter.METER_CLASS || "")} />
              </dl>
            </DetailPanel>

            <DetailPanel
              label="События"
              id="events"
              open={detailSection}
              onToggle={setDetailSection}
              action={<button onClick={() => loadDetailEvents(selected)} disabled={detailEventsLoading} title="Обновить" aria-label="Обновить события"><IcSync size={17} /></button>}
            >
              <EventDetailGrid rows={detailEvents} loading={detailEventsLoading} mode="events" selected={selectedEvents} onSelect={toggleDetailEvent} />
            </DetailPanel>

            <DetailPanel
              label="Подтверждение событий"
              id="ack"
              open={detailSection}
              onToggle={setDetailSection}
              action={<button onClick={() => loadDetailEvents(selected)} disabled={detailEventsLoading} title="Обновить" aria-label="Обновить подтверждения"><IcSync size={17} /></button>}
            >
              <div className="gis-detail__ack">
                <EventDetailGrid rows={detailEvents.filter((row) => !row.EV_ACKNOWLEDGED)} loading={detailEventsLoading} mode="ack" selected={selectedEvents} onSelect={toggleDetailEvent} />
                <div className="gis-detail__ack-actions">
                  <button disabled={!selectedEvents.size} onClick={() => acknowledgeDetailEvents(false)}>Подтвердить</button>
                  <button disabled={!detailEvents.some((row) => !row.EV_ACKNOWLEDGED)} onClick={() => acknowledgeDetailEvents(true)}>Подтвердить все</button>
                </div>
              </div>
            </DetailPanel>

            <DetailPanel label="Ссылки" id="links" open={detailSection} onToggle={setDetailSection}>
              <ul className="gis-detail__links">
                <li>
                  <Link to={`/archives?point=${encodeURIComponent(String(selected.point.POINT_ID || selected.point.POINT_CODE || ""))}&view=profile`}>
                    Суточный профиль
                  </Link>
                </li>
                <li>
                  <Link to={`/quality_reports?point=${encodeURIComponent(String(selected.point.POINT_ID || selected.point.POINT_CODE || ""))}`}>
                    Качество показаний
                  </Link>
                </li>
              </ul>
            </DetailPanel>
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

function DetailPanel({ label, id, open, onToggle, action, children }: {
  label: string;
  id: string;
  open: string;
  onToggle: (id: string) => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const expanded = open === id;
  return (
    <section className={`gis-detail__panel${expanded ? " open" : ""}`}>
      <div className="gis-detail__panel-head">
        <button onClick={() => onToggle(id)} aria-expanded={expanded}>{label}</button>
        {expanded && action}
      </div>
      {expanded && <div className="gis-detail__panel-body">{children}</div>}
    </section>
  );
}

function EventDetailGrid({ rows, loading, mode, selected, onSelect }: {
  rows: Row[];
  loading: boolean;
  mode: "events" | "ack";
  selected: Set<string>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="gis-detail__event-grid">
      <table>
        <thead><tr>
          <th>Время события</th>
          {mode === "events" && <th>Ошибка</th>}
          <th>Объект связи</th>
          <th>Объект учета</th>
          <th>Сообщение события</th>
          {mode === "ack" && <th>Подтвердил</th>}
        </tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.EV_ID} className={selected.has(String(row.EV_ID)) ? "selected" : ""} onClick={() => onSelect(String(row.EV_ID))}>
              <td>{readingTime(row.EV_TIME)}</td>
              {mode === "events" && <td>{["ERROR", "CRITICAL"].includes(String(row.EV_PRIORITY)) ? "Да" : "Нет"}</td>}
              <td>{row.EV_SOURCE || "—"}</td>
              <td>{row.EV_POINT_NAME || "—"}</td>
              <td>{row.EV_TEXT || "—"}</td>
              {mode === "ack" && <td>{row.EV_ACKNOWLEDGED ? "ADMIN" : "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && !loading && <EmptyGridState />}
      {loading && <div className="gis-detail__grid-loading">Загрузка...</div>}
    </div>
  );
}

function EmptyGridState() {
  return (
    <div className="gis-detail__empty-state">
      <IcGrid size={66} />
      <span>Список пустой</span>
    </div>
  );
}
