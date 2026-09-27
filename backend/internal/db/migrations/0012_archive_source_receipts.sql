-- Preserve source evidence separately from numeric samples, including null rows.
ALTER TABLE archive_samples ADD COLUMN IF NOT EXISTS source_payload JSONB;
ALTER TABLE archive_samples ADD COLUMN IF NOT EXISTS source_read_time TIMESTAMPTZ;
ALTER TABLE archive_samples ADD COLUMN IF NOT EXISTS source_time_zone TEXT;
CREATE TABLE IF NOT EXISTS archive_source_receipts (
    receipt_id TEXT PRIMARY KEY,
    source_ref TEXT NOT NULL,
    selection JSONB NOT NULL,
    response JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS archive_receipts_append_only ON archive_source_receipts;
CREATE TRIGGER archive_receipts_append_only BEFORE UPDATE OR DELETE OR TRUNCATE
ON archive_source_receipts FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_mutation();
