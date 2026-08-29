// Module menu mirroring the real TEAMI sidebar. Leaves map to an API model
// (generic grid page at /m/<model>) or a special page path.
export interface MenuNode {
  label: string;
  model?: string; // -> /m/<model>
  path?: string; // special route
  children?: MenuNode[];
  icon?: string; // key into MENU_ICONS (top-level rows)
}

export const MENU: MenuNode[] = [
  { label: "Сохраненные формы", icon: "saved", model: "usersettings" },
  { label: "Просмотр архивов", icon: "archive", path: "/archives" },
  { label: "Качество показаний", icon: "quality", model: "qualityreports" },
  {
    label: "Регистр событий",
    icon: "events",
    children: [
      { label: "События", model: "events" },
      { label: "Подтверждение событий", model: "ev_ack" },
      { label: "Аудит", model: "audit" },
      { label: "Статистика связи", model: "op_log" },
      { label: "Журналы устройств", model: "eventsdevlog" },
    ],
  },
  { label: "Считывание показаний", icon: "read", model: "dataservers" },
  {
    label: "Конфигурация системы",
    icon: "config",
    children: [
      {
        label: "Классификаторы и списки",
        children: [
          { label: "Точки", model: "points" },
          { label: "Счетчики", model: "measuringdevices" },
          { label: "Монтажи счетчиков", model: "mountings" },
          { label: "Обходные точки", model: "bypasspoints" },
          { label: "Соотношения точек", model: "relationships" },
          { label: "Группы", model: "groups" },
          { label: "Экономические профили", model: "ecoprofiles" },
          { label: "Расписания", model: "schedules" },
          { label: "Каналы", model: "channels" },
          { label: "Источники", model: "sources" },
        ],
      },
      {
        label: "Измерения",
        children: [
          { label: "Наборы линий", model: "measurelinessets" },
          { label: "Тарифные планы", model: "tariffplans" },
          { label: "Data items", model: "dataitems" },
        ],
      },
      { label: "Серверы сбора (DAS)", model: "dataservers" },
      { label: "Точки данных", model: "datapoints" },
      { label: "Устройства", model: "devices" },
    ],
  },
  {
    label: "Отчеты",
    icon: "reports",
    children: [
      { label: "Отчеты", model: "reports" },
      { label: "Журнал отчетов", model: "reportslog" },
      { label: "Типы отчетов", model: "reporttypes" },
    ],
  },
  { label: "Телесигналы", icon: "signals", model: "discretesignals" },
  { label: "Схемы", icon: "schema", model: "schemas" },
  { label: "GIS", icon: "gis", path: "/gis" },
  {
    label: "Управление нагрузкой",
    icon: "load",
    children: [
      { label: "BGA", model: "bga" },
      { label: "RGB план", model: "pobj" },
      { label: "Ограничители", model: "limiter" },
    ],
  },
];

// Dictionaries shown as reference lists under a "Справочники" quick menu.
export const DICTS: MenuNode[] = [
  { label: "Типы групп", model: "grouptypes" },
  { label: "Типы точек", model: "pointtypes" },
  { label: "Типы счетчиков", model: "measuringdevicetypes" },
  { label: "Эконом. категории", model: "ecocategories" },
  { label: "Модули системы", model: "systemmodules" },
];
