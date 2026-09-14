package handlers

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/emcos/ec3-backend/internal/auth"
	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Archives serves stored local samples. It does not contact or command meters.
type Archives struct{ pool *pgxpool.Pool }

func NewArchives(pool *pgxpool.Pool) *Archives { return &Archives{pool: pool} }

func archiveReadAllowed(w http.ResponseWriter, r *http.Request) bool {
	c, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Fail(w, http.StatusUnauthorized, "unauthenticated")
		return false
	}
	if !c.Has("reports") && !c.Has("config") {
		httpx.Fail(w, http.StatusForbidden, "Недостаточно прав для просмотра архива")
		return false
	}
	return true
}

func (h *Archives) Parameters(w http.ResponseWriter, r *http.Request) {
	if !archiveReadAllowed(w, r) {
		return
	}
	point, err := strconv.ParseInt(r.URL.Query().Get("POINT_ID"), 10, 64)
	if err != nil || point <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "POINT_ID required")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	rows, err := h.pool.Query(ctx, `SELECT DISTINCT ml_id, md_id, aggs_id FROM archive_samples WHERE point_id=$1 ORDER BY ml_id, md_id, aggs_id LIMIT 1001`, point)
	if err != nil {
		httpx.Fail(w, http.StatusServiceUnavailable, "Не удалось получить параметры архива")
		return
	}
	defer rows.Close()
	data := []map[string]interface{}{}
	for rows.Next() {
		var ml, md, agg int64
		if err := rows.Scan(&ml, &md, &agg); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "Invalid archive parameters")
			return
		}
		data = append(data, map[string]interface{}{"POINT_ID": point, "ML_ID": ml, "MD_ID": md, "AGGS_ID": agg})
	}
	if rows.Err() != nil {
		httpx.Fail(w, http.StatusServiceUnavailable, "Не удалось получить параметры архива")
		return
	}
	if len(data) > 1000 {
		httpx.Fail(w, http.StatusRequestEntityTooLarge, "Too many archive parameters")
		return
	}
	httpx.OKList(w, data, int64(len(data)))
}

type archiveRequest struct {
	Point          int64  `json:"POINT_ID"`
	ML             *int64 `json:"ML_ID"`
	MD             *int64 `json:"MD_ID"`
	Agg            *int64 `json:"AGGS_ID"`
	From           string `json:"FROM"`
	To             string `json:"TO"`
	IncludeOverlap bool   `json:"INCLUDE_OVERLAP"`
}

func (h *Archives) Point(w http.ResponseWriter, r *http.Request) {
	if !archiveReadAllowed(w, r) {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	var q archiveRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&q); err != nil || q.Point <= 0 || q.ML == nil || q.MD == nil || q.Agg == nil {
		httpx.Fail(w, http.StatusBadRequest, "Invalid archive request")
		return
	}
	if err := decoder.Decode(new(interface{})); err != io.EOF {
		httpx.Fail(w, http.StatusBadRequest, "Expected one archive request")
		return
	}
	// Explicit offsets are required; range is [FROM, TO). No timezone guessing.
	from, err1 := time.Parse(time.RFC3339, q.From)
	to, err2 := time.Parse(time.RFC3339, q.To)
	if err1 != nil || err2 != nil || !to.After(from) || to.Sub(from) > 366*24*time.Hour {
		httpx.Fail(w, http.StatusBadRequest, "FROM/TO require timezone offsets and a period of 1–366 days or less")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	rows, err := h.pool.Query(ctx, `SELECT begin_time,end_time,value::text,unit,source_status,source_ref,received_at FROM archive_samples WHERE point_id=$1 AND ml_id=$2 AND md_id=$3 AND aggs_id=$4 AND (begin_time >= $5 OR ($7 AND end_time > $5)) AND begin_time < $6 ORDER BY begin_time LIMIT 10001`, q.Point, q.ML, q.MD, q.Agg, from, to, q.IncludeOverlap)
	if err != nil {
		httpx.Fail(w, http.StatusServiceUnavailable, "Архив недоступен")
		return
	}
	defer rows.Close()
	data := []map[string]interface{}{}
	for rows.Next() {
		var bt, et, received time.Time
		var value, unit, status, source string
		if err := rows.Scan(&bt, &et, &value, &unit, &status, &source, &received); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "Invalid archive row")
			return
		}
		data = append(data, map[string]interface{}{"POINT_ID": q.Point, "ML_ID": q.ML, "MD_ID": q.MD, "AGGS_ID": q.Agg, "BT": bt.UTC().Format(time.RFC3339Nano), "ET": et.UTC().Format(time.RFC3339Nano), "VALUE": value, "UNIT": unit, "SOURCE_STATUS": status, "SOURCE_REF": source, "RECEIVED_AT": received.UTC().Format(time.RFC3339Nano)})
	}
	if rows.Err() != nil {
		httpx.Fail(w, http.StatusServiceUnavailable, "Архив недоступен")
		return
	}
	if len(data) > 10000 {
		httpx.Fail(w, http.StatusRequestEntityTooLarge, "Сократите период: больше 10000 строк")
		return
	}
	httpx.OKList(w, data, int64(len(data)))
}
