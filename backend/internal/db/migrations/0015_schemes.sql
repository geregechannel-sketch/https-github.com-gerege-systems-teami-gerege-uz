ALTER TABLE g_scheme
    ADD COLUMN IF NOT EXISTS c_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

INSERT INTO g_scheme
    (c_scheme_code, c_scheme_name, c_scheme_dtype_id, c_scheme_type_id, c_scheme_data, c_updated_at)
SELECT
    'TOSH-TP43-SLD',
    'ТП 43 ЖКН№8 - Однолинейная схема',
    1,
    1,
    $layout$
    {
      "version": 1,
      "title": "ТП 43 ЖКН№8 - Однолинейная схема",
      "subtitle": "TOSH ELECTROAPPARAT · 10/0.4 кВ",
      "canvas": {"width": 1200, "height": 700},
      "nodes": [
        {"id":"source","kind":"source","x":600,"y":55,"label":"Сеть 10 кВ","signal_code":"TP43.POWER.A"},
        {"id":"breaker","kind":"breaker","x":600,"y":175,"label":"QF-12","secondary":"Вводной выключатель","signal_code":"TP43.QF12.POS"},
        {"id":"transformer","kind":"transformer","x":600,"y":305,"label":"ТМ-400 кВА","secondary":"10/0.4 кВ"},
        {"id":"bus","kind":"bus","x":600,"y":430,"label":"Шины 0.4 кВ","signal_code":"TP43.POWER.B"},
        {"id":"feeder-a","kind":"feeder","x":315,"y":585,"label":"Фидер A","secondary":"ЖКН№8","signal_code":"TP43.POWER.A"},
        {"id":"cabinet","kind":"cabinet","x":600,"y":585,"label":"Шкаф учета","secondary":"Главная дверь","signal_code":"TP43.DOOR.MAIN"},
        {"id":"feeder-b","kind":"feeder","x":885,"y":585,"label":"Фидер B","secondary":"ЖКН№8","signal_code":"TP43.POWER.B"},
        {"id":"meter","kind":"meter","x":285,"y":300,"label":"Счетчик TE73","secondary":"Балансовый","signal_code":"TP43.ALARM.METER"},
        {"id":"controller","kind":"controller","x":915,"y":300,"label":"DCU TEC-70","secondary":"DLMS-CAS","signal_code":"TP43.COMM.DCU"}
      ],
      "edges": [
        {"x1":600,"y1":88,"x2":600,"y2":145},
        {"x1":600,"y1":205,"x2":600,"y2":270},
        {"x1":600,"y1":340,"x2":600,"y2":420},
        {"x1":315,"y1":430,"x2":885,"y2":430},
        {"x1":315,"y1":430,"x2":315,"y2":550},
        {"x1":600,"y1":430,"x2":600,"y2":550},
        {"x1":885,"y1":430,"x2":885,"y2":550},
        {"x1":510,"y1":305,"x2":350,"y2":305},
        {"x1":690,"y1":305,"x2":850,"y2":305}
      ]
    }
    $layout$,
    now()
WHERE NOT EXISTS (
    SELECT 1 FROM g_scheme WHERE c_scheme_code='TOSH-TP43-SLD'
);
