import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { MENU } from "../menu";

interface Tile {
  TITLE: string;
  STAT: string;
  COLOR?: string;
  DATE_VALUE?: string;
}

export default function Dashboard() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    api.post<Tile[]>("homedashboard/data", {}).then((e) => e.success && setTiles(e.data || []));
  }, []);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
        {tiles.map((t, i) => (
          <div key={i} className="toshi-stat" style={{ background: t.COLOR || "var(--btnGreenBg)" }}>
            <div>{t.TITLE}</div>
            {t.DATE_VALUE && <div style={{ fontSize: 12, opacity: 0.85 }}>{t.DATE_VALUE}</div>}
            <div className="toshi-stat__value">{t.STAT}</div>
          </div>
        ))}
      </div>

      <h3 style={{ color: "var(--textColorHover)", margin: "22px 0 10px" }}>Модули</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
        {MENU.map((m, i) => {
          const target = m.model ? `/m/${m.model}` : m.path || "/";
          return (
            <div key={i} className="toshi-card">
              <div className="toshi-card__title">{m.label}</div>
              <div style={{ minHeight: 30, opacity: 0.7, fontSize: 12 }}>
                {m.children ? `${m.children.length} дэд хэсэг` : "Модуль"}
              </div>
              <div style={{ marginTop: 8 }}>
                <button className="toshi-btn toshi-btn--lightblue" onClick={() => nav(target)}>
                  Открыть
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
