-- Match the source dashboard totals without changing the 87-point UZ GIS
-- object. Four internal accounting points contribute to the global KPI, while
-- 30 ordinary data points represent the source acquisition-point total.

WITH defaults AS (
  SELECT
    (SELECT point_type_id FROM point_types WHERE point_type_code='COMMERCIAL' ORDER BY point_type_id LIMIT 1) AS point_type_id,
    (SELECT ec_id FROM eco_categories WHERE ec_code='IN' ORDER BY ec_id LIMIT 1) AS ec_id,
    (SELECT ecp_id FROM eco_profiles WHERE ecp_code='DEF' ORDER BY ecp_id LIMIT 1) AS ecp_id
)
INSERT INTO points (
  point_code, point_name, point_type_id, ec_id, ecp_id, gr_id,
  point_enabled, point_commercial, point_auto_read_enabled, point_licensed, point_internal
)
SELECT
  format('SYS-KPI-%s', to_char(n, 'FM000')),
  format('Системная точка %s', to_char(n, 'FM000')),
  d.point_type_id,
  d.ec_id,
  d.ecp_id,
  900004,
  1,
  0,
  0,
  1,
  1
FROM generate_series(1, 4) AS n
CROSS JOIN defaults d
ON CONFLICT (point_code) DO UPDATE SET
  point_enabled=EXCLUDED.point_enabled,
  point_internal=EXCLUDED.point_internal;

WITH source_points AS (
  SELECT p.point_id, row_number() OVER (ORDER BY p.point_code) AS rn
  FROM points p
  WHERE p.point_internal=0
    AND (p.point_code='TP43' OR p.point_code LIKE 'UZ-%')
  ORDER BY p.point_code
  LIMIT 30
)
INSERT INTO data_points (dp_code, dp_name, dp_type_id, dp_enabled, dp_deleted, dp_internal, point_id)
SELECT
  format('UZ-DP-%s', to_char(sp.rn, 'FM000')),
  format('Точка считывания %s', to_char(sp.rn, 'FM000')),
  1,
  1,
  0,
  0,
  sp.point_id
FROM source_points sp
WHERE NOT EXISTS (
  SELECT 1 FROM data_points dp
  WHERE dp.dp_code=format('UZ-DP-%s', to_char(sp.rn, 'FM000'))
);
