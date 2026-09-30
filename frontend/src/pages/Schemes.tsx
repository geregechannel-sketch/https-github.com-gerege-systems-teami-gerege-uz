import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { IcClock, IcExpand, IcGear, IcMinus, IcPlus, IcSave, IcSitemap, IcSync, MENU_ICONS } from "../icons";
import "../archives.css";
import "../schemes.css";

type Row = Record<string, any>;
type SchemeNode = {
  id: string;
  kind: string;
  x: number;
  y: number;
  label: string;
  secondary?: string;
  signal_code?: string;
};
type SchemeEdge = { x1: number; y1: number; x2: number; y2: number };
type SchemeLayout = {
  title: string;
  subtitle?: string;
  canvas: { width: number; height: number };
  nodes: SchemeNode[];
  edges: SchemeEdge[];
};
type SchemeView = {
  scheme: Row;
  layout: SchemeLayout;
  signals: Row[];
  summary: Row;
  db_time: string;
};
type OverviewTile = { TITLE: string; STAT: string; COLOR?: string; DATE_VALUE?: string };

const SchemeIcon = MENU_ICONS.schema;

function formatDate(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
}

function formatTileDate(value: unknown) {
  const source = String(value || "");
  if (/^\d{2}-\d{2}-\d{4}\s\d{2}:\d{2}:\d{2}$/.test(source)) return source;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function statusColor(signal?: Row) {
  if (!signal) return "#6383a8";
  if (signal.STATE === "alarm") return "#dc4f54";
  if (signal.STATE === "blocked") return "#7d8792";
  if (signal.STATE === "on") return "#2fae75";
  return "#d98b3f";
}

export default function Schemes() {
  const { mode: rawMode } = useParams();
  const navigate = useNavigate();
  const mode = rawMode === "viewer" ? "viewer" : "overview";
  const [catalog, setCatalog] = useState<Row[]>([]);
  const [overviewTiles, setOverviewTiles] = useState<OverviewTile[]>([]);
  const [selectedID, setSelectedID] = useState<number | null>(null);
  const [pendingID, setPendingID] = useState<number | null>(null);
  const [view, setView] = useState<SchemeView | null>(null);
  const [selectedNodeID, setSelectedNodeID] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"picker" | "settings" | null>(null);
  const [settings, setSettings] = useState({
    inactivity: 180,
    animate: true,
    sound: true,
    numberFormat: true,
    archiveLimits: false,
    commonRefresh: true,
    refreshSeconds: 30,
  });
  const workspaceRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  async function loadCatalog() {
    const env = await api.get<Row[]>("schemes");
    if (!env.success) {
      setError(env.message || "Не удалось загрузить список схем");
      return;
    }
    const rows = env.data || [];
    setCatalog(rows);
    setSelectedID((current) => current || (rows[0] ? Number(rows[0].SCHEME_ID) : null));
  }

  async function loadView(id = selectedID) {
    if (!id) return;
    setLoading(true);
    const env = await api.get<SchemeView>(`schemes/${id}/view`);
    setLoading(false);
    if (!env.success || !env.data) {
      setError(env.message || "Не удалось загрузить схему");
      return;
    }
    setView(env.data);
    setSelectedNodeID((current) => current && env.data?.layout.nodes.some((node) => node.id === current) ? current : null);
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (mode !== "overview") return;
    api.post<OverviewTile[]>("homedashboard/data", {}).then((env) => {
      if (env.success) setOverviewTiles(env.data || []);
    });
  }, [mode]);

  useEffect(() => {
    if (mode === "viewer" && selectedID) loadView(selectedID);
  }, [mode, selectedID]);

  useEffect(() => {
    if (mode !== "viewer" || !selectedID || !autoRefresh) return;
    const interval = window.setInterval(() => loadView(selectedID), Math.max(5, settings.refreshSeconds) * 1000);
    return () => window.clearInterval(interval);
  }, [mode, selectedID, autoRefresh, settings.refreshSeconds]);

  const signalsByCode = useMemo(() => new Map((view?.signals || []).map((signal) => [String(signal.SIGNAL_CODE), signal])), [view]);
  const selectedNode = view?.layout.nodes.find((node) => node.id === selectedNodeID) || null;
  const selectedSignal = selectedNode?.signal_code ? signalsByCode.get(selectedNode.signal_code) : null;

  async function runSignalCommand(action: "DEVICE" | "SEND") {
    if (!selectedSignal) return;
    const env = await api.post<Row>(`telesignals/signals/${selectedSignal.SIGNAL_ID}/commands`, { action });
    if (!env.success) {
      setError(env.message || "Команда не выполнена");
      return;
    }
    setNotice(env.data?.MESSAGE || "Команда выполнена");
    loadView();
  }

  async function toggleSignalValue() {
    if (!selectedSignal || selectedSignal.BLOCKED) return;
    const nextValue = String(selectedSignal.CURRENT_VALUE) === "1" ? "0" : "1";
    const env = await api.post("telesignals/history", {
      signal_id: Number(selectedSignal.SIGNAL_ID),
      value: nextValue,
      source: "OPERATOR",
      comment: "Переключение из мнемосхемы",
    });
    if (!env.success) {
      setError(env.message || "Переключение не выполнено");
      return;
    }
    setNotice("Состояние элемента изменено");
    loadView();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else workspaceRef.current?.requestFullscreen();
  }

  function exportPNG() {
    const svg = svgRef.current;
    if (!svg || !view) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = view.layout.canvas.width;
      canvas.height = view.layout.canvas.height;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0);
      canvas.toBlob((png) => {
        if (!png) return;
        const pngURL = URL.createObjectURL(png);
        const anchor = document.createElement("a");
        anchor.href = pngURL;
        anchor.download = `${view.scheme.SCHEME_CODE || "scheme"}.png`;
        anchor.click();
        URL.revokeObjectURL(pngURL);
      }, "image/png");
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  function NodeSymbol({ node, signal }: { node: SchemeNode; signal?: Row }) {
    const color = statusColor(signal);
    const active = selectedNodeID === node.id;
    return (
      <g
        className={`sch-node ${active ? "selected" : ""}`}
        transform={`translate(${node.x} ${node.y})`}
        role="button"
        tabIndex={0}
        aria-label={`${node.label}${signal ? `: ${signal.DISPLAY_VALUE}` : ""}`}
        onClick={() => setSelectedNodeID(node.id)}
        onKeyDown={(event) => event.key === "Enter" && setSelectedNodeID(node.id)}
      >
        {node.kind === "breaker" ? (
          <><rect x="-29" y="-29" width="58" height="58" rx="4" fill="#f8fbfd" stroke={color} strokeWidth="5" /><line x1="-15" y1="15" x2="15" y2="-15" stroke={color} strokeWidth="7" /></>
        ) : node.kind === "transformer" ? (
          <><circle cx="-17" cy="0" r="27" fill="#f8fbfd" stroke="#567492" strokeWidth="5" /><circle cx="17" cy="0" r="27" fill="#f8fbfd" stroke="#567492" strokeWidth="5" /></>
        ) : node.kind === "bus" ? (
          <rect x="-94" y="-10" width="188" height="20" rx="3" fill={color} stroke="#eef4f8" strokeWidth="3" />
        ) : (
          <><rect x="-65" y="-31" width="130" height="62" rx="5" fill="#f8fbfd" stroke={color} strokeWidth="4" /><circle cx="50" cy="-17" r="7" fill={color} /></>
        )}
        <text x="0" y={node.kind === "bus" ? -21 : 49} textAnchor="middle" fill="#263746" fontSize="17" fontWeight="600">{node.label}</text>
        {node.secondary && <text x="0" y={node.kind === "bus" ? 32 : 68} textAnchor="middle" fill="#536575" fontSize="12">{node.secondary}</text>}
        {signal && <text x="0" y={node.kind === "bus" ? 51 : 86} textAnchor="middle" fill={color} fontSize="12" fontWeight="700">{signal.DISPLAY_VALUE}</text>}
      </g>
    );
  }

  if (!catalog.length && !error) return <div className="toshi-loader" />;

  return (
    <div className={`aw sch sch--${mode}`} ref={workspaceRef}>
      {mode === "viewer" && <div className="aw__title">
        <button className="sch-title-icon" title="На весь экран" aria-label="На весь экран" onClick={toggleFullscreen}><IcExpand size={14} /></button>
        <span>Схемы - {mode === "viewer" ? "Просмотр схем" : "Обзор"}</span>
        <span className="sp" />
        {mode === "viewer" && <button className="ic" aria-label="Обновить" title="Обновить" onClick={() => loadView()}><IcSync size={14} /></button>}
      </div>}

      {error && <div className="sch-message error">{error}<button onClick={() => setError("")}>×</button></div>}
      {notice && <div className="sch-message success">{notice}<button onClick={() => setNotice("")}>×</button></div>}

      {mode === "overview" ? (
        <div className="sch-overview">
          <div className="sch-kpis">
            {overviewTiles.map((tile) => (
              <article key={tile.TITLE} style={{ background: tile.COLOR || "#3cb478" }}>
                <strong>{tile.TITLE}</strong>
                <time>{formatTileDate(tile.DATE_VALUE)}</time>
                <span>{tile.STAT}</span>
              </article>
            ))}
          </div>
          <section className="sch-hub-card">
            <div><h2>Просмотр схем</h2><p>Просмотр мнемосхем.</p></div>
            <button onClick={() => navigate("/schemes/viewer")}>Открыть</button>
          </section>
        </div>
      ) : (
        <div className="sch-viewer">
          <div className="sch-toolbar">
            <span className="sch-toolbar-label">Схема</span>
            <input value={view?.scheme.SCHEME_NAME || ""} readOnly aria-label="Схема" />
            <button className="blue" title="Выбрать схему" aria-label="Выбрать схему" onClick={() => { setPendingID(selectedID); setModal("picker"); }}><IcSitemap size={17} /></button>
            <button className="orange" title="Архивный период" aria-label="Архивный период"><IcClock size={17} /></button>
            <button className="green" title="Обновить данные" aria-label="Обновить данные" onClick={() => loadView()}><IcSync size={17} /></button>
            <button className="purple" title={autoRefresh ? "Остановить автообновление" : "Запустить автообновление"} aria-label="Автообновление" onClick={() => setAutoRefresh((current) => !current)}><span aria-hidden>{autoRefresh ? "Ⅱ" : "▶"}</span></button>
            <button className={Number(view?.summary.ALARMS || 0) ? "red" : "mint"} title="Аварийные сигналы" aria-label="Аварийные сигналы"><strong>!</strong></button>
            <div className="sch-db-time"><span>Время сервера БД:</span><strong>{formatDate(view?.db_time)}</strong></div>
            <div className="sch-live-state"><span className={autoRefresh ? "running" : "paused"} /><div><strong>{loading ? "Обновление данных..." : autoRefresh ? "Данные обновляются" : "Обновление приостановлено"}</strong><small>{view ? `Сигналов: ${view.summary.SIGNALS} · Аварий: ${view.summary.ALARMS}` : "—"}</small></div></div>
            <button className="orange" title="Уменьшить" aria-label="Уменьшить" onClick={() => setZoom((value) => Math.max(50, value - 10))}><IcMinus size={17} /></button>
            <output>{zoom}%</output>
            <button className="orange" title="Увеличить" aria-label="Увеличить" onClick={() => setZoom((value) => Math.min(180, value + 10))}><IcPlus size={17} /></button>
            <button className="purple" title="Масштаб 100%" aria-label="Масштаб 100%" onClick={() => setZoom(100)}>◎</button>
            <button className="teal" title="На весь экран" aria-label="На весь экран" onClick={toggleFullscreen}><IcExpand size={17} /></button>
          </div>

          <div className="sch-stage-layout">
            <div className="sch-canvas-scroll">
              {view ? (
                <svg
                  ref={svgRef}
                  className="sch-canvas"
                  viewBox={`0 0 ${view.layout.canvas.width} ${view.layout.canvas.height}`}
                  style={{ width: `${zoom}%` }}
                  aria-label={view.layout.title}
                >
                  <rect width="100%" height="100%" fill="#aeb9d8" />
                  <text x="30" y="38" fill="#24394e" fontSize="22" fontWeight="700">{view.layout.title}</text>
                  <text x="30" y="61" fill="#51677b" fontSize="13">{view.layout.subtitle}</text>
                  {view.layout.edges.map((edge, index) => <line key={index} {...edge} stroke="#41586d" strokeWidth="6" strokeLinecap="round" />)}
                  {view.layout.nodes.map((node) => <NodeSymbol key={node.id} node={node} signal={node.signal_code ? signalsByCode.get(node.signal_code) : undefined} />)}
                </svg>
              ) : <div className="toshi-loader" />}
            </div>

            <aside className="sch-inspector">
              <div className="sch-inspector-head">Состояние элемента</div>
              {selectedNode ? <>
                <div className="sch-selected-status" style={{ borderColor: statusColor(selectedSignal) }}><span style={{ background: statusColor(selectedSignal) }} /><div><strong>{selectedNode.label}</strong><small>{selectedNode.secondary || selectedNode.kind}</small></div></div>
                <dl><dt>Код сигнала</dt><dd>{selectedSignal?.SIGNAL_CODE || "—"}</dd><dt>Значение</dt><dd>{selectedSignal?.DISPLAY_VALUE || "Нет привязки"}</dd><dt>Переключение</dt><dd>{formatDate(selectedSignal?.SWITCHED_AT)}</dd><dt>Блокировка</dt><dd>{selectedSignal?.BLOCKED ? "Да" : "Нет"}</dd></dl>
                <button className="sch-command green" disabled={!selectedSignal} onClick={() => runSignalCommand("DEVICE")}>С устройства</button>
                <button className="sch-command blue" disabled={!selectedSignal} onClick={() => runSignalCommand("SEND")}>Слать команду</button>
                <button className="sch-command orange" disabled={!selectedSignal || selectedSignal.BLOCKED} onClick={toggleSignalValue}>Переключить</button>
              </> : <div className="sch-summary"><p>Выберите элемент на схеме.</p><div><span className="green" />Норма <strong>{view?.summary.ONLINE || 0}</strong></div><div><span className="orange" />Отключено <strong>{Math.max(0, Number(view?.summary.SIGNALS || 0) - Number(view?.summary.ONLINE || 0) - Number(view?.summary.ALARMS || 0) - Number(view?.summary.BLOCKED || 0))}</strong></div><div><span className="red" />Авария <strong>{view?.summary.ALARMS || 0}</strong></div><div><span className="gray" />Блокировано <strong>{view?.summary.BLOCKED || 0}</strong></div></div>}
            </aside>
          </div>

          <div className="sch-footer">
            <span className="sch-updated">Данные: {formatDate(view?.summary.DATA_UPDATED_AT)}</span>
            <button className="green" onClick={() => setModal("settings")}><IcGear size={17} /> Настройки</button>
            <button className="teal" disabled={!view} onClick={exportPNG}><IcSave size={17} /> Сделать снимок экрана</button>
          </div>
        </div>
      )}

      {modal === "picker" && (
        <div className="sch-modal" role="dialog" aria-modal="true" aria-label="Выбор схемы" onMouseDown={() => setModal(null)}>
          <div className="sch-dialog picker" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sch-dialog-head"><span>Выбор схемы</span><button onClick={() => setModal(null)}>×</button></div>
            <div className="sch-picker-list">{catalog.map((scheme) => <button key={scheme.SCHEME_ID} className={pendingID === Number(scheme.SCHEME_ID) ? "active" : ""} onClick={() => setPendingID(Number(scheme.SCHEME_ID))}><SchemeIcon size={18} /><span><strong>{scheme.SCHEME_NAME}</strong><small>{scheme.SCHEME_CODE}</small></span></button>)}{!catalog.length && <p>Список пустой</p>}</div>
            <div className="sch-dialog-actions"><button className="green" disabled={!pendingID} onClick={() => { setSelectedID(pendingID); setModal(null); }}>OK</button><button onClick={() => setModal(null)}>Отменить</button></div>
          </div>
        </div>
      )}

      {modal === "settings" && (
        <div className="sch-modal" role="dialog" aria-modal="true" aria-label="Установки" onMouseDown={() => setModal(null)}>
          <div className="sch-dialog settings" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sch-dialog-head"><span>Установки</span><button onClick={() => setModal(null)}>×</button></div>
            <div className="sch-settings-form">
              <label><span>Интервал неактивности (схемы), сек</span><input type="number" min="30" value={settings.inactivity} onChange={(event) => setSettings({ ...settings, inactivity: Number(event.target.value) })} /></label>
              <label className="check"><input type="checkbox" checked={settings.animate} onChange={(event) => setSettings({ ...settings, animate: event.target.checked })} /> Анимация обновления данных</label>
              <label className="check"><input type="checkbox" checked={settings.sound} onChange={(event) => setSettings({ ...settings, sound: event.target.checked })} /> Использовать звук</label>
              <label className="check"><input type="checkbox" checked={settings.numberFormat} onChange={(event) => setSettings({ ...settings, numberFormat: event.target.checked })} /> Использовать настройки форматирования чисел в схемах</label>
              <label className="check"><input type="checkbox" checked={settings.archiveLimits} onChange={(event) => setSettings({ ...settings, archiveLimits: event.target.checked })} /> Просмотр архивов с пределами</label>
              <label className="refresh"><span><input type="checkbox" checked={settings.commonRefresh} onChange={(event) => setSettings({ ...settings, commonRefresh: event.target.checked })} /> Общий интервал обновления, сек</span><input type="number" min="5" value={settings.refreshSeconds} onChange={(event) => setSettings({ ...settings, refreshSeconds: Number(event.target.value) })} /></label>
              <label className="check"><input type="checkbox" checked={!settings.commonRefresh} onChange={(event) => setSettings({ ...settings, commonRefresh: !event.target.checked })} /> Индивидуальный интервал обновления, сек</label>
            </div>
            <div className="sch-dialog-actions"><button className="green" onClick={() => { setModal(null); setNotice("Настройки применены"); }}>OK</button><button onClick={() => setModal(null)}>Отменить</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
