package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// EventLog serves the source-shaped event register with domain filters.
type EventLog struct{ pool *pgxpool.Pool }

func NewEventLog(pool *pgxpool.Pool) *EventLog { return &EventLog{pool: pool} }

type eventLogRequest struct {
	Category   string `json:"category"`
	From       string `json:"from"`
	To         string `json:"to"`
	Search     string `json:"search"`
	Priority   string `json:"priority"`
	Source     string `json:"source"`
	SourceType string `json:"source_type"`
	Channel    string `json:"channel"`
	Limit      int    `json:"limit"`
	Offset     int    `json:"offset"`
}

var eventCategories = map[string]int{
	"oracle": 1, "software": 2, "connection": 3, "data": 4, "system": 5,
}

func eventCategoryID(value string) int {
	value = strings.ToLower(strings.TrimSpace(value))
	if id, ok := eventCategories[value]; ok {
		return id
	}
	if id, err := strconv.Atoi(value); err == nil && id >= 1 && id <= 5 {
		return id
	}
	return 0
}

func eventLogRange(fromRaw, toRaw string) (time.Time, time.Time, bool) {
	loc := time.FixedZone("Asia/Ulaanbaatar", 8*60*60)
	parse := func(value string) (time.Time, bool) {
		for _, layout := range []string{"2006-01-02", "02-01-2006", time.RFC3339} {
			if parsed, err := time.ParseInLocation(layout, strings.TrimSpace(value), loc); err == nil {
				return parsed, true
			}
		}
		return time.Time{}, false
	}
	from, fromOK := parse(fromRaw)
	to, toOK := parse(toRaw)
	if !fromOK || !toOK {
		return time.Time{}, time.Time{}, false
	}
	if from.After(to) {
		from, to = to, from
	}
	to = to.Add(24 * time.Hour)
	if to.Sub(from) > 366*24*time.Hour {
		from = to.Add(-366 * 24 * time.Hour)
	}
	return from, to, true
}

func eventLogWhere(req eventLogRequest) (string, []interface{}, bool) {
	from, to, ok := eventLogRange(req.From, req.To)
	if !ok {
		return "", nil, false
	}
	conditions := []string{"ev_time >= $1", "ev_time < $2"}
	args := []interface{}{from, to}
	add := func(condition string, value interface{}) {
		args = append(args, value)
		conditions = append(conditions, fmt.Sprintf(condition, len(args)))
	}
	if category := eventCategoryID(req.Category); category != 0 {
		add("evc_id = $%d", category)
	}
	if priority := strings.ToUpper(strings.TrimSpace(req.Priority)); priority != "" {
		add("ev_priority = $%d", priority)
	}
	if value := strings.TrimSpace(req.Source); value != "" {
		add("ev_source ILIKE $%d", "%"+value+"%")
	}
	if value := strings.TrimSpace(req.SourceType); value != "" {
		add("ev_source_type ILIKE $%d", "%"+value+"%")
	}
	if value := strings.TrimSpace(req.Channel); value != "" {
		add("ev_channel ILIKE $%d", "%"+value+"%")
	}
	if value := strings.TrimSpace(req.Search); value != "" {
		add("concat_ws(' ', ev_text, ev_point_name, ev_source, ev_source_type, ev_channel) ILIKE $%d", "%"+value+"%")
	}
	return strings.Join(conditions, " AND "), args, true
}

func scanEvent(scanner interface{ Scan(...interface{}) error }) (map[string]interface{}, error) {
	var id int64
	var category, count int
	var created, last time.Time
	var priority, message, point, source, sourceType, channel string
	var acknowledged bool
	var moduleID, dasID, dataPointID sql.NullInt64
	err := scanner.Scan(&id, &created, &last, &category, &priority, &message, &point,
		&source, &sourceType, &channel, &count, &acknowledged, &moduleID, &dasID, &dataPointID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"EV_ID": id, "EV_TIME": created, "EV_LAST_TIME": last, "EVC_ID": category,
		"EV_PRIORITY": priority, "EV_TEXT": message, "EV_POINT_NAME": point,
		"EV_SOURCE": source, "EV_SOURCE_TYPE": sourceType, "EV_CHANNEL": channel,
		"EV_COUNT": count, "EV_ACKNOWLEDGED": acknowledged,
		"MDL_ID": nullableInt64(moduleID), "DAS_ID": nullableInt64(dasID), "DP_ID": nullableInt64(dataPointID),
	}, nil
}

