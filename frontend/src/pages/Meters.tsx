import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { IcExpand, IcInfo, IcPlus, IcSave, IcSearch, IcSync } from "../icons";
import "../meter-registry.css";

type Row = Record<string, any>;
type Catalog = {
  types: Row[];
  summary: { TOTAL: number; MOUNTED: number; UNMOUNTED: number; TYPE_COUNT: number };
};

const PAGE_SIZE = 25;
const EMPTY_FORM: Row = {
  METER_ID: null,
  METER_NUMBER: "",
  METER_TYPE_ID: "",
  METER_CLASS: "",
  MADE: "",
  EXPL_START: "",
};

function dateInput(value: unknown) {
  return value ? String(value).slice(0, 10) : "";
}

function displayDate(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("ru-RU");
}

function apiMessage(message: string | undefined) {
  const known: Record<string, string> = {
    "meter number already exists": "Счетчик с таким заводским номером уже существует",
    "meter has mounting history": "Нельзя удалить счетчик с историей монтажа",
    "meter save failed": "Не удалось сохранить счетчик. Проверьте даты и обязательные поля",
  };
  return known[String(message)] || message || "Операция не выполнена";
}

export default function Meters() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState(initialSearch);
  const [meterTypeID, setMeterTypeID] = useState("");
  const [mountState, setMountState] = useState("");
  const [filters, setFilters] = useState({ search: initialSearch, meterTypeID: "", mountState: "" });
  const [selectedID, setSelectedID] = useState<number | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCatalog = useCallback(async () => {
    const env = await api.get<Catalog>("meterregistry/catalog");
    if (env.success && env.data) setCatalog(env.data);
    else setError(apiMessage(env.message));
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    const env = await api.post<Row[]>("meterregistry/query", {
      search: filters.search,
      meter_type_id: filters.meterTypeID ? Number(filters.meterTypeID) : null,
      mount_state: filters.mountState,
      limit: PAGE_SIZE,
      offset,
    });
    setLoading(false);
    if (!env.success) {
      setRows([]);
      setTotal(0);
      setError(apiMessage(env.message));
      return;
    }
    const data = env.data || [];
    setRows(data);
    setTotal(env.totalCount ?? data.length);
    setSelectedID((current) => data.some((row) => Number(row.METER_ID) === current) ? current : null);
  }, [filters, offset]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const selected = useMemo(() => rows.find((row) => Number(row.METER_ID) === selectedID) || null, [rows, selectedID]);
  const selectedType = catalog?.types.find((type) => Number(type.METER_TYPE_ID) === Number(editing?.METER_TYPE_ID));

  function applyFilters() {
    setOffset(0);
    setFilters({ search: search.trim(), meterTypeID, mountState });
  }

  function resetFilters() {
    setSearch("");
    setMeterTypeID("");
    setMountState("");
    setOffset(0);
    setFilters({ search: "", meterTypeID: "", mountState: "" });
  }

  function openNew() {
    setEditing({ ...EMPTY_FORM });
  }

  function openEdit() {
    if (!selected) return;
    setEditing({
      ...EMPTY_FORM,
      ...selected,
      MADE: dateInput(selected.MADE),
      EXPL_START: dateInput(selected.EXPL_START),
    });
  }

  async function save() {
    if (!editing) return;
    if (!String(editing.METER_NUMBER).trim() || !editing.METER_TYPE_ID) {
      setError("Заполните заводской номер и тип счетчика");
      return;
    }
    setSaving(true);
    setError("");
    const env = await api.post<Row>("meterregistry/save", {
      meter_id: editing.METER_ID ? Number(editing.METER_ID) : null,
      meter_type_id: Number(editing.METER_TYPE_ID),
      meter_number: String(editing.METER_NUMBER).trim(),
      made: dateInput(editing.MADE),
      expl_start: dateInput(editing.EXPL_START),
      meter_class: String(editing.METER_CLASS || "").trim(),
    });
    setSaving(false);
    if (!env.success) {
      setError(apiMessage(env.message));
      return;
    }
    setEditing(null);
    setNotice(editing.METER_ID ? "Счетчик обновлен" : "Счетчик добавлен");
    await Promise.all([loadRows(), loadCatalog()]);
  }

  async function remove() {
    if (!selected || !window.confirm(`Удалить счетчик ${selected.METER_NUMBER}?`)) return;
    const env = await api.del(`meterregistry/${selected.METER_ID}`);
    if (!env.success) {
      setError(apiMessage(env.message));
      return;
    }
    setSelectedID(null);
    setNotice("Счетчик удален");
    await Promise.all([loadRows(), loadCatalog()]);
  }

  function exportCSV() {
    const columns = ["METER_NUMBER", "METER_TYPE_NAME", "METER_TYPE_PRODUCER", "METER_CLASS", "MADE", "EXPL_START", "POINT_CODE", "POINT_NAME", "MOU_BT"];
    const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const content = [columns.join(";"), ...rows.map((row) => columns.map((column) => quote(row[column])).join(";"))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "meters.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const setField = (key: string, value: unknown) => setEditing((current) => current ? { ...current, [key]: value } : current);

  return <div className="mr">
    <header className="mr-title">
      <IcExpand size={14} />
      <span>Конфигурация системы - Классификаторы и списки - Счетчики</span>
      <span className="sp" />
      <button title="Обновить" onClick={() => Promise.all([loadRows(), loadCatalog()])}><IcSync size={16} /></button>
    </header>

    {error && <div className="mr-message error">{error}<button onClick={() => setError("")}>×</button></div>}
    {notice && <div className="mr-message success">{notice}<button onClick={() => setNotice("")}>×</button></div>}

    <section className="mr-summary" aria-label="Сводка по счетчикам">
      <div><span>Всего счетчиков</span><strong>{catalog?.summary.TOTAL ?? "—"}</strong></div>
      <div><span>Установлено</span><strong className="green">{catalog?.summary.MOUNTED ?? "—"}</strong></div>
      <div><span>На складе</span><strong className="blue">{catalog?.summary.UNMOUNTED ?? "—"}</strong></div>
      <div><span>Типов счетчиков</span><strong>{catalog?.summary.TYPE_COUNT ?? "—"}</strong></div>
    </section>

    <section className="mr-filter">
      <label className="mr-search"><IcSearch size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && applyFilters()} placeholder="Заводской номер, тип, производитель или точка" /></label>
      <label><span>Тип счетчика</span><select value={meterTypeID} onChange={(event) => setMeterTypeID(event.target.value)}><option value="">Все типы</option>{catalog?.types.map((type) => <option key={type.METER_TYPE_ID} value={type.METER_TYPE_ID}>{type.METER_TYPE_NAME}</option>)}</select></label>
      <label><span>Монтаж</span><select value={mountState} onChange={(event) => setMountState(event.target.value)}><option value="">Все состояния</option><option value="MOUNTED">Установлен</option><option value="UNMOUNTED">Не установлен</option></select></label>
      <button className="blue" onClick={applyFilters}>Применить</button>
      <button onClick={resetFilters}>Сбросить</button>
    </section>

    <div className="mr-workspace">
      <section className="mr-list">
        <div className="mr-pane-head"><span>Список счетчиков</span><span>{total} записей</span></div>
        <div className="mr-table-wrap">
          <table>
            <thead><tr><th>Заводской номер</th><th>Тип счетчика</th><th>Производитель</th><th>Класс точности</th><th>Дата выпуска</th><th>В эксплуатации с</th><th>Статус монтажа</th><th>Точка учета</th><th>Дата монтажа</th></tr></thead>
            <tbody>
              {rows.map((row) => <tr key={row.METER_ID} className={Number(row.METER_ID) === selectedID ? "selected" : ""} onClick={() => setSelectedID(Number(row.METER_ID))} onDoubleClick={() => { setSelectedID(Number(row.METER_ID)); setEditing({ ...EMPTY_FORM, ...row, MADE: dateInput(row.MADE), EXPL_START: dateInput(row.EXPL_START) }); }}>
                <td><strong>{row.METER_NUMBER}</strong></td><td>{row.METER_TYPE_NAME || "—"}</td><td>{row.METER_TYPE_PRODUCER || "—"}</td><td>{row.METER_CLASS || "—"}</td><td>{displayDate(row.MADE)}</td><td>{displayDate(row.EXPL_START)}</td><td><span className={`mr-status ${row.MOUNTED ? "mounted" : "stock"}`}>{row.MOUNTED ? "Установлен" : "Не установлен"}</span></td><td>{row.POINT_CODE ? `${row.POINT_CODE} · ${row.POINT_NAME}` : "—"}</td><td>{displayDate(row.MOU_BT)}</td>
              </tr>)}
              {!loading && !rows.length && <tr><td colSpan={9} className="mr-empty">Список пустой</td></tr>}
            </tbody>
          </table>
          {loading && <div className="mr-loading"><div className="toshi-loader" /></div>}
        </div>
        <footer className="mr-pager"><button disabled={!offset} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>‹ Назад</button><span>{total ? `${offset + 1}-${Math.min(offset + PAGE_SIZE, total)} / ${total}` : "0 / 0"}</span><button disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>Вперед ›</button></footer>
      </section>

      <aside className="mr-detail">
        <div className="mr-pane-head"><span>Свойства счетчика</span><IcInfo size={15} /></div>
        {selected ? <dl>
          <div><dt>Заводской номер</dt><dd>{selected.METER_NUMBER}</dd></div>
          <div><dt>Тип</dt><dd>{selected.METER_TYPE_NAME || "—"}</dd></div>
          <div><dt>Производитель</dt><dd>{selected.METER_TYPE_PRODUCER || "—"}</dd></div>
          <div><dt>Класс точности</dt><dd>{selected.METER_CLASS || "—"}</dd></div>
          <div><dt>Дата выпуска</dt><dd>{displayDate(selected.MADE)}</dd></div>
          <div><dt>Начало эксплуатации</dt><dd>{displayDate(selected.EXPL_START)}</dd></div>
          <div><dt>Текущий монтаж</dt><dd>{selected.MOUNTED ? `${selected.POINT_CODE} · ${selected.POINT_NAME}` : "Не установлен"}</dd></div>
        </dl> : <div className="mr-detail-empty">Выберите счетчик в списке</div>}
      </aside>
    </div>

    <footer className="mr-actions">
      <button className="green" onClick={openNew}><IcPlus size={16} /> Новый счетчик</button>
      <button className="blue" disabled={!selected} onClick={openEdit}>Редактировать</button>
      <button className="red" disabled={!selected} onClick={remove}>Удалить</button>
      <span className="sp" />
      <button disabled={!rows.length} onClick={exportCSV}><IcSave size={16} /> Excel / CSV</button>
    </footer>

    {editing && <div className="mr-modal" role="dialog" aria-modal="true" aria-label={editing.METER_ID ? "Редактировать счетчик" : "Новый счетчик"}>
      <div className="mr-dialog">
        <header><span>{editing.METER_ID ? "Редактировать счетчик" : "Новый счетчик"}</span><button aria-label="Закрыть" onClick={() => setEditing(null)}>×</button></header>
        <div className="mr-form">
          <label><span>Заводской номер *</span><input autoFocus value={editing.METER_NUMBER || ""} onChange={(event) => setField("METER_NUMBER", event.target.value)} /></label>
          <label><span>Тип счетчика *</span><select value={editing.METER_TYPE_ID || ""} onChange={(event) => setField("METER_TYPE_ID", event.target.value)}><option value="">Выберите тип</option>{catalog?.types.map((type) => <option key={type.METER_TYPE_ID} value={type.METER_TYPE_ID}>{type.METER_TYPE_NAME}</option>)}</select></label>
          <label><span>Производитель</span><input value={selectedType?.METER_TYPE_PRODUCER || ""} readOnly /></label>
          <label><span>Класс точности</span><input value={editing.METER_CLASS || ""} onChange={(event) => setField("METER_CLASS", event.target.value)} placeholder="Например, 0.5S" /></label>
          <label><span>Дата выпуска</span><input type="date" value={dateInput(editing.MADE)} onChange={(event) => setField("MADE", event.target.value)} /></label>
          <label><span>Начало эксплуатации</span><input type="date" value={dateInput(editing.EXPL_START)} onChange={(event) => setField("EXPL_START", event.target.value)} /></label>
        </div>
        <footer><button onClick={() => setEditing(null)}>Отмена</button><button className="green" disabled={saving} onClick={save}><IcSave size={15} /> {saving ? "Сохранение..." : "Сохранить"}</button></footer>
      </div>
    </div>}
  </div>;
}
