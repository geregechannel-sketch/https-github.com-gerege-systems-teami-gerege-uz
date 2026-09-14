import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import Shell from "../components/Shell";
import Dashboard from "../pages/Dashboard";
import Archives from "../pages/Archives";
import Quality from "../pages/Quality";
import Points from "../pages/Points";
import { previewDay } from "./api";
import "../theme.css";

function Unavailable() {
  return <section><h2>Энэ хэсэг үзүүлэнд холбогдоогүй</h2>
    <p>Тарифын бодит төлбөр, GIS-ийн бодит байршил, автомат таталт, серверийн эрх болон аудитын хамгаалалтыг энэ үзүүлэн батлахгүй.</p>
    <Link to="/">Нүүр рүү буцах</Link></section>;
}
function Preview() {
  return <HashRouter><Shell>
    <aside style={{ background: "#fff3cd", color: "#382900", padding: 16, border: "1px solid #d6a533", marginBottom: 18 }}>
      <strong>TOSH — серверт байрлуулахаас өмнөх үзүүлэн</strong>
      <p>Зөвхөн зохиомол өгөгдөлтэй. Нууц үг шаардлагагүй. TEAMI/TOSH серверт хүсэлт илгээхгүй.</p>
      <p>Архив ба чанарыг үзэхдээ <b>{previewDay}</b> өдрийг эхлэл, төгсгөлд сонгоно. DEMO тоолуур → параметр → Просмотр / Показать.</p>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        <Link to="/">Нүүр</Link><Link to="/archives">Архив</Link><Link to="/m/qualityreports">Заалтын чанар</Link><Link to="/m/points">Тоолуур</Link>
      </nav>
    </aside>
    <Routes><Route path="/" element={<Dashboard />} /><Route path="/archives" element={<Archives />} />
      <Route path="/m/qualityreports" element={<Quality />} /><Route path="/m/points" element={<Points />} />
      <Route path="*" element={<Unavailable />} /></Routes>
  </Shell></HashRouter>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
