-- AUTO-GENERATED from docs/endpoints-params.txt by cmd/gen. Do not edit.
-- One table per non-core entity root; columns from the model's add/attr fields.

CREATE TABLE IF NOT EXISTS g_accesslevelsgroups (
    c_ug_id BIGSERIAL PRIMARY KEY,
    c_gr_id BIGINT,
    c_algr_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_actdata (
    c_act_id BIGSERIAL PRIMARY KEY,
    c_pl_id BIGINT,
    c_pl_t TEXT,
    c_act_value TEXT
);

CREATE TABLE IF NOT EXISTS g_acts (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_act_type_id BIGINT,
    c_ignore_read_data TEXT,
    c_act_number TEXT,
    c_act_month TEXT,
    c_act_desc TEXT,
    c_pl_id BIGINT,
    c_pl_t TEXT,
    c_act_value TEXT,
    c_act_enabled INTEGER,
    c_act_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_acttypes (
    c_act_id BIGSERIAL PRIMARY KEY,
    c_pl_id BIGINT,
    c_pl_t TEXT,
    c_act_value TEXT,
    c_act_type_id BIGINT,
    c_act_type_name TEXT
);

CREATE TABLE IF NOT EXISTS g_add_new_lines_for_generation (
    c_bga_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_admin_testmode (
    c_sp_id BIGSERIAL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS g_aggs_type (
    c_fib_id BIGSERIAL PRIMARY KEY,
    c_meter_number TEXT,
    c_point_id BIGINT,
    c_aggs_type_id BIGINT,
    c_msf_id BIGINT,
    c_dir_id BIGINT,
    c_from_da TEXT,
    c_to_da TEXT
);

CREATE TABLE IF NOT EXISTS g_ai (
    c_query_id BIGSERIAL PRIMARY KEY,
    c_data TEXT
);

CREATE TABLE IF NOT EXISTS g_appcontrol (
    row_id BIGSERIAL PRIMARY KEY,
    c_ip TEXT,
    c_port TEXT,
    c_wadr TEXT,
    c_oid TEXT,
    c_index TEXT,
    c_program TEXT,
    c_value TEXT
);

CREATE TABLE IF NOT EXISTS g_ar_ds (
    c_ds_id BIGSERIAL PRIMARY KEY,
    c_ds_t TEXT,
    c_ds_v TEXT,
    c_ds_data_desc TEXT
);

CREATE TABLE IF NOT EXISTS g_ar_ds_plain (
    c_ds_id BIGSERIAL PRIMARY KEY,
    c_ds_t TEXT,
    c_ds_v TEXT,
    c_ds_data_desc TEXT
);

CREATE TABLE IF NOT EXISTS g_archives (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_ml_id BIGINT,
    c_gr_id BIGINT,
    c_ffp_fields_point TEXT,
    c_ffp_fields_gr TEXT,
    c_gr_value TEXT,
    c_gr_gmod TEXT,
    c_gl_ec TEXT,
    c_billing_hour TEXT,
    c_billing_hour_for_prev_day TEXT,
    c_freezed TEXT,
    c_md_id BIGINT,
    c_aggs_id BIGINT,
    c_wo_byp TEXT,
    c_wo_acts TEXT,
    c_mou_split TEXT,
    c_split_bt TIMESTAMPTZ,
    c_split_et TIMESTAMPTZ,
    c_act_id BIGINT,
    c_ds_id BIGINT,
    c_dp_id BIGINT,
    c_type TEXT,
    c_data_code TEXT,
    c_xfau_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_balance (
    c_gr_id BIGSERIAL PRIMARY KEY,
    c_gr_name TEXT,
    c_gr_code TEXT,
    c_is_public INTEGER,
    c_gr_type_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_balances (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_gr_id BIGINT,
    c_time_scrolling TEXT,
    c_rounding TEXT,
    c_discr TEXT,
    c_customer_specific TEXT,
    c_type TEXT,
    c_h_depth BIGINT,
    c_balance_kind TEXT,
    c_c_id BIGINT,
    c_gr_name TEXT,
    c_bt TEXT,
    c__bt TIMESTAMPTZ,
    c_et TEXT,
    c_ppb_f TEXT,
    c_pmb_f TEXT,
    c_pb_f TEXT,
    c_qpb_f TEXT,
    c_qmb_f TEXT,
    c_qb_f TEXT,
    c_with_coef TEXT
);

CREATE TABLE IF NOT EXISTS g_bga (
    c_bga_type_id BIGSERIAL PRIMARY KEY,
    c_bga_name TEXT,
    c_bga_enabled INTEGER,
    c_sch_id BIGINT,
    c_gr_id BIGINT,
    c_bgaq_id BIGINT,
    c_bga_priority BIGINT,
    c_bga_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_bga_class (
    row_id BIGSERIAL PRIMARY KEY,
    c_bga_class_code TEXT,
    c_bga_class_name TEXT
);

CREATE TABLE IF NOT EXISTS g_bga_param (
    c_bga_id BIGSERIAL PRIMARY KEY,
    c_bga_param_nr BIGINT,
    c_bga_param_value TEXT,
    c_bga_param_value_desc TEXT
);

CREATE TABLE IF NOT EXISTS g_bga_type (
    c_bga_class_id BIGSERIAL PRIMARY KEY,
    c_bga_type_id BIGINT,
    c_bga_type_code TEXT,
    c_bga_type_name TEXT,
    c_bga_type_desc TEXT,
    c_bga_type_declare TEXT,
    c_bga_type_pre_action TEXT,
    c_bga_type_select TEXT,
    c_bga_type_rec_action TEXT,
    c_bga_type_post_action TEXT
);

CREATE TABLE IF NOT EXISTS g_bga_type_param (
    c_bga_type_id BIGSERIAL PRIMARY KEY,
    c_bga_type_param_nr BIGINT,
    c_bga_type_param_desc TEXT,
    c_bga_type_param_regular TEXT,
    c_bga_type_param_key TEXT,
    c_enum_id BIGINT,
    c_bga_param_default_value TEXT
);

CREATE TABLE IF NOT EXISTS g_bga_type_ug (
    c_bga_type_id BIGSERIAL PRIMARY KEY,
    c_ug_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_bgaq (
    c_bgaq_id BIGSERIAL PRIMARY KEY,
    c_bgaq_code TEXT,
    c_bgaq_name TEXT
);

CREATE TABLE IF NOT EXISTS g_bridgetevisfail (
    row_id BIGSERIAL PRIMARY KEY,
    c_gpp_obj_nr_i TEXT,
    c_gpp_aptk_nr_i TEXT,
    c_gpp_registravimo_data_i TEXT,
    c_gpp_pranesimo_aprasymas_i TEXT,
    c_gpt_pavadinimas_i TEXT,
    c_gpp_pranesejas_i TEXT,
    c_gpp_gedimo_priezastis_i TEXT,
    c_gpp_pasalinimo_data_iki_i TEXT
);

CREATE TABLE IF NOT EXISTS g_caption (
    c_cap_id BIGSERIAL PRIMARY KEY,
    c_cap_text TEXT
);

CREATE TABLE IF NOT EXISTS g_channelaprops (
    c_ph_id BIGSERIAL PRIMARY KEY,
    c_lpty_id BIGINT,
    c_lpty_value TEXT
);

CREATE TABLE IF NOT EXISTS g_channels (
    c_ph_id BIGSERIAL PRIMARY KEY,
    c_dp_id BIGINT,
    c_ph_type_id BIGINT,
    c_ph_name TEXT,
    c_ph_enabled INTEGER,
    c_ph_deleted INTEGER,
    c_ph_save_statistics TEXT,
    c_ph_failure_count BIGINT,
    c_costa_g_per_id BIGINT,
    c_costa_g_exp_value TEXT,
    c_costa_b_per_id BIGINT,
    c_costa_b_exp_value TEXT,
    c_src_id BIGINT,
    c_sp_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_channeltypes (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_ack_comment TEXT,
    c_src_id BIGINT,
    c_ph_id BIGINT,
    c_point_id BIGINT,
    c_gr_id BIGINT,
    c_ds_id BIGINT,
    c_ph_type_id BIGINT,
    c_ph_name TEXT,
    c_ph_enabled INTEGER,
    c_costa_g_per_id BIGINT,
    c_costa_b_per_id BIGINT,
    c_ph_failure_count BIGINT,
    c_costa_g_exp_value TEXT,
    c_costa_b_exp_value TEXT,
    c_ph_save_statistics TEXT,
    c_lpty_id BIGINT,
    c_lpty_value TEXT,
    c_sp_id BIGINT,
    c_se_tmpl_id BIGINT,
    c_sep_b_lag BIGINT,
    c_sep_b_depth BIGINT,
    c_sep_b_per_id BIGINT,
    c_sep_b_sch_id BIGINT,
    c_sep_h_lag BIGINT,
    c_sep_h_depth BIGINT,
    c_sep_h_per_id BIGINT,
    c_sep_h_sch_id BIGINT,
    c_sep_f_lag BIGINT,
    c_sep_f_depth BIGINT,
    c_sep_f_per_id BIGINT,
    c_sep_f_sch_id BIGINT,
    c_sep_r_lag BIGINT,
    c_sep_r_depth BIGINT,
    c_sep_r_per_id BIGINT,
    c_sep_r_sch_id BIGINT,
    c_ph_layer_id BIGINT,
    c_ph_type_name TEXT
);

CREATE TABLE IF NOT EXISTS g_chromo (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_val TEXT,
    c_gr_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_cpty (
    c_cpty_id BIGSERIAL PRIMARY KEY,
    c_cpty_code TEXT,
    c_cpty_name TEXT,
    c_enum_id BIGINT,
    c_cpty_nr BIGINT,
    c_fmt_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_databranchsets (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_pl_id BIGINT,
    c_pl_enabled INTEGER,
    c_ml_id BIGINT,
    c_src_rule_id BIGINT,
    c_rule_enabled INTEGER,
    c_src_tmpl_id BIGINT,
    c_meter_type_id BIGINT,
    c_ecp_id BIGINT,
    c_point_type_id BIGINT,
    c_dev_type_id BIGINT,
    c_dp_type_id BIGINT,
    c_mou_type_id BIGINT,
    c_ppty_id BIGINT,
    c_ppty_value TEXT,
    c_witheset_id BIGINT,
    c_witheset_code TEXT,
    c_witheset_name TEXT,
    c_src_type_id BIGINT,
    c_witheset_journal TEXT
);

CREATE TABLE IF NOT EXISTS g_dataitems (
    c_di_id BIGSERIAL PRIMARY KEY,
    c_di_enabled INTEGER,
    c_pl_id BIGINT,
    c_ds_id BIGINT,
    c_lp_id BIGINT,
    c_sheaf_id BIGINT,
    c_point_id BIGINT,
    c_dp_id BIGINT,
    c_witheset_id BIGINT,
    c_ml_id BIGINT,
    c_mlset_id BIGINT,
    c_extend TEXT
);

CREATE TABLE IF NOT EXISTS g_dataitemsperiods (
    c_di_id BIGSERIAL PRIMARY KEY,
    c_di_bt TIMESTAMPTZ,
    c_di_et TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS g_dataloctypes (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_src_name TEXT,
    c_src_number TEXT,
    c_src_type_id BIGINT,
    c_dl_type_id BIGINT,
    c_src_bt TIMESTAMPTZ,
    c_src_et TIMESTAMPTZ,
    c_src_enabled INTEGER,
    c_tz_id BIGINT,
    c_src_tz_dst_used TEXT,
    c_src_save_statistics TEXT,
    c_point_id BIGINT,
    c_src_dir_inv TEXT,
    c_src_tmpl_id BIGINT,
    c_src_tmpl_code TEXT,
    c_src_tmpl_name TEXT
);

CREATE TABLE IF NOT EXISTS g_datapointprops (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_lpty_id BIGINT,
    c_lpty_value TEXT
);

CREATE TABLE IF NOT EXISTS g_datapointstypes (
    c_ph_type_id BIGSERIAL PRIMARY KEY,
    c_dp_id BIGINT,
    c_das_id BIGINT,
    c_dp_code TEXT,
    c_dp_name TEXT,
    c_dp_type_id BIGINT,
    c_dp_enabled INTEGER,
    c_se_tmpl_id BIGINT,
    c_sep_b_lag BIGINT,
    c_sep_b_depth BIGINT,
    c_sep_b_per_id BIGINT,
    c_sep_b_sch_id BIGINT,
    c_sep_h_lag BIGINT,
    c_sep_h_depth BIGINT,
    c_sep_h_per_id BIGINT,
    c_sep_h_sch_id BIGINT,
    c_sep_f_lag BIGINT,
    c_sep_f_depth BIGINT,
    c_sep_f_per_id BIGINT,
    c_sep_f_sch_id BIGINT,
    c_sep_r_lag BIGINT,
    c_sep_r_depth BIGINT,
    c_sep_r_per_id BIGINT,
    c_sep_r_sch_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_datasheafs (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_ack_comment TEXT,
    c_src_id BIGINT,
    c_ph_id BIGINT,
    c_point_id BIGINT,
    c_gr_id BIGINT,
    c_ds_id BIGINT,
    c_sheaf_id BIGINT,
    c_witheset_id BIGINT,
    c_witheset_journal TEXT
);

CREATE TABLE IF NOT EXISTS g_datasourcetemplates (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_src_tmpl_id BIGINT,
    c_point_id BIGINT,
    c_delayed TEXT,
    c_ignore_existing TEXT,
    c_se_tmpl_dp_sheaf_id BIGINT,
    c_sheaf_id BIGINT,
    c_lp_id BIGINT,
    c_se_h TEXT,
    c_se_h_per_id BIGINT,
    c_se_h_depth BIGINT,
    c_se_h_restore_depth BIGINT,
    c_se_h_restore_per_id BIGINT,
    c_witheset_id BIGINT,
    c_src_tmpl_code TEXT,
    c_src_tmpl_name TEXT,
    c_src_tmpl_multipoint TEXT,
    c_src_type_id BIGINT,
    c_dl_type_id BIGINT,
    c_tz_id BIGINT,
    c_src_tz_dst_used TEXT,
    c_src_save_statistics TEXT,
    c_ignore_se_ab TEXT,
    c_src_dir_inv TEXT,
    c_inherit_src_number TEXT,
    c_src_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_datasourcetypes (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_src_name TEXT,
    c_src_number TEXT,
    c_src_type_id BIGINT,
    c_dl_type_id BIGINT,
    c_src_bt TIMESTAMPTZ,
    c_src_et TIMESTAMPTZ,
    c_src_enabled INTEGER,
    c_tz_id BIGINT,
    c_src_tz_dst_used TEXT,
    c_src_save_statistics TEXT,
    c_point_id BIGINT,
    c_src_dir_inv TEXT,
    c_src_tmpl_id BIGINT,
    c_src_id BIGINT,
    c_sp_id BIGINT,
    c_lpty_id BIGINT,
    c_lpty_value TEXT,
    c_src_tmpl_code TEXT,
    c_src_tmpl_name TEXT,
    c_delayed TEXT,
    c_ack_comment TEXT,
    c_ph_id BIGINT,
    c_gr_id BIGINT,
    c_ds_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_datastatusflags (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_dp_id BIGINT,
    c_type TEXT,
    c_data_code TEXT,
    c_fp_id BIGINT,
    c_sf_id BIGINT,
    c_sf_auto_null_act TEXT,
    c_in_fp_sf TEXT,
    c_sf_name TEXT
);

CREATE TABLE IF NOT EXISTS g_deviceconfig (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_dw_t TEXT,
    c_withe_id BIGINT,
    c_ind1 TEXT,
    c_ind2 TEXT,
    c_ind3 TEXT,
    c_emu TEXT,
    c_point_id BIGINT,
    c_src_id BIGINT,
    c_pw_t TEXT
);

CREATE TABLE IF NOT EXISTS g_devices (
    c_dev_id BIGSERIAL PRIMARY KEY,
    c_dev_type_id BIGINT,
    c_dev_number TEXT,
    c_imei TEXT
);

CREATE TABLE IF NOT EXISTS g_devicespropslists (
    c_dpty_id BIGSERIAL PRIMARY KEY,
    c_dpty_code TEXT,
    c_dpty_name TEXT,
    c_enum_id BIGINT,
    c_dpty_type_id BIGINT,
    c_dpty_nr BIGINT,
    c_fmt_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_devicestypes (
    c_ph_type_id BIGSERIAL PRIMARY KEY,
    c_se_tmpl_id BIGINT,
    c_sep_b_lag BIGINT,
    c_sep_b_depth BIGINT,
    c_sep_b_per_id BIGINT,
    c_sep_b_sch_id BIGINT,
    c_sep_h_lag BIGINT,
    c_sep_h_depth BIGINT,
    c_sep_h_per_id BIGINT,
    c_sep_h_sch_id BIGINT,
    c_sep_f_lag BIGINT,
    c_sep_f_depth BIGINT,
    c_sep_f_per_id BIGINT,
    c_sep_f_sch_id BIGINT,
    c_sep_r_lag BIGINT,
    c_sep_r_depth BIGINT,
    c_sep_r_per_id BIGINT,
    c_sep_r_sch_id BIGINT,
    c_dp_id BIGINT,
    c_dev_id BIGINT,
    c_mod_dev_number TEXT,
    c_src_id BIGINT,
    c_devdp_id BIGINT,
    c_old_dev_dp_et TIMESTAMPTZ,
    c_new_dev_type_id BIGINT,
    c_new_dev_number TEXT,
    c_new_dev_dp_bt TIMESTAMPTZ,
    c_create_src TEXT,
    c_dev_type_id BIGINT,
    c_dev_type_name TEXT
);

CREATE TABLE IF NOT EXISTS g_devicestypesdpty (
    c_dev_type_id BIGSERIAL PRIMARY KEY,
    c_dpty_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_devmou (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_dev_id BIGINT,
    c_mod_dev_number TEXT,
    c_src_id BIGINT,
    c_devdp_id BIGINT,
    c_old_dev_dp_et TIMESTAMPTZ,
    c_new_dev_type_id BIGINT,
    c_new_dev_number TEXT,
    c_new_dev_dp_bt TIMESTAMPTZ,
    c_create_src TEXT
);

CREATE TABLE IF NOT EXISTS g_directions (
    c_cont_id BIGSERIAL PRIMARY KEY,
    c_comp_id BIGINT,
    c_comp_ms_id BIGINT,
    c_comp_dir_id BIGINT,
    c_comp_ec_id BIGINT,
    c_grc_bt TIMESTAMPTZ,
    c_cont_ms_id BIGINT,
    c_cont_dir_id BIGINT,
    c_cont_ec_id BIGINT,
    c_coef TEXT,
    c_gr_id BIGINT,
    c_point_id BIGINT,
    c_point_ms_id BIGINT,
    c_point_dir_id BIGINT,
    c_grp_bt TIMESTAMPTZ,
    c_gr_ms_id BIGINT,
    c_gr_dir_id BIGINT,
    c_gr_ec_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_discretesignaldata (
    c_ds_id BIGSERIAL PRIMARY KEY,
    c_ds_t TEXT,
    c_ds_v TEXT,
    c_ds_data_desc TEXT,
    c_ds_ignored TEXT,
    c_target TEXT,
    c_bt TEXT,
    c_et TEXT
);

CREATE TABLE IF NOT EXISTS g_discretesignals (
    c_ds_id BIGSERIAL PRIMARY KEY,
    c_ds_name TEXT,
    c_ds_code TEXT,
    c_ds_type_id BIGINT,
    c_enum_id BIGINT,
    c_point_id BIGINT,
    c_ds_enabled INTEGER,
    c_ds_event_log TEXT,
    c_ds_rt_enabled INTEGER,
    c_ds_binary TEXT,
    c_src_id BIGINT,
    c_di_id BIGINT,
    c_se_ab TEXT,
    c_se_a TEXT,
    c_se_b TEXT,
    c_se_enabled INTEGER,
    c_se_forced TEXT,
    c_se_h TEXT,
    c_se_h_per_id BIGINT,
    c_se_h_depth BIGINT,
    c_se_h_bound TEXT,
    c_se_h_restore_depth BIGINT,
    c_se_h_restore_per_id BIGINT,
    c_add_sep TEXT
);

CREATE TABLE IF NOT EXISTS g_discretesignaltypes (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_ack_comment TEXT,
    c_src_id BIGINT,
    c_ph_id BIGINT,
    c_point_id BIGINT,
    c_gr_id BIGINT,
    c_ds_id BIGINT,
    c_ds_type_id BIGINT,
    c_ds_type_name TEXT,
    c_ds_type_code TEXT,
    c_enum_id BIGINT,
    c_ds_event_log TEXT,
    c_ds_rt_enabled INTEGER,
    c_ds_binary TEXT
);

CREATE TABLE IF NOT EXISTS g_dl_type_show (
    c_ds_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT,
    c_gr_id BIGINT,
    c_ms_type_id BIGINT,
    c_aggs_type_id BIGINT,
    c_md_id BIGINT,
    c_msf_id BIGINT,
    c_dir_id BIGINT,
    c_ml_id BIGINT,
    c_sheaf_id BIGINT,
    c_count TEXT
);

CREATE TABLE IF NOT EXISTS g_dp_das (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_das_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_dp_das_frc (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_das_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_dp_das_log (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_das_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_dp_type_show (
    c_ds_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT,
    c_gr_id BIGINT,
    c_ms_type_id BIGINT,
    c_aggs_type_id BIGINT,
    c_md_id BIGINT,
    c_msf_id BIGINT,
    c_dir_id BIGINT,
    c_ml_id BIGINT,
    c_sheaf_id BIGINT,
    c_count TEXT
);

CREATE TABLE IF NOT EXISTS g_ds_gr (
    c_ds_id BIGSERIAL PRIMARY KEY,
    c_gr_id BIGINT,
    c_ds_nr BIGINT,
    c_id TEXT
);

CREATE TABLE IF NOT EXISTS g_ds_type_gr (
    c_ds_type_id BIGSERIAL PRIMARY KEY,
    c_gr_id BIGINT,
    c_withe_id BIGINT,
    c_sam_id BIGINT,
    c_ml_id BIGINT,
    c_verge_id BIGINT,
    c_gmod_id BIGINT,
    c_ec_id BIGINT,
    c_ec_in TEXT,
    c_gprc TEXT,
    c_ds_type_gr_priority BIGINT
);

CREATE TABLE IF NOT EXISTS g_enumerations (
    c_enum_id BIGSERIAL PRIMARY KEY,
    c_enum_code TEXT,
    c_enum_name TEXT,
    c_enum_type_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_enumerationsdata (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_lpty_id BIGINT,
    c_lpty_value TEXT,
    c_enum_id BIGINT,
    c_enum_value TEXT,
    c_enum_value_desc TEXT,
    c_enum_data_nr BIGINT,
    c_enum_value_new TEXT,
    c_ds_id BIGINT,
    c_ds_t TEXT,
    c_ds_v TEXT,
    c_ds_data_desc TEXT
);

CREATE TABLE IF NOT EXISTS g_ev_ack (
    c_ev_id BIGSERIAL PRIMARY KEY,
    c_ev_time TIMESTAMPTZ,
    c_ack_comment TEXT,
    c_dp_id BIGINT,
    c_src_id BIGINT,
    c_ph_id BIGINT,
    c_point_id BIGINT,
    c_gr_id BIGINT,
    c_ds_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_ev_fields (
    c_eva_id BIGSERIAL PRIMARY KEY,
    c_rpqf_id BIGINT,
    c_rpqf_value TEXT
);

CREATE TABLE IF NOT EXISTS g_eva_ack_ug (
    c_eva_id BIGSERIAL PRIMARY KEY,
    c_ug_id BIGINT,
    c_al_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_eva_ack_user (
    c_eva_id BIGSERIAL PRIMARY KEY,
    c_user_id BIGINT,
    c_al_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_evabgaqf (
    c_eva_id BIGSERIAL PRIMARY KEY,
    c_bga_param_nr BIGINT,
    c_bga_param_value TEXT
);

CREATE TABLE IF NOT EXISTS g_evaqf (
    c_eva_id BIGSERIAL PRIMARY KEY,
    c_rpqf_id BIGINT,
    c_rpqf_value TEXT
);

CREATE TABLE IF NOT EXISTS g_eventaccidents (
    c_eva_id BIGSERIAL PRIMARY KEY,
    c_eva_name TEXT,
    c_eva_code TEXT,
    c_eva_type_id BIGINT,
    c_rpa_id BIGINT,
    c_bgao_status TEXT,
    c_bga_id BIGINT,
    c_eva_enabled INTEGER,
    c_eva_block TEXT,
    c_eva_block_type_id BIGINT,
    c_eva_block_duration TEXT,
    c_eva_immediate TEXT,
    c_ch_cnt TEXT,
    c_si_cnt TEXT,
    c_oc_cnt TEXT,
    c_du_cnt TEXT,
    c_ch_pnt TEXT,
    c_si_pnt TEXT,
    c_oc_pnt TEXT,
    c_du_pnt TEXT,
    c_ch_dsc TEXT,
    c_si_dsc TEXT,
    c_oc_dsc TEXT,
    c_du_dsc TEXT,
    c_ch_dpt TEXT,
    c_si_dpt TEXT,
    c_oc_dpt TEXT,
    c_du_dpt TEXT,
    c_ch_grp TEXT,
    c_si_grp TEXT,
    c_oc_grp TEXT,
    c_du_grp TEXT,
    c_ch_steady TEXT,
    c_steady_type_id BIGINT,
    c_ignore_steady_val_restore TEXT,
    c_du_steady TEXT
);

CREATE TABLE IF NOT EXISTS g_eventaccidentstypes (
    c_eva_type_id BIGSERIAL PRIMARY KEY,
    c_eva_type_name TEXT
);

CREATE TABLE IF NOT EXISTS g_events_mcc (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_mcc_t TEXT,
    c_md_cnt TEXT,
    c_coef_u_numerator TEXT,
    c_coef_u_denominator TEXT,
    c_coef_i_numerator TEXT,
    c_coef_i_denominator TEXT,
    c_pl_dl TEXT
);

CREATE TABLE IF NOT EXISTS g_eventsdevlog (
    c_dew_id BIGSERIAL PRIMARY KEY,
    c_dew_name TEXT,
    c_dew_enabled INTEGER,
    c_withe_type_id BIGINT,
    c_withe_id BIGINT,
    c_dp_id BIGINT,
    c_dew_depth BIGINT,
    c_gew_id BIGINT,
    c_gew_name TEXT,
    c_gew_enabled INTEGER,
    c_gr_id BIGINT,
    c_gew_depth BIGINT,
    c_withe_type_name TEXT,
    c_on_value_change TEXT
);

CREATE TABLE IF NOT EXISTS g_exc_src_tmpl_gr (
    c_src_tmpl_id BIGSERIAL PRIMARY KEY,
    c_gr_id BIGINT,
    c_sbst_src_tmpl_id BIGINT,
    c_sbst_src_tmpl_priority BIGINT
);

CREATE TABLE IF NOT EXISTS g_exchangeaddresses (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_pl_id BIGINT,
    c_pl_enabled INTEGER,
    c_ml_id BIGINT,
    c_xa_id BIGINT,
    c_xa_name TEXT,
    c_xa_enabled INTEGER,
    c_gr_id BIGINT,
    c_mlset_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_exchangeelements (
    c_xfe_id BIGSERIAL PRIMARY KEY,
    c_sch_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_exchangequality (
    c_ml_id BIGSERIAL PRIMARY KEY,
    c_mlset_id BIGINT,
    c_xa_id BIGINT,
    c_xf_id BIGINT,
    c_xfau_id BIGINT,
    c_xf_type_id BIGINT,
    c_point_id BIGINT,
    c_gr_id BIGINT,
    c_own TEXT,
    c_not_own TEXT,
    c_comercial TEXT,
    c_tech TEXT,
    c_automated TEXT,
    c_not_automated TEXT
);

CREATE TABLE IF NOT EXISTS g_exportform (
    c_xa_id BIGSERIAL PRIMARY KEY,
    c_xml_name TEXT,
    c_report_sending TEXT,
    c_xf_id BIGINT,
    c_doc_nr BIGINT,
    c_xf_type_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_fib (
    c_fib_id BIGSERIAL PRIMARY KEY,
    c_meter_number TEXT,
    c_point_id BIGINT,
    c_aggs_type_id BIGINT,
    c_msf_id BIGINT,
    c_dir_id BIGINT,
    c_from_da TEXT,
    c_to_da TEXT
);

CREATE TABLE IF NOT EXISTS g_fib_msf_dir (
    c_fib_id BIGSERIAL PRIMARY KEY,
    c_meter_number TEXT,
    c_point_id BIGINT,
    c_aggs_type_id BIGINT,
    c_msf_id BIGINT,
    c_dir_id BIGINT,
    c_from_da TEXT,
    c_to_da TEXT
);

CREATE TABLE IF NOT EXISTS g_fillingprofiledata (
    c_fp_id BIGSERIAL PRIMARY KEY,
    c_fp_nr BIGINT,
    c_aggs_type_id BIGINT,
    c_ms_id BIGINT,
    c_dir_id BIGINT,
    c_aggs_id BIGINT,
    c_aggf_id BIGINT,
    c_tff_id BIGINT,
    c_md_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_fillingprofiles (
    c_fp_id BIGSERIAL PRIMARY KEY,
    c_fp_name TEXT,
    c_fp_code TEXT
);

CREATE TABLE IF NOT EXISTS g_gmod (
    c_ml_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT,
    c_gr_id BIGINT,
    c_gmod_id BIGINT,
    c_gprc TEXT,
    c_ec_id BIGINT,
    c_ec_in TEXT,
    c_sam_id BIGINT,
    c_pma_tmpl_id BIGINT,
    c_pma_tmpl_name TEXT,
    c_pma_tmpl_code TEXT,
    c_gmod_code TEXT,
    c_gmod_name TEXT,
    c_ignore_group_value TEXT,
    c_gmod_eu_code TEXT,
    c_gmod_eu_code_usage TEXT
);

CREATE TABLE IF NOT EXISTS g_gmod_data (
    c_gmod_id BIGSERIAL PRIMARY KEY,
    c_gmod_data_nr BIGINT,
    c_gpty_id BIGINT,
    c_ltc_id BIGINT,
    c_gmod_const TEXT,
    c_ms_id BIGINT,
    c_tff_id BIGINT,
    c_ec_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_grc (
    c_cont_id BIGSERIAL PRIMARY KEY,
    c_comp_id BIGINT,
    c_grc_bt_original TEXT,
    c_grc_bt TIMESTAMPTZ,
    c_grc_et TIMESTAMPTZ,
    c_grc_nr BIGINT,
    c_grc_desc TEXT,
    c_grc_typ TEXT,
    c_id TEXT
);

CREATE TABLE IF NOT EXISTS g_grc_data (
    c_cont_id BIGSERIAL PRIMARY KEY,
    c_comp_id BIGINT,
    c_comp_ms_id BIGINT,
    c_comp_dir_id BIGINT,
    c_comp_ec_id BIGINT,
    c_grc_bt TIMESTAMPTZ,
    c_cont_ms_id BIGINT,
    c_cont_dir_id BIGINT,
    c_cont_ec_id BIGINT,
    c_coef TEXT
);

CREATE TABLE IF NOT EXISTS g_grc_rule (
    c_cont_type_id BIGSERIAL PRIMARY KEY,
    c_cont_ms_id BIGINT,
    c_cont_dir_id BIGINT,
    c_cont_ec_id BIGINT,
    c_comp_type_id BIGINT,
    c_comp_ms_id BIGINT,
    c_comp_dir_id BIGINT,
    c_comp_ec_id BIGINT,
    c_rule_enabled INTEGER,
    c_coef TEXT
);

CREATE TABLE IF NOT EXISTS g_groupmodifications (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_ml_id BIGINT,
    c_md_id BIGINT,
    c_aggs_id BIGINT,
    c_wo_byp TEXT,
    c_wo_acts TEXT,
    c_billing_hour TEXT,
    c_billing_hour_for_prev_day TEXT,
    c_freezed TEXT,
    c_mou_split TEXT,
    c_split_bt TIMESTAMPTZ,
    c_split_et TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS g_grouppropsgpty (
    c_gr_type_id BIGSERIAL PRIMARY KEY,
    c_gpty_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_grouppropslists (
    c_gpty_id BIGSERIAL PRIMARY KEY,
    c_gpty_code TEXT,
    c_gpty_name TEXT,
    c_enum_id BIGINT,
    c_gpty_numeric TEXT,
    c_gpty_type_id BIGINT,
    c_gpty_nr BIGINT,
    c_fmt_id BIGINT,
    c_pma_tmpl_id BIGINT,
    c_pma_tmpl_name TEXT,
    c_pma_tmpl_code TEXT
);

CREATE TABLE IF NOT EXISTS g_grp (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_grp_bt TIMESTAMPTZ,
    c_grp_et TIMESTAMPTZ,
    c_gr_id BIGINT,
    c_grp_bt_original TEXT,
    c_grp_nr BIGINT,
    c_grp_desc TEXT,
    c_id TEXT,
    c_type TEXT,
    c_codes TEXT,
    c_ffp_val_row_num TEXT
);

CREATE TABLE IF NOT EXISTS g_grp_data (
    c_gr_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT,
    c_point_ms_id BIGINT,
    c_point_dir_id BIGINT,
    c_grp_bt TIMESTAMPTZ,
    c_gr_ms_id BIGINT,
    c_gr_dir_id BIGINT,
    c_gr_ec_id BIGINT,
    c_coef TEXT
);

CREATE TABLE IF NOT EXISTS g_gtp (
    c_gtp_id BIGSERIAL PRIMARY KEY,
    c_gr_id BIGINT,
    c_ms_id BIGINT,
    c_tp_id BIGINT,
    c_gtp_bt TIMESTAMPTZ,
    c_gtp_et TIMESTAMPTZ,
    c_aggf_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_holidays (
    c_ml_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT,
    c_gr_id BIGINT,
    c_gmod_id BIGINT,
    c_gprc TEXT,
    c_ec_id BIGINT,
    c_ec_in TEXT,
    c_sam_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_importantwithe (
    c_src_type_id BIGSERIAL PRIMARY KEY,
    c_is_point INTEGER,
    c_withe_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_importdevmeter (
    c_ph_type_id BIGSERIAL PRIMARY KEY,
    c_dev_type_id BIGINT,
    c_dp_type_id BIGINT,
    c_ph_port TEXT,
    c_ip TEXT,
    c_dev_number TEXT,
    c_meters TEXT,
    c_dp_name TEXT,
    c_dp_name_ending TEXT,
    c_ph_port2 TEXT,
    c_ph_type_id2 TEXT
);

CREATE TABLE IF NOT EXISTS g_init_gen_point (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_ml_id BIGINT,
    c_from_da TEXT,
    c_to_da TEXT,
    c_bgao_status TEXT
);

CREATE TABLE IF NOT EXISTS g_linkprofiles (
    c_src_tmpl_id BIGSERIAL PRIMARY KEY,
    c_ml_id BIGINT,
    c_lp_id BIGINT,
    c_se_ab TEXT,
    c_se_a TEXT,
    c_se_b TEXT,
    c_se_h TEXT,
    c_se_h_per_id BIGINT,
    c_se_h_depth BIGINT,
    c_se_h_restore_depth BIGINT,
    c_se_h_restore_per_id BIGINT,
    c_se_tmpl_extend_pl TEXT,
    c_ignore_se_ab TEXT,
    c_point_id BIGINT,
    c_pl_id BIGINT,
    c_pl_enabled INTEGER,
    c_mlset_id BIGINT,
    c_di_id BIGINT,
    c_di_enabled INTEGER
);

CREATE TABLE IF NOT EXISTS g_lossparams (
    c_gr_id BIGSERIAL PRIMARY KEY,
    c_bt TEXT,
    c__bt TIMESTAMPTZ,
    c_et TEXT,
    c_ppb_sn_koef TEXT,
    c_ppb_sn_konst TEXT,
    c_pmb_sn_koef TEXT,
    c_pmb_sn_konst TEXT,
    c_qpb_sn_koef TEXT,
    c_qpb_sn_konst TEXT,
    c_qmb_sn_koef TEXT,
    c_qmb_sn_konst TEXT,
    c_pb_sn_koef1 TEXT,
    c_pb_sn_konst TEXT,
    c_qb_sn_koef1 TEXT,
    c_qb_sn_konst TEXT
);

CREATE TABLE IF NOT EXISTS g_ltc (
    c_pma_tmpl_id BIGSERIAL PRIMARY KEY,
    c_pma_tmpl_name TEXT,
    c_pma_tmpl_code TEXT
);

CREATE TABLE IF NOT EXISTS g_manageperiods (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_month TEXT
);

CREATE TABLE IF NOT EXISTS g_map (
    row_id BIGSERIAL PRIMARY KEY,
    c_force_recheck TEXT
);

CREATE TABLE IF NOT EXISTS g_measuredensity (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_dp_id BIGINT,
    c_type TEXT,
    c_data_code TEXT
);

CREATE TABLE IF NOT EXISTS g_measurelines (
    c_ml_id BIGSERIAL PRIMARY KEY,
    c_ml_custom_code TEXT,
    c_ml_name TEXT,
    c_stobis TEXT,
    c_eu_id BIGINT,
    c_enum_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_measurelinessets (
    c_mlset_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT,
    c_pl_id BIGINT,
    c_pl_enabled INTEGER,
    c_ml_id BIGINT,
    c_gr_id BIGINT,
    c_src_tmpl_id BIGINT,
    c_lp_id BIGINT,
    c_se_ab TEXT,
    c_se_a TEXT,
    c_se_b TEXT,
    c_se_h TEXT,
    c_se_h_per_id BIGINT,
    c_se_h_depth BIGINT,
    c_se_h_restore_depth BIGINT,
    c_se_h_restore_per_id BIGINT,
    c_se_tmpl_extend_pl TEXT,
    c_ignore_se_ab TEXT,
    c_mlset_name TEXT,
    c_mlset_code TEXT,
    c_xfa_id BIGINT,
    c_xfau_code TEXT,
    c_xfau_type_id BIGINT,
    c_xfau_enabled INTEGER,
    c_inherit_cn TEXT,
    c_ignore_pl TEXT
);

CREATE TABLE IF NOT EXISTS g_measurements (
    c_ms_id BIGSERIAL PRIMARY KEY,
    c_ms_name TEXT,
    c_ms_type_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_measurementsaggfuncs (
    c_msf_id BIGSERIAL PRIMARY KEY,
    c_msf_name TEXT
);

CREATE TABLE IF NOT EXISTS g_measurementtypes (
    c_ms_type_id BIGSERIAL PRIMARY KEY,
    c_visible TEXT
);

CREATE TABLE IF NOT EXISTS g_measuringdevicespropslists (
    c_mpty_id BIGSERIAL PRIMARY KEY,
    c_mpty_code TEXT,
    c_mpty_name TEXT,
    c_enum_id BIGINT,
    c_mpty_type_id BIGINT,
    c_mpty_nr BIGINT,
    c_fmt_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_metertypempty (
    c_meter_type_id BIGSERIAL PRIMARY KEY,
    c_mpty_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_mlsetdata (
    c_mlset_id BIGSERIAL PRIMARY KEY,
    c_ml_id BIGINT,
    c_ds_type_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_monitoring (
    c_ml_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT,
    c_gr_id BIGINT,
    c_gmod_id BIGINT,
    c_gprc TEXT,
    c_ec_id BIGINT,
    c_ec_in TEXT,
    c_sam_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_monitoringtemplates (
    c_gma_tmpl_id BIGSERIAL PRIMARY KEY,
    c_gma_tmpl_name TEXT,
    c_gma_tmpl_code TEXT,
    c_gma_ma_tmpl_id BIGINT,
    c_gr_id BIGINT,
    c_pma_tmpl_id BIGINT,
    c_pma_tmpl_name TEXT,
    c_pma_tmpl_code TEXT,
    c_pma_ma_tmpl_id BIGINT,
    c_verge_id BIGINT,
    c_ma_ab TEXT,
    c_ma_a_nom TEXT,
    c_ma_a_denom TEXT,
    c_ma_b TEXT,
    c_ppty_ma_a_nom TEXT,
    c_ppty_ma_a_denom TEXT,
    c_ppty_ma_b TEXT,
    c_ignore_ma_ab TEXT,
    c_ma_show TEXT,
    c_ma_auto_check TEXT,
    c_ma_auto_null_act TEXT,
    c_ma_auto_ccs TEXT,
    c_ma_report_exceeding TEXT,
    c_ma_lag BIGINT,
    c_ma_lag_per_id BIGINT,
    c_ppty_id BIGINT,
    c_ltc_id BIGINT,
    c_target_ml_id BIGINT,
    c_source_mt_id BIGINT,
    c_source_sam_tmpl_id BIGINT,
    c_source_ml_id BIGINT,
    c_rel_type_id BIGINT,
    c_pos_nr BIGINT,
    c_pma_ma_tmpl_name TEXT,
    c_point_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_mou_type_upty (
    c_mou_type_id BIGSERIAL PRIMARY KEY,
    c_upty_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_mountings (
    c_mou_id BIGSERIAL PRIMARY KEY,
    c_mou_bt TIMESTAMPTZ,
    c_mou_et TIMESTAMPTZ,
    c_meter_id BIGINT,
    c_point_id BIGINT,
    c_mou_type_id BIGINT,
    c_mou_bt_db_time TIMESTAMPTZ,
    c_mou_et_db_time TIMESTAMPTZ,
    c_mou_bt_number TEXT,
    c_mou_et_number TEXT
);

CREATE TABLE IF NOT EXISTS g_mountingtypes (
    c_mou_id BIGSERIAL PRIMARY KEY,
    c_mou_bt TIMESTAMPTZ,
    c_mou_et TIMESTAMPTZ,
    c_meter_id BIGINT,
    c_point_id BIGINT,
    c_mou_type_id BIGINT,
    c_mou_bt_db_time TIMESTAMPTZ,
    c_mou_et_db_time TIMESTAMPTZ,
    c_mou_bt_number TEXT,
    c_mou_et_number TEXT,
    c_mou_type_name TEXT
);

CREATE TABLE IF NOT EXISTS g_ms_type_ug (
    c_ms_type_id BIGSERIAL PRIMARY KEY,
    c_ug_id BIGINT,
    c_visible TEXT
);

CREATE TABLE IF NOT EXISTS g_ollama (
    row_id BIGSERIAL PRIMARY KEY,
    c_prompt TEXT,
    c_system_message TEXT
);

CREATE TABLE IF NOT EXISTS g_op (
    c_op_id BIGSERIAL PRIMARY KEY,
    c_os_id BIGINT,
    c_err_text TEXT
);

CREATE TABLE IF NOT EXISTS g_orn (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_gr_id BIGINT,
    c_ds_id BIGINT,
    c_ms_type_id BIGINT,
    c_aggs_type_id BIGINT,
    c_md_id BIGINT,
    c_msf_id BIGINT,
    c_dir_id BIGINT,
    c_ml_id BIGINT,
    c_sheaf_id BIGINT,
    c_count TEXT
);

CREATE TABLE IF NOT EXISTS g_parammenuv2 (
    c_gr_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT,
    c_extractbranchdata TEXT,
    c_ms_type_id BIGINT,
    c_msf_id BIGINT,
    c_md_id BIGINT,
    c_aggs_id BIGINT,
    c_branches TEXT,
    c_add_tech_info TEXT,
    c_aggs_type_id BIGINT,
    c_aggf_id BIGINT,
    c_dir_id BIGINT,
    c_withe_class_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_ph_type_show (
    c_ds_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT,
    c_gr_id BIGINT,
    c_ms_type_id BIGINT,
    c_aggs_type_id BIGINT,
    c_md_id BIGINT,
    c_msf_id BIGINT,
    c_dir_id BIGINT,
    c_ml_id BIGINT,
    c_sheaf_id BIGINT,
    c_count TEXT
);

CREATE TABLE IF NOT EXISTS g_pobj (
    c_pobj_id BIGSERIAL PRIMARY KEY,
    c_pobj_name TEXT,
    c_pobj_code TEXT,
    c_pobj_type_id BIGINT,
    c_parent_pobj_id BIGINT,
    c_sign TEXT,
    c_recom_enable TEXT,
    c_ms_type_id BIGINT,
    c_ev_time TIMESTAMPTZ,
    c_ev_id BIGINT,
    c_reg_bt TIMESTAMPTZ,
    c_reg_sv1 TEXT,
    c_reg_sv2 TEXT,
    c_reg_sv3 TEXT,
    c_reg_bv1 TEXT,
    c_reg_bv2 TEXT,
    c_reg_bv3 TEXT,
    c_reg_sv1_cost TEXT,
    c_reg_sv2_cost TEXT,
    c_reg_sv3_cost TEXT,
    c_reg_bv1_cost TEXT,
    c_reg_bv2_cost TEXT,
    c_reg_bv3_cost TEXT,
    c_limit_time TIMESTAMPTZ,
    c_limit_value TEXT,
    c_limit_comment TEXT,
    c_regulation TEXT
);

CREATE TABLE IF NOT EXISTS g_pobj_data (
    c_pobj_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT,
    c_ml_id BIGINT,
    c_sign TEXT,
    c_meas_type TEXT
);

CREATE TABLE IF NOT EXISTS g_pobj_limits (
    c_pobj_id BIGSERIAL PRIMARY KEY,
    c_limit_time TIMESTAMPTZ,
    c_regulation TEXT,
    c_limit_comment TEXT,
    c_reg_end TEXT,
    c_delta TEXT,
    c_reg_type_id BIGINT,
    c_reef TEXT,
    c_limit_value TEXT
);

CREATE TABLE IF NOT EXISTS g_pobj_limits_15 (
    c_pobj_id BIGSERIAL PRIMARY KEY,
    c_limit_time TIMESTAMPTZ,
    c_regulation TEXT,
    c_limit_comment TEXT,
    c_reg_end TEXT,
    c_delta TEXT,
    c_reg_type_id BIGINT,
    c_reef TEXT,
    c_limit_value TEXT
);

CREATE TABLE IF NOT EXISTS g_pobj_limits_offer (
    c_pobj_id BIGSERIAL PRIMARY KEY,
    c_plo_t TEXT,
    c_plo_v TEXT,
    c_use_offer TEXT
);

CREATE TABLE IF NOT EXISTS g_pobj_point_data (
    c_pobj_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT,
    c_pobj_point_name TEXT,
    c_pobj_point_hide TEXT,
    c_pobj_point_nr BIGINT
);

CREATE TABLE IF NOT EXISTS g_pobj_point_ds (
    c_pobj_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT,
    c_ds_id BIGINT,
    c_ds_v TEXT,
    c_formula_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_pobj_reg (
    c_pobj_id BIGSERIAL PRIMARY KEY,
    c_reg_bt TIMESTAMPTZ,
    c_reg_sv1 TEXT,
    c_reg_sv2 TEXT,
    c_reg_sv3 TEXT,
    c_reg_bv1 TEXT,
    c_reg_bv2 TEXT,
    c_reg_bv3 TEXT,
    c_reg_sv1_cost TEXT,
    c_reg_sv2_cost TEXT,
    c_reg_sv3_cost TEXT,
    c_reg_bv1_cost TEXT,
    c_reg_bv2_cost TEXT,
    c_reg_bv3_cost TEXT
);

CREATE TABLE IF NOT EXISTS g_pobj_res (
    c_pobj_id BIGSERIAL PRIMARY KEY,
    c_res_bt TIMESTAMPTZ,
    c_res_v1 TEXT,
    c_res_v2 TEXT,
    c_res_v3 TEXT
);

CREATE TABLE IF NOT EXISTS g_pobj_rs (
    c_pobj_id BIGSERIAL PRIMARY KEY,
    c_rs_bt TIMESTAMPTZ,
    c_rs_et TIMESTAMPTZ,
    c_rs_v TEXT
);

CREATE TABLE IF NOT EXISTS g_pobj_rs_15 (
    c_pobj_id BIGSERIAL PRIMARY KEY,
    c_rs_bt TIMESTAMPTZ,
    c_rs_et TIMESTAMPTZ,
    c_rs_v TEXT
);

CREATE TABLE IF NOT EXISTS g_pobj_tpty (
    c_pobj_id BIGSERIAL PRIMARY KEY,
    c_tpty_id BIGINT,
    c_tpty_value TEXT
);

CREATE TABLE IF NOT EXISTS g_pointmenuv2 (
    c_gr_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT,
    c_grp_bt TIMESTAMPTZ,
    c_grp_et TIMESTAMPTZ,
    c_ds_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_pointrules (
    c_point_rule_id BIGSERIAL PRIMARY KEY,
    c_rule_enabled INTEGER,
    c_point_type_id BIGINT,
    c_ecp_id BIGINT,
    c_point_commercial INTEGER,
    c_point_internal INTEGER,
    c_point_auto_read_enabled INTEGER,
    c_point_licensed INTEGER,
    c_xa_id BIGINT,
    c_is_xa INTEGER,
    c_fp_id BIGINT,
    c_vp_id BIGINT,
    c_pma_tmpl_id BIGINT,
    c_rtp_id BIGINT,
    c_tp_id BIGINT,
    c_aggf_id BIGINT,
    c_sbst_tmpl_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_points_sbst_tmpl (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_sbst_tmpl_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_pointsfp (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_fp_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_pointsmeasurelines (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_ml_id BIGINT,
    c_pl_id BIGINT,
    c_pl_enabled INTEGER,
    c_bga_formula TEXT,
    c_grid_data TEXT,
    c_current_action TEXT,
    c_mlset_id BIGINT,
    c_extend TEXT
);

CREATE TABLE IF NOT EXISTS g_pointsrtp (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_rtp_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_pointsvp (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_vp_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_pointtypeppty (
    c_point_type_id BIGSERIAL PRIMARY KEY,
    c_ppty_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_possiblepointprops (
    c_ppty_id BIGSERIAL PRIMARY KEY,
    c_ppty_code TEXT,
    c_ppty_name TEXT,
    c_enum_id BIGINT,
    c_ppty_type_id BIGINT,
    c_ppty_numeric TEXT,
    c_ppty_nr BIGINT,
    c_fmt_id BIGINT,
    c_pma_tmpl_id BIGINT,
    c_pma_tmpl_name TEXT,
    c_pma_tmpl_code TEXT
);

CREATE TABLE IF NOT EXISTS g_powerrecommds (
    c_ds_id BIGSERIAL PRIMARY KEY,
    c_ds_t TEXT,
    c_ds_v TEXT
);

CREATE TABLE IF NOT EXISTS g_profiles (
    c_ffp_id BIGSERIAL PRIMARY KEY,
    c_ffp_code TEXT,
    c_ffp_name TEXT,
    c_ffp_type TEXT
);

CREATE TABLE IF NOT EXISTS g_profilesdata (
    c_ffp_data_id BIGSERIAL PRIMARY KEY,
    c_ffp_id BIGINT,
    c_ffp_val_row_num TEXT,
    c_ffp_vt_id BIGINT,
    c_ffp_val_key_1 TEXT,
    c_ffp_val_key_2 TEXT,
    c_ffp_val_key_3 TEXT,
    c_ffp_data_name TEXT,
    c_ffp_val_sort_num TEXT,
    c_order_val TEXT
);

CREATE TABLE IF NOT EXISTS g_ptp (
    c_ptp_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT,
    c_aggf_id BIGINT,
    c_tp_id BIGINT,
    c_ptp_bt TIMESTAMPTZ,
    c_ptp_et TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS g_qualityreports (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_cp_bt TIMESTAMPTZ,
    c_cp_et TIMESTAMPTZ,
    c_per_id BIGINT,
    c_use_forced_period_close TEXT,
    c_month_or_day TEXT,
    c_open_days TEXT
);

CREATE TABLE IF NOT EXISTS g_realtimedata (
    row_id BIGSERIAL PRIMARY KEY,
    c_types TEXT,
    c_points TEXT,
    c_mls TEXT,
    c_scheme_changed TEXT,
    c_current_db_time TIMESTAMPTZ,
    c_h_date TIMESTAMPTZ,
    c_sql TEXT,
    c_get_headers TEXT,
    c_only_first TEXT
);

CREATE TABLE IF NOT EXISTS g_realtimeprofiles (
    c_rtp_id BIGSERIAL PRIMARY KEY,
    c_ml_id BIGINT,
    c_rtp_ml_enabled INTEGER,
    c_per_id BIGINT,
    c_rtp_int_value TEXT
);

CREATE TABLE IF NOT EXISTS g_realtimeprofilesdata (
    c_rtp_id BIGSERIAL PRIMARY KEY,
    c_ml_id BIGINT,
    c_rtp_ml_enabled INTEGER,
    c_per_id BIGINT,
    c_rtp_int_value TEXT
);

CREATE TABLE IF NOT EXISTS g_regulations (
    c_pobj_id BIGSERIAL PRIMARY KEY,
    c_limit_time TIMESTAMPTZ,
    c_limit_comment TEXT,
    c_reg_end TEXT,
    c_delta TEXT,
    c_reg_type_id BIGINT,
    c_is15min TEXT
);

CREATE TABLE IF NOT EXISTS g_rel_type_epty (
    c_rel_type_id BIGSERIAL PRIMARY KEY,
    c_epty_id BIGINT,
    c_enum_id BIGINT,
    c_epty_nr BIGINT,
    c_rel_id BIGINT,
    c_epty_value TEXT
);

CREATE TABLE IF NOT EXISTS g_relationpropertylists (
    c_epty_id BIGSERIAL PRIMARY KEY,
    c_epty_code TEXT,
    c_epty_name TEXT,
    c_enum_id BIGINT,
    c_epty_type_id BIGINT,
    c_epty_numeric TEXT,
    c_fmt_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_relationshippos (
    c_rel_id BIGSERIAL PRIMARY KEY,
    c_epty_id BIGINT,
    c_epty_value TEXT,
    c_pos_nr BIGINT,
    c_point_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_relationshipprops (
    c_rel_id BIGSERIAL PRIMARY KEY,
    c_epty_id BIGINT,
    c_epty_value TEXT
);

CREATE TABLE IF NOT EXISTS g_relationships (
    c_rel_id BIGSERIAL PRIMARY KEY,
    c_epty_id BIGINT,
    c_epty_value TEXT
);

CREATE TABLE IF NOT EXISTS g_relationshiptypepos (
    c_rel_id BIGSERIAL PRIMARY KEY,
    c_epty_id BIGINT,
    c_epty_value TEXT,
    c_pma_tmpl_id BIGINT,
    c_pma_tmpl_name TEXT,
    c_pma_tmpl_code TEXT,
    c_rel_type_id BIGINT,
    c_pos_nr BIGINT,
    c_pos_code TEXT,
    c_pos_desc TEXT
);

CREATE TABLE IF NOT EXISTS g_relationshiptypes (
    c_rel_type_id BIGSERIAL PRIMARY KEY,
    c_rel_type_code TEXT,
    c_rel_type_name TEXT,
    c_pma_tmpl_id BIGINT,
    c_pma_tmpl_name TEXT,
    c_pma_tmpl_code TEXT
);

CREATE TABLE IF NOT EXISTS g_reportexecutor (
    c_rp_id BIGSERIAL PRIMARY KEY,
    c_params TEXT,
    c_uv_id BIGINT,
    c_uv_name TEXT,
    c_uv_public INTEGER,
    c_uv_module TEXT,
    c_uv_type TEXT,
    c_uv_tech_info TEXT,
    c_uv_subtype TEXT,
    c_uv_data TEXT
);

CREATE TABLE IF NOT EXISTS g_reports (
    c_rp_type_id BIGSERIAL PRIMARY KEY,
    c_rp_public INTEGER,
    c_rp_id BIGINT,
    c_user_id BIGINT,
    c_rp_name TEXT,
    c_rp_description TEXT,
    c_rpf_id BIGINT,
    c_rp_log_enabled INTEGER,
    c_rp_formula TEXT,
    c_xml_name TEXT,
    c_from_das TEXT,
    c_queries TEXT,
    c_fpty_id BIGINT,
    c_fpty_value TEXT,
    c_rpa_id BIGINT,
    c_rpp_id BIGINT,
    c_sch_id BIGINT,
    c_rpa_name TEXT,
    c_folder TEXT,
    c_form_if_empty TEXT,
    c_rpa_enabled INTEGER,
    c_rpa_log_enabled INTEGER,
    c_rpa_delay_delivery TEXT,
    c_name TEXT,
    c_recipients TEXT,
    c_rpty_id BIGINT,
    c_rpty_value TEXT,
    c_ug_id BIGINT,
    c_id TEXT,
    c_rpapv_id BIGINT,
    c_rpqf_id BIGINT,
    c_rpqf_value TEXT,
    c_rpqf_desc TEXT,
    c_rpqc_id BIGINT,
    c_rpq_id BIGINT,
    c_rpqc_nr BIGINT,
    c_rpqu_id BIGINT,
    c_column_name TEXT,
    c_rpqc_asc TEXT,
    c_rpqo_id BIGINT,
    c_rpqf_essential TEXT,
    c_rpqf_inv TEXT,
    c_rpqf_nr BIGINT,
    c_rpqf_allow_empty_values TEXT,
    c_data_type TEXT,
    c_enum_id BIGINT,
    c_rpind_id BIGINT,
    c_report_check TEXT,
    c_report_sending TEXT
);

CREATE TABLE IF NOT EXISTS g_reportslog (
    c_rp_type_id BIGSERIAL PRIMARY KEY,
    c_view_only_log_enabled INTEGER,
    c_sort TEXT,
    c_db_time TIMESTAMPTZ,
    c_rp_public INTEGER,
    c_rp_manual TEXT,
    c_rp_id BIGINT,
    c_rp_name TEXT,
    c_rpa_id BIGINT,
    c_rpa_name TEXT,
    c_fill TEXT,
    c_form TEXT,
    c_send TEXT,
    c_log_comment TEXT,
    c_fill_dur TEXT,
    c_form_dur TEXT,
    c_send_dur TEXT,
    c_total_dur TEXT,
    c_rp_repeat TEXT,
    c_sch_id BIGINT,
    c_user_id BIGINT,
    c_das_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_reportsusergroups (
    c_rp_id BIGSERIAL PRIMARY KEY,
    c_ug_id BIGINT,
    c_al_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_reporttypes (
    c_rp_type_id BIGSERIAL PRIMARY KEY,
    c_rp_public INTEGER,
    c_view_only_log_enabled INTEGER,
    c_sort TEXT,
    c_db_time TIMESTAMPTZ,
    c_rp_manual TEXT,
    c_rp_id BIGINT,
    c_rp_name TEXT,
    c_rpa_id BIGINT,
    c_rpa_name TEXT,
    c_fill TEXT,
    c_form TEXT,
    c_send TEXT,
    c_log_comment TEXT,
    c_fill_dur TEXT,
    c_form_dur TEXT,
    c_send_dur TEXT,
    c_total_dur TEXT,
    c_rp_repeat TEXT,
    c_sch_id BIGINT,
    c_user_id BIGINT,
    c_das_id BIGINT,
    c_rp_type_name TEXT,
    c_rpq_id BIGINT,
    c_rpq_name TEXT,
    c_table_name TEXT,
    c_rpq_distinct TEXT,
    c_rpq_maxrows TEXT,
    c_rpq_slc TEXT,
    c_rpq_advanced TEXT
);

CREATE TABLE IF NOT EXISTS g_rgb_plan (
    c_pobj_id BIGSERIAL PRIMARY KEY,
    c_limit_time TIMESTAMPTZ,
    c_limit_value TEXT,
    c_limit_comment TEXT,
    c_regulation TEXT,
    c_nl TEXT,
    c_dpp TEXT,
    c_ds_id BIGINT,
    c_ds_t TEXT,
    c_ds_v TEXT,
    c_ds_data_desc TEXT,
    c_bt TEXT,
    c_et TEXT,
    c_ds_type_pick TEXT,
    c_pobj_state_desc TEXT,
    c_da TEXT,
    c_reg_end TEXT,
    c_delta TEXT,
    c_reg_type_id BIGINT,
    c_reef TEXT,
    c_rs_bt TIMESTAMPTZ,
    c_rs_et TIMESTAMPTZ,
    c_rs_v TEXT,
    c_plo_t TEXT,
    c_plo_v TEXT,
    c_use_offer TEXT
);

CREATE TABLE IF NOT EXISTS g_rgb_plan_15 (
    c_pobj_id BIGSERIAL PRIMARY KEY,
    c_limit_time TIMESTAMPTZ,
    c_limit_value TEXT,
    c_limit_comment TEXT,
    c_regulation TEXT,
    c_nl TEXT,
    c_dpp TEXT,
    c_reg_end TEXT,
    c_delta TEXT,
    c_reg_type_id BIGINT,
    c_reef TEXT,
    c_rs_bt TIMESTAMPTZ,
    c_rs_et TIMESTAMPTZ,
    c_rs_v TEXT
);

CREATE TABLE IF NOT EXISTS g_roles (
    c_ug_id BIGSERIAL PRIMARY KEY,
    c_gr_id BIGINT,
    c_role TEXT
);

CREATE TABLE IF NOT EXISTS g_rp_das (
    c_rp_id BIGSERIAL PRIMARY KEY,
    c_das_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_rp_das_frc (
    c_rp_id BIGSERIAL PRIMARY KEY,
    c_das_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_rp_das_log (
    c_rp_id BIGSERIAL PRIMARY KEY,
    c_das_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_rpa (
    c_rpa_id BIGSERIAL PRIMARY KEY,
    c_sch_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_rpp (
    c_xa_id BIGSERIAL PRIMARY KEY,
    c_rpty_id BIGINT,
    c_rpty_value TEXT,
    c_rpa_id BIGINT,
    c_rp_id BIGINT,
    c_rpp_id BIGINT,
    c_sch_id BIGINT,
    c_rpa_name TEXT,
    c_folder TEXT,
    c_form_if_empty TEXT,
    c_rpa_enabled INTEGER,
    c_rpa_log_enabled INTEGER,
    c_rpa_delay_delivery TEXT
);

CREATE TABLE IF NOT EXISTS g_sampledaydata (
    c_samd_id BIGSERIAL PRIMARY KEY,
    c_nr TEXT,
    c_sam_v TEXT
);

CREATE TABLE IF NOT EXISTS g_sampledayprograms (
    c_samd_id BIGSERIAL PRIMARY KEY,
    c_samd_name TEXT,
    c_samd_common TEXT,
    c_md_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_sampleperiods (
    c_samp_id BIGSERIAL PRIMARY KEY,
    c_sam_id BIGINT,
    c_samw_id BIGINT,
    c_bmm TEXT,
    c_bdd TEXT,
    c_emm TEXT,
    c_edd TEXT,
    c_bt TEXT,
    c_et TEXT
);

CREATE TABLE IF NOT EXISTS g_samples (
    c_sam_id BIGSERIAL PRIMARY KEY,
    c_sam_type_id BIGINT,
    c_sam_code TEXT,
    c_sam_name TEXT,
    c_md_id BIGINT,
    c_hld_id BIGINT,
    c_use_const_val TEXT,
    c_const_val TEXT,
    c_sam_cyclic TEXT,
    c_pma_tmpl_id BIGINT,
    c_pma_tmpl_name TEXT,
    c_pma_tmpl_code TEXT,
    c_mt_id BIGINT,
    c_bt TEXT,
    c_et TEXT
);

CREATE TABLE IF NOT EXISTS g_sampletypes (
    c_sam_type_id BIGSERIAL PRIMARY KEY,
    c_sam_type_name TEXT
);

CREATE TABLE IF NOT EXISTS g_sampleweekprograms (
    c_samw_id BIGSERIAL PRIMARY KEY,
    c_md_id BIGINT,
    c_samw_name TEXT,
    c_samw_common TEXT,
    c_samd1 TEXT,
    c_samd2 TEXT,
    c_samd3 TEXT,
    c_samd4 TEXT,
    c_samd5 TEXT,
    c_samd6 TEXT,
    c_samd7 TEXT,
    c_samd8 TEXT
);

CREATE TABLE IF NOT EXISTS g_schedules (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_ack_comment TEXT,
    c_src_id BIGINT,
    c_ph_id BIGINT,
    c_point_id BIGINT,
    c_gr_id BIGINT,
    c_ds_id BIGINT,
    c_xfau_id BIGINT,
    c_xfau_enabled INTEGER,
    c_inherit_cn TEXT,
    c_xfau_code TEXT,
    c_xfau_name TEXT,
    c_xfau_code2 TEXT,
    c_xfau_name2 TEXT,
    c_xf_id BIGINT,
    c_bga_type_id BIGINT,
    c_bga_name TEXT,
    c_bga_enabled INTEGER,
    c_sch_id BIGINT,
    c_bgaq_id BIGINT,
    c_bga_priority BIGINT,
    c_ph_type_id BIGINT,
    c_se_tmpl_id BIGINT,
    c_sep_b_lag BIGINT,
    c_sep_b_depth BIGINT,
    c_sep_b_per_id BIGINT,
    c_sep_b_sch_id BIGINT,
    c_sep_h_lag BIGINT,
    c_sep_h_depth BIGINT,
    c_sep_h_per_id BIGINT,
    c_sep_h_sch_id BIGINT,
    c_sep_f_lag BIGINT,
    c_sep_f_depth BIGINT,
    c_sep_f_per_id BIGINT,
    c_sep_f_sch_id BIGINT,
    c_sep_r_lag BIGINT,
    c_sep_r_depth BIGINT,
    c_sep_r_per_id BIGINT,
    c_sep_r_sch_id BIGINT,
    c_sep_id BIGINT,
    c_sep_enabled INTEGER,
    c_sep_s_lag BIGINT,
    c_sep_s_depth BIGINT,
    c_sep_s_per_id BIGINT,
    c_sep_s_sch_id BIGINT,
    c_rpa_id BIGINT,
    c_rp_id BIGINT,
    c_rpp_id BIGINT,
    c_rpa_name TEXT,
    c_folder TEXT,
    c_form_if_empty TEXT,
    c_rpa_enabled INTEGER,
    c_rpa_log_enabled INTEGER,
    c_rpa_delay_delivery TEXT
);

CREATE TABLE IF NOT EXISTS g_scheme (
    c_scheme_id BIGSERIAL PRIMARY KEY,
    c_scheme_code TEXT,
    c_scheme_name TEXT,
    c_scheme_dtype_id BIGINT,
    c_scheme_type_id BIGINT,
    c_scheme_data TEXT
);

CREATE TABLE IF NOT EXISTS g_schemedatatype (
    c_scheme_type_id BIGSERIAL PRIMARY KEY,
    c_scheme_type_name TEXT
);

CREATE TABLE IF NOT EXISTS g_schemetype (
    row_id BIGSERIAL PRIMARY KEY,
    c_scheme_type_name TEXT
);

CREATE TABLE IF NOT EXISTS g_schemeusergroup (
    c_scheme_id BIGSERIAL PRIMARY KEY,
    c_ug_id BIGINT,
    c_al_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_se_tmpl (
    c_src_tmpl_id BIGSERIAL PRIMARY KEY,
    c_ml_id BIGINT,
    c_lp_id BIGINT,
    c_se_ab TEXT,
    c_se_a TEXT,
    c_se_b TEXT,
    c_se_h TEXT,
    c_se_h_per_id BIGINT,
    c_se_h_depth BIGINT,
    c_se_h_restore_depth BIGINT,
    c_se_h_restore_per_id BIGINT,
    c_se_tmpl_extend_pl TEXT,
    c_ignore_se_ab TEXT,
    c_se_tmpl_id BIGINT,
    c_mlset_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_se_tmpl_dp_sheaf (
    c_src_tmpl_id BIGSERIAL PRIMARY KEY,
    c_se_tmpl_dp_sheaf_id BIGINT,
    c_sheaf_id BIGINT,
    c_lp_id BIGINT,
    c_se_h TEXT,
    c_se_h_per_id BIGINT,
    c_se_h_depth BIGINT,
    c_se_h_restore_depth BIGINT,
    c_se_h_restore_per_id BIGINT,
    c_witheset_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_se_tmpl_dp_sheaf_lpty (
    c_se_tmpl_dp_sheaf_id BIGSERIAL PRIMARY KEY,
    c_lpty_id BIGINT,
    c_lpty_value TEXT,
    c_persistent TEXT
);

CREATE TABLE IF NOT EXISTS g_se_tmpl_dp_sheaf_ph_type (
    c_ph_type_id BIGSERIAL PRIMARY KEY,
    c_se_tmpl_id BIGINT,
    c_sep_b_lag BIGINT,
    c_sep_b_depth BIGINT,
    c_sep_b_per_id BIGINT,
    c_sep_b_sch_id BIGINT,
    c_sep_h_lag BIGINT,
    c_sep_h_depth BIGINT,
    c_sep_h_per_id BIGINT,
    c_sep_h_sch_id BIGINT,
    c_sep_f_lag BIGINT,
    c_sep_f_depth BIGINT,
    c_sep_f_per_id BIGINT,
    c_sep_f_sch_id BIGINT,
    c_sep_r_lag BIGINT,
    c_sep_r_depth BIGINT,
    c_sep_r_per_id BIGINT,
    c_sep_r_sch_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_se_tmpl_lpty (
    c_se_tmpl_id BIGSERIAL PRIMARY KEY,
    c_lpty_id BIGINT,
    c_lpty_value TEXT,
    c_persistent TEXT
);

CREATE TABLE IF NOT EXISTS g_se_tmpl_md_aggs (
    c_src_rule_id BIGSERIAL PRIMARY KEY,
    c_rule_enabled INTEGER,
    c_src_tmpl_id BIGINT,
    c_meter_type_id BIGINT,
    c_ecp_id BIGINT,
    c_point_type_id BIGINT,
    c_dev_type_id BIGINT,
    c_dp_type_id BIGINT,
    c_mou_type_id BIGINT,
    c_ppty_id BIGINT,
    c_ppty_value TEXT
);

CREATE TABLE IF NOT EXISTS g_se_tmpl_md_aggs_ph_type (
    c_ph_type_id BIGSERIAL PRIMARY KEY,
    c_se_tmpl_id BIGINT,
    c_sep_b_lag BIGINT,
    c_sep_b_depth BIGINT,
    c_sep_b_per_id BIGINT,
    c_sep_b_sch_id BIGINT,
    c_sep_h_lag BIGINT,
    c_sep_h_depth BIGINT,
    c_sep_h_per_id BIGINT,
    c_sep_h_sch_id BIGINT,
    c_sep_f_lag BIGINT,
    c_sep_f_depth BIGINT,
    c_sep_f_per_id BIGINT,
    c_sep_f_sch_id BIGINT,
    c_sep_r_lag BIGINT,
    c_sep_r_depth BIGINT,
    c_sep_r_per_id BIGINT,
    c_sep_r_sch_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_se_tmpl_ph_type (
    c_ph_type_id BIGSERIAL PRIMARY KEY,
    c_se_tmpl_id BIGINT,
    c_sep_b_lag BIGINT,
    c_sep_b_depth BIGINT,
    c_sep_b_per_id BIGINT,
    c_sep_b_sch_id BIGINT,
    c_sep_h_lag BIGINT,
    c_sep_h_depth BIGINT,
    c_sep_h_per_id BIGINT,
    c_sep_h_sch_id BIGINT,
    c_sep_f_lag BIGINT,
    c_sep_f_depth BIGINT,
    c_sep_f_per_id BIGINT,
    c_sep_f_sch_id BIGINT,
    c_sep_r_lag BIGINT,
    c_sep_r_depth BIGINT,
    c_sep_r_per_id BIGINT,
    c_sep_r_sch_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_se_tmpl_sheaf (
    c_src_tmpl_id BIGSERIAL PRIMARY KEY,
    c_se_tmpl_sheaf_id BIGINT,
    c_sheaf_id BIGINT,
    c_lp_id BIGINT,
    c_se_h TEXT,
    c_se_h_per_id BIGINT,
    c_se_h_depth BIGINT,
    c_se_h_restore_depth BIGINT,
    c_se_h_restore_per_id BIGINT,
    c_witheset_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_se_tmpl_sheaf_lpty (
    c_se_tmpl_sheaf_id BIGSERIAL PRIMARY KEY,
    c_lpty_id BIGINT,
    c_lpty_value TEXT,
    c_persistent TEXT
);

CREATE TABLE IF NOT EXISTS g_se_tmpl_sheaf_ph_type (
    c_ph_type_id BIGSERIAL PRIMARY KEY,
    c_se_tmpl_id BIGINT,
    c_sep_b_lag BIGINT,
    c_sep_b_depth BIGINT,
    c_sep_b_per_id BIGINT,
    c_sep_b_sch_id BIGINT,
    c_sep_h_lag BIGINT,
    c_sep_h_depth BIGINT,
    c_sep_h_per_id BIGINT,
    c_sep_h_sch_id BIGINT,
    c_sep_f_lag BIGINT,
    c_sep_f_depth BIGINT,
    c_sep_f_per_id BIGINT,
    c_sep_f_sch_id BIGINT,
    c_sep_r_lag BIGINT,
    c_sep_r_depth BIGINT,
    c_sep_r_per_id BIGINT,
    c_sep_r_sch_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_sep (
    c_sep_id BIGSERIAL PRIMARY KEY,
    c_sep_enabled INTEGER,
    c_sep_b_lag BIGINT,
    c_sep_b_depth BIGINT,
    c_sep_b_per_id BIGINT,
    c_sep_b_sch_id BIGINT,
    c_sep_h_lag BIGINT,
    c_sep_h_depth BIGINT,
    c_sep_h_per_id BIGINT,
    c_sep_h_sch_id BIGINT,
    c_sep_f_lag BIGINT,
    c_sep_f_depth BIGINT,
    c_sep_f_per_id BIGINT,
    c_sep_f_sch_id BIGINT,
    c_sep_r_lag BIGINT,
    c_sep_r_depth BIGINT,
    c_sep_r_per_id BIGINT,
    c_sep_r_sch_id BIGINT,
    c_sep_s_lag BIGINT,
    c_sep_s_depth BIGINT,
    c_sep_s_per_id BIGINT,
    c_sep_s_sch_id BIGINT,
    c_se_id BIGINT,
    c_sp_id BIGINT,
    c_sep_t_lag BIGINT,
    c_sep_t_depth BIGINT,
    c_sep_t_per_id BIGINT,
    c_sep_t_sch_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_sep_rc (
    c_sep_id BIGSERIAL PRIMARY KEY,
    c_rc_id BIGINT,
    c_sch_id BIGINT,
    c_per_id BIGINT,
    c_sep_rc_lag BIGINT,
    c_sep_rc_depth BIGINT
);

CREATE TABLE IF NOT EXISTS g_sep_tmpl (
    c_ph_type_id BIGSERIAL PRIMARY KEY,
    c_se_tmpl_id BIGINT,
    c_sep_b_lag BIGINT,
    c_sep_b_depth BIGINT,
    c_sep_b_per_id BIGINT,
    c_sep_b_sch_id BIGINT,
    c_sep_h_lag BIGINT,
    c_sep_h_depth BIGINT,
    c_sep_h_per_id BIGINT,
    c_sep_h_sch_id BIGINT,
    c_sep_f_lag BIGINT,
    c_sep_f_depth BIGINT,
    c_sep_f_per_id BIGINT,
    c_sep_f_sch_id BIGINT,
    c_sep_r_lag BIGINT,
    c_sep_r_depth BIGINT,
    c_sep_r_per_id BIGINT,
    c_sep_r_sch_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_sep_tmpl_dp_sheaf (
    c_ph_type_id BIGSERIAL PRIMARY KEY,
    c_se_tmpl_dp_sheaf_id BIGINT,
    c_sep_b_lag BIGINT,
    c_sep_b_depth BIGINT,
    c_sep_b_per_id BIGINT,
    c_sep_b_sch_id BIGINT,
    c_sep_h_lag BIGINT,
    c_sep_h_depth BIGINT,
    c_sep_h_per_id BIGINT,
    c_sep_h_sch_id BIGINT,
    c_sep_f_lag BIGINT,
    c_sep_f_depth BIGINT,
    c_sep_f_per_id BIGINT,
    c_sep_f_sch_id BIGINT,
    c_sep_r_lag BIGINT,
    c_sep_r_depth BIGINT,
    c_sep_r_per_id BIGINT,
    c_sep_r_sch_id BIGINT,
    c_sep_t_lag BIGINT,
    c_sep_t_depth BIGINT,
    c_sep_t_per_id BIGINT,
    c_sep_t_sch_id BIGINT,
    c_sep_s_lag BIGINT,
    c_sep_s_depth BIGINT,
    c_sep_s_per_id BIGINT,
    c_sep_s_sch_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_sep_tmpl_md_aggs (
    c_ph_type_id BIGSERIAL PRIMARY KEY,
    c_se_tmpl_id BIGINT,
    c_sep_b_lag BIGINT,
    c_sep_b_depth BIGINT,
    c_sep_b_per_id BIGINT,
    c_sep_b_sch_id BIGINT,
    c_sep_h_lag BIGINT,
    c_sep_h_depth BIGINT,
    c_sep_h_per_id BIGINT,
    c_sep_h_sch_id BIGINT,
    c_sep_f_lag BIGINT,
    c_sep_f_depth BIGINT,
    c_sep_f_per_id BIGINT,
    c_sep_f_sch_id BIGINT,
    c_sep_r_lag BIGINT,
    c_sep_r_depth BIGINT,
    c_sep_r_per_id BIGINT,
    c_sep_r_sch_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_sep_tmpl_rc (
    c_se_tmpl_id BIGSERIAL PRIMARY KEY,
    c_ph_type_id BIGINT,
    c_rc_id BIGINT,
    c_sch_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_sep_tmpl_sheaf (
    c_ph_type_id BIGSERIAL PRIMARY KEY,
    c_se_tmpl_sheaf_id BIGINT,
    c_sep_b_lag BIGINT,
    c_sep_b_depth BIGINT,
    c_sep_b_per_id BIGINT,
    c_sep_b_sch_id BIGINT,
    c_sep_h_lag BIGINT,
    c_sep_h_depth BIGINT,
    c_sep_h_per_id BIGINT,
    c_sep_h_sch_id BIGINT,
    c_sep_f_lag BIGINT,
    c_sep_f_depth BIGINT,
    c_sep_f_per_id BIGINT,
    c_sep_f_sch_id BIGINT,
    c_sep_r_lag BIGINT,
    c_sep_r_depth BIGINT,
    c_sep_r_per_id BIGINT,
    c_sep_r_sch_id BIGINT,
    c_sep_t_lag BIGINT,
    c_sep_t_depth BIGINT,
    c_sep_t_per_id BIGINT,
    c_sep_t_sch_id BIGINT,
    c_sep_s_lag BIGINT,
    c_sep_s_depth BIGINT,
    c_sep_s_per_id BIGINT,
    c_sep_s_sch_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_show (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_ml_id BIGINT,
    c_dl_type_id BIGINT,
    c_dp_type_id BIGINT,
    c_ph_type_id BIGINT,
    c_dp_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_simpleschedules (
    c_sch_id BIGSERIAL PRIMARY KEY,
    c_schi_nr BIGINT,
    c_hld_id BIGINT,
    c_sch_per_id BIGINT,
    c_sch_per_value TEXT,
    c_sch_start_per_id BIGINT,
    c_sch_repeat_per_id BIGINT,
    c_sch_repeat_per_value TEXT,
    c_sch_start_day_per_value TEXT,
    c_sch_start_per_value TEXT,
    c_wd1 TEXT,
    c_wd2 TEXT,
    c_wd3 TEXT,
    c_wd4 TEXT,
    c_wd5 TEXT,
    c_wd6 TEXT,
    c_wd7 TEXT,
    c_wd8 TEXT,
    c_wd_specific TEXT
);

CREATE TABLE IF NOT EXISTS g_sourceelementpropsa (
    c_se_id BIGSERIAL PRIMARY KEY,
    c_lpty_id BIGINT,
    c_lpty_value TEXT
);

CREATE TABLE IF NOT EXISTS g_sourceelements (
    c_src_id BIGSERIAL PRIMARY KEY,
    c_di_id BIGINT,
    c_se_ab TEXT,
    c_se_a TEXT,
    c_se_b TEXT,
    c_se_enabled INTEGER,
    c_se_forced TEXT,
    c_se_h TEXT,
    c_se_h_per_id BIGINT,
    c_se_h_depth BIGINT,
    c_se_h_bound TEXT,
    c_se_h_restore_depth BIGINT,
    c_se_h_restore_per_id BIGINT,
    c_add_sep TEXT,
    c_change_data TEXT,
    c_se_summand TEXT,
    c_change_data_bt TIMESTAMPTZ,
    c_change_data_et TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS g_sourcepropsa (
    c_src_id BIGSERIAL PRIMARY KEY,
    c_lpty_id BIGINT,
    c_lpty_value TEXT
);

CREATE TABLE IF NOT EXISTS g_sources (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_src_name TEXT,
    c_src_number TEXT,
    c_src_type_id BIGINT,
    c_dl_type_id BIGINT,
    c_src_bt TIMESTAMPTZ,
    c_src_et TIMESTAMPTZ,
    c_src_enabled INTEGER,
    c_tz_id BIGINT,
    c_src_tz_dst_used TEXT,
    c_src_save_statistics TEXT,
    c_point_id BIGINT,
    c_src_dir_inv TEXT,
    c_src_tmpl_id BIGINT,
    c_src_id BIGINT,
    c_old TEXT,
    c_delayed TEXT,
    c_ignore_existing TEXT
);

CREATE TABLE IF NOT EXISTS g_sp (
    c_ph_id BIGSERIAL PRIMARY KEY,
    c_src_id BIGINT,
    c_sp_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_sp_lpty (
    c_sp_id BIGSERIAL PRIMARY KEY,
    c_lpty_id BIGINT,
    c_lpty_value TEXT
);

CREATE TABLE IF NOT EXISTS g_specialformspoint (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_gr_id BIGINT,
    c_form TEXT,
    c_export_only_actual_pl TEXT,
    c_export_show_status_data TEXT,
    c_export_color_status_data TEXT,
    c_locale TEXT
);

CREATE TABLE IF NOT EXISTS g_src_rule (
    c_src_rule_id BIGSERIAL PRIMARY KEY,
    c_rule_enabled INTEGER,
    c_src_tmpl_id BIGINT,
    c_meter_type_id BIGINT,
    c_ecp_id BIGINT,
    c_point_type_id BIGINT,
    c_dev_type_id BIGINT,
    c_dp_type_id BIGINT,
    c_mou_type_id BIGINT,
    c_ppty_id BIGINT,
    c_ppty_value TEXT
);

CREATE TABLE IF NOT EXISTS g_src_tmpl_lpty (
    c_src_tmpl_id BIGSERIAL PRIMARY KEY,
    c_lpty_id BIGINT,
    c_lpty_value TEXT,
    c_persistent TEXT
);

CREATE TABLE IF NOT EXISTS g_src_tmpl_ph_type_lpty (
    c_src_tmpl_id BIGSERIAL PRIMARY KEY,
    c_ph_type_id BIGINT,
    c_lpty_id BIGINT,
    c_lpty_value TEXT,
    c_persistent TEXT
);

CREATE TABLE IF NOT EXISTS g_src_tmpl_report (
    c_src_id BIGSERIAL PRIMARY KEY,
    c_src_tmpl_id BIGINT,
    c_delayed TEXT
);

CREATE TABLE IF NOT EXISTS g_src_tmpl_src (
    c_src_id BIGSERIAL PRIMARY KEY,
    c_src_tmpl_id BIGINT,
    c_delayed TEXT
);

CREATE TABLE IF NOT EXISTS g_stkmsadapter (
    row_id BIGSERIAL PRIMARY KEY,
    c_uri TEXT,
    c_body TEXT,
    c_headers TEXT,
    c_params TEXT,
    c_row TEXT,
    c_func TEXT
);

CREATE TABLE IF NOT EXISTS g_substitutiontemplates (
    c_sbst_tmpl_id BIGSERIAL PRIMARY KEY,
    c_sbst_tmpl_name TEXT,
    c_sbst_tmpl_code TEXT,
    c_ml_id BIGINT,
    c_sbst_ml_id BIGINT,
    c_sbst_pl_id BIGINT,
    c_sam_id BIGINT,
    c_rel_type_id BIGINT,
    c_pos_nr BIGINT,
    c_sbst_tmpl_extend_pl TEXT,
    c_sbst_sf TEXT,
    c_sbst_ab TEXT,
    c_sbst_a TEXT,
    c_sbst_b TEXT,
    c_per_id BIGINT,
    c_sbst_lag BIGINT,
    c_sbst_improvable TEXT,
    c_sbst_fln TEXT,
    c_sbst_radius TEXT,
    c_sbst_radius_per_id BIGINT,
    c_sbst_offset TEXT,
    c_sbst_offset_per_id BIGINT,
    c_sbst_alter_read_time TIMESTAMPTZ,
    c_sbst_exclude_fln TEXT,
    c_sbst_dst_only TEXT,
    c_sbst_dst_used TEXT
);

CREATE TABLE IF NOT EXISTS g_switch_off_ph_statistics (
    c_sp_id BIGSERIAL PRIMARY KEY,
    c_ph_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_switch_off_src_statistics (
    c_sp_id BIGSERIAL PRIMARY KEY,
    c_src_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_switch_off_testmode (
    c_sp_id BIGSERIAL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS g_sysdiag (
    row_id BIGSERIAL PRIMARY KEY,
    c_depth TEXT,
    c_bc TEXT,
    c_worst_by TEXT,
    c_output_xo_type_rnk TEXT,
    c_output_cnt TEXT,
    c_output_oldness TEXT,
    c_output_prc_norm TEXT,
    c_output_prc_valid TEXT,
    c_output_prc_wo_err TEXT,
    c_output_worst TEXT,
    c_use_cache TEXT,
    c_output_line TEXT,
    c_output_link TEXT,
    c_output_ffs_rnk TEXT,
    c_max_by TEXT,
    c_output_rc_rnk TEXT,
    c_output_max TEXT,
    c_output_buf TEXT,
    c_output_bytes TEXT
);

CREATE TABLE IF NOT EXISTS g_systemprops (
    row_id BIGSERIAL PRIMARY KEY,
    c_spty_value TEXT
);

CREATE TABLE IF NOT EXISTS g_tarifflists (
    c_ml_id BIGSERIAL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS g_timeperiods (
    c_src_tmpl_id BIGSERIAL PRIMARY KEY,
    c_ml_id BIGINT,
    c_lp_id BIGINT,
    c_se_ab TEXT,
    c_se_a TEXT,
    c_se_b TEXT,
    c_se_h TEXT,
    c_se_h_per_id BIGINT,
    c_se_h_depth BIGINT,
    c_se_h_restore_depth BIGINT,
    c_se_h_restore_per_id BIGINT,
    c_se_tmpl_extend_pl TEXT,
    c_ignore_se_ab TEXT,
    c_src_id BIGINT,
    c_di_id BIGINT,
    c_se_enabled INTEGER,
    c_se_forced TEXT,
    c_se_h_bound TEXT,
    c_add_sep TEXT,
    c_xf_id BIGINT,
    c_pma_tmpl_id BIGINT,
    c_pma_tmpl_name TEXT,
    c_pma_tmpl_code TEXT,
    c_mlset_id BIGINT,
    c_sep_id BIGINT,
    c_sep_enabled INTEGER,
    c_sep_b_lag BIGINT,
    c_sep_b_depth BIGINT,
    c_sep_b_per_id BIGINT,
    c_sep_b_sch_id BIGINT,
    c_sep_h_lag BIGINT,
    c_sep_h_depth BIGINT,
    c_sep_h_per_id BIGINT,
    c_sep_h_sch_id BIGINT,
    c_sep_f_lag BIGINT,
    c_sep_f_depth BIGINT,
    c_sep_f_per_id BIGINT,
    c_sep_f_sch_id BIGINT,
    c_sep_r_lag BIGINT,
    c_sep_r_depth BIGINT,
    c_sep_r_per_id BIGINT,
    c_sep_r_sch_id BIGINT,
    c_sep_s_lag BIGINT,
    c_sep_s_depth BIGINT,
    c_sep_s_per_id BIGINT,
    c_sep_s_sch_id BIGINT,
    c_rtp_id BIGINT,
    c_rtp_ml_enabled INTEGER,
    c_per_id BIGINT,
    c_rtp_int_value TEXT
);

CREATE TABLE IF NOT EXISTS g_timezones (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_src_name TEXT,
    c_src_number TEXT,
    c_src_type_id BIGINT,
    c_dl_type_id BIGINT,
    c_src_bt TIMESTAMPTZ,
    c_src_et TIMESTAMPTZ,
    c_src_enabled INTEGER,
    c_tz_id BIGINT,
    c_src_tz_dst_used TEXT,
    c_src_save_statistics TEXT,
    c_point_id BIGINT,
    c_src_dir_inv TEXT,
    c_src_tmpl_id BIGINT,
    c_xf_id BIGINT,
    c_xa_id BIGINT,
    c_xf_name TEXT,
    c_xf_enabled INTEGER,
    c_rp_id BIGINT,
    c_src_tmpl_code TEXT,
    c_src_tmpl_name TEXT
);

CREATE TABLE IF NOT EXISTS g_ugr (
    c_ug_id BIGSERIAL PRIMARY KEY,
    c_gr_id BIGINT,
    c_algr_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_ugrole (
    c_ug_id BIGSERIAL PRIMARY KEY,
    c_gr_id BIGINT,
    c_role TEXT
);

CREATE TABLE IF NOT EXISTS g_ugroot (
    c_ug_id BIGSERIAL PRIMARY KEY,
    c_gr_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_upty (
    c_upty_id BIGSERIAL PRIMARY KEY,
    c_upty_code TEXT,
    c_upty_name TEXT,
    c_enum_id BIGINT,
    c_upty_type_id BIGINT,
    c_upty_nr BIGINT,
    c_fmt_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_usergroup (
    c_ug_type_id BIGSERIAL PRIMARY KEY,
    c_ug_name TEXT,
    c_rpa_id BIGINT,
    c_rp_id BIGINT,
    c_rpp_id BIGINT,
    c_sch_id BIGINT,
    c_rpa_name TEXT,
    c_folder TEXT,
    c_form_if_empty TEXT,
    c_rpa_enabled INTEGER,
    c_rpa_log_enabled INTEGER,
    c_rpa_delay_delivery TEXT,
    c_gr_id BIGINT,
    c_ec_in TEXT,
    c_gprc TEXT,
    c_ec_id BIGINT,
    c_gmod_id BIGINT,
    c_point_id BIGINT,
    c_sam_id BIGINT,
    c_ml_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_usergroupdata (
    c_ug_id BIGSERIAL PRIMARY KEY,
    c_user_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_usergrouptype (
    c_ug_type_id BIGSERIAL PRIMARY KEY,
    c_ug_type_name TEXT,
    c_ug_type_single_ug_mode TEXT
);

CREATE TABLE IF NOT EXISTS g_users (
    c_user_id BIGSERIAL PRIMARY KEY,
    c_user_name TEXT,
    c_user_email TEXT,
    c_user_phone TEXT,
    c_user_location TEXT,
    c_user_gsm TEXT,
    c_user_company TEXT,
    c_user_department TEXT,
    c_user_enabled INTEGER,
    c_user_deleted INTEGER,
    c_grant_revoke TEXT,
    c_role_name TEXT,
    c_user_password TEXT,
    c_user_sms_limit TEXT,
    c_inherit_ug_role TEXT,
    c_gr_remove_public INTEGER,
    c_gr_remove_private TEXT,
    c_rp_remove_public INTEGER,
    c_rp_remove_private TEXT,
    c_scheme_remove_public INTEGER,
    c_scheme_remove_private TEXT,
    c_gr_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_users_fa (
    c_dp_id BIGSERIAL PRIMARY KEY,
    c_ack_comment TEXT,
    c_src_id BIGINT,
    c_ph_id BIGINT,
    c_point_id BIGINT,
    c_gr_id BIGINT,
    c_ds_id BIGINT,
    c_rpa_id BIGINT,
    c_rp_id BIGINT,
    c_rpp_id BIGINT,
    c_sch_id BIGINT,
    c_rpa_name TEXT,
    c_folder TEXT,
    c_form_if_empty TEXT,
    c_rpa_enabled INTEGER,
    c_rpa_log_enabled INTEGER,
    c_rpa_delay_delivery TEXT
);

CREATE TABLE IF NOT EXISTS g_usersessions (
    row_id BIGSERIAL PRIMARY KEY,
    c_sid TEXT,
    c_serial TEXT
);

CREATE TABLE IF NOT EXISTS g_userviews (
    c_uv_id BIGSERIAL PRIMARY KEY,
    c_uv_name TEXT,
    c_uv_public INTEGER
);

CREATE TABLE IF NOT EXISTS g_verificationprofiledata (
    c_vp_id BIGSERIAL PRIMARY KEY,
    c_vp_nr BIGINT,
    c_aggs_type_id BIGINT,
    c_ms_id BIGINT,
    c_dir_id BIGINT,
    c_aggf_id BIGINT,
    c_tff_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_verificationprofiles (
    c_vp_id BIGSERIAL PRIMARY KEY,
    c_vp_name TEXT,
    c_vp_code TEXT,
    c_vp_bias TEXT,
    c_vp_separate_tff TEXT,
    c_vp_smallest_interval TEXT
);

CREATE TABLE IF NOT EXISTS g_verificationprofilescalar (
    c_vp_id BIGSERIAL PRIMARY KEY,
    c_aggs_type_id BIGINT,
    c_aggs_type_name TEXT,
    c_dir_id BIGINT,
    c_dir_name TEXT,
    c_ms_id BIGINT,
    c_ms_name TEXT,
    c_uid TEXT,
    c_vp_allowed_scalar_error TEXT,
    c_vp_max_scalar_error TEXT,
    c_vp_name TEXT,
    c_vp_bias TEXT,
    c_vp_code TEXT,
    c_vp_separate_tff TEXT,
    c_vp_smallest_interval TEXT
);

CREATE TABLE IF NOT EXISTS g_verificationquality (
    c_point_id BIGSERIAL PRIMARY KEY,
    c_ml_id BIGINT,
    c_gr_id BIGINT,
    c_mlset_id BIGINT,
    c_point_id_selected TEXT,
    c_month TEXT
);

CREATE TABLE IF NOT EXISTS g_vkmignore (
    c_src_type_id BIGSERIAL PRIMARY KEY,
    c_withe_id BIGINT,
    c_is_point INTEGER
);

CREATE TABLE IF NOT EXISTS g_withesetdata (
    c_witheset_id BIGSERIAL PRIMARY KEY,
    c_withe_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_withesetdatalpty (
    c_witheset_id BIGSERIAL PRIMARY KEY,
    c_withe_id BIGINT,
    c_lpty_id BIGINT,
    c_lpty_value TEXT
);

CREATE TABLE IF NOT EXISTS g_writerestrictions (
    c_pww_id BIGSERIAL PRIMARY KEY,
    c_gr_id BIGINT,
    c_witheset_id BIGINT,
    c_src_type_id BIGINT,
    c_ug_id BIGINT,
    c_pww_desc TEXT
);

CREATE TABLE IF NOT EXISTS g_xa_das (
    c_xa_id BIGSERIAL PRIMARY KEY,
    c_das_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_xa_das_frc (
    c_xa_id BIGSERIAL PRIMARY KEY,
    c_das_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_xa_das_log (
    c_xa_id BIGSERIAL PRIMARY KEY,
    c_das_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_xa_rpty (
    c_xa_id BIGSERIAL PRIMARY KEY,
    c_rpty_id BIGINT,
    c_rpty_value TEXT
);

CREATE TABLE IF NOT EXISTS g_xf (
    c_xf_type_id BIGSERIAL PRIMARY KEY,
    c_xa_id BIGINT,
    c_rpp_id BIGINT,
    c_xf_name TEXT,
    c_xf_enabled INTEGER,
    c_xf_import TEXT,
    c_rp_id BIGINT,
    c_xf_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_xf_rc (
    c_xf_id BIGSERIAL PRIMARY KEY,
    c_rc_id BIGINT,
    c_sch_id BIGINT,
    c_per_id BIGINT,
    c_xf_rc_lag BIGINT,
    c_xf_rc_depth BIGINT
);

CREATE TABLE IF NOT EXISTS g_xf_type_xfau_type (
    c_xfa_id BIGSERIAL PRIMARY KEY,
    c_point_id BIGINT,
    c_xfau_code TEXT,
    c_mlset_id BIGINT,
    c_xfau_type_id BIGINT,
    c_xfau_enabled INTEGER,
    c_inherit_cn TEXT,
    c_ignore_pl TEXT
);

CREATE TABLE IF NOT EXISTS g_xf_xpty (
    c_xf_id BIGSERIAL PRIMARY KEY,
    c_xpty_id BIGINT,
    c_xpty_value TEXT
);

CREATE TABLE IF NOT EXISTS g_xfa (
    c_xfa_id BIGSERIAL PRIMARY KEY,
    c_xf_id BIGINT,
    c_xfa_code TEXT,
    c_xfa_name TEXT,
    c_tz_id BIGINT,
    c_xfa_enabled INTEGER,
    c_xfa_tz TEXT,
    c_xfa_tz_dst_used TEXT
);

CREATE TABLE IF NOT EXISTS g_xfau (
    c_xfau_id BIGSERIAL PRIMARY KEY,
    c_xfau_enabled INTEGER,
    c_inherit_cn TEXT,
    c_xfau_code TEXT,
    c_xfau_name TEXT,
    c_xfau_code2 TEXT,
    c_xfau_name2 TEXT,
    c_xfau_type_id BIGINT,
    c_point_id BIGINT,
    c_ds_id BIGINT,
    c_gr_id BIGINT,
    c_xfa_id BIGINT,
    c_mlset_id BIGINT,
    c_ignore_pl TEXT
);

CREATE TABLE IF NOT EXISTS g_xfe (
    c_xfe_id BIGSERIAL PRIMARY KEY,
    c_xfau_id BIGINT,
    c_ml_id BIGINT,
    c_xe_id BIGINT,
    c_xfe_enabled INTEGER,
    c_xfe_info TEXT,
    c_sch_id BIGINT
);

CREATE TABLE IF NOT EXISTS g_ypty (
    c_ypty_id BIGSERIAL PRIMARY KEY,
    c_ypty_code TEXT,
    c_ypty_name TEXT,
    c_enum_id BIGINT,
    c_ypty_type_id BIGINT,
    c_ypty_nr BIGINT,
    c_fmt_id BIGINT
);

