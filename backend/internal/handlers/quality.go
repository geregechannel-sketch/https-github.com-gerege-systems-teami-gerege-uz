package handlers

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Quality serves the TEAMI quality-report filter and holes grid.
type Quality struct{ pool *pgxpool.Pool }

func NewQuality(pool *pgxpool.Pool) *Quality { return &Quality{pool: pool} }

func qualityPointIDs(values ...string) []int64 {
	seen := map[int64]bool{}
	ids := make([]int64, 0)
	for _, value := range values {
		for _, part := range strings.FieldsFunc(value, func(r rune) bool {
			return r == ',' || r == ';' || r == '[' || r == ']' || r == '"' || r == ' '
		}) {
			id, err := strconv.ParseInt(part, 10, 64)
			if err == nil && id > 0 && !seen[id] {
				seen[id] = true
				ids = append(ids, id)
			}
		}
	}
	return ids
}

func qualityRange(fromRaw, toRaw, view string) (time.Time, time.Time, int) {
	parse := func(value string, fallback time.Time) time.Time {
		for _, layout := range []string{"2006-01-02", "02-01-2006", time.RFC3339} {
			if parsed, err := time.Parse(layout, value); err == nil {
				return parsed
			}
		}
		return fallback
	}

	now := time.Now().In(time.FixedZone("Asia/Ulaanbaatar", 8*60*60))
	to := parse(toRaw, now)
	from := parse(fromRaw, to.AddDate(0, 0, -6))
	if from.After(to) {
		from, to = to, from
	}

	count := 1
	if strings.EqualFold(view, "MONTH") {
		cursor := time.Date(from.Year(), from.Month(), 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(to.Year(), to.Month(), 1, 0, 0, 0, 0, time.UTC)
		for cursor.Before(end) && count < 120 {
			count++
			cursor = cursor.AddDate(0, 1, 0)
		}
	} else {
		count = int(to.Sub(from).Hours()/24) + 1
		if count > 366 {
			count = 366
		}
	}
	return from, to, count
}

func (q *Quality) selectedPointIDs(ctx context.Context, requested []int64) ([]int64, error) {
	query := `SELECT point_id
		FROM points
		WHERE point_enabled = 1 AND point_internal = 0`
	args := []interface{}{}
	if len(requested) > 0 {
		query += " AND point_id = ANY($1)"
		args = append(args, requested)
	}
	query += " ORDER BY point_id"

	rows, err := q.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := make([]int64, 0)
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func pointIDsFromRequest(r *http.Request) []int64 {
	values := append([]string{}, r.URL.Query()["point_ids"]...)
	values = append(values, r.URL.Query()["POINT_ID"]...)
	return qualityPointIDs(values...)
}

// Count returns the filtered point count and IDs in the source TEAMI shape.
func (q *Quality) Count(w http.ResponseWriter, r *http.Request) {
	ids, err := q.selectedPointIDs(r.Context(), pointIDsFromRequest(r))
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "quality point count failed")
		return
	}
	httpx.OK(w, map[string]interface{}{"CNT": len(ids), "POINT_ID": ids})
}

// Holes reports configuration-backed data availability for each selected point.
// Imported archive engines can replace this calculation without changing the API.
func (q *Quality) Holes(w http.ResponseWriter, r *http.Request) {
	ids, err := q.selectedPointIDs(r.Context(), pointIDsFromRequest(r))
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "quality point selection failed")
		return
	}
	_, _, periods := qualityRange(r.URL.Query().Get("from"), r.URL.Query().Get("to"), r.URL.Query().Get("q_view"))
	if len(ids) == 0 {
		httpx.OKList(w, []interface{}{}, 0)
		return
	}

	rows, err := q.pool.Query(r.Context(), `
		SELECT p.point_id, p.point_code, p.point_name,
		       count(dp.dp_id) AS channel_count,
		       count(dp.dp_id) FILTER (
		           WHERE dp.dp_enabled = 1 AND dp.dp_deleted = 0 AND COALESCE(dp.dp_internal, 0) = 0
		       ) AS active_count
		FROM points p
		LEFT JOIN data_points dp ON dp.point_id = p.point_id
		WHERE p.point_id = ANY($1)
		GROUP BY p.point_id, p.point_code, p.point_name
		ORDER BY p.point_code, p.point_name`, ids)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "quality report failed")
		return
	}
	defer rows.Close()

	data := make([]map[string]interface{}, 0, len(ids))
	for rows.Next() {
		var id, total, active int64
		var code, name string
		if err := rows.Scan(&id, &code, &name, &total, &active); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "quality report scan failed")
			return
		}
		status := 1
		if active == 0 {
			status = 3
		} else if active < total {
			status = 2
		}
		colors := make([]int, periods)
		for index := range colors {
			colors[index] = status
		}
		data = append(data, map[string]interface{}{
			"POINT_ID":       id,
			"POINT_CODE":     code,
			"POINT_NAME":     name,
			"ML_ID":          nil,
			"ML_NAME":        nil,
			"AGGS_TYPE_ID":   nil,
			"AGGS_TYPE_NAME": nil,
			"COLOR":          colors,
			"CHANNEL_COUNT":  total,
			"ACTIVE_COUNT":   active,
		})
	}
	if err := rows.Err(); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "quality report failed")
		return
	}
	httpx.OKList(w, data, int64(len(data)))
}
