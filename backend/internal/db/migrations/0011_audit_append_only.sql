-- Defense in depth for ordinary SQL writes. Owners/superusers can bypass DDL;
-- production needs a separate non-owner runtime role and external retention.
CREATE OR REPLACE FUNCTION reject_audit_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit records are append-only' USING ERRCODE = '42501';
END;
$$;
DROP TRIGGER IF EXISTS audit_log_append_only ON audit_log;
CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE OR TRUNCATE
ON audit_log FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_mutation();
DROP TRIGGER IF EXISTS audit_files_append_only ON audit_files;
CREATE TRIGGER audit_files_append_only BEFORE UPDATE OR DELETE OR TRUNCATE
ON audit_files FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_mutation();
