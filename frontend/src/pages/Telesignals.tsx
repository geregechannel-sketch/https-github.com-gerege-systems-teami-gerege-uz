import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { IcExpand, IcFolder, IcFunnel, IcGear, IcPlus, IcSave, IcSearch, IcSitemap, IcSync, MENU_ICONS } from "../icons";
import "../archives.css";
import "../telesignals.css";

type Row = Record<string, any>;
type Catalog = { summary: Row; groups: Row[]; points: Row[]; types: Row[] };
type SignalForm = {
  id?: number;
  name: string;
  code: string;
  type_id: string;
  point_id: string;
  object_name: string;
  enabled: boolean;
  event_log: boolean;
  realtime: boolean;
  binary: boolean;
  auto_read: boolean;
  priority_profile: string;
  group_name: string;
  current_value: string;
};

const SignalIcon = MENU_ICONS.signals;
const MODES = [
  { id: "overview", label: "Обзор" },
  { id: "signals", label: "Сигналы" },
  { id: "history", label: "История / управление" },
];

const emptySignalForm: SignalForm = {
  name: "", code: "", type_id: "", point_id: "", object_name: "TOSH ELECTROAPPARAT",
  enabled: true, event_log: true, realtime: true, binary: true, auto_read: true,
  priority_profile: "Стандартный", group_name: "Основные сигналы", current_value: "0",
};

function iso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
}

function yesNo(value: unknown) {
  return value ? "Да" : "Нет";
}

