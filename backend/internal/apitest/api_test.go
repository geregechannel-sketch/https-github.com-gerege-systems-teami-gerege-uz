package apitest

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/emcos/ec3-backend/internal/auth"
	"github.com/emcos/ec3-backend/internal/db"
	"github.com/emcos/ec3-backend/internal/resource"
	"github.com/emcos/ec3-backend/internal/router"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func testURL() string {
	if v := os.Getenv("TEST_DATABASE_URL"); v != "" {
		return v
	}
	return "postgres://emcos:emcos@localhost:55432/emcos_test?sslmode=disable"
}

// setup returns a running test server and the pool, with a freshly migrated +
// seeded schema. It skips the test if no test database is reachable.
func setup(t *testing.T) (*httptest.Server, *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	pool, err := db.Connect(ctx, testURL())
	if err != nil {
		t.Skipf("test database unavailable (%v); set TEST_DATABASE_URL", err)
	}
	// hermetic: wipe and rebuild the schema
	if _, err := pool.Exec(ctx, `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`); err != nil {
		t.Fatalf("reset schema: %v", err)
	}
	if err := db.Migrate(ctx, pool); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	if err := db.SeedAdmin(ctx, pool, "admin", "admin123"); err != nil {
		t.Fatalf("seed: %v", err)
	}
	// a limited user with no 'config' privilege (RBAC test)
	hash, _ := bcrypt.GenerateFromPassword([]byte("viewer123"), bcrypt.DefaultCost)
	if _, err := pool.Exec(ctx,
		`INSERT INTO users (user_name, password_hash, privileges) VALUES ('viewer',$1,'["reports"]')`,
		string(hash)); err != nil {
		t.Fatalf("seed viewer: %v", err)
	}

	mgr := auth.NewManager("test-secret", time.Hour)
	reg := resource.NewRegistry()
	resource.RegisterCore(reg)
	resource.RegisterGenerated(reg)
	srv := httptest.NewServer(router.New(pool, mgr, reg))
	t.Cleanup(func() { srv.Close(); pool.Close() })
	return srv, pool
}

type resp struct {
	Success    bool            `json:"success"`
	Data       json.RawMessage `json:"data"`
	TotalCount *int64          `json:"totalCount"`
	Code       int             `json:"code"`
	Message    string          `json:"message"`
}

func do(t *testing.T, srv *httptest.Server, method, path, token string, body interface{}) (int, resp) {
	t.Helper()
	var rdr io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rdr = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, srv.URL+path, rdr)
	if token != "" {
		req.Header.Set("st-token", token)
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	defer res.Body.Close()
	var r resp
	_ = json.NewDecoder(res.Body).Decode(&r)
	return res.StatusCode, r
}

// login returns a valid st-token for the given user.
func login(t *testing.T, srv *httptest.Server, user, pass string) string {
	t.Helper()
	code, r := do(t, srv, "POST", "/ec3api/v1/user/login", "", map[string]string{"login": user, "password": pass})
	if code != 200 || !r.Success {
		t.Fatalf("login %s failed: code=%d msg=%s", user, code, r.Message)
	}
	var data struct {
		Token string `json:"token"`
	}
	_ = json.Unmarshal(r.Data, &data)
	if data.Token == "" {
		t.Fatal("login returned empty token")
	}
	return data.Token
}

func TestLogin(t *testing.T) {
	srv, _ := setup(t)
	// success
	tok := login(t, srv, "admin", "admin123")
	if tok == "" {
		t.Fatal("empty token")
	}
	// wrong password
	code, r := do(t, srv, "POST", "/ec3api/v1/user/login", "", map[string]string{"login": "admin", "password": "nope"})
	if code != 401 || r.Success {
		t.Fatalf("expected 401, got %d success=%v", code, r.Success)
	}
	// unknown user
	code, _ = do(t, srv, "POST", "/ec3api/v1/user/login", "", map[string]string{"login": "ghost", "password": "x"})
	if code != 401 {
		t.Fatalf("expected 401 for unknown user, got %d", code)
	}
}

