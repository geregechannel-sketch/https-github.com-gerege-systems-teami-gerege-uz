# TEAMI / EMCOS EC3 — Бүрэн Endpoint лавлах (983)

> Эх сурвалж: браузерт бүх 852 webpack chunk-ийг ачаалж, model config-уудын `route`
> тодорхойлолтыг scan хийж гаргав (2026-08-28). Зам бүр `ec3api/v1/` суурьтай харьцангуй.
> Method: ерөнхийдөө **GET**=унших/жагсаалт, **POST**=grid query/үүсгэх/засах/устгах (action-оор).
> Дугтуй `{success,data[,totalCount]}`; grid body `{limit,offset,filters:[{c,p,v}]}`. Дэлгэрэнгүй → [03-api-spec.md](03-api-spec.md).
> Түүхий алфавит жагсаалт: [endpoints-full.txt](endpoints-full.txt).

**Нийт: 984 өвөрмөц зам, 414 үндсэн бүлэг.**

### `reports` (32) — Тайлан (CRUD, tree, param, файл, RPA)
```
reports
reports/columns
reports/delayed_rp
reports/duplicate
reports/file
reports/parameters
reports/rp_fpty
reports/rp_fpty_server
reports/rp_path
reports/rp_struct
reports/rp_tree_main
reports/rp_ug
reports/rpa
reports/rpa_dublicate
reports/rpa_param
reports/rpa_path
reports/rpa_rpty
reports/rpa_ug
reports/rpa_user
reports/rpa_user_ug
reports/rpapv
reports/rpf
reports/rpind
reports/rpqc
reports/rpqf
reports/rpqo
reports/rpqu
reports/send_after_view_mrpa
reports/send_mrpa
reports/tables
reports/template_on_server
reports/view_and_send_mrpa
```

### `archives` (24) — Архив (цаг цуваа): цэг/бүлэг/сигнал/withe/act
```
archives/act_from_archives
archives/actual_pl
archives/ar_act_data
archives/ar_src_ph
archives/dls_day
archives/extra_fields
archives/grexp
archives/group
archives/mou
archives/mt
archives/point
archives/point_act
archives/points_with_acts
archives/points_with_mou
archives/raw_point_data
archives/read_rq_info
archives/set_rread
archives/signal
archives/verge
archives/withe
archives/withe_compare
archives/xfau
archives/xfau_det
archives/xfau_info
```

### `gis` (24) — GIS: объект/статус/газрын зураг
```
gis/events
gis/events_ack
gis/map_info
gis/map_visibility
gis/obj_data
gis/obj_fields
gis/obj_info
gis/obj_info_det
gis/objects_gr
gis/objects_point
gis/ph_state
gis/sp_state
gis/status_arch_data_gr
gis/status_arch_data_point
gis/status_ev_ack
gis/status_ev_ack_point
gis/status_ffp
gis/status_ph
gis/status_point
gis/status_pty
gis/status_rt
gis/status_rt_data_gr
gis/status_rt_data_point
gis/status_sp
```

### `manageperiods` (24) — Хугацааны хаалт/тооцоо (өдөр/сар)
```
manageperiods/act_detailed
manageperiods/act_detailed_day
manageperiods/act_detailed_day_det
manageperiods/act_detailed_month
manageperiods/act_detailed_param
manageperiods/close_all
manageperiods/day_closure
manageperiods/day_compare
manageperiods/day_detail_sum
manageperiods/gen_days
manageperiods/meter_day_detailed
manageperiods/meter_day_detailed_t0
manageperiods/meter_day_detailed_t0_sum
manageperiods/meter_detailed
manageperiods/meter_month_detailed
manageperiods/meter_month_detailed_t0
manageperiods/month_closure
manageperiods/month_compare
manageperiods/month_days
manageperiods/month_detail_sum
manageperiods/period_closure
manageperiods/period_days
manageperiods/pl_ids
manageperiods/point_acts
```

### `rgb_plan` (23) — RGB төлөвлөгөө (цаг)
```
rgb_plan/b7
rgb_plan/b8
rgb_plan/dpp_khe
rgb_plan/khae
rgb_plan/khe
rgb_plan/le
rgb_plan/le9
rgb_plan/lel_start_ds
rgb_plan/pobj_ag
rgb_plan/pobj_ag_ta
rgb_plan/pobj_compensation
rgb_plan/pobj_limits_reg
rgb_plan/pobj_plan_ds
rgb_plan/pobj_power_plant
rgb_plan/pobj_power_plant_reg
rgb_plan/pobj_remont
rgb_plan/pobj_remont_plan
rgb_plan/pobj_rs
rgb_plan/pobj_state
rgb_plan/pobj_ta
rgb_plan/pobj_tpty_h
rgb_plan/reg_type
rgb_plan/region
```

### `(root helpers)` (22)
```
/
/
/gr_name
/id_by_code
/id_by_name
/mlset
/pl_mlset
/rpq
/rpqc
/rpqf
/tp_id_by_name
/user_id_by_name
/with_data
/wiz_rel
/{bga_id}
/{bga_type_id}
/{cont_id}
/{ds_code}
/{gr_id}
/{id}/{role_name}
/{mou_id}
/{se_id}
```

### `pointmenuv2` (18) — Цэгийн мод (v2): бүлэг/цэг/сигнал/FFP
```
pointmenuv2/curr_root
pointmenuv2/extract_points
pointmenuv2/group
pointmenuv2/group_ffp
pointmenuv2/group_info
pointmenuv2/group_path
pointmenuv2/groups
pointmenuv2/my_root
pointmenuv2/obj_count
pointmenuv2/point
pointmenuv2/point_ffp
pointmenuv2/point_info
pointmenuv2/point_path
pointmenuv2/points
pointmenuv2/signal
pointmenuv2/signal_path
pointmenuv2/signals
pointmenuv2/top_gr
```

