import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { api } from "../api";
import "../archives.css";
import "../readings.css";
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
  IcSync,
  MENU_ICONS,
} from "../icons";

type Row = Record<string, any>;
type Parameter = { code: string; name: string; unit: string; category: string };
type ConnectionOption = { id: string; name: string };
type FilterPayload = {
  groups: Row[];
  points: Row[];
  parameters: Parameter[];
  connections: {
    downlinks: ConnectionOption[];
    protocols: ConnectionOption[];
    channels: ConnectionOption[];
  };
};
type QueryPayload = { rows: Row[]; total: number; from: string; to: string };

const ReadIcon = MENU_ICONS.read;

function iso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("ru-RU");
}

function toggleSet(setter: Dispatch<SetStateAction<Set<string>>>, value: string) {
  setter((current) => {
    const next = new Set(current);
    next.has(value) ? next.delete(value) : next.add(value);
    return next;
  });
}

export default function Readings() {
  const [filter, setFilter] = useState<FilterPayload | null>(null);
  const [loadingFilter, setLoadingFilter] = useState(true);
  const [filterError, setFilterError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
  const [selectedParameters, setSelectedParameters] = useState<Set<string>>(new Set());
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(["Электричество"]));
  const [pointSearch, setPointSearch] = useState("");
  const [parameterSearch, setParameterSearch] = useState("");
  const [parameterTab, setParameterTab] = useState("resource");
  const [from, setFrom] = useState(() => iso(new Date()));
  const [to, setTo] = useState(() => iso(new Date()));
  const [showConnection, setShowConnection] = useState(false);
  const [dlType, setDLType] = useState("AUTO");
  const [dpType, setDPType] = useState("AUTO");
  const [phType, setPHType] = useState("AUTO");
  const [result, setResult] = useState<QueryPayload | null>(null);
  const [jobs, setJobs] = useState<Row[]>([]);
  const [showJobs, setShowJobs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [requestLimit, setRequestLimit] = useState(100);
  const [showStatus, setShowStatus] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [allowFuture, setAllowFuture] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get<FilterPayload>("readings/filter").then((env) => {
      if (!active) return;
      setLoadingFilter(false);
      if (!env.success || !env.data) {
        setFilterError(env.message || "Не удалось загрузить фильтр");
        return;
      }
      setFilter(env.data);
      const firstPoint = env.data.points[0];
      if (firstPoint) setSelectedPoints(new Set([String(firstPoint.POINT_ID)]));
      const firstParameter = env.data.parameters.find((item) => item.code === "A_PLUS") || env.data.parameters[0];
      if (firstParameter) setSelectedParameters(new Set([firstParameter.code]));
    });
    return () => {
      active = false;
    };
  }, []);

  const tree = useMemo(() => {
    const groups = filter?.groups || [];
    const points = filter?.points || [];
    const byID = new Map(groups.map((group) => [String(group.GR_ID), group]));
    const children = new Map<string, Row[]>();
    const groupPoints = new Map<string, Row[]>();
    for (const group of groups) {
      const parent = group.PARENT_GR_ID == null ? "" : String(group.PARENT_GR_ID);
      if (parent && byID.has(parent)) (children.get(parent) || children.set(parent, []).get(parent)!).push(group);
    }
    for (const point of points) {
      const groupID = point.GR_ID == null ? "" : String(point.GR_ID);
      (groupPoints.get(groupID) || groupPoints.set(groupID, []).get(groupID)!).push(point);
    }
    const containsPoint = (id: string): boolean =>
      (groupPoints.get(id)?.length || 0) > 0 || (children.get(id) || []).some((child) => containsPoint(String(child.GR_ID)));
    const roots = groups.filter((group) => {
      const parent = group.PARENT_GR_ID == null ? "" : String(group.PARENT_GR_ID);
      return (!parent || !byID.has(parent)) && containsPoint(String(group.GR_ID));
    });
    return { children, groupPoints, roots };
  }, [filter]);

  useEffect(() => {
    if (!expanded.size && tree.roots.length) {
      const ids = new Set<string>();
      const walk = (groups: Row[]) => groups.forEach((group) => {
        const id = String(group.GR_ID);
        ids.add(id);
        walk(tree.children.get(id) || []);
      });
      walk(tree.roots);
      setExpanded(ids);
    }
  }, [expanded.size, tree]);

  const selectedPointIDs = useMemo(() => {
    const ids = new Set(selectedPoints);
    const collect = (groupID: string) => {
      for (const point of tree.groupPoints.get(groupID) || []) ids.add(String(point.POINT_ID));
      for (const child of tree.children.get(groupID) || []) collect(String(child.GR_ID));
    };
    selectedGroups.forEach(collect);
    return Array.from(ids).slice(0, Math.max(1, requestLimit));
  }, [requestLimit, selectedGroups, selectedPoints, tree]);

  const parametersByCategory = useMemo(() => {
    const result = new Map<string, Parameter[]>();
    for (const parameter of filter?.parameters || []) {
      (result.get(parameter.category) || result.set(parameter.category, []).get(parameter.category)!).push(parameter);
    }
    return result;
  }, [filter]);

  const pointSearchLower = pointSearch.trim().toLowerCase();
  const parameterSearchLower = parameterSearch.trim().toLowerCase();
  const canRun = selectedPointIDs.length > 0 && selectedParameters.size > 0 && !busy;

  function GroupNode({ group, depth }: { group: Row; depth: number }) {
    const id = String(group.GR_ID);
    const children = tree.children.get(id) || [];
    const points = (tree.groupPoints.get(id) || []).filter((point) => {
      if (!pointSearchLower) return true;
      return [point.POINT_CODE, point.POINT_NAME, point.METER_NUMBER]
        .some((value) => String(value || "").toLowerCase().includes(pointSearchLower));
    });
    const open = expanded.has(id) || !!pointSearchLower;
    const selected = selectedGroups.has(id);
    return (
      <>
        <div className={`rd-tree__row${selected ? " selected" : ""}`} style={{ paddingLeft: 8 + depth * 18 }}>
          <button className="rd-tree__toggle" onClick={() => toggleSet(setExpanded, id)} aria-label={open ? "Свернуть" : "Развернуть"}>
            {children.length || points.length ? (open ? "−" : "+") : ""}
          </button>
          <span className={`rd-tree__icon${depth === 0 ? " root" : ""}`}>
            {depth === 0 ? <IcSitemap size={11} color="#fff" /> : <IcFolder size={11} color="#fff" />}
          </span>
          <button className="rd-tree__label" onClick={() => toggleSet(setSelectedGroups, id)}>{group.GR_NAME || group.GR_CODE}</button>
        </div>
        {open && children.map((child) => <GroupNode key={child.GR_ID} group={child} depth={depth + 1} />)}
        {open && points.map((point) => {
          const pointID = String(point.POINT_ID);
          return (
            <button
              key={pointID}
              className={`rd-tree__point${selectedPoints.has(pointID) ? " selected" : ""}`}
              style={{ paddingLeft: 43 + depth * 18 }}
              onClick={() => toggleSet(setSelectedPoints, pointID)}
              title={`${point.POINT_CODE} · ${point.METER_NUMBER || "Без счетчика"}`}
            >
              <ReadIcon size={13} color="currentColor" />
              <span>{point.POINT_NAME || point.POINT_CODE}</span>
              <small>{point.METER_NUMBER || "—"}</small>
            </button>
          );
        })}
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
  }

  function requestBody(action?: string) {
    return {
      point_ids: selectedPointIDs.map(Number),
      parameters: Array.from(selectedParameters),
      from,
      to,
      action,
      dl_type_id: dlType,
      dp_type_id: dpType,
      ph_type_id: phType,
    };
  }

  async function viewReadings() {
    setBusy("view");
    setError("");
    setMessage("");
    try {
      const env = await api.post<QueryPayload>("readings/query", requestBody());
      if (!env.success || !env.data) throw new Error(env.message || "Ошибка загрузки показаний");
      setResult(env.data);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки показаний");
    } finally {
      setBusy("");
    }
  }

  async function loadJobs(open = true) {
    const env = await api.get<Row[]>("readings/jobs");
    if (env.success) setJobs(env.data || []);
    else setError(env.message || "Не удалось загрузить процесс связи");
    if (open) setShowJobs(true);
  }

  async function runTask(action: "COLLECT" | "RECOLLECT") {
    setBusy(action);
    setError("");
    setMessage("");
    try {
      const env = await api.post<Row>("readings/tasks", requestBody(action));
      if (!env.success || !env.data) throw new Error(env.message || "Ошибка запуска задания");
      setMessage(`Задание #${env.data.JOB_ID}: ${env.data.MESSAGE}. Записей: ${env.data.AFFECTED_ROWS}`);
      await loadJobs(false);
    } catch (err: any) {
      setError(err?.message || "Ошибка запуска задания");
    } finally {
      setBusy("");
    }
  }

  if (loadingFilter) return <div className="toshi-loader" />;
  if (filterError || !filter) return <div className="rd-error">{filterError || "Фильтр недоступен"}</div>;

  return (
    <div className="aw rd">
      <div className="aw__title">
        <IcExpand size={14} />
        <span>Считывание показаний - {result ? "ПРОСМОТР" : "ФИЛЬТР"}</span>
        <span className="sp" />
        <span className="aw__sets">-- Сохраненные наборы установок --</span>
        <button className="ic" aria-label="Сохраненные наборы"><IcChevron size={12} /></button>
      </div>

      {result ? (
        <section className="rd-result">
          <div className="rd-result__bar">
            <button className="pbtn" onClick={() => setResult(null)}>Назад к фильтру</button>
            <span>Записей: <b>{result.total}</b></span>
            <span className="sp" />
            <span>{from} — {to}</span>
            <button className="pbtn grid" onClick={viewReadings} aria-label="Обновить"><IcSync size={16} /></button>
          </div>
          {error && <div className="rd-alert error">{error}</div>}
          <div className="rd-result__grid">
            <table>
              <thead>
                <tr>
                  <th>Дата / время</th><th>Точка учета</th><th>Счетчик</th><th>Параметр</th>
                  <th className="number">Значение</th><th>Ед.</th>{showStatus && <th>Статус</th>}<th>Источник</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.READING_ID}>
                    <td>{formatDateTime(row.READING_TIME)}</td>
                    <td title={row.POINT_CODE}>{row.POINT_NAME}</td>
                    <td>{row.METER_NUMBER || "—"}</td>
                    <td>{filter.parameters.find((item) => item.code === row.PARAMETER_CODE)?.name || row.PARAMETER_CODE}</td>
                    <td className="number">{Number(row.VALUE).toLocaleString("ru-RU", { maximumFractionDigits: showRaw ? 6 : 3 })}</td>
                    <td>{row.UNIT}</td>
                    {showStatus && <td><span className={`rd-status ${String(row.STATUS).toLowerCase()}`}>{row.STATUS}</span></td>}
                    <td>{row.SOURCE}</td>
                  </tr>
                ))}
                {!result.rows.length && <tr><td colSpan={8} className="rd-empty">Данные не найдены. Выполните «Сбор».</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <>
          <div className="rd-period">
            <button className="pbtn grid" aria-label="Календарь"><IcGrid size={16} /></button>
            <button className="pbtn" onClick={() => setPeriod("day")}>Сегодня</button>
            <button className="pbtn" onClick={() => setPeriod("week")}>Неделя</button>
            <button className="pbtn" onClick={() => setPeriod("month")}>Месяц</button>
            <button className="pbtn" onClick={() => setPeriod("year")}>Год</button>
            <span className="sp" />
            <input type="date" value={from} max={allowFuture ? undefined : iso(new Date())} onChange={(event) => setFrom(event.target.value)} />
            <span>—</span>
            <input type="date" value={to} max={allowFuture ? undefined : iso(new Date())} onChange={(event) => setTo(event.target.value)} />
          </div>

          <div className={`rd-split${showConnection ? " with-connection" : ""}`}>
            <section className="rd-pane">
              <div className="rd-pane__head">Выбор ТУ</div>
              <div className="rd-tools">
                <button className="rd-icon-btn" aria-label="История"><IcClock size={18} /></button>
                <select aria-label="Тип поиска" defaultValue="meter"><option value="meter">Номер счетчика</option><option value="point">Точка учета</option></select>
                <input placeholder="Поиск" value={pointSearch} onChange={(event) => setPointSearch(event.target.value)} />
                <button className="rd-icon-btn search" aria-label="Поиск"><IcSearch size={15} color="#fff" /></button>
                <button className="rd-icon-btn reset" aria-label="Сбросить" onClick={() => setPointSearch("")}><IcReset size={15} color="#fff" /></button>
              </div>
              <div className="rd-root-select"><span>Корневая группа</span><select><option>Начальная корневая группа</option></select></div>
              <div className="rd-tree">
                <div className="rd-tree__service"><span>+</span><i><IcSitemap size={11} color="#fff" /></i>Служебные группы</div>
                {tree.roots.map((group) => <GroupNode key={group.GR_ID} group={group} depth={0} />)}
              </div>
              <div className="rd-pane__foot">
                <button onClick={() => { setSelectedGroups(new Set()); setSelectedPoints(new Set()); }}>Снять отм. всем</button>
                <span>{selectedPointIDs.length ? `Выделено элементов: ${selectedPointIDs.length}` : "Выделенных элементов нет"}</span>
                <span className="sp" />
                <button className="rd-icon-btn info" aria-label="Информация"><IcInfo size={14} color="#fff" /></button>
                <button className="rd-icon-btn info" aria-label="Настройки дерева"><IcGear size={14} color="#fff" /></button>
              </div>
            </section>

            <section className="rd-pane">
              <div className="rd-pane__head">Выбор параметра</div>
              <div className="rd-tabs">
                {[["resource", "По ресурсу"], ["discrete", "По дискретности"], ["search", "Поиск"], ["settings", "Настройки"]].map(([key, label]) => (
                  <button key={key} className={parameterTab === key ? "active" : ""} onClick={() => setParameterTab(key)}>{label}</button>
                ))}
              </div>
              {parameterTab === "search" && (
                <div className="rd-param-search"><IcSearch size={14} /><input placeholder="Поиск параметра" value={parameterSearch} onChange={(event) => setParameterSearch(event.target.value)} /></div>
              )}
              <div className="rd-parameters">
                {parameterTab === "settings" ? (
                  <div className="rd-settings-hint">Доступные параметры ограничены выбранными точками учета и установленными счетчиками.</div>
                ) : Array.from(parametersByCategory.entries()).map(([category, parameters]) => {
                  const open = openCategories.has(category) || parameterTab === "search";
                  const visible = parameters.filter((parameter) => !parameterSearchLower || parameter.name.toLowerCase().includes(parameterSearchLower));
                  if (parameterTab === "search" && !visible.length) return null;
                  return (
                    <div key={category}>
                      <button className="rd-param-root" onClick={() => toggleSet(setOpenCategories, category)}>
                        <span>{open ? "−" : "+"}</span><b>{category}</b>
                      </button>
                      {open && visible.map((parameter) => (
                        <label className="rd-param-leaf" key={parameter.code}>
                          <input type="checkbox" checked={selectedParameters.has(parameter.code)} onChange={() => toggleSet(setSelectedParameters, parameter.code)} />
                          <span>{parameter.name}</span><small>{parameter.unit}</small>
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {showConnection && (
            <div className="rd-connection">
              <label>Канал связи<select value={dlType} onChange={(event) => setDLType(event.target.value)}>{filter.connections.downlinks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>Протокол<select value={dpType} onChange={(event) => setDPType(event.target.value)}>{filter.connections.protocols.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>Приоритет<select value={phType} onChange={(event) => setPHType(event.target.value)}>{filter.connections.channels.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            </div>
          )}

          {message && <div className="rd-alert success">{message}</div>}
          {error && <div className="rd-alert error">{error}</div>}

          <div className="rd-actions">
            <label className="rd-switch"><input type="checkbox" checked={showConnection} onChange={(event) => setShowConnection(event.target.checked)} /><span /><b>Установки связи</b></label>
            <span className="sp" />
            <button className="rd-action settings" onClick={() => setShowSettings(true)}><IcGear size={17} />Настройки</button>
            <button className="rd-action" disabled={!canRun} onClick={viewReadings}><IcEye size={17} />{busy === "view" ? "Загрузка..." : "Просмотр"}</button>
            <button className="rd-action" disabled={!canRun} onClick={() => runTask("RECOLLECT")}><IcSync size={17} />{busy === "RECOLLECT" ? "Выполняется..." : "Пересбор"}</button>
            <button className="rd-action" disabled={!canRun} onClick={() => runTask("COLLECT")}><ReadIcon size={17} />{busy === "COLLECT" ? "Выполняется..." : "Сбор"}</button>
            <button className="rd-action process" onClick={() => loadJobs(true)}><span className="rd-live-dot" />Процесс связи</button>
          </div>
        </>
      )}

      {showSettings && (
        <div className="rd-modal" role="dialog" aria-modal="true" aria-label="Настройки считывания">
          <div className="rd-modal__panel">
            <div className="rd-modal__head"><b>Настройки</b><button onClick={() => setShowSettings(false)} aria-label="Закрыть">×</button></div>
            <label>Лимит точек в запросе<input type="number" min="1" max="1000" value={requestLimit} onChange={(event) => setRequestLimit(Number(event.target.value) || 1)} /></label>
            <label className="check"><input type="checkbox" checked={showRaw} onChange={(event) => setShowRaw(event.target.checked)} />Показывать исходные значения</label>
            <label className="check"><input type="checkbox" checked={allowFuture} onChange={(event) => setAllowFuture(event.target.checked)} />Разрешить будущие даты</label>
            <label className="check"><input type="checkbox" checked={showStatus} onChange={(event) => setShowStatus(event.target.checked)} />Показывать статус данных</label>
            <div className="rd-modal__actions"><button className="toshi-btn toshi-btn--green" onClick={() => setShowSettings(false)}>ОК</button></div>
          </div>
        </div>
      )}

      {showJobs && (
        <div className="rd-modal" role="dialog" aria-modal="true" aria-label="Процесс связи">
          <div className="rd-modal__panel jobs">
            <div className="rd-modal__head"><b>Процесс связи</b><button onClick={() => setShowJobs(false)} aria-label="Закрыть">×</button></div>
            <div className="rd-jobs">
              <table>
                <thead><tr><th>#</th><th>Операция</th><th>Период</th><th>Точек</th><th>Статус</th><th>Прогресс</th><th>Запущено</th><th>Сообщение</th></tr></thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.JOB_ID}>
                      <td>{job.JOB_ID}</td><td>{job.ACTION === "RECOLLECT" ? "Пересбор" : "Сбор"}</td>
                      <td>{formatDateTime(job.FROM)} — {formatDateTime(job.TO)}</td><td>{job.POINT_IDS?.length || 0}</td>
                      <td><span className={`rd-status ${String(job.STATUS).toLowerCase()}`}>{job.STATUS}</span></td>
                      <td><progress value={job.PROGRESS || 0} max="100" /> {job.PROGRESS || 0}%</td>
                      <td>{formatDateTime(job.CREATED_AT)}</td><td>{job.MESSAGE}</td>
                    </tr>
                  ))}
                  {!jobs.length && <tr><td colSpan={8} className="rd-empty">Заданий пока нет</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="rd-modal__actions"><button className="toshi-btn" onClick={() => loadJobs(false)}>Обновить</button><button className="toshi-btn toshi-btn--green" onClick={() => setShowJobs(false)}>Закрыть</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