func TestAuthRequired(t *testing.T) {
	srv, _ := setup(t)
	code, r := do(t, srv, "GET", "/ec3api/v1/grouptypes", "", nil)
	if code != 401 || r.Success {
		t.Fatalf("expected 401 without token, got %d", code)
	}
	code, _ = do(t, srv, "GET", "/ec3api/v1/grouptypes", "garbage.token.here", nil)
	if code != 401 {
		t.Fatalf("expected 401 with bad token, got %d", code)
	}
}

func TestDictionaryList(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")
	code, r := do(t, srv, "GET", "/ec3api/v1/grouptypes", tok, nil)
	if code != 200 || !r.Success {
		t.Fatalf("grouptypes list failed: %d %s", code, r.Message)
	}
	var rows []map[string]interface{}
	_ = json.Unmarshal(r.Data, &rows)
	if len(rows) == 0 {
		t.Fatal("expected seeded group types")
	}
	if _, ok := rows[0]["GR_TYPE_NAME"]; !ok {
		t.Fatalf("expected UPPER_CASE keys, got %v", rows[0])
	}
	if r.TotalCount == nil || *r.TotalCount != int64(len(rows)) {
		t.Fatalf("totalCount mismatch: %v vs %d", r.TotalCount, len(rows))
	}
}

func TestDashboard(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")
	code, r := do(t, srv, "POST", "/ec3api/v1/homedashboard/data", tok, map[string]interface{}{})
	if code != 200 || !r.Success {
		t.Fatalf("dashboard failed: %d %s", code, r.Message)
	}
	var tiles []map[string]interface{}
	_ = json.Unmarshal(r.Data, &tiles)
	if len(tiles) != 3 {
		t.Fatalf("expected 3 KPI tiles, got %d", len(tiles))
	}
	// seed inserted 1 enabled point -> "1 шт."
	if tiles[0]["STAT"] != "1 шт." {
		t.Fatalf("expected accounting points '1 шт.', got %v", tiles[0]["STAT"])
	}
}

func TestReadingsEndToEnd(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")

	code, filterResp := do(t, srv, "GET", "/ec3api/v1/readings/filter", tok, nil)
	if code != http.StatusOK || !filterResp.Success {
		t.Fatalf("reading filter failed: %d %s", code, filterResp.Message)
	}
	var filter struct {
		Points []struct {
			PointID int64 `json:"POINT_ID"`
		} `json:"points"`
	}
	if err := json.Unmarshal(filterResp.Data, &filter); err != nil || len(filter.Points) == 0 {
		t.Fatalf("reading filter did not return points: %v", err)
	}

	body := map[string]interface{}{
		"point_ids":  []int64{filter.Points[0].PointID},
		"parameters": []string{"A_PLUS", "VOLTAGE"},
		"from":       "2026-09-23", "to": "2026-09-23", "action": "COLLECT",
	}
	code, taskResp := do(t, srv, "POST", "/ec3api/v1/readings/tasks", tok, body)
	if code != http.StatusOK || !taskResp.Success {
		t.Fatalf("reading task failed: %d %s", code, taskResp.Message)
	}

	code, queryResp := do(t, srv, "POST", "/ec3api/v1/readings/query", tok, body)
	if code != http.StatusOK || !queryResp.Success {
		t.Fatalf("reading query failed: %d %s", code, queryResp.Message)
	}
	var result struct {
		Rows  []map[string]interface{} `json:"rows"`
		Total int                      `json:"total"`
	}
	if err := json.Unmarshal(queryResp.Data, &result); err != nil || result.Total == 0 || len(result.Rows) == 0 {
		t.Fatalf("reading query did not return collected data: total=%d err=%v", result.Total, err)
	}

	code, jobsResp := do(t, srv, "GET", "/ec3api/v1/readings/jobs", tok, nil)
	if code != http.StatusOK || !jobsResp.Success || jobsResp.TotalCount == nil || *jobsResp.TotalCount == 0 {
		t.Fatalf("reading jobs failed: %d %s", code, jobsResp.Message)
	}
}

