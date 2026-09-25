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
] as const;

const COPY = {
  ru: {
    subtitle: "Система учета энергоресурсов",
    login: "Логин",
    password: "Пароль",
    language: "Язык",
    submit: "Войти",
    submitting: "Вход…",
    invalidCredentials: "Неверный логин или пароль",
    loginFailed: "Не удалось войти. Повторите попытку.",
  },
  en: {
    subtitle: "Energy resource accounting system",
    login: "Login",
    password: "Password",
    language: "Language",
    submit: "Sign in",
    submitting: "Signing in…",
    invalidCredentials: "Incorrect login or password",
    loginFailed: "Could not sign in. Please try again.",
  },
  uz: {
    subtitle: "Energiya resurslarini hisobga olish tizimi",
    login: "Login",
    password: "Parol",
    language: "Til",
    submit: "Kirish",
    submitting: "Kirilmoqda…",
    invalidCredentials: "Login yoki parol notoʻgʻri",
    loginFailed: "Tizimga kirib bo'lmadi. Qayta urinib ko'ring.",
  },
  mn: {
    subtitle: "Эрчим хүчний нөөцийн бүртгэлийн систем",
    login: "Нэвтрэх нэр",
    password: "Нууц үг",
    language: "Хэл",
    submit: "Нэвтрэх",
    submitting: "Нэвтэрч байна…",
    invalidCredentials: "Нэвтрэх нэр эсвэл нууц үг буруу байна",
    loginFailed: "Нэвтэрч чадсангүй. Дахин оролдоно уу.",
  },
} as const;

type Lang = keyof typeof COPY;
type LoginError = "invalidCredentials" | "loginFailed";

function readLanguage(): Lang {
  try {
    const saved = localStorage.getItem("lang");
    if (saved && saved in COPY) return saved as Lang;
  } catch {}
  return "ru";
}

export default function Login() {
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("");
  const [lang, setLang] = useState<Lang>(readLanguage);
  const [error, setError] = useState<LoginError | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const text = COPY[lang];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const env = await api.login(login.trim(), password);
    setBusy(false);
    if (env.success) {
      try {
        localStorage.setItem("userName", String((env.data as any)?.USER_NAME || login).toUpperCase());
        localStorage.setItem("lang", lang);
      } catch {}
      nav("/", { replace: true });
    } else {
      setError(env.message?.trim().toLowerCase() === "invalid credentials" ? "invalidCredentials" : "loginFailed");
    }
  }

  function changeLanguage(next: Lang) {
    setLang(next);
    try {
      localStorage.setItem("lang", next);
    } catch {}
  }

  return (
    <div className="login-bg">
      <form onSubmit={submit} className="login-card" lang={lang}>
        <img src={logo} alt="TOSH ELECTROAPPARAT" className="login-logo" />
        <div className="login-sub">
          TEAMI Enterprise <b>3.0</b>
          <div style={{ opacity: 0.6, fontSize: 12, marginTop: 2 }}>
            {text.subtitle}
          </div>
        </div>

        <label className="login-label" htmlFor="login-user">{text.login}</label>
        <input
          id="login-user"
          className="toshi-input login-input"
          value={login}
          autoFocus
          autoComplete="username"
          onChange={(e) => setLogin(e.target.value)}
          placeholder={text.login}
        />

        <label className="login-label" htmlFor="login-password">{text.password}</label>
        <input
          id="login-password"
          className="toshi-input login-input"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder={text.password}
        />

        <label className="login-label" htmlFor="login-language">{text.language}</label>
        <select
          id="login-language"
          className="toshi-select login-input"
          value={lang}
          onChange={(e) => changeLanguage(e.target.value as Lang)}
        >
          {LANGS.map((l) => (
            <option key={l.v} value={l.v}>
              {l.label}
            </option>
          ))}
        </select>

        {error && <div className="login-err" role="alert">{text[error]}</div>}

        <button type="submit" className="toshi-btn toshi-btn--green login-btn" disabled={busy}>
          {busy ? text.submitting : text.submit}
        </button>

        <div className="login-foot">© TOSH ELECTROAPPARAT · Powered by EC3</div>
      </form>
    </div>
  );
}
