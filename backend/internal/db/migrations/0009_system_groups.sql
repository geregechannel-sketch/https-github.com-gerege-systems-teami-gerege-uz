-- 0009_system_groups.sql — real "Служебные группы" (system filter groups),
-- names copied verbatim from the source. Type 2, ids 800001+. Idempotent.
INSERT INTO groups (gr_id, gr_code, gr_name, gr_type_id, parent_gr_id, is_public) VALUES
 (800001,'SYS_BUSY_CH','Точки считывания по наиболее занятым каналам связи',2,NULL,1),
 (800002,'SYS_WORST_SRC','Худшие источники по количеству недействительных считываний',2,NULL,1),
 (800003,'SYS_BY_DP','По точке считывания',2,NULL,1),
 (800004,'SYS_BY_MEATYPE','По типам средств измерения',2,NULL,1),
 (800005,'SYS_BY_POINTTYPE','По типу точки учета',2,NULL,1),
 (800006,'SYS_BY_SRCTYPE','По типам источников данных',2,NULL,1),
 (800007,'SYS_RESP_CHG','Отвечающие точки считывания, по которым были изменения состояния связи',2,NULL,1),
 (800008,'SYS_RESP_ERR','Отвечающие точки считывания, по которым были ошибки связи',2,NULL,1),
 (800009,'SYS_HOPELESS','Безнадежные дыры',2,NULL,1),
 (800010,'SYS_NEVER','Никогда не было данных измерений',2,NULL,1),
 (800011,'SYS_NODATA_DP','Точки по которым нет данных за последние сутки, хотя по точке считывания есть',2,NULL,1),
 (800012,'SYS_NODATA_DAY','Нет данных за последние сутки',2,NULL,1),
 (800013,'SYS_NORESULT','Нет результатов считывания',2,NULL,1),
 (800014,'SYS_UNSYNC','Несинхронизированные',2,NULL,1),
 (800015,'SYS_PARTIAL','Не заполняется часть действительных измерений',2,NULL,1),
 -- drill-down children of "По точке считывания" (real point groups)
 (800101,'SYS_BY_DP_BAL','MN.Ул. Баялаг.ТП 43.Балансовый счётчик TE73/TE71 [DLMS-CAS]',2,800003,1),
 (800102,'SYS_BY_DP_GS1','MN.Ул. Баялаг.Щит № ГС-1.Хэрлэн-8-р баг Баялаг ГС-1 TE73/TE71 [DLMS-CAS]',2,800003,1),
 (800103,'SYS_BY_DP_GS2','MN.Ул. Баялаг.Щит № ГС-2.Хэрлэн-8-р баг Баялаг ГС-2 TE73/TE71 [DLMS-CAS]',2,800003,1),
 (800104,'SYS_BY_DP_SH1','MN.Ул. Баялаг.Щит № Ш1.Хэрлэн-8-р баг Баялаг 6-627 TE73/TE71 [DLMS-CAS]',2,800003,1),
 (800105,'SYS_BY_DP_DCU','aМонголия, г.Чойбалсан, ЖК№8 DCU TEC-70 CAS DLMS',2,800003,1),
 -- drill-down children of "По типам средств измерения" (real meter types)
 (800201,'SYS_MT_TE71','TE71 MP-1-3N',2,800004,1),
 (800202,'SYS_MT_TE73','TE73 SP-1-3',2,800004,1),
 (800203,'SYS_MT_DLMS','TE73/TE71 [DLMS-CAS]',2,800004,1),
 -- drill-down children of "По типам источников данных"
 (800301,'SYS_SRC_DCU','DCU CAS [DLMS]',2,800006,1),
 (800302,'SYS_SRC_SQL','Generated_by_SQL_Server',2,800006,1)
ON CONFLICT (gr_id) DO UPDATE
  SET gr_code=EXCLUDED.gr_code, gr_name=EXCLUDED.gr_name,
      gr_type_id=EXCLUDED.gr_type_id, parent_gr_id=EXCLUDED.parent_gr_id, is_public=EXCLUDED.is_public;
