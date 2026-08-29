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
  { label: "Сохраненные формы", icon: "saved", path: "/saved" },
  { label: "Просмотр архивов", icon: "archive", path: "/archives" },
  { label: "Качество показаний", icon: "quality", model: "qualityreports" },
  {
    label: "Регистр событий",
    icon: "events",
    children: [
      {
        label: "События",
        children: [
          { label: "Все сообщения", model: "events" },
          { label: "Сообщения Oracle", model: "event_log_oracle" },
          { label: "Сообщения программ", model: "event_log_software" },
          { label: "Сообщения связи", model: "event_log_connection" },
          { label: "Сообщения данных", model: "event_log_data" },
          { label: "Сообщения системы", model: "event_log_system" },
        ],
      },
      { label: "Подтверждение событий", model: "ev_ack" },
      {
        label: "Аудит",
        children: [
          { label: "Аудит", model: "audit" },
          { label: "Аудит файлов", model: "audit_files" },
          { label: "Подключения к системе", model: "user_sessions" },
        ],
      },
      {
        label: "Статистика связи",
        children: [
          { label: "Статистика источников", model: "src_statistics" },
          { label: "Статистика каналов", model: "ph_statistics" },
          { label: "Первичные запросы", model: "prq_statistics" },
        ],
      },
      {
        label: "Журналы устройств",
        children: [
          { label: "Журналы счетчиков", model: "meter_log" },
          { label: "Журналы контроллеров", model: "controller_log" },
        ],
      },
      { label: "Лимиты", model: "limiter" },
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
          { label: "Нормативно справ. инф.", model: "classification" },
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
      {
        label: "Конфигурация сбора",
        children: [
          { label: "Серверы сбора (DAS)", model: "dataservers" },
          { label: "Устройства", model: "devices" },
          { label: "Приоритеты связи", model: "linkpriorities" },
        ],
      },
      {
        label: "Информация контроллеров",
        children: [
          { label: "Архив точек данных", model: "datapoints" },
          { label: "Точки данных", model: "dp_show" },
        ],
      },
      { label: "Параметрирование контроллеров", model: "controllerconfig" },
      { label: "Параметрирование счетчиков", model: "meterconfig" },
      { label: "Администрирование пользователей", model: "usermanagement" },
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
