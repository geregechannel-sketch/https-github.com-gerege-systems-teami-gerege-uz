import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import Shell from "../components/Shell";
import Archives from "../pages/Archives";
import Quality from "../pages/Quality";
import SourceComparison from "./SourceComparison";
import GisConnection from "./GisConnection";
import {WindowCatalogue,CapturedWindow,CapturedDashboard,EvidenceBrowser} from "./Windows";
import "../theme.css";
function Preview(){return <HashRouter><Shell>
  <div className="preview-notice"><strong>TOSH — HAR-д тулгуурласан үзүүлэн</strong>
    <nav><Link to="/windows">Бүх цонх</Link><Link to="/dashboard">Нүүр</Link><Link to="/archives">Бодит архив</Link><Link to="/gis">GIS</Link><Link to="/m/points">87 цэг</Link><Link to="/evidence">HAR хүснэгтүүд</Link></nav>
    <details><summary>Өгөгдлийн тайлбар</summary><p>TEAMI-ийн хадгалсан бодит хариу; шууд шинэчлэгдэхгүй. Байхгүй үр дүнг тусгайлан тэмдэглэнэ. Суурь зураг интернэтээс ачаалагдана. Save/Delete/Command/Relay үйлдэл идэвхгүй.</p><Link to="/demo/archives">Зохиомол архивын туршилт</Link> · <Link to="/demo/quality">Зохиомол чанарын туршилт</Link></details>
  </div>
  <Routes><Route path="/" element={<CapturedDashboard/>}/><Route path="/dashboard" element={<CapturedDashboard/>}/><Route path="/windows" element={<WindowCatalogue/>}/>
    <Route path="/archives" element={<SourceComparison/>}/><Route path="/gis" element={<GisConnection/>}/>
    <Route path="/evidence" element={<EvidenceBrowser/>}/>
    <Route path="/demo/archives" element={<Archives/>}/><Route path="/demo/quality" element={<Quality/>}/>
    <Route path="/m/:model" element={<CapturedWindow/>}/><Route path="/saved" element={<CapturedWindow/>}/><Route path="*" element={<WindowCatalogue/>}/>
  </Routes></Shell></HashRouter>}
createRoot(document.getElementById("root")!).render(<Preview/>);
