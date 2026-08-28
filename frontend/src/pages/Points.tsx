import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
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
  ECP_ID: "",
};

export default function Points() {
  const [points, setPoints] = useState<Row[]>([]);
  const [types, setTypes] = useState<Row[]>([]);
  const [ecps, setEcps] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<number | null>(null);
  const [form, setForm] = useState<Row>({ ...blank });
  const [isNew, setIsNew] = useState(false);
  const [acc, setAcc] = useState<string | null>(null);

  const load = () =>
    api.get("points?limit=1000").then((e) => setPoints((e.data as Row[]) || []));

  useEffect(() => {
    load();
    api.get("pointtypes").then((e) => setTypes((e.data as Row[]) || []));
    api.get("ecoprofiles").then((e) => setEcps((e.data as Row[]) || []));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? points.filter((p) => String(p.POINT_NAME || p.POINT_CODE || "").toLowerCase().includes(s)) : points;
  }, [points, q]);

  function pick(p: Row) {
    setSel(p.POINT_ID);
    setIsNew(false);
    setForm({ ...blank, ...p });
  }
  function newPoint() {
    setSel(null);
    setIsNew(true);
    setForm({ ...blank });
  }
  async function save() {
    const body: Row = {};
    Object.keys(blank).forEach((k) => {
      if (k === "POINT_ID") return;
      body[k] = form[k];
    });
    let env;
    if (isNew) env = await api.post("points", body);
    else if (form.POINT_ID) env = await api.put(`points/${form.POINT_ID}`, body);
    else return;
    if (env.success) {
      await load();
      setIsNew(false);
      const id = (env.data as any)?.POINT_ID || form.POINT_ID;
      setSel(id);
      if (env.data) setForm({ ...blank, ...(env.data as Row) });
    } else alert(env.message || "Ошибка сохранения");
  }
  async function remove() {
    if (!form.POINT_ID || isNew) return;
    if (!confirm("Удалить точку?")) return;
    const env = await api.del(`points/${form.POINT_ID}`);
    if (env.success) {
      await load();
      newPoint();
      setIsNew(false);
      setForm({ ...blank });
    } else alert(env.message || "Ошибка удаления");
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const chk = (k: string) => (
    <input type="checkbox" checked={!!Number(form[k])} onChange={(e) => set(k, e.target.checked ? 1 : 0)} />
  );

  return (
    <div className="cw">
      <div className="cw__head">
        <span>⛶</span>
        <span>Конфигурация системы — Классификаторы и списки — Точки</span>
        <span className="sp" />
        <span>⇥</span>
      </div>
      <div className="cw__body">
        {/* LEFT: Выбор ТУ */}
        <div className="pane">
          <div className="pane__head">Выбор ТУ</div>
          <div className="pane__tools">
            <button className="iconbtn">⏱</button>
            <select className="iconbtn" style={{ minWidth: 90 }}>
              <option>Код точки</option>
              <option>Наименование</option>
            </select>
            <input
              className="iconbtn"
              style={{ flex: 1, minWidth: 120, textAlign: "left", padding: "0 8px" }}
              placeholder="Поиск"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="iconbtn green">🔍</button>
            <button className="iconbtn blue">⛃</button>
            <button className="iconbtn red" onClick={() => setQ("")}>↺</button>
          </div>
          <div className="pane__row">
            <span style={{ fontWeight: 600 }}>Корневая группа</span>
            <select className="f" style={{ flex: 1, height: 26 }}>
              <option>Монголия (UZ)</option>
            </select>
          </div>
          <div className="tree">
            <div className="tree__group">▾ Монголия (UZ) — г.Чойбалсан</div>
            {filtered.length === 0 ? (
              <div className="tree__empty">Список пустой</div>
            ) : (
              filtered.map((p) => (
                <div
                  key={p.POINT_ID}
                  className={"tree__item" + (sel === p.POINT_ID ? " sel" : "")}
                  style={{ paddingLeft: 24 }}
                  onClick={() => pick(p)}
                >
                  {p.POINT_NAME || p.POINT_CODE}
                </div>
              ))
            )}
          </div>
          <div className="pane__foot">
            <button className="cbtn blue" style={{ padding: "0 10px" }}>Снять отм. всем</button>
            <span>Точек: {filtered.length}</span>
            <span className="sp" />
            <span>ⓘ</span><span>?</span><span>⚙</span>
          </div>
        </div>

        {/* RIGHT: Свойства точки */}
        <div className="pane">
          <div className="pane__head">Свойства точки</div>
          <div className="form">
            <div className="frow">
              <label>Наименование точки</label>
              <div className="fval"><input className="f" value={form.POINT_NAME || ""} onChange={(e) => set("POINT_NAME", e.target.value)} /></div>
            </div>
            <div className="frow">
              <label>Код точки</label>
              <div className="fval"><input className="f" value={form.POINT_CODE || ""} onChange={(e) => set("POINT_CODE", e.target.value)} /></div>
            </div>
            <div className="checks">
              <div className="chk"><span>Действителен</span>{chk("POINT_ENABLED")}</div>
              <div className="chk"><span>Автом. считывание</span>{chk("POINT_AUTO_READ_ENABLED")}</div>
            </div>
            <div className="checks">
              <div className="chk"><span>Коммерческий</span>{chk("POINT_COMMERCIAL")}</div>
              <div className="chk"><span>Свой</span>{chk("POINT_INTERNAL")}</div>
              <div className="chk"><span>Лицензируемая</span>{chk("POINT_LICENSED")}</div>
            </div>
            <div className="frow">
              <label>Типы точек</label>
              <div className="fval">
                <select className="f" value={form.POINT_TYPE_ID || ""} onChange={(e) => set("POINT_TYPE_ID", e.target.value)}>
                  <option value="">Выбрать</option>
                  {types.map((t) => <option key={t.POINT_TYPE_ID} value={t.POINT_TYPE_ID}>{t.POINT_TYPE_NAME}</option>)}
                </select>
              </div>
            </div>
            <div className="frow">
              <label>Экономические профили точек</label>
              <div className="fval">
                <select className="f" value={form.ECP_ID || ""} onChange={(e) => set("ECP_ID", e.target.value)}>
                  <option value="">Выбрать</option>
                  {ecps.map((t) => <option key={t.ECP_ID} value={t.ECP_ID}>{t.ECP_NAME}</option>)}
                </select>
              </div>
            </div>
            <div className="frow">
              <label>Получатель/отправитель</label>
              <div className="fval"><select className="f"><option>Выбрать</option></select></div>
            </div>

            <div className="btnrow">
              <button className="cbtn green" onClick={newPoint}>Новая точка</button>
              <button className="cbtn blue" onClick={save}>Сохранить</button>
              <button className="cbtn red" onClick={remove} disabled={isNew || !form.POINT_ID}>Удалить</button>
            </div>
            <div className="btnrow">
              <button className="cbtn grey">Свойства точки</button>
              <button className="cbtn grey">Измерения точки</button>
              <button className="cbtn grey">Считываемые измерения</button>
            </div>
            <div className="btnrow">
              <button className="cbtn grey">Изменение коэффициентов трансформации</button>
              <button className="cbtn grey">Замена счетчика</button>
            </div>

            <div className="acc" onClick={() => setAcc(acc === "prof" ? null : "prof")}>
              Присвоенные профили точки {acc === "prof" ? "▾" : "▸"}
            </div>
            {acc === "prof" && <div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Нет данных</div>}
            <div className="acc" onClick={() => setAcc(acc === "tar" ? null : "tar")}>
              Тарифные планы точки {acc === "tar" ? "▾" : "▸"}
            </div>
            {acc === "tar" && <div style={{ padding: 12, fontSize: 12, opacity: 0.6 }}>Нет данных</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
