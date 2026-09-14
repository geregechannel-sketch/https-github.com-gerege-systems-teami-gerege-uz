import { useState } from "react";
import snapshot from "./teamiGisSnapshot.json";
import Basemap from "./Basemap";

const located = snapshot.points.filter(p => p.longitude !== null && p.latitude !== null);
const project = (longitude: number, latitude: number) => [longitude * Math.PI / 180, Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360))];
const positions = located.map(p => project(p.longitude!, p.latitude!));
const xs = positions.map(p => p[0]), ys = positions.map(p => p[1]);
const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
const scale = Math.min(880 / (maxX - minX || 1), 450 / (maxY - minY || 1));
const xy = (longitude: number, latitude: number) => { const [x,y] = project(longitude,latitude); return [500 + (x-(minX+maxX)/2)*scale, 275-(y-(minY+maxY)/2)*scale]; };

export default function GisConnection() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [onlyLocated, setOnlyLocated] = useState(false);
  const webMode = location.protocol === "http:" || location.protocol === "https:";
  const [basemap, setBasemap] = useState(webMode);
  const rows = snapshot.points.filter(p => (!onlyLocated || p.longitude !== null) && `${p.name} ${p.id}`.toLowerCase().includes(query.toLowerCase()));
  const point = snapshot.points.find(p => p.id === selected);
  const focus = point?.longitude != null ? xy(point.longitude,point.latitude!) : [500,275];
  return <section>
    <h2>GIS — {snapshot.map.OBJ_NAME}</h2>
    <p><b>TEAMI-ийн хадгалсан бодит GIS хариу</b> · {snapshot.capturedAt}. Шууд шинэчлэлт биш.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
      <input className="toshi-input" aria-label="GIS цэг хайх" placeholder="Объектын нэр эсвэл ID" value={query} onChange={e => setQuery(e.target.value)} style={{ minWidth: 300 }} />
      <label><input type="checkbox" checked={onlyLocated} onChange={e => setOnlyLocated(e.target.checked)} /> Координаттай цэгүүд</label>
      <button className="toshi-btn" onClick={() => setZoom(z => Math.min(4,z+0.5))}>Томруулах +</button>
      <button className="toshi-btn" onClick={() => setZoom(z => Math.max(1,z-0.5))}>Жижигрүүлэх −</button>
      <button className="toshi-btn" onClick={() => {setZoom(1);setSelected(null);setQuery("");setOnlyLocated(false);}}>Бүгдийг харах</button>
    </div>
    <p>Төлөвтэй: <b>{snapshot.points.length}</b> · Байрлуулах боломжтой: <b>{located.length}</b> · Координат буруу: <b>{snapshot.points.filter(p=>p.coordinateError).length}</b> · Координат ирээгүй: <b>{snapshot.points.length-snapshot.coordinateResponseCount}</b>.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {snapshot.summary.map((r,i) => <div key={i} style={{ padding: 12, background: "#edf2f7", color: "#24344a", borderRadius: 6 }}>{r.label}: <b>{r.value ?? "—"}</b></div>)}
    </div>
    <p>STATUS кодын тайлбар баталгаажаагүй тул цэгүүдийг ижил өнгөөр харуулна. Суурь зураг интернэтээс ачаалагдана; тоолуурын заалт шинэчлэгдэхгүй.</p>
    <button className="toshi-btn" disabled={!webMode} onClick={()=>setBasemap(v=>!v)}>{basemap ? "Координатын зураглал" : "OpenStreetMap суурь зураг"}</button>
    {!webMode && <p>Суурь зургийг харахын тулд ZIP-ээ задлаад START_MAP.cmd ажиллуулна. Дотоод вэб хаягаар нээгдэнэ.</p>}
    {basemap && webMode ? <Basemap points={rows} selected={selected} onSelect={setSelected} /> : <>
    <svg viewBox={`${zoom===1?0:focus[0]-500/zoom} ${zoom===1?0:focus[1]-275/zoom} ${1000/zoom} ${550/zoom}`} role="img" aria-label={`TEAMI-ийн ${located.length} зөв координаттай объектын зураглал`} style={{ width: "100%", height: 480, background: "#eaf0f5", border: "1px solid #bbc9d5" }}>
      {Array.from({length:11},(_,i)=><line key={'v'+i} x1={i*100} y1={0} x2={i*100} y2={550} stroke="#d7e0e8" />)}
      {Array.from({length:6},(_,i)=><line key={'h'+i} x1={0} y1={i*100} x2={1000} y2={i*100} stroke="#d7e0e8" />)}
      {located.filter(p=>rows.some(r=>r.id===p.id)).map(p=> {const [x,y]=xy(p.longitude!,p.latitude!);return <g key={p.id} role="button" tabIndex={0} aria-label={p.name} onClick={()=>setSelected(p.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(p.id);}}} style={{cursor:'pointer'}}>
        <circle cx={x} cy={y} r={(selected===p.id?10:6)/zoom} fill={selected===p.id?'#d57914':'#2375b5'} stroke="white" strokeWidth={2/zoom}/><title>{p.name} · STATUS {p.status}</title>
      </g>;})}
    </svg>
    </>}
    <p>Хойд зүг ↑ · Хайлт цэгүүдийг шүүнэ. Цэгийг дарахад дэлгэрэнгүй нээгдэнэ; томруулах нь сонгосон цэгт төвлөрнө.</p>
    {point && <aside style={{padding:16,border:'1px solid #8caac4',marginBottom:18}}>
      <h3>{point.name}</h3><p>Объектын ID: {point.id} · Эхийн STATUS: {point.status ?? '—'}</p>
      <p>Уртраг: {point.longitude ?? 'Энэ хариунд ирээгүй'} · Өргөрөг: {point.latitude ?? 'Энэ хариунд ирээгүй'}</p>
      {point.coordinateError && <p role="alert">{point.coordinateError}: X = {point.rawLongitude}, Y = {point.rawLatitude}. Координатыг тааж засаагүй; цэгийг зурагт байрлуулаагүй.</p>}
      <p>Энэ ID-г TOSH-ийн дотоод POINT_ID-тай тулган баталгаажуулаагүй.</p>
    </aside>}
    <p><a href="http://82.215.77.202:8080/teami/GIS_V2" target="_blank" rel="noopener noreferrer">Бодит TEAMI GIS нээх ↗</a> · <a href="https://toshi.gerege.mn/gis" target="_blank" rel="noopener noreferrer">Бодит TOSH GIS нээх ↗</a></p>
    <p>Хайлтад: {rows.length} цэг. 87/85 нь эхийн нэгтгэл; 40 нь энэ GIS хариунд координаттай объектын тоо. Эдгээр тоог ижил утгаар ашиглахгүй.</p>
    <div style={{overflow:'auto',maxHeight:400}}><table className="toshi-grid" style={{width:'100%'}}><thead><tr><th>Объект</th><th>Эхийн STATUS</th><th>Уртраг</th><th>Өргөрөг</th><th></th></tr></thead><tbody>
      {rows.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.status ?? '—'}</td><td>{p.longitude ?? '—'}</td><td>{p.latitude ?? '—'}</td><td><button className="toshi-btn" onClick={()=>setSelected(p.id)}>Сонгох</button></td></tr>)}
    </tbody></table></div>
  </section>;
}
