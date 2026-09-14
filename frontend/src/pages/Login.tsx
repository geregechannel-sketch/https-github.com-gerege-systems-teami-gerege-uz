import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import logo from "../assets/logo.png";
import "../login.css";

const LANGS = [
  { v: "ru", label: "Русский" },
  { v: "en", label: "English" },
  { v: "uz", label: "Oʻzbek" },
  { v: "mn", label: "Монгол" },
];

export default function Login() {
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("");
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("lang") || "ru";
    } catch {
      return "ru";
    }
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const env = await api.login(login.trim(), password);
    setBusy(false);
    if (env.success) {
      try {
        localStorage.setItem("userName", String((env.data as any)?.USER_NAME || login).toUpperCase());
        localStorage.setItem("lang", lang);
      } catch {}
      nav("/", { replace: true });
    } else {
      setErr(env.message || "Неверный логин или пароль");
    }
  }

  return (
    <div className="login-bg">
      <form onSubmit={submit} className="login-card">
        <img src={logo} alt="TOSH ELECTROAPPARAT" className="login-logo" />
        <div className="login-sub">
          TEAMI Enterprise <b>3.0</b>
          <div style={{ opacity: 0.6, fontSize: 12, marginTop: 2 }}>
            Система учета энергоресурсов
          </div>
        </div>

        <label className="login-label">Логин</label>
        <input
          className="toshi-input login-input"
          value={login}
          autoFocus
          onChange={(e) => setLogin(e.target.value)}
          placeholder="Логин"
        />

        <label className="login-label">Пароль</label>
        <input
          className="toshi-input login-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
        />

        <label className="login-label">Язык</label>
        <select
          className="toshi-select login-input"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
        >
          {LANGS.map((l) => (
            <option key={l.v} value={l.v}>
              {l.label}
            </option>
          ))}
        </select>

        {err && <div className="login-err">{err}</div>}

        <button className="toshi-btn toshi-btn--green login-btn" disabled={busy}>
          {busy ? "Вход…" : "Войти"}
        </button>

        <div className="login-foot">© TOSH ELECTROAPPARAT · Powered by EC3</div>
      </form>
    </div>
  );
}
