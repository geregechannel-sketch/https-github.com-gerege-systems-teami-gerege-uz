import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import {
  IcClock,
  IcFolder,
  IcFunnel,
  IcGear,
  IcHelp,
  IcInfo,
  IcReset,
  IcSearch,
  IcSitemap,
} from "../icons";
import "../config.css";

type Row = Record<string, any>;

const blank: Row = {
  POINT_ID: null,
  POINT_NAME: "",
  POINT_CODE: "",
  POINT_ENABLED: 1,
  POINT_AUTO_READ_ENABLED: 0,
  POINT_COMMERCIAL: 0,
  POINT_INTERNAL: 0,
  POINT_LICENSED: 0,
  POINT_TYPE_ID: "",
  EC_ID: "",
  ECP_ID: "",
  GR_ID: "",
};

export default function Points() {
  const navigate = useNavigate();
  const [points, setPoints] = useState<Row[]>([]);
  const [groups, setGroups] = useState<Row[]>([]);
  const [types, setTypes] = useState<Row[]>([]);
  const [ecps, setEcps] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [rootID, setRootID] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [treeInitialized, setTreeInitialized] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [form, setForm] = useState<Row>({ ...blank });
  const [isNew, setIsNew] = useState(false);
  const [acc, setAcc] = useState<string | null>(null);
  const [related, setRelated] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [pointEnv, groupEnv, typeEnv, ecpEnv, categoryEnv] = await Promise.all([
      api.get("points?limit=1000"),
      api.get("groups?limit=5000"),
      api.get("pointtypes?limit=1000"),
      api.get("ecoprofiles?limit=1000"),
      api.get("ecocategories?limit=1000"),
    ]);
    setLoading(false);
    const failed = [pointEnv, groupEnv, typeEnv, ecpEnv, categoryEnv].find((env) => !env.success);
    if (failed) setError(failed.message || "Не удалось загрузить конфигурацию точек");
    setPoints((pointEnv.data as Row[]) || []);
    setGroups((groupEnv.data as Row[]) || []);
    setTypes((typeEnv.data as Row[]) || []);
    setEcps((ecpEnv.data as Row[]) || []);
    setCategories((categoryEnv.data as Row[]) || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const search = q.trim().toLowerCase();
  const matches = useCallback((point: Row) => {
    if (!search) return true;
    return [point.POINT_NAME, point.POINT_CODE]
      .some((value) => String(value || "").toLowerCase().includes(search));
  }, [search]);

  const topology = useMemo(() => {
    const topologyGroups = groups.filter((group) => !String(group.GR_CODE || "").startsWith("SYS_"));
    const byID = new Map(topologyGroups.map((group) => [String(group.GR_ID), group]));
    const children = new Map<string, Row[]>();
    const groupPoints = new Map<string, Row[]>();
    for (const group of topologyGroups) {
      const parent = group.PARENT_GR_ID == null ? "" : String(group.PARENT_GR_ID);
      if (parent && byID.has(parent)) {
        (children.get(parent) || children.set(parent, []).get(parent)!).push(group);
      }
    }
    for (const point of points) {
      const groupID = point.GR_ID == null ? "" : String(point.GR_ID);
      (groupPoints.get(groupID) || groupPoints.set(groupID, []).get(groupID)!).push(point);
    }
    const hasPoints = (id: string): boolean =>
      (groupPoints.get(id)?.length || 0) > 0 ||
      (children.get(id) || []).some((child) => hasPoints(String(child.GR_ID)));
    const roots = topologyGroups.filter((group) => {
      const parent = group.PARENT_GR_ID == null ? "" : String(group.PARENT_GR_ID);
      return (!parent || !byID.has(parent)) && hasPoints(String(group.GR_ID));
    });
    return { roots, children, groupPoints, groupIDs: new Set(byID.keys()) };
  }, [groups, points]);

  useEffect(() => {
    if (!treeInitialized && topology.roots.length) {
      setExpanded(new Set(topology.roots.map((group) => String(group.GR_ID))));
      setTreeInitialized(true);
    }
  }, [treeInitialized, topology.roots]);

  const filtered = useMemo(() => points.filter(matches), [points, matches]);

  const flatGroups = useMemo(() => {
    const result: { group: Row; depth: number }[] = [];
    const walk = (group: Row, depth: number) => {
      result.push({ group, depth });
      for (const child of topology.children.get(String(group.GR_ID)) || []) walk(child, depth + 1);
    };
    topology.roots.forEach((root) => walk(root, 0));
    return result;
  }, [topology]);

  const groupHasMatch = useCallback((id: string): boolean => {
    if ((topology.groupPoints.get(id) || []).some(matches)) return true;
    return (topology.children.get(id) || []).some((child) => groupHasMatch(String(child.GR_ID)));
  }, [matches, topology]);

  const visibleRoots = topology.roots.filter((root) =>
    (!rootID || String(root.GR_ID) === rootID) && (!search || groupHasMatch(String(root.GR_ID))),
  );

  function toggleGroup(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function pick(point: Row) {
    setSel(Number(point.POINT_ID));
    setIsNew(false);
    setAcc(null);
    setRelated([]);
    setForm({ ...blank, ...point });
  }

  function GroupNode({ group, depth }: { group: Row; depth: number }) {
    const id = String(group.GR_ID);
    const children = (topology.children.get(id) || [])
      .filter((child) => !search || groupHasMatch(String(child.GR_ID)));
    const childPoints = (topology.groupPoints.get(id) || []).filter(matches);
    const open = expanded.has(id) || !!search;
    const hasChildren = children.length > 0 || childPoints.length > 0;
    return <>
      <button className="point-tree__group" style={{ paddingLeft: 9 + depth * 17 }} onClick={() => toggleGroup(id)}>
        <span className="point-tree__toggle">{hasChildren ? (open ? "−" : "+") : ""}</span>
        <i>{depth === 0 ? <IcSitemap size={11} /> : <IcFolder size={11} />}</i>
        <b>{group.GR_NAME || group.GR_CODE}</b>
      </button>
      {open && children.map((child) => <GroupNode key={child.GR_ID} group={child} depth={depth + 1} />)}
      {open && childPoints.map((point) => <button
        key={point.POINT_ID}
        className={`point-tree__point${sel === Number(point.POINT_ID) ? " sel" : ""}`}
        style={{ paddingLeft: 43 + depth * 17 }}
        onClick={() => pick(point)}
      >
        <span className="point-tree__bolt">ϟ</span>
        <span>{point.POINT_NAME || point.POINT_CODE}</span>
        <small>{point.POINT_CODE}</small>
      </button>)}
    </>;
  }

  function newPoint(groupID?: string) {
    setSel(null);
    setIsNew(true);
    setAcc(null);
    setRelated([]);
    setForm({ ...blank, GR_ID: groupID || rootID || "" });
    setNotice("Заполните свойства новой точки");
  }

  async function save() {
    if (!String(form.POINT_NAME || "").trim() || !String(form.POINT_CODE || "").trim()) {
      setError("Заполните наименование и код точки");
      return;
    }
    const body: Row = {};
    Object.keys(blank).forEach((key) => {
      if (key === "POINT_ID") return;
      body[key] = ["POINT_TYPE_ID", "EC_ID", "ECP_ID", "GR_ID"].includes(key)
        ? (form[key] === "" || form[key] == null ? null : Number(form[key]))
        : form[key];
    });
    let env;
    if (isNew) env = await api.post("points", body);
    else if (form.POINT_ID) env = await api.put(`points/${form.POINT_ID}`, body);
    else return;
    if (!env.success) {
      setError(env.message || "Ошибка сохранения");
      return;
    }
    await load();
    setIsNew(false);
    const id = (env.data as Row)?.POINT_ID || form.POINT_ID;
    setSel(Number(id));
    if (env.data) setForm({ ...blank, ...(env.data as Row) });
    setNotice("Точка сохранена");
    setError("");
  }

  async function remove() {
    if (!form.POINT_ID || isNew) return;
    if (!window.confirm("Удалить точку?")) return;
    const env = await api.del(`points/${form.POINT_ID}`);
    if (!env.success) {
      setError(env.message || "Ошибка удаления");
      return;
    }
    await load();
    setSel(null);
    setIsNew(false);
    setForm({ ...blank });
    setNotice("Точка удалена");
  }

  async function toggleRelated(kind: "prof" | "tar") {
    if (acc === kind) {
      setAcc(null);
      return;
    }
    setAcc(kind);
    setRelated([]);
    if (!form.POINT_ID) return;
    const model = kind === "prof" ? "pointsfp" : "pointsrtp";
    const env = await api.post(`${model}/query`, {
      limit: 100,
      offset: 0,
      filters: [{ c: "POINT_ID", p: "=", v: Number(form.POINT_ID) }],
    });
    if (env.success) setRelated((env.data as Row[]) || []);
    else setError(env.message || "Не удалось загрузить связанные данные");
  }

  function openRelated(model: string) {
    if (!form.POINT_ID) return;
    navigate(`/m/${model}?filter=POINT_ID&value=${encodeURIComponent(form.POINT_ID)}&exact=1`);
  }

  const set = (key: string, value: any) => setForm((current) => ({ ...current, [key]: value }));
  const checkbox = (key: string) => (
    <input type="checkbox" checked={!!Number(form[key])} onChange={(event) => set(key, event.target.checked ? 1 : 0)} />
  );

  return (
    <div className="cw">
      <div className="cw__head">
        <span>⛶</span>
        <span>Конфигурация системы — Классификаторы и списки — Точки</span>
        <span className="sp" />
        <button className="cw__refresh" title="Обновить" onClick={load}><IcClock size={14} /></button>
      </div>
      {error && <div className="cw__message error">{error}<button onClick={() => setError("")}>×</button></div>}
      {notice && <div className="cw__message success">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      <div className="cw__body">
        <div className="pane">
          <div className="pane__head">Выбор ТУ</div>
          <div className="pane__tools">
            <button className="iconbtn" title="Обновить" onClick={load}><IcClock size={15} /></button>
            <select className="iconbtn point-tree__criterion" aria-label="Критерий поиска">
              <option>Код / наименование</option>
            </select>
            <input className="iconbtn point-tree__search" placeholder="Поиск" value={q} onChange={(event) => setQ(event.target.value)} />
            <button className="iconbtn green" title="Раскрыть результаты" onClick={() => setExpanded(new Set(flatGroups.map(({ group }) => String(group.GR_ID))))}><IcSearch size={14} /></button>
            <button className="iconbtn blue" title="Раскрыть все группы" onClick={() => setExpanded(new Set(flatGroups.map(({ group }) => String(group.GR_ID))))}><IcFunnel size={14} /></button>
            <button className="iconbtn red" title="Сбросить" onClick={() => {
              setQ("");
              setRootID("");
              setExpanded(new Set(topology.roots.map((group) => String(group.GR_ID))));
            }}><IcReset size={14} /></button>
          </div>
          <div className="pane__row">
            <span style={{ fontWeight: 600 }}>Корневая группа</span>
            <select className="f" value={rootID} onChange={(event) => setRootID(event.target.value)}>
              <option value="">Все корневые группы</option>
              {topology.roots.map((root) => <option key={root.GR_ID} value={root.GR_ID}>{root.GR_NAME || root.GR_CODE}</option>)}
            </select>
          </div>
          <div className="tree point-tree">
            {loading ? <div className="toshi-loader" /> : visibleRoots.map((root) => <GroupNode key={root.GR_ID} group={root} depth={0} />)}
            {!loading && filtered.some((point) => point.GR_ID == null || !topology.groupIDs.has(String(point.GR_ID))) && <div className="point-tree__orphan">
              <b>Без группы</b>
              {filtered.filter((point) => point.GR_ID == null || !topology.groupIDs.has(String(point.GR_ID))).map((point) => <button key={point.POINT_ID} onClick={() => pick(point)}>{point.POINT_NAME || point.POINT_CODE}</button>)}
            </div>}
            {!loading && !visibleRoots.length && !filtered.some((point) => point.GR_ID == null || !topology.groupIDs.has(String(point.GR_ID))) && <div className="tree__empty">Список пустой</div>}
          </div>
          <div className="pane__foot">
            <button className="cbtn blue point-tree__clear" onClick={() => {
              setSel(null);
              setIsNew(false);
              setForm({ ...blank });
            }}>Снять отм. всем</button>
            <span>Точек: {filtered.length}</span>
            <span className="sp" />
            <button className="cw__foot-icon" title="Информация" onClick={() => setNotice(`Групп: ${flatGroups.length}. Точек: ${points.length}.`)}><IcInfo size={13} /></button>
            <button className="cw__foot-icon" title="Помощь" onClick={() => setNotice("Выберите группу или точку; поиск работает по коду и наименованию.")}><IcHelp size={13} /></button>
            <button className="cw__foot-icon" title="Профили точки" disabled={!form.POINT_ID} onClick={() => toggleRelated("prof")}><IcGear size={13} /></button>
          </div>
        </div>

        <div className="pane">
          <div className="pane__head">Свойства точки</div>
          <div className="form">
            <div className="frow"><label>Наименование точки</label><div className="fval"><input className="f" value={form.POINT_NAME || ""} onChange={(event) => set("POINT_NAME", event.target.value)} /></div></div>
            <div className="frow"><label>Код точки</label><div className="fval"><input className="f" value={form.POINT_CODE || ""} onChange={(event) => set("POINT_CODE", event.target.value)} /></div></div>
            <div className="checks">
              <div className="chk"><span>Действителен</span>{checkbox("POINT_ENABLED")}</div>
              <div className="chk"><span>Автом. считывание</span>{checkbox("POINT_AUTO_READ_ENABLED")}</div>
            </div>
            <div className="checks">
              <div className="chk"><span>Коммерческий</span>{checkbox("POINT_COMMERCIAL")}</div>
              <div className="chk"><span>Свой</span>{checkbox("POINT_INTERNAL")}</div>
              <div className="chk"><span>Лицензируемая</span>{checkbox("POINT_LICENSED")}</div>
            </div>
            <SelectRow label="Типы точек" value={form.POINT_TYPE_ID} onChange={(value) => set("POINT_TYPE_ID", value)} options={types.map((type) => ({ value: type.POINT_TYPE_ID, label: type.POINT_TYPE_NAME }))} />
            <SelectRow label="Экономические профили точек" value={form.ECP_ID} onChange={(value) => set("ECP_ID", value)} options={ecps.map((profile) => ({ value: profile.ECP_ID, label: profile.ECP_NAME }))} />
            <SelectRow label="Группа точки" value={form.GR_ID} onChange={(value) => set("GR_ID", value)} emptyLabel="Без группы" options={flatGroups.map(({ group, depth }) => ({ value: group.GR_ID, label: `${"— ".repeat(depth)}${group.GR_NAME || group.GR_CODE}` }))} />
            <SelectRow label="Получатель/отправитель" value={form.EC_ID} onChange={(value) => set("EC_ID", value)} options={categories.map((category) => ({ value: category.EC_ID, label: category.EC_NAME || category.EC_CODE }))} />

            <div className="btnrow">
              <button className="cbtn green" onClick={() => newPoint(form.GR_ID ? String(form.GR_ID) : undefined)}>Новая точка</button>
              <button className="cbtn blue" onClick={save}>Сохранить</button>
              <button className="cbtn red" onClick={remove} disabled={isNew || !form.POINT_ID}>Удалить</button>
            </div>
            <div className="btnrow">
              <button className="cbtn grey" onClick={() => setAcc(null)}>Свойства точки</button>
              <button className="cbtn grey" disabled={!form.POINT_ID} onClick={() => openRelated("pointsmeasurelines")}>Измерения точки</button>
              <button className="cbtn grey" disabled={!form.POINT_ID} onClick={() => openRelated("datapoints")}>Считываемые измерения</button>
            </div>
            <div className="btnrow">
              <button className="cbtn grey" disabled={!form.POINT_ID} onClick={() => openRelated("pointsrtp")}>Изменение коэффициентов трансформации</button>
              <button className="cbtn grey" disabled={!form.POINT_ID} onClick={() => navigate(`/meters?search=${encodeURIComponent(form.POINT_CODE || form.POINT_NAME || "")}`)}>Замена счетчика</button>
            </div>

            <button type="button" className="acc" onClick={() => toggleRelated("prof")}>Присвоенные профили точки {acc === "prof" ? "▾" : "▸"}</button>
            {acc === "prof" && <RelatedRows rows={related} />}
            <button type="button" className="acc" onClick={() => toggleRelated("tar")}>Тарифные планы точки {acc === "tar" ? "▾" : "▸"}</button>
            {acc === "tar" && <RelatedRows rows={related} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectRow({ label, value, onChange, options, emptyLabel = "Выбрать" }: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  options: { value: unknown; label: unknown }[];
  emptyLabel?: string;
}) {
  return <div className="frow">
    <label>{label}</label>
    <div className="fval">
      <select className="f" value={String(value || "")} onChange={(event) => onChange(event.target.value)}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => <option key={String(option.value)} value={String(option.value)}>{String(option.label || option.value)}</option>)}
      </select>
    </div>
  </div>;
}

function RelatedRows({ rows }: { rows: Row[] }) {
  if (!rows.length) return <div className="cw__related-empty">Нет данных</div>;
  const columns = Object.keys(rows[0]);
  return <div className="cw__related">
    <table>
      <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{String(row[column] ?? "")}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}
