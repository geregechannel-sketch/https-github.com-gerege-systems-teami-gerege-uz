import { Link, useNavigate, useLocation } from "react-router-dom";
import { MENU, DICTS, MenuNode } from "../menu";
import { api } from "../api";
import "../menu.css";
import logo from "../assets/logo.png";
import {
  MENU_ICONS, IcEyeSlash, IcUser, IcInfo, IcChart, IcMonitor, IcSliders,
  IcMoon, IcHelpCircle, IcLogout, IcResize,
} from "../icons";

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
  const Ico = node.icon ? MENU_ICONS[node.icon] : null;

  return (
    <li className="tm-item">
      <div
        className={"tm-link" + (active ? " is-active" : "")}
        onClick={() => (t ? nav(t) : undefined)}
      >
        {Ico && <span className="tm-ico"><Ico size={16} /></span>}
        <span className="tm-label">{node.label}</span>
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

export default function Shell({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const user = (() => {
    try {
      return localStorage.getItem("userName") || "ADMIN";
    } catch {
      return "ADMIN";
    }
  })();

  const hbtn = (title: string, node: React.ReactNode, onClick?: () => void) => (
    <button className="toshi-header__btn" title={title} onClick={onClick}>{node}</button>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <nav className="tm-menu">
        <Link to="/" className="tm-brand">
          TEAMI ENTERPRISE <small>3.0</small>
        </Link>
        <div className="tm-body">
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
        </div>
        <div className="tm-foot">
          <img src={logo} alt="TOSH ELECTROAPPARAT" className="tm-foot__logo" />
          <div className="tm-status">
            <span>Статус:</span>
            <b style={{ color: "#fff" }}>0</b><span className="tm-status__sep">/</span>
            <b style={{ color: "#2ecc71" }}>0</b><span className="tm-status__sep">/</span>
            <b style={{ color: "#f39c12" }}>0</b><span className="tm-status__sep">/</span>
            <b style={{ color: "#e74c3c" }}>0</b>
            <span className="sp" style={{ flex: 1 }} />
            <IcResize size={13} color="#fff" />
          </div>
        </div>
      </nav>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header className="toshi-header" style={{ flex: "0 0 auto", justifyContent: "space-between", position: "relative" }}>
          <button className="toshi-header__btn" title="Меню">☰</button>
          <img src={logo} alt="TOSH ELECTROAPPARAT" style={{ height: 46, position: "absolute", left: "50%", transform: "translateX(-50%)" }} />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {hbtn("Скрыть", <IcEyeSlash size={16} />)}
            {hbtn("Профиль", <span style={{ display: "flex", alignItems: "center", gap: 6 }}><IcUser size={15} /> {user}</span>)}
            {hbtn("Инфо", <IcInfo size={15} />)}
            {hbtn("Статистика", <IcChart size={15} />)}
            {hbtn("Сообщения", <IcMonitor size={15} />)}
            {hbtn("Настройки", <IcSliders size={15} />)}
            {hbtn("Тема", <IcMoon size={16} />, toggleTheme)}
            {hbtn("Помощь", <IcHelpCircle size={15} />)}
            {hbtn("Выход", <IcLogout size={15} />, () => { api.logout(); nav("/login"); })}
          </div>
        </header>
        <main className="toshi-content" style={{ flex: 1, overflow: "auto", padding: 18 }}>{children}</main>
      </div>
    </div>
  );
}
