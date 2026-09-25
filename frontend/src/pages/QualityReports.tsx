import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import "../archives.css";
import "../quality.css";
import {
  IcChevron,
  IcClock,
  IcExpand,
  IcEye,
  IcFolder,
  IcGear,
  IcGrid,
  IcInfo,
  IcReset,
  IcSearch,
  IcSitemap,
} from "../icons";
import { MENU_ICONS } from "../icons";

type Row = Record<string, any>;
type QualityRow = Row & { COLOR?: number[] };

const resourceTree = [
  { name: "Другие измерения", children: ["Частота", "Коэффициент мощности"] },
  { name: "Электричество", children: ["Активная энергия A+", "Активная энергия A-", "Реактивная энергия R+", "Реактивная энергия R-"] },
  { name: "Воздух", children: ["Объем", "Давление"] },
  { name: "Холод", children: ["Энергия", "Температура"] },
  { name: "Теплоноситель", children: ["Тепловая энергия", "Расход"] },
  { name: "Газ", children: ["Объем газа"] },
  { name: "Холодная вода", children: ["Объем воды"] },
  { name: "Горячая вода", children: ["Объем воды", "Температура"] },
];

const filterLabels = [
  ["SHOW_GENERATED", "Показывать сгенерированные"],
  ["SHOW_NON_DISCRETE", "Показывать непрерывные"],
  ["OWN", "Собственные"],
  ["NOT_OWN", "Не собственные"],
  ["COMERCIAL", "Коммерческие"],
  ["TECH", "Технические"],
  ["AUTOMATED", "Автоматизированные"],
  ["NOT_AUTOMATED", "Не автоматизированные"],
  ["SHOW_DI_ENABLED", "Дискретные включены"],
  ["SHOW_SE_ENABLED", "События включены"],
  ["IGNORE_MCC", "Игнорировать МСС"],
  ["IGNORE_ICC", "Игнорировать ICC"],
  ["IGNORE_ACT", "Игнорировать акты"],
  ["SHOW_POINT_ANYWAY", "Показывать точку всегда"],
];

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateSequence(from: string, to: string) {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (d <= end && out.length < 366) {
    out.push(iso(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export default function QualityReports() {
  const [groups, setGroups] = useState<Row[]>([]);
  const [points, setPoints] = useState<Row[]>([]);
  const [measureSets, setMeasureSets] = useState<Row[]>([]);
  const [exchangeAddresses, setExchangeAddresses] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
  const [selectedParams, setSelectedParams] = useState<Set<string>>(new Set());
  const [paramOpen, setParamOpen] = useState<Set<string>>(new Set(["Электричество"]));
  const [tab, setTab] = useState("resource");
  const [qView, setQView] = useState("DAY");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return iso(d);
  });
  const [to, setTo] = useState(() => iso(new Date()));
  const [measureSet, setMeasureSet] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const [qualityType, setQualityType] = useState("Q_NO_FILTER");
  const [exchangeAddress, setExchangeAddress] = useState("");
  const [rows, setRows] = useState<QualityRow[] | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Row[]>("groups?limit=5000").then((e) => setGroups(e.data || []));
    api.get<Row[]>("points?limit=5000").then((e) => setPoints(e.data || []));
    api.get<Row[]>("measurelinessets?limit=1000").then((e) => setMeasureSets(e.data || []));
    api.get<Row[]>("exchangeaddresses/quality").then((e) => setExchangeAddresses(e.data || []));
  }, []);

  const tree = useMemo(() => {
    const byId = new Map(groups.map((g) => [String(g.GR_ID), g]));
    const childrenOf = new Map<string, Row[]>();
    const pointsOf = new Map<string, Row[]>();
    for (const group of groups) {
      const parent = group.PARENT_GR_ID == null ? "" : String(group.PARENT_GR_ID);
      if (parent && byId.has(parent)) (childrenOf.get(parent) || childrenOf.set(parent, []).get(parent)!).push(group);
    }
    for (const point of points) {
      const groupId = point.GR_ID == null ? "" : String(point.GR_ID);
      (pointsOf.get(groupId) || pointsOf.set(groupId, []).get(groupId)!).push(point);
    }
    const containsPoint = (id: string): boolean =>
      (pointsOf.get(id)?.length || 0) > 0 || (childrenOf.get(id) || []).some((child) => containsPoint(String(child.GR_ID)));
    const roots = groups.filter((group) => {
      const parent = group.PARENT_GR_ID == null ? "" : String(group.PARENT_GR_ID);
      return (!parent || !byId.has(parent)) && Number(group.GR_TYPE_ID) !== 2 && containsPoint(String(group.GR_ID));
    });
    const serviceRoots = groups.filter((group) => {
      const parent = group.PARENT_GR_ID == null ? "" : String(group.PARENT_GR_ID);
      return Number(group.GR_TYPE_ID) === 2 && (!parent || !byId.has(parent));
    });
    return { childrenOf, pointsOf, roots, serviceRoots };
  }, [groups, points]);

  useEffect(() => {
    if (!expanded.size && tree.roots.length) setExpanded(new Set(tree.roots.map((g) => String(g.GR_ID))));
  }, [tree.roots]);

  const selectedPointIds = useMemo(() => {
    const ids = new Set(selectedPoints);
    const collect = (groupId: string) => {
      for (const point of tree.pointsOf.get(groupId) || []) ids.add(String(point.POINT_ID));
      for (const child of tree.childrenOf.get(groupId) || []) collect(String(child.GR_ID));
    };
    selectedGroups.forEach(collect);
    return Array.from(ids);
  }, [selectedGroups, selectedPoints, tree]);

  const search = query.trim().toLowerCase();
  const pointMatches = (point: Row) => !search || String(point.POINT_NAME || point.POINT_CODE || "").toLowerCase().includes(search);

  function toggleIn(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function GroupNode({ group, depth, service = false }: { group: Row; depth: number; service?: boolean }) {
    const id = String(group.GR_ID);
    const children = tree.childrenOf.get(id) || [];
    const groupPoints = service ? [] : (tree.pointsOf.get(id) || []).filter(pointMatches);
    const open = expanded.has(id);
    const selected = selectedGroups.has(id);
    const hasChildren = children.length > 0 || groupPoints.length > 0;
    return (
      <>
        <div className={`qr-tree__row${selected ? " selected" : ""}`} style={{ paddingLeft: 8 + depth * 17 }}>
          <button className="qr-tree__expand" onClick={() => hasChildren && toggleIn(setExpanded, id)} aria-label={open ? "Свернуть" : "Развернуть"}>
            {hasChildren ? (open ? "−" : "+") : ""}
          </button>
          <span className={`gico ${service ? "gico--svc" : depth === 0 ? "gico--root" : "gico--grp"}`}>
            {service ? <IcSitemap size={11} color="#fff" /> : depth === 0 ? (() => { const Icon = MENU_ICONS.gis; return <Icon size={12} color="#fff" />; })() : <IcFolder size={11} color="#fff" />}
          </span>
          <button className="qr-tree__label" onClick={() => toggleIn(setSelectedGroups, id)}>{group.GR_NAME || group.GR_CODE}</button>
        </div>
        {open && (
          <>
            {children.map((child) => <GroupNode key={child.GR_ID} group={child} depth={depth + 1} service={service} />)}
            {groupPoints.map((point) => {
              const pointId = String(point.POINT_ID);
              return (
                <button
                  key={pointId}
                  className={`qr-tree__point${selectedPoints.has(pointId) ? " selected" : ""}`}
                  style={{ paddingLeft: 42 + (depth + 1) * 17 }}
                  onClick={() => toggleIn(setSelectedPoints, pointId)}
                >
                  <span>⚡</span>{point.POINT_NAME || point.POINT_CODE}
                </button>
              );
            })}
          </>
        )}
      </>
    );
  }

  function setPeriod(kind: "day" | "week" | "month" | "year") {
    const end = new Date();
    const start = new Date(end);
    if (kind === "week") start.setDate(end.getDate() - 6);
    if (kind === "month") start.setMonth(end.getMonth() - 1);
    if (kind === "year") start.setFullYear(end.getFullYear() - 1);
    setFrom(iso(start));
    setTo(iso(end));
    if (kind === "year") setQView("MONTH");
  }

  async function viewReport() {
    setLoading(true);
    setError("");
    const ids = selectedPointIds.join(",");
    const pointQuery = ids ? `&point_ids=${encodeURIComponent(ids)}` : "";
    try {
      const cnt = await api.get<{ CNT: number; POINT_ID: number[] }>(`qualityreports/cnt?from=${from}&to=${to}${pointQuery}`);
      const holes = await api.get<QualityRow[]>(`qualityreports/holes?from=${from}&to=${to}&q_view=${qView}${pointQuery}`);
      if (!cnt.success || !holes.success) throw new Error(cnt.message || holes.message || "Ошибка загрузки отчета");
      setCount(Number(cnt.data?.CNT || 0));
      setRows(holes.data || []);
    } catch (e: any) {
      setRows([]);
      setCount(0);
      setError(e?.message || "Ошибка загрузки отчета");
    } finally {
      setLoading(false);
    }
  }

  const dates = useMemo(() => dateSequence(from, to), [from, to]);

  function cellStatus(value: number | undefined) {
    if (value === 1) return { cls: "ok", label: "Данные полные" };
    if (value === 2) return { cls: "partial", label: "Данные неполные" };
    if (value === 3) return { cls: "missing", label: "Нет данных" };
    return { cls: "unknown", label: "Не определено" };
  }

  return (
    <div className="aw qr">
      <div className="aw__title">
        <IcExpand size={14} />
        <span>Качество показаний - Обобщенное качество показаний - {rows === null ? "ФИЛЬТР" : "РЕЗУЛЬТАТ"}</span>
        <span className="sp" />
        <span className="aw__sets">-- Сохраненные наборы установок --</span>
        <button className="ic" aria-label="Сохраненные наборы"><IcChevron size={12} /></button>
      </div>

      {rows === null ? (
        <>
          <div className="qr__period">
            <label>
              <span>Отчет</span>
              <select value={qView} onChange={(e) => setQView(e.target.value)}>
                <option value="DAY">День</option>
                <option value="MONTH">Месяц</option>
                <option value="DAY_MONTH">День / месяц</option>
              </select>
            </label>
            <button className="pbtn grid" aria-label="Календарь"><IcGrid size={16} /></button>
            <button className="pbtn" onClick={() => setPeriod("day")}>Сегодня</button>
            <button className="pbtn" onClick={() => setPeriod("week")}>Неделя</button>
            <button className="pbtn" onClick={() => setPeriod("month")}>Месяц</button>
            <button className="pbtn" onClick={() => setPeriod("year")}>Год</button>
            <span className="sp" />
            <input className="adate" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span>—</span>
            <input className="adate" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          <div className="qr__split">
            <section className="apane">
              <div className="apane__head">Фильтр</div>
              <div className="apane__tools">
                <button className="ib" aria-label="История"><IcClock size={17} color="#5a6b7b" /></button>
                <div className="isel"><span>Номер счетчика</span><IcChevron size={12} /></div>
                <input className="isearch" placeholder="Поиск" value={query} onChange={(e) => setQuery(e.target.value)} />
                <button className="ib green" aria-label="Поиск"><IcSearch size={15} color="#fff" /></button>
                <button className="ib red" aria-label="Сбросить" onClick={() => setQuery("")}><IcReset size={15} color="#fff" /></button>
              </div>
              <div className="apane__row">
                <span>Корневая группа</span>
                <div className="isel grow"><span>Начальная корневая группа</span><IcChevron size={12} /></div>
              </div>
              <div className="qr-tree">
                <div className="qr-tree__row">
                  <span className="qr-tree__expand">+</span>
                  <span className="gico gico--svc"><IcSitemap size={11} color="#fff" /></span>
                  <span className="qr-tree__label static">Служебные группы</span>
                </div>
                {tree.serviceRoots.map((group) => <GroupNode key={group.GR_ID} group={group} depth={1} service />)}
                {tree.roots.length
                  ? tree.roots.map((group) => <GroupNode key={group.GR_ID} group={group} depth={0} />)
                  : <div className="qr-tree__placeholder"><span className="gico gico--root">◎</span>Монголия</div>}
              </div>
              <div className="apane__foot">
                <button className="fbtn" disabled={!selectedGroups.size && !selectedPoints.size} onClick={() => { setSelectedGroups(new Set()); setSelectedPoints(new Set()); }}>Снять отм. всем</button>
                <span className="muted">{selectedPointIds.length ? `Выделено элементов: ${selectedPointIds.length}` : "Выделенных элементов нет"}</span>
                <span className="sp" />
                <button className="ic sm" aria-label="Информация"><IcInfo size={14} color="#fff" /></button>
                <button className="ic sm" aria-label="Настройки"><IcGear size={14} color="#fff" /></button>
              </div>
            </section>

            <section className="apane">
              <div className="apane__head">Выбор параметра</div>
              <div className="atabs">
                {[["resource", "По ресурсу"], ["discrete", "По дискретности"], ["search", "Поиск"], ["settings", "Настройки"]].map(([key, label]) => (
                  <button key={key} className={`atab${tab === key ? " on" : ""}`} onClick={() => setTab(key)}>{label}</button>
                ))}
              </div>
              <div className="qr-param">
                {tab === "resource" && resourceTree.map((resource) => {
                  const open = paramOpen.has(resource.name);
                  return (
                    <div key={resource.name}>
                      <button className="qr-param__root" onClick={() => toggleIn(setParamOpen, resource.name)}>
                        <span>{open ? "−" : "+"}</span><b>{resource.name}</b>
                      </button>
                      {open && resource.children.map((param) => (
                        <label className="qr-param__leaf" key={param}>
                          <input type="checkbox" checked={selectedParams.has(param)} onChange={() => toggleIn(setSelectedParams, param)} />
                          <span>{param}</span>
                        </label>
                      ))}
                    </div>
                  );
                })}
                {tab === "discrete" && <div className="aempty"><IcSitemap size={76} color="var(--treeEmptyColor)" /><div>Список пустой</div></div>}
                {tab === "search" && <div className="qr-param__search"><IcSearch size={15} /><input placeholder="Поиск параметра" /></div>}
                {tab === "settings" && <div className="qr-param__settings">Показывать доступные измерения выбранных точек</div>}
              </div>
              <div className="qr-measure-set">
                <label>Наборы измерений</label>
                <select value={measureSet} onChange={(e) => setMeasureSet(e.target.value)}>
                  <option value="">Все наборы</option>
                  {measureSets.map((set) => <option key={set.MLSET_ID} value={set.MLSET_ID}>{set.MLSET_NAME || set.MLSET_CODE || set.MLSET_ID}</option>)}
                </select>
              </div>
            </section>
          </div>

          {showFilters && (
            <div className="qr-filters">
              <label>Качество
                <select value={qualityType} onChange={(e) => setQualityType(e.target.value)}>
                  <option value="Q_NO_FILTER">Без фильтра</option>
                  <option value="Q_NOT_FULL">Неполные данные</option>
                  <option value="Q_HOLE">Пропуски</option>
                  <option value="Q_OPEN">Открытые периоды</option>
                </select>
              </label>
              <label>Адрес обмена
                <select value={exchangeAddress} onChange={(e) => setExchangeAddress(e.target.value)}>
                  <option value="">Все</option>
                  {exchangeAddresses.map((item, index) => <option key={item.XA_ID || index} value={item.XA_ID || ""}>{item.XA_NAME || item.XA_CODE || item.XA_ID}</option>)}
                </select>
              </label>
              <div className="qr-filters__checks">
                {filterLabels.map(([key, label]) => (
                  <label key={key}><input type="checkbox" checked={!!filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.checked })} />{label}</label>
                ))}
              </div>
            </div>
          )}

          <div className="qr__actions">
            <label className="qr-toggle"><input type="checkbox" checked={showFilters} onChange={(e) => setShowFilters(e.target.checked)} /><span>Фильтры</span></label>
            <span className="sp" />
            <button className="abtn green" onClick={viewReport} disabled={loading}><IcEye size={15} color="#fff" />{loading ? "Загрузка..." : "Просмотр"}</button>
            <button className="abtn green" onClick={() => setShowLegend(!showLegend)}><IcInfo size={15} color="#fff" />Обозначения</button>
            <button className="abtn green" onClick={() => setShowFilters(true)}><IcGear size={15} color="#fff" />Настройки</button>
          </div>
        </>
      ) : (
        <div className="qr-result">
          <div className="qr-result__toolbar">
            <span>Полное количество: <b>{count}</b></span>
            <button className="pbtn" onClick={() => setRows(null)}>Назад к фильтру</button>
            <span className="sp" />
            <span>{from} — {to}</span>
          </div>
          {error && <div className="qr-result__error">{error}</div>}
          <div className="qr-grid-wrap">
            <table className="qr-grid">
              <thead>
                <tr><th>#</th><th className="point">Точка учета</th>{dates.map((date) => <th key={date} title={date}>{new Date(`${date}T00:00:00`).getDate()}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.POINT_ID || rowIndex}>
                    <td>{rowIndex + 1}</td>
                    <td className="point" title={row.POINT_CODE}>{row.POINT_NAME || row.POINT_CODE}</td>
                    {dates.map((date, index) => {
                      const status = cellStatus(row.COLOR?.[index]);
                      return <td key={date}><span className={`qr-status ${status.cls}`} title={`${date}: ${status.label}`} aria-label={status.label} /></td>;
                    })}
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={Math.max(2, dates.length + 2)} className="qr-grid__empty">Данные не найдены</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="qr__actions">
            <span className="sp" />
            <button className="abtn green" onClick={() => setShowLegend(!showLegend)}><IcInfo size={15} color="#fff" />Обозначения</button>
            <button className="abtn green" onClick={viewReport}><IcReset size={15} color="#fff" />Обновить</button>
          </div>
        </div>
      )}

      {showLegend && (
        <div className="qr-legend">
          <b>Обозначения</b>
          <span><i className="qr-status ok" />Данные полные</span>
          <span><i className="qr-status partial" />Данные неполные</span>
          <span><i className="qr-status missing" />Нет данных</span>
          <span><i className="qr-status unknown" />Не определено</span>
          <button onClick={() => setShowLegend(false)} aria-label="Закрыть">×</button>
        </div>
      )}
    </div>
  );
}
