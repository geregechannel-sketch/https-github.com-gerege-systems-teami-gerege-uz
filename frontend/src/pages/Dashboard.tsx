import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { MENU } from "../menu";
import { MENU_ICONS } from "../icons";

interface Tile {
  TITLE: string;
  STAT: string;
  COLOR?: string;
  DATE_VALUE?: string;
}

// Module descriptions, matching the real TEAMI dashboard cards.
const DESC: Record<string, string> = {
  saved: "Модуль предназначен для просмотра пользователями сохраненных форм отображения данных.",
  archive: "Модуль предназначен для просмотра данных точек измерения и учета из БД.",
  quality: "Модуль предназначен для анализа полноты архивов и качества данных.",
  events:
    "Модуль предназначен для просмотра и анализа регистра событий системы – сообщений от программ, ошибок связи, системных сообщений, аудита действий пользователей и т.д. Так же для просмотра журналов устройств, нарушений лимитов потребления, статистики связи.",
  read: "Модуль предназначен для связи с ИИК и устройствами в реальном времени.",
  config:
    "Модуль предназначен для конфигурирования разных параметров системы – параметров связи и архивирования, ведение классификаторов, администрирование пользователей и т.д.",
  reports: "Модуль предназначен для создания и просмотра отчетов системы.",
  signals: "Модуль предназначен для конфигурации и обработки телесигнализации.",
  schema: "Модуль предназначен для просмотра и редактирования мнемосхем.",
  gis: "Модуль для просмотра объектов системы на карте.",
  load: "Модуль для управления реле счетчиков и установки лимитов нагрузки.",
};

export default function Dashboard() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    api.post<Tile[]>("homedashboard/data", {}).then((e) => e.success && setTiles(e.data || []));
  }, []);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        {tiles.map((t, i) => (
          <div key={i} className="toshi-stat" style={{ background: t.COLOR || "var(--btnGreenBg)" }}>
            <div>{t.TITLE}</div>
            {t.DATE_VALUE && <div style={{ fontSize: 12, opacity: 0.85 }}>{t.DATE_VALUE}</div>}
            <div className="toshi-stat__value">{t.STAT}</div>
          </div>
        ))}
      </div>

      <h3 style={{ color: "var(--textColorHover)", margin: "22px 0 10px" }}>Модули</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        {MENU.map((m, i) => {
          const target = m.model ? `/m/${m.model}` : m.path || "/";
          const Ico = m.icon ? MENU_ICONS[m.icon] : null;
          return (
            <div key={i} className="mod-card">
              <div className="mod-card__head">
                <span className="mod-card__ico">{Ico && <Ico size={20} color="var(--btnLightblueBg)" />}</span>
                <span className="mod-card__title">{m.label}</span>
              </div>
              <div className="mod-card__desc">{(m.icon && DESC[m.icon]) || "Модуль системы TEAMI Enterprise."}</div>
              <div className="mod-card__foot">
                <button className="toshi-btn toshi-btn--lightblue" onClick={() => nav(target)}>Открыть</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
