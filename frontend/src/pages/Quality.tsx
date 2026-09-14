import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { calendarRange, dateInUTC8, summarizeIntervals } from "../lib/archiveQuality";

type Row = Record<string, any>;
const displayTime = (n: number) => new Date(n).toLocaleString("ru-RU", { timeZone: "Asia/Choibalsan" });
const minutes = (n: number) => (n / 60000).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
const colors = { data: "#2563eb", gap: "#b45309", future: "#9ca3af" };
const labels = { data: "Интервал представлен", gap: "Интервал не представлен", future: "Будущее время" };

export default function Quality() {
  const [points, setPoints] = useState<Row[]>([]), [pointTotal, setPointTotal] = useState(0);
  const [point, setPoint] = useState(""), [params, setParams] = useState<Row[]>([]), [param, setParam] = useState("");
  const [from, setFrom] = useState(dateInUTC8()), [to, setTo] = useState(dateInUTC8());
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [result, setResult] = useState<{ rows: Row[]; begin: number; end: number; checked: number } | null>(null);
  const request = useRef(0);
  const clear = () => { ++request.current; setResult(null); setBusy(false); setNotice(""); };
  useEffect(() => {
    let active = true;
    api.get("points?limit=1000").then(e => {
      if (!active) return;
      if (!e.success || !Array.isArray(e.data)) throw new Error();
      setPoints(e.data); setPointTotal(e.totalCount ?? e.data.length);
    }).catch(() => { if (active) setNotice("Не удалось загрузить точки учета"); });
    return () => { active = false; ++request.current; };
  }, []);
  useEffect(() => {
    let active = true;
    setParams([]); setParam("");
    if (point) {
      setNotice("Загрузка параметров…");
      api.get("measurementsarchives?POINT_ID=" + encodeURIComponent(point)).then(e => {
        if (!active) return;
        if (!e.success || !Array.isArray(e.data)) throw new Error();
        const values = e.data.filter((r: Row) => [r.ML_ID, r.MD_ID, r.AGGS_ID].every(x => x != null));
        setParams(values);
        setNotice(values.length ? "Выберите параметр" : "Нет локальных архивных данных для этой точки");
      }).catch(() => { if (active) setNotice("Не удалось получить параметры архива"); });
    }
    return () => { active = false; };
  }, [point]);
  async function load() {
    const p = params[Number(param)];
    if (!point || param === "" || !p) return;
    let range: ReturnType<typeof calendarRange>;
    try { range = calendarRange(from, to); } catch (e) { setNotice((e as Error).message); return; }
    const id = ++request.current;
    setBusy(true); setResult(null); setNotice("Загрузка…");
    try {
      // Include intervals crossing the lower bound for accurate coverage.
      const e = await api.post("archives/point", { POINT_ID: Number(point), ML_ID: p.ML_ID, MD_ID: p.MD_ID, AGGS_ID: p.AGGS_ID, FROM: range.begin, TO: range.end, INCLUDE_OVERLAP: true });
      if (id !== request.current) return;
      if (!e.success || !Array.isArray(e.data)) { setNotice(e.message || "Архив недоступен"); return; }
      setResult({ rows: e.data, begin: Date.parse(range.begin), end: Date.parse(range.end), checked: Date.now() });
      setNotice(e.data.length ? "" : "В локальном архиве нет строк за выбранный период");
    } catch { if (id === request.current) setNotice("Ошибка связи при чтении архива"); }
    finally { if (id === request.current) setBusy(false); }
  }
  const quality = useMemo(() => result ? summarizeIntervals(result.rows, result.begin, result.end, result.checked) : null, [result]);
  return <div>
    <h2>Качество показаний</h2>
    <p>Покрытие локального архива. Наличие интервала не подтверждает достоверность показания или связь с TEAMI.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end" }}>
      <label>Точка учета<br /><select className="toshi-select" value={point} onChange={e => { clear(); setPoint(e.target.value); setParam(""); setParams([]); }}>
        <option value="">Выберите точку</option>{points.map(p => <option key={p.POINT_ID} value={p.POINT_ID}>{p.POINT_NAME || p.POINT_CODE || p.POINT_ID}</option>)}
      </select></label>
      <label>Параметр<br /><select className="toshi-select" value={param} onChange={e => { clear(); setParam(e.target.value); }}>
        <option value="">Выберите параметр</option>{params.map((p, i) => <option key={i} value={i}>{p.ML_NAME || `ML ${p.ML_ID}`} / MD {p.MD_ID} / AGGS {p.AGGS_ID}</option>)}
      </select></label>
      <label>Начало (UTC+08)<br /><input type="date" value={from} onChange={e => { clear(); setFrom(e.target.value); }} /></label>
      <label>Конец (включительно)<br /><input type="date" value={to} onChange={e => { clear(); setTo(e.target.value); }} /></label>
      <button className="toshi-btn toshi-btn--blue" disabled={!point || param === "" || busy} onClick={load}>{busy ? "Загрузка…" : "Показать"}</button>
    </div>
    {points.length < pointTotal && <p>Загружено точек: {points.length} из {pointTotal}. Список неполный.</p>}
    <p role="status" aria-live="polite">{notice}</p>
    {result && quality && <>
      <p>Получено строк: <b>{result.rows.length}</b> · Перекрытий: <b>{quality.overlaps}</b> · Некорректных интервалов: <b>{quality.invalid}</b></p>
      <p>Покрыто: {minutes(quality.covered)} из {minutes(quality.elapsed)} прошедших минут. Будущее время: {minutes(quality.future)} минут. Проверено: {displayTime(result.checked)} (UTC+08).</p>
      <p>Непредставленный интервал означает отсутствие покрытия в локальном наборе; причина и ожидаемая частота поступления не определены.</p>
      <div aria-label="Покрытие интервалов" style={{ display: "flex", height: 30, width: "100%", marginBottom: 12 }}>
        {quality.segments.map((s, i) => <div key={i} title={`${labels[s.kind]}: ${displayTime(s.from)} — ${displayTime(s.to)}`} style={{ width: `${100 * (s.to - s.from) / (result.end - result.begin)}%`, background: colors[s.kind] }} />)}
      </div>
      <p>{Object.entries(labels).map(([k, label]) => <span key={k} style={{ marginRight: 20 }}><span style={{ color: colors[k as keyof typeof colors] }}>■</span> {label}</span>)}</p>
      <h3>Исходные статусы</h3>
      <table className="toshi-grid"><thead><tr><th>Статус источника (без интерпретации)</th><th>Строк</th></tr></thead><tbody>{Object.entries(quality.statuses).map(([s, count]) => <tr key={s}><td>{s}</td><td>{count}</td></tr>)}</tbody></table>
      <h3>Интервалы покрытия</h3>
      {quality.segments.length > 500 && <p>Показаны первые 500 из {quality.segments.length} интервалов; итоги рассчитаны по всему ответу.</p>}
      <table className="toshi-grid"><thead><tr><th>Начало UTC+08</th><th>Конец UTC+08</th><th>Состояние</th></tr></thead><tbody>{quality.segments.slice(0, 500).map((s, i) => <tr key={i}><td>{displayTime(s.from)}</td><td>{displayTime(s.to)}</td><td>{labels[s.kind]}</td></tr>)}</tbody></table>
    </>}
  </div>;
}