### `parammenuv2` (16) — Параметрийн мод: ml/msf/aggs/withe
```
parammenuv2/aggs_type
parammenuv2/aggs_type_md
parammenuv2/all_aggs
parammenuv2/all_md
parammenuv2/all_ml
parammenuv2/all_msf
parammenuv2/extract
parammenuv2/extract_tech
parammenuv2/ml
parammenuv2/ml_from_t0
parammenuv2/mls_by_id
parammenuv2/ms_type
parammenuv2/msf
parammenuv2/path
parammenuv2/withe_class_sheaf
parammenuv2/withe_type
```

### `pobj` (16) — Ачааллын объект (power object): plan/limit/rs/region
```
pobj
pobj/gas_plan
pobj/limit_value
pobj/limit_value_15
pobj/plan_to_import
pobj/plan_to_import_15
pobj/pobj
pobj/pobj4rs
pobj/power_plant
pobj/power_plant_extended
pobj/power_plant_plan
pobj/power_plant_plan_15
pobj/power_plant_simple
pobj/region
pobj/rgb_power_plant
pobj/rgb_power_plant_extended
```

### `schedules` (14) — Хуваарь
```
schedules
schedules/bga_class_filter
schedules/bga_type_filter
schedules/rp_type_filter
schedules/sch_task
schedules/sch_task_sum
schedules/sep_rc_md_filter
schedules/sep_rc_ph_type_filter
schedules/sep_rc_sheaf_filter
schedules/sep_rc_sum_filter_rc
schedules/sep_tmpl_rc_src_filter
schedules/sep_tmpl_rc_sum_filter_rc
schedules/xf_rc_filter_rc
schedules/xf_type_filter
```

### `monitoringtemplates` (13) — Мониторингийн загвар (pma/gma)
```
monitoringtemplates/gma
monitoringtemplates/gma/dup
monitoringtemplates/gma_ma_tmpl
monitoringtemplates/gr_gma
monitoringtemplates/gr_gma_tmpl_det
monitoringtemplates/gr_gma_tmpl_sum
monitoringtemplates/ma_tmpl_type
monitoringtemplates/pma
monitoringtemplates/pma/dup
monitoringtemplates/pma_ma_tmpl
monitoringtemplates/point_pma
monitoringtemplates/point_pma_tmpl_det
monitoringtemplates/point_pma_tmpl_sum
```

### `powerrecomm` (12) — Чадлын зөвлөмж
```
powerrecomm/c_plan
powerrecomm/ds
powerrecomm/e_nom
powerrecomm/limit_graph
powerrecomm/limit_graph_15
powerrecomm/ml
powerrecomm/plan_change
powerrecomm/plan_time
powerrecomm/point
powerrecomm/recomm_graph
powerrecomm/recomm_graph_15
powerrecomm/rs_info
```

### `linkconfiggrid` (11)
```
linkconfiggrid/dp
linkconfiggrid/dp_lpty
linkconfiggrid/lpty_flt
linkconfiggrid/ph
linkconfiggrid/ph_lpty
linkconfiggrid/se
linkconfiggrid/se_lpty
linkconfiggrid/sep_rc
linkconfiggrid/sp_lpty
linkconfiggrid/src
linkconfiggrid/src_lpty
```

### `directread` (10) — Шууд унших
```
directread
directread/con_settings_by_point
directread/dp_con_settings_by_point
directread/dp_src_type_params
directread/point_by_con_settings
directread/set
directread/sp_check
directread/sp_param
directread/src_type_dp
directread/src_type_meter
```

### `qualityreports` (10) — Чанарын тайлан (нүх, хугацаа)
```
qualityreports/aggs_type_details
qualityreports/cnt
qualityreports/details
qualityreports/extra_fields
qualityreports/holes
qualityreports/ml_t0_details
qualityreports/period_close
qualityreports/period_open
qualityreports/point_details
qualityreports/rodo_ml
```

### `rgb_plan_15` (10) — RGB төлөвлөгөө (15 мин)
```
rgb_plan_15/b7
rgb_plan_15/b8
rgb_plan_15/dpp_khe
rgb_plan_15/khae
rgb_plan_15/khe
rgb_plan_15/le
rgb_plan_15/le9
rgb_plan_15/pobj_limits_reg
rgb_plan_15/pobj_rs
rgb_plan_15/region
```

### `balances` (9) — Баланс (бүлэг/цэг/хэрэглэгч/NT)
```
balances
balances/balance_all_emcos
balances/balance_consumer
balances/balance_nt
balances/balances_config_export
balances/balances_view_export
balances/group
balances/io_gr
balances/io_point
```

### `pointsmeasurelines` (9) — Цэг↔хэмжилтийн шугам
```
pointsmeasurelines
pointsmeasurelines/formula_preview
pointsmeasurelines/ids
pointsmeasurelines/mcc
pointsmeasurelines/mlset
pointsmeasurelines/month_to_day
pointsmeasurelines/multi
pointsmeasurelines/not_di
pointsmeasurelines/not_di_multi
```

### `appcontrol` (8) — Апп удирдлага
```
appcontrol/compare
appcontrol/create
appcontrol/get
appcontrol/get_info
appcontrol/kill
appcontrol/set
appcontrol/sleep
appcontrol/start
```

### `dpmenu` (8) — Data point мод
```
dpmenu/dp
dpmenu/ph
dpmenu/se
dpmenu/se_md_aggs
dpmenu/src
dpmenu/src_ds
dpmenu/src_point
dpmenu/src_se
```

