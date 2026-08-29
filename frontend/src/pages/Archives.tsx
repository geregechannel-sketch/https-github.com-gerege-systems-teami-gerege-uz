import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import "../archives.css";
import {
  IcExpand, IcBars, IcSave, IcSync, IcPlus, IcMinus, IcCollapse, IcGrid,
  IcClock, IcChevron, IcSearch, IcFunnel, IcReset, IcInfo, IcHelp, IcGear,
  IcEye, IcSitemap, IcFolder,
} from "../icons";

type Row = Record<string, any>;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const ddmmyyyy = (s: string) => s.split("-").reverse().join("-");

export default function Archives() {
  const [points, setPoints] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Row | null>(null);
  const [openMn, setOpenMn] = useState(true);
  const [openSvc, setOpenSvc] = useState(false);
  const [from, setFrom] = useState(iso(new Date()));
  const [to, setTo] = useState(iso(new Date()));
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState("res");

  useEffect(() => {
    api.get("points?limit=1000").then((e) => setPoints((e.data as Row[]) || []));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? points.filter((p) => String(p.POINT_NAME || p.POINT_CODE || "").toLowerCase().includes(s)) : points;
  }, [points, q]);

  function period(kind: "day" | "week" | "month" | "year") {
    const now = new Date();
    const f = new Date();
    if (kind === "week") f.setDate(now.getDate() - 7);
    if (kind === "month") f.setMonth(now.getMonth() - 1);
    if (kind === "year") f.setFullYear(now.getFullYear() - 1);
    setFrom(iso(f));
    setTo(iso(now));
  }

  async function view() {
    if (!sel) return;
    const env = await api.post("archives/point", {
      POINT_ID: sel.POINT_ID, ML_ID: 1, MD_ID: 1, AGGS_ID: 1, FROM: from, TO: to,
    });
    setRows((env.data as Row[]) || []);
  }

  return (
    <div className="aw">
      {/* window title bar */}
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

      {/* period toolbar */}
      <div className="aw__tools">
        <button className="pbtn grid"><IcGrid size={16} /></button>
        <button className="pbtn" onClick={() => period("day")}>Сегодня</button>
        <button className="pbtn" onClick={() => period("week")}>Неделя</button>
        <button className="pbtn" onClick={() => period("month")}>Месяц</button>
        <button className="pbtn" onClick={() => period("year")}>Год</button>
        <span className="sp" />
        <input className="adate" type="text" value={ddmmyyyy(from)} readOnly />
        <span>—</span>
        <input className="adate" type="text" value={ddmmyyyy(to)} readOnly />
      </div>

      {/* body: two panels */}
      <div className="aw__body">
        {/* LEFT: Выбор ТУ */}
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
              <IcFolder size={15} color="#8a97a5" />
              <span className="chip">Служебные группы</span>
            </div>
            {openSvc && <div className="atree__empty" style={{ paddingLeft: 40 }}>Список пустой</div>}
            <div className="atree__node" onClick={() => setOpenMn(!openMn)}>
              <span className="tw">{openMn ? "−" : "+"}</span>
              <span className="flag">🇲🇳</span>
              <span>Монголия</span>
            </div>
            {openMn && (filtered.length ? filtered.map((p) => (
              <div key={p.POINT_ID}
                className={"atree__item" + (sel?.POINT_ID === p.POINT_ID ? " sel" : "")}
                onClick={() => { setSel(p); setRows(null); }}>
                {p.POINT_NAME || p.POINT_CODE}
              </div>
            )) : <div className="atree__empty" style={{ paddingLeft: 40 }}>Список пустой</div>)}
          </div>
          <div className="apane__foot">
            <button className="fbtn" onClick={() => setSel(null)}>Снять отм. всем</button>
            <span className="muted">{sel ? "Выбрано: 1" : "Выделенных элементов нет"}</span>
            <span className="sp" />
            <button className="ic sm"><IcInfo size={15} color="#5a6b7b" /></button>
            <button className="ic sm"><IcHelp size={15} color="#5a6b7b" /></button>
            <button className="ic sm"><IcGear size={15} color="#5a6b7b" /></button>
          </div>
        </div>

        {/* RIGHT: Выбор параметра */}
        <div className="apane">
          <div className="apane__head">Выбор параметра</div>
          <div className="atabs">
            {[["res", "По ресурсу"], ["disc", "По дискретности"], ["search", "Поиск"], ["set", "Настройки"]].map(([k, l]) => (
              <button key={k} className={"atab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          <div className="apane__content">
            {rows && rows.length ? (
              <table className="toshi-grid" style={{ fontSize: 12, width: "100%" }}>
                <thead><tr>{Object.keys(rows[0]).map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>{rows.map((r, i) => (
                  <tr key={i}>{Object.keys(rows[0]).map((c) => <td key={c}>{String(r[c] ?? "")}</td>)}</tr>
                ))}</tbody>
              </table>
            ) : (
              <div className="aempty">
                <IcSitemap size={120} color="var(--treeEmptyColor)" />
                <div>{rows ? "Нет данных за выбранный период" : "Список пустой"}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* bottom action bar */}
      <div className="aw__actions">
        <button className="abtn green"><IcGear size={15} color="#fff" /> Настройки</button>
        <button className="abtn blue" onClick={view} disabled={!sel}><IcEye size={15} color="#fff" /> Просмотр</button>
        <button className="abtn blue" onClick={view} disabled={!sel}><IcEye size={15} color="#fff" /> Просмотр (гр.)</button>
      </div>

    </div>
  );
}