export default function Telesignals() {
  const params = useParams();
  const navigate = useNavigate();
  const mode = MODES.some((item) => item.id === params.mode) ? String(params.mode) : "overview";
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [signals, setSignals] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedSignal, setSelectedSignal] = useState<Row | null>(null);
  const [selectedSignalIDs, setSelectedSignalIDs] = useState<Set<string>>(new Set());
  const [selectedHistory, setSelectedHistory] = useState<Row | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [enabledFilter, setEnabledFilter] = useState("");
  const [treeSearch, setTreeSearch] = useState("");
  const [from, setFrom] = useState(() => iso(new Date()));
  const [to, setTo] = useState(() => iso(new Date()));
  const [transitionsOnly, setTransitionsOnly] = useState(false);
  const [history, setHistory] = useState<Row[]>([]);
  const [rules, setRules] = useState<Row[]>([]);
  const [modal, setModal] = useState<"signal" | "types" | "rules" | "value" | "comment" | null>(null);
  const [signalForm, setSignalForm] = useState<SignalForm>(emptySignalForm);
  const [selectedType, setSelectedType] = useState<Row | null>(null);
  const [typeForm, setTypeForm] = useState({ name: "", code: "", value_off: "Нет", value_on: "Да", event_log: false, realtime: true, binary: true });
  const [ruleForm, setRuleForm] = useState({ signal_type_id: "", group_id: "", fill_by: "POINT_CODE" });
  const [valueForm, setValueForm] = useState({ value: "1", comment: "" });
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadCatalog() {
    const env = await api.get<Catalog>("telesignals/catalog");
    if (!env.success || !env.data) {
      setError(env.message || "Не удалось загрузить данные телесигнализации");
      return;
    }
    setCatalog(env.data);
  }

  async function loadSignals(applyFilters = mode === "signals") {
    const query = new URLSearchParams({ limit: "500" });
    if (applyFilters && search.trim()) query.set("search", search.trim());
    if (applyFilters && typeFilter) query.set("type_id", typeFilter);
    if (applyFilters && enabledFilter) query.set("enabled", enabledFilter);
    const env = await api.get<Row[]>(`telesignals/signals?${query}`);
    if (!env.success) {
      setError(env.message || "Не удалось загрузить сигналы");
      return;
    }
    const rows = env.data || [];
    setSignals(rows);
    setTotal(env.totalCount ?? rows.length);
    if (selectedSignal) setSelectedSignal(rows.find((row) => row.SIGNAL_ID === selectedSignal.SIGNAL_ID) || null);
    if (mode === "history" && !selectedSignalIDs.size && rows[0]) setSelectedSignalIDs(new Set([String(rows[0].SIGNAL_ID)]));
  }

  async function loadRules() {
    const env = await api.get<Row[]>("telesignals/rules");
    if (env.success) setRules(env.data || []);
    else setError(env.message || "Не удалось загрузить правила");
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    loadSignals(mode === "signals");
  }, [mode]);

  const tree = useMemo(() => {
    const groups = catalog?.groups || [];
    const points = catalog?.points || [];
    const byID = new Map(groups.map((group) => [String(group.GR_ID), group]));
    const children = new Map<string, Row[]>();
    const groupPoints = new Map<string, Row[]>();
    const pointSignals = new Map<string, Row[]>();
    for (const group of groups) {
      const parent = group.PARENT_GR_ID == null ? "" : String(group.PARENT_GR_ID);
      if (parent && byID.has(parent)) (children.get(parent) || children.set(parent, []).get(parent)!).push(group);
    }
    for (const point of points) {
      const groupID = point.GR_ID == null ? "" : String(point.GR_ID);
      (groupPoints.get(groupID) || groupPoints.set(groupID, []).get(groupID)!).push(point);
    }
    for (const signal of signals) {
      const pointID = signal.POINT_ID == null ? "" : String(signal.POINT_ID);
      (pointSignals.get(pointID) || pointSignals.set(pointID, []).get(pointID)!).push(signal);
    }
    const hasSignals = (id: string): boolean =>
      (groupPoints.get(id) || []).some((point) => (pointSignals.get(String(point.POINT_ID)) || []).length > 0) ||
      (children.get(id) || []).some((child) => hasSignals(String(child.GR_ID)));
    return {
      children, groupPoints, pointSignals,
      roots: groups.filter((group) => {
        const parent = group.PARENT_GR_ID == null ? "" : String(group.PARENT_GR_ID);
        return (!parent || !byID.has(parent)) && hasSignals(String(group.GR_ID));
      }),
    };
  }, [catalog, signals]);

  const selectedSignalKey = useMemo(
    () => Array.from(selectedSignalIDs).sort().join(","),
    [selectedSignalIDs],
  );

  useEffect(() => {
    if (!expandedGroups.size && tree.roots.length) setExpandedGroups(new Set(tree.roots.map((group) => String(group.GR_ID))));
  }, [expandedGroups.size, tree.roots]);

  useEffect(() => {
    if (mode === "history" && selectedSignalIDs.size) runHistory();
  }, [mode, selectedSignalKey]);

  function toggleGroup(id: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSignal(id: string) {
    setSelectedSignalIDs((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function GroupNode({ group, depth }: { group: Row; depth: number }) {
    const id = String(group.GR_ID);
    const children = tree.children.get(id) || [];
    const points = tree.groupPoints.get(id) || [];
    const open = expandedGroups.has(id) || !!treeSearch.trim();
    return (
      <>
        <button className="ts-tree-group" style={{ paddingLeft: 8 + depth * 16 }} onClick={() => toggleGroup(id)}>
          <span>{children.length || points.length ? (open ? "−" : "+") : ""}</span>
          {depth === 0 ? <IcSitemap size={12} /> : <IcFolder size={12} />}
          <b>{group.GR_NAME}</b>
        </button>
        {open && children.map((child) => <GroupNode key={child.GR_ID} group={child} depth={depth + 1} />)}
        {open && points.map((point) => {
          const pointSignals = tree.pointSignals.get(String(point.POINT_ID)) || [];
          const filtered = pointSignals.filter((signal) => !treeSearch.trim() || `${signal.SIGNAL_NAME} ${signal.SIGNAL_CODE} ${point.POINT_NAME}`.toLowerCase().includes(treeSearch.trim().toLowerCase()));
          if (!filtered.length) return null;
          return (
            <div key={point.POINT_ID} className="ts-tree-point" style={{ paddingLeft: 25 + depth * 16 }}>
              <strong>{point.POINT_NAME}</strong>
              {filtered.map((signal) => (
                <label key={signal.SIGNAL_ID}>
                  <input type="checkbox" checked={selectedSignalIDs.has(String(signal.SIGNAL_ID))} onChange={() => toggleSignal(String(signal.SIGNAL_ID))} />
                  <span className={`ts-dot ${signal.CURRENT_VALUE === "1" ? "on" : "off"}`} />
                  <span>{signal.SIGNAL_NAME}</span>
                </label>
              ))}
            </div>
          );
        })}
      </>
    );
  }

  function openNewSignal() {
    setSignalForm({ ...emptySignalForm, type_id: String(catalog?.types[0]?.SIGNAL_TYPE_ID || ""), point_id: String(catalog?.points[0]?.POINT_ID || "") });
    setModal("signal");
  }

  function openEditSignal() {
    if (!selectedSignal) return;
    setSignalForm({
      id: Number(selectedSignal.SIGNAL_ID), name: selectedSignal.SIGNAL_NAME, code: selectedSignal.SIGNAL_CODE,
      type_id: String(selectedSignal.SIGNAL_TYPE_ID), point_id: String(selectedSignal.POINT_ID || ""),
      object_name: selectedSignal.OBJECT_NAME || "TOSH ELECTROAPPARAT", enabled: !!selectedSignal.ENABLED,
      event_log: !!selectedSignal.EVENT_LOG, realtime: !!selectedSignal.REALTIME, binary: !!selectedSignal.BINARY,
      auto_read: !!selectedSignal.AUTO_READ, priority_profile: selectedSignal.PRIORITY_PROFILE || "Стандартный",
      group_name: selectedSignal.GROUP_NAME || "Основные сигналы", current_value: selectedSignal.CURRENT_VALUE || "0",
    });
    setModal("signal");
  }

  async function saveSignal() {
    if (!signalForm.name.trim() || !signalForm.code.trim() || !signalForm.type_id) return;
    setLoading(true);
    setError("");
    const body = { ...signalForm, type_id: Number(signalForm.type_id), point_id: signalForm.point_id ? Number(signalForm.point_id) : null };
    const env = signalForm.id ? await api.put(`telesignals/signals/${signalForm.id}`, body) : await api.post("telesignals/signals", body);
    setLoading(false);
    if (!env.success) {
      setError(env.message || "Не удалось сохранить сигнал");
      return;
    }
    setModal(null);
    setSelectedSignal(null);
    await Promise.all([loadCatalog(), loadSignals(true)]);
    setNotice("Сигнал сохранен");
  }

  async function deleteSignal() {
    if (!selectedSignal || !window.confirm(`Удалить сигнал «${selectedSignal.SIGNAL_NAME}»?`)) return;
    const env = await api.del(`telesignals/signals/${selectedSignal.SIGNAL_ID}`);
    if (!env.success) {
      setError(env.message || "Не удалось удалить сигнал");
      return;
    }
    setSelectedSignal(null);
    await Promise.all([loadCatalog(), loadSignals(true)]);
    setNotice("Сигнал удален");
  }

  function selectType(row: Row | null) {
    setSelectedType(row);
    setTypeForm(row ? {
      name: row.TYPE_NAME, code: row.TYPE_CODE, value_off: row.VALUE_OFF, value_on: row.VALUE_ON,
      event_log: !!row.EVENT_LOG, realtime: !!row.REALTIME, binary: !!row.BINARY,
    } : { name: "", code: "", value_off: "Нет", value_on: "Да", event_log: false, realtime: true, binary: true });
  }

  async function saveType() {
    if (!typeForm.name.trim() || !typeForm.code.trim()) return;
    const env = selectedType
      ? await api.put(`telesignals/types/${selectedType.SIGNAL_TYPE_ID}`, typeForm)
      : await api.post("telesignals/types", typeForm);
    if (!env.success) {
      setError(env.message || "Не удалось сохранить тип сигнала");
      return;
    }
    selectType(null);
    await loadCatalog();
    setNotice("Тип сигнала сохранен");
  }

  async function deleteType() {
    if (!selectedType || !window.confirm(`Удалить тип «${selectedType.TYPE_NAME}»?`)) return;
    const env = await api.del(`telesignals/types/${selectedType.SIGNAL_TYPE_ID}`);
    if (!env.success) {
      setError(env.message || "Тип используется сигналами");
      return;
    }
    selectType(null);
    await loadCatalog();
  }

  async function createRule() {
    if (!ruleForm.signal_type_id || !ruleForm.group_id) return;
    const env = await api.post("telesignals/rules", {
      rule_type: "POINT", signal_type_id: Number(ruleForm.signal_type_id), group_id: Number(ruleForm.group_id), fill_by: ruleForm.fill_by, enabled: true,
    });
    if (!env.success) {
      setError(env.message || "Не удалось сохранить правило");
      return;
    }
    await loadRules();
    setNotice("Правило добавлено");
  }

  async function deleteRule(id: number) {
    const env = await api.del(`telesignals/rules/${id}`);
    if (env.success) await loadRules();
    else setError(env.message || "Не удалось удалить правило");
  }

  async function runHistory() {
    if (!selectedSignalIDs.size) {
      setHistory([]);
      return;
    }
    setLoading(true);
    setError("");
    const env = await api.post<Row[]>("telesignals/history/query", {
      signal_ids: Array.from(selectedSignalIDs).map(Number), from, to, transitions_only: transitionsOnly, limit: 1000,
    });
    setLoading(false);
    if (!env.success) {
      setError(env.message || "Не удалось загрузить историю");
      return;
    }
    setHistory(env.data || []);
    setSelectedHistory(null);
  }

  async function addValue() {
    const signalID = Number(Array.from(selectedSignalIDs)[0]);
    if (!signalID) return;
    const env = await api.post("telesignals/history", { signal_id: signalID, value: valueForm.value, comment: valueForm.comment, source: "OPERATOR" });
    if (!env.success) {
      setError(env.message || "Не удалось ввести значение");
      return;
    }
    setModal(null);
    setValueForm({ value: "1", comment: "" });
    await Promise.all([loadSignals(false), runHistory()]);
    setNotice("Значение телесигнала записано");
  }

  async function updateComment() {
    if (!selectedHistory) return;
    const env = await api.put(`telesignals/history/${selectedHistory.HISTORY_ID}`, { comment, ignored: selectedHistory.IGNORED });
    if (!env.success) {
      setError(env.message || "Не удалось изменить комментарий");
      return;
    }
    setModal(null);
    await runHistory();
  }

  async function setBlocked(blocked: boolean) {
    const signalID = Number(Array.from(selectedSignalIDs)[0]);
    if (!signalID) return;
    const env = await api.put(`telesignals/signals/${signalID}/state`, { blocked, comment: blocked ? "Блокировка оператором" : "" });
    if (!env.success) {
      setError(env.message || "Не удалось изменить блокировку");
      return;
    }
    await loadSignals(false);
    setNotice(blocked ? "Сигнал заблокирован" : "Сигнал разблокирован");
  }

  async function command(action: string) {
    const signalID = Number(Array.from(selectedSignalIDs)[0]);
    if (!signalID) return;
    const env = await api.post<Row>(`telesignals/signals/${signalID}/commands`, { action });
    if (!env.success) {
      setError(env.message || "Команда не выполнена");
      return;
    }
    setNotice(env.data?.MESSAGE || "Команда выполнена");
  }

  function exportHistory() {
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Время", "Сигнал", "Код", "Значение", "Источник", "Комментарий"].map(escape).join(";"),
      ...history.map((row) => [row.RECORDED_AT, row.SIGNAL_NAME, row.SIGNAL_CODE, row.DISPLAY_VALUE, row.SOURCE, row.COMMENT].map(escape).join(";")),
    ];
    const blob = new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `signal-history-${from}-${to}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!catalog) return <div className="toshi-loader" />;

  return (
    <div className="aw ts">
      <div className="aw__title">
        <IcExpand size={14} />
        <span>Телесигналы - {MODES.find((item) => item.id === mode)?.label}</span>
        <span className="sp" />
        <button className="ic" aria-label="Обновить" onClick={() => Promise.all([loadCatalog(), loadSignals(mode === "signals")])}><IcSync size={14} /></button>
      </div>

      <nav className="ts-tabs" aria-label="Раздел телесигнализации">
        {MODES.map((item) => <button key={item.id} className={mode === item.id ? "active" : ""} onClick={() => navigate(`/telesignals/${item.id}`)}>{item.label}</button>)}
      </nav>

      {error && <div className="ts-message error">{error}<button onClick={() => setError("")}>×</button></div>}
      {notice && <div className="ts-message success">{notice}<button onClick={() => setNotice("")}>×</button></div>}

      {mode === "overview" && (
        <div className="ts-overview">
          <div className="ts-kpis">
            <article><span>Всего действительных точек учета</span><small>{formatDate(catalog.summary.UPDATED_AT)}</small><strong>{catalog.summary.POINTS} шт.</strong></article>
            <article><span>Активные телесигналы</span><small>{formatDate(catalog.summary.UPDATED_AT)}</small><strong>{catalog.summary.ACTIVE_SIGNALS} шт.</strong></article>
            <article><span>Процент доступных каналов связи</span><small>{formatDate(catalog.summary.UPDATED_AT)}</small><strong>{Number(catalog.summary.CHANNEL_AVAILABILITY).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} %</strong></article>
          </div>
          <div className="ts-overview-actions">
            <section><SignalIcon size={28} /><div><h2>Сигналы</h2><p>Список телесигналов. Добавление, изменение, удаление и группирование.</p></div><button onClick={() => navigate("/telesignals/signals")}>Открыть</button></section>
            <section><IcSync size={28} /><div><h2>История / управление</h2><p>История значений телесигналов. Введение значений, блокировка и команды устройствам.</p></div><button onClick={() => navigate("/telesignals/history")}>Открыть</button></section>
          </div>
        </div>
      )}

      {mode === "signals" && (
        <div className="ts-registry">
          <div className="ts-filterbar">
            <IcFunnel size={30} />
            <label><span>Добавить фильтр по</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Наименование, код, точка" /></label>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Тип сигнала"><option value="">Все типы</option>{catalog.types.map((type) => <option key={type.SIGNAL_TYPE_ID} value={type.SIGNAL_TYPE_ID}>{type.TYPE_NAME}</option>)}</select>
            <select value={enabledFilter} onChange={(event) => setEnabledFilter(event.target.value)} aria-label="Действителен"><option value="">Все состояния</option><option value="true">Действителен</option><option value="false">Недействителен</option></select>
            <button className="green" onClick={() => loadSignals(true)}>Применить</button>
            <button className="red" onClick={() => { setSearch(""); setTypeFilter(""); setEnabledFilter(""); setTimeout(() => loadSignals(false), 0); }}>Отменить</button>
          </div>
          <div className="ts-table-wrap">
            <table className="ts-table ts-signal-table">
              <thead><tr><th>Объект</th><th>Наименование</th><th>Код</th><th>Наименование точки</th><th>Код точки</th><th>Действителен</th><th>Название типа</th><th>Текущее значение</th><th>Время переключения</th><th>Считывание включено</th><th>Фиксировать в регистре событий</th><th>Профиль приоритетов</th><th>Считывание реального времени</th><th>Бинарный</th></tr></thead>
              <tbody>
                {signals.map((row) => <tr key={row.SIGNAL_ID} className={selectedSignal?.SIGNAL_ID === row.SIGNAL_ID ? "selected" : ""} onClick={() => setSelectedSignal(row)} onDoubleClick={openEditSignal}><td>{row.OBJECT_NAME}</td><td>{row.SIGNAL_NAME}</td><td>{row.SIGNAL_CODE}</td><td>{row.POINT_NAME || "—"}</td><td>{row.POINT_CODE || "—"}</td><td>{yesNo(row.ENABLED)}</td><td>{row.TYPE_NAME}</td><td><span className={`ts-value ${row.CURRENT_VALUE === "1" ? "on" : "off"}`}>{row.DISPLAY_VALUE}</span></td><td>{formatDate(row.SWITCHED_AT)}</td><td>{yesNo(row.AUTO_READ)}</td><td>{yesNo(row.EVENT_LOG)}</td><td>{row.PRIORITY_PROFILE}</td><td>{yesNo(row.REALTIME)}</td><td>{yesNo(row.BINARY)}</td></tr>)}
                {!signals.length && <tr><td colSpan={14} className="ts-empty">Список пустой</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="ts-pager"><span>Страница 1</span><span>1 - {signals.length} / {total}</span><span>Записей на странице 500</span></div>
          <div className="ts-actions six">
            <button onClick={() => { loadRules(); setModal("rules"); }}>Правила автоматического заполнения</button>
            <button onClick={() => { selectType(catalog.types[0] || null); setModal("types"); }}>Типы сигналов</button>
            <button onClick={openNewSignal}><IcPlus size={13} /> Добавить сигнал</button>
            <button disabled={!selectedSignal} onClick={openEditSignal}>Редактировать сигнал</button>
            <button disabled={!selectedSignal} onClick={openEditSignal}>Включить в группу</button>
            <button className="danger" disabled={!selectedSignal} onClick={deleteSignal}>Удалить сигнал</button>
          </div>
        </div>
      )}

      {mode === "history" && (
        <div className="ts-history-layout">
          <section className="ts-pane ts-tree-pane">
            <div className="ts-pane-head">Дерево объектов</div>
            <div className="ts-tree-tools"><label><IcSearch size={13} /><input value={treeSearch} onChange={(event) => setTreeSearch(event.target.value)} placeholder="Поиск" /></label><button onClick={() => setSelectedSignalIDs(new Set(signals.map((signal) => String(signal.SIGNAL_ID))))}>Все</button></div>
            <div className="ts-object-tree">{tree.roots.map((group) => <GroupNode key={group.GR_ID} group={group} depth={0} />)}</div>
            <div className="ts-tree-footer"><button disabled={!selectedSignalIDs.size} onClick={() => setSelectedSignalIDs(new Set())}>Снять отм. всем</button><span>Выбрано: {selectedSignalIDs.size}</span></div>
          </section>
          <section className="ts-pane ts-history-pane">
            <div className="ts-pane-head">История телесигнала</div>
            <div className="ts-period"><label>От <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>До <input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><label className="check"><input type="checkbox" checked={transitionsOnly} onChange={(event) => setTransitionsOnly(event.target.checked)} /> Только переключения</label><button className="green" disabled={!selectedSignalIDs.size || loading} onClick={runHistory}><IcSync size={13} /> {loading ? "Обновление..." : "Обновить"}</button><button disabled={!history.length} onClick={exportHistory}><IcSave size={13} /> Архив...</button></div>
            <div className="ts-table-wrap ts-history-table-wrap">
              <table className="ts-table"><thead><tr><th>Время</th><th>Сигнал</th><th>Код</th><th>Значение</th><th>Источник</th><th>Комментарий</th><th>Игнор.</th></tr></thead>
                <tbody>{history.map((row) => <tr key={row.HISTORY_ID} className={selectedHistory?.HISTORY_ID === row.HISTORY_ID ? "selected" : ""} onClick={() => setSelectedHistory(row)}><td>{formatDate(row.RECORDED_AT)}</td><td>{row.SIGNAL_NAME}</td><td>{row.SIGNAL_CODE}</td><td><span className={`ts-value ${row.SIGNAL_VALUE === "1" ? "on" : "off"}`}>{row.DISPLAY_VALUE}</span></td><td>{row.SOURCE}</td><td>{row.COMMENT || "—"}</td><td>{yesNo(row.IGNORED)}</td></tr>)}{!history.length && <tr><td colSpan={7} className="ts-empty">Список пустой</td></tr>}</tbody>
              </table>
            </div>
            <div className="ts-history-actions">
              <button disabled={!selectedHistory} onClick={() => { setComment(selectedHistory?.COMMENT || ""); setModal("comment"); }}>Менять комментарий</button>
              <button disabled={selectedSignalIDs.size !== 1} onClick={() => setBlocked(true)}>Блокировать</button>
              <button disabled={selectedSignalIDs.size !== 1} onClick={() => setBlocked(false)}>Разблокировать</button>
              <button disabled={selectedSignalIDs.size !== 1} onClick={() => setModal("value")}>Ввести запись</button>
              <button disabled>Расписание управления</button>
              <button disabled={selectedSignalIDs.size !== 1} onClick={() => command("SEND")}>Слать команду</button>
              <button className="green" disabled={selectedSignalIDs.size !== 1} onClick={() => command("DEVICE")}>С устройства</button>
              <button className="green" disabled={selectedSignalIDs.size !== 1} onClick={() => command("REBUILD")}>Пересбор</button>
              <button className="green" disabled={selectedSignalIDs.size !== 1} onClick={() => command("COLLECT")}>Сбор</button>
              <button className="process" disabled={selectedSignalIDs.size !== 1}><span /> Процесс связи</button>
              <button><IcGear size={13} /> Настройки</button>
            </div>
          </section>
        </div>
      )}

      {modal === "signal" && (
        <div className="ts-modal" role="dialog" aria-modal="true" aria-label={signalForm.id ? "Редактировать сигнал" : "Добавить сигнал"} onMouseDown={() => setModal(null)}>
          <div className="ts-dialog signal-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <div className="ts-dialog-head"><span>{signalForm.id ? "Редактировать сигнал" : "Добавить сигнал"}</span><button onClick={() => setModal(null)}>×</button></div>
            <div className="ts-form-grid">
              <label><span>Наименование</span><input value={signalForm.name} onChange={(event) => setSignalForm({ ...signalForm, name: event.target.value })} /></label>
              <label><span>Код</span><input value={signalForm.code} onChange={(event) => setSignalForm({ ...signalForm, code: event.target.value })} /></label>
              <label><span>Тип сигнала</span><select value={signalForm.type_id} onChange={(event) => setSignalForm({ ...signalForm, type_id: event.target.value })}><option value="">Выбрать</option>{catalog.types.map((type) => <option key={type.SIGNAL_TYPE_ID} value={type.SIGNAL_TYPE_ID}>{type.TYPE_NAME}</option>)}</select></label>
              <label><span>Точка</span><select value={signalForm.point_id} onChange={(event) => setSignalForm({ ...signalForm, point_id: event.target.value })}><option value="">Без точки</option>{catalog.points.map((point) => <option key={point.POINT_ID} value={point.POINT_ID}>{point.POINT_NAME}</option>)}</select></label>
              <label><span>Объект</span><input value={signalForm.object_name} onChange={(event) => setSignalForm({ ...signalForm, object_name: event.target.value })} /></label>
              <label><span>Группа</span><input value={signalForm.group_name} onChange={(event) => setSignalForm({ ...signalForm, group_name: event.target.value })} /></label>
              <label><span>Профиль приоритетов</span><select value={signalForm.priority_profile} onChange={(event) => setSignalForm({ ...signalForm, priority_profile: event.target.value })}><option>Стандартный</option><option>Аварийный</option><option>Информационный</option></select></label>
              {!signalForm.id && <label><span>Начальное значение</span><select value={signalForm.current_value} onChange={(event) => setSignalForm({ ...signalForm, current_value: event.target.value })}><option value="0">0</option><option value="1">1</option></select></label>}
            </div>
            <div className="ts-check-grid"><label><input type="checkbox" checked={signalForm.enabled} onChange={(event) => setSignalForm({ ...signalForm, enabled: event.target.checked })} /> Действителен</label><label><input type="checkbox" checked={signalForm.event_log} onChange={(event) => setSignalForm({ ...signalForm, event_log: event.target.checked })} /> Фиксировать в регистре событий</label><label><input type="checkbox" checked={signalForm.realtime} onChange={(event) => setSignalForm({ ...signalForm, realtime: event.target.checked })} /> Считывание реального времени</label><label><input type="checkbox" checked={signalForm.binary} onChange={(event) => setSignalForm({ ...signalForm, binary: event.target.checked })} /> Бинарный</label><label><input type="checkbox" checked={signalForm.auto_read} onChange={(event) => setSignalForm({ ...signalForm, auto_read: event.target.checked })} /> Автоматизированное считывание</label></div>
            <button className="ts-submit" disabled={loading || !signalForm.name.trim() || !signalForm.code.trim() || !signalForm.type_id} onClick={saveSignal}>{loading ? "Сохранение..." : signalForm.id ? "Сохранить сигнал" : "Добавить сигнал"}</button>
          </div>
        </div>
      )}

      {modal === "types" && (
        <div className="ts-modal" role="dialog" aria-modal="true" aria-label="Типы сигналов" onMouseDown={() => setModal(null)}>
          <div className="ts-dialog types-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <div className="ts-dialog-head"><span>Типы сигналов</span><button onClick={() => setModal(null)}>×</button></div>
            <div className="ts-types-layout"><div className="ts-type-list">{catalog.types.map((row) => <button key={row.SIGNAL_TYPE_ID} className={selectedType?.SIGNAL_TYPE_ID === row.SIGNAL_TYPE_ID ? "active" : ""} onClick={() => selectType(row)}>{row.TYPE_NAME}</button>)}</div><div className="ts-type-form"><label><span>Название типа</span><input value={typeForm.name} onChange={(event) => setTypeForm({ ...typeForm, name: event.target.value })} /></label><label><span>Код типа</span><input value={typeForm.code} onChange={(event) => setTypeForm({ ...typeForm, code: event.target.value })} /></label><label><span>Значение 0</span><input value={typeForm.value_off} onChange={(event) => setTypeForm({ ...typeForm, value_off: event.target.value })} /></label><label><span>Значение 1</span><input value={typeForm.value_on} onChange={(event) => setTypeForm({ ...typeForm, value_on: event.target.value })} /></label><label className="check"><input type="checkbox" checked={typeForm.event_log} onChange={(event) => setTypeForm({ ...typeForm, event_log: event.target.checked })} /> Фиксировать в регистре событий</label><label className="check"><input type="checkbox" checked={typeForm.realtime} onChange={(event) => setTypeForm({ ...typeForm, realtime: event.target.checked })} /> Считывание реального времени</label><label className="check"><input type="checkbox" checked={typeForm.binary} onChange={(event) => setTypeForm({ ...typeForm, binary: event.target.checked })} /> Бинарный</label><button className="green" onClick={() => { selectType(null); }}>Добавить</button><button onClick={saveType}>Сохранить</button><button className="red" disabled={!selectedType} onClick={deleteType}>Удалить</button></div></div>
          </div>
        </div>
      )}

      {modal === "rules" && (
        <div className="ts-modal" role="dialog" aria-modal="true" aria-label="Правила автоматического заполнения сигналов" onMouseDown={() => setModal(null)}>
          <div className="ts-dialog rules-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <div className="ts-dialog-head"><span>Правила автоматического заполнения сигналов</span><button onClick={() => setModal(null)}>×</button></div>
            <div className="ts-table-wrap"><table className="ts-table"><thead><tr><th>Тип</th><th>Тип сигнала</th><th>Наименование группы</th><th>Заполняется по</th><th /></tr></thead><tbody>{rules.map((row) => <tr key={row.RULE_ID}><td>{row.RULE_TYPE}</td><td>{row.TYPE_NAME}</td><td>{row.GROUP_NAME}</td><td>{row.FILL_BY}</td><td><button className="ts-icon-danger" aria-label="Удалить правило" onClick={() => deleteRule(row.RULE_ID)}>×</button></td></tr>)}{!rules.length && <tr><td colSpan={5} className="ts-empty">Список пустой</td></tr>}</tbody></table></div>
            <div className="ts-rule-form"><select value={ruleForm.signal_type_id} onChange={(event) => setRuleForm({ ...ruleForm, signal_type_id: event.target.value })}><option value="">Тип сигнала</option>{catalog.types.map((type) => <option key={type.SIGNAL_TYPE_ID} value={type.SIGNAL_TYPE_ID}>{type.TYPE_NAME}</option>)}</select><select value={ruleForm.group_id} onChange={(event) => setRuleForm({ ...ruleForm, group_id: event.target.value })}><option value="">Группа</option>{catalog.groups.map((group) => <option key={group.GR_ID} value={group.GR_ID}>{group.GR_NAME}</option>)}</select><select value={ruleForm.fill_by} onChange={(event) => setRuleForm({ ...ruleForm, fill_by: event.target.value })}><option value="POINT_CODE">Коду точки</option><option value="POINT_NAME">Наименованию точки</option></select><button disabled={!ruleForm.signal_type_id || !ruleForm.group_id} onClick={createRule}><IcPlus size={13} /> Добавить правило</button></div>
          </div>
        </div>
      )}

      {modal === "value" && (
        <div className="ts-modal" role="dialog" aria-modal="true" aria-label="Ввести запись" onMouseDown={() => setModal(null)}><div className="ts-dialog compact" onMouseDown={(event) => event.stopPropagation()}><div className="ts-dialog-head"><span>Ввести запись телесигнала</span><button onClick={() => setModal(null)}>×</button></div><div className="ts-compact-form"><label><span>Значение</span><select value={valueForm.value} onChange={(event) => setValueForm({ ...valueForm, value: event.target.value })}><option value="0">0</option><option value="1">1</option></select></label><label><span>Комментарий значения</span><textarea value={valueForm.comment} onChange={(event) => setValueForm({ ...valueForm, comment: event.target.value })} /></label><button className="green" onClick={addValue}>Ввести запись</button></div></div></div>
      )}

      {modal === "comment" && (
        <div className="ts-modal" role="dialog" aria-modal="true" aria-label="Комментарий" onMouseDown={() => setModal(null)}><div className="ts-dialog compact" onMouseDown={(event) => event.stopPropagation()}><div className="ts-dialog-head"><span>Комментарий значения</span><button onClick={() => setModal(null)}>×</button></div><div className="ts-compact-form"><label><span>Комментарий</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} /></label><button className="green" onClick={updateComment}>Сохранить</button></div></div></div>
      )}
    </div>
  );
}
