import { useEffect, useMemo, useState } from "react";
import { api, setToken } from "../api";
import logo from "../assets/logo.png";
import "../monitor.css";

interface LiveRow {
  POINT_ID: number;
  POINT_CODE: string;
  POINT_NAME: string;
  POINT_TYPE: string;
  METER_NUMBER: string;
  METER_TYPE: string;
  PARAMETER_CODE: string;
  VALUE: number;
  UNIT: string;
  SOURCE: string;
  TIME: string;
}
interface Param {
  code: string;
  name: string;
  unit: string;
}
interface LiveData {
  now: string;
  parameters: Param[];
  meter_types: string[];
  point_types: string[];
  live: LiveRow[];
  trend: { TIME: string; PARAMETER_CODE: string; VALUE: number }[];
}
interface PointView {
  id: number;
  code: string;
  name: string;
  pointType: string;
  meter: string;
  meterType: string;
  source: string;
  last: number;
  values: Record<string, number>;
}

const POLL_MS = 5000;
const STALE_S = 60;
const SHORT: Record<string, string> = {
  A_PLUS: "A+", A_MINUS: "A−", R_PLUS: "R+", R_MINUS: "R−",
  VOLTAGE: "U", CURRENT: "I", POWER_FACTOR: "cos φ", FREQUENCY: "f",
};
const NO_METER = "Без счётчика";

// Out-of-range limits (ГОСТ 32144: U ±5 %, f ±0.2 Гц; cos φ below 0.9).
function alarm(code: string, v: number): boolean {
  if (code === "VOLTAGE") return v < 209 || v > 231;
  if (code === "FREQUENCY") return v < 49.8 || v > 50.2;
  if (code === "POWER_FACTOR") return v < 0.9;
  return false;
}

function fmt(v: number | undefined): string {
  if (v === undefined) return "—";
  return Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(v < 1 ? 3 : 2);
}

function Spark({ points }: { points: number[] }) {
  if (points.length < 2) return <svg className="mon-spark" />;
  const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const d = points
    .map((v, i) => `${((i / (points.length - 1)) * 100).toFixed(1)},${(28 - ((v - min) / span) * 26).toFixed(1)}`)
    .join(" ");
  return (
    <svg className="mon-spark" viewBox="0 0 100 30" preserveAspectRatio="none">
      <polyline points={d} />
    </svg>
  );
}

