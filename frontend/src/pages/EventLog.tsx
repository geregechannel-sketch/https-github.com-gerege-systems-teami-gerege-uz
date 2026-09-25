import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { IcExpand, IcFunnel, IcInfo, IcSearch, IcSync, MENU_ICONS } from "../icons";
import "../archives.css";
import "../event-log.css";

type Row = Record<string, any>;
type Filters = {
  from: string;
  to: string;
  search: string;
  priority: string;
  source: string;
  source_type: string;
  channel: string;
};

const categories = [
  { id: "all", label: "Все сообщения" },
  { id: "oracle", label: "Сообщения Oracle" },
  { id: "software", label: "Сообщения программ" },
  { id: "connection", label: "Сообщения связи" },
  { id: "data", label: "Сообщения данных" },
  { id: "system", label: "Сообщения системы" },
];

const filterOptions = [
  { id: "search", label: "Текст сообщения" },
  { id: "priority", label: "Приоритет" },
  { id: "source", label: "Источник" },
  { id: "source_type", label: "Тип источника" },
  { id: "channel", label: "Канал связи" },
];

const EventIcon = MENU_ICONS.events;

function iso(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function initialFilters(): Filters {
  const today = iso(new Date());
  return { from: today, to: today, search: "", priority: "", source: "", source_type: "", channel: "" };
}

function dateTime(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? String(value || "") : date.toLocaleString("ru-RU");
}

function yesNo(value: unknown) {
  return value ? "Да" : "Нет";
}

export default function EventLog() {
  const params = useParams();
  const navigate = useNavigate();
  const category = categories.some((item) => item.id === params.category) ? String(params.category) : "all";
  const currentCategory = categories.find((item) => item.id === category) || categories[0];
  const [draft, setDraft] = useState<Filters>(initialFilters);
  const [applied, setApplied] = useState<Filters>(initialFilters);
  const [filterField, setFilterField] = useState("search");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [summary, setSummary] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const limit = 50;

  useEffect(() => {
    setOffset(0);
    setSelected(null);
  }, [category]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api.post<Row[]>("eventlog/query", { category, ...applied, limit, offset }).then((env) => {
      if (!active) return;
      setLoading(false);
      if (!env.success) {
        setError(env.message || "Не удалось загрузить события");
        setRows([]);
        setTotal(0);
        return;
      }
      setRows(env.data || []);
      setTotal(env.totalCount ?? env.data?.length ?? 0);
      setSelected(null);
    }).catch(() => {
      if (!active) return;
      setLoading(false);
      setError("Не удалось загрузить события");
    });
    return () => { active = false; };
  }, [applied, category, offset, refreshKey]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => setRefreshKey((value) => value + 1), 15000);
    return () => window.clearInterval(timer);
  }, [autoRefresh]);

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + limit, total);
  const visiblePriorities = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((row) => { counts[String(row.EV_PRIORITY)] = (counts[String(row.EV_PRIORITY)] || 0) + 1; });
    return counts;
  }, [rows]);

  function patchDraft(key: keyof Filters, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setPeriod(kind: "day" | "week" | "month" | "year") {
    const end = new Date();
    const start = new Date(end);
    if (kind === "week") start.setDate(end.getDate() - 6);
    if (kind === "month") start.setMonth(end.getMonth() - 1);
    if (kind === "year") start.setFullYear(end.getFullYear() - 1);
    setDraft((current) => ({ ...current, from: iso(start), to: iso(end) }));
  }

  function apply() {
    setOffset(0);
    setApplied({ ...draft });
    setRefreshKey((value) => value + 1);
  }

  function reset() {
    const clean = initialFilters();
    setDraft(clean);
    setApplied(clean);
    setOffset(0);
    setRefreshKey((value) => value + 1);
  }

  async function openDetail(row: Row) {
    const env = await api.get<Row>(`eventlog/${row.EV_ID}`);
    setDetail(env.success && env.data ? env.data : row);
  }

  async function openSummary() {
    const env = await api.get<Row>(`eventlog/summary?from=${encodeURIComponent(applied.from)}&to=${encodeURIComponent(applied.to)}`);
    if (env.success && env.data) setSummary(env.data);
    else setError(env.message || "Не удалось загрузить сводную событий");
  }

  function selectCategory(id: string) {
    setOffset(0);
    navigate(`/events/${id}`);
  }

  return (
    <div className="aw ev">
      <div className="aw__title">
        <IcExpand size={14} />
        <span>Регистр событий - События - {currentCategory.label}</span>
        <span className="sp" />
        <button className="ic" aria-label="Обновить" title="Обновить" onClick={() => setRefreshKey((value) => value + 1)}>
          <IcSync size={14} />
        </button>
      </div>

      <div className="ev__topbar">
        <button className="ev-action summary" onClick={openSummary}><EventIcon size={14} /> Сводная событий</button>
        <button className="ev-action" onClick={() => selectCategory("all")}><IcInfo size={14} /> Все события</button>
        <label className="ev-auto">
          <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
          <span>Автоматическое обновление</span>
        </label>
        <span className="sp" />
        <span className="ev-quick-count info">INFO {visiblePriorities.INFO || 0}</span>
        <span className="ev-quick-count warn">WARN {visiblePriorities.WARN || 0}</span>
        <span className="ev-quick-count error">ERROR {(visiblePriorities.ERROR || 0) + (visiblePriorities.CRITICAL || 0)}</span>
      </div>

      <div className="ev-categories" role="tablist" aria-label="Тип событий">
        {categories.map((item) => (
          <button key={item.id} className={item.id === category ? "active" : ""} onClick={() => selectCategory(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="ev-filter">
        <span className="ev-filter__icon"><IcFunnel size={15} /></span>
        <label className="ev-filter__add">
          <span>Добавить фильтр по</span>
          <select value={filterField} onChange={(event) => setFilterField(event.target.value)}>
            {filterOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        {filterField === "priority" ? (
          <select className="ev-filter__value" value={draft.priority} onChange={(event) => patchDraft("priority", event.target.value)}>
            <option value="">Все приоритеты</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        ) : (
          <label className="ev-filter__search">
            <IcSearch size={13} />
            <input
              value={draft[filterField as keyof Filters]}
              onChange={(event) => patchDraft(filterField as keyof Filters, event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && apply()}
              placeholder="Значение фильтра"
            />
          </label>
        )}
        <button className="ev-apply" onClick={apply}>Применить</button>
        <button className="ev-cancel" onClick={reset}>Отменить</button>
      </div>

      <div className="ev-period">
        <strong>Время события</strong>
        <span>Между</span>
        <button onClick={() => setPeriod("day")}>Сегодня</button>
        <button onClick={() => setPeriod("week")}>Неделя</button>
        <button onClick={() => setPeriod("month")}>Месяц</button>
        <button onClick={() => setPeriod("year")}>Год</button>
        <label>От <input type="date" value={draft.from} onChange={(event) => patchDraft("from", event.target.value)} /></label>
        <label>До <input type="date" value={draft.to} onChange={(event) => patchDraft("to", event.target.value)} /></label>
      </div>

      {error && <div className="ev-error">{error}</div>}
      <div className="ev-grid-wrap">
        {loading ? <div className="ev-loader"><div className="toshi-loader" /></div> : (
          <table className="ev-grid">
            <thead>
              <tr>
                <th>Приоритет</th>
                <th>Последний раз</th>
                <th>Сообщение события</th>
                <th>Точка считывания</th>
                <th>Источник</th>
                <th>Тип источника</th>
                <th>Канал связи</th>
                <th>Кол-во</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.EV_ID}
                  className={selected?.EV_ID === row.EV_ID ? "selected" : ""}
                  onClick={() => setSelected(row)}
                  onDoubleClick={() => openDetail(row)}
                >
                  <td><span className={`ev-priority p-${String(row.EV_PRIORITY).toLowerCase()}`}>{row.EV_PRIORITY}</span></td>
                  <td>{dateTime(row.EV_LAST_TIME)}</td>
                  <td className="message">{row.EV_TEXT}</td>
                  <td>{row.EV_POINT_NAME || "—"}</td>
                  <td>{row.EV_SOURCE || "—"}</td>
                  <td>{row.EV_SOURCE_TYPE || "—"}</td>
                  <td>{row.EV_CHANNEL || "—"}</td>
                  <td>{row.EV_COUNT}</td>
                </tr>
              ))}
              {!rows.length && <tr><td className="ev-empty" colSpan={8}>Список пустой</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <div className="ev-footer">
        <button className="ev-page" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} aria-label="Назад">‹</button>
        <span>{pageStart}–{pageEnd} из {total}</span>
        <button className="ev-page" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} aria-label="Вперед">›</button>
        <span className="sp" />
        <button className="ev-detail-button" disabled={!selected} onClick={() => selected && openDetail(selected)}>Детализировать</button>
      </div>

      {detail && (
        <div className="ev-modal" role="dialog" aria-modal="true" aria-label="Детали события" onMouseDown={() => setDetail(null)}>
          <div className="ev-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <div className="ev-dialog__head"><span>Событие #{detail.EV_ID}</span><button onClick={() => setDetail(null)}>×</button></div>
            <dl className="ev-detail">
              <dt>Приоритет</dt><dd><span className={`ev-priority p-${String(detail.EV_PRIORITY).toLowerCase()}`}>{detail.EV_PRIORITY}</span></dd>
              <dt>Первый раз</dt><dd>{dateTime(detail.EV_TIME)}</dd>
              <dt>Последний раз</dt><dd>{dateTime(detail.EV_LAST_TIME)}</dd>
              <dt>Сообщение</dt><dd>{detail.EV_TEXT}</dd>
              <dt>Точка считывания</dt><dd>{detail.EV_POINT_NAME || "—"}</dd>
              <dt>Источник</dt><dd>{detail.EV_SOURCE || "—"}</dd>
              <dt>Тип источника</dt><dd>{detail.EV_SOURCE_TYPE || "—"}</dd>
              <dt>Канал связи</dt><dd>{detail.EV_CHANNEL || "—"}</dd>
              <dt>Количество</dt><dd>{detail.EV_COUNT}</dd>
              <dt>Подтверждено</dt><dd>{yesNo(detail.EV_ACKNOWLEDGED)}</dd>
            </dl>
            <div className="ev-dialog__actions"><button onClick={() => setDetail(null)}>Закрыть</button></div>
          </div>
        </div>
      )}

      {summary && (
        <div className="ev-modal" role="dialog" aria-modal="true" aria-label="Сводная событий" onMouseDown={() => setSummary(null)}>
          <div className="ev-dialog ev-dialog--summary" onMouseDown={(event) => event.stopPropagation()}>
            <div className="ev-dialog__head"><span>Сводная событий</span><button onClick={() => setSummary(null)}>×</button></div>
            <div className="ev-summary">
              <div><span>Всего</span><strong>{summary.TOTAL || 0}</strong></div>
              <div><span>Не подтверждено</span><strong>{summary.UNACKNOWLEDGED || 0}</strong></div>
              <div className="warn"><span>Предупреждения</span><strong>{summary.WARNINGS || 0}</strong></div>
              <div className="error"><span>Ошибки</span><strong>{summary.ERRORS || 0}</strong></div>
            </div>
            <div className="ev-summary__categories">
              {categories.slice(1).map((item, index) => <span key={item.id}>{item.label}<b>{summary.BY_CATEGORY?.[String(index + 1)] || 0}</b></span>)}
            </div>
            <div className="ev-dialog__actions"><button onClick={() => setSummary(null)}>Закрыть</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
