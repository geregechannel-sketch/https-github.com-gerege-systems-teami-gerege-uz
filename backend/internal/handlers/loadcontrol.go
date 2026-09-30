package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/emcos/ec3-backend/internal/auth"
	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/jackc/pgx/v5/pgxpool"
)

// LoadControl implements relay switching and device-limit workflows.
type LoadControl struct{ pool *pgxpool.Pool }

func NewLoadControl(pool *pgxpool.Pool) *LoadControl { return &LoadControl{pool: pool} }

type loadControlQuery struct {
	PointIDs         []int64 `json:"point_ids"`
	Search           string  `json:"search"`
	ChannelType      string  `json:"channel_type"`
	ReadingPointType string  `json:"reading_point_type"`
	DataLocation     string  `json:"data_location"`
}

type loadControlCommand struct {
	IDs    []int64  `json:"ids"`
	Action string   `json:"action"`
	Value  *float64 `json:"value"`
}

func loadCommandMessage(target, action string) (string, bool) {
	relay := map[string]string{
		"ENABLE": "Команда включения выполнена", "DISABLE": "Команда отключения выполнена",
		"CANCEL": "Выполнение отменено", "READ_DB": "Состояния считаны из БД",
		"READ_DEVICE": "Состояния считаны из устройства", "STATUS": "Статусы выполнения обновлены",
		"COLLECT": "Сбор завершен",
	}
	limit := map[string]string{
		"SET": "Лимиты установлены", "INITIATE": "Запись в счетчики инициирована",
		"CANCEL": "Команда записи отменена", "READ_DB": "Лимиты считаны из БД",
		"READ_DEVICE": "Лимиты считаны из устройства", "STATUS": "Статусы выполнения обновлены",
		"COLLECT": "Сбор завершен",
	}
	if target == "RELAY" {
		message, ok := relay[action]
		return message, ok
	}
	message, ok := limit[action]
	return message, ok
}

func loadUserName(r *http.Request) string {
	claims, _ := auth.FromContext(r.Context())
	if claims == nil {
		return ""
	}
	return claims.UserName
}

// Catalog returns the point tree, filter options and counters.
func (h *LoadControl) Catalog(w http.ResponseWriter, r *http.Request) {
	groups := make([]map[string]interface{}, 0)
	rows, err := h.pool.Query(r.Context(), `SELECT gr_id,gr_code,gr_name,parent_gr_id FROM groups ORDER BY parent_gr_id NULLS FIRST,gr_name`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "load-control groups failed")
		return
	}
	for rows.Next() {
		var id int64
		var code sql.NullString
		var name string
		var parent sql.NullInt64
		if err := rows.Scan(&id, &code, &name, &parent); err != nil {
			rows.Close()
			httpx.Fail(w, http.StatusInternalServerError, "load-control groups failed")
			return
		}
		groups = append(groups, map[string]interface{}{"GR_ID": id, "GR_CODE": code.String, "GR_NAME": name, "PARENT_GR_ID": nullableInt64(parent)})
	}
	rows.Close()
	points := make([]map[string]interface{}, 0)
	pointRows, err := h.pool.Query(r.Context(), `
		SELECT p.point_id,p.point_code,p.point_name,p.gr_id,
		       (SELECT count(*) FROM load_control_relays r WHERE r.point_id=p.point_id),
		       (SELECT count(*) FROM load_control_limits l WHERE l.point_id=p.point_id)
		FROM points p
		WHERE p.point_enabled=1 AND p.point_internal=0
		ORDER BY p.point_code`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "load-control points failed")
		return
	}
	for pointRows.Next() {
		var id, relayCount, limitCount int64
		var code, name string
		var groupID sql.NullInt64
		if err := pointRows.Scan(&id, &code, &name, &groupID, &relayCount, &limitCount); err != nil {
			pointRows.Close()
			httpx.Fail(w, http.StatusInternalServerError, "load-control points failed")
			return
		}
		points = append(points, map[string]interface{}{"POINT_ID": id, "POINT_CODE": code, "POINT_NAME": name, "GR_ID": nullableInt64(groupID), "RELAYS": relayCount, "LIMITS": limitCount})
	}
	pointRows.Close()
	var relays, limits, enabledRelays int64
	if err := h.pool.QueryRow(r.Context(), `SELECT (SELECT count(*) FROM load_control_relays),(SELECT count(*) FROM load_control_limits),(SELECT count(*) FROM load_control_relays WHERE current_state=true)`).Scan(&relays, &limits, &enabledRelays); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "load-control summary failed")
		return
	}
	httpx.OK(w, map[string]interface{}{
		"groups": groups, "points": points,
		"summary": map[string]interface{}{"RELAYS": relays, "LIMITS": limits, "ENABLED_RELAYS": enabledRelays, "UPDATED_AT": time.Now()},
		"filters": map[string]interface{}{"CHANNEL_TYPES": []string{"GSM", "PLC"}, "READING_POINT_TYPES": []string{"DCU"}, "DATA_LOCATIONS": []string{"DEVICE", "DATABASE"}},
	})
}