func TestEventLogEndToEnd(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")
	today := time.Now().Format("2006-01-02")

	code, queryResp := do(t, srv, "POST", "/ec3api/v1/eventlog/query", tok, map[string]interface{}{
		"category": "all", "from": today, "to": today, "limit": 50, "offset": 0,
	})
	if code != http.StatusOK || !queryResp.Success || queryResp.TotalCount == nil || *queryResp.TotalCount == 0 {
		t.Fatalf("event query failed: code=%d total=%v message=%s", code, queryResp.TotalCount, queryResp.Message)
	}
	var events []map[string]interface{}
	if err := json.Unmarshal(queryResp.Data, &events); err != nil || len(events) == 0 {
		t.Fatalf("event query did not return rows: %v", err)
	}
	if events[0]["EV_PRIORITY"] == nil || events[0]["EV_SOURCE"] == nil {
		t.Fatalf("event query missing source fields: %v", events[0])
	}

	code, summaryResp := do(t, srv, "GET", "/ec3api/v1/eventlog/summary?from="+today+"&to="+today, tok, nil)
	if code != http.StatusOK || !summaryResp.Success {
		t.Fatalf("event summary failed: %d %s", code, summaryResp.Message)
	}

	id := int64(events[0]["EV_ID"].(float64))
	code, detailResp := do(t, srv, "GET", "/ec3api/v1/eventlog/"+itoa(id), tok, nil)
	if code != http.StatusOK || !detailResp.Success {
		t.Fatalf("event detail failed: %d %s", code, detailResp.Message)
	}
}

func TestReportingEndToEnd(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")
	today := time.Now().Format("2006-01-02")

	code, catalogResp := do(t, srv, "GET", "/ec3api/v1/reporting/catalog", tok, nil)
	if code != http.StatusOK || !catalogResp.Success {
		t.Fatalf("report catalog failed: %d %s", code, catalogResp.Message)
	}
	var catalog struct {
		Reports []map[string]interface{} `json:"reports"`
		Points  []map[string]interface{} `json:"points"`
	}
	if err := json.Unmarshal(catalogResp.Data, &catalog); err != nil || len(catalog.Reports) == 0 || len(catalog.Points) == 0 {
		t.Fatalf("report catalog is incomplete: reports=%d points=%d err=%v", len(catalog.Reports), len(catalog.Points), err)
	}
	reportID := int64(catalog.Reports[0]["REPORT_ID"].(float64))
	pointID := int64(catalog.Points[0]["POINT_ID"].(float64))

	code, previewResp := do(t, srv, "POST", "/ec3api/v1/reporting/preview", tok, map[string]interface{}{
		"report_id": reportID, "point_ids": []int64{pointID},
		"from": today, "to": today, "output_format": "XLSX",
	})
	if code != http.StatusOK || !previewResp.Success {
		t.Fatalf("report preview failed: %d %s", code, previewResp.Message)
	}
	var preview struct {
		RunID int                      `json:"run_id"`
		Rows  []map[string]interface{} `json:"rows"`
	}
	if err := json.Unmarshal(previewResp.Data, &preview); err != nil || preview.RunID == 0 || len(preview.Rows) == 0 {
		t.Fatalf("report preview is empty: run=%d rows=%d err=%v", preview.RunID, len(preview.Rows), err)
	}

	code, savedResp := do(t, srv, "GET", "/ec3api/v1/reporting/runs/"+itoa(int64(preview.RunID)), tok, nil)
	if code != http.StatusOK || !savedResp.Success {
		t.Fatalf("saved report failed: %d %s", code, savedResp.Message)
	}
	var saved struct {
		RunID int                      `json:"run_id"`
		Rows  []map[string]interface{} `json:"rows"`
	}
	if err := json.Unmarshal(savedResp.Data, &saved); err != nil || saved.RunID != preview.RunID || len(saved.Rows) == 0 {
		t.Fatalf("saved report is empty: run=%d rows=%d err=%v", saved.RunID, len(saved.Rows), err)
	}

	enabled := true
	code, automationResp := do(t, srv, "POST", "/ec3api/v1/reporting/automations", tok, map[string]interface{}{
		"report_id": reportID, "name": "Daily test", "schedule_code": "DAILY",
		"schedule_time": "08:00", "output_format": "XLSX", "enabled": enabled,
	})
	if code != http.StatusOK || !automationResp.Success {
		t.Fatalf("report automation failed: %d %s", code, automationResp.Message)
	}

	code, runsResp := do(t, srv, "GET", "/ec3api/v1/reporting/runs", tok, nil)
	if code != http.StatusOK || !runsResp.Success || runsResp.TotalCount == nil || *runsResp.TotalCount == 0 {
		t.Fatalf("report runs failed: %d %s", code, runsResp.Message)
	}
}

