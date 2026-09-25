package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Schemes serves TEAMI-compatible mnemonic diagrams backed by live signals.
type Schemes struct{ pool *pgxpool.Pool }

func NewSchemes(pool *pgxpool.Pool) *Schemes { return &Schemes{pool: pool} }

func parseSchemeID(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	return id, err == nil && id > 0
}

func schemeSignalState(current, typeCode string, blocked bool) string {
	if blocked {
		return "blocked"
	}
	if typeCode == "ALARM" && current == "1" {
		return "alarm"
	}
	if current == "1" {
		return "on"
	}
	return "off"
}

// Catalog lists diagrams available to the current installation.
func (h *Schemes) Catalog(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(), `
		SELECT c_scheme_id, COALESCE(c_scheme_code,''), COALESCE(c_scheme_name,''),
		       c_scheme_dtype_id, c_scheme_type_id, c_updated_at
		FROM g_scheme ORDER BY c_scheme_name, c_scheme_id`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "scheme catalog failed")
		return
	}
	defer rows.Close()
	data := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int64
		var code, name string
		var dataTypeID, typeID sql.NullInt64
		var updated time.Time
		if err := rows.Scan(&id, &code, &name, &dataTypeID, &typeID, &updated); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "scheme catalog failed")
			return
		}
		data = append(data, map[string]interface{}{
			"SCHEME_ID": id, "SCHEME_CODE": code, "SCHEME_NAME": name,
			"SCHEME_DTYPE_ID": nullableInt64(dataTypeID), "SCHEME_TYPE_ID": nullableInt64(typeID),
			"UPDATED_AT": updated,
		})
	}
	httpx.OKList(w, data, int64(len(data)))
}

// View returns a diagram layout and its current live signal state in one call.
func (h *Schemes) View(w http.ResponseWriter, r *http.Request) {
	id, ok := parseSchemeID(r)
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid scheme id")
		return
	}
	var code, name, rawLayout string
	var updated time.Time
	err := h.pool.QueryRow(r.Context(), `
		SELECT COALESCE(c_scheme_code,''), COALESCE(c_scheme_name,''),
		       COALESCE(c_scheme_data,'{}'), c_updated_at
		FROM g_scheme WHERE c_scheme_id=$1`, id).Scan(&code, &name, &rawLayout, &updated)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Fail(w, http.StatusNotFound, "scheme not found")
		return
	}
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "scheme lookup failed")
		return
	}
	var layout map[string]interface{}
	if err := json.Unmarshal([]byte(rawLayout), &layout); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "scheme layout is invalid")
		return
	}

	rows, err := h.pool.Query(r.Context(), `
		SELECT s.signal_id, s.signal_code, s.signal_name, s.current_value,
		       CASE WHEN s.current_value='1' THEN st.value_on ELSE st.value_off END,
		       st.type_code, s.switched_at, s.blocked
		FROM tele_signals s
		JOIN signal_types st ON st.signal_type_id=s.signal_type_id
		WHERE s.enabled=true ORDER BY s.signal_name`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "scheme signals failed")
		return
	}
	defer rows.Close()
	signals := make([]map[string]interface{}, 0)
	alarms, blocked, online := 0, 0, 0
	var latest time.Time
	for rows.Next() {
		var signalID int64
		var signalCode, signalName, current, display, typeCode string
		var switched time.Time
		var isBlocked bool
		if err := rows.Scan(&signalID, &signalCode, &signalName, &current, &display, &typeCode, &switched, &isBlocked); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "scheme signals failed")
			return
		}
		state := schemeSignalState(current, typeCode, isBlocked)
		if state == "alarm" {
			alarms++
		}
		if state == "blocked" {
			blocked++
		}
		if state == "on" {
			online++
		}
		if switched.After(latest) {
			latest = switched
		}
		signals = append(signals, map[string]interface{}{
			"SIGNAL_ID": signalID, "SIGNAL_CODE": signalCode, "SIGNAL_NAME": signalName,
			"CURRENT_VALUE": current, "DISPLAY_VALUE": display, "TYPE_CODE": typeCode,
			"SWITCHED_AT": switched, "BLOCKED": isBlocked, "STATE": state,
		})
	}
	httpx.OK(w, map[string]interface{}{
		"scheme":  map[string]interface{}{"SCHEME_ID": id, "SCHEME_CODE": code, "SCHEME_NAME": name, "UPDATED_AT": updated},
		"layout":  layout,
		"signals": signals,
		"summary": map[string]interface{}{"SIGNALS": len(signals), "ONLINE": online, "ALARMS": alarms, "BLOCKED": blocked, "DATA_UPDATED_AT": latest},
		"db_time": time.Now(),
	})
}
