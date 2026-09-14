-- Seed reference data + a demo tenant mirroring the observed TOSH/Mongolia deployment.
-- Password hashes are inserted by the app seeder (bcrypt); this file seeds only data
-- that does not require hashing.

INSERT INTO group_types (gr_type_code, gr_type_name) VALUES
 ('COUNTRY','Улс'), ('REGION','Бүс'), ('SUBSTATION','Дэд станц'), ('CONSUMER','Хэрэглэгч')
ON CONFLICT DO NOTHING;

INSERT INTO point_types (point_type_code, point_type_name) VALUES
 ('COMMERCIAL','Арилжааны'), ('TECHNICAL','Техникийн'), ('VIRTUAL','Виртуал')
ON CONFLICT DO NOTHING;

INSERT INTO meter_types (meter_type_name, meter_type_producer) VALUES
 ('EMCOS-3F','Sigma Telas'), ('Mercury 230','Incotex'), ('CE303','Energomera')
ON CONFLICT DO NOTHING;

INSERT INTO eco_categories (ec_code, ec_name, ec_in) VALUES
 ('IN','Орлого',1), ('OUT','Зарлага',0), ('LOSS','Алдагдал',0)
ON CONFLICT DO NOTHING;

INSERT INTO eco_profiles (ecp_code, ecp_name) VALUES
 ('DEF','Үндсэн профиль'), ('GEN','Үүсгэлт')
ON CONFLICT DO NOTHING;

INSERT INTO data_servers (das_name, das_enabled, das_active) VALUES
 ('DAS-Choibalsan-1',1,1), ('DAS-Choibalsan-2',1,1), ('DAS-Backup',1,0)
ON CONFLICT DO NOTHING;

INSERT INTO system_modules (mdl_code, mdl_name) VALUES
 ('ARCHIVES','Архив'), ('ACQUISITION','Уншилт'), ('REPORTS','Тайлан'),
 ('EVENTS','Үйл явдал'), ('BALANCE','Баланс'), ('CONFIG','Тохиргоо')
ON CONFLICT DO NOTHING;