func TestTelesignalsEndToEnd(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")

	code, catalogResp := do(t, srv, "GET", "/ec3api/v1/telesignals/catalog", tok, nil)
	if code != http.StatusOK || !catalogResp.Success {
		t.Fatalf("signal catalog failed: %d %s", code, catalogResp.Message)
	}
	var catalog struct {
		Types  []map[string]interface{} `json:"types"`
		Points []map[string]interface{} `json:"points"`
	}
	if err := json.Unmarshal(catalogResp.Data, &catalog); err != nil || len(catalog.Types) == 0 || len(catalog.Points) == 0 {
		t.Fatalf("signal catalog incomplete: types=%d points=%d err=%v", len(catalog.Types), len(catalog.Points), err)
	}

	code, listResp := do(t, srv, "GET", "/ec3api/v1/telesignals/signals?limit=50", tok, nil)
	if code != http.StatusOK || !listResp.Success || listResp.TotalCount == nil || *listResp.TotalCount == 0 {
		t.Fatalf("signal list failed: %d %s", code, listResp.Message)
	}
	var signals []map[string]interface{}
	if err := json.Unmarshal(listResp.Data, &signals); err != nil || len(signals) == 0 {
		t.Fatalf("signal list empty: %v", err)
	}
	signalID := int64(signals[0]["SIGNAL_ID"].(float64))

	code, valueResp := do(t, srv, "POST", "/ec3api/v1/telesignals/history", tok, map[string]interface{}{
		"signal_id": signalID, "value": "1", "comment": "integration", "source": "OPERATOR",
	})
	if code != http.StatusOK || !valueResp.Success {
		t.Fatalf("signal value failed: %d %s", code, valueResp.Message)
	}

	today := time.Now().Format("2006-01-02")
	code, historyResp := do(t, srv, "POST", "/ec3api/v1/telesignals/history/query", tok, map[string]interface{}{
		"signal_ids": []int64{signalID}, "from": today, "to": today, "limit": 100,
	})
	if code != http.StatusOK || !historyResp.Success || historyResp.TotalCount == nil || *historyResp.TotalCount == 0 {
		t.Fatalf("signal history failed: %d %s", code, historyResp.Message)
	}

	blocked := true
	code, stateResp := do(t, srv, "PUT", "/ec3api/v1/telesignals/signals/"+itoa(signalID)+"/state", tok, map[string]interface{}{
		"blocked": blocked, "comment": "maintenance",
	})
	if code != http.StatusOK || !stateResp.Success {
		t.Fatalf("signal block failed: %d %s", code, stateResp.Message)
	}
	blocked = false
	code, stateResp = do(t, srv, "PUT", "/ec3api/v1/telesignals/signals/"+itoa(signalID)+"/state", tok, map[string]interface{}{
		"blocked": blocked, "comment": "",
	})
	if code != http.StatusOK || !stateResp.Success {
		t.Fatalf("signal unblock failed: %d %s", code, stateResp.Message)
	}

	code, commandResp := do(t, srv, "POST", "/ec3api/v1/telesignals/signals/"+itoa(signalID)+"/commands", tok, map[string]interface{}{"action": "DEVICE"})
	if code != http.StatusOK || !commandResp.Success {
		t.Fatalf("signal command failed: %d %s", code, commandResp.Message)
	}
}

