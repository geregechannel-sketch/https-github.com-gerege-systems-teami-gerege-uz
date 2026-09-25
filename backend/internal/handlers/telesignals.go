package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/emcos/ec3-backend/internal/auth"
	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Telesignals implements the signal registry, history and operator controls.
type Telesignals struct{ pool *pgxpool.Pool }

func NewTelesignals(pool *pgxpool.Pool) *Telesignals { return &Telesignals{pool: pool} }

type signalRequest struct {
	Name            string `json:"name"`
	Code            string `json:"code"`
	TypeID          int64  `json:"type_id"`
	PointID         *int64 `json:"point_id"`
	ObjectName      string `json:"object_name"`
	Enabled         *bool  `json:"enabled"`
	EventLog        bool   `json:"event_log"`
	Realtime        bool   `json:"realtime"`
	Binary          bool   `json:"binary"`
	AutoRead        bool   `json:"auto_read"`
	PriorityProfile string `json:"priority_profile"`
	GroupName       string `json:"group_name"`
	CurrentValue    string `json:"current_value"`
}

type signalTypeRequest struct {
	Name     string `json:"name"`
	Code     string `json:"code"`
	ValueOff string `json:"value_off"`
	ValueOn  string `json:"value_on"`
	EventLog bool   `json:"event_log"`
	Realtime bool   `json:"realtime"`
	Binary   bool   `json:"binary"`
}

type signalHistoryRequest struct {
	SignalIDs       []int64 `json:"signal_ids"`
	From            string  `json:"from"`
	To              string  `json:"to"`
	TransitionsOnly bool    `json:"transitions_only"`
	Limit           int     `json:"limit"`
}

type signalValueRequest struct {
	SignalID int64  `json:"signal_id"`
	Value    string `json:"value"`
	Comment  string `json:"comment"`
	Source   string `json:"source"`
}

type signalStateRequest struct {
	Blocked *bool  `json:"blocked"`
	Comment string `json:"comment"`
}

type signalCommandRequest struct {
	Action string `json:"action"`
}

type signalHistoryUpdateRequest struct {
	Comment string `json:"comment"`
	Ignored *bool  `json:"ignored"`
}

type signalRuleRequest struct {
	RuleType     string `json:"rule_type"`
	SignalTypeID int64  `json:"signal_type_id"`
	GroupID      int64  `json:"group_id"`
	FillBy       string `json:"fill_by"`
	Enabled      *bool  `json:"enabled"`
}

func signalBool(value *bool, fallback bool) bool {
	if value == nil {
		return fallback
	}
	return *value
}

func parseSignalID(r *http.Request, name string) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue(name), 10, 64)
	return id, err == nil && id > 0
}

func signalTimeRange(fromRaw, toRaw string) (time.Time, time.Time, bool) {
	loc := time.FixedZone("Asia/Ulaanbaatar", 8*60*60)
	parse := func(value string, end bool) (time.Time, bool) {
		value = strings.TrimSpace(value)
		for _, layout := range []string{time.RFC3339, "2006-01-02 15:04:05", "2006-01-02", "02-01-2006 15:04:05", "02-01-2006"} {
			if parsed, err := time.ParseInLocation(layout, value, loc); err == nil {
				if end && (layout == "2006-01-02" || layout == "02-01-2006") {
					parsed = parsed.Add(24*time.Hour - time.Nanosecond)
				}
				return parsed, true
			}
		}
		return time.Time{}, false
	}
	from, fromOK := parse(fromRaw, false)
	to, toOK := parse(toRaw, true)
	if !fromOK || !toOK {
		return time.Time{}, time.Time{}, false
	}
	if from.After(to) {
		from, to = to, from
	}
	if to.Sub(from) > 366*24*time.Hour {
		from = to.Add(-366 * 24 * time.Hour)
	}
	return from, to, true
}

