import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import "../archives.css";
import { calendarRange, dateInUTC8 } from "../lib/archiveQuality";
import {
  IcExpand, IcSave, IcSync, IcPlus, IcMinus, IcCollapse, IcGrid,
  IcClock, IcChevron, IcSearch, IcFunnel, IcReset, IcInfo, IcHelp, IcGear,
  IcEye, IcSitemap, IcFolder,
} from "../icons";
import { MENU_ICONS } from "../icons";

type Row = Record<string, any>;
const iso = (d: Date) => d.toISOString().slice(0, 10);


export default function Archives() {
  const requestId = useRef(0);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [measurements, setMeasurements] = useState<Row[]>([]);
  const [measurement, setMeasurement] = useState("");
  const [groups, setGroups] = useState<Row[]>([]);
  const [points, setPoints] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Row | null>(null);
  const [openSvc, setOpenSvc] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState(dateInUTC8());
  const [to, setTo] = useState(dateInUTC8());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState("res");


  useEffect(() => {
    api.get("groups?limit=5000").then((e) => setGroups((e.data as Row[]) || []));
    api.get("points?limit=1000").then((e) => setPoints((e.data as Row[]) || []));
  }, []);

  useEffect(() => {
    ++requestId.current;
    let active = true;
    setRows(null); setMeasurements([]); setMeasurement(""); setBusy(false);
    if (!sel) { setStatus(""); return; }
    setStatus("Загрузка доступных параметров…");
    api.get("measurementsarchives?POINT_ID=" + encodeURIComponent(sel.POINT_ID)).then(e => {
      if (!active) return;
      if (!e.success || !Array.isArray(e.data)) throw new Error();
      const valid = e.data.filter((r: Row) => [r.ML_ID, r.MD_ID, r.AGGS_ID].every(v => v != null && String(v).trim() !== ""));
      setMeasurements(valid);
      setStatus(valid.length ? "Выберите параметр архива" : "Сервер не предоставил параметры архива для этой точки.");
    }).catch(() => { if (active) setStatus("Не удалось получить параметры архива."); });
    return () => { active = false; ++requestId.current; };
  }, [sel]);

  function clearResult() { ++requestId.current; setRows(null); setBusy(false); setStatus(""); }

  // Build the group tree (children + points per group). Roots = groups whose
  // parent is null/absent from the set; skip system groups so only the topology
  // (Монголия → … → КРУ) shows, matching the real "Выбор ТУ".
  const { roots, childrenOf, pointsOf, sysRoots } = useMemo(() => {
    const byId = new Map(groups.map((g) => [String(g.GR_ID), g]));
    const childrenOf = new Map<string, Row[]>();
    const pointsOf = new Map<string, Row[]>();
    for (const g of groups) {
      const p = g.PARENT_GR_ID != null ? String(g.PARENT_GR_ID) : "";
      if (p && byId.has(p)) (childrenOf.get(p) || childrenOf.set(p, []).get(p)!).push(g);
    }
    for (const pt of points) {
      const k = pt.GR_ID != null ? String(pt.GR_ID) : "";
      (pointsOf.get(k) || pointsOf.set(k, []).get(k)!).push(pt);
    }
    // roots: groups that are the top of a topology branch (parent null/missing)
    // and actually contain points somewhere in their subtree.
    const hasPoints = (id: string): boolean =>
      (pointsOf.get(id)?.length || 0) > 0 || (childrenOf.get(id) || []).some((c) => hasPoints(String(c.GR_ID)));
    const roots = groups.filter((g) => {
      const p = g.PARENT_GR_ID != null ? String(g.PARENT_GR_ID) : "";
      return (!p || !byId.has(p)) && hasPoints(String(g.GR_ID));
    });
    const sysRoots = groups.filter((g) => {
      if (Number(g.GR_TYPE_ID) !== 2) return false;
      const p = g.PARENT_GR_ID != null ? String(g.PARENT_GR_ID) : "";
      return !p || !byId.has(p);
    });
    return { roots, childrenOf, pointsOf, sysRoots };
  }, [groups, points]);

  const s = q.trim().toLowerCase();
  const match = (p: Row) => !s || String(p.POINT_NAME || p.POINT_CODE || "").toLowerCase().includes(s);
  const totalPoints = points.filter(match).length;

  function toggle(id: string) {
    setExpanded((e) => {
      const n = new Set(e);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function GroupNode({ g, depth, sys }: { g: Row; depth: number; sys?: boolean }) {
    const id = String(g.GR_ID);
    const kids = childrenOf.get(id) || [];
    const pts = sys ? [] : (pointsOf.get(id) || []).filter(match);
    const open = expanded.has(id) || (depth === 0 && !sys);
    const hasChildren = kids.length > 0 || pts.length > 0;
    return (
      <>
        <div className="atree__node" style={{ paddingLeft: 10 + depth * 16 }} onClick={() => toggle(id)}>
          <span className="tw">{hasChildren ? (open ? "−" : "+") : ""}</span>
          {sys
            ? <span className="gico gico--svc"><IcSitemap size={11} color="#fff" /></span>
            : depth === 0
            ? <span className="gico gico--root">{(() => { const G = MENU_ICONS.gis; return <G size={13} color="#fff" />; })()}</span>
            : <span className="gico gico--grp"><IcFolder size={12} color="#fff" /></span>}
          <span>{g.GR_NAME || g.GR_CODE}</span>
        </div>
        {open && (
          <>
            {kids.map((c) => <GroupNode key={c.GR_ID} g={c} depth={depth + 1} sys={sys} />)}
            {pts.map((p) => (
              <div key={p.POINT_ID}
                className={"atree__item" + (sel?.POINT_ID === p.POINT_ID ? " sel" : "")}
                style={{ paddingLeft: 10 + (depth + 1) * 16 + 14 }}
                onClick={() => { setSel(p); setRows(null); }}>
                <span className="bolt">⚡</span> {p.POINT_NAME || p.POINT_CODE}
              </div>
            ))}
          </>
        )}
      </>
    );
  }

  function period(kind: "day" | "week" | "month" | "year") {
    const now = new Date(dateInUTC8() + "T00:00:00Z"), f = new Date(now);
    if (kind === "week") f.setUTCDate(now.getUTCDate() - 7);
    if (kind === "month") f.setUTCMonth(now.getUTCMonth() - 1);
    if (kind === "year") f.setUTCFullYear(now.getUTCFullYear() - 1);
    clearResult(); setFrom(iso(f)); setTo(iso(now));
  }
  async function view() {
    const parameter = measurements[Number(measurement)];
    if (!sel || measurement === "" || !parameter) return;
    if (!from || !to || from > to) { setStatus("Проверьте начало и конец периода."); return; }
    let range: ReturnType<typeof calendarRange>;
    try { range = calendarRange(from, to); } catch (e) { setStatus((e as Error).message); return; }
    const id = ++requestId.current;
    setBusy(true); setRows(null); setStatus("Загрузка архива…");
    try {
      const env = await api.post("archives/point", { POINT_ID: sel.POINT_ID, ML_ID: parameter.ML_ID, MD_ID: parameter.MD_ID, AGGS_ID: parameter.AGGS_ID, FROM: range.begin, TO: range.end });
      if (id !== requestId.current) return;
      if (!env.success || !Array.isArray(env.data)) { setStatus(env.message || "Сервер не вернул данные архива."); return; }
      setRows(env.data);
      setStatus(env.data.length ? `Получено строк: ${env.data.length}` : "За выбранный период данные не найдены.");
    } catch { if (id === requestId.current) setStatus("Ошибка связи при загрузке архива."); }
    finally { if (id === requestId.current) setBusy(false); }
  }

  return (
    <div className="aw">
      <div className="aw__title">
        <IcExpand size={14} />
        <span>Просмотр архивов - ФИЛЬТР</span>
        <span className="sp" />
        <span className="aw__sets">-- Сохраненные наборы установок --</span>
        <button className="ic"><IcChevron size={12} /></button>
        <button className="ic"><IcSave size={15} /></button>
        <button className="ic"><IcSync size={15} /></button>
        <button className="ic"><IcPlus size={15} /></button>
        <button className="ic"><IcMinus size={15} /></button>
        <button className="ic"><IcCollapse size={15} /></button>
      </div>

      <div className="aw__tools"><span title="Результаты содержат время UTC; период выбирается в UTC+08:00">UTC+08:00</span>
        <button className="pbtn grid"><IcGrid size={16} /></button>
        <button className="pbtn" onClick={() => period("day")}>Сегодня</button>
        <button className="pbtn" onClick={() => period("week")}>Неделя</button>
        <button className="pbtn" onClick={() => period("month")}>Месяц</button>
        <button className="pbtn" onClick={() => period("year")}>Год</button>
        <span className="sp" />
        <input className="adate" type="date" aria-label="Начало периода" value={from} onChange={e => { clearResult(); setFrom(e.target.value); }} />
        <span>—</span>
        <input className="adate" type="date" aria-label="Конец периода" value={to} onChange={e => { clearResult(); setTo(e.target.value); }} />
      </div>

      <div className="aw__body">
        <div className="apane">
          <div className="apane__head">Выбор ТУ</div>
          <div className="apane__tools">
            <button className="ib"><IcClock size={17} color="#5a6b7b" /></button>
            <div className="isel"><span>Код точки</span><IcChevron size={12} /></div>
            <input className="isearch" placeholder="Поиск" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="ib green"><IcSearch size={15} color="#fff" /></button>
            <button className="ib blue"><IcFunnel size={15} color="#fff" /></button>
            <button className="ib red" onClick={() => setQ("")}><IcReset size={15} color="#fff" /></button>
          </div>
          <div className="apane__row">
            <span>Корневая группа</span>
            <div className="isel grow"><span>Начальная корневая группа</span><IcChevron size={12} /></div>
          </div>
          <div className="atree">
            <div className="atree__node" onClick={() => setOpenSvc(!openSvc)}>
              <span className="tw">{openSvc ? "−" : "+"}</span>
              <span className="gico gico--svc"><IcSitemap size={11} color="#fff" /></span>
              <span className="chip">Служебные группы</span>
            </div>
            {openSvc && (sysRoots.length
              ? sysRoots.map((g) => <GroupNode key={g.GR_ID} g={g} depth={0} sys />)
              : <div className="atree__empty" style={{ paddingLeft: 40 }}>Список пустой</div>)}
            {roots.length ? roots.map((g) => <GroupNode key={g.GR_ID} g={g} depth={0} />)
              : <div className="atree__empty">Список пустой</div>}
          </div>
          <div className="apane__foot">
            <button className="fbtn" onClick={() => setSel(null)}>Снять отм. всем</button>
            <span className="muted">{sel ? "Выбрано: 1" : "Выделенных элементов нет"}</span>
            <span className="sp" />
            <button className="ic sm"><IcInfo size={14} color="#fff" /></button>
            <button className="ic sm"><IcHelp size={14} color="#fff" /></button>
            <button className="ic sm"><IcGear size={14} color="#fff" /></button>
          </div>
        </div>

        <div className="apane">
          <div className="apane__head">Выбор параметра</div>
          <div className="atabs">
            {[["res", "По ресурсу"], ["disc", "По дискретности"], ["search", "Поиск"], ["set", "Настройки"]].map(([k, l]) => (
              <button key={k} className={"atab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          <div className="apane__content">
            {sel && <select aria-label="Параметр архива" value={measurement} onChange={e => { clearResult(); setMeasurement(e.target.value); }}>
              <option value="">Выберите доступный параметр</option>
              {measurements.map((m, i) => <option key={i} value={i}>{m.ML_NAME || `ML ${m.ML_ID}`} / MD {m.MD_ID} / AGGS {m.AGGS_ID}</option>)}
            </select>}
            <p role="status" aria-live="polite">{status}</p>
            {rows && rows.length ? (
              <table className="toshi-grid" style={{ fontSize: 12, width: "100%" }}>
                <thead><tr>{Object.keys(rows[0]).map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>{rows.map((r, i) => (
                  <tr key={i}>{Object.keys(rows[0]).map((c) => <td key={c}>{String(r[c] ?? "")}</td>)}</tr>
                ))}</tbody>
              </table>
            ) : sel ? (
              <div className="ptree">
                <p>Параметры отображаются только из списка, предоставленного сервером.</p>
              </div>
            ) : (
              <div className="aempty">
                <IcSitemap size={120} color="var(--treeEmptyColor)" />
                <div>Список пустой</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="aw__actions">
        <button className="abtn green"><IcGear size={15} color="#fff" /> Настройки</button>
        <button className="abtn blue" onClick={view} disabled={!sel || measurement === "" || busy}><IcEye size={15} color="#fff" /> Просмотр</button>
        <button className="abtn blue" disabled title="График будет доступен после подключения временного ряда"><IcEye size={15} color="#fff" /> Просмотр (гр.)</button>
      </div>
    </div>
  );
}
