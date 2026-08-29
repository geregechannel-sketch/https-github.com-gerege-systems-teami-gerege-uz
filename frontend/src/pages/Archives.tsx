import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import "../archives.css";
import {
  IcExpand, IcSave, IcSync, IcPlus, IcMinus, IcCollapse, IcGrid,
  IcClock, IcChevron, IcSearch, IcFunnel, IcReset, IcInfo, IcHelp, IcGear,
  IcEye, IcSitemap, IcFolder,
} from "../icons";
import { MENU_ICONS } from "../icons";

type Row = Record<string, any>;
type PNode = { n: string; c?: PNode[] };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const ddmmyyyy = (s: string) => s.split("-").reverse().join("-");

export default function Archives() {
  const [groups, setGroups] = useState<Row[]>([]);
  const [points, setPoints] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Row | null>(null);
  const [openSvc, setOpenSvc] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState(iso(new Date()));
  const [to, setTo] = useState(iso(new Date()));
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState("res");
  const [paramOpen, setParamOpen] = useState<Set<string>>(new Set(["Суточный профиль: Получасовые", "Р мощность"]));
  const [selParam, setSelParam] = useState<string>("Р мощность");

  useEffect(() => {
    api.get("groups?limit=5000").then((e) => setGroups((e.data as Row[]) || []));
    api.get("points?limit=1000").then((e) => setPoints((e.data as Row[]) || []));
  }, []);

  // Build the group tree (children + points per group). Roots = groups whose
  // parent is null/absent from the set; skip system groups so only the topology
  // (Монголия → … → КРУ) shows, matching the real "Выбор ТУ".
  const { roots, childrenOf, pointsOf } = useMemo(() => {
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
    return { roots, childrenOf, pointsOf };
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

  function GroupNode({ g, depth }: { g: Row; depth: number }) {
    const id = String(g.GR_ID);
    const kids = childrenOf.get(id) || [];
    const pts = (pointsOf.get(id) || []).filter(match);
    const open = expanded.has(id) || depth === 0;
    const hasChildren = kids.length > 0 || pts.length > 0;
    return (
      <>
        <div className="atree__node" style={{ paddingLeft: 10 + depth * 16 }} onClick={() => toggle(id)}>
          <span className="tw">{hasChildren ? (open ? "−" : "+") : ""}</span>
          {depth === 0
            ? <span className="gico gico--root">{(() => { const G = MENU_ICONS.gis; return <G size={13} color="#fff" />; })()}</span>
            : <span className="gico gico--grp"><IcFolder size={12} color="#fff" /></span>}
          <span>{g.GR_NAME || g.GR_CODE}</span>
        </div>
        {open && (
          <>
            {kids.map((c) => <GroupNode key={c.GR_ID} g={c} depth={depth + 1} />)}
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

  const PARAM_TREE: PNode[] = [
    {
      n: "Суточный профиль: Получасовые",
      c: [
        { n: "Р мощность", c: [{ n: "Средняя Р+ мощность за 30 минут" }, { n: "Средняя Р- мощность за 30 минут" }] },
        { n: "Q мощность", c: [{ n: "Средняя Q+ мощность за 30 минут" }, { n: "Средняя Q- мощность за 30 минут" }] },
      ],
    },
    { n: "Суточные данные: Суточные", c: [{ n: "Активная энергия A+" }, { n: "Активная энергия A-" }, { n: "Реактивная энергия R+" }, { n: "Реактивная энергия R-" }] },
    { n: "Нарастающие показания: Суточные", c: [{ n: "Показание A+" }, { n: "Показание A-" }] },
    { n: "Нарастающие показания: Месячные", c: [{ n: "Показание A+" }, { n: "Показание A-" }] },
    { n: "Мгновенные данные: Мгновенные", c: [{ n: "Напряжение" }, { n: "Ток" }, { n: "Cos φ" }] },
  ];
  function toggleParam(n: string) {
    setParamOpen((e) => { const s = new Set(e); s.has(n) ? s.delete(n) : s.add(n); return s; });
  }
  function ParamNode({ node, depth }: { node: PNode; depth: number }) {
    const has = !!node.c?.length;
    const open = paramOpen.has(node.n);
    return (
      <>
        <div className="pnode" style={{ paddingLeft: 8 + depth * 20 }}>
          {has ? <span className="pw" onClick={() => toggleParam(node.n)}>{open ? "−" : "+"}</span> : <span className="pw pw--leaf" />}
          {depth === 0 ? <span className="pdots">●○</span> : <span className="pbolt">⚡</span>}
          <span className={"plabel" + (selParam === node.n ? " sel" : "")} onClick={() => setSelParam(node.n)}>{node.n}</span>
        </div>
        {has && open && node.c!.map((c, i) => <ParamNode key={i} node={c} depth={depth + 1} />)}
      </>
    );
  }

  function period(kind: "day" | "week" | "month" | "year") {
    const now = new Date(), f = new Date();
    if (kind === "week") f.setDate(now.getDate() - 7);
    if (kind === "month") f.setMonth(now.getMonth() - 1);
    if (kind === "year") f.setFullYear(now.getFullYear() - 1);
    setFrom(iso(f)); setTo(iso(now));
  }
  async function view() {
    if (!sel) return;
    const env = await api.post("archives/point", { POINT_ID: sel.POINT_ID, ML_ID: 1, MD_ID: 1, AGGS_ID: 1, FROM: from, TO: to });
    setRows((env.data as Row[]) || []);
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
            {openSvc && <div className="atree__empty" style={{ paddingLeft: 40 }}>Список пустой</div>}
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
            {rows && rows.length ? (
              <table className="toshi-grid" style={{ fontSize: 12, width: "100%" }}>
                <thead><tr>{Object.keys(rows[0]).map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>{rows.map((r, i) => (
                  <tr key={i}>{Object.keys(rows[0]).map((c) => <td key={c}>{String(r[c] ?? "")}</td>)}</tr>
                ))}</tbody>
              </table>
            ) : sel ? (
              <div className="ptree">
                {PARAM_TREE.map((n, i) => <ParamNode key={i} node={n} depth={0} />)}
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
        <button className="abtn blue" onClick={view} disabled={!sel}><IcEye size={15} color="#fff" /> Просмотр</button>
        <button className="abtn blue" onClick={view} disabled={!sel}><IcEye size={15} color="#fff" /> Просмотр (гр.)</button>
      </div>
    </div>
  );
}
