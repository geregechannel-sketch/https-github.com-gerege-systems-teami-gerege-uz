import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./theme.css";
import { getToken } from "./api";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Module from "./pages/Module";
import Gis from "./pages/Gis";
import Archives from "./pages/Archives";
import Quality from "./pages/Quality";
import Points from "./pages/Points";
import SavedForms from "./pages/SavedForms";
import QualityReports from "./pages/QualityReports";
import Readings from "./pages/Readings";
import EventLog from "./pages/EventLog";
import Reports from "./pages/Reports";
import Telesignals from "./pages/Telesignals";
import Schemes from "./pages/Schemes";
import LoadControl from "./pages/LoadControl";
import Meters from "./pages/Meters";
import Monitor from "./pages/Monitor";

// Theme init (mirrors the real app).
try {
  const t = localStorage.getItem("theme");
  if (t) document.documentElement.setAttribute("data-theme", t);
} catch {}

function Protected({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  if (!getToken()) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <Shell>{children}</Shell>;
}

// monitor.toshi.gerege.mn serves the same bundle; there "/" is the full-screen monitor.
const IS_MONITOR_HOST = location.hostname.startsWith("monitor.");

function Bare({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  if (!getToken()) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={IS_MONITOR_HOST ? <Bare><Monitor /></Bare> : <Protected><Dashboard /></Protected>} />
        <Route path="/monitor" element={<Bare><Monitor /></Bare>} />
        <Route path="/archives" element={<Protected><Archives /></Protected>} />
        <Route path="/gis" element={<Protected><Gis /></Protected>} />
        <Route path="/saved" element={<Protected><SavedForms /></Protected>} />
        <Route path="/quality_reports" element={<Protected><QualityReports /></Protected>} />
        <Route path="/show" element={<Protected><Readings /></Protected>} />
        <Route path="/events/:category" element={<Protected><EventLog /></Protected>} />
        <Route path="/reports/:mode" element={<Protected><Reports /></Protected>} />
        <Route path="/telesignals/:mode" element={<Protected><Telesignals /></Protected>} />
        <Route path="/schemes/:mode" element={<Protected><Schemes /></Protected>} />
        <Route path="/load-control/:mode" element={<Protected><LoadControl /></Protected>} />
        <Route path="/meters" element={<Protected><Meters /></Protected>} />
        <Route path="/m/points" element={<Protected><Points /></Protected>} />
        <Route path="/m/qualityreports" element={<Protected><Quality /></Protected>} />
        <Route path="/m/:model/*" element={<Protected><Module /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// StrictMode intentionally omitted: it double-invokes effects, which breaks the
// MapLibre map lifecycle (create -> remove -> create) on the GIS screen.
createRoot(document.getElementById("root")!).render(<App />);
