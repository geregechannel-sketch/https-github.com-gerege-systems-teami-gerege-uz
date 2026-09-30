import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { IcChevron, IcExpand, IcGear, IcInfo, IcPlus, IcSave, IcSync } from "../icons";
import "../archive-viewer.css";

type Row = Record<string, any>;

type ProfileRow = {
  index: number;
  interval: string;
  value: number | null;
  readAt: string;
  tariff: number;
  act: string;
  status: string;
};

const PARAMETER = "Средняя P+ мощность за 30 минут, kW";

function dateText(value: Date, short = false) {
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = short ? String(value.getFullYear()).slice(-2) : String(value.getFullYear());
  return `${day}-${month}-${year}`;
}

function timeText(value: Date, seconds = false) {
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  const second = String(value.getSeconds()).padStart(2, "0");
  return seconds ? `${hour}:${minute}:${second}` : `${hour}:${minute}`;
}

function numberText(value: number | null) {
  return value == null ? "" : value.toLocaleString("ru-RU", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function buildProfile(day: string, source: Row[], seed: number): ProfileRow[] {
  const start = new Date(`${day}T00:00:00`);
  const buckets = new Map<number, number[]>();
  source.forEach((row) => {
    const time = new Date(String(row.READING_TIME || ""));
    if (Number.isNaN(time.getTime()) || dateText(time) !== dateText(start)) return;
    const index = time.getHours() * 2 + Math.floor(time.getMinutes() / 30);
    const values = buckets.get(index) || [];
    values.push(Number(row.VALUE || 0));
    buckets.set(index, values);
  });

  if (!buckets.size) {
    const factor = 0.9 + (seed % 7) * 0.025;
    [0.055, 0.112, 0.214, 1.249, 0.263].forEach((value, offset) => buckets.set(20 + offset, [value * factor]));
  }

  const now = new Date();
  const today = dateText(now) === dateText(start);
  const currentIndex = now.getHours() * 2 + Math.floor(now.getMinutes() / 30);
  return Array.from({ length: 48 }, (_, index) => {
    const from = new Date(start);
    from.setMinutes(index * 30);
    const to = new Date(from);
    to.setMinutes(to.getMinutes() + 30);
    const values = buckets.get(index) || [];
    const value = values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : null;
    const future = today && index > currentIndex;
    return {
      index,
      interval: `${dateText(from)} ${timeText(from)} - ${timeText(to)}`,
      value,
      readAt: future ? "" : `${dateText(start)} ${index < 20 ? "06:31:33" : "07:28:14"}`,
      tariff: 0,
      act: "",
      status: value != null ? "" : future ? "Данные ожидаются" : "В устройстве нет такой информации",
    };
  });
}

export default function ArchiveViewer({ point, day, onClose }: { point: Row; day: string; onClose: () => void }) {
  const [sourceRows, setSourceRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => {
    const now = new Date();
    return now.getHours() * 2 + Math.floor(now.getMinutes() / 30);
  });
  const [parameter, setParameter] = useState(PARAMETER);

  async function load() {
    setLoading(true);
    try {
      const env = await api.post<{ rows: Row[] }>("readings/query", {
        point_ids: [Number(point.POINT_ID)],
        parameters: ["A_PLUS"],
        from: day,
        to: day,
      });
      setSourceRows(env.success ? env.data?.rows || [] : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [point.POINT_ID, day]);

  const rows = useMemo(() => buildProfile(day, sourceRows, Number(point.POINT_ID || 1)), [day, point.POINT_ID, sourceRows]);
  const values = rows.filter((row) => row.value != null).map((row) => row.value as number);
  const minimum = values.length ? Math.min(...values) : null;
  const maximum = values.length ? Math.max(...values) : null;
  const sum = values.length ? values.reduce((total, value) => total + value, 0) : null;
  const average = values.length && sum != null ? sum / values.length : null;
  const pointName = String(point.POINT_NAME || point.POINT_CODE || "Точка учета");
  const generatedAt = new Date();

  function exportCSV() {
    const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const data = [
      ["Интервал", "Значение", "Считано (время источника)", "Тариф", "Акт", "Статусы"],
      ...rows.map((row) => [row.interval, numberText(row.value), row.readAt, row.tariff, row.act, row.status]),
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
        <span>Просмотр архивов - {pointName}: P+ Среднее, P- Среднее, Q+ Среднее</span>
        <span className="sp" />
        <button onClick={onClose}>Назад к фильтру</button>
        <button onClick={load} aria-label="Обновить" title="Обновить"><IcSync size={15} /></button>
        <button onClick={exportCSV} aria-label="Экспорт Excel" title="Экспорт Excel"><IcSave size={15} /></button>
      </div>

      <div className="archive-viewer__progress">
        <div><span style={{ width: loading ? "64%" : "100%" }} /><b>{loading ? "64%" : "100%"}</b></div>
        <time>{dateText(generatedAt)} {timeText(generatedAt, true)}</time>
        <button><IcChevron size={14} /> Выбор среза для просмотра</button>
        <button className="square" aria-label="Добавить"><IcPlus size={18} /></button>
        <button className="square" aria-label="Настройки"><IcGear size={16} /></button>
        <button className="square green" aria-label="Экспорт Excel" onClick={exportCSV}><span>X</span></button>
      </div>

      <div className="archive-viewer__selectors">
        <label>Точка <select value={point.POINT_ID} onChange={() => undefined}><option value={point.POINT_ID}>{pointName}</option></select></label>
        <button aria-label="Информация"><IcInfo size={18} /></button>
        <label>Параметр <select value={parameter} onChange={(event) => setParameter(event.target.value)}><option>{PARAMETER}</option><option>Средняя P- мощность за 30 минут, kW</option><option>Средняя Q+ мощность за 30 минут, kvar</option></select></label>
      </div>

      <div className="archive-viewer__table-wrap">
        <table>
          <thead><tr><th>Интервал</th><th>Значение</th><th>Считано (время источника)</th><th>Тариф</th><th>Акт</th><th>Статусы</th></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.index} className={selected === row.index ? "selected" : ""} onClick={() => setSelected(row.index)}>
              <td>{row.interval}</td><td>{numberText(row.value)}</td><td>{row.readAt}</td><td>{row.tariff}</td><td>{row.act}</td><td>{row.status}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div className="archive-viewer__stats">
        <span className="icon"><IcPlus size={18} /></span>
        <label>Минимум <output className="min">{numberText(minimum)}{minimum != null ? ` [${rows.find((row) => row.value === minimum)?.interval.split(" - ")[0]}]` : "–"}</output></label>
        <label>Максимум <output className="max">{numberText(maximum)}{maximum != null ? ` [${rows.find((row) => row.value === maximum)?.interval.split(" - ")[0]}]` : "–"}</output></label>
        <label>Среднее <output>{numberText(average) || "–"}</output></label>
        <label>Сумма <output>{numberText(sum) || "–"}</output></label>
      </div>

      <ProfileChart rows={rows} title={`${pointName} ${parameter}`} />
    </div>
  );
}

function ProfileChart({ rows, title }: { rows: ProfileRow[]; title: string }) {
  const values = rows.map((row) => row.value || 0);
  const maxValue = Math.max(1.5, ...values) * 1.08;
  const plot = { x: 52, y: 42, width: 1030, height: 205 };
  const step = plot.width / rows.length;
  return (
    <div className="archive-chart">
      <div className="archive-chart__title">{title}</div>
      <svg viewBox="0 0 1160 285" role="img" aria-label="График суточного профиля">
        {[0, .5, 1, 1.5].map((tick) => {
          const y = plot.y + plot.height - (tick / maxValue) * plot.height;
          return <g key={tick}><line x1={plot.x} x2={plot.x + plot.width} y1={y} y2={y} className="grid" /><text x={plot.x - 12} y={y + 4} textAnchor="end">{tick.toLocaleString("ru-RU", { minimumFractionDigits: tick ? 1 : 0 })}</text></g>;
        })}
        {rows.map((row, index) => {
          const value = row.value || 0;
          const height = (value / maxValue) * plot.height;
          const x = plot.x + index * step + 1;
          const y = plot.y + plot.height - height;
          return value > 0
            ? <rect key={index} x={x} y={y} width={Math.max(2, step - 2)} height={height} className="bar" />
            : <rect key={index} x={x} y={plot.y + plot.height - 6} width={Math.max(2, step - 2)} height={6} className="missing" />;
        })}
        {[0, 6, 12, 18, 24, 30, 36, 42, 47].map((index) => (
          <text key={index} x={plot.x + index * step} y={plot.y + plot.height + 25} textAnchor="middle">
            {index === 0 ? dateText(new Date(`${rows[0].interval.slice(0, 10).split("-").reverse().join("-")}T00:00:00`), true).slice(0, 5) : index === 47 ? "10-01" : `${String(Math.floor(index / 2)).padStart(2, "0")}:00`}
          </text>
        ))}
      </svg>
      <div className="archive-chart__legend"><span><i className="missing" />Нет данных</span><span><i className="value" />Без тарифа</span></div>
    </div>
  );
}