func TestSchemesEndToEnd(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")

	code, catalogResp := do(t, srv, "GET", "/ec3api/v1/schemes", tok, nil)
	if code != http.StatusOK || !catalogResp.Success || catalogResp.TotalCount == nil || *catalogResp.TotalCount == 0 {
		t.Fatalf("scheme catalog failed: %d %s", code, catalogResp.Message)
	}
	var catalog []map[string]interface{}
	if err := json.Unmarshal(catalogResp.Data, &catalog); err != nil || len(catalog) == 0 {
		t.Fatalf("scheme catalog empty: %v", err)
	}
	schemeID := int64(catalog[0]["SCHEME_ID"].(float64))

	code, viewResp := do(t, srv, "GET", "/ec3api/v1/schemes/"+itoa(schemeID)+"/view", tok, nil)
	if code != http.StatusOK || !viewResp.Success {
		t.Fatalf("scheme view failed: %d %s", code, viewResp.Message)
	}
	var view struct {
		Layout  map[string]interface{}   `json:"layout"`
		Signals []map[string]interface{} `json:"signals"`
	}
	if err := json.Unmarshal(viewResp.Data, &view); err != nil || len(view.Signals) == 0 || view.Layout["nodes"] == nil {
		t.Fatalf("scheme view incomplete: signals=%d layout=%v err=%v", len(view.Signals), view.Layout, err)
	}
}

func TestLoadControlEndToEnd(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")

	code, catalogResp := do(t, srv, "GET", "/ec3api/v1/loadcontrol/catalog", tok, nil)
	if code != http.StatusOK || !catalogResp.Success {
		t.Fatalf("load-control catalog failed: %d %s", code, catalogResp.Message)
	}
	var catalog struct {
		Points []map[string]interface{} `json:"points"`
	}
	if err := json.Unmarshal(catalogResp.Data, &catalog); err != nil || len(catalog.Points) == 0 {
		t.Fatalf("load-control points empty: %v", err)
	}
	pointID := int64(catalog.Points[0]["POINT_ID"].(float64))

	code, relayResp := do(t, srv, "POST", "/ec3api/v1/loadcontrol/relays/query", tok, map[string]interface{}{"point_ids": []int64{pointID}})
	if code != http.StatusOK || !relayResp.Success || relayResp.TotalCount == nil || *relayResp.TotalCount == 0 {
		t.Fatalf("relay query failed: %d %s", code, relayResp.Message)
	}
	var relays []map[string]interface{}
	_ = json.Unmarshal(relayResp.Data, &relays)
	relayID := int64(relays[0]["RELAY_ID"].(float64))
	code, relayCommandResp := do(t, srv, "POST", "/ec3api/v1/loadcontrol/relays/command", tok, map[string]interface{}{"ids": []int64{relayID}, "action": "DISABLE"})
	if code != http.StatusOK || !relayCommandResp.Success {
		t.Fatalf("relay command failed: %d %s", code, relayCommandResp.Message)
	}
	_, _ = do(t, srv, "POST", "/ec3api/v1/loadcontrol/relays/command", tok, map[string]interface{}{"ids": []int64{relayID}, "action": "ENABLE"})

	code, limitResp := do(t, srv, "POST", "/ec3api/v1/loadcontrol/limits/query", tok, map[string]interface{}{"point_ids": []int64{pointID}})
	if code != http.StatusOK || !limitResp.Success || limitResp.TotalCount == nil || *limitResp.TotalCount == 0 {
		t.Fatalf("limit query failed: %d %s", code, limitResp.Message)
	}
	var limits []map[string]interface{}
	_ = json.Unmarshal(limitResp.Data, &limits)
	limitID := int64(limits[0]["LIMIT_ID"].(float64))
	value := 88.0
	code, limitCommandResp := do(t, srv, "POST", "/ec3api/v1/loadcontrol/limits/command", tok, map[string]interface{}{"ids": []int64{limitID}, "action": "SET", "value": value})
	if code != http.StatusOK || !limitCommandResp.Success {
		t.Fatalf("limit command failed: %d %s", code, limitCommandResp.Message)
	}
}

