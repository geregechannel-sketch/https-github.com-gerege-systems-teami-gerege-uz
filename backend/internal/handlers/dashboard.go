package handlers

import (
	"net/http"

	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Dashboard serves homedashboard/query and homedashboard/data.
//
// The real ec3api is SQL-driven: /query returns the raw Oracle SQL per tile and
// /data executes it. Executing client-visible SQL is an injection risk, so this
// implementation computes the KPI tiles server-side and /query returns only a
// description of each tile.
// ponytail: KPIs computed in Go instead of executing stored SQL — safe by design,
// upgrade to a stored-query engine (with bound params + RBAC) if truly needed.
type Dashboard struct {
	pool *pgxpool.Pool
}

func NewDashboard(pool *pgxpool.Pool) *Dashboard { return &Dashboard{pool: pool} }

var tiles = []struct {
	Title string
	Color string
}{
	{"Всего действительных точек учета", "#3cb478"},
	{"Всего действительных точек считывания", "#3cb478"},
	{"Процент доступных каналов связи", "#3cb478"},
}

// Query: GET homedashboard/query -> [{RPQ_SLC: <description>}]
func (d *Dashboard) Query(w http.ResponseWriter, r *http.Request) {
	data := make([]map[string]interface{}, len(tiles))
	for i, t := range tiles {
		data[i] = map[string]interface{}{"RPQ_SLC": t.Title}
	}
	httpx.OK(w, data)
}

// Data: POST homedashboard/data -> [{TITLE, DATE_VALUE, STAT, COLOR, URL}]
func (d *Dashboard) Data(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	now := timeNow()

	var accountingPoints, readingPoints, channelsTotal, channelsUp int64
	_ = d.pool.QueryRow(ctx,
		`SELECT count(*) FROM points WHERE point_enabled=1 AND point_code <> 'EMCOS_STATUS'`).Scan(&accountingPoints)
	_ = d.pool.QueryRow(ctx,
		`SELECT count(*)
		   FROM data_points dp
		   LEFT JOIN points p ON p.point_id = dp.point_id
		  WHERE dp.dp_deleted=0
		    AND dp.dp_enabled=1
		    AND COALESCE(dp.dp_internal,0)=0
		    AND COALESCE(dp.dp_code,'') NOT IN ('GENERATED_BY_ORACLE','EMCOS_STATUS')
		    AND COALESCE(p.point_code,'') <> 'EMCOS_STATUS'`).Scan(&readingPoints)
	_ = d.pool.QueryRow(ctx, `SELECT count(*) FROM data_servers`).Scan(&channelsTotal)
	_ = d.pool.QueryRow(ctx, `SELECT count(*) FROM data_servers WHERE das_enabled=1`).Scan(&channelsUp)

	pct := "100 %"
	if channelsTotal > 0 {
		pct = itoa(channelsUp*100/channelsTotal) + " %"
	}
	stats := []string{
		itoa(accountingPoints) + " шт.",
		itoa(readingPoints) + " шт.",
		pct,
	}
	data := make([]map[string]interface{}, len(tiles))
	for i, t := range tiles {
		data[i] = map[string]interface{}{
			"TITLE":      t.Title,
			"DATE_VALUE": now,
			"STAT":       stats[i],
			"COLOR":      t.Color,
			"URL":        nil,
		}
	}
	httpx.OK(w, data)
}