### `reporttypes` (8) — Тайлангийн төрөл
```
reporttypes
reporttypes/rp_types_rpa
reporttypes/rpa
reporttypes/rpa_rp_group
reporttypes/rpa_struct
reporttypes/rpapv
reporttypes/rpq
reporttypes/tree_cf
```

### `appinfo` (7) — Апп/DB мэдээлэл
```
appinfo/app_version
appinfo/das_modules
appinfo/das_version
appinfo/db_time
appinfo/db_version
appinfo/dst
appinfo/license
```

### `chromo` (7) — Chromo (өнгө/төхөөрөмж)
```
chromo/ch
chromo/chr_to_dev
chromo/data
chromo/groups
chromo/grs
chromo/umg
chromo/w_chr_to_dev
```

### `deviceconfig` (7) — Төхөөрөмжийн тохиргоо
```
deviceconfig/dp
deviceconfig/dp_src_type
deviceconfig/dp_src_type_list
deviceconfig/point
deviceconfig/point_src_type
deviceconfig/point_src_type_list
deviceconfig/src_type_mod_withe
```

### `verificationquality` (7) — Баталгаажуулалтын чанар (accept/decline/recalc)
```
verificationquality/accept
verificationquality/cnt
verificationquality/decline
verificationquality/holes
verificationquality/hour_details
verificationquality/recalc
verificationquality/revoke
```

### `bga` (6) — BGA (үүсгэлт)
```
bga
bga/execute
bga/execute_serv
bga/gr_query
bga/sch_bga_det
bga/se
```

### `dataitems` (6)
```
dataitems
dataitems/combo
dataitems/dp
dataitems/ids
dataitems/multi
dataitems/pl_mlset
```

### `groupmstree` (6) — Бүлэг-хэмжилт мод
```
groupmstree/export
groupmstree/gr_ec
groupmstree/gr_grc_data
groupmstree/gr_grp_data
groupmstree/gr_ms
groupmstree/gr_ms_type
```

### `measurelines` (6) — Хэмжилтийн шугам
```
measurelines
measurelines/check_ml_custom
measurelines/eu_map
measurelines/indicator_ml
measurelines/ml_convert
measurelines/ml_custom
```

### `measurements` (6) — Хэмжилт
```
measurements
measurements/grc_rule
measurements/gtp
measurements/indicator_ms
measurements/ms
measurements/verification
```

### `sysdiag` (6) — Системийн диагностик
```
sysdiag/export
sysdiag/import
sysdiag/ph
sysdiag/queue
sysdiag/rp
sysdiag/wait
```

### `bgatree` (5) — BGA мод
```
bgatree/bga
bgatree/bga_class
bgatree/bga_path
bgatree/bga_struct
bgatree/bga_type
```

### `enumerationsdata` (5) — Enum өгөгдөл
```
enumerationsdata
enumerationsdata/add_grcp_by
enumerationsdata/grc_typ
enumerationsdata?scope=DS
enumerationsdata?scope=SPTY
```

### `import_export_db_config` (5) — DB тохиргоо имп/эксп
```
import_export_db_config
import_export_db_config/bga_array
import_export_db_config/dp_array
import_export_db_config/gp_array
import_export_db_config/src_tmpl_array
```

### `importdevmeter` (5) — Төхөөрөмж/тоолуур импорт
```
importdevmeter
importdevmeter/check
importdevmeter/controller_info
importdevmeter/fill
importdevmeter/meter_info
```

### `measurementtypes` (5) — Хэмжилтийн төрөл
```
measurementtypes
measurementtypes/grc_rule
measurementtypes/pobj
measurementtypes/system
measurementtypes/verification
```

### `sep` (5) — SEP
```
sep
sep/d2
sep/md_aggs
sep/server_time
sep/ui
```

### `sourceelements` (5) — Эх элемент
```
sourceelements
sourceelements/di
sourceelements/diff_branch
sourceelements/mcc
sourceelements/md_aggs
```

### `sources` (5) — Эх сурвалж (source element)
```
sources
sources/mas
sources/mcc
sources/src_from_rule
sources/src_from_tmpl
```

### `xfe` (5) — XF экспорт (iec)
```
xfe
xfe/export_all
xfe/export_iec
xfe/iec
xfe/sch
```

### `bridgetevis` (4) — TEVIS bridge
```
bridgetevis
bridgetevis/disable
bridgetevis/transmit
bridgetevis/transmitall
```

### `directory` (4) — Файл сан
```
directory/file
directory/pty_file
directory/pty_write_file
directory/read
```

### `exchangequality` (4) — Солилцооны чанар
```
exchangequality
exchangequality/aggs_type_details
exchangequality/details
exchangequality/point_details
```

### `exportform` (4) — Форм экспорт
```
exportform/file
exportform/last_sent_doc_nr
exportform/send_after_view
exportform/view_and_send
```

### `grouppropslists` (4) — Бүлгийн шинж
```
grouppropslists
grouppropslists/available_gpty
grouppropslists/numeric
grouppropslists?gpty_numeric=1
```

### `groups` (4) — Бүлэг
```
groups
groups/duplicate
groups/individual_ud_containers
groups/parent
```

### `init_gen_point` (4)
```
init_gen_point
init_gen_point/bgao
init_gen_point/bgao_bga
init_gen_point/bgao_bga_type
```

### `opc` (4) — OPC сервер
```
opc/alert_cfg
opc/prefix
opc/se
opc/server
```

### `orn` (4)
```
orn
orn/multi_das
orn/sep
orn/withe
```

### `profilesdata` (4)
```
profilesdata
profilesdata/filter_data
profilesdata/filter_data?search=POINT
profilesdata/rm_ffp_data
```

### `reportexecutor` (4) — Тайлан гүйцэтгэгч
```
reportexecutor/available_rp
reportexecutor/data
reportexecutor/data_p
reportexecutor/uv_data
```