const eventSelect = `
	SELECT ev_id, ev_time, COALESCE(ev_last_time, ev_time), evc_id, ev_priority,
	       ev_text, ev_point_name, ev_source, ev_source_type, ev_channel,
	       ev_count, ev_acknowledged, mdl_id, das_id, dp_id
	FROM events`

// Query applies the same category, time and optional source filters as TEAMI.
func (h *EventLog) Query(w http.ResponseWriter, r *http.Request) {
	var req eventLogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	where, args, ok := eventLogWhere(req)
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid event interval")
		return
	}
	limit := req.Limit
	if limit <= 0 || limit > 500 {
		limit = 50
	}
	if req.Offset < 0 {
		req.Offset = 0
	}
	var total int64
	if err := h.pool.QueryRow(r.Context(), "SELECT count(*) FROM events WHERE "+where, args...).Scan(&total); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "event count failed")
		return
	}
	queryArgs := append(append([]interface{}{}, args...), limit, req.Offset)
	query := eventSelect + " WHERE " + where + fmt.Sprintf(
		" ORDER BY COALESCE(ev_last_time, ev_time) DESC, ev_id DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	rows, err := h.pool.Query(r.Context(), query, queryArgs...)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "event query failed")
		return
	}
	defer rows.Close()
	data := make([]map[string]interface{}, 0)
	for rows.Next() {
		row, err := scanEvent(rows)
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "event scan failed")
			return
		}
		data = append(data, row)
	}
	if err := rows.Err(); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "event query failed")
		return
	}
	httpx.OKList(w, data, total)
}

// Summary returns dashboard counts for the current event interval.
func (h *EventLog) Summary(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	start, end, ok := eventLogRange(from, to)
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid event interval")
		return
	}
	var total, unacknowledged, warnings, errors int64
	err := h.pool.QueryRow(r.Context(), `
		SELECT count(*), count(*) FILTER (WHERE NOT ev_acknowledged),
		       count(*) FILTER (WHERE ev_priority='WARN'),
		       count(*) FILTER (WHERE ev_priority IN ('ERROR','CRITICAL'))
		FROM events WHERE ev_time >= $1 AND ev_time < $2`, start, end).
		Scan(&total, &unacknowledged, &warnings, &errors)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "event summary failed")
		return
	}
	rows, err := h.pool.Query(r.Context(), `
		SELECT evc_id, count(*) FROM events
		WHERE ev_time >= $1 AND ev_time < $2 GROUP BY evc_id ORDER BY evc_id`, start, end)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "event summary failed")
		return
	}
	defer rows.Close()
	byCategory := make(map[string]int64)
	for rows.Next() {
		var category int
		var count int64
		if err := rows.Scan(&category, &count); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "event summary failed")
			return
		}
		byCategory[strconv.Itoa(category)] = count
	}
	httpx.OK(w, map[string]interface{}{
		"TOTAL": total, "UNACKNOWLEDGED": unacknowledged, "WARNINGS": warnings,
		"ERRORS": errors, "BY_CATEGORY": byCategory,
	})
}

// Detail returns all event fields for the detail dialog.
func (h *EventLog) Detail(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "invalid event id")
		return
	}
	row, err := scanEvent(h.pool.QueryRow(r.Context(), eventSelect+" WHERE ev_id=$1", id))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Fail(w, http.StatusNotFound, "event not found")
		return
	}
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "event detail failed")
		return
	}
	httpx.OK(w, row)
}
