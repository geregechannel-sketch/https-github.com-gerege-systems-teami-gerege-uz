-- 0006_extras.sql — synthetic backing tables + seed for the deep menu-leaf models
-- (event logs, audit, link/device statistics, device logs, config lists).
-- Idempotent: migrations re-run every boot, so tables use IF NOT EXISTS and
-- seeds TRUNCATE + reinsert the same synthetic set. Best-effort ("taamaglan"),
-- so every 3rd-level grid shows plausible data.

-- ===================== Event log (Регистр событий → События) =====================
CREATE TABLE IF NOT EXISTS event_log (
  el_id     BIGSERIAL PRIMARY KEY,
  el_time   TIMESTAMPTZ NOT NULL,
  el_type   TEXT NOT NULL,
  el_level  TEXT NOT NULL,
  el_source TEXT,
  el_text   TEXT
);
TRUNCATE event_log RESTART IDENTITY;
INSERT INTO event_log (el_time, el_type, el_level, el_source, el_text)
SELECT now() - (g * interval '37 minutes'),
       (ARRAY['oracle','software','connection','data','system'])[1+(g%5)],
       (ARRAY['INFO','INFO','INFO','WARN','ERROR'])[1+(g%5)],
       'DAS-'||(1+(g%7)),
       (ARRAY['Соединение установлено','Опрос завершён успешно','Таймаут ответа устройства',
              'Данные архива получены','Перезапуск службы сбора','Ошибка чтения регистра',
              'Сессия с контроллером закрыта','Синхронизация времени','Буфер переполнен'])[1+(g%9)]
FROM generate_series(0,149) g;

CREATE OR REPLACE VIEW event_log_oracle     AS SELECT * FROM event_log WHERE el_type='oracle';
CREATE OR REPLACE VIEW event_log_software   AS SELECT * FROM event_log WHERE el_type='software';
CREATE OR REPLACE VIEW event_log_connection AS SELECT * FROM event_log WHERE el_type='connection';
CREATE OR REPLACE VIEW event_log_data       AS SELECT * FROM event_log WHERE el_type='data';
CREATE OR REPLACE VIEW event_log_system     AS SELECT * FROM event_log WHERE el_type='system';

-- "Все сообщения" maps to the real events table — seed it too.
TRUNCATE events RESTART IDENTITY;
INSERT INTO events (ev_time, evc_id, mdl_id, das_id, dp_id, ev_text)
SELECT now() - (g * interval '29 minutes'), 6, NULL, NULL, NULL,
       (ARRAY['Опрос завершён','Соединение установлено','Таймаут','Данные получены',
              'Перезапуск','Ошибка чтения','Сессия закрыта'])[1+(g%7)]
FROM generate_series(0,99) g;

-- ===================== Аудит =====================
CREATE TABLE IF NOT EXISTS audit_log (
  aud_id BIGSERIAL PRIMARY KEY, aud_time TIMESTAMPTZ NOT NULL,
  aud_user TEXT, aud_object TEXT, aud_action TEXT, aud_detail TEXT
);
TRUNCATE audit_log RESTART IDENTITY;
INSERT INTO audit_log (aud_time, aud_user, aud_object, aud_action, aud_detail)
SELECT now() - (g * interval '3 hours'),
       (ARRAY['erdenebatt','admin','operator'])[1+(g%3)],
       (ARRAY['points','meters','groups','reports','users'])[1+(g%5)],
       (ARRAY['CREATE','UPDATE','DELETE','LOGIN','EXPORT'])[1+(g%5)],
       'Запись изменена пользователем'
FROM generate_series(0,59) g;

CREATE TABLE IF NOT EXISTS audit_files (
  af_id BIGSERIAL PRIMARY KEY, af_time TIMESTAMPTZ NOT NULL,
  af_user TEXT, af_file TEXT, af_action TEXT, af_size BIGINT
);
TRUNCATE audit_files RESTART IDENTITY;
INSERT INTO audit_files (af_time, af_user, af_file, af_action, af_size)
SELECT now() - (g * interval '5 hours'),
       (ARRAY['erdenebatt','admin'])[1+(g%2)],
       'report_'||to_char(now() - (g*interval '5 hours'),'YYYYMMDD')||'.xlsx',
       (ARRAY['UPLOAD','DOWNLOAD','DELETE'])[1+(g%3)],
       10240 + (g*137)%900000
FROM generate_series(0,39) g;

