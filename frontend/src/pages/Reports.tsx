import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { IcExpand, IcFolder, IcGear, IcGrid, IcInfo, IcSave, IcSearch, IcSitemap, IcSync, MENU_ICONS } from "../icons";
import "../archives.css";
import "../reports.css";

type Row = Record<string, any>;
type Catalog = { reports: Row[]; groups: Row[]; points: Row[] };
type ReportColumn = { key: string; label: string; unit?: string };
type Preview = {
  run_id: number;
  report_name: string;
  columns: ReportColumn[];
  rows: Row[];
  total: number;
  from: string;
  to: string;
  output_format: string;
  status: string;
};

const ReportIcon = MENU_ICONS.reports;
const MODES = [
  { id: "viewer", label: "Просмотр отчетов" },
  { id: "automated", label: "Автоматизированные отчеты" },
  { id: "log", label: "Журнал отчетов" },
];

function iso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? String(value || "") : date.toLocaleString("ru-RU");
}

function display(value: unknown) {
  if (value == null) return "—";
  if (typeof value === "number") return value.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
  if (Array.isArray(value)) return value.join(", ") || "—";
  return String(value);
}

export default function Reports() {
  const params = useParams();
  const navigate = useNavigate();
  const mode = MODES.some((item) => item.id === params.mode) ? String(params.mode) : "viewer";
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selectedReportID, setSelectedReportID] = useState<number | null>(null);
  const [reportSearch, setReportSearch] = useState("");
  const [pointSearch, setPointSearch] = useState("");
  const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState(() => iso(new Date()));
  const [to, setTo] = useState(() => iso(new Date()));
  const [outputFormat, setOutputFormat] = useState("XLSX");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [runs, setRuns] = useState<Row[]>([]);
  const [automations, setAutomations] = useState<Row[]>([]);
  const [selectedRun, setSelectedRun] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [automationName, setAutomationName] = useState("");
  const [scheduleCode, setScheduleCode] = useState("DAILY");
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [recipients, setRecipients] = useState("");
  const [automationEnabled, setAutomationEnabled] = useState(true);

  useEffect(() => {
    let active = true;
    api.get<Catalog>("reporting/catalog").then((env) => {
      if (!active) return;
      if (!env.success || !env.data) {
        setError(env.message || "Не удалось загрузить дерево отчетов");
        return;
      }
      setCatalog(env.data);
      const firstReport = env.data.reports[0];
      const firstPoint = env.data.points[0];
      if (firstReport) {
        setSelectedReportID(Number(firstReport.REPORT_ID));
        setOutputFormat(firstReport.DEFAULT_FORMAT || "XLSX");
      }
      if (firstPoint) setSelectedPoints(new Set([String(firstPoint.POINT_ID)]));
    });
    return () => { active = false; };
  }, []);

  async function loadRuns() {
    const env = await api.get<Row[]>("reporting/runs");
    if (env.success) setRuns(env.data || []);
    else setError(env.message || "Не удалось загрузить журнал отчетов");
  }

  async function loadAutomations() {
    const env = await api.get<Row[]>("reporting/automations");
    if (env.success) setAutomations(env.data || []);
    else setError(env.message || "Не удалось загрузить автоматизированные отчеты");
  }

  useEffect(() => {
    if (mode === "log") loadRuns();
    if (mode === "automated") loadAutomations();
  }, [mode]);

  const selectedReport = catalog?.reports.find((item) => Number(item.REPORT_ID) === selectedReportID) || null;
  const reportsByFolder = useMemo(() => {
    const folders = new Map<string, Row[]>();
    const search = reportSearch.trim().toLowerCase();
    for (const report of catalog?.reports || []) {
      if (search && !String(report.REPORT_NAME).toLowerCase().includes(search)) continue;
      const folder = String(report.FOLDER || "Общие");
      (folders.get(folder) || folders.set(folder, []).get(folder)!).push(report);
    }
    return folders;
  }, [catalog, reportSearch]);

  const pointTree = useMemo(() => {
    const groups = catalog?.groups || [];
    const points = catalog?.points || [];
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
  }, [catalog]);

  useEffect(() => {
    if (!expandedGroups.size && pointTree.roots.length) {
      setExpandedGroups(new Set(pointTree.roots.map((group) => String(group.GR_ID))));
    }
  }, [expandedGroups.size, pointTree.roots]);

  function toggleSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectReport(report: Row) {
    setSelectedReportID(Number(report.REPORT_ID));
    setOutputFormat(report.DEFAULT_FORMAT || "XLSX");
    if (mode === "automated") setAutomationName(`Авто: ${report.REPORT_NAME}`);
    setPreview(null);
  }

  function GroupNode({ group, depth }: { group: Row; depth: number }) {
    const id = String(group.GR_ID);
    const children = pointTree.children.get(id) || [];
    const query = pointSearch.trim().toLowerCase();
    const points = (pointTree.groupPoints.get(id) || []).filter((point) =>
      !query || [point.POINT_CODE, point.POINT_NAME, point.METER_NUMBER].some((value) => String(value || "").toLowerCase().includes(query)));
    const open = expandedGroups.has(id) || !!query;
    return (
      <>
        <button className="rp-point-group" style={{ paddingLeft: 8 + depth * 17 }} onClick={() => toggleSet(setExpandedGroups, id)}>
          <span>{children.length || points.length ? (open ? "−" : "+") : ""}</span>
          <i>{depth === 0 ? <IcSitemap size={11} /> : <IcFolder size={11} />}</i>
          <b>{group.GR_NAME || group.GR_CODE}</b>
        </button>
        {open && children.map((child) => <GroupNode key={child.GR_ID} group={child} depth={depth + 1} />)}
        {open && points.map((point) => {
          const pointID = String(point.POINT_ID);
          return (
            <label key={pointID} className="rp-point" style={{ paddingLeft: 42 + depth * 17 }}>
              <input type="checkbox" checked={selectedPoints.has(pointID)} onChange={() => toggleSet(setSelectedPoints, pointID)} />
              <span>{point.POINT_NAME || point.POINT_CODE}</span>
              <small>{point.METER_NUMBER || "—"}</small>
            </label>
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

  async function generateReport() {
    if (!selectedReport) return;
    setLoading(true);
    setError("");
    try {
      const env = await api.post<Preview>("reporting/preview", {
        report_id: selectedReport.REPORT_ID,
        point_ids: Array.from(selectedPoints).map(Number),
        from,
        to,
        output_format: outputFormat,
      });
      if (!env.success || !env.data) throw new Error(env.message || "Ошибка формирования отчета");
      setPreview(env.data);
    } catch (err: any) {
      setError(err?.message || "Ошибка формирования отчета");
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!preview) return;
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      preview.columns.map((column) => escape(column.unit ? `${column.label}, ${column.unit}` : column.label)).join(";"),
      ...preview.rows.map((row) => preview.columns.map((column) => escape(row[column.key])).join(";")),
    ];
    const blob = new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `report-${preview.run_id}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function createAutomation() {
    if (!selectedReport || !automationName.trim()) return;
    setLoading(true);
    setError("");
    const env = await api.post("reporting/automations", {
      report_id: selectedReport.REPORT_ID,
      name: automationName,
      schedule_code: scheduleCode,
      schedule_time: scheduleTime,
      recipients,
      output_format: outputFormat,
      enabled: automationEnabled,
    });
    setLoading(false);
    if (!env.success) {
      setError(env.message || "Не удалось автоматизировать отчет");
      return;
    }
    setAutomationName("");
    setRecipients("");
    await loadAutomations();
  }

  async function toggleAutomation(row: Row) {
    const env = await api.put(`reporting/automations/${row.AUTOMATION_ID}`, { enabled: !row.ENABLED });
    if (env.success) await loadAutomations();
    else setError(env.message || "Не удалось изменить расписание");
  }

  async function openRun() {
    if (!selectedRun) return;
    setLoading(true);
    setError("");
    const env = await api.get<Preview>(`reporting/runs/${selectedRun.RUN_ID}`);
    setLoading(false);
    if (!env.success || !env.data) {
      setError(env.message || "Не удалось открыть отчет");
      return;
    }
    setPreview(env.data);
    navigate("/reports/viewer");
  }

  function ReportTree() {
    return (
      <section className="rp-pane rp-tree-pane">
        <div className="rp-pane__head">{mode === "automated" ? "Дерево автоматизированных отчетов" : "Дерево отчетов"}</div>
        <label className="rp-search"><IcSearch size={13} /><input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Фильтровать..." /></label>
        <div className="rp-report-tree">
          {Array.from(reportsByFolder.entries()).map(([folder, reports]) => (
            <div key={folder} className="rp-report-folder">
              <div><span>−</span><IcFolder size={13} /><b>{folder}</b></div>
              {reports.map((report) => (
                <button key={report.REPORT_ID} className={Number(report.REPORT_ID) === selectedReportID ? "active" : ""} onClick={() => selectReport(report)}>
                  <ReportIcon size={13} />
                  <span>{report.REPORT_NAME}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        {mode === "automated" && <button className="rp-wide-action" disabled={!selectedReport} onClick={() => setAutomationName(`Авто: ${selectedReport?.REPORT_NAME || ""}`)}>Автоматизировать отчет</button>}
      </section>
    );
  }

  if (!catalog) return <div className="toshi-loader" />;

  return (
    <div className="aw rp">
      <div className="aw__title">
        <IcExpand size={14} />
        <span>Отчеты - {MODES.find((item) => item.id === mode)?.label}</span>
        <span className="sp" />
        <button className="ic" aria-label="Обновить" onClick={() => mode === "log" ? loadRuns() : mode === "automated" ? loadAutomations() : setPreview(null)}><IcSync size={14} /></button>
      </div>

      <nav className="rp-mode-tabs" aria-label="Раздел отчетов">
        {MODES.map((item) => <button key={item.id} className={mode === item.id ? "active" : ""} onClick={() => { setPreview(null); navigate(`/reports/${item.id}`); }}>{item.label}</button>)}
      </nav>

      {error && <div className="rp-error">{error}</div>}

      {mode === "viewer" && preview ? (
        <div className="rp-preview">
          <div className="rp-preview__toolbar">
            <button className="rp-button" onClick={() => setPreview(null)}>Назад к фильтру</button>
            <strong>{preview.report_name}</strong>
            <span>Строк: {preview.total}</span>
            <span className="sp" />
            <button className="rp-button green" onClick={downloadCSV}><IcSave size={13} /> Скачать CSV</button>
          </div>
          <div className="rp-preview__meta">Период: {formatDate(preview.from)} – {formatDate(preview.to)} · Задание #{preview.run_id} · {preview.status}</div>
          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead><tr>{preview.columns.map((column) => <th key={column.key}>{column.label}{column.unit ? <small>{column.unit}</small> : null}</th>)}</tr></thead>
              <tbody>
                {preview.rows.map((row, index) => <tr key={index}>{preview.columns.map((column) => <td key={column.key}>{column.key.includes("TIME") ? formatDate(row[column.key]) : display(row[column.key])}</td>)}</tr>)}
                {!preview.rows.length && <tr><td className="rp-empty" colSpan={preview.columns.length}>Данных за выбранный период нет</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : mode === "viewer" ? (
        <>
          <div className="rp-period">
            <button className="rp-icon-button" aria-label="Календарь"><IcGrid size={15} /></button>
            <button onClick={() => setPeriod("day")}>Сегодня</button>
            <button onClick={() => setPeriod("week")}>Неделя</button>
            <button onClick={() => setPeriod("month")}>Месяц</button>
            <button onClick={() => setPeriod("year")}>Год</button>
            <span className="sp" />
            <label>От <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
            <label>До <input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          </div>
          <div className="rp-workspace">
            <ReportTree />
            <div className="rp-right">
              <section className="rp-pane rp-points-pane">
                <div className="rp-pane__head">Точки</div>
                <div className="rp-point-tools">
                  <label className="rp-search"><IcSearch size={13} /><input value={pointSearch} onChange={(event) => setPointSearch(event.target.value)} placeholder="Поиск" /></label>
                  <button onClick={() => setSelectedPoints(new Set((catalog.points || []).map((point) => String(point.POINT_ID))))}>Отметить все</button>
                  <button onClick={() => setSelectedPoints(new Set())}>Снять отм.</button>
                </div>
                <div className="rp-point-tree">
                  {pointTree.roots.map((group) => <GroupNode key={group.GR_ID} group={group} depth={0} />)}
                </div>
                <div className="rp-selection">Выбрано элементов: {selectedPoints.size}</div>
              </section>
              <section className="rp-pane rp-params-pane">
                <div className="rp-pane__head">Параметры отчета</div>
                <table className="rp-param-table">
                  <thead><tr><th>Наименование</th><th>Описание фильтра</th><th>Параметр</th><th>Значение параметра</th></tr></thead>
                  <tbody>
                    <tr><td>REPORT</td><td>Выбранный отчет</td><td>Наименование</td><td>{selectedReport?.REPORT_NAME || "—"}</td></tr>
                    <tr><td>PERIOD</td><td>Период формирования</td><td>От / До</td><td>{from} – {to}</td></tr>
                    <tr><td>FORMAT</td><td>Формат результата</td><td>Тип файла</td><td><select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)}><option>XLSX</option><option>PDF</option><option>CSV</option></select></td></tr>
                  </tbody>
                </table>
                {selectedReport && <p className="rp-description">{selectedReport.DESCRIPTION}</p>}
              </section>
            </div>
          </div>
          <div className="rp-actions"><button disabled={loading || !selectedReport || (!!selectedReport?.NEEDS_POINTS && selectedPoints.size === 0)} onClick={generateReport}><ReportIcon size={14} />{loading ? "Формирование..." : "Формировать отчет"}</button></div>
        </>
      ) : mode === "automated" ? (
        <div className="rp-automation-layout">
          <ReportTree />
          <div className="rp-automation-main">
            <section className="rp-pane">
              <div className="rp-pane__head">Настройка автоматического отчета</div>
              <div className="rp-auto-form">
                <label><span>Отчет</span><input value={selectedReport?.REPORT_NAME || ""} disabled /></label>
                <label><span>Наименование</span><input value={automationName} onChange={(event) => setAutomationName(event.target.value)} placeholder="Наименование задания" /></label>
                <label><span>Расписание</span><select value={scheduleCode} onChange={(event) => setScheduleCode(event.target.value)}><option value="DAILY">Ежедневно</option><option value="WEEKLY">Еженедельно</option><option value="MONTHLY">Ежемесячно</option></select></label>
                <label><span>Время</span><input type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} /></label>
                <label><span>Получатели</span><input value={recipients} onChange={(event) => setRecipients(event.target.value)} placeholder="operator@tosh.mn" /></label>
                <label><span>Формат</span><select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)}><option>XLSX</option><option>PDF</option><option>CSV</option></select></label>
                <label className="rp-auto-enabled"><span>Включено</span><input type="checkbox" checked={automationEnabled} onChange={(event) => setAutomationEnabled(event.target.checked)} /></label>
                <button className="rp-button green" disabled={loading || !selectedReport || !automationName.trim()} onClick={createAutomation}>Сохранить расписание</button>
              </div>
            </section>
            <section className="rp-pane rp-auto-list">
              <div className="rp-pane__head">Отчеты отложенной отсылки</div>
              <div className="rp-table-wrap">
                <table className="rp-table"><thead><tr><th>Вкл.</th><th>Наименование</th><th>Отчет</th><th>Расписание</th><th>Следующий запуск</th><th>Получатели</th><th>Формат</th></tr></thead>
                  <tbody>{automations.map((row) => <tr key={row.AUTOMATION_ID}><td><input type="checkbox" checked={!!row.ENABLED} onChange={() => toggleAutomation(row)} /></td><td>{row.NAME}</td><td>{row.REPORT_NAME}</td><td>{row.SCHEDULE_CODE} {row.SCHEDULE_TIME}</td><td>{formatDate(row.NEXT_RUN)}</td><td>{row.RECIPIENTS || "—"}</td><td>{row.OUTPUT_FORMAT}</td></tr>)}
                    {!automations.length && <tr><td className="rp-empty" colSpan={7}>Автоматизированные отчеты не настроены</td></tr>}
                  </tbody></table>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="rp-log">
          <div className="rp-log__toolbar">
            <button className="rp-button" disabled={!selectedRun} onClick={() => selectedRun && setSelectedRun({ ...selectedRun, __detail: true })}><IcInfo size={13} /> Техническая информация</button>
            <button className="rp-button" disabled={loading || !selectedRun} onClick={openRun}><ReportIcon size={13} /> {loading ? "Открытие..." : "Отчет"}</button>
            <span className="sp" />
            <button className="rp-button" onClick={loadRuns}><IcSync size={13} /> Обновить</button>
            <button className="rp-button"><IcGear size={13} /> Настройки</button>
          </div>
          <div className="rp-table-wrap">
            <table className="rp-table rp-log-table"><thead><tr><th>Статус</th><th>Дата / время</th><th>Отчет</th><th>Пользователь</th><th>Период</th><th>Строк</th><th>Формат</th><th>Длительность</th><th>Комментарий</th></tr></thead>
              <tbody>{runs.map((row) => <tr key={row.RUN_ID} className={selectedRun?.RUN_ID === row.RUN_ID ? "selected" : ""} onClick={() => setSelectedRun(row)} onDoubleClick={() => setSelectedRun({ ...row, __detail: true })}><td><span className={`rp-status ${String(row.STATUS).toLowerCase()}`}>{row.STATUS}</span></td><td>{formatDate(row.CREATED_AT)}</td><td>{row.REPORT_NAME}</td><td>{row.REQUESTED_BY || "—"}</td><td>{formatDate(row.PERIOD_FROM)} – {formatDate(row.PERIOD_TO)}</td><td>{row.ROW_COUNT}</td><td>{row.OUTPUT_FORMAT}</td><td>{row.DURATION_MS} мс</td><td>{row.MESSAGE}</td></tr>)}
                {!runs.length && <tr><td className="rp-empty" colSpan={9}>Журнал отчетов пуст</td></tr>}
              </tbody></table>
          </div>
        </div>
      )}

      {selectedRun?.__detail && (
        <div className="rp-modal" role="dialog" aria-modal="true" aria-label="Техническая информация" onMouseDown={() => setSelectedRun({ ...selectedRun, __detail: false })}>
          <div className="rp-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <div className="rp-dialog__head"><span>Техническая информация · #{selectedRun.RUN_ID}</span><button onClick={() => setSelectedRun({ ...selectedRun, __detail: false })}>×</button></div>
            <dl>{Object.entries(selectedRun).filter(([key]) => key !== "__detail").map(([key, value]) => <Fragment key={key}><dt>{key}</dt><dd>{key.endsWith("_AT") || key.startsWith("PERIOD_") ? formatDate(value) : display(value)}</dd></Fragment>)}</dl>
            <div className="rp-dialog__actions"><button className="rp-button" onClick={() => setSelectedRun({ ...selectedRun, __detail: false })}>Закрыть</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