const signalSelect = `
	SELECT s.signal_id, s.object_name, s.signal_name, s.signal_code,
	       s.point_id, COALESCE(p.point_name,''), COALESCE(p.point_code,''),
	       s.signal_type_id, st.type_name, st.type_code,
	       s.enabled, s.current_value,
	       CASE WHEN s.current_value='1' THEN st.value_on ELSE st.value_off END,
	       s.switched_at, s.auto_read, s.event_log, s.priority_profile,
	       s.realtime, s.is_binary, s.blocked, s.block_comment, s.group_name
	FROM tele_signals s
	JOIN signal_types st ON st.signal_type_id=s.signal_type_id
	LEFT JOIN points p ON p.point_id=s.point_id`

func scanSignal(scanner interface{ Scan(...interface{}) error }) (map[string]interface{}, error) {
	var id, typeID int64
	var pointID sql.NullInt64
	var objectName, name, code, pointName, pointCode, typeName, typeCode string
	var current, displayValue, priority, blockComment, groupName string
	var enabled, autoRead, eventLog, realtime, binary, blocked bool
	var switched time.Time
	err := scanner.Scan(&id, &objectName, &name, &code, &pointID, &pointName, &pointCode,
		&typeID, &typeName, &typeCode, &enabled, &current, &displayValue, &switched,
		&autoRead, &eventLog, &priority, &realtime, &binary, &blocked, &blockComment, &groupName)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"SIGNAL_ID": id, "OBJECT_NAME": objectName, "SIGNAL_NAME": name,
		"SIGNAL_CODE": code, "POINT_ID": nullableInt64(pointID), "POINT_NAME": pointName,
		"POINT_CODE": pointCode, "SIGNAL_TYPE_ID": typeID, "TYPE_NAME": typeName,
		"TYPE_CODE": typeCode, "ENABLED": enabled, "CURRENT_VALUE": current,
		"DISPLAY_VALUE": displayValue, "SWITCHED_AT": switched, "AUTO_READ": autoRead,
		"EVENT_LOG": eventLog, "PRIORITY_PROFILE": priority, "REALTIME": realtime,
		"BINARY": binary, "BLOCKED": blocked, "BLOCK_COMMENT": blockComment,
		"GROUP_NAME": groupName,
	}, nil
}

// Catalog returns the overview counters and object tree used by both screens.
func (h *Telesignals) Catalog(w http.ResponseWriter, r *http.Request) {
	var points, readingPoints, activeSignals, realtimeSignals, blocked int64
	err := h.pool.QueryRow(r.Context(), `
		SELECT (SELECT count(*) FROM points WHERE point_enabled=1),
		       (SELECT count(*) FROM points WHERE point_enabled=1 AND point_auto_read_enabled=1),
		       count(*) FILTER (WHERE enabled),
		       count(*) FILTER (WHERE enabled AND realtime),
		       count(*) FILTER (WHERE blocked)
		FROM tele_signals`).Scan(&points, &readingPoints, &activeSignals, &realtimeSignals, &blocked)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal summary failed")
		return
	}
	groups := make([]map[string]interface{}, 0)
	rows, err := h.pool.Query(r.Context(), `SELECT gr_id, gr_code, gr_name, parent_gr_id FROM groups ORDER BY parent_gr_id NULLS FIRST, gr_name`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal groups failed")
		return
	}
	for rows.Next() {
		var id int64
		var code sql.NullString
		var name string
		var parent sql.NullInt64
		if err := rows.Scan(&id, &code, &name, &parent); err != nil {
			rows.Close()
			httpx.Fail(w, http.StatusInternalServerError, "signal groups failed")
			return
		}
		groups = append(groups, map[string]interface{}{"GR_ID": id, "GR_CODE": code.String, "GR_NAME": name, "PARENT_GR_ID": nullableInt64(parent)})
	}
	rows.Close()
	pointRows, err := h.pool.Query(r.Context(), `SELECT point_id, point_code, point_name, gr_id FROM points WHERE point_enabled=1 ORDER BY point_code`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal points failed")
		return
	}
	pointsData := make([]map[string]interface{}, 0)
	for pointRows.Next() {
		var id int64
		var code, name string
		var groupID sql.NullInt64
		if err := pointRows.Scan(&id, &code, &name, &groupID); err != nil {
			pointRows.Close()
			httpx.Fail(w, http.StatusInternalServerError, "signal points failed")
			return
		}
		pointsData = append(pointsData, map[string]interface{}{"POINT_ID": id, "POINT_CODE": code, "POINT_NAME": name, "GR_ID": nullableInt64(groupID)})
	}
	pointRows.Close()
	types, err := h.listTypes(r.Context())
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal types failed")
		return
	}
	availability := 100.0
	if activeSignals > 0 {
		availability = float64(realtimeSignals) * 100 / float64(activeSignals)
	}
	httpx.OK(w, map[string]interface{}{
		"summary": map[string]interface{}{"POINTS": points, "READING_POINTS": readingPoints, "ACTIVE_SIGNALS": activeSignals, "BLOCKED": blocked, "CHANNEL_AVAILABILITY": availability, "UPDATED_AT": time.Now()},
		"groups":  groups, "points": pointsData, "types": types,
	})
}

