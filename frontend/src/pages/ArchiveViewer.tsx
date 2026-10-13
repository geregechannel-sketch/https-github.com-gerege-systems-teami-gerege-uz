import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { IcChevron, IcExpand, IcGear, IcInfo, IcPlus, IcSave, IcSync } from "../icons";
import "../archive-viewer.css";
import { calendarRange } from "../lib/archiveQuality";
import { archiveProfileRows, archiveSeriesKey, archiveTime, selectArchiveSeries, type ArchiveProfileRow as ProfileRow } from "../lib/archiveProfile";

type Row = Record<string, any>;

function numberText(value: number | null) {
  return value == null ? "" : value.toLocaleString("ru-RU", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export default function ArchiveViewer({ point, day, initialSeries, onClose }: { point: Row; day: string; initialSeries?: Row; onClose: () => void }) {
  const [sourceRows, setSourceRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(-1);
  const [parameters, setParameters] = useState<Row[]>([]);
  const [parameter, setParameter] = useState("");
  const [error, setError] = useState("");
  const requestID = useRef(0);
  const initialKey = initialSeries ? archiveSeriesKey(initialSeries) : "";
  const series = parameters.find((item) => archiveSeriesKey(item) === parameter);
  const unit = String(sourceRows[0]?.UNIT || "");
  const parameterLabel = series ? `ML ${series.ML_ID}, MD ${series.MD_ID}, AGGS ${series.AGGS_ID}${unit ? `, ${unit}` : ""}` : "Нет параметров архива";

  useEffect(() => {
    let active = true;
    ++requestID.current;
    setParameters([]); setParameter(""); setSourceRows([]); setError(""); setLoading(true);
    api.get<Row[]>(`measurementsarchives?POINT_ID=${encodeURIComponent(point.POINT_ID)}`).then((env) => {
      if (!active) return;
      if (!env.success || !Array.isArray(env.data)) throw new Error(env.message || "Не удалось получить параметры архива");
      const valid = env.data.filter((item) => archiveSeriesKey(item));
      const selectedKey = selectArchiveSeries(valid, initialKey);
      setParameters(valid);
      setParameter(selectedKey);
      if (!selectedKey) {
        if (initialKey && valid.length) setError("Выбранный параметр отсутствует в архиве");
        setLoading(false);
      }
    }).catch((err) => { if (active) { setError(err.message); setLoading(false); } });
    return () => { active = false; ++requestID.current; };
  }, [point.POINT_ID, initialKey]);

  async function load() {
    if (!series) return;
    const current = ++requestID.current;
    setLoading(true);
    setSourceRows([]); setError("");
    try {
      const range = calendarRange(day, day);
      const env = await api.post<Row[]>("archives/point", {
        POINT_ID: Number(point.POINT_ID), ML_ID: series.ML_ID, MD_ID: series.MD_ID, AGGS_ID: series.AGGS_ID,
        FROM: range.begin, TO: range.end,
      });
      if (current !== requestID.current) return;
      if (!env.success || !Array.isArray(env.data)) throw new Error(env.message || "Архив недоступен");
      setSourceRows(env.data);
    } catch (err: any) {
      if (current === requestID.current) setError(err.message || "Архив недоступен");
    } finally {
      if (current === requestID.current) setLoading(false);
    }
  }

  useEffect(() => { void load(); return () => { ++requestID.current; }; }, [point.POINT_ID, day, parameter]);

  const rows = useMemo(() => archiveProfileRows(sourceRows), [sourceRows]);
  const values = rows.filter((row) => row.value != null).map((row) => row.value as number);
  const minimum = values.length ? Math.min(...values) : null;
  const maximum = values.length ? Math.max(...values) : null;
  const sum = values.length ? values.reduce((total, value) => total + value, 0) : null;
  const average = values.length && sum != null ? sum / values.length : null;
  const pointName = String(point.POINT_NAME || point.POINT_CODE || "Точка учета");
  const generatedAt = archiveTime(new Date().toISOString());

  function exportCSV() {
    const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const data = [
      ["Интервал", "Значение", "Считано (время источника)", "Тариф", "Акт", "Статусы"],
      ...rows.map((row) => [row.interval, row.valueText, row.readAt, row.tariff, row.act, row.status]),
    ];
    const csv = `\uFEFF${data.map((row) => row.map(quote).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${point.POINT_CODE || "archive"}-${day}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="archive-viewer">
      <div className="archive-viewer__title">
        <IcExpand size={14} />
        <span>Просмотр архивов - {pointName}: {parameterLabel}</span>
        <span className="sp" />
        <button onClick={onClose}>Назад к фильтру</button>
        <button onClick={load} disabled={loading || !series} aria-label="Обновить" title="Обновить"><IcSync size={15} /></button>
        <button onClick={exportCSV} disabled={loading || !rows.length} aria-label="Экспорт CSV" title="Экспорт CSV"><IcSave size={15} /></button>
      </div>

      <div className="archive-viewer__progress">
        <div><span style={{ width: loading || error ? "0%" : "100%" }} /><b>{loading ? "Загрузка..." : error ? "Ошибка" : "100%"}</b></div>
        <time>{generatedAt}</time>
        <button onClick={onClose}><IcChevron size={14} /> Выбор среза для просмотра</button>
        <button className="square" disabled aria-label="Добавить" title="Дополнительные серии не настроены"><IcPlus size={18} /></button>
        <button className="square" disabled aria-label="Настройки"><IcGear size={16} /></button>
        <button className="square green" aria-label="Экспорт CSV" disabled={loading || !rows.length} onClick={exportCSV}><span>X</span></button>
      </div>

      <div className="archive-viewer__selectors">
        <label>Точка <select value={point.POINT_ID} disabled><option value={point.POINT_ID}>{pointName}</option></select></label>
        <button aria-label="Информация"><IcInfo size={18} /></button>
        <label>Параметр <select value={parameter} disabled={!parameters.length} onChange={(event) => setParameter(event.target.value)}>{!parameter && <option value="">{parameters.length ? "Выберите параметр архива" : "Нет параметров архива"}</option>}{parameters.map((item) => <option key={archiveSeriesKey(item)} value={archiveSeriesKey(item)}>ML {item.ML_ID}, MD {item.MD_ID}, AGGS {item.AGGS_ID}</option>)}</select></label>
      </div>

      <div className="archive-viewer__table-wrap">
        <table>
          <thead><tr><th>Интервал</th><th>Значение</th><th>Считано (время источника)</th><th>Тариф</th><th>Акт</th><th>Статусы</th></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.index} className={selected === row.index ? "selected" : ""} onClick={() => setSelected(row.index)}>
              <td>{row.interval}</td><td>{row.valueText}</td><td>{row.readAt}</td><td>{row.tariff}</td><td>{row.act}</td><td>{row.status}</td>
            </tr>
          ))}{!rows.length && <tr><td colSpan={6} role={error ? "alert" : undefined}>{error || (loading ? "Загрузка..." : "Нет данных в локальном архиве")}</td></tr>}</tbody>
        </table>
      </div>

      <div className="archive-viewer__stats">
        <span className="icon"><IcPlus size={18} /></span>
        <label>Минимум <output className="min">{numberText(minimum)}{minimum != null ? ` [${rows.find((row) => row.value === minimum)?.interval.split(" - ")[0]}]` : "–"}</output></label>
        <label>Максимум <output className="max">{numberText(maximum)}{maximum != null ? ` [${rows.find((row) => row.value === maximum)?.interval.split(" - ")[0]}]` : "–"}</output></label>
        <label>Среднее <output>{numberText(average) || "–"}</output></label>
        <label>Сумма значений <output>{numberText(sum) || "–"}</output></label>
      </div>

      <ProfileChart rows={rows} title={`${pointName} ${parameterLabel}`} />
    </div>
  );
}

function ProfileChart({ rows, title }: { rows: ProfileRow[]; title: string }) {
  if (!rows.length) return <div className="archive-chart"><div className="archive-chart__title">{title}</div><p>Нет данных</p></div>;
  const values = rows.map((row) => row.value || 0);
  const minimum = Math.min(0, ...values);
  const maxValue = Math.max(1, ...values) * 1.08;
  const span = maxValue - minimum;
  const plot = { x: 52, y: 42, width: 1030, height: 205 };
  const step = plot.width / rows.length;
  return (
    <div className="archive-chart">
      <div className="archive-chart__title">{title}</div>
      <svg viewBox="0 0 1160 285" role="img" aria-label="График суточного профиля">
        {[0, 1, 2, 3].map((position) => {
          const tick = minimum + span * position / 3;
          const y = plot.y + plot.height - ((tick - minimum) / span) * plot.height;
          return <g key={tick}><line x1={plot.x} x2={plot.x + plot.width} y1={y} y2={y} className="grid" /><text x={plot.x - 12} y={y + 4} textAnchor="end">{tick.toLocaleString("ru-RU", { minimumFractionDigits: tick ? 1 : 0 })}</text></g>;
        })}
        {rows.map((row, index) => {
          const value = row.value || 0;
          const height = Math.abs(value / span) * plot.height;
          const x = plot.x + index * step + 1;
          const zero = plot.y + plot.height - ((0 - minimum) / span) * plot.height;
          const y = value >= 0 ? zero - height : zero;
          return row.value != null
            ? <rect key={index} x={x} y={y} width={Math.max(1, step - 2)} height={Math.max(1, height)} className="bar" />
            : <rect key={index} x={x} y={plot.y + plot.height - 6} width={Math.max(2, step - 2)} height={6} className="missing" />;
        })}
        {Array.from(new Set(Array.from({length: Math.min(9, rows.length)}, (_, position) => Math.round(position * (rows.length - 1) / Math.max(1, Math.min(9, rows.length) - 1))))).map((index) => (
          <text key={index} x={plot.x + index * step} y={plot.y + plot.height + 25} textAnchor="middle">
            {rows[index].interval.slice(11, 16)}
          </text>
        ))}
      </svg>
      <div className="archive-chart__legend"><span><i className="missing" />Нет данных</span><span><i className="value" />Значение</span></div>
    </div>
  );
}
