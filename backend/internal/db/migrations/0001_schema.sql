-- EMCOS EC3 backend — PostgreSQL schema (mirrors the Oracle ST_ model, key entities).
-- Column names are lowercase in DB; the API layer aliases them to UPPER_CASE keys
-- (POINT_ID, ...) to match the real ec3api/v1 responses.

-- ---- Users / RBAC -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id       BIGSERIAL PRIMARY KEY,
    user_name     TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    privileges    JSONB NOT NULL DEFAULT '[]',   -- array of privilege codes, or ["*"] for all
    company       TEXT,
    department    TEXT,
    enabled       INT NOT NULL DEFAULT 1,
    db_time       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_settings (
    uv_id        BIGSERIAL PRIMARY KEY,
    uv_name      TEXT NOT NULL,
    uv_public    INT NOT NULL DEFAULT 0,
    uv_module    TEXT NOT NULL,
    uv_type      TEXT,
    uv_subtype   TEXT,
    uv_tech_info JSONB,
    user_id      BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    db_time      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Dictionaries -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_types (
    gr_type_id   BIGSERIAL PRIMARY KEY,
    gr_type_code TEXT NOT NULL,
    gr_type_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS point_types (
    point_type_id   BIGSERIAL PRIMARY KEY,
    point_type_code TEXT NOT NULL,
    point_type_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meter_types (
    meter_type_id       BIGSERIAL PRIMARY KEY,
    meter_type_name     TEXT NOT NULL,
    meter_type_producer TEXT
);

CREATE TABLE IF NOT EXISTS eco_categories (
    ec_id   BIGSERIAL PRIMARY KEY,
    ec_code TEXT NOT NULL,
    ec_name TEXT NOT NULL,
    ec_in   INT
);

CREATE TABLE IF NOT EXISTS eco_profiles (
    ecp_id   BIGSERIAL PRIMARY KEY,
    ecp_code TEXT NOT NULL,
    ecp_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_servers (
    das_id      BIGSERIAL PRIMARY KEY,
    das_name    TEXT NOT NULL,
    das_enabled INT NOT NULL DEFAULT 1,
    das_active  INT NOT NULL DEFAULT 1,
    db_time     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_modules (
    mdl_id   BIGSERIAL PRIMARY KEY,
    mdl_code TEXT NOT NULL,
    mdl_name TEXT NOT NULL
);

-- ---- Core entities ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS groups (
    gr_id        BIGSERIAL PRIMARY KEY,
    gr_code      TEXT,
    gr_name      TEXT NOT NULL,
    gr_type_id   BIGINT REFERENCES group_types(gr_type_id),
    parent_gr_id BIGINT REFERENCES groups(gr_id),
    is_public    INT NOT NULL DEFAULT 0,
    user_id      BIGINT REFERENCES users(user_id),
    db_time      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points (
    point_id                BIGSERIAL PRIMARY KEY,
    point_code              TEXT NOT NULL UNIQUE,
    point_name              TEXT NOT NULL,
    point_type_id           BIGINT REFERENCES point_types(point_type_id),
    ec_id                   BIGINT REFERENCES eco_categories(ec_id),
    ecp_id                  BIGINT REFERENCES eco_profiles(ecp_id),
    gr_id                   BIGINT REFERENCES groups(gr_id),
    point_enabled           INT NOT NULL DEFAULT 1,
    point_commercial        INT NOT NULL DEFAULT 0,
    point_auto_read_enabled INT NOT NULL DEFAULT 0,
    point_licensed          INT NOT NULL DEFAULT 0,
    point_internal          INT NOT NULL DEFAULT 0,
    db_time                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meters (
    meter_id      BIGSERIAL PRIMARY KEY,
    meter_type_id BIGINT REFERENCES meter_types(meter_type_id),
    meter_number  TEXT NOT NULL,
    made          DATE,
    expl_start    DATE,
    meter_class   TEXT
);

CREATE TABLE IF NOT EXISTS mountings (
    mou_id       BIGSERIAL PRIMARY KEY,
    meter_id     BIGINT NOT NULL REFERENCES meters(meter_id),
    point_id     BIGINT NOT NULL REFERENCES points(point_id),
    mou_type_id  BIGINT,
    mou_bt       TIMESTAMPTZ NOT NULL,
    mou_et       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS data_points (
    dp_id      BIGSERIAL PRIMARY KEY,
    dp_code    TEXT,
    dp_name    TEXT NOT NULL,
    dp_type_id INT NOT NULL DEFAULT 1,
    dp_enabled INT NOT NULL DEFAULT 1,
    dp_deleted INT NOT NULL DEFAULT 0,
    point_id   BIGINT REFERENCES points(point_id)
);

CREATE TABLE IF NOT EXISTS events (
    ev_id   BIGSERIAL PRIMARY KEY,
    ev_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    evc_id  INT NOT NULL DEFAULT 6,     -- event category (6 = all messages)
    mdl_id  BIGINT REFERENCES system_modules(mdl_id),
    das_id  BIGINT REFERENCES data_servers(das_id),
    dp_id   BIGINT REFERENCES data_points(dp_id),
    ev_text TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_points_gr ON points(gr_id);
CREATE INDEX IF NOT EXISTS idx_mountings_point ON mountings(point_id);
CREATE INDEX IF NOT EXISTS idx_events_time ON events(ev_time);