// List returns a pageable signal registry with source-shaped columns.
func (h *Telesignals) List(w http.ResponseWriter, r *http.Request) {
	conditions := []string{"1=1"}
	args := []interface{}{}
	add := func(template string, value interface{}) {
		args = append(args, value)
		conditions = append(conditions, fmt.Sprintf(template, len(args)))
	}
	if value := strings.TrimSpace(r.URL.Query().Get("search")); value != "" {
		add("concat_ws(' ',s.signal_name,s.signal_code,s.object_name,p.point_name,p.point_code,st.type_name) ILIKE $%d", "%"+value+"%")
	}
	if value, err := strconv.ParseInt(r.URL.Query().Get("type_id"), 10, 64); err == nil && value > 0 {
		add("s.signal_type_id=$%d", value)
	}
	if value := strings.TrimSpace(r.URL.Query().Get("enabled")); value == "true" || value == "false" {
		add("s.enabled=$%d", value == "true")
	}
	where := strings.Join(conditions, " AND ")
	var total int64
	if err := h.pool.QueryRow(r.Context(), `SELECT count(*) FROM tele_signals s JOIN signal_types st ON st.signal_type_id=s.signal_type_id LEFT JOIN points p ON p.point_id=s.point_id WHERE `+where, args...).Scan(&total); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal count failed")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 500 {
		limit = 50
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}
	queryArgs := append(append([]interface{}{}, args...), limit, offset)
	query := signalSelect + " WHERE " + where + fmt.Sprintf(" ORDER BY s.signal_code LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	rows, err := h.pool.Query(r.Context(), query, queryArgs...)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal query failed")
		return
	}
	defer rows.Close()
	data := make([]map[string]interface{}, 0)
	for rows.Next() {
		item, err := scanSignal(rows)
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "signal scan failed")
			return
		}
		data = append(data, item)
	}
	httpx.OKList(w, data, total)
}

func (h *Telesignals) Get(w http.ResponseWriter, r *http.Request) {
	id, ok := parseSignalID(r, "id")
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid signal id")
		return
	}
	item, err := scanSignal(h.pool.QueryRow(r.Context(), signalSelect+" WHERE s.signal_id=$1", id))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Fail(w, http.StatusNotFound, "signal not found")
		return
	}
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal lookup failed")
		return
	}
	httpx.OK(w, item)
}

func (h *Telesignals) Create(w http.ResponseWriter, r *http.Request) {
	var req signalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Code) == "" || req.TypeID <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "name, code and type are required")
		return
	}
	value := strings.TrimSpace(req.CurrentValue)
	if value == "" {
		value = "0"
	}
	var id int64
	err := h.pool.QueryRow(r.Context(), `
		INSERT INTO tele_signals
		(signal_name,signal_code,signal_type_id,point_id,object_name,enabled,event_log,realtime,is_binary,auto_read,priority_profile,group_name,current_value)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING signal_id`,
		strings.TrimSpace(req.Name), strings.TrimSpace(req.Code), req.TypeID, req.PointID,
		firstNonEmpty(strings.TrimSpace(req.ObjectName), "TOSH ELECTROAPPARAT"), signalBool(req.Enabled, true),
		req.EventLog, req.Realtime, req.Binary, req.AutoRead,
		firstNonEmpty(strings.TrimSpace(req.PriorityProfile), "Стандартный"),
		firstNonEmpty(strings.TrimSpace(req.GroupName), "Основные сигналы"), value).Scan(&id)
	if err != nil {
		httpx.Fail(w, http.StatusConflict, "signal code already exists or references are invalid")
		return
	}
	_, _ = h.pool.Exec(r.Context(), `
		INSERT INTO signal_history (signal_id,signal_value,display_value,source,comment)
		SELECT s.signal_id,$2,CASE WHEN $2='1' THEN st.value_on ELSE st.value_off END,'OPERATOR','Начальное значение'
		FROM tele_signals s JOIN signal_types st ON st.signal_type_id=s.signal_type_id WHERE s.signal_id=$1`, id, value)
	httpx.OK(w, map[string]interface{}{"SIGNAL_ID": id})
}

