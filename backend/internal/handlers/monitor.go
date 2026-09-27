package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Monitor serves monitor.toshi.gerege.mn: the latest value of every reading
// parameter for every point plus a one-hour per-minute trend.
type Monitor struct{ pool *pgxpool.Pool }

func NewMonitor(pool *pgxpool.Pool) *Monitor { return &Monitor{pool: pool} }

// monitorWindow bounds both the live snapshot and the trend.
const monitorWindow = "1 hour"

// Live returns the latest reading per point/parameter, the trend and the
// meter/point type catalogs used by the monitor filters.
func (h *Monitor) Live(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := h.pool.Query(ctx, `
		SELECT DISTINCT ON (rv.point_id, rv.parameter_code)
		       rv.point_id, p.point_code, p.point_name,
		       COALESCE(pt.point_type_name,''), COALESCE(m.meter_number,''),
		       COALESCE(mt.meter_type_name,''), rv.parameter_code,
		       rv.reading_value::float8, rv.unit, rv.status, rv.source, rv.reading_time
		FROM reading_values rv
		JOIN points p ON p.point_id=rv.point_id
		LEFT JOIN point_types pt ON pt.point_type_id=p.point_type_id
		LEFT JOIN meters m ON m.meter_id=rv.meter_id
		LEFT JOIN meter_types mt ON mt.meter_type_id=m.meter_type_id
		WHERE rv.reading_time > now() - interval '`+monitorWindow+`'
		ORDER BY rv.point_id, rv.parameter_code, rv.reading_time DESC`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "monitor query failed")
		return
	}
	live := make([]map[string]interface{}, 0)
	for rows.Next() {
		var pointID int64
		var code, name, pointType, meterNumber, meterType, param, unit, status, source string
		var value float64
		var at time.Time
		if err := rows.Scan(&pointID, &code, &name, &pointType, &meterNumber, &meterType,
			&param, &value, &unit, &status, &source, &at); err != nil {
			rows.Close()
			httpx.Fail(w, http.StatusInternalServerError, "monitor query failed")
			return
		}
		live = append(live, map[string]interface{}{
			"POINT_ID": pointID, "POINT_CODE": code, "POINT_NAME": name, "POINT_TYPE": pointType,
			"METER_NUMBER": meterNumber, "METER_TYPE": meterType, "PARAMETER_CODE": param,
			"VALUE": value, "UNIT": unit, "STATUS": status, "SOURCE": source, "TIME": at,
		})
	}
	rows.Close()
	if rows.Err() != nil {
		httpx.Fail(w, http.StatusInternalServerError, "monitor query failed")
		return
	}

	trend := make([]map[string]interface{}, 0)
	rows, err = h.pool.Query(ctx, `
		SELECT date_trunc('minute', reading_time), parameter_code, avg(reading_value)::float8
		FROM reading_values
		WHERE reading_time > now() - interval '`+monitorWindow+`'
		GROUP BY 1, 2 ORDER BY 1`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "monitor trend failed")
		return
	}
	for rows.Next() {
		var at time.Time
		var param string
		var value float64
		if err := rows.Scan(&at, &param, &value); err != nil {
			rows.Close()
			httpx.Fail(w, http.StatusInternalServerError, "monitor trend failed")
			return
		}
		trend = append(trend, map[string]interface{}{"TIME": at, "PARAMETER_CODE": param, "VALUE": value})
	}
	rows.Close()

	httpx.OK(w, map[string]interface{}{
		"now":         time.Now(),
		"parameters":  readingParameters,
		"meter_types": h.names(ctx, "SELECT meter_type_name FROM meter_types ORDER BY 1"),
		"point_types": h.names(ctx, "SELECT point_type_name FROM point_types ORDER BY 1"),
		"live":        live,
		"trend":       trend,
	})
}

func (h *Monitor) names(ctx context.Context, query string) []string {
	out := make([]string, 0)
	rows, err := h.pool.Query(ctx, query)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var s string
		if rows.Scan(&s) == nil {
			out = append(out, s)
		}
	}
	return out
}

// SimulateTick is the simulated DAS: one reading of every parameter for every
// enabled point (meter attached when mounted), source='SIM', and prunes SIM
// rows older than the monitor window. A real DAS writing reading_values
// replaces it without touching the monitor.
func SimulateTick(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
		INSERT INTO reading_values
		(point_id, meter_id, parameter_code, reading_time, reading_value, unit, status, source)
		SELECT p.point_id, am.meter_id, prm.code, date_trunc('second', now()),
		       round((prm.base * (0.85 + (p.point_id % 7) * 0.05)
		              * (1 + prm.swing * sin(extract(epoch FROM now()) / 600 + p.point_id))
		              + prm.base * prm.jitter * (random() - 0.5))::numeric, 3),
		       prm.unit, 'OK', 'SIM'
		FROM points p
		LEFT JOIN LATERAL (
			SELECT meter_id FROM mountings
			WHERE point_id=p.point_id AND (mou_et IS NULL OR mou_et > now())
			ORDER BY mou_bt DESC LIMIT 1
		) am ON true
		CROSS JOIN (VALUES
			('A_PLUS',       'кВт·ч',  12.0,  0.30, 0.10),
			('A_MINUS',      'кВт·ч',   0.8,  0.30, 0.20),
			('R_PLUS',       'квар·ч',  3.4,  0.25, 0.10),
			('R_MINUS',      'квар·ч',  0.4,  0.25, 0.20),
			('VOLTAGE',      'В',     220.0,  0.00, 0.06),
			('CURRENT',      'А',      12.0,  0.30, 0.10),
			('POWER_FACTOR', '',        0.95, 0.00, 0.04),
			('FREQUENCY',    'Гц',     50.0,  0.00, 0.004)
		) AS prm(code, unit, base, swing, jitter)
		WHERE p.point_enabled=1
		ON CONFLICT (point_id, parameter_code, reading_time) DO NOTHING`)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx, `DELETE FROM reading_values
		WHERE source='SIM' AND reading_time < now() - interval '`+monitorWindow+`'`)
	return err
}

// RunSimulator ticks SimulateTick until ctx is done.
func RunSimulator(ctx context.Context, pool *pgxpool.Pool, every time.Duration) {
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		if err := SimulateTick(ctx, pool); err != nil {
			log.Printf("monitor simulator: %v", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
	}
}