### `usergroup` (4) — Хэрэглэгчийн бүлэг (эрх)
```
usergroup
usergroup/bga_type
usergroup/by_user
usergroup/not_by_user
```

### `users` (4) — Хэрэглэгчид
```
users
users/not_ug
users/owned_objects
users/user_root
```

### `xf` (4) — XF (солилцооны форм)
```
xf
xf/duplicate
xf/src
xf/xqTree
```

### `xfau` (4) — XF au
```
xfau
xfau/gr
xfau/point
xfau/xqTree
```

### `xftree` (4) — XF мод
```
xftree/xf
xftree/xf_type
xftree/xfa
xftree/xfau
```

### `caption` (3) — Тэмдэглэгээ
```
caption
caption/default
caption/param
```

### `datasheafs` (3)
```
datasheafs
datasheafs/ids
datasheafs/not_di_multi
```

### `datasourcetemplates` (3) — Эх сурвалжийн загвар
```
datasourcetemplates
datasourcetemplates/duplicate
datasourcetemplates/tmpl_from_src
```

### `datastatusflags` (3)
```
datastatusflags
datastatusflags/fp_sf
datastatusflags/fp_sf_count
```

### `debug` (3) — SQL debug
```
debug/date
debug/sql
debug/sql_log
```

### `directions` (3)
```
directions
directions/grc_rule
directions/verification
```

### `ev_ack` (3) — Үйл явдал баталгаа
```
ev_ack
ev_ack/ack_ev_ack
ev_ack/ack_ev_ack_sum
```

### `exchangeaddresses` (3) — Солилцооны хаяг
```
exchangeaddresses
exchangeaddresses/quality
exchangeaddresses/xqTree
```

### `kms` (3) — KMS (түлхүүр)
```
kms/controllers
kms/meters
kms/pwd
```

### `measuringdevices` (3) — Тоолуур (CRUD)
```
measuringdevices
measuringdevices/meter_not_mou
measuringdevices/meter_type_report
```

### `mountings` (3) — Тоолуур монтаж
```
mountings
mountings/last
mountings/point_by_nr
```

### `pobj_point_data` (3)
```
pobj_point_data
pobj_point_data/available
pobj_point_data/ds
```

### `pobj_rs` (3) — Тооцооны схем
```
pobj_rs
pobj_rs/import_check
pobj_rs/last
```

### `pobj_rs_15` (3)
```
pobj_rs_15
pobj_rs_15/import_check
pobj_rs_15/last
```

### `pointsfp` (3) — Цэгийн дүүргэлт профиль
```
pointsfp
pointsfp/fp
pointsfp/save
```

### `pointsvp` (3) — Баталгаажуулалт профиль
```
pointsvp
pointsvp/save
pointsvp/vp
```

### `possiblepointprops` (3)
```
possiblepointprops
possiblepointprops/available_ppty
possiblepointprops/numeric
```

### `regulations` (3)
```
regulations/add
regulations/end
regulations/latest
```

### `roles` (3) — Дүр (RBAC)
```
roles
roles/ug
roles/user
```

### `sampledayprograms` (3)
```
sampledayprograms
sampledayprograms/id_by_name
sampledayprograms/w
```

### `scheme` (3) — Схем (data, params)
```
scheme
scheme/data
scheme/with_params
```

### `sep_rc` (3) — SEP RC
```
sep_rc
sep_rc/sch_sep_rc_det
sep_rc/sch_sep_rc_sum_det
```

### `sep_tmpl_rc` (3)
```
sep_tmpl_rc
sep_tmpl_rc/sch_sep_tmpl_rc_det
sep_tmpl_rc/sch_sep_tmpl_rc_sum_det
```

### `show` (3)
```
show/only_actual
show/sheaf
show/time_sep
```

### `sp` (3)
```
sp
sp/mdc_list_from_db
sp/src_dp
```

### `src_type_mod_withe` (3)
```
src_type_mod_withe/available_witheset_data
src_type_mod_withe/ffp_dp_withe
src_type_mod_withe/ffp_withe
```

### `src_type_withe` (3)
```
src_type_withe/ffp_dp_state_withe
src_type_withe/ffp_state_withe
src_type_withe/witheset_src_type
```

### `stgate` (3) — ST gate
```
stgate
stgate/destroy
stgate/wait
```

### `switch_off_ph_statistics` (3) — PH статистик унтраах
```
switch_off_ph_statistics
switch_off_ph_statistics/all
switch_off_ph_statistics/selected
```

### `switch_off_src_statistics` (3) — SRC статистик унтраах
```
switch_off_src_statistics
switch_off_src_statistics/all
switch_off_src_statistics/selected
```

### `switch_off_testmode` (3) — Тест горим унтраах
```
switch_off_testmode
switch_off_testmode/all
switch_off_testmode/selected
```

### `tarifflists` (3) — Тарифын жагсаалт
```
tarifflists
tarifflists/grc_rule
tarifflists/verification
```

### `user` (3) — Нэвтрэлт/нууц үг (login, login_az=Azure, change_pw)
```
user/change_pw
user/login
user/login_az
```

### `userviews` (3) — Харагдацын модуль/бүлэг
```
userviews
userviews/groups
userviews/modules
```

### `actdata` (2)
```
actdata
actdata/point_mls
```

### `acts` (2)
```
acts
acts/point_ml
```

### `aggfunctions` (2)
```
aggfunctions/tff
aggfunctions/verification
```

### `audit` (2) — Аудит
```
audit
audit/details
```

### `bga_param` (2)
```
bga_param
bga_param/loss
```

### `bgaoprogress` (2) — BGA явц
```
bgaoprogress
bgaoprogress/status
```

