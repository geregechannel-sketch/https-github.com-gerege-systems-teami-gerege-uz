import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import "../archives.css";
import { IcExpand, IcCollapse } from "../icons";

type Row = Record<string, any>;
const ORDER = ["Просмотр архивов", "Качество показаний", "Считывание показаний", "Конфигурация системы", "Регистр событий", "Отчеты"];

function YFolder() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden style={{ flex: "0 0 16px" }}>
      <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" fill="#f2c14e" stroke="#d9a520" strokeWidth="0.6" />
    </svg>
  );
}

export default function SavedForms() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Row | null>(null);

  useEffect(() => {
    api.get("usersettings").then((e) => setRows((e.data as Row[]) || []));
  }, []);

  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    rows.forEach((r) => {
      const k = r.UV_MODULE || "Прочее";
      (m.get(k) || m.set(k, []).get(k)!).push(r);
    });
    return [...m.entries()].sort((a, b) => {
      const ia = ORDER.indexOf(a[0]), ib = ORDER.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [rows]);

  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

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
            {groups.length ? groups.map(([mod, forms]) => {
              const o = open.has(mod);
              return (
                <div key={mod}>
                  <div className="atree__node" onClick={() => toggle(mod)}>
                    <span className="tw">{o ? "−" : "+"}</span>
                    <YFolder />
                    <span>{mod}</span>
                  </div>
                  {o && forms.map((fm) => (
                    <div key={fm.UV_ID}
                      className={"atree__item" + (sel?.UV_ID === fm.UV_ID ? " sel" : "")}
                      style={{ paddingLeft: 44 }}
                      onClick={() => setSel(fm)}>
                      📄 {fm.UV_NAME}
                    </div>
                  ))}
                </div>
              );
            }) : <div className="atree__empty">Список пустой</div>}
          </div>
        </div>

        <div className="apane">
          <div className="apane__content">
            {sel ? (
              <div style={{ padding: 16, fontSize: 13 }}>
                <h3 style={{ marginTop: 0, color: "var(--btnLightblueBg)" }}>{sel.UV_NAME}</h3>
                <table className="toshi-grid" style={{ fontSize: 12 }}>
                  <tbody>
                    <tr><td style={{ opacity: .7, paddingRight: 14 }}>Модуль</td><td><b>{sel.UV_MODULE}</b></td></tr>
                    <tr><td style={{ opacity: .7 }}>Тип</td><td>{sel.UV_TYPE || "—"}</td></tr>
                    <tr><td style={{ opacity: .7 }}>Владелец</td><td>{sel.USER_NAME}</td></tr>
                    <tr><td style={{ opacity: .7 }}>Публичная</td><td>{Number(sel.UV_PUBLIC) ? "Да" : "Нет"}</td></tr>
                    <tr><td style={{ opacity: .7 }}>Изменена</td><td>{sel.DB_TIME}</td></tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="aempty" style={{ fontSize: 14 }}>Выберите сохранённую форму слева</div>
            )}
          </div>
        </div>
      </div>

      <div className="aw__actions">
        <button className="abtn blue" disabled={!sel}>Открыть в этом окне</button>
        <button className="abtn blue" disabled={!sel}>Открыть в новом окне</button>
      </div>
    </div>
  );
}
