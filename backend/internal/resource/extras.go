package resource

// RegisterExtras adds (and overrides) the deep menu-leaf models that the
// frontend 3-level menu links to: event logs, audit, link/device statistics,
// device logs and config lists. Backed by 0006_extras.sql (synthetic data).
// Called after RegisterGenerated so it can override virtual stubs (e.g. audit).
func RegisterExtras(r *Registry) {
	// Регистр событий → События (typed views over event_log)
	for name, tbl := range map[string]string{
		"event_log_oracle":     "event_log_oracle",
		"event_log_software":   "event_log_software",
		"event_log_connection": "event_log_connection",
		"event_log_data":       "event_log_data",
		"event_log_system":     "event_log_system",
	} {
		r.Add(&Model{
			Name: name, Table: tbl, List: true, Get: true,
			PKField: f("EL_ID", "el_id", false, false),
			Fields: []Field{
				f("EL_TIME", "el_time", false, false),
				f("EL_TYPE", "el_type", false, false),
				f("EL_LEVEL", "el_level", false, false),
				f("EL_SOURCE", "el_source", false, false),
				f("EL_TEXT", "el_text", false, false),
			},
		})
	}

	// Аудит (override the virtual stub with a real table)
	r.Add(&Model{
		Name: "audit", Table: "audit_log", List: true, Get: true,
		PKField: f("AUD_ID", "aud_id", false, false),
		Fields: []Field{
			f("AUD_TIME", "aud_time", false, false),
			f("AUD_USER", "aud_user", false, false),
			f("AUD_OBJECT", "aud_object", false, false),
			f("AUD_ACTION", "aud_action", false, false),
			f("AUD_DETAIL", "aud_detail", false, false),
		},
	})
	r.Add(&Model{
		Name: "audit_files", Table: "audit_files", List: true, Get: true,
		PKField: f("AF_ID", "af_id", false, false),
		Fields: []Field{
			f("AF_TIME", "af_time", false, false),
			f("AF_USER", "af_user", false, false),
			f("AF_FILE", "af_file", false, false),
			f("AF_ACTION", "af_action", false, false),
			f("AF_SIZE", "af_size", false, false),
		},
	})
	r.Add(&Model{
		Name: "user_sessions", Table: "user_sessions", List: true, Get: true,
		PKField: f("US_ID", "us_id", false, false),
		Fields: []Field{
			f("US_USER", "us_user", false, false),
			f("US_LOGIN", "us_login", false, false),
			f("US_LOGOUT", "us_logout", false, false),
			f("US_IP", "us_ip", false, false),
			f("US_AGENT", "us_agent", false, false),
		},
	})

	// Статистика связи
	r.Add(&Model{
		Name: "src_statistics", Table: "src_statistics", List: true, Get: true,
		PKField: f("SS_ID", "ss_id", false, false),
		Fields: []Field{
			f("SS_SOURCE", "ss_source", false, false),
			f("SS_TOTAL", "ss_total", false, false),
			f("SS_OK", "ss_ok", false, false),
			f("SS_FAILED", "ss_failed", false, false),
			f("SS_LAST_TIME", "ss_last_time", false, false),
		},
	})
	r.Add(&Model{
		Name: "ph_statistics", Table: "ph_statistics", List: true, Get: true,
		PKField: f("PS_ID", "ps_id", false, false),
		Fields: []Field{
			f("PS_CHANNEL", "ps_channel", false, false),
			f("PS_TOTAL", "ps_total", false, false),
			f("PS_OK", "ps_ok", false, false),
			f("PS_FAILED", "ps_failed", false, false),
			f("PS_LAST_TIME", "ps_last_time", false, false),
		},
	})
	r.Add(&Model{
		Name: "prq_statistics", Table: "prq_statistics", List: true, Get: true,
		PKField: f("PQ_ID", "pq_id", false, false),
		Fields: []Field{
			f("PQ_TIME", "pq_time", false, false),
			f("PQ_SOURCE", "pq_source", false, false),
			f("PQ_TYPE", "pq_type", false, false),
			f("PQ_STATUS", "pq_status", false, false),
			f("PQ_DURATION_MS", "pq_duration_ms", false, false),
		},
	})

	// Журналы устройств
	r.Add(&Model{
		Name: "meter_log", Table: "meter_log", List: true, Get: true,
		PKField: f("ML_ID", "ml_id", false, false),
		Fields: []Field{
			f("ML_TIME", "ml_time", false, false),
			f("ML_METER", "ml_meter", false, false),
			f("ML_EVENT", "ml_event", false, false),
			f("ML_DETAIL", "ml_detail", false, false),
		},
	})
	r.Add(&Model{
		Name: "controller_log", Table: "controller_log", List: true, Get: true,
		PKField: f("CL_ID", "cl_id", false, false),
		Fields: []Field{
			f("CL_TIME", "cl_time", false, false),
			f("CL_CONTROLLER", "cl_controller", false, false),
			f("CL_EVENT", "cl_event", false, false),
			f("CL_DETAIL", "cl_detail", false, false),
		},
	})

	// Конфигурация — списки
	r.Add(&Model{
		Name: "classification", Table: "classification", WritePriv: "config",
		List: true, Get: true, Create: true, Update: true, Delete: true,
		PKField: f("CLS_ID", "cls_id", false, false),
		Fields: []Field{
			f("CLS_CODE", "cls_code", true, false),
			f("CLS_NAME", "cls_name", true, true),
			f("CLS_GROUP", "cls_group", true, false),
		},
	})
	r.Add(&Model{
		Name: "linkpriorities", Table: "link_priorities", WritePriv: "config",
		List: true, Get: true, Create: true, Update: true, Delete: true,
		PKField: f("LP_ID", "lp_id", false, false),
		Fields: []Field{
			f("LP_NAME", "lp_name", true, true),
			f("LP_PRIORITY", "lp_priority", true, false),
			f("LP_ENABLED", "lp_enabled", true, false),
		},
	})
	r.Add(&Model{
		Name: "dp_show", Table: "dp_show", List: true, Get: true,
		PKField: f("DP_ID", "dp_id", false, false),
		Fields: []Field{
			f("DP_NAME", "dp_name", false, false),
			f("DP_SOURCE", "dp_source", false, false),
			f("DP_VALUE", "dp_value", false, false),
			f("DP_TIME", "dp_time", false, false),
			f("DP_QUALITY", "dp_quality", false, false),
		},
	})
	r.Add(&Model{
		Name: "controllerconfig", Table: "controller_config", WritePriv: "config",
		List: true, Get: true, Create: true, Update: true, Delete: true,
		PKField: f("CC_ID", "cc_id", false, false),
		Fields: []Field{
			f("CC_CONTROLLER", "cc_controller", true, false),
			f("CC_PARAM", "cc_param", true, true),
			f("CC_VALUE", "cc_value", true, false),
		},
	})
	r.Add(&Model{
		Name: "meterconfig", Table: "meter_config", WritePriv: "config",
		List: true, Get: true, Create: true, Update: true, Delete: true,
		PKField: f("MC_ID", "mc_id", false, false),
		Fields: []Field{
			f("MC_METER", "mc_meter", true, false),
			f("MC_PARAM", "mc_param", true, true),
			f("MC_VALUE", "mc_value", true, false),
		},
	})
	r.Add(&Model{
		Name: "usermanagement", Table: "user_management", WritePriv: "config",
		List: true, Get: true, Create: true, Update: true, Delete: true,
		PKField: f("UM_ID", "um_id", false, false),
		Fields: []Field{
			f("UM_LOGIN", "um_login", true, true),
			f("UM_NAME", "um_name", true, false),
			f("UM_ROLE", "um_role", true, false),
			f("UM_ENABLED", "um_enabled", true, false),
			f("UM_LAST_LOGIN", "um_last_login", false, false),
		},
	})
}
