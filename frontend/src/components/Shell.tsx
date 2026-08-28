import { Link, useNavigate, useLocation } from "react-router-dom";
import { MENU, DICTS, MenuNode } from "../menu";
import { api } from "../api";
import "../menu.css";
import logo from "../assets/logo.png";

function toggleTheme() {
  const r = document.documentElement;
  const next = r.getAttribute("data-theme") === "dark" ? "light" : "dark";
  r.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {}
}

function target(n: MenuNode): string | undefined {
  return n.model ? `/m/${n.model}` : n.path;
}

function Item({ node }: { node: MenuNode }) {
  const nav = useNavigate();
  const loc = useLocation();
  const t = target(node);
  const active = t && loc.pathname === t;
  const hasChildren = !!node.children?.length;

  return (
    <li className="tm-item">
      <div
        className={"tm-link" + (active ? " is-active" : "")}
        onClick={() => (t ? nav(t) : undefined)}
      >
        <span>{node.label}</span>
        {hasChildren && <span className="tm-caret">▸</span>}
      </div>
      {hasChildren && (
        <ul className="tm-flyout">
          {node.children!.map((c, i) => (
            <Item key={i} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
}

const HEADER_ICONS = [
  { t: "Инфо", i: "ℹ" },
  { t: "Статистика", i: "▤" },
  { t: "Сообщения", i: "✉" },
  { t: "Настройки", i: "⚙" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const user = (() => {
    try {
      return localStorage.getItem("userName") || "ADMIN";
    } catch {
      return "ADMIN";
    }
  })();
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <nav className="tm-menu">
        <Link to="/" className="tm-brand">
          TEAMI ENTERPRISE <small>3.0</small>
        </Link>
        <ul className="tm-list">
          {MENU.map((n, i) => (
            <Item key={i} node={n} />
          ))}
        </ul>
        <div className="tm-section">СПРАВОЧНИКИ</div>
        <ul className="tm-list">
          {DICTS.map((n, i) => (
            <Item key={"d" + i} node={n} />
          ))}
        </ul>
      </nav>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header className="toshi-header" style={{ flex: "0 0 auto", justifyContent: "space-between", position: "relative" }}>
          <button className="toshi-header__btn" title="Меню">☰</button>
          <img src={logo} alt="TOSH ELECTROAPPARAT" style={{ height: 46, position: "absolute", left: "50%", transform: "translateX(-50%)" }} />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button className="toshi-header__btn" title="Профиль">👤 {user}</button>
            {HEADER_ICONS.map((h, i) => (
              <button key={i} className="toshi-header__btn" title={h.t}>{h.i}</button>
            ))}
            <button className="toshi-header__btn" title="Тема" onClick={toggleTheme}>☾</button>
            <button className="toshi-header__btn" title="Помощь">?</button>
            <button
              className="toshi-header__btn"
              title="Выход"
              onClick={() => {
                api.logout();
                nav("/login");
              }}
            >
              ⎋
            </button>
          </div>
        </header>
        <main className="toshi-content" style={{ flex: 1, overflow: "auto", padding: 18 }}>{children}</main>
      </div>
    </div>
  );
}