func (h *Telesignals) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := parseSignalID(r, "id")
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid signal id")
		return
	}
	var req signalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Code) == "" || req.TypeID <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "name, code and type are required")
		return
	}
	result, err := h.pool.Exec(r.Context(), `
		UPDATE tele_signals SET signal_name=$2,signal_code=$3,signal_type_id=$4,point_id=$5,
		object_name=$6,enabled=$7,event_log=$8,realtime=$9,is_binary=$10,auto_read=$11,
		priority_profile=$12,group_name=$13,updated_at=now() WHERE signal_id=$1`, id,
		strings.TrimSpace(req.Name), strings.TrimSpace(req.Code), req.TypeID, req.PointID,
		firstNonEmpty(strings.TrimSpace(req.ObjectName), "TOSH ELECTROAPPARAT"), signalBool(req.Enabled, true),
		req.EventLog, req.Realtime, req.Binary, req.AutoRead,
		firstNonEmpty(strings.TrimSpace(req.PriorityProfile), "Стандартный"),
		firstNonEmpty(strings.TrimSpace(req.GroupName), "Основные сигналы"))
	if err != nil {
		httpx.Fail(w, http.StatusConflict, "signal update failed")
		return
	}
	if result.RowsAffected() == 0 {
		httpx.Fail(w, http.StatusNotFound, "signal not found")
		return
	}
	httpx.OK(w, map[string]interface{}{"SIGNAL_ID": id})
}

func (h *Telesignals) Delete(w http.ResponseWriter, r *http.Request) {
	id, ok := parseSignalID(r, "id")
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid signal id")
		return
	}
	result, err := h.pool.Exec(r.Context(), `DELETE FROM tele_signals WHERE signal_id=$1`, id)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal delete failed")
		return
	}
	if result.RowsAffected() == 0 {
		httpx.Fail(w, http.StatusNotFound, "signal not found")
		return
	}
	httpx.OK(w, map[string]interface{}{"SIGNAL_ID": id})
}

