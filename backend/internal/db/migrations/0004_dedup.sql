-- Remove duplicate dictionary rows that earlier re-deploys inserted (seeds had no
-- unique keys), then enforce uniqueness so re-running the seed is a no-op.

DELETE FROM group_types a USING group_types b
  WHERE a.gr_type_id > b.gr_type_id AND a.gr_type_code = b.gr_type_code;
CREATE UNIQUE INDEX IF NOT EXISTS uq_group_types_code ON group_types(gr_type_code);

DELETE FROM point_types a USING point_types b
  WHERE a.point_type_id > b.point_type_id AND a.point_type_code = b.point_type_code;
CREATE UNIQUE INDEX IF NOT EXISTS uq_point_types_code ON point_types(point_type_code);

DELETE FROM meter_types a USING meter_types b
  WHERE a.meter_type_id > b.meter_type_id AND a.meter_type_name = b.meter_type_name;
CREATE UNIQUE INDEX IF NOT EXISTS uq_meter_types_name ON meter_types(meter_type_name);

DELETE FROM eco_categories a USING eco_categories b
  WHERE a.ec_id > b.ec_id AND a.ec_code = b.ec_code;
CREATE UNIQUE INDEX IF NOT EXISTS uq_eco_categories_code ON eco_categories(ec_code);

DELETE FROM eco_profiles a USING eco_profiles b
  WHERE a.ecp_id > b.ecp_id AND a.ecp_code = b.ecp_code;
CREATE UNIQUE INDEX IF NOT EXISTS uq_eco_profiles_code ON eco_profiles(ecp_code);

DELETE FROM system_modules a USING system_modules b
  WHERE a.mdl_id > b.mdl_id AND a.mdl_code = b.mdl_code;
CREATE UNIQUE INDEX IF NOT EXISTS uq_system_modules_code ON system_modules(mdl_code);

DELETE FROM data_servers a USING data_servers b
  WHERE a.das_id > b.das_id AND a.das_name = b.das_name;
CREATE UNIQUE INDEX IF NOT EXISTS uq_data_servers_name ON data_servers(das_name);
