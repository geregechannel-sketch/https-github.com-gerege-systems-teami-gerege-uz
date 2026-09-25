-- Reading collection jobs and their normalized archive values.
-- A real DAS worker can write to the same tables without changing the UI API.
CREATE TABLE IF NOT EXISTS reading_jobs (
    job_id          BIGSERIAL PRIMARY KEY,
    action          TEXT NOT NULL CHECK (action IN ('COLLECT', 'RECOLLECT')),
    point_ids       BIGINT[] NOT NULL DEFAULT '{}',
    parameters      TEXT[] NOT NULL DEFAULT '{}',
    range_from      TIMESTAMPTZ NOT NULL,
    range_to        TIMESTAMPTZ NOT NULL,
    dl_type_id      TEXT NOT NULL DEFAULT 'AUTO',
    dp_type_id      TEXT NOT NULL DEFAULT 'AUTO',
    ph_type_id      TEXT NOT NULL DEFAULT 'AUTO',
    status          TEXT NOT NULL DEFAULT 'QUEUED',
    progress        INT NOT NULL DEFAULT 0,
    requested_by    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at      TIMESTAMPTZ,
    finished_at     TIMESTAMPTZ,
    message         TEXT
);

CREATE TABLE IF NOT EXISTS reading_values (
    reading_id      BIGSERIAL PRIMARY KEY,
    point_id        BIGINT NOT NULL REFERENCES points(point_id) ON DELETE CASCADE,
    meter_id        BIGINT REFERENCES meters(meter_id) ON DELETE SET NULL,
    parameter_code  TEXT NOT NULL,
    reading_time    TIMESTAMPTZ NOT NULL,
    reading_value   NUMERIC(18, 6) NOT NULL,
    unit            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'OK',
    source          TEXT NOT NULL DEFAULT 'DAS',
    collected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    job_id          BIGINT REFERENCES reading_jobs(job_id) ON DELETE SET NULL,
    UNIQUE (point_id, parameter_code, reading_time)
);

CREATE INDEX IF NOT EXISTS idx_reading_values_filter
    ON reading_values (point_id, parameter_code, reading_time);
CREATE INDEX IF NOT EXISTS idx_reading_jobs_created
    ON reading_jobs (created_at DESC);