func loadConditions(req loadControlQuery, pointColumn, searchExpr string) (string, []interface{}) {
	conditions := []string{"1=1"}
	args := make([]interface{}, 0)
	add := func(template string, value interface{}) {
		args = append(args, value)
		conditions = append(conditions, fmt.Sprintf(template, len(args)))
	}
	if len(req.PointIDs) > 0 {
		add(pointColumn+"=ANY($%d)", req.PointIDs)
	}
	if value := strings.TrimSpace(req.Search); value != "" {
		add(searchExpr+" ILIKE $%d", "%"+value+"%")
	}
	if value := strings.TrimSpace(req.ChannelType); value != "" {
		add("channel_type=$%d", value)
	}
	if value := strings.TrimSpace(req.ReadingPointType); value != "" {
		add("reading_point_type=$%d", value)
	}
	if value := strings.TrimSpace(req.DataLocation); value != "" {
		add("data_location=$%d", value)
	}
	return strings.Join(conditions, " AND "), args
}

func (h *LoadControl) Relays(w http.ResponseWriter, r *http.Request) {
	var req loadControlQuery
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	where, args := loadConditions(req, "r.point_id", "concat_ws(' ',p.point_code,p.point_name,r.relay_code,r.relay_name)")
	rows, err := h.pool.Query(r.Context(), `
		SELECT r.relay_id,p.point_id,p.point_code,p.point_name,r.relay_code,r.relay_name,
		       r.current_state,r.command_status,r.db_state,r.db_at,r.device_state,r.device_at,
		       r.desired_state,r.channel_type,r.reading_point_type,r.data_location,r.enabled
		FROM load_control_relays r JOIN points p ON p.point_id=r.point_id WHERE `+where+`
		ORDER BY p.point_code,r.relay_code`, args...)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "relay query failed")
		return
	}
	defer rows.Close()
	data := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id, pointID int64
		var pointCode, pointName, code, name, status, channel, pointType, location string
		var current, desired, dbState, deviceState sql.NullBool
		var dbAt, deviceAt sql.NullTime
		var enabled bool
		if err := rows.Scan(&id, &pointID, &pointCode, &pointName, &code, &name, &current, &status, &dbState, &dbAt, &deviceState, &deviceAt, &desired, &channel, &pointType, &location, &enabled); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "relay query failed")
			return
		}
		data = append(data, map[string]interface{}{
			"RELAY_ID": id, "POINT_ID": pointID, "POINT_CODE": pointCode, "POINT_NAME": pointName,
			"RELAY_CODE": code, "RELAY_NAME": name, "CURRENT_STATE": loadNullableBool(current),
			"COMMAND_STATUS": status, "DB_STATE": loadNullableBool(dbState), "DB_AT": loadNullableTime(dbAt),
			"DEVICE_STATE": loadNullableBool(deviceState), "DEVICE_AT": loadNullableTime(deviceAt),
			"DESIRED_STATE": loadNullableBool(desired), "CHANNEL_TYPE": channel,
			"READING_POINT_TYPE": pointType, "DATA_LOCATION": location, "ENABLED": enabled,
		})
	}
	httpx.OKList(w, data, int64(len(data)))
}

func (h *LoadControl) Limits(w http.ResponseWriter, r *http.Request) {
	var req loadControlQuery
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	where, args := loadConditions(req, "l.point_id", "concat_ws(' ',p.point_code,p.point_name,l.parameter_code,l.parameter_name)")
	rows, err := h.pool.Query(r.Context(), `
		SELECT l.limit_id,p.point_id,p.point_code,p.point_name,l.parameter_code,l.parameter_name,
		       l.limit_value,l.unit,l.command_status,l.data_source,l.channel_type,
		       l.reading_point_type,l.data_location,l.updated_at
		FROM load_control_limits l JOIN points p ON p.point_id=l.point_id WHERE `+where+`
		ORDER BY p.point_code,l.parameter_code`, args...)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "limit query failed")
		return
	}
	defer rows.Close()
	data := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id, pointID int64
		var pointCode, pointName, code, name, unit, status, source, channel, pointType, location string
		var value float64
		var updated time.Time
		if err := rows.Scan(&id, &pointID, &pointCode, &pointName, &code, &name, &value, &unit, &status, &source, &channel, &pointType, &location, &updated); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "limit query failed")
			return
		}
		data = append(data, map[string]interface{}{
			"LIMIT_ID": id, "POINT_ID": pointID, "POINT_CODE": pointCode, "POINT_NAME": pointName,
			"PARAMETER_CODE": code, "PARAMETER_NAME": name, "LIMIT_VALUE": value, "UNIT": unit,
			"COMMAND_STATUS": status, "DATA_SOURCE": source, "CHANNEL_TYPE": channel,
			"READING_POINT_TYPE": pointType, "DATA_LOCATION": location, "UPDATED_AT": updated,
		})
	}
	httpx.OKList(w, data, int64(len(data)))
}