func TestMeterRegistryEndToEnd(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")

	code, catalogResp := do(t, srv, "GET", "/ec3api/v1/meterregistry/catalog", tok, nil)
	if code != http.StatusOK || !catalogResp.Success {
		t.Fatalf("meter catalog failed: %d %s", code, catalogResp.Message)
	}
	var catalog struct {
		Types []map[string]interface{} `json:"types"`
	}
	if err := json.Unmarshal(catalogResp.Data, &catalog); err != nil || len(catalog.Types) == 0 {
		t.Fatalf("meter types empty: %v", err)
	}
	typeID := int64(catalog.Types[0]["METER_TYPE_ID"].(float64))

	code, createResp := do(t, srv, "POST", "/ec3api/v1/meterregistry/save", tok, map[string]interface{}{
		"meter_type_id": typeID, "meter_number": "E2E-METER-001", "made": "2026-01-15",
		"expl_start": "2026-02-01", "meter_class": "0.5S",
	})
	if code != http.StatusOK || !createResp.Success {
		t.Fatalf("meter create failed: %d %s", code, createResp.Message)
	}
	var created map[string]interface{}
	_ = json.Unmarshal(createResp.Data, &created)
	meterID := int64(created["METER_ID"].(float64))

	code, queryResp := do(t, srv, "POST", "/ec3api/v1/meterregistry/query", tok, map[string]interface{}{
		"search": "E2E-METER-001", "mount_state": "UNMOUNTED", "limit": 25,
	})
	if code != http.StatusOK || !queryResp.Success || queryResp.TotalCount == nil || *queryResp.TotalCount != 1 {
		t.Fatalf("meter query failed: %d %s", code, queryResp.Message)
	}

	code, updateResp := do(t, srv, "POST", "/ec3api/v1/meterregistry/save", tok, map[string]interface{}{
		"meter_id": meterID, "meter_type_id": typeID, "meter_number": "E2E-METER-001",
		"made": "2026-01-15", "expl_start": "2026-02-01", "meter_class": "1.0",
	})
	if code != http.StatusOK || !updateResp.Success {
		t.Fatalf("meter update failed: %d %s", code, updateResp.Message)
	}

	code, deleteResp := do(t, srv, "DELETE", "/ec3api/v1/meterregistry/"+itoa(meterID), tok, nil)
	if code != http.StatusOK || !deleteResp.Success {
		t.Fatalf("meter delete failed: %d %s", code, deleteResp.Message)
	}
}

