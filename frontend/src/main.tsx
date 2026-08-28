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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route path="/archives" element={<Protected><Archives /></Protected>} />
        <Route path="/gis" element={<Protected><Gis /></Protected>} />
        <Route path="/m/:model" element={<Protected><Module /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
