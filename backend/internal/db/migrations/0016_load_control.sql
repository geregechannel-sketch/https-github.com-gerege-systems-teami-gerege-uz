CREATE TABLE IF NOT EXISTS load_control_relays (
    relay_id BIGSERIAL PRIMARY KEY,
    point_id BIGINT NOT NULL REFERENCES points(point_id) ON DELETE CASCADE,
    relay_code TEXT NOT NULL UNIQUE,
    relay_name TEXT NOT NULL,
    current_state BOOLEAN,
    desired_state BOOLEAN,
    db_state BOOLEAN,
    device_state BOOLEAN,
    command_status TEXT NOT NULL DEFAULT 'IDLE',
    channel_type TEXT NOT NULL DEFAULT 'GSM',
    reading_point_type TEXT NOT NULL DEFAULT 'DCU',
    data_location TEXT NOT NULL DEFAULT 'DEVICE',
    db_at TIMESTAMPTZ,
    device_at TIMESTAMPTZ,
    enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS load_control_limits (
    limit_id BIGSERIAL PRIMARY KEY,
    point_id BIGINT NOT NULL REFERENCES points(point_id) ON DELETE CASCADE,
    parameter_code TEXT NOT NULL,
    parameter_name TEXT NOT NULL,
    limit_value NUMERIC(14,3) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'кВт',
    command_status TEXT NOT NULL DEFAULT 'IDLE',
    data_source TEXT NOT NULL DEFAULT 'DATABASE',
    channel_type TEXT NOT NULL DEFAULT 'GSM',
    reading_point_type TEXT NOT NULL DEFAULT 'DCU',
    data_location TEXT NOT NULL DEFAULT 'DEVICE',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(point_id, parameter_code)
);

CREATE TABLE IF NOT EXISTS load_control_commands (
    command_id BIGSERIAL PRIMARY KEY,
    target_type TEXT NOT NULL,
    target_id BIGINT NOT NULL,
    action TEXT NOT NULL,
    requested_by TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    message TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_load_relays_point ON load_control_relays(point_id);
CREATE INDEX IF NOT EXISTS idx_load_limits_point ON load_control_limits(point_id);
CREATE INDEX IF NOT EXISTS idx_load_commands_created ON load_control_commands(created_at DESC);

WITH first_point AS (
    SELECT point_id FROM points WHERE point_enabled=1 ORDER BY point_id LIMIT 1
), seed(relay_code, relay_name, current_state, desired_state, channel_type, data_location) AS (
    VALUES
      ('TP43.R1', 'Реле ввода QF-12', true, true, 'GSM', 'DEVICE'),
      ('TP43.R2', 'Реле фидера A', true, true, 'GSM', 'DATABASE'),
      ('TP43.R3', 'Реле фидера B', true, true, 'PLC', 'DEVICE'),
      ('TP43.R4', 'Реле аварийного отключения', false, false, 'PLC', 'DATABASE')
)
INSERT INTO load_control_relays
    (point_id, relay_code, relay_name, current_state, desired_state, db_state,
     device_state, command_status, channel_type, reading_point_type, data_location,
     db_at, device_at)
SELECT fp.point_id, seed.relay_code, seed.relay_name, seed.current_state,
       seed.desired_state, seed.current_state, seed.current_state, 'COMPLETED',
       seed.channel_type, 'DCU', seed.data_location,
       now() - interval '2 minutes', now() - interval '1 minute'
FROM seed CROSS JOIN first_point fp
ON CONFLICT (relay_code) DO NOTHING;

WITH first_point AS (
    SELECT point_id FROM points WHERE point_enabled=1 ORDER BY point_id LIMIT 1
), seed(parameter_code, parameter_name, limit_value, unit, data_source) AS (
    VALUES
      ('ACTIVE_POWER', 'Лимит активной мощности', 80.000, 'кВт', 'DATABASE'),
      ('CURRENT', 'Лимит тока', 160.000, 'А', 'DEVICE'),
      ('DEMAND', 'Лимит максимального спроса', 95.000, 'кВт', 'DATABASE')
)
INSERT INTO load_control_limits
    (point_id, parameter_code, parameter_name, limit_value, unit, command_status,
     data_source, channel_type, reading_point_type, data_location)
SELECT fp.point_id, seed.parameter_code, seed.parameter_name, seed.limit_value,
       seed.unit, 'COMPLETED', seed.data_source, 'GSM', 'DCU', 'DEVICE'
FROM seed CROSS JOIN first_point fp
ON CONFLICT (point_id, parameter_code) DO NOTHING;