func (h *Telesignals) listTypes(ctx context.Context) ([]map[string]interface{}, error) {
	rows, err := h.pool.Query(ctx, `SELECT signal_type_id,type_code,type_name,value_off,value_on,event_log,realtime,is_binary FROM signal_types ORDER BY type_name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	data := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int64
		var code, name, off, on string
		var eventLog, realtime, binary bool
		if err := rows.Scan(&id, &code, &name, &off, &on, &eventLog, &realtime, &binary); err != nil {
			return nil, err
		}
		data = append(data, map[string]interface{}{"SIGNAL_TYPE_ID": id, "TYPE_CODE": code, "TYPE_NAME": name, "VALUE_OFF": off, "VALUE_ON": on, "EVENT_LOG": eventLog, "REALTIME": realtime, "BINARY": binary})
	}
	return data, rows.Err()
}

func (h *Telesignals) Types(w http.ResponseWriter, r *http.Request) {
	data, err := h.listTypes(r.Context())
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal types failed")
		return
	}
	httpx.OKList(w, data, int64(len(data)))
}

func (h *Telesignals) CreateType(w http.ResponseWriter, r *http.Request) {
	var req signalTypeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Code) == "" {
		httpx.Fail(w, http.StatusBadRequest, "type name and code are required")
		return
	}
	var id int64
	err := h.pool.QueryRow(r.Context(), `INSERT INTO signal_types (type_code,type_name,value_off,value_on,event_log,realtime,is_binary) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING signal_type_id`,
		strings.ToUpper(strings.TrimSpace(req.Code)), strings.TrimSpace(req.Name), firstNonEmpty(req.ValueOff, "Нет"), firstNonEmpty(req.ValueOn, "Да"), req.EventLog, req.Realtime, req.Binary).Scan(&id)
	if err != nil {
		httpx.Fail(w, http.StatusConflict, "signal type code already exists")
		return
	}
	httpx.OK(w, map[string]interface{}{"SIGNAL_TYPE_ID": id})
}

func (h *Telesignals) UpdateType(w http.ResponseWriter, r *http.Request) {
	id, ok := parseSignalID(r, "id")
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid signal type id")
		return
	}
	var req signalTypeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Code) == "" {
		httpx.Fail(w, http.StatusBadRequest, "type name and code are required")
		return
	}
	result, err := h.pool.Exec(r.Context(), `UPDATE signal_types SET type_code=$2,type_name=$3,value_off=$4,value_on=$5,event_log=$6,realtime=$7,is_binary=$8 WHERE signal_type_id=$1`,
		id, strings.ToUpper(strings.TrimSpace(req.Code)), strings.TrimSpace(req.Name), firstNonEmpty(req.ValueOff, "Нет"), firstNonEmpty(req.ValueOn, "Да"), req.EventLog, req.Realtime, req.Binary)
	if err != nil {
		httpx.Fail(w, http.StatusConflict, "signal type update failed")
		return
	}
	if result.RowsAffected() == 0 {
		httpx.Fail(w, http.StatusNotFound, "signal type not found")
		return
	}
	httpx.OK(w, map[string]interface{}{"SIGNAL_TYPE_ID": id})
}

func (h *Telesignals) DeleteType(w http.ResponseWriter, r *http.Request) {
	id, ok := parseSignalID(r, "id")
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid signal type id")
		return
	}
	result, err := h.pool.Exec(r.Context(), `DELETE FROM signal_types WHERE signal_type_id=$1`, id)
	if err != nil {
		httpx.Fail(w, http.StatusConflict, "signal type is in use")
		return
	}
	if result.RowsAffected() == 0 {
		httpx.Fail(w, http.StatusNotFound, "signal type not found")
		return
	}
	httpx.OK(w, map[string]interface{}{"SIGNAL_TYPE_ID": id})
}

// History returns signal changes for the selected object tree nodes.
func (h *Telesignals) History(w http.ResponseWriter, r *http.Request) {
	var req signalHistoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	from, to, ok := signalTimeRange(req.From, req.To)
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid signal interval")
		return
	}
	if len(req.SignalIDs) == 0 {
		httpx.OKList(w, []interface{}{}, 0)
		return
	}
	limit := req.Limit
	if limit <= 0 || limit > 2000 {
		limit = 500
	}
	rows, err := h.pool.Query(r.Context(), `
		SELECT h.history_id,h.signal_id,s.signal_name,s.signal_code,h.recorded_at,
		       h.signal_value,h.display_value,h.source,h.comment,h.ignored,s.blocked
		FROM signal_history h JOIN tele_signals s ON s.signal_id=h.signal_id
		WHERE h.signal_id=ANY($1) AND h.recorded_at >= $2 AND h.recorded_at <= $3
		ORDER BY h.signal_id,h.recorded_at DESC LIMIT $4`, req.SignalIDs, from, to, limit)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal history failed")
		return
	}
	defer rows.Close()
	data := make([]map[string]interface{}, 0)
	lastValue := map[int64]string{}
	for rows.Next() {
		var historyID, signalID int64
		var name, code, value, display, source, comment string
		var recorded time.Time
		var ignored, blocked bool
		if err := rows.Scan(&historyID, &signalID, &name, &code, &recorded, &value, &display, &source, &comment, &ignored, &blocked); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "signal history scan failed")
			return
		}
		if req.TransitionsOnly && lastValue[signalID] == value {
			continue
		}
		lastValue[signalID] = value
		data = append(data, map[string]interface{}{"HISTORY_ID": historyID, "SIGNAL_ID": signalID, "SIGNAL_NAME": name, "SIGNAL_CODE": code, "RECORDED_AT": recorded, "SIGNAL_VALUE": value, "DISPLAY_VALUE": display, "SOURCE": source, "COMMENT": comment, "IGNORED": ignored, "BLOCKED": blocked})
	}
	httpx.OKList(w, data, int64(len(data)))
}

func (h *Telesignals) AddHistory(w http.ResponseWriter, r *http.Request) {
	var req signalValueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.SignalID <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "signal and value are required")
		return
	}
	var blocked bool
	var displayValue string
	err := h.pool.QueryRow(r.Context(), `
		SELECT s.blocked, CASE WHEN $2='1' THEN st.value_on ELSE st.value_off END
		FROM tele_signals s JOIN signal_types st ON st.signal_type_id=s.signal_type_id
		WHERE s.signal_id=$1`, req.SignalID, req.Value).Scan(&blocked, &displayValue)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Fail(w, http.StatusNotFound, "signal not found")
		return
	}
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal lookup failed")
		return
	}
	if blocked {
		httpx.Fail(w, http.StatusConflict, "signal is blocked")
		return
	}
	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal update failed")
		return
	}
	defer tx.Rollback(r.Context())
	var historyID int64
	err = tx.QueryRow(r.Context(), `INSERT INTO signal_history (signal_id,signal_value,display_value,source,comment) VALUES ($1,$2,$3,$4,$5) RETURNING history_id`,
		req.SignalID, req.Value, displayValue, firstNonEmpty(strings.ToUpper(strings.TrimSpace(req.Source)), "OPERATOR"), strings.TrimSpace(req.Comment)).Scan(&historyID)
	if err == nil {
		_, err = tx.Exec(r.Context(), `UPDATE tele_signals SET current_value=$2,switched_at=now(),updated_at=now() WHERE signal_id=$1`, req.SignalID, req.Value)
	}
	if err != nil || tx.Commit(r.Context()) != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal update failed")
		return
	}
	httpx.OK(w, map[string]interface{}{"HISTORY_ID": historyID, "DISPLAY_VALUE": displayValue})
}

func (h *Telesignals) UpdateHistory(w http.ResponseWriter, r *http.Request) {
	id, ok := parseSignalID(r, "id")
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid history id")
		return
	}
	var req signalHistoryUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	ignored := false
	if req.Ignored != nil {
		ignored = *req.Ignored
	} else {
		_ = h.pool.QueryRow(r.Context(), `SELECT ignored FROM signal_history WHERE history_id=$1`, id).Scan(&ignored)
	}
	result, err := h.pool.Exec(r.Context(), `UPDATE signal_history SET comment=$2,ignored=$3 WHERE history_id=$1`, id, strings.TrimSpace(req.Comment), ignored)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal history update failed")
		return
	}
	if result.RowsAffected() == 0 {
		httpx.Fail(w, http.StatusNotFound, "signal history not found")
		return
	}
	httpx.OK(w, map[string]interface{}{"HISTORY_ID": id})
}

func (h *Telesignals) State(w http.ResponseWriter, r *http.Request) {
	id, ok := parseSignalID(r, "id")
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid signal id")
		return
	}
	var req signalStateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Blocked == nil {
		httpx.Fail(w, http.StatusBadRequest, "blocked is required")
		return
	}
	result, err := h.pool.Exec(r.Context(), `UPDATE tele_signals SET blocked=$2,block_comment=$3,updated_at=now() WHERE signal_id=$1`, id, *req.Blocked, strings.TrimSpace(req.Comment))
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal state update failed")
		return
	}
	if result.RowsAffected() == 0 {
		httpx.Fail(w, http.StatusNotFound, "signal not found")
		return
	}
	httpx.OK(w, map[string]interface{}{"SIGNAL_ID": id, "BLOCKED": *req.Blocked})
}

func (h *Telesignals) Command(w http.ResponseWriter, r *http.Request) {
	id, ok := parseSignalID(r, "id")
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid signal id")
		return
	}
	var req signalCommandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	action := strings.ToUpper(strings.TrimSpace(req.Action))
	messages := map[string]string{"SEND": "Команда отправлена", "DEVICE": "Значение получено с устройства", "REBUILD": "Пересбор выполнен", "COLLECT": "Сбор завершен"}
	message, valid := messages[action]
	if !valid {
		httpx.Fail(w, http.StatusBadRequest, "unsupported signal command")
		return
	}
	var exists bool
	if err := h.pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM tele_signals WHERE signal_id=$1)`, id).Scan(&exists); err != nil || !exists {
		httpx.Fail(w, http.StatusNotFound, "signal not found")
		return
	}
	claims, _ := auth.FromContext(r.Context())
	requestedBy := ""
	if claims != nil {
		requestedBy = claims.UserName
	}
	var commandID int64
	err := h.pool.QueryRow(r.Context(), `INSERT INTO signal_commands (signal_id,command_code,status,requested_by,message,finished_at) VALUES ($1,$2,'COMPLETED',$3,$4,now()) RETURNING command_id`, id, action, requestedBy, message).Scan(&commandID)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal command failed")
		return
	}
	httpx.OK(w, map[string]interface{}{"COMMAND_ID": commandID, "STATUS": "COMPLETED", "MESSAGE": message})
}

