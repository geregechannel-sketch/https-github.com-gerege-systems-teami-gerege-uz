-- Make the schema import-friendly (this deployment ingests real data from the
-- source system, which may be partial / out of dependency order): drop all FK
-- constraints and relax NOT NULL on import-target columns. Idempotent.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT conname, conrelid::regclass AS tbl FROM pg_constraint WHERE contype='f') LOOP
    EXECUTE 'ALTER TABLE '||r.tbl||' DROP CONSTRAINT '||quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE points      ALTER COLUMN point_code   DROP NOT NULL;
ALTER TABLE points      ALTER COLUMN point_name   DROP NOT NULL;
ALTER TABLE meters      ALTER COLUMN meter_number DROP NOT NULL;
ALTER TABLE data_points ALTER COLUMN dp_name      DROP NOT NULL;