### `channels` (2) — Холбооны суваг
```
channels
channels/by_ip_port
```

### `databranchsets` (2) — Өгөгдлийн салбар багц
```
databranchsets
databranchsets/duplicate
```

### `dataitemsperiods` (2) — Өгөгдлийн мөчлөг
```
dataitemsperiods
dataitemsperiods/dip
```

### `datapointmenu` (2) — DP мэдээ
```
datapointmenu/dp_info
datapointmenu/dp_struct
```

### `dataservers` (2) — Өгөгдөл цуглуулах сервер
```
dataservers
dataservers/das_lbd
```

### `datasourcetypes` (2) — Эх сурвалжийн төрөл
```
datasourcetypes
datasourcetypes/src_type_from_src
```

### `devices` (2) — Төхөөрөмж
```
devices
devices/dev_not_dp
```

### `devicespropslists` (2)
```
devicespropslists
devicespropslists/available_dpty
```

### `disconnector` (2) — Тасалгаа
```
disconnector
disconnector/rights
```

### `discretesignaldata` (2)
```
discretesignaldata
discretesignaldata/validation
```

### `discretesignals` (2)
```
discretesignals
discretesignals/di
```

### `discretesignaltypes` (2)
```
discretesignaltypes
discretesignaltypes/no_mlset
```

### `enumerations` (2) — Тоочилт (enum)
```
enumerations
enumerations?scope=DS
```

### `eventsdevlog` (2) — Төхөөрөмжийн журнал
```
eventsdevlog/dew
eventsdevlog/gew
```

### `fib_msf_dir` (2)
```
fib_msf_dir
fib_msf_dir/details
```

### `fillingprofiles` (2) — Дүүргэлт профиль
```
fillingprofiles
fillingprofiles/fp_report
```

### `grouptypes` (2) — Бүлгийн төрөл
```
grouptypes
grouptypes/parent
```

### `grp` (2)
```
grp
grp/by_code
```

### `homedashboard` (2) — Dashboard (query→SQL, data→гүйцэтгэл)
```
homedashboard/data
homedashboard/query
```

### `importgpdp` (2) — GP/DP импорт
```
importgpdp
importgpdp/templates
```

### `limiter` (2) — Лимитер
```
limiter
limiter/rights
```

### `lossconfig` (2) — Алдагдлын тохиргоо
```
lossconfig
lossconfig/check_rel
```

### `map` (2)
```
map
map/force
```

### `measuredensity` (2)
```
measuredensity/fill
measuredensity/md
```

### `measurelinessets` (2) — Хэмжилтийн шугамын багц
```
measurelinessets
measurelinessets/duplicate
```

### `measuringdevicespropslists` (2)
```
measuringdevicespropslists
measuringdevicespropslists/available_mpty
```

### `mlsetdata` (2) — MLSET өгөгдөл
```
mlsetdata
mlsetdata/ds
```

### `monitoring` (2) — Мониторинг
```
monitoring
monitoring/ma
```

### `my_ug` (2)
```
my_ug
my_ug/not_rp
```

### `op_log` (2)
```
op_log
op_log/det
```

### `pobj_limits` (2) — Лимит
```
pobj_limits/reg
pobj_limits/rgb_grid
```

### `pobj_limits_15` (2)
```
pobj_limits_15/reg
pobj_limits_15/rgb_grid
```

### `pointmenu` (2) — Цэгийн мод (v1)
```
pointmenu/curr_root
pointmenu/group_path
```

### `points` (2) — Цэг (CRUD)
```
points
points/next_point_code
```

### `points_sbst_tmpl` (2)
```
points_sbst_tmpl
points_sbst_tmpl/save
```

### `pointsrtp` (2) — Realtime профиль
```
pointsrtp
pointsrtp/save
```

### `profiles` (2)
```
profiles
profiles/duplicate
```

### `realtimedata` (2) — Бодит цагийн өгөгдөл
```
realtimedata
realtimedata/sql
```

### `relationpropertylists` (2)
```
relationpropertylists
relationpropertylists/available_epty
```

### `rp_das` (2) — RP DAS
```
rp_das
rp_das/rp
```

### `rpa` (2)
```
rpa
rpa/sch_rpa_det
```

### `samples` (2) — Дээж
```
samples
samples/sam_from_avg
```

### `sampleweekprograms` (2)
```
sampleweekprograms
sampleweekprograms/p
```

### `se_tmpl` (2) — SE загвар (sheaf/lpty/ph_type)
```
se_tmpl
se_tmpl/mlset
```

### `ses` (2)
```
ses
ses/details
```

### `specialformspoint` (2) — Тусгай форм
```
specialformspoint/export
specialformspoint/forms
```

### `stats` (2) — Статистик
```
stats/ph
stats/src
```

### `stkmsadapter` (2) — KMS адаптер
```
stkmsadapter
stkmsadapter/call
```

### `substitutiontemplates` (2) — Орлуулгын загвар
```
substitutiontemplates
substitutiontemplates/ml
```

### `ugr` (2)
```
ugr
ugr/ug_not_gr
```

### `upty` (2) — Хэрэглэгчийн шинжийн төрөл
```
upty
upty/available_upty
```

### `users_fa` (2)
```
users_fa
users_fa/actual
```

### `usersettings` (2) — Хадгалсан харагдац (UV_)
```
usersettings
usersettings/data
```

### `verificationprofiles` (2) — Баталгаажуулалт профиль
```
verificationprofiles
verificationprofiles/vp_report
```

### `vkmignore` (2) — VKM үл хэрэгсэх
```
vkmignore
vkmignore/src_withe
```

### `weeklyprograms` (2)
```
weeklyprograms
weeklyprograms/dpr_tree
```

### `xf_rc` (2)
```
xf_rc
xf_rc/sch_xf_rc_det
```

