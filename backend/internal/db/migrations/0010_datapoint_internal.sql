-- Keep the core datapoints table aligned with the extracted TEAMI API shape.
-- Existing deployments already have data_points, so add the field idempotently.
ALTER TABLE data_points ADD COLUMN IF NOT EXISTS dp_internal INT NOT NULL DEFAULT 0;
