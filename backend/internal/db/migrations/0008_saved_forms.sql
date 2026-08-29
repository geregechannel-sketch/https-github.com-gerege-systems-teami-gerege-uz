-- 0008_saved_forms.sql — seed "Сохраненные формы" (user_settings), grouped by
-- uv_module folder. Public + attached to the first user so they show for anyone.
-- Idempotent: only the seed-marked rows are replaced each boot.
DELETE FROM user_settings WHERE uv_subtype = 'seed';
INSERT INTO user_settings (uv_name, uv_public, uv_module, uv_type, uv_subtype, uv_tech_info, user_id)
SELECT v.name, 1, v.module, v.type, 'seed', '{}'::jsonb, u.user_id
FROM (VALUES
  ('Суточный профиль по ТП-43',        'Просмотр архивов',      'Табличная'),
  ('Получасовая мощность (месяц)',     'Просмотр архивов',      'График'),
  ('Активная энергия A+ за сутки',     'Просмотр архивов',      'Табличная'),
  ('Полнота архивов за сутки',         'Качество показаний',    'Табличная'),
  ('Недостоверные считывания',         'Качество показаний',    'Табличная'),
  ('Опрос по каналам связи',           'Считывание показаний',  'Табличная'),
  ('Статус источников',                'Считывание показаний',  'Табличная'),
  ('Список точек ЖКН№8',               'Конфигурация системы',  'Табличная'),
  ('Счётчики и монтажи',               'Конфигурация системы',  'Табличная')
) AS v(name, module, type)
CROSS JOIN (SELECT user_id FROM users ORDER BY user_id LIMIT 1) u;