func (h *LoadControl) RelayCommand(w http.ResponseWriter, r *http.Request) {
	var req loadControlCommand
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.IDs) == 0 {
		httpx.Fail(w, http.StatusBadRequest, "relay ids are required")
		return
	}
	action := strings.ToUpper(strings.TrimSpace(req.Action))
	message, ok := loadCommandMessage("RELAY", action)
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "unsupported relay command")
		return
	}
	query := `UPDATE load_control_relays SET command_status='COMPLETED',updated_at=now() WHERE relay_id=ANY($1)`
	switch action {
	case "ENABLE":
		query = `UPDATE load_control_relays SET current_state=true,desired_state=true,db_state=true,device_state=true,command_status='COMPLETED',db_at=now(),device_at=now(),updated_at=now() WHERE relay_id=ANY($1)`
	case "DISABLE":
		query = `UPDATE load_control_relays SET current_state=false,desired_state=false,db_state=false,device_state=false,command_status='COMPLETED',db_at=now(),device_at=now(),updated_at=now() WHERE relay_id=ANY($1)`
	case "CANCEL":
		query = `UPDATE load_control_relays SET desired_state=current_state,command_status='CANCELLED',updated_at=now() WHERE relay_id=ANY($1)`
	case "READ_DB":
		query = `UPDATE load_control_relays SET current_state=db_state,command_status='COMPLETED',db_at=now(),updated_at=now() WHERE relay_id=ANY($1)`
	case "READ_DEVICE", "COLLECT":
		query = `UPDATE load_control_relays SET current_state=device_state,db_state=device_state,command_status='COMPLETED',db_at=now(),device_at=now(),updated_at=now() WHERE relay_id=ANY($1)`
	}
	result, err := h.pool.Exec(r.Context(), query, req.IDs)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "relay command failed")
		return
	}
	if result.RowsAffected() == 0 {
		httpx.Fail(w, http.StatusNotFound, "relays not found")
		return
	}
	_, _ = h.pool.Exec(r.Context(), `INSERT INTO load_control_commands (target_type,target_id,action,requested_by,status,message,finished_at) SELECT 'RELAY',unnest($1::bigint[]),$2,$3,'COMPLETED',$4,now()`, req.IDs, action, loadUserName(r), message)
	httpx.OK(w, map[string]interface{}{"ACTION": action, "UPDATED": result.RowsAffected(), "MESSAGE": message})
}

func (h *LoadControl) LimitCommand(w http.ResponseWriter, r *http.Request) {
	var req loadControlCommand
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.IDs) == 0 {
		httpx.Fail(w, http.StatusBadRequest, "limit ids are required")
		return
	}
	action := strings.ToUpper(strings.TrimSpace(req.Action))
	message, ok := loadCommandMessage("LIMIT", action)
	if !ok || (action == "SET" && req.Value == nil) {
		httpx.Fail(w, http.StatusBadRequest, "unsupported limit command")
		return
	}
	var updated int64
	var err error
	if action == "SET" {
		commandTag, execErr := h.pool.Exec(r.Context(), `UPDATE load_control_limits SET limit_value=$2,command_status='COMPLETED',data_source='OPERATOR',updated_at=now() WHERE limit_id=ANY($1)`, req.IDs, *req.Value)
		if execErr != nil {
			err = execErr
		} else {
			updated = commandTag.RowsAffected()
		}
	} else {
		status := "COMPLETED"
		if action == "CANCEL" {
			status = "CANCELLED"
		}
		commandTag, execErr := h.pool.Exec(r.Context(), `UPDATE load_control_limits SET command_status=$2,data_source=CASE WHEN $3='READ_DEVICE' THEN 'DEVICE' WHEN $3='READ_DB' THEN 'DATABASE' ELSE data_source END,updated_at=now() WHERE limit_id=ANY($1)`, req.IDs, status, action)
		if execErr != nil {
			err = execErr
		} else {
			updated = commandTag.RowsAffected()
		}
	}
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "limit command failed")
		return
	}
	if updated == 0 {
		httpx.Fail(w, http.StatusNotFound, "limits not found")
		return
	}
	_, _ = h.pool.Exec(r.Context(), `INSERT INTO load_control_commands (target_type,target_id,action,requested_by,status,message,finished_at) SELECT 'LIMIT',unnest($1::bigint[]),$2,$3,'COMPLETED',$4,now()`, req.IDs, action, loadUserName(r), message)
	httpx.OK(w, map[string]interface{}{"ACTION": action, "UPDATED": updated, "MESSAGE": message})
}

func loadNullableBool(value sql.NullBool) interface{} {
	if !value.Valid {
		return nil
	}
	return value.Bool
}

func loadNullableTime(value sql.NullTime) interface{} {
	if !value.Valid {
		return nil
	}
	return value.Time
}
