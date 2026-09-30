-- Bring the local UZ demo object to the GIS totals observed in the source
-- installation: 87 accounting points, 86 with recent readings.
--
-- Coordinates stay in the frontend for now because the replicated core schema
-- has no geometry column. The generated codes make this seed idempotent and
-- keep the existing TP43 point and its feature-specific relations untouched.

WITH defaults AS (
  SELECT
    (SELECT point_type_id FROM point_types WHERE point_type_code='COMMERCIAL' ORDER BY point_type_id LIMIT 1) AS point_type_id,
    (SELECT ec_id FROM eco_categories WHERE ec_code='IN' ORDER BY ec_id LIMIT 1) AS ec_id,
    (SELECT ecp_id FROM eco_profiles WHERE ecp_code='DEF' ORDER BY ecp_id LIMIT 1) AS ecp_id
)
INSERT INTO points (
  point_code, point_name, point_type_id, ec_id, ecp_id, gr_id,
  point_enabled, point_commercial, point_auto_read_enabled, point_licensed
)
SELECT
  format('UZ-%s', to_char(n, 'FM000')),
  format('Точка учета UZ-%s', to_char(n, 'FM000')),
  d.point_type_id,
  d.ec_id,
  d.ecp_id,
  (ARRAY[900004::bigint, 900006::bigint, 900008::bigint])[1 + ((n - 2) % 3)],
  1,
  1,
  CASE WHEN n = 87 THEN 0 ELSE 1 END,
  1
FROM generate_series(2, 87) AS n
CROSS JOIN defaults d
ON CONFLICT (point_code) DO UPDATE SET
  point_enabled = EXCLUDED.point_enabled,
  point_commercial = EXCLUDED.point_commercial,
  point_auto_read_enabled = EXCLUDED.point_auto_read_enabled,
  point_licensed = EXCLUDED.point_licensed;

WITH defaults AS (
  SELECT meter_type_id
  FROM meter_types
  WHERE meter_type_name='EMCOS-3F'
  ORDER BY meter_type_id
  LIMIT 1
)
INSERT INTO meters (meter_type_id, meter_number, made, expl_start, meter_class)
SELECT
  d.meter_type_id,
  format('UZ-M-%s', to_char(n, 'FM000')),
  DATE '2022-01-01' + ((n - 2) % 730),
  DATE '2022-03-01' + ((n - 2) % 700),
  CASE WHEN n % 3 = 0 THEN '0.2S' ELSE '0.5S' END
FROM generate_series(2, 87) AS n
CROSS JOIN defaults d
WHERE NOT EXISTS (
  SELECT 1 FROM meters m
  WHERE m.meter_number = format('UZ-M-%s', to_char(n, 'FM000'))
);

INSERT INTO mountings (meter_id, point_id, mou_bt)
SELECT m.meter_id, p.point_id, TIMESTAMPTZ '2022-03-01 00:00:00+08'
FROM points p
JOIN meters m
  ON m.meter_number = replace(p.point_code, 'UZ-', 'UZ-M-')
WHERE p.point_code LIKE 'UZ-%'
  AND NOT EXISTS (
    SELECT 1
    FROM mountings mou
    WHERE mou.point_id=p.point_id AND mou.meter_id=m.meter_id AND mou.mou_et IS NULL
  );