func (h *Telesignals) Rules(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(), `SELECT r.rule_id,r.rule_type,r.signal_type_id,st.type_name,r.group_id,g.gr_name,r.fill_by,r.enabled FROM signal_fill_rules r LEFT JOIN signal_types st ON st.signal_type_id=r.signal_type_id LEFT JOIN groups g ON g.gr_id=r.group_id ORDER BY r.rule_id`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal rules failed")
		return
	}
	defer rows.Close()
	data := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int64
		var ruleType, fillBy string
		var typeID, groupID sql.NullInt64
		var typeName, groupName sql.NullString
		var enabled bool
		if err := rows.Scan(&id, &ruleType, &typeID, &typeName, &groupID, &groupName, &fillBy, &enabled); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "signal rules failed")
			return
		}
		data = append(data, map[string]interface{}{"RULE_ID": id, "RULE_TYPE": ruleType, "SIGNAL_TYPE_ID": nullableInt64(typeID), "TYPE_NAME": typeName.String, "GROUP_ID": nullableInt64(groupID), "GROUP_NAME": groupName.String, "FILL_BY": fillBy, "ENABLED": enabled})
	}
	httpx.OKList(w, data, int64(len(data)))
}

func (h *Telesignals) CreateRule(w http.ResponseWriter, r *http.Request) {
	var req signalRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.SignalTypeID <= 0 || req.GroupID <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "signal type and group are required")
		return
	}
	enabled := signalBool(req.Enabled, true)
	var id int64
	err := h.pool.QueryRow(r.Context(), `INSERT INTO signal_fill_rules (rule_type,signal_type_id,group_id,fill_by,enabled) VALUES ($1,$2,$3,$4,$5) RETURNING rule_id`,
		firstNonEmpty(strings.ToUpper(req.RuleType), "POINT"), req.SignalTypeID, req.GroupID, firstNonEmpty(strings.ToUpper(req.FillBy), "POINT_CODE"), enabled).Scan(&id)
	if err != nil {
		httpx.Fail(w, http.StatusConflict, "signal rule creation failed")
		return
	}
	httpx.OK(w, map[string]interface{}{"RULE_ID": id})
}

func (h *Telesignals) DeleteRule(w http.ResponseWriter, r *http.Request) {
	id, ok := parseSignalID(r, "id")
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid rule id")
		return
	}
	result, err := h.pool.Exec(r.Context(), `DELETE FROM signal_fill_rules WHERE rule_id=$1`, id)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "signal rule delete failed")
		return
	}
	if result.RowsAffected() == 0 {
		httpx.Fail(w, http.StatusNotFound, "signal rule not found")
		return
	}
	httpx.OK(w, map[string]interface{}{"RULE_ID": id})
}