CREATE TABLE IF NOT EXISTS user_sessions (
  us_id BIGSERIAL PRIMARY KEY, us_user TEXT, us_login TIMESTAMPTZ,
  us_logout TIMESTAMPTZ, us_ip TEXT, us_agent TEXT
);
TRUNCATE user_sessions RESTART IDENTITY;
INSERT INTO user_sessions (us_user, us_login, us_logout, us_ip, us_agent)
SELECT (ARRAY['erdenebatt','admin','operator'])[1+(g%3)],
       now() - (g*interval '7 hours'),
       now() - (g*interval '7 hours') + interval '45 minutes',
       '10.0.0.'||(2+(g%40)),
       (ARRAY['Chrome/128','Firefox/130','Edge/128'])[1+(g%3)]
FROM generate_series(0,44) g;

-- ===================== Статистика связи =====================
CREATE TABLE IF NOT EXISTS src_statistics (
  ss_id BIGSERIAL PRIMARY KEY, ss_source TEXT, ss_total INT, ss_ok INT,
  ss_failed INT, ss_last_time TIMESTAMPTZ
);
TRUNCATE src_statistics RESTART IDENTITY;
INSERT INTO src_statistics (ss_source, ss_total, ss_ok, ss_failed, ss_last_time)
SELECT COALESCE(das_name,'DAS-'||das_id),
       500+(das_id*37)%400, 450+(das_id*31)%350, (das_id*7)%40,
       now() - (das_id*interval '11 minutes')
FROM data_servers;

CREATE TABLE IF NOT EXISTS ph_statistics (
  ps_id BIGSERIAL PRIMARY KEY, ps_channel TEXT, ps_total INT, ps_ok INT,
  ps_failed INT, ps_last_time TIMESTAMPTZ
);
TRUNCATE ph_statistics RESTART IDENTITY;
INSERT INTO ph_statistics (ps_channel, ps_total, ps_ok, ps_failed, ps_last_time)
SELECT 'CH-'||lpad(g::text,2,'0'), 300+(g*53)%500, 280+(g*47)%420,
       (g*5)%30, now() - (g*interval '13 minutes')
FROM generate_series(1,18) g;

CREATE TABLE IF NOT EXISTS prq_statistics (
  pq_id BIGSERIAL PRIMARY KEY, pq_time TIMESTAMPTZ, pq_source TEXT,
  pq_type TEXT, pq_status TEXT, pq_duration_ms INT
);
TRUNCATE prq_statistics RESTART IDENTITY;
INSERT INTO prq_statistics (pq_time, pq_source, pq_type, pq_status, pq_duration_ms)
SELECT now() - (g*interval '17 minutes'), 'DAS-'||(1+(g%7)),
       (ARRAY['READ_PROFILE','READ_CURRENT','READ_EVENTS','SYNC_TIME'])[1+(g%4)],
       (ARRAY['OK','OK','OK','TIMEOUT','ERROR'])[1+(g%5)],
       120+(g*97)%4000
FROM generate_series(0,79) g;

-- ===================== Журналы устройств =====================
CREATE TABLE IF NOT EXISTS meter_log (
  ml_id BIGSERIAL PRIMARY KEY, ml_time TIMESTAMPTZ, ml_meter TEXT,
  ml_event TEXT, ml_detail TEXT
);
TRUNCATE meter_log RESTART IDENTITY;
INSERT INTO meter_log (ml_time, ml_meter, ml_event, ml_detail)
SELECT now() - (g*interval '41 minutes'),
       COALESCE((SELECT meter_number FROM meters OFFSET (g % GREATEST((SELECT count(*) FROM meters),1)) LIMIT 1), 'M'||g),
       (ARRAY['POWER_UP','POWER_DOWN','TAMPER','CONFIG_CHANGE','SELFTEST'])[1+(g%5)],
       'Событие счётчика зафиксировано'
FROM generate_series(0,79) g;

CREATE TABLE IF NOT EXISTS controller_log (
  cl_id BIGSERIAL PRIMARY KEY, cl_time TIMESTAMPTZ, cl_controller TEXT,
  cl_event TEXT, cl_detail TEXT
);
TRUNCATE controller_log RESTART IDENTITY;
INSERT INTO controller_log (cl_time, cl_controller, cl_event, cl_detail)
SELECT now() - (g*interval '53 minutes'), 'RTU-'||(1+(g%9)),
       (ARRAY['RESTART','LINK_UP','LINK_DOWN','FW_UPDATE','ALARM'])[1+(g%5)],
       'Событие контроллера зафиксировано'