### `xf_type` (2) — XF төрөл
```
xf_type
xf_type/eq_filter
```

### `accesslevelsgroups` (1) — Хандалтын түвшин
```
accesslevelsgroups
```

### `acttypes` (1)
```
acttypes
```

### `add_new_lines_for_generation` (1)
```
add_new_lines_for_generation
```

### `admin_testmode` (1) — Тест горим
```
admin_testmode
```

### `aggregationsegments` (1)
```
aggregationsegments/fill
```

### `aggregationsegmenttypes` (1)
```
aggregationsegmenttypes/verification
```

### `aggs_type` (1)
```
aggs_type/fib_data
```

### `ai` (1) — AI генерац
```
ai/generate_by_id
```

### `alertdas` (1) — DAS сэрэмжлүүлэг
```
alertdas
```

### `algr` (1)
```
algr
```

### `allbalance` (1)
```
allbalance
```

### `ar_ds` (1)
```
ar_ds
```

### `ar_ds_plain` (1)
```
ar_ds_plain
```

### `ar_dw_plain` (1)
```
ar_dw_plain
```

### `ar_pw_plain` (1)
```
ar_pw_plain
```

### `auf` (1)
```
auf
```

### `balance` (1) — Баланс
```
balance
```

### `bga_class` (1)
```
bga_class
```

### `bga_statistics` (1)
```
bga_statistics
```

### `bga_type` (1) — BGA төрөл
```
bga_type
```

### `bga_type_param` (1)
```
bga_type_param
```

### `bga_type_ug` (1)
```
bga_type_ug
```

### `bgaq` (1)
```
bgaq
```

### `bridgetevisfail` (1)
```
bridgetevisfail
```

### `bridgetevisoperations` (1)
```
bridgetevisoperations/bridgetevisoperations
```

### `bypasspoints` (1)
```
bypasspoints
```

### `channelaprops` (1)
```
channelaprops
```

### `channeltypelpty` (1)
```
channeltypelpty
```

### `channeltypes` (1) — Сувгийн төрөл
```
channeltypes
```

### `cpty` (1)
```
cpty
```

### `dataloctypes` (1)
```
dataloctypes
```

### `datapointprops` (1)
```
datapointprops
```

### `datapoints` (1)
```
datapoints
```

### `datapointstypes` (1)
```
datapointstypes
```

### `datawitheclasses` (1)
```
datawitheclasses
```

### `datawithes` (1) — Data withe
```
datawithes
```

### `datawithetypes` (1)
```
datawithetypes
```

### `dayprogramsdata` (1)
```
dayprogramsdata
```

### `devdp` (1)
```
devdp
```

### `devicespropstypes` (1)
```
devicespropstypes
```

### `devicestypes` (1) — Төхөөрөмжийн төрөл
```
devicestypes
```

### `devicestypesdpty` (1)
```
devicestypesdpty
```

### `devmou` (1)
```
devmou
```

### `dewwithe` (1)
```
dewwithe
```

### `dewwithetype` (1)
```
dewwithetype
```

### `di_dp` (1)
```
di_dp
```

### `di_ds` (1)
```
di_ds
```

### `di_point` (1)
```
di_point
```

### `dirp` (1)
```
dirp
```

### `dl_type_show` (1)
```
dl_type_show
```

### `dp_das` (1) — DP DAS
```
dp_das
```

### `dp_das_frc` (1)
```
dp_das_frc
```

### `dp_das_log` (1)
```
dp_das_log
```

### `dp_type_show` (1)
```
dp_type_show
```

### `ds_auto_write_plan` (1)
```
ds_auto_write_plan
```

### `ds_auto_write_sch` (1)
```
ds_auto_write_sch
```

### `ds_gr` (1)
```
ds_gr
```

### `ds_type_gr` (1)
```
ds_type_gr
```

### `dsperiods` (1)
```
dsperiods
```

### `dwsettinghistory` (1)
```
dwsettinghistory
```

### `eapp` (1)
```
eapp
```

### `eapp_edev_status` (1)
```
eapp_edev_status
```

### `eapp_ee_status` (1)
```
eapp_ee_status
```

### `eapp_log` (1)
```
eapp_log
```

### `eapp_status` (1)
```
eapp_status
```

### `ecocategories` (1) — Эдийн засгийн ангилал
```
ecocategories
```

### `ecoprofiles` (1) — Эдийн засгийн профиль
```
ecoprofiles
```

### `ecp_data` (1)
```
ecp_data
```

### `edev` (1)
```
edev
```

### `edev_ee` (1)
```
edev_ee
```

### `edev_log` (1)
```
edev_log
```

### `edevprq` (1)
```
edevprq
```

### `edevprq_log` (1)
```
edevprq_log
```

### `ee` (1)
```
ee
```

### `engineeringunits` (1)
```
engineeringunits
```

### `enumerationtypes` (1)
```
enumerationtypes
```

### `ev` (1) — Үйл явдал grid
```
ev
```

### `ev_fields` (1)
```
ev_fields
```

### `eva_ack_ug` (1)
```
eva_ack_ug
```

### `eva_ack_user` (1)
```
eva_ack_user
```

### `evabgaqf` (1)
```
evabgaqf
```

### `evac_type` (1)
```
evac_type
```

### `evaqf` (1)
```
evaqf
```

### `eventaccidents` (1) — Осол/ослын нөхцөл
```
eventaccidents
```

### `eventaccidentsconditions` (1)
```
eventaccidentsconditions
```

### `eventaccidentstypes` (1)
```
eventaccidentstypes
```

### `events_mcc` (1) — MCC үйл явдал
```
events_mcc
```

### `evt` (1) — Үйл явдлын ангилал
```
evt
```

