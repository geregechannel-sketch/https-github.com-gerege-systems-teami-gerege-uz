-- Functional report catalog, execution journal and automated schedules.
-- These tables complement the source-shaped generated stubs with a compact,
-- stable contract used by the bespoke reports UI.
CREATE TABLE IF NOT EXISTS report_definitions (
    report_id      BIGSERIAL PRIMARY KEY,
    report_code    TEXT NOT NULL UNIQUE,
    report_name    TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    folder         TEXT NOT NULL DEFAULT 'Общие',
    period_kind    TEXT NOT NULL DEFAULT 'DAY',
    needs_points   BOOLEAN NOT NULL DEFAULT true,
    default_format TEXT NOT NULL DEFAULT 'XLSX',
    enabled        BOOLEAN NOT NULL DEFAULT true,
    sort_order     INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS report_automations (
    automation_id BIGSERIAL PRIMARY KEY,
    report_id     BIGINT NOT NULL REFERENCES report_definitions(report_id),
    name          TEXT NOT NULL,
    schedule_code TEXT NOT NULL DEFAULT 'DAILY',
    schedule_time TEXT NOT NULL DEFAULT '08:00',
    recipients    TEXT NOT NULL DEFAULT '',
    output_format TEXT NOT NULL DEFAULT 'XLSX',
    enabled       BOOLEAN NOT NULL DEFAULT true,
    next_run      TIMESTAMPTZ,
    last_run      TIMESTAMPTZ,
    created_by    TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_runs (
    run_id        BIGSERIAL PRIMARY KEY,
    report_id     BIGINT NOT NULL REFERENCES report_definitions(report_id),
    automation_id BIGINT REFERENCES report_automations(automation_id) ON DELETE SET NULL,
    requested_by  TEXT NOT NULL DEFAULT '',
    point_ids     BIGINT[] NOT NULL DEFAULT '{}',
    period_from   TIMESTAMPTZ NOT NULL,
    period_to     TIMESTAMPTZ NOT NULL,
    output_format TEXT NOT NULL DEFAULT 'XLSX',
    status        TEXT NOT NULL DEFAULT 'QUEUED',
    row_count     INT NOT NULL DEFAULT 0,
    duration_ms   INT NOT NULL DEFAULT 0,
    message       TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at   TIMESTAMPTZ
);

INSERT INTO report_definitions
    (report_code, report_name, description, folder, period_kind, needs_points, default_format, sort_order)
VALUES
    ('DAILY_CONSUMPTION', 'Суточная ведомость электропотребления', 'Начальные и конечные показания, расход за выбранный период.', 'Общие', 'DAY', true, 'XLSX', 10),
    ('END_OF_DAY', 'Показания на конец суток', 'Последние накопительные показания по выбранным точкам учета.', 'Общие', 'DAY', true, 'XLSX', 20),
    ('ARCHIVE_QUALITY', 'Полнота архивов', 'Количество полученных и отсутствующих интервальных значений.', 'Общие', 'DAY', true, 'XLSX', 30),
    ('TECHNICAL_VALUES', 'Технические параметры', 'Средние напряжение, ток и частота по точкам учета.', 'Общие', 'DAY', true, 'XLSX', 40),
    ('POINT_BALANCE', 'Баланс по точкам учета', 'Расход, расчетные потери и итоговый баланс.', 'Персональные', 'DAY', true, 'XLSX', 50),
    ('EVENT_REGISTER', 'Регистр событий за период', 'Системные сообщения и события за выбранный период.', 'Персональные', 'DAY', false, 'XLSX', 60)
ON CONFLICT (report_code) DO UPDATE SET
    report_name=EXCLUDED.report_name,
    description=EXCLUDED.description,
    folder=EXCLUDED.folder,
    period_kind=EXCLUDED.period_kind,
    needs_points=EXCLUDED.needs_points,
    sort_order=EXCLUDED.sort_order;

CREATE INDEX IF NOT EXISTS idx_report_runs_created ON report_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_automations_next ON report_automations(enabled, next_run);
