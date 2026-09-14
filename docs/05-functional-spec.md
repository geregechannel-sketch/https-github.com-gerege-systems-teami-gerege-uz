# 05 — Функциональ тодорхойлолт (модуль, урсгал)

> Frontend-ийн React Router-аас 137 маршрут, 102 lazy компонент, 3 түвшний цэсийн
> шатлал ажиглагдав. Доор домэйнаар бүлэглэв. `route` = `/teami/<route>`.

## 1. Цэсийн шатлал (жишээ)
```
Дашборд (KPI: тооцооны цэг, унших цэг, сувгийн бэлэн байдал)
├─ Сохраненные формы            (saved_forms)
├─ Просмотр архивов             (archives)
├─ Качество показаний           (quality_reports*)
├─ Регистр событий              → События → {Все сообщения, Oracle, программ, связи, данных, системы}
│                                 Подтверждение событий, Аудит, Статистика связи, Журналы устройств
├─ Считывание показаний         (show / das)
├─ Конфигурация системы         → Классификаторы, Измерения, Конфигурация сбора,
│                                 Информация/Параметрирование контроллеров/счетчиков
│   └─ Классификаторы: Точки, Счетчики, Монтажи, Обходные точки, Соотношения,
│      Группы, Экономические профили, Расписания, Нормативно-справ. инф.
├─ Отчеты                        (reports_*)
├─ Телесигналы                   (signals)
├─ GIS                           (GIS)
└─ Управление нагрузкой          (power_control_* / rgb_* / bga*)
```

## 2. Домэйнаар модулиуд (137 маршрут)

### 2.1 Цэг/тоолуур/тохиргоо (Classifiers & config)
| Route | Модуль | Зорилго |
|---|---|---|
| `points` | Точки | Цэг үүсгэх/засах, шинж чанар, CT/VT коэфф, тоолуур солих |
| `meters` | Счетчики | Тоолуур бүртгэх, жагсаалт (pagination) |
| `mounting` | Монтажи счетчиков | Тоолуур монтажийн түүх (MOU_BT/ET) |
| `bypass` | Обходные точки | Обход/bypass цэг (дискрет сигналаар солих) |
| `pointrelations` | Соотношения точек | Цэг хоорондын томьёолсон харьцаа (фон бодолт) |
| `groups`, `groups/:gr_id` | Группы | ТУ бүлэглэх, бүлгийн хэмжилт тохируулах |
| `ecp` | Экономические профили | Эдийн засгийн профиль (чиглэл/ангилал) |
| `schedules` | Расписания | Хуваарь (унших/тайлан) |
| `caption`, `chroma`, `classification`, `icons`, `icons2`, `components` | Норматив/справ. инф. | Толь бичиг, тэмдэглэгээ, ангилал |
| `tariffs` | Тарифы | Тарифын төлөвлөгөө |
| `limits` | Лимиты | Хэрэглээний хязгаар |
| `signals` | Телесигналы | Телесигналын тохиргоо |
| `devices` | Устройства | Төхөөрөмж |
| `manage_periods`, `ds_periods`, `data_item_read_periods/:data` | Периоды | Уншилтын мөчлөг |

### 2.2 Хэмжилт/цуглуулга (Acquisition / DAS)
| Route | Зорилго |
|---|---|
| `show`, `show_view` | Считывание показаний — бодит цагийн холбоо/уншилт |
| `das`, `dp_das`, `rp_das`, `xa_das` | DAS-ийн уншилтын дэд горимууд |
| `direct_read` | Шууд унших (тоолуураас) |
| `realtimereadings` | Бодит цагийн заалт |
| `sys_diag_aq` | AcquisitionDiagnostics — цуглуулгын оношилгоо |
| `mlset` | MeasurementLineSets — хэмжилтийн шугамын багц |
| `fill`, `samples` | Профиль дүүргэлт, дээж |
| `direct_read`, `mounting` | Монтаж/шууд уншилт |

### 2.3 Архив ба өгөгдөл
| Route | Зорилго |
|---|---|
| `archives`, `archives_view`, `archives_v2` | Архив харах (цаг цуваа) |
| `arch_param` | Архивын параметр |
| `dp_archive`, `dp_config`, `dp_config_history`, `dp_show` | Data point архив/тохиргоо |
| `substitution`, `substitution_templates` | Орлуулга (дутуу утга нөхөх) |
| `write_restrictions`, `witheset` | Бичих хязгаар, өгөгдлийн салбар багц |

### 2.4 Схем / баланс / тайлан
| Route | Зорилго |
|---|---|
| `schemes_editor`, `schemes_log`, `schemes_viewer(+/:scheme)`, `schemes_viewer2` | Тооцооны схем засах/харах |
| `mainparameters` | Үндсэн параметр |
| `balance_config`, `balance_view` | Баланс тохируулах/харах |
| `loss_wizard` | Алдагдлын wizard |
| `reports_editor`, `reports_viewer`, `reports_log`, `report_executor`, `automated_reports` | Тайлан засах/харах/гүйцэтгэх/автомат |
| `quality_reports(+_view)`, `verification`, `verification_quality` | Чанар/баталгаажуулалт |
| `saved_forms`, `special_forms`, `source_templates(+_old/V2)` | Хадгалсан/тусгай форм, эх загвар |
| `monitoring`, `monitoring_templates` | Мониторинг |

