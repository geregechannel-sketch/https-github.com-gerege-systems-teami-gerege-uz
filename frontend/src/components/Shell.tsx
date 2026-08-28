import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { MENU, DICTS, MenuNode } from "../menu";
import { api } from "../api";

function toggleTheme() {
  const r = document.documentElement;
  const next = r.getAttribute("data-theme") === "dark" ? "light" : "dark";
  r.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {}
}

function Node({ node, depth }: { node: MenuNode; depth: number }) {
  const [open, setOpen] = useState(depth === 0 ? false : true);
  const nav = useNavigate();
  const loc = useLocation();
  const target = node.model ? `/m/${node.model}` : node.path;
  const active = target && loc.pathname === target;

  if (node.children) {
    return (
      <div>
        <div
          className="toshi-menu__item"
          style={{ paddingLeft: 12 + depth * 12, cursor: "pointer", justifyContent: "space-between" }}
          onClick={() => setOpen(!open)}
        >
          <span>{node.label}</span>
          <span style={{ opacity: 0.6 }}>{open ? "▾" : "▸"}</span>
        </div>
        {open && node.children.map((c, i) => <Node key={i} node={c} depth={depth + 1} />)}
      </div>
    );
  }
  return (
    <div
      className={"toshi-menu__item" + (active ? " is-active" : "")}
      style={{ paddingLeft: 12 + depth * 12, cursor: "pointer" }}
      onClick={() => target && nav(target)}
    >
      {node.label}
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const user = (() => {
    try {
      return localStorage.getItem("userName") || "ERDENEBATT";
    } catch {
      return "ERDENEBATT";
    }
  })();
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <nav className="toshi-menu" style={{ width: 240, flex: "0 0 240px", overflowY: "auto" }}>
        <Link to="/" style={{ display: "block", padding: "14px 16px", fontWeight: 700, color: "#fff", textDecoration: "none" }}>
          TEAMI ENTERPRISE <span style={{ opacity: 0.6, fontSize: 11 }}>3.0</span>
        </Link>
        {MENU.map((n, i) => <Node key={i} node={n} depth={0} />)}
        <div style={{ padding: "10px 16px", opacity: 0.5, fontSize: 11, marginTop: 12 }}>СПРАВОЧНИКИ</div>
        {DICTS.map((n, i) => <Node key={"d" + i} node={n} depth={1} />)}
      </nav>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header className="toshi-header" style={{ flex: "0 0 auto" }}>
          <button className="toshi-header__btn" onClick={() => nav(-1)}>←</button>
          <strong style={{ color: "var(--textColorHover)", letterSpacing: 1 }}>TOSH ELECTROAPPARAT</strong>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="toshi-header__btn" title="Тема" onClick={toggleTheme}>◐</button>
            <button className="toshi-header__btn">{user}</button>
            <button
              className="toshi-header__btn"
              title="Гарах"
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
