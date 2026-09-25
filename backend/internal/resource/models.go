package resource

// f is a small helper to declare a field.
func f(api, col string, writable, required bool) Field {
	return Field{API: api, Col: col, Writable: writable, Required: required}
}

// dict declares a read-only dictionary model (list/get only, any authenticated user).
func dict(name, table string, pk Field, fields ...Field) *Model {
	return &Model{Name: name, Table: table, PKField: pk, Fields: fields, List: true, Get: true}
}

// RegisterCore registers the core ec3api models against the Postgres schema.
func RegisterCore(r *Registry) {
	// --- Dictionaries (read-only) ---
	r.Add(dict("grouptypes", "group_types",
		f("GR_TYPE_ID", "gr_type_id", false, false),
		f("GR_TYPE_CODE", "gr_type_code", false, false),
		f("GR_TYPE_NAME", "gr_type_name", false, false)))

	r.Add(dict("pointtypes", "point_types",
		f("POINT_TYPE_ID", "point_type_id", false, false),
		f("POINT_TYPE_CODE", "point_type_code", false, false),
		f("POINT_TYPE_NAME", "point_type_name", false, false)))

	r.Add(dict("measuringdevicetypes", "meter_types",
		f("METER_TYPE_ID", "meter_type_id", false, false),
		f("METER_TYPE_NAME", "meter_type_name", false, false),
		f("METER_TYPE_PRODUCER", "meter_type_producer", false, false)))

	r.Add(dict("ecocategories", "eco_categories",
		f("EC_ID", "ec_id", false, false),
		f("EC_CODE", "ec_code", false, false),
		f("EC_NAME", "ec_name", false, false),
		f("EC_IN", "ec_in", false, false)))

	r.Add(dict("ecoprofiles", "eco_profiles",
		f("ECP_ID", "ecp_id", false, false),
		f("ECP_CODE", "ecp_code", false, false),
		f("ECP_NAME", "ecp_name", false, false)))

	r.Add(dict("dataservers", "data_servers",
		f("DAS_ID", "das_id", false, false),
		f("DAS_NAME", "das_name", false, false),
		f("DAS_ENABLED", "das_enabled", false, false),
		f("DAS_ACTIVE", "das_active", false, false)))

	r.Add(dict("systemmodules", "system_modules",
		f("MDL_ID", "mdl_id", false, false),
		f("MDL_CODE", "mdl_code", false, false),
		f("MDL_NAME", "mdl_name", false, false)))

	// --- Groups (CRUD) ---
	r.Add(&Model{
		Name: "groups", Table: "groups",
		PKField:   f("GR_ID", "gr_id", false, false),
		WritePriv: "config",
		List:      true, Get: true, Create: true, Update: true, Delete: true,
		Fields: []Field{
			f("GR_CODE", "gr_code", true, false),
			f("GR_NAME", "gr_name", true, true),
			f("GR_TYPE_ID", "gr_type_id", true, false),
			f("PARENT_GR_ID", "parent_gr_id", true, false),
			f("IS_PUBLIC", "is_public", true, false),
		},
	})

	// --- Points (CRUD) ---
	r.Add(&Model{
		Name: "points", Table: "points",
		PKField:   f("POINT_ID", "point_id", false, false),
		WritePriv: "config",
		List:      true, Get: true, Create: true, Update: true, Delete: true,
		Fields: []Field{
			f("POINT_CODE", "point_code", true, true),
			f("POINT_NAME", "point_name", true, true),
			f("POINT_TYPE_ID", "point_type_id", true, false),
			f("EC_ID", "ec_id", true, false),
			f("ECP_ID", "ecp_id", true, false),
			f("GR_ID", "gr_id", true, false),
			f("POINT_ENABLED", "point_enabled", true, false),
			f("POINT_COMMERCIAL", "point_commercial", true, false),
			f("POINT_AUTO_READ_ENABLED", "point_auto_read_enabled", true, false),
			f("POINT_LICENSED", "point_licensed", true, false),
			f("POINT_INTERNAL", "point_internal", true, false),
		},
	})

	// --- Meters / measuringdevices (CRUD) ---
	r.Add(&Model{
		Name: "measuringdevices", Table: "meters",
		PKField:   f("METER_ID", "meter_id", false, false),
		WritePriv: "config",
		List:      true, Get: true, Create: true, Update: true, Delete: true,
		Fields: []Field{
			f("METER_TYPE_ID", "meter_type_id", true, true),
			f("METER_NUMBER", "meter_number", true, true),
			f("MADE", "made", true, false),
			f("EXPL_START", "expl_start", true, false),
			f("METER_CLASS", "meter_class", true, false),
		},
	})

	// --- Data points (CRUD) ---
	r.Add(&Model{
		Name: "datapoints", Table: "data_points",
		PKField:   f("DP_ID", "dp_id", false, false),
		WritePriv: "config",
		List:      true, Get: true, Create: true, Update: true, Delete: true,
		Fields: []Field{
			f("DP_CODE", "dp_code", true, false),
			f("DP_NAME", "dp_name", true, true),
			f("DP_TYPE_ID", "dp_type_id", true, false),
			f("DP_ENABLED", "dp_enabled", true, false),
			f("DP_DELETED", "dp_deleted", true, false),
			f("DP_INTERNAL", "dp_internal", true, false),
			f("POINT_ID", "point_id", true, false),
		},
	})

	// --- Events (list/query only via generic; ev POST grid handled here too) ---
	r.Add(&Model{
		Name: "events", Table: "events",
		PKField: f("EV_ID", "ev_id", false, false),
		List:    true, Get: true,
		Fields: []Field{
			f("EV_TIME", "ev_time", false, false),
			f("EVC_ID", "evc_id", false, false),
			f("EV_PRIORITY", "ev_priority", false, false),
			f("EV_LAST_TIME", "ev_last_time", false, false),
			f("EV_POINT_NAME", "ev_point_name", false, false),
			f("EV_SOURCE", "ev_source", false, false),
			f("EV_SOURCE_TYPE", "ev_source_type", false, false),
			f("EV_CHANNEL", "ev_channel", false, false),
			f("EV_COUNT", "ev_count", false, false),
			f("EV_ACKNOWLEDGED", "ev_acknowledged", false, false),
			f("MDL_ID", "mdl_id", false, false),
			f("DAS_ID", "das_id", false, false),
			f("DP_ID", "dp_id", false, false),
			f("EV_TEXT", "ev_text", false, false),
		},
	})
}
