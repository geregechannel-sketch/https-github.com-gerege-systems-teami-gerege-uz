import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MENU, DICTS, MenuNode } from "../menu";
import captures from "./moduleSnapshots.json";
import points from "./teamiPointsSnapshot.json";
import "./windows.css";

type Row = Record<string, unknown>;
type Capture = { capturedAt: string; sourceFile: string; scope: string; rows: Row[] };
const sources = captures as Record<string, Capture>;
export const windows: { route: string; label: string; group: string }[] = [];
function collect(nodes: MenuNode[], group: string) {
  for (const n of nodes) {
    const route = n.model ? `/m/${n.model}` : n.path;
    if (route && !windows.some(w => w.route === route)) windows.push({ route, label: n.label, group });
    if (n.children) collect(n.children, n.label);
  }
}
collect(MENU, "Үндсэн цэс");collect(DICTS, "Лавлахууд");
const mapping: Record<string,string[]> = {
  '/saved':['userviews/groups'], '/m/groups':['pointmenuv2/groups'],
  '/m/grouptypes':['grouptypes'], '/m/pointtypes':['pointtypes'], '/m/measuringdevicetypes':['measuringdevicetypes'],
  '/m/ecocategories':['ecocategories'], '/m/measurelinessets':['measurelinessets'],
  '/m/discretesignals':['pointmenuv2/signals'], '/m/qualityreports':['exchangeaddresses/quality','profilesdata/rm_ffp_data'],
};
const labels:Record<string,string> = {
  POINT_NAME:'Цэгийн нэр',POINT_CODE:'Цэгийн код',METER_NUMBER:'Тоолуурын дугаар',METER_TYPE_NAME:'Тоолуурын төрөл',METER_TYPE_PRODUCER:'Үйлдвэрлэгч',
  MOU_BT:'Суурилуулалтын эхлэл',MOU_ET:'Суурилуулалтын төгсгөл',POINT_TYPE_NAME:'Цэгийн төрөл',GR_NAME:'Бүлгийн нэр',GR_CODE:'Бүлгийн код',
  GR_TYPE_NAME:'Бүлгийн төрөл',GR_TYPE_CODE:'Төрлийн код',POINT_TYPE_CODE:'Төрлийн код',EC_NAME:'Ангиллын нэр',EC_CODE:'Ангиллын код',
  MLSET_NAME:'Хэмжилтийн багц',MLSET_CODE:'Багцын код',FFP_DATA_NAME:'Талбарын тайлбар',UV_GROUP:'Хадгалсан хэлбэрийн бүлэг',
};
const title:Record<string,string>={'userviews/groups':'Хадгалсан хэлбэрийн бүлгүүд — хэлбэрийн агуулга биш','exchangeaddresses/quality':'Чанарын хүсэлтийн хариу','profilesdata/rm_ffp_data':'Чанарын талбарын тайлбар — хэмжилтийн үр дүн биш','pointmenuv2/groups':'Сонгосон мөчрийн бүлгүүд','pointmenuv2/signals':'Сонгосон мөчрийн дохио'};
function available(route:string) { return ['/archives','/gis','/m/points'].includes(route) || (mapping[route]||[]).some(k=>sources[k]?.rows.length); }
export function WindowCatalogue() {
  const [query,setQuery]=useState('');
  const list=windows.filter(w=>`${w.label} ${w.group}`.toLowerCase().includes(query.toLowerCase()));
  return <section><h2>Бүх цонх — {windows.length}</h2>
    <p>Цонх бүр нээгдэнэ. HAR-д байгаа мэдээлэл болон бүртгэгдээгүй үр дүнг тусад нь тэмдэглэв. Өгөгдөл өөрчлөх, төхөөрөмжид команд өгөх үйлдэл идэвхгүй.</p>
    <input className="toshi-input" aria-label="Цонх хайх" placeholder="Цонхны нэрээр хайх" value={query} onChange={e=>setQuery(e.target.value)}/>
    <div className="window-catalogue">{list.map(w=><Link className="window-card" key={w.route} to={w.route}><small>{w.group}</small><h3>{w.label}</h3><span>{available(w.route)?'Хадгалсан мэдээлэлтэй':'HAR-д үр дүн бүртгэгдээгүй'}</span></Link>)}</div>
  </section>;
}
function Grid({capture,label}:{capture:Capture;label:string}) {
  const [query,setQuery]=useState(''),[page,setPage]=useState(0),[selected,setSelected]=useState<Row|null>(null);
  const filtered=capture.rows.filter(r=>Object.values(r).some(v=>String(v??'').toLowerCase().includes(query.toLowerCase())));
  const columns=Array.from(new Set(capture.rows.flatMap(Object.keys)));
  const limit=25;const current=Math.min(page,Math.max(0,Math.ceil(filtered.length/limit)-1));
  return <section className="evidence-panel"><h3>{label}</h3><p>Бичлэг: {capture.capturedAt} · {capture.scope}</p>
    <input className="toshi-input" aria-label={`${label} хайх`} placeholder="Бүх баганаар хайх" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/>
    <p>Нийт {capture.rows.length} мөр · Хайлтад {filtered.length}</p>
    {!capture.rows.length?<p role="status">Энэ хүсэлт амжилттай боловч хариу хоосон байна. Системд нийт өгөгдөл байхгүйг нотлохгүй.</p>:
      <div className="window-table"><table className="toshi-grid"><thead><tr>{columns.map(c=><th key={c} title={c}>{labels[c]||c}</th>)}<th>Дэлгэрэнгүй</th></tr></thead><tbody>
        {filtered.slice(current*limit,(current+1)*limit).map((r,i)=><tr key={i}>{columns.map(c=><td key={c}>{String(r[c]??'—')}</td>)}<td><button className="toshi-btn" onClick={()=>setSelected(r)}>Харах</button></td></tr>)}
      </tbody></table></div>}
    {filtered.length>limit&&<p><button disabled={!current} onClick={()=>setPage(current-1)}>Өмнөх</button> {current+1} / {Math.ceil(filtered.length/limit)} <button disabled={(current+1)*limit>=filtered.length} onClick={()=>setPage(current+1)}>Дараах</button></p>}
    {selected&&<aside className="row-details"><button onClick={()=>setSelected(null)}>Хаах</button><h4>Мөрийн бүх талбар</h4><dl>{Object.entries(selected).map(([k,v])=><div key={k}><dt>{labels[k]||k}</dt><dd>{String(v??'—')}</dd></div>)}</dl></aside>}
  </section>;
}
export function CapturedWindow(){
  const {pathname}=useLocation();const w=windows.find(w=>w.route===pathname);
  const paths=mapping[pathname]||[];
  const pointCapture:Capture={capturedAt:points.capturedDate,sourceFile:'Өмнөх TEAMI бичлэг',scope:'87 цэгийн хадгалсан жагсаалт; солилтын бүрэн түүх биш.',rows:points.rows};
  return <section><p><Link to="/windows">← Бүх цонх</Link></p><h2>{w?.label||'Цонх олдсонгүй'}</h2>
    <p>Зөвхөн үзэх горим · Хадгалсан TEAMI хариу · Шууд шинэчлэгдэхгүй.</p>
    {pathname==='/m/qualityreports'&&<p><Link to="/archives">96 интервалын бодит архив, 24 утгатай / 72 хоосон мөрийг харах →</Link></p>}
    {pathname==='/m/points'?<Grid key={pathname} capture={pointCapture} label="Тооцооны цэгүүд"/>:paths.length?paths.map(p=>sources[p]&&<Grid key={p} capture={sources[p]} label={title[p]||w?.label||p}/>):<div className="evidence-panel">
      <h3>Энэ цонхны үр дүн HAR-д бүртгэгдээгүй</h3><p>Цонхыг нээх боломжтой болгосон. Өгсөн файлуудаас энэ хэсгийн хүснэгт, тайлан эсвэл үйлдлийн хариу олдоогүй тул мөр зохиож нөхөөгүй.</p>
      <p>Нүүр хуудасны давтагдсан үзүүлэлт нь энэ модулийн үр дүнг орлохгүй.</p>
    </div>}
  </section>;
}
export function CapturedDashboard(){const d=sources['homedashboard/data'];return <><h2>TEAMI — хадгалсан нүүр хуудас</h2>{d&&<><p>Бичлэг: {d.capturedAt}</p><div className="window-catalogue">{d.rows.map((r,i)=><div className="window-card" key={i}><h3>{String(r.TITLE??'')}</h3><strong style={{fontSize:28}}>{String(r.STAT??'—')}</strong><p>{String(r.DATE_VALUE??'')}</p></div>)}</div></>}<WindowCatalogue/></>}
export function EvidenceBrowser(){const {search}=useLocation();const key=new URLSearchParams(search).get('source')||Object.keys(sources)[0];return <section><h2>HAR-ийн бүх хадгалсан хүснэгт</h2><p>17 төрлийн хариу. Энд лавлах, талбарын тайлбар, хоосон хариу мөн багтана; эдгээрийг бүгдийг үндсэн модулийн үр дүн гэж үзэхгүй.</p><div style={{display:'flex',flexWrap:'wrap',gap:12}}>{Object.keys(sources).map(k=><Link key={k} to={'/evidence?source='+encodeURIComponent(k)}>{title[k]||k} ({sources[k].rows.length})</Link>)}</div>{sources[key]&&<Grid key={key} label={title[key]||key} capture={sources[key]}/>}</section>}
