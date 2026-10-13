package apitest

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/emcos/ec3-backend/internal/handlers"
)

func TestProductionMonitorRejectsSimulationAndPreservesRealReadings(t *testing.T) {
	t.Setenv("DEVICE_SIMULATION_ENABLED", "false")
	srv, pool := setup(t)
	tok := login(t, srv, "admin", "admin123")
	ctx := context.Background()
	if err := handlers.SimulateTick(ctx, pool); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO reading_values(point_id,parameter_code,reading_time,reading_value,unit,status,source) SELECT point_id,'A_PLUS',now()-CASE WHEN s='COLLECT' THEN interval '2 seconds' ELSE interval '3 seconds' END,999,'kWh','OK',s FROM points CROSS JOIN (VALUES ('COLLECT'),('RECOLLECT')) v(s) ORDER BY point_id LIMIT 2`); err != nil {
		t.Fatal(err)
	}
	code, response := do(t, srv, "GET", "/ec3api/v1/monitor/live", tok, nil)
	var data struct {
		Live  []map[string]interface{} `json:"live"`
		Trend []map[string]interface{} `json:"trend"`
	}
	if err := json.Unmarshal(response.Data, &data); err != nil || code != 200 || len(data.Live) != 0 || len(data.Trend) != 0 {
		t.Fatalf("simulation leaked into production monitor: %d %v", code, err)
	}
	_, err := pool.Exec(ctx, `INSERT INTO reading_values(point_id,parameter_code,reading_time,reading_value,unit,status,source) SELECT point_id,'A_PLUS',now()-interval '1 second',42,'kWh','OK','INTEGRATION' FROM points ORDER BY point_id LIMIT 1`)
	if err != nil {
		t.Fatal(err)
	}
	_, response = do(t, srv, "GET", "/ec3api/v1/monitor/live", tok, nil)
	if err := json.Unmarshal(response.Data, &data); err != nil || len(data.Live) != 1 || data.Live[0]["SOURCE"] != "INTEGRATION" {
		t.Fatalf("real reading unavailable: %v %v", data.Live, err)
	}
}

func TestDemoCollectionNeverOverwritesDeviceRows(t *testing.T) {
	t.Setenv("DEVICE_SIMULATION_ENABLED", "true")
	srv, pool := setup(t)
	tok := login(t, srv, "admin", "admin123")
	ctx := context.Background()
	zone := time.FixedZone("UTC+08", 8*3600)
	now := time.Now().In(zone)
	begin := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, zone)
	var point int64
	if err := pool.QueryRow(ctx, `SELECT point_id FROM points WHERE point_enabled=1 ORDER BY point_id LIMIT 1`).Scan(&point); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO reading_values(point_id,parameter_code,reading_time,reading_value,unit,status,source) VALUES($1,'A_PLUS',$2,42,'kWh','OK','INTEGRATION')`, point, begin); err != nil {
		t.Fatal(err)
	}
	day := begin.Format("2006-01-02")
	code, response := do(t, srv, "POST", "/ec3api/v1/readings/tasks", tok, map[string]interface{}{"action": "RECOLLECT", "point_ids": []int64{point}, "parameters": []string{"A_PLUS"}, "from": day, "to": day})
	if code != 200 || !response.Success {
		t.Fatalf("demo collection failed: %d %s", code, response.Message)
	}
	var value, source string
	if err := pool.QueryRow(ctx, `SELECT reading_value::text,source FROM reading_values WHERE point_id=$1 AND parameter_code='A_PLUS' AND reading_time=$2`, point, begin).Scan(&value, &source); err != nil || value != "42.000000" || source != "INTEGRATION" {
		t.Fatalf("demo overwrote real evidence: %s %s %v", value, source, err)
	}
}

func TestStoredLoadRefreshDoesNotConfirmDevice(t *testing.T) {
	t.Setenv("DEVICE_SIMULATION_ENABLED", "false")
	srv, pool := setup(t)
	tok := login(t, srv, "admin", "admin123")
	var id int64
	var before, after []byte
	if err := pool.QueryRow(context.Background(), `SELECT relay_id,to_jsonb(r) FROM load_control_relays r ORDER BY relay_id LIMIT 1`).Scan(&id, &before); err != nil {
		t.Fatal(err)
	}
	for _, action := range []string{"READ_DB", "STATUS", "READ_DEVICE", "ENABLE"} {
		code, response := do(t, srv, "POST", "/ec3api/v1/loadcontrol/relays/command", tok, map[string]interface{}{"ids": []int64{id}, "action": action})
		want := 200
		if action == "READ_DEVICE" || action == "ENABLE" {
			want = 501
		}
		if code != want {
			t.Fatalf("%s: %d %s", action, code, response.Message)
		}
	}
	if err := pool.QueryRow(context.Background(), `SELECT to_jsonb(r) FROM load_control_relays r WHERE relay_id=$1`, id).Scan(&after); err != nil {
		t.Fatal(err)
	}
	if string(before) != string(after) {
		t.Fatal("database refresh or disconnected command changed device evidence")
	}
	var limit int64
	if err := pool.QueryRow(context.Background(), `SELECT limit_id FROM load_control_limits ORDER BY limit_id LIMIT 1`).Scan(&limit); err != nil {
		t.Fatal(err)
	}
	code, response := do(t, srv, "POST", "/ec3api/v1/loadcontrol/limits/command", tok, map[string]interface{}{"ids": []int64{limit}, "action": "SET", "value": 75})
	if code != 200 || !response.Success {
		t.Fatalf("local limit configuration failed: %d %s", code, response.Message)
	}
	var status string
	if err := pool.QueryRow(context.Background(), `SELECT command_status FROM load_control_limits WHERE limit_id=$1`, limit).Scan(&status); err != nil || status != "CONFIGURED" {
		t.Fatalf("local limit claimed device completion: %s %v", status, err)
	}
}