export default function Monitor() {
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState("");
  const [meterType, setMeterType] = useState("");
  const [pointType, setPointType] = useState("");
  const [search, setSearch] = useState("");
  const [alarmsOnly, setAlarmsOnly] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const env = await api.get<LiveData>("monitor/live");
      if (!alive) return;
      if (env.success && env.data) {
        setData(env.data);
        setError("");
      } else setError(env.message || "Нет связи с сервером");
    };
    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const now = data ? new Date(data.now).getTime() : Date.now();
  const params = data?.parameters ?? [];

  const points = useMemo(() => {
    const byId = new Map<number, PointView>();
    for (const r of data?.live ?? []) {
      let p = byId.get(r.POINT_ID);
      if (!p) {
        p = {
          id: r.POINT_ID, code: r.POINT_CODE, name: r.POINT_NAME, pointType: r.POINT_TYPE,
          meter: r.METER_NUMBER, meterType: r.METER_TYPE || NO_METER, source: r.SOURCE, last: 0, values: {},
        };
        byId.set(r.POINT_ID, p);
      }
      p.values[r.PARAMETER_CODE] = r.VALUE;
      p.last = Math.max(p.last, new Date(r.TIME).getTime());
    }
    return [...byId.values()];
  }, [data]);

  const isAlarm = (p: PointView) => Object.entries(p.values).some(([c, v]) => alarm(c, v));
  const isOnline = (p: PointView) => (now - p.last) / 1000 <= STALE_S;

  const visible = points
    .filter((p) => !meterType || p.meterType === meterType)
    .filter((p) => !pointType || p.pointType === pointType)
    .filter((p) => !alarmsOnly || isAlarm(p))
    .filter((p) => {
      const q = search.trim().toLowerCase();
      return !q || `${p.code} ${p.name} ${p.meter}`.toLowerCase().includes(q);
    })
    .sort((a, b) => Number(isAlarm(b)) - Number(isAlarm(a)) || a.code.localeCompare(b.code));

  const online = visible.filter(isOnline).length;
  const alarms = visible.filter(isAlarm).length;
  const sum = (code: string) => visible.reduce((s, p) => s + (p.values[code] ?? 0), 0);
  const avg = (code: string) => {
    const vs = visible.map((p) => p.values[code]).filter((v) => v !== undefined);
    return vs.length ? vs.reduce((s, v) => s + v, 0) / vs.length : undefined;
  };

  const trend = (code: string) => (data?.trend ?? []).filter((t) => t.PARAMETER_CODE === code).map((t) => t.VALUE);
  const typeCounts = (list: string[], key: "meterType" | "pointType") =>
    list.map((name) => ({ name, n: points.filter((p) => p[key] === name).length }));
  const meterTypes = [...typeCounts(data?.meter_types ?? [], "meterType"), { name: NO_METER, n: points.filter((p) => p.meterType === NO_METER).length }];
  const simulated = points.some((p) => p.source === "SIM");

  return (
    <div className="mon">
      <header className="mon-head">
        <img src={logo} alt="" className="mon-logo" />
        <div className="mon-title">
          <b>TOSH · Мониторинг счётчиков</b>
          <span>Показания в реальном времени · обновление каждые {POLL_MS / 1000} с</span>
        </div>
        <div className={`mon-live ${error ? "is-down" : ""}`}>
          <i /> {error ? error : data ? new Date(data.now).toLocaleTimeString("ru-RU") : "Подключение…"}
        </div>
        {simulated && <span className="mon-badge" title="Данные генерирует имитатор УСПД (source=SIM)">Имитация УСПД</span>}
        <a className="mon-link" href="https://toshi.gerege.mn/">TEAMI</a>
        <button className="mon-link" onClick={() => { setToken(null); location.assign("/login"); }}>Выход</button>
      </header>

      <section className="mon-kpis">
        <div className="mon-kpi"><span>Точек учёта</span><b>{visible.length}</b><small>из {points.length}</small></div>
        <div className="mon-kpi is-ok"><span>На связи</span><b>{online}</b><small>{visible.length - online} без связи</small></div>
        <div className={`mon-kpi ${alarms ? "is-bad" : ""}`}><span>Тревоги</span><b>{alarms}</b><small>U, f, cos φ вне нормы</small></div>
        <div className="mon-kpi"><span>Σ A+</span><b>{fmt(sum("A_PLUS"))}</b><small>кВт·ч за интервал</small></div>
        <div className="mon-kpi"><span>Σ R+</span><b>{fmt(sum("R_PLUS"))}</b><small>квар·ч за интервал</small></div>
      </section>

      <section className="mon-params">
        {params.map((p) => (
          <div key={p.code} className="mon-param">
            <div className="mon-param-top">
              <span>{p.name}</span>
              <b>{fmt(avg(p.code))} <small>{p.unit}</small></b>
            </div>
            <Spark points={trend(p.code)} />
            <small>среднее · 60 мин</small>
          </div>
        ))}
      </section>

      <section className="mon-types">
        <span>Тип счётчика:</span>
        <button className={!meterType ? "on" : ""} onClick={() => setMeterType("")}>Все <em>{points.length}</em></button>
        {meterTypes.map((t) => (
          <button key={t.name} className={meterType === t.name ? "on" : ""} onClick={() => setMeterType(t.name)}>
            {t.name} <em>{t.n}</em>
          </button>
        ))}
        <span className="mon-gap">Тип точки:</span>
        <button className={!pointType ? "on" : ""} onClick={() => setPointType("")}>Все</button>
        {typeCounts(data?.point_types ?? [], "pointType").map((t) => (
          <button key={t.name} className={pointType === t.name ? "on" : ""} onClick={() => setPointType(t.name)}>
            {t.name} <em>{t.n}</em>
          </button>
        ))}
        <label className="mon-check">
          <input type="checkbox" checked={alarmsOnly} onChange={(e) => setAlarmsOnly(e.target.checked)} /> Только тревоги
        </label>
        <input className="mon-search" placeholder="Поиск: код, имя, № счётчика" value={search} onChange={(e) => setSearch(e.target.value)} />
      </section>

      <div className="mon-table-wrap">
        <table className="mon-table">
          <thead>
            <tr>
              <th />
              <th>Код</th>
              <th>Точка учёта</th>
              <th>Тип точки</th>
              <th>Счётчик</th>
              {params.map((p) => (
                <th key={p.code} className="num" title={p.name}>
                  {SHORT[p.code] ?? p.code}
                  {p.unit && <small>{p.unit}</small>}
                </th>
              ))}
              <th className="num">Обновлено</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const age = Math.max(0, Math.round((now - p.last) / 1000));
              return (
                <tr key={p.id} className={isAlarm(p) ? "is-alarm" : ""}>
                  <td><i className={`mon-dot ${!isOnline(p) ? "off" : isAlarm(p) ? "bad" : "ok"}`} /></td>
                  <td className="mono">{p.code}</td>
                  <td>{p.name}</td>
                  <td>{p.pointType || "—"}</td>
                  <td>{p.meter ? <>{p.meter} <small>{p.meterType}</small></> : <small>{NO_METER}</small>}</td>
                  {params.map((prm) => {
                    const v = p.values[prm.code];
                    return (
                      <td key={prm.code} className={`num ${v !== undefined && alarm(prm.code, v) ? "bad" : ""}`}>{fmt(v)}</td>
                    );
                  })}
                  <td className="num">{age < 60 ? `${age} с` : `${Math.round(age / 60)} мин`}</td>
                </tr>
              );
            })}
            {data && visible.length === 0 && (
              <tr><td colSpan={6 + params.length} className="mon-empty">Нет показаний за последний час</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
