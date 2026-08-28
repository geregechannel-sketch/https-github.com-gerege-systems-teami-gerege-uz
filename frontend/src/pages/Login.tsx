import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Login() {
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const env = await api.login(login, password);
    setBusy(false);
    if (env.success) {
      try {
        localStorage.setItem("userName", String((env.data as any)?.USER_NAME || login).toUpperCase());
      } catch {}
      nav("/");
    } else {
      setErr(env.message || "Нэвтрэх амжилтгүй");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bodyBg)" }}>
      <form onSubmit={submit} className="toshi-card" style={{ width: 340, background: "var(--loginFormBg)" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: "var(--textColorHover)" }}>
            TOSH<span style={{ opacity: 0.7 }}>ELECTROAPPARAT</span>
          </div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>TEAMI Enterprise 3.0</div>
        </div>
        <label style={{ fontSize: 12 }}>Логин</label>
        <input className="toshi-input" style={{ width: "100%", marginBottom: 10 }} value={login} onChange={(e) => setLogin(e.target.value)} />
        <label style={{ fontSize: 12 }}>Пароль</label>
        <input
          className="toshi-input"
          type="password"
          style={{ width: "100%", marginBottom: 14 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {err && <div style={{ color: "var(--btnRedBg)", fontSize: 12, marginBottom: 10 }}>{err}</div>}
        <button className="toshi-btn toshi-btn--green" style={{ width: "100%" }} disabled={busy}>
          {busy ? "..." : "Войти"}
        </button>
      </form>
    </div>
  );
}