FROM generate_series(0,59) g;

-- ===================== Конфигурация — списки =====================
CREATE TABLE IF NOT EXISTS classification (
  cls_id BIGSERIAL PRIMARY KEY, cls_code TEXT, cls_name TEXT, cls_group TEXT
);
TRUNCATE classification RESTART IDENTITY;
INSERT INTO classification (cls_code, cls_name, cls_group) VALUES
 ('NSI-001','Единицы измерения','Справочник'),
 ('NSI-002','Коэффициенты трансформации','Справочник'),
 ('NSI-003','Классы точности','Справочник'),
 ('NSI-004','Тарифные зоны','Тарификация'),
 ('NSI-005','Праздничные дни','Календарь'),
 ('NSI-006','Типы небаланса','Балансы'),
 ('NSI-007','Причины замены','Эксплуатация'),
 ('NSI-008','Нормативные потери','Расчёты');

CREATE TABLE IF NOT EXISTS link_priorities (
  lp_id BIGSERIAL PRIMARY KEY, lp_name TEXT, lp_priority INT, lp_enabled INT
);
TRUNCATE link_priorities RESTART IDENTITY;
INSERT INTO link_priorities (lp_name, lp_priority, lp_enabled)
SELECT 'Приоритет '||g, g, (g%2) FROM generate_series(1,6) g;

CREATE TABLE IF NOT EXISTS dp_show (
  dp_id BIGSERIAL PRIMARY KEY, dp_name TEXT, dp_source TEXT,
  dp_value NUMERIC, dp_time TIMESTAMPTZ, dp_quality TEXT
);
TRUNCATE dp_show RESTART IDENTITY;
INSERT INTO dp_show (dp_name, dp_source, dp_value, dp_time, dp_quality)
SELECT 'DP '||g, 'DAS-'||(1+(g%7)), round((100+(g*13.7))::numeric,2),
       now() - (g*interval '15 minutes'), (ARRAY['GOOD','GOOD','SUSPECT','BAD'])[1+(g%4)]
FROM generate_series(1,60) g;

CREATE TABLE IF NOT EXISTS controller_config (
  cc_id BIGSERIAL PRIMARY KEY, cc_controller TEXT, cc_param TEXT, cc_value TEXT
);
TRUNCATE controller_config RESTART IDENTITY;
INSERT INTO controller_config (cc_controller, cc_param, cc_value)
SELECT 'RTU-'||(1+(g%9)),
       (ARRAY['poll_interval','timeout_ms','retries','baudrate','protocol'])[1+(g%5)],
       (ARRAY['900','5000','3','9600','DLMS'])[1+(g%5)]
FROM generate_series(0,44) g;

CREATE TABLE IF NOT EXISTS meter_config (
  mc_id BIGSERIAL PRIMARY KEY, mc_meter TEXT, mc_param TEXT, mc_value TEXT
);
TRUNCATE meter_config RESTART IDENTITY;
INSERT INTO meter_config (mc_meter, mc_param, mc_value)
SELECT COALESCE((SELECT meter_number FROM meters OFFSET (g % GREATEST((SELECT count(*) FROM meters),1)) LIMIT 1),'M'||g),
       (ARRAY['ct_ratio','vt_ratio','tariff_count','demand_period'])[1+(g%4)],
       (ARRAY['40','1','4','30'])[1+(g%4)]
FROM generate_series(0,49) g;

CREATE TABLE IF NOT EXISTS user_management (
  um_id BIGSERIAL PRIMARY KEY, um_login TEXT, um_name TEXT, um_role TEXT,
  um_enabled INT, um_last_login TIMESTAMPTZ
);
TRUNCATE user_management RESTART IDENTITY;
INSERT INTO user_management (um_login, um_name, um_role, um_enabled, um_last_login) VALUES
 ('erdenebatt','Эрдэнэбат','Администратор',1, now() - interval '2 hours'),
 ('admin','Системный администратор','Администратор',1, now() - interval '1 day'),
 ('operator1','Оператор 1','Оператор',1, now() - interval '4 hours'),
 ('operator2','Оператор 2','Оператор',0, now() - interval '10 days'),
 ('viewer','Наблюдатель','Только чтение',1, now() - interval '30 minutes');