### `exc_src_tmpl_gr` (1)
```
exc_src_tmpl_gr
```

### `exchangeelements` (1) — Солилцооны элемент
```
exchangeelements
```

### `exchangeoperations` (1) — Солилцооны үйлдэл
```
exchangeoperations
```

### `fib` (1)
```
fib
```

### `file_type` (1) — Файлын төрөл
```
file_type
```

### `fillingprofiledata` (1)
```
fillingprofiledata
```

### `formula` (1)
```
formula
```

### `gewwithe` (1)
```
gewwithe
```

### `gewwithetype` (1)
```
gewwithetype
```

### `gmod` (1)
```
gmod
```

### `gmod_data` (1)
```
gmod_data
```

### `grc` (1)
```
grc
```

### `grc_data` (1)
```
grc_data
```

### `grc_rule` (1)
```
grc_rule
```

### `groupmodifications` (1) — Бүлгийн өөрчлөлт
```
groupmodifications
```

### `grouppropsgpty` (1)
```
grouppropsgpty
```

### `grouppropstypes` (1)
```
grouppropstypes
```

### `grp_data` (1)
```
grp_data
```

### `grq_data` (1)
```
grq_data
```

### `grq_det` (1)
```
grq_det
```

### `grq_prq` (1)
```
grq_prq
```

### `grq_src_data` (1)
```
grq_src_data
```

### `grq_src_data_det` (1)
```
grq_src_data_det
```

### `gtp` (1)
```
gtp
```

### `holidays` (1) — Амралтын өдөр
```
holidays
```

### `holidaysdata` (1)
```
holidaysdata
```

### `import_data_file` (1) — Файл импорт
```
import_data_file
```

### `important_withe_all` (1)
```
important_withe_all
```

### `importantwithe` (1)
```
importantwithe
```

### `importkesc` (1) — KESC импорт
```
importkesc
```

### `lim` (1)
```
lim
```

### `linkprofiles` (1) — Холболтын профиль
```
linkprofiles
```

### `linkprofilesdata` (1)
```
linkprofilesdata
```

### `lossparams` (1) — Алдагдлын параметр
```
lossparams
```

### `ltc` (1)
```
ltc
```

### `mcc` (1)
```
mcc/last
```

### `measurementsaggfuncs` (1)
```
measurementsaggfuncs
```

### `measurementsarchives` (1)
```
measurementsarchives
```

### `measuringdevicespropstypes` (1)
```
measuringdevicespropstypes
```

### `measuringdevicetypes` (1) — Тоолуурын төрөл
```
measuringdevicetypes
```

### `metertypempty` (1)
```
metertypempty
```

### `modwithe` (1)
```
modwithe
```

### `mou_type_upty` (1)
```
mou_type_upty
```

### `mountingtypes` (1) — Монтажийн төрөл
```
mountingtypes
```

### `ms_type_ug` (1)
```
ms_type_ug
```

### `ollama` (1) — AI (ollama generate)
```
ollama/generate
```

### `op` (1)
```
op
```

### `op_errors` (1)
```
op_errors
```

### `op_param_log` (1)
```
op_param_log
```

### `op_param_type` (1)
```
op_param_type
```

### `op_type` (1)
```
op_type
```

### `os` (1)
```
os
```

### `ph_layer` (1)
```
ph_layer
```

### `ph_props` (1)
```
ph_props
```

### `ph_type_show` (1)
```
ph_type_show
```

### `pobj_data` (1)
```
pobj_data
```

### `pobj_limits_offer` (1)
```
pobj_limits_offer/rgb_grid
```

### `pobj_point_ds` (1)
```
pobj_point_ds
```

### `pobj_recom` (1)
```
pobj_recom
```

### `pobj_recom_15` (1)
```
pobj_recom_15
```

### `pobj_reg` (1)
```
pobj_reg
```

### `pobj_res` (1)
```
pobj_res
```

### `pobj_tpty` (1)
```
pobj_tpty
```

### `pobj_type` (1)
```
pobj_type
```

### `pointprops` (1) — Цэгийн шинж
```
pointprops
```

### `pointpropstypes` (1)
```
pointpropstypes
```

### `pointrules` (1)
```
pointrules
```

### `pointtypeppty` (1)
```
pointtypeppty
```

### `pointtypes` (1) — Цэгийн төрөл
```
pointtypes
```

### `possiblesolutions` (1)
```
possiblesolutions
```

### `powerrecommdata` (1)
```
powerrecommdata
```

### `powerrecommds` (1)
```
powerrecommds/switch
```

### `prq_det` (1)
```
prq_det
```

### `prq_sum` (1)
```
prq_sum
```

### `ptp` (1)
```
ptp
```

### `ptyformats` (1)
```
ptyformats
```

### `pwsettinghistory` (1)
```
pwsettinghistory
```

### `rc` (1)
```
rc
```

### `realtimeprofiles` (1) — Realtime профиль
```
realtimeprofiles
```

### `realtimeprofilesdata` (1)
```
realtimeprofilesdata
```

### `rel_type_epty` (1)
```
rel_type_epty
```

### `relationpropertytypes` (1)
```
relationpropertytypes
```

### `relationshippos` (1)
```
relationshippos
```

### `relationshipprops` (1)
```
relationshipprops
```

### `relationships` (1)
```
relationships
```

### `relationshiptypepos` (1)
```
relationshiptypepos
```

### `relationshiptypes` (1)
```
relationshiptypes
```

### `reportslog` (1) — Тайлангийн журнал
```
reportslog
```

### `reportsusergroups` (1) — Тайлан-хэрэглэгч бүлэг
```
reportsusergroups/rp_ug
```

### `rodo` (1)
```
rodo
```

### `rp_das_frc` (1)
```
rp_das_frc
```

