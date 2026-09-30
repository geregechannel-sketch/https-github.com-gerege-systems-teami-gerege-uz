import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { IcExpand, IcFolder, IcFunnel, IcGear, IcGrid, IcHelp, IcInfo, IcMeter, IcReset, IcSave, IcSearch, IcSitemap, IcSync, MENU_ICONS } from "../icons";
import "../archives.css";
import "../load-control.css";

type Row = Record<string, any>;
type Catalog = { groups: Row[]; points: Row[]; summary: Row; filters: Row };
type Mode = "relays" | "limits";

const LoadIcon = MENU_ICONS.load;

function formatDate(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
}

function stateText(value: unknown) {
  if (value == null) return "Неизвестно";
  return value ? "Включено" : "Отключено";
}

function statusText(value: unknown) {
  return ({ COMPLETED: "Выполнено", CANCELLED: "Отменено", IDLE: "Ожидание" } as Row)[String(value)] || String(value || "—");
}

export default function LoadControl() {
  const { mode: rawMode } = useParams();
  const navigate = useNavigate();
  const mode: Mode = rawMode === "limits" ? "limits" : "relays";
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [treeSearch, setTreeSearch] = useState("");
  const [channelType, setChannelType] = useState("");
  const [readingPointType, setReadingPointType] = useState("");
  const [dataLocation, setDataLocation] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState(30);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"legend" | "settings" | "limit" | null>(null);
  const [limitValue, setLimitValue] = useState("80");

  async function loadCatalog() {
    const env = await api.get<Catalog>("loadcontrol/catalog");
    if (!env.success || !env.data) {
      setError(env.message || "Не удалось загрузить управление нагрузкой");
      return;
    }
    setCatalog(env.data);
    const first = env.data.points.find((point) => Number(mode === "relays" ? point.RELAYS : point.LIMITS) > 0) || env.data.points[0];
    if (first) {
      setSelectedPoints((current) => current.size ? current : new Set([String(first.POINT_ID)]));
      setExpandedGroups((current) => {
        if (current.size) return current;
        const byID = new Map(env.data!.groups.map((group) => [String(group.GR_ID), group]));
        const next = new Set<string>();
        let groupID = String(first.GR_ID || "");
        while (groupID && byID.has(groupID)) {
          next.add(groupID);
          groupID = String(byID.get(groupID)?.PARENT_GR_ID || "");
        }
        return next;
      });
    }
  }

  async function loadData(clearFilters = false) {
    if (!selectedPoints.size) {
      setRows([]);
      setSelectedRows(new Set());
      return;
    }
    setLoading(true);
    const env = await api.post<Row[]>(`loadcontrol/${mode}/query`, {
      point_ids: Array.from(selectedPoints).map(Number), search: "",
      channel_type: clearFilters ? "" : channelType,
      reading_point_type: clearFilters ? "" : readingPointType,
      data_location: clearFilters ? "" : dataLocation,
    });
    setLoading(false);
    if (!env.success) {
      setError(env.message || "Не удалось получить данные управления нагрузкой");
      return;
    }
    const data = env.data || [];
    const idKey = mode === "relays" ? "RELAY_ID" : "LIMIT_ID";
    const validIDs = new Set(data.map((row) => String(row[idKey])));
    setRows(data);
    setSelectedRows((current) => new Set(Array.from(current).filter((id) => validIDs.has(id))));
    setUpdatedAt(new Date());
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  const pointKey = useMemo(() => Array.from(selectedPoints).sort().join(","), [selectedPoints]);
  const filterKey = `${channelType}|${readingPointType}|${dataLocation}`;

  useEffect(() => {
    setSelectedRows(new Set());
    if (selectedPoints.size) loadData();
  }, [mode, pointKey, filterKey]);

  useEffect(() => {
    if (!autoRefresh || !selectedPoints.size) return;
    const interval = window.setInterval(() => loadData(), Math.max(5, refreshSeconds) * 1000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, refreshSeconds, mode, pointKey, channelType, readingPointType, dataLocation]);

  const tree = useMemo(() => {
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
    const hasPoints = (id: string): boolean => (groupPoints.get(id) || []).length > 0 || (children.get(id) || []).some((child) => hasPoints(String(child.GR_ID)));
    return {
      children, groupPoints,
      roots: groups.filter((group) => {
        const parent = group.PARENT_GR_ID == null ? "" : String(group.PARENT_GR_ID);
        return (!parent || !byID.has(parent)) && hasPoints(String(group.GR_ID));
      }),
    };
  }, [catalog]);

  useEffect(() => {
    if (!expandedGroups.size && tree.roots.length) setExpandedGroups(new Set(tree.roots.map((group) => String(group.GR_ID))));
  }, [tree.roots, expandedGroups.size]);

  function toggleGroup(id: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function togglePoint(id: string) {
    setSelectedPoints((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function GroupNode({ group, depth }: { group: Row; depth: number }) {
    const id = String(group.GR_ID);
    const children = tree.children.get(id) || [];
    const points = tree.groupPoints.get(id) || [];
    const expanded = expandedGroups.has(id);
    return <div className="lc-tree-branch">
      <button className="lc-tree-group" style={{ paddingLeft: 7 + depth * 14 }} onClick={() => toggleGroup(id)}>
        <span className="lc-tree-toggle">{expanded ? "−" : "+"}</span>
        <span className={`lc-tree-kind lc-tree-kind--${Math.min(depth, 3)}`}><IcFolder size={12} /></span>
        <span className="lc-tree-label">{group.GR_NAME}</span>
      </button>
      {expanded && <>{children.map((child) => <GroupNode key={child.GR_ID} group={child} depth={depth + 1} />)}{points.filter((point) => `${point.POINT_CODE} ${point.POINT_NAME}`.toLowerCase().includes(treeSearch.trim().toLowerCase())).map((point) => {
        const selected = selectedPoints.has(String(point.POINT_ID));
        const controlled = Number(point.RELAYS) > 0 || Number(point.LIMITS) > 0;
        return <label className={`lc-tree-point${selected ? " selected" : ""}`} key={point.POINT_ID} style={{ paddingLeft: 38 + depth * 14 }}>
          <input className="lc-tree-check" type="checkbox" checked={selected} onChange={() => togglePoint(String(point.POINT_ID))} />
          <span className={`lc-point-icon${controlled ? " lc-point-icon--meter" : ""}`}>{controlled ? <IcMeter size={20} /> : "ϟ"}</span>
          <span className="lc-point-label">{point.POINT_NAME || point.POINT_CODE}</span>
        </label>;
      })}</>}
    </div>;
  }

  function toggleRow(id: string) {
    setSelectedRows((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllRows() {
    const idKey = mode === "relays" ? "RELAY_ID" : "LIMIT_ID";
    const ids = rows.map((row) => String(row[idKey]));
    const allSelected = ids.length > 0 && ids.every((id) => selectedRows.has(id));
    setSelectedRows(allSelected ? new Set() : new Set(ids));
  }

  async function runCommand(action: string, allIfEmpty = false, value?: number) {
    const idKey = mode === "relays" ? "RELAY_ID" : "LIMIT_ID";
    const ids = selectedRows.size ? Array.from(selectedRows).map(Number) : allIfEmpty ? rows.map((row) => Number(row[idKey])) : [];
    if (!ids.length) return;
    const env = await api.post<Row>(`loadcontrol/${mode}/command`, { ids, action, value });
    if (!env.success) {
      setError(env.message || "Команда не выполнена");
      return;
    }
    setNotice(env.data?.MESSAGE || "Команда выполнена");
    setModal(null);
    loadData();
    loadCatalog();
  }

  function exportRows() {
    if (!rows.length) return;
    const columns = Object.keys(rows[0]);
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const content = [columns.map(escape).join(";"), ...rows.map((row) => columns.map((column) => escape(row[column])).join(";"))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `load-control-${mode}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!catalog) return <div className="toshi-loader" />;
  const nextUpdate = updatedAt && autoRefresh ? new Date(updatedAt.getTime() + refreshSeconds * 1000) : null;
  return <div className="aw lc">
    <div className="aw__title"><IcExpand size={14} /><span>Управление нагрузкой</span><span className="sp" /><button className="ic" aria-label="Обновить" onClick={() => loadData()}><IcSync size={14} /></button></div>
    {error && <div className="lc-message error">{error}<button onClick={() => setError("")}>×</button></div>}
    {notice && <div className="lc-message success">{notice}<button onClick={() => setNotice("")}>×</button></div>}

    <div className="lc-layout">
      <section className="lc-pane lc-selector">
        <div className="lc-pane-head">Выбор ТУ</div>
        <div className="lc-tree-tools">
          <button className="lc-meter-button" title="Тип поиска"><IcMeter size={24} /></button>
          <select aria-label="Тип поиска"><option>Дин...</option></select>
          <label><input value={treeSearch} onChange={(event) => setTreeSearch(event.target.value)} placeholder="Поиск" /></label>
          <button className="green" title="Найти"><IcSearch size={15} /></button>
          <button className="blue" title="Выбрать все" onClick={() => setSelectedPoints(new Set(catalog.points.map((point) => String(point.POINT_ID))))}><IcFunnel size={15} /></button>
          <button className="red" title="Сбросить" onClick={() => { setTreeSearch(""); setSelectedPoints(new Set()); }}><IcReset size={15} /></button>
        </div>
        <div className="lc-root-select"><span>Корневая группа</span><select aria-label="Корневая группа"><option>Начальная корневая группа</option></select></div>
        <div className="lc-tree">
          <button className="lc-tree-group lc-tree-service"><span className="lc-tree-toggle">+</span><span className="lc-tree-kind lc-tree-kind--service"><IcSitemap size={12} /></span><span className="lc-tree-label">Служебные группы</span></button>
          {tree.roots.map((group) => <GroupNode key={group.GR_ID} group={group} depth={0} />)}
        </div>
        <div className="lc-tree-footer"><button disabled={!selectedPoints.size} onClick={() => setSelectedPoints(new Set())}>Снять отм. всем</button><span>Выделено элементов: {selectedPoints.size}</span><button title="Информация"><IcInfo size={14} /></button><button title="Справка"><IcHelp size={14} /></button><button title="Настройки" onClick={() => setModal("settings")}><IcGear size={14} /></button></div>
        <button className="lc-legend-button" onClick={() => setModal("legend")}><LoadIcon size={15} /> Обозначения</button>
      </section>

      <section className="lc-pane lc-workspace">
        <nav className="lc-tabs" aria-label="Режим управления нагрузкой"><button className={mode === "relays" ? "active" : ""} onClick={() => navigate("/load-control/relays")}>Управление реле</button><button className={mode === "limits" ? "active" : ""} onClick={() => navigate("/load-control/limits")}>Лимиты</button></nav>
        <div className="lc-filters">
          <div className="lc-filter-row"><span>Установки связи:</span><label>Отображаемые {mode === "relays" ? "реле" : "лимиты"}<select aria-label="Отображаемые элементы"><option>Все {mode === "relays" ? "реле" : "лимиты"}</option></select></label></div>
          <div className="lc-filter-row triple"><label>Тип канала<select value={channelType} onChange={(event) => setChannelType(event.target.value)}><option value="">Использовать действительные</option>{catalog.filters.CHANNEL_TYPES.map((value: string) => <option key={value}>{value}</option>)}</select></label><label>Тип точки считывания<select value={readingPointType} onChange={(event) => setReadingPointType(event.target.value)}><option value="">Использовать действительные</option>{catalog.filters.READING_POINT_TYPES.map((value: string) => <option key={value}>{value}</option>)}</select></label><label>Расположение данных<select value={dataLocation} onChange={(event) => setDataLocation(event.target.value)}><option value="">Использовать действительные</option>{catalog.filters.DATA_LOCATIONS.map((value: string) => <option key={value}>{value}</option>)}</select></label></div>
        </div>

        <div className="lc-table-wrap">
          <table className="lc-table">
            {mode === "relays" ? <><colgroup><col style={{ width: 35 }} /><col style={{ width: 150 }} /><col style={{ width: 100 }} /><col style={{ width: 80 }} /><col style={{ width: 90 }} /><col style={{ width: 230 }} /><col style={{ width: 90 }} /><col style={{ width: 120 }} /><col style={{ width: 160 }} /><col style={{ width: 190 }} /><col style={{ width: 200 }} /></colgroup><thead><tr><th className="lc-select-col"><input aria-label="Выбрать все строки" type="checkbox" checked={rows.length > 0 && rows.every((row) => selectedRows.has(String(row.RELAY_ID)))} onChange={toggleAllRows} /></th><th>Код точки</th><th>Имя точки</th><th>Реле</th><th>Состояние</th><th>Статус выполнения команды</th><th>Состояние (в БД)</th><th>Время (в БД)</th><th>Состояние (в устройстве)</th><th>Время (в устройстве)</th><th>Установленное значение</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.RELAY_ID ?? "relay"}-${row.RELAY_CODE ?? index}`} className={selectedRows.has(String(row.RELAY_ID)) ? "selected" : ""} onClick={() => toggleRow(String(row.RELAY_ID))}><td className="lc-select-col"><input aria-label={`Выбрать ${row.RELAY_NAME}`} type="checkbox" checked={selectedRows.has(String(row.RELAY_ID))} onClick={(event) => event.stopPropagation()} onChange={() => toggleRow(String(row.RELAY_ID))} /></td><td>{row.POINT_CODE}</td><td>{row.POINT_NAME}</td><td>{row.RELAY_NAME}</td><td><span className={`lc-state ${row.CURRENT_STATE == null ? "unknown" : row.CURRENT_STATE ? "on" : "off"}`}>{stateText(row.CURRENT_STATE)}</span></td><td>{statusText(row.COMMAND_STATUS)}</td><td>{stateText(row.DB_STATE)}</td><td>{formatDate(row.DB_AT)}</td><td>{stateText(row.DEVICE_STATE)}</td><td>{formatDate(row.DEVICE_AT)}</td><td>{stateText(row.DESIRED_STATE)}</td></tr>)}</tbody></> : <><colgroup><col style={{ width: 35 }} /><col style={{ width: 150 }} /><col style={{ width: 300 }} /><col style={{ width: 200 }} /><col style={{ width: 120 }} /><col style={{ width: 230 }} /><col style={{ width: 120 }} /><col style={{ width: 190 }} /></colgroup><thead><tr><th className="lc-select-col"><input aria-label="Выбрать все строки" type="checkbox" checked={rows.length > 0 && rows.every((row) => selectedRows.has(String(row.LIMIT_ID)))} onChange={toggleAllRows} /></th><th>Код точки</th><th>Имя точки</th><th>Параметр</th><th>Значение</th><th>Статус выполнения команды</th><th>Данные из</th><th>Обновлено</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.LIMIT_ID ?? "limit"}-${row.PARAMETER_CODE ?? index}`} className={selectedRows.has(String(row.LIMIT_ID)) ? "selected" : ""} onClick={() => toggleRow(String(row.LIMIT_ID))}><td className="lc-select-col"><input aria-label={`Выбрать ${row.PARAMETER_NAME}`} type="checkbox" checked={selectedRows.has(String(row.LIMIT_ID))} onClick={(event) => event.stopPropagation()} onChange={() => toggleRow(String(row.LIMIT_ID))} /></td><td>{row.POINT_CODE}</td><td>{row.POINT_NAME}</td><td>{row.PARAMETER_NAME}</td><td><strong>{Number(row.LIMIT_VALUE).toLocaleString("ru-RU")} {row.UNIT}</strong></td><td>{statusText(row.COMMAND_STATUS)}</td><td>{row.DATA_SOURCE}</td><td>{formatDate(row.UPDATED_AT)}</td></tr>)}</tbody></>}
          </table>
          {!loading && !rows.length && <div className="lc-empty-state"><IcGrid size={72} /><span>Список пустой</span></div>}
        </div>

        <div className="lc-statusbar"><span>Обновлено: {formatDate(updatedAt)}</span><span>Следующее обновление: {formatDate(nextUpdate)}</span><label>Автоматическое обновление <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} /></label><span>{rows.length ? `Записей: ${rows.length}` : "Список пустой"}</span><button title="Экспорт CSV" disabled={!rows.length} onClick={exportRows}><IcSave size={16} /></button><button title="Настройки" onClick={() => setModal("settings")}><IcGear size={16} /></button></div>

        {mode === "relays" ? <div className="lc-actions"><div className="primary"><button className="green" disabled={!selectedRows.size} onClick={() => runCommand("ENABLE")}>Включить</button><button className="orange" disabled={!selectedRows.size} onClick={() => runCommand("DISABLE")}>Отключить</button><button className="red" disabled={!selectedRows.size} onClick={() => runCommand("CANCEL")}>Отменить выполнение</button></div><div className="secondary"><button disabled={!rows.length} onClick={() => runCommand("READ_DB", true)}>Обновить состояния из БД</button><button disabled={!rows.length} onClick={() => runCommand("READ_DEVICE", true)}>Обновить состояния из устройства</button><button disabled={!rows.length} onClick={() => runCommand("STATUS", true)}>Обновить статусы выполнения</button><button className="green" disabled={!rows.length} onClick={() => runCommand("COLLECT", true)}>Собрать</button><button className="green full" disabled={!rows.length} onClick={() => runCommand("READ_DB", true)}>Считать из БД</button></div></div> : <div className="lc-actions"><div className="primary"><button className="green" disabled={!selectedRows.size} onClick={() => setModal("limit")}>Установить лимиты</button><button className="orange" disabled={!selectedRows.size} onClick={() => runCommand("INITIATE")}>Инициировать запись в счетчики</button><button className="red" disabled={!selectedRows.size} onClick={() => runCommand("CANCEL")}>Отменить команду записи</button></div><div className="secondary"><button disabled={!rows.length} onClick={() => runCommand("READ_DB", true)}>Обновить лимиты из БД</button><button disabled={!rows.length} onClick={() => runCommand("READ_DEVICE", true)}>Обновить лимиты из устройства</button><button disabled={!rows.length} onClick={() => runCommand("STATUS", true)}>Обновить статусы выполнения</button><button className="green" disabled={!rows.length} onClick={() => runCommand("COLLECT", true)}>Собрать</button><button className="green full" disabled={!rows.length} onClick={() => runCommand("READ_DB", true)}>Считать из БД</button></div></div>}
      </section>
    </div>

    {modal === "legend" && <div className="lc-modal" role="dialog" aria-modal="true" aria-label="Обозначения" onMouseDown={() => setModal(null)}><div className="lc-dialog legend" onMouseDown={(event) => event.stopPropagation()}><div className="lc-dialog-head"><span>Обозначения</span><button onClick={() => setModal(null)}>×</button></div><h3>Символы</h3><div className="lc-legend-grid"><span className="off">○</span><p>Реле отключено</p><span className="on">●</span><p>Реле включено</p><span className="unknown">?</span><p>Состояние реле неизвестно</p><span className="ready">◉</span><p>Реле готово к включению</p><span className="cancel">×</span><p>Отмена команды</p><span>—</span><p>Нет данных</p></div><h3>Цвет фона</h3><div className="lc-legend-grid"><span className="mismatch" /><p>Противоположные состояния в устройстве и БД</p><span className="switching" /><p>Состояние противоположное заданному</p></div></div></div>}

    {modal === "settings" && <div className="lc-modal" role="dialog" aria-modal="true" aria-label="Настройки обновления" onMouseDown={() => setModal(null)}><div className="lc-dialog compact" onMouseDown={(event) => event.stopPropagation()}><div className="lc-dialog-head"><span>Настройки</span><button onClick={() => setModal(null)}>×</button></div><div className="lc-form"><label><span>Интервал обновления, сек</span><input type="number" min="5" value={refreshSeconds} onChange={(event) => setRefreshSeconds(Number(event.target.value) || 5)} /></label><label className="check"><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} /> Автоматическое обновление</label><button className="green" onClick={() => { setModal(null); setNotice("Настройки применены"); }}>Применить</button></div></div></div>}

    {modal === "limit" && <div className="lc-modal" role="dialog" aria-modal="true" aria-label="Установить лимиты" onMouseDown={() => setModal(null)}><div className="lc-dialog compact" onMouseDown={(event) => event.stopPropagation()}><div className="lc-dialog-head"><span>Установить лимиты</span><button onClick={() => setModal(null)}>×</button></div><div className="lc-form"><label><span>Значение</span><input type="number" min="0" step="0.1" value={limitValue} onChange={(event) => setLimitValue(event.target.value)} /></label><p>Выбрано параметров: {selectedRows.size}</p><button className="green" disabled={!selectedRows.size || !Number.isFinite(Number(limitValue))} onClick={() => runCommand("SET", false, Number(limitValue))}>Установить</button></div></div></div>}
  </div>;
}
