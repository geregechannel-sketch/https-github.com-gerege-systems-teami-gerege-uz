CREATE TABLE IF NOT EXISTS signal_types (
    signal_type_id BIGSERIAL PRIMARY KEY,
    type_code TEXT NOT NULL UNIQUE,
    type_name TEXT NOT NULL,
    value_off TEXT NOT NULL DEFAULT 'Отключено',
    value_on TEXT NOT NULL DEFAULT 'Включено',
    event_log BOOLEAN NOT NULL DEFAULT false,
    realtime BOOLEAN NOT NULL DEFAULT true,
    is_binary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tele_signals (
    signal_id BIGSERIAL PRIMARY KEY,
    signal_name TEXT NOT NULL,
    signal_code TEXT NOT NULL UNIQUE,
    signal_type_id BIGINT NOT NULL REFERENCES signal_types(signal_type_id),
    point_id BIGINT REFERENCES points(point_id) ON DELETE SET NULL,
    object_name TEXT NOT NULL DEFAULT 'TOSH ELECTROAPPARAT',
    enabled BOOLEAN NOT NULL DEFAULT true,
    event_log BOOLEAN NOT NULL DEFAULT false,
    realtime BOOLEAN NOT NULL DEFAULT true,
    is_binary BOOLEAN NOT NULL DEFAULT true,
    auto_read BOOLEAN NOT NULL DEFAULT true,
    priority_profile TEXT NOT NULL DEFAULT 'Стандартный',
    group_name TEXT NOT NULL DEFAULT 'Основные сигналы',
    current_value TEXT NOT NULL DEFAULT '0',
    switched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    blocked BOOLEAN NOT NULL DEFAULT false,
    block_comment TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signal_history (
    history_id BIGSERIAL PRIMARY KEY,
    signal_id BIGINT NOT NULL REFERENCES tele_signals(signal_id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    signal_value TEXT NOT NULL,
    display_value TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'DEVICE',
    comment TEXT NOT NULL DEFAULT '',
    ignored BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS signal_commands (
    command_id BIGSERIAL PRIMARY KEY,
    signal_id BIGINT REFERENCES tele_signals(signal_id) ON DELETE SET NULL,
    command_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    requested_by TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS signal_fill_rules (
    rule_id BIGSERIAL PRIMARY KEY,
    rule_type TEXT NOT NULL DEFAULT 'POINT',
    signal_type_id BIGINT REFERENCES signal_types(signal_type_id) ON DELETE CASCADE,
    group_id BIGINT REFERENCES groups(gr_id) ON DELETE CASCADE,
    fill_by TEXT NOT NULL DEFAULT 'CODE',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tele_signals_point ON tele_signals(point_id);
CREATE INDEX IF NOT EXISTS idx_tele_signals_type ON tele_signals(signal_type_id);
CREATE INDEX IF NOT EXISTS idx_signal_history_signal_time ON signal_history(signal_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_commands_created ON signal_commands(created_at DESC);

INSERT INTO signal_types
    (type_code, type_name, value_off, value_on, event_log, realtime, is_binary)
VALUES
    ('BREAKER', 'Положение выключателя', 'Отключен', 'Включен', true, true, true),
    ('DOOR', 'Состояние двери', 'Закрыта', 'Открыта', true, true, true),
    ('POWER', 'Наличие напряжения', 'Нет напряжения', 'Напряжение есть', true, true, true),
    ('ALARM', 'Аварийный сигнал', 'Норма', 'Авария', true, true, true),
    ('OTHER', 'Другие', 'Нет', 'Да', false, true, true)
ON CONFLICT (type_code) DO UPDATE SET
    type_name=EXCLUDED.type_name, value_off=EXCLUDED.value_off, value_on=EXCLUDED.value_on,
    event_log=EXCLUDED.event_log, realtime=EXCLUDED.realtime, is_binary=EXCLUDED.is_binary;

WITH first_point AS (
    SELECT point_id FROM points ORDER BY point_id LIMIT 1
), seed(signal_code, signal_name, type_code, current_value, minutes_ago, group_name) AS (
    VALUES
      ('TP43.QF12.POS', 'Положение выключателя QF-12', 'BREAKER', '1', 7, 'Коммутационные аппараты'),
      ('TP43.DOOR.MAIN', 'Дверь шкафа учета', 'DOOR', '0', 18, 'Охранные сигналы'),
      ('TP43.POWER.A', 'Наличие напряжения, фаза A', 'POWER', '1', 3, 'Контроль питания'),
      ('TP43.POWER.B', 'Наличие напряжения, фаза B', 'POWER', '1', 4, 'Контроль питания'),
      ('TP43.ALARM.METER', 'Авария счетчика', 'ALARM', '0', 42, 'Аварийные сигналы'),
      ('TP43.COMM.DCU', 'Связь с контроллером', 'OTHER', '1', 2, 'Каналы связи')
)
INSERT INTO tele_signals
    (signal_code, signal_name, signal_type_id, point_id, enabled, event_log,
     realtime, is_binary, auto_read, priority_profile, group_name, current_value, switched_at)
SELECT seed.signal_code, seed.signal_name, st.signal_type_id, fp.point_id, true,
       st.event_log, st.realtime, st.is_binary, true,
       CASE WHEN seed.type_code='ALARM' THEN 'Аварийный' ELSE 'Стандартный' END,
       seed.group_name, seed.current_value, now() - make_interval(mins => seed.minutes_ago)
FROM seed
JOIN signal_types st ON st.type_code=seed.type_code
CROSS JOIN first_point fp
ON CONFLICT (signal_code) DO NOTHING;

INSERT INTO signal_history (signal_id, recorded_at, signal_value, display_value, source, comment)
SELECT s.signal_id,
       now() - make_interval(hours => series.n * 2, mins => (s.signal_id % 5)::int * 3),
       CASE WHEN (series.n + s.signal_id)::int % 3 = 0 THEN '0' ELSE '1' END,
       CASE WHEN (series.n + s.signal_id)::int % 3 = 0 THEN st.value_off ELSE st.value_on END,
       CASE WHEN series.n % 4 = 0 THEN 'OPERATOR' ELSE 'DEVICE' END,
       CASE WHEN series.n % 4 = 0 THEN 'Проверка диспетчера' ELSE '' END
FROM tele_signals s
JOIN signal_types st ON st.signal_type_id=s.signal_type_id
CROSS JOIN generate_series(0, 11) AS series(n)
WHERE NOT EXISTS (SELECT 1 FROM signal_history h WHERE h.signal_id=s.signal_id);

INSERT INTO signal_fill_rules (rule_type, signal_type_id, group_id, fill_by, enabled)
SELECT 'POINT', st.signal_type_id, g.gr_id, 'POINT_CODE', true
FROM signal_types st
JOIN groups g ON g.gr_id=900003
WHERE st.type_code='BREAKER'
  AND NOT EXISTS (SELECT 1 FROM signal_fill_rules);
