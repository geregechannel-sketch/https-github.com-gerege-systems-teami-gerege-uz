package handlers

import (
	"context"
	"database/sql"
	_ "embed"
	"encoding/json"
	"net/http"
	"time"

	"github.com/emcos/ec3-backend/internal/config"
	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/jackc/pgx/v5/pgxpool"
)

type GIS struct{ pool *pgxpool.Pool }

//go:embed data/teamiGisSnapshot.json
var gisReference []byte

func NewGIS(pool *pgxpool.Pool) *GIS { return &GIS{pool: pool} }

// Reference is an authenticated recorded response, not live device telemetry.
func (h *GIS) Reference(w http.ResponseWriter, r *http.Request) {
	if !archiveReadAllowed(w, r) {
		return
	}
	httpx.OK(w, json.RawMessage(gisReference))
}

// Availability uses stored observation times, not auto-read configuration flags.
func (h *GIS) Availability(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	rows, err := h.pool.Query(ctx, `
		WITH observations AS (
		 SELECT point_id,reading_time AS observed_at FROM reading_values
		 WHERE reading_time >= now()-interval '2 days' AND reading_time<=now() AND ($1 OR source NOT IN ('SIM','COLLECT','RECOLLECT'))
		 UNION ALL
		 SELECT point_id,COALESCE(source_read_time,begin_time) FROM archive_samples
		 WHERE COALESCE(source_read_time,begin_time)>=now()-interval '2 days'
		 AND COALESCE(source_read_time,begin_time)<=now() AND begin_time<=now()
		), recent AS (SELECT point_id,max(observed_at) AS observed_at FROM observations GROUP BY point_id)
		SELECT p.point_id,m.meter_id,recent.observed_at FROM points p
		LEFT JOIN LATERAL (SELECT meter_id FROM mountings WHERE point_id=p.point_id
		 AND mou_bt<=now() AND (mou_et IS NULL OR mou_et>now()) ORDER BY mou_bt DESC LIMIT 1) m ON true
		LEFT JOIN recent ON recent.point_id=p.point_id
		WHERE p.point_internal=0 AND p.point_enabled=1 ORDER BY p.point_id`, config.SimulationEnabled())
	if err != nil {
		httpx.Fail(w, http.StatusServiceUnavailable, "GIS observations unavailable")
		return
	}
	defer rows.Close()
	data := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int64
		var meter sql.NullInt64
		var observed sql.NullTime
		if err := rows.Scan(&id, &meter, &observed); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "Invalid GIS observation")
			return
		}
		data = append(data, map[string]interface{}{"POINT_ID": id, "METER_ID": nullableInt64(meter), "LAST_READING_AT": nullableTime(observed)})
	}
	if rows.Err() != nil {
		httpx.Fail(w, http.StatusServiceUnavailable, "GIS observations unavailable")
		return
	}
	httpx.OKList(w, data, int64(len(data)))
}
