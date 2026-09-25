-- Source-shaped event register fields. 0006 refreshes demo events on every
-- boot, so this migration enriches that stable data set idempotently.
ALTER TABLE events ADD COLUMN IF NOT EXISTS ev_priority TEXT NOT NULL DEFAULT 'INFO';
ALTER TABLE events ADD COLUMN IF NOT EXISTS ev_last_time TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ev_point_name TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS ev_source TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS ev_source_type TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS ev_channel TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS ev_count INT NOT NULL DEFAULT 1;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ev_acknowledged BOOLEAN NOT NULL DEFAULT false;

UPDATE events
SET evc_id = 1 + ((ev_id - 1) % 5),
    ev_priority = (ARRAY['INFO','WARN','ERROR','INFO','CRITICAL'])[1 + ((ev_id - 1) % 5)],
    ev_last_time = ev_time + (((ev_id - 1) % 4) * interval '2 minutes'),
    ev_point_name = (ARRAY[
      'ТП 43 ЖКН№8', 'Баялаг ГС-1', 'Баялаг ГС-2',
      'Баялаг 6-627', 'Баялаг 6-611', 'DCU TEC-70'
    ])[1 + ((ev_id - 1) % 6)],
    ev_source = 'DAS-' || (1 + ((ev_id - 1) % 7)),
    ev_source_type = (ARRAY['Oracle','Служба сбора','Контроллер','Счетчик','Система'])[1 + ((ev_id - 1) % 5)],
    ev_channel = (ARRAY['TCP/IP','GSM/CSD','DLMS','IEC 62056','Внутренний'])[1 + ((ev_id - 1) % 5)],
    ev_count = 1 + ((ev_id - 1) % 4),
    ev_acknowledged = ((ev_id - 1) % 3) = 0;

CREATE INDEX IF NOT EXISTS idx_events_category_time ON events(evc_id, ev_time DESC);
CREATE INDEX IF NOT EXISTS idx_events_priority ON events(ev_priority);
