import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import "../archives.css";
import { IcExpand, IcCollapse } from "../icons";

type Row = Record<string, any>;
const ORDER = ["Просмотр архивов", "Качество показаний", "Считывание показаний", "Конфигурация системы", "Регистр событий", "Отчеты"];

function YFolder() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} aria-hidden style={{ flex: "0 0 15px" }}>
      <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" fill="#f2c14e" stroke="#d9a520" strokeWidth="0.6" />
    </svg>
  );
}
function Star() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} aria-hidden style={{ flex: "0 0 15px" }}>
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14 2 9.27l7.1-1.01z" fill="#f39c12" stroke="#e67e22" strokeWidth="0.5" />
    </svg>
  );
}
function OpenBtn() {
  return (
    <span className="uv-open" title="Открыть">
      <svg viewBox="0 0 24 24" width={12} height={12} aria-hidden>
        <path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3zM5 5h5v2H5v12h12v-5h2v5a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" fill="#fff" />
      </svg>
    </span>
  );
}

// module -> subfolder -> forms
type Tree = Map<string, Map<string, Row[]>>;

export default function SavedForms() {
  const [rows, setRows] = useState<Row[]>([]);
  const [openF, setOpenF] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Row | null>(null);
  const [name, setName] = useState("");

  const load = () => api.get("usersettings").then((e) => setRows((e.data as Row[]) || []));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (sel) setName(sel.UV_NAME || ""); }, [sel]);

  const tree: [string, [string, Row[]][]][] = useMemo(() => {
    const t: Tree = new Map();
    for (const r of rows) {
      const mod = r.UV_MODULE || "Прочее";
      const sub = r.UV_TYPE || "—";
      if (!t.has(mod)) t.set(mod, new Map());
      const sm = t.get(mod)!;
      (sm.get(sub) || sm.set(sub, []).get(sub)!).push(r);
    }
    return [...t.entries()]
      .sort((a, b) => (ORDER.indexOf(a[0]) < 0 ? 99 : ORDER.indexOf(a[0])) - (ORDER.indexOf(b[0]) < 0 ? 99 : ORDER.indexOf(b[0])))
      .map(([mod, sm]) => [mod, [...sm.entries()]] as [string, [string, Row[]][]]);
  }, [rows]);

  const toggle = (k: string) => setOpenF((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  async function save() {
    if (!sel) return;
    await api.post("usersettings", { UV_NAME: name, UV_MODULE: sel.UV_MODULE, UV_TYPE: sel.UV_TYPE, UV_PUBLIC: Number(sel.UV_PUBLIC) ? 1 : 0 });
    await load();
  }
  async function remove() {
    if (!sel) return;
    await api.del(`usersettings/${sel.UV_ID}`);
    setSel(null);
    await load();
  }

  return (
    <div className="aw">
      <div className="aw__title">
        <IcExpand size={14} />
        <span>Сохраненные формы</span>
        <span className="sp" />
        <button className="ic"><IcCollapse size={15} /></button>
      </div>

      <div className="aw__body" style={{ gridTemplateColumns: "44% 56%" }}>
        <div className="apane">
          <div className="apane__head">Сохраненные формы пользователя</div>
          <div className="atree">
            {tree.length ? tree.map(([mod, subs]) => {
              const mo = openF.has(mod);
              return (
                <div key={mod}>
                  <div className="atree__node" onClick={() => toggle(mod)}>
                    <span className="tw">{mo ? "−" : "+"}</span><YFolder /><span>{mod}</span>
                  </div>
                  {mo && subs.map(([sub, forms]) => {
                    const sk = mod + "/" + sub;
                    const so = openF.has(sk);
                    return (
                      <div key={sk}>
                        <div className="atree__node" style={{ paddingLeft: 30 }} onClick={() => toggle(sk)}>
                          <span className="tw">{so ? "−" : "+"}</span><YFolder /><span>{sub}</span>
                        </div>
                        {so && forms.map((fm) => (
                          <div key={fm.UV_ID}
                            className={"uv-leaf" + (sel?.UV_ID === fm.UV_ID ? " sel" : "")}
                            style={{ paddingLeft: 56 }}
                            onClick={() => setSel(fm)}>
                            <Star />
                            <span className="uv-name">{fm.UV_NAME}</span>
                            <OpenBtn />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            }) : <div className="atree__empty">Список пустой</div>}
          </div>
        </div>

        <div className="apane">
          <div className="apane__head">Сохраненная форма / набор установок</div>
          <div className="apane__content">
            {sel ? (
              <div className="uv-form">
                <div className="uv-row"><label>Имя набора</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="uv-row"><label>Введено</label><input value={sel.UV_AUTHOR || sel.USER_NAME || ""} readOnly /></div>
                <div className="uv-row"><label>Время сервера БД</label><input value={sel.DB_TIME || ""} readOnly /></div>
                <div className={"uv-public" + (Number(sel.UV_PUBLIC) ? " on" : "")}
                  onClick={() => setSel({ ...sel, UV_PUBLIC: Number(sel.UV_PUBLIC) ? 0 : 1 })}>
                  <span>Общий</span>
                  <span className="uv-check">{Number(sel.UV_PUBLIC) ? "✓" : ""}</span>
                </div>
                <div className="uv-btns">
                  <button className="uv-save" onClick={save}>Сохранить</button>
                  <button className="uv-del" onClick={remove}>Удалить выделенные</button>
                </div>
              </div>
            ) : (
              <div className="aempty" style={{ fontSize: 14 }}>Выберите сохранённую форму слева</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
