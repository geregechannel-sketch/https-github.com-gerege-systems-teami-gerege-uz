-- Canonical local archive storage. No fabricated readings or automatic imports.
-- Source adapters must verify point/parameter mapping before inserting records.
CREATE TABLE IF NOT EXISTS archive_samples (
    point_id BIGINT NOT NULL REFERENCES points(point_id),
    ml_id BIGINT NOT NULL,
    md_id BIGINT NOT NULL,
    aggs_id BIGINT NOT NULL,
    begin_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    value NUMERIC NOT NULL,
    unit TEXT NOT NULL CHECK (length(trim(unit)) > 0),
    source_status TEXT NOT NULL,
    source_ref TEXT NOT NULL CHECK (length(trim(source_ref)) > 0),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (point_id, ml_id, md_id, aggs_id, begin_time),
    CHECK (end_time > begin_time)
);