### `rp_das_log` (1)
```
rp_das_log
```

### `rpp` (1)
```
rpp
```

### `sampledaydata` (1)
```
sampledaydata
```

### `sampleperiods` (1)
```
sampleperiods
```

### `sampletypes` (1)
```
sampletypes
```

### `sbst` (1)
```
sbst
```

### `schemedatatype` (1)
```
schemedatatype
```

### `schemeds` (1)
```
schemeds
```

### `schemelog` (1) — Схемийн журнал
```
schemelog
```

### `schemetype` (1)
```
schemetype
```

### `schemeusergroup` (1)
```
schemeusergroup
```

### `se_tmpl_dp_sheaf` (1)
```
se_tmpl_dp_sheaf
```

### `se_tmpl_dp_sheaf_lpty` (1)
```
se_tmpl_dp_sheaf_lpty
```

### `se_tmpl_dp_sheaf_ph_type` (1)
```
se_tmpl_dp_sheaf_ph_type
```

### `se_tmpl_lpty` (1)
```
se_tmpl_lpty
```

### `se_tmpl_md_aggs` (1)
```
se_tmpl_md_aggs
```

### `se_tmpl_md_aggs_ph_type` (1)
```
se_tmpl_md_aggs_ph_type
```

### `se_tmpl_ph_type` (1)
```
se_tmpl_ph_type
```

### `se_tmpl_sheaf` (1)
```
se_tmpl_sheaf
```

### `se_tmpl_sheaf_lpty` (1)
```
se_tmpl_sheaf_lpty
```

### `se_tmpl_sheaf_ph_type` (1)
```
se_tmpl_sheaf_ph_type
```

### `sep_tmpl` (1) — SEP загвар
```
sep_tmpl
```

### `sep_tmpl_dp_sheaf` (1)
```
sep_tmpl_dp_sheaf
```

### `sep_tmpl_md_aggs` (1)
```
sep_tmpl_md_aggs
```

### `sep_tmpl_sheaf` (1)
```
sep_tmpl_sheaf
```

### `sepdetails` (1)
```
sepdetails
```

### `simpleschedules` (1) — Энгийн хуваарь
```
simpleschedules
```

### `sourceelementpropsa` (1)
```
sourceelementpropsa
```

### `sourcepropsa` (1)
```
sourcepropsa
```

### `sourcetemplate` (1) — Эх загвар
```
sourcetemplate
```

### `sp_lpty` (1)
```
sp_lpty
```

### `sp_src` (1)
```
sp_src
```

### `specialdays` (1) — Тусгай өдөр
```
specialdays
```

### `src_rule` (1)
```
src_rule
```

### `src_tmpl_lpty` (1)
```
src_tmpl_lpty
```

### `src_tmpl_ph_type_lpty` (1)
```
src_tmpl_ph_type_lpty
```

### `src_tmpl_report` (1)
```
src_tmpl_report
```

### `src_tmpl_src` (1)
```
src_tmpl_src
```

### `src_type_important_withe` (1)
```
src_type_important_withe
```

### `src_type_sheaf` (1)
```
src_type_sheaf
```

### `steadytypes` (1)
```
steadytypes
```

### `systemeventsclasses` (1)
```
systemeventsclasses
```

### `systemeventstypes` (1)
```
systemeventstypes
```

### `systemmodules` (1) — Системийн модуль
```
systemmodules
```

### `systemprops` (1) — Системийн шинж
```
systemprops
```

### `tables` (1)
```
tables
```

### `tabletypes` (1)
```
tabletypes
```

### `tariffplans` (1) — Тарифын төлөвлөгөө
```
tariffplans
```

### `tariffplansperiods` (1) — Тарифын мөчлөг
```
tariffplansperiods
```

### `tff_system` (1) — TFF систем
```
tff_system
```

### `timeperiods` (1) — Хугацааны муж
```
timeperiods
```

### `timezones` (1) — Цагийн бүс
```
timezones
```

### `transaction` (1) — Гүйлгээ
```
transaction
```

### `ug_not_eva` (1)
```
ug_not_eva
```

### `ugrole` (1)
```
ugrole
```

### `ugroot` (1)
```
ugroot
```

### `upty_type` (1)
```
upty_type
```

### `user_not_eva` (1)
```
user_not_eva
```

### `usergroupdata` (1)
```
usergroupdata
```

### `usergrouptype` (1)
```
usergrouptype
```

### `usersessions` (1) — Идэвхтэй сессион
```
usersessions
```

### `verges` (1)
```
verges
```

### `verificationprofiledata` (1)
```
verificationprofiledata
```

### `verificationprofilescalar` (1)
```
verificationprofilescalar
```

### `withe` (1) — Withe (өгөгдлийн салбар)
```
withe
```

### `withesetdata` (1) — Witheset өгөгдөл
```
withesetdata
```

### `withesetdatalpty` (1)
```
withesetdatalpty
```

### `writerestrictions` (1) — Бичих хязгаар
```
writerestrictions
```

### `xa_das` (1) — XA DAS
```
xa_das
```

### `xa_das_frc` (1)
```
xa_das_frc
```

### `xa_das_log` (1)
```
xa_das_log
```

### `xa_rpty` (1)
```
xa_rpty
```

### `xf_type_rpp` (1)
```
xf_type_rpp
```

### `xf_type_xfau_type` (1)
```
xf_type_xfau_type
```

### `xf_xpty` (1)
```
xf_xpty
```

### `xfa` (1)
```
xfa
```

### `xfau_type` (1)
```
xfau_type
```

### `xfe_ml` (1)
```
xfe_ml
```

### `xo_type` (1)
```
xo_type
```

### `ypty` (1)
```
ypty
```

### `ypty_type` (1)
```
ypty_type
```
