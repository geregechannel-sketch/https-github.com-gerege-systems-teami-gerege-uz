-- 0007_tree.sql — synthetic multi-level topology tree for "Выбор ТУ", matching
-- the real TEAMI structure (Монголия → город → РЭС → ТП → КРУ → точки).
-- Idempotent: groups upserted by fixed id; only orphan points (gr_id NULL or
-- pointing to a non-existent group) are distributed onto the leaf groups, so a
-- later real groups import keeps its own linkage.

INSERT INTO groups (gr_id, gr_code, gr_name, gr_type_id, parent_gr_id, is_public) VALUES
 (900000, 'MN',            'Монголия',            NULL, NULL,   1),
 (900001, 'MN.CHOIBALSAN', 'г.Чойбалсан ЖКН№8',   NULL, 900000, 1),
 (900002, 'MN.DORNOD_RES', 'Дорнод-РЭС',          NULL, 900001, 1),
 (900003, 'MN.TP43',       'ТП 43 ЖКН№8',         NULL, 900002, 1),
 (900004, 'MN.TP43.KRU12', 'КРУ яч.№12',          NULL, 900003, 1),
 (900005, 'MN.TP44',       'ТП 44 ЖКН№8',         NULL, 900002, 1),
 (900006, 'MN.TP44.KRU08', 'КРУ яч.№8',           NULL, 900005, 1),
 (900007, 'MN.TP45',       'ТП 45 ЖКН№8',         NULL, 900002, 1),
 (900008, 'MN.TP45.KRU03', 'КРУ яч.№3',           NULL, 900007, 1)
ON CONFLICT (gr_id) DO UPDATE
  SET gr_name = EXCLUDED.gr_name, parent_gr_id = EXCLUDED.parent_gr_id,
      gr_code = EXCLUDED.gr_code, is_public = EXCLUDED.is_public;

-- Distribute orphan points across the three КРУ leaf groups.
WITH orphans AS (
  SELECT point_id, row_number() OVER (ORDER BY point_id) AS rn
  FROM points
  WHERE gr_id IS NULL OR gr_id NOT IN (SELECT gr_id FROM groups)
)
UPDATE points p
   SET gr_id = (ARRAY[900004,900006,900008])[1 + (o.rn % 3)]
  FROM orphans o
 WHERE p.point_id = o.point_id;

-- keep the serial above the fixed ids so new groups don't collide
SELECT setval(pg_get_serial_sequence('groups','gr_id'),
              GREATEST((SELECT max(gr_id) FROM groups), 900008) + 1, false);
