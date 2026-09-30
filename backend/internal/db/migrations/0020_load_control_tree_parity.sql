-- Match the source load-control hierarchy while keeping TOSH relay and limit data functional.

UPDATE groups
SET gr_name = CASE gr_id
  WHEN 900001 THEN 'г.Чойбалсан, ЖК№8'
  WHEN 900003 THEN 'ТП 43 ЖК№8'
  ELSE gr_name
END
WHERE gr_id IN (900001, 900003);

UPDATE points
SET gr_id = 900004
WHERE point_internal = 0
  AND (point_code = 'TP43' OR point_code LIKE 'UZ-%');