func TestPointsCRUD(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")

	// create
	code, r := do(t, srv, "POST", "/ec3api/v1/points", tok, map[string]interface{}{
		"POINT_CODE": "TP99", "POINT_NAME": "Тест цэг", "POINT_ENABLED": 1, "POINT_COMMERCIAL": 1,
	})
	if code != 200 || !r.Success {
		t.Fatalf("create point failed: %d %s", code, r.Message)
	}
	var created map[string]interface{}
	_ = json.Unmarshal(r.Data, &created)
	id, _ := created["POINT_ID"].(float64)
	if id == 0 {
		t.Fatalf("expected POINT_ID, got %v", created)
	}
	if created["POINT_NAME"] != "Тест цэг" {
		t.Fatalf("name mismatch: %v", created["POINT_NAME"])
	}

	// get
	code, r = do(t, srv, "GET", "/ec3api/v1/points/"+itoa(int64(id)), tok, nil)
	if code != 200 || !r.Success {
		t.Fatalf("get point failed: %d", code)
	}

	// update
	code, r = do(t, srv, "PUT", "/ec3api/v1/points/"+itoa(int64(id)), tok, map[string]interface{}{
		"POINT_NAME": "Шинэчилсэн",
	})
	if code != 200 || !r.Success {
		t.Fatalf("update failed: %d %s", code, r.Message)
	}
	_ = json.Unmarshal(r.Data, &created)
	if created["POINT_NAME"] != "Шинэчилсэн" {
		t.Fatalf("update not applied: %v", created["POINT_NAME"])
	}

	// missing required field on create
	code, r = do(t, srv, "POST", "/ec3api/v1/points", tok, map[string]interface{}{"POINT_CODE": "X"})
	if code != 400 {
		t.Fatalf("expected 400 for missing POINT_NAME, got %d", code)
	}

	// delete
	code, r = do(t, srv, "DELETE", "/ec3api/v1/points/"+itoa(int64(id)), tok, nil)
	if code != 200 || !r.Success {
		t.Fatalf("delete failed: %d", code)
	}
	code, _ = do(t, srv, "GET", "/ec3api/v1/points/"+itoa(int64(id)), tok, nil)
	if code != 404 {
		t.Fatalf("expected 404 after delete, got %d", code)
	}
}

func TestGridQueryFilterPagination(t *testing.T) {
	srv, pool := setup(t)
	tok := login(t, srv, "admin", "admin123")
	// insert a handful of points
	for i := 0; i < 5; i++ {
		do(t, srv, "POST", "/ec3api/v1/points", tok, map[string]interface{}{
			"POINT_CODE": "G" + itoa(int64(i)), "POINT_NAME": "grid", "POINT_ENABLED": i % 2,
		})
	}
	_ = pool

	// filter POINT_ENABLED = 1
	code, r := do(t, srv, "POST", "/ec3api/v1/points/query", tok, map[string]interface{}{
		"limit": 2, "offset": 0,
		"filters": []map[string]interface{}{{"c": "POINT_ENABLED", "p": "=", "v": 1}},
	})
	if code != 200 || !r.Success {
		t.Fatalf("grid query failed: %d %s", code, r.Message)
	}
	var rows []map[string]interface{}
	_ = json.Unmarshal(r.Data, &rows)
	if len(rows) > 2 {
		t.Fatalf("limit not honored: %d rows", len(rows))
	}
	if r.TotalCount == nil {
		t.Fatal("expected totalCount")
	}
	for _, row := range rows {
		if row["POINT_ENABLED"].(float64) != 1 {
			t.Fatalf("filter not applied: %v", row["POINT_ENABLED"])
		}
	}

	// injection attempt in filter column -> 400
	code, _ = do(t, srv, "POST", "/ec3api/v1/points/query", tok, map[string]interface{}{
		"filters": []map[string]interface{}{{"c": "point_name); DROP TABLE points;--", "p": "=", "v": "x"}},
	})
	if code != 400 {
		t.Fatalf("expected 400 for injection column, got %d", code)
	}
}

func TestRBAC(t *testing.T) {
	srv, _ := setup(t)
	viewer := login(t, srv, "viewer", "viewer123") // has only "reports"

	// viewer can read dictionaries
	code, _ := do(t, srv, "GET", "/ec3api/v1/pointtypes", viewer, nil)
	if code != 200 {
		t.Fatalf("viewer read should be allowed, got %d", code)
	}
	// viewer cannot create points (needs "config")
	code, r := do(t, srv, "POST", "/ec3api/v1/points", viewer, map[string]interface{}{
		"POINT_CODE": "Z1", "POINT_NAME": "nope",
	})
	if code != 403 || r.Success {
		t.Fatalf("expected 403 for viewer create, got %d success=%v", code, r.Success)
	}
}

func itoa(n int64) string {
	b := []byte{}
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	for n > 0 {
		b = append([]byte{byte('0' + n%10)}, b...)
		n /= 10
	}
	if neg {
		b = append([]byte{'-'}, b...)
	}
	return string(b)
}