### 2.5 Ачаалал удирдлага (Power / RGB / BGA)
| Route | Зорилго |
|---|---|
| `power_control_config`, `power_control_plan(+_15,_simple)`, `power_control_history(+_15)` | Чадлын хяналт/төлөвлөгөө/түүх |
| `rgb_plan(+15)`, `rgb_offers` | RGB төлөвлөгөө/санал |
| `bga`, `bga_statistics`, `bgaoprogress` | BGA (үүсгэлт/санал) |
| `disconnector_limiter` | Тасалгаа/лимитер (реле) |

### 2.6 Үйл явдал / чанар / статистик
| Route | Зорилго |
|---|---|
| `event_log/:evc_id`, `events`, `events_config`, `events_dev_log`, `event_confirmation` | Үйл явдлын бүртгэл/тохиргоо/баталгаа |
| `controller_log`, `meter_log` | Контроллер/тоолуурын журнал |
| `exchange_configuration`, `exchange_log`, `exchange_quality` | Солилцооны тохиргоо/журнал/чанар |
| `ph_statistics`, `prq_statistics`, `src_statistics` | Статистик (физик/чанар/эх сурвалж) |

### 2.7 Интеграци / bridge
| Route | Зорилго |
|---|---|
| `bridge_tevis(+_fail)` | TEVIS bridge интеграци |
| `inter_op`, `ecp`, `kms` | Харилцан ажиллагаа, KMS |
| `import_data_file`, `import_dev_meter`, `import_export_db_config` | Импорт/экспорт |
| `link_config(+_grid)`, `linkpriorities` | Холболтын тохиргоо/priority |
| `power_recomm/:winName` | Чадлын зөвлөмж |

### 2.8 Админ / систем / оношилгоо
| Route | Зорилго |
|---|---|
| `user_management(_old)`, `user_sessions` | Хэрэглэгч/сессион удирдах |
| `audit`, `audit_files` | Аудит |
| `app_control`, `dbsettings` | Апп/DB тохиргоо |
| `sql_debugger`, `sql_debug_log` | SQL debug (ace editor) |
| `sys_diag_ei`, `sys_diag_rp`, `reports_log` | Диагностик |
| `file_manager`, `tickets`, `rodo` | Файл, тикет, GDPR (RODO) |
| `GIS`, `GIS_PI`, `GIS_V2` | Газрын зураг |
| `test_igor1/2/3` | Хөгжүүлэлтийн туршилт (production-д хэрэггүй) |

## 3. Гол хэрэглэгчийн урсгал

### 3.1 Архив харах
1. Просмотр архивов нээх → `usersettings?uv_module=ARCHIVES`, толь бичиг, `pointmenuv2/*` ачаална.
2. Цэгийн модноос ТУ сонгох (Монголия → хот → РЭС → ТП → цэг).
3. Хугацаа (Сегодня/Неделя/Месяц/Год эсвэл огнооны муж) + параметр (ресурс/дискрет) сонгох.
4. Просмотр → `archives/query`(SQL)/`archives/data`(мөр) → grid/chart.

### 3.2 Цэг тохируулах
1. Конфигурация системы → Классификаторы → Точки.
2. Модноос цэг сонгох эсвэл "Новая точка".
3. Шинж чанар бөглөх (нэр, код, төрөл, профиль, тугнууд) → Сохранить (POST metadata structure).
4. Дэд үйлдэл: Измерения точки, CT/VT коэфф, Замена счетчика, Тарифные планы.

### 3.3 Үйл явдал шинжлэх
1. Регистр событий → События → Все сообщения (`event_log/6`).
2. `systemmodules`, `dataservers`, `datapoints`, `datasourcetypes` толь ачаална.
3. Шүүлтүүр (модуль/DAS/огноо) тавьж → `POST ev {limit,offset,filters,ev_view,evc_id}` → grid + `totalCount`.

### 3.4 Тайлан
1. Отчеты → тайлан сонгох/засах (reports_editor, ace).
2. `report_executor`-оор параметртэй гүйцэтгэх (query/data хосоор).
3. Автомат тайлан — хуваариар (`automated_reports`, `schedules`).

## 4. RBAC-ийн нөлөө функцэд
- Эрх дутвал модуль/үйлдэл 4xx буцаана (жишээ `monitoringtemplates/pma` → 400
  "Недостаточно прав"). UI модаль алдаа харуулна, харин бусад хэсэг ажилласаар байна.
- Хэрэглэгчийн эрх (`privileges` localStorage) цэс/товчны идэвхийг тодорхойлно.
