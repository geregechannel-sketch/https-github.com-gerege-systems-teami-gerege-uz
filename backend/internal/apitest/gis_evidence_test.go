package apitest

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/emcos/ec3-backend/internal/handlers"
)

func TestGISAvailabilityUsesObservationsRatherThanConfiguration(t *testing.T) {
	t.Setenv("DEVICE_SIMULATION_ENABLED", "false")
	srv, pool := setup(t)
	tok := login(t, srv, "admin", "admin123")
	ctx := context.Background()
	code, reference := do(t, srv, "GET", "/ec3api/v1/gis/reference", "", nil)
	if code != 401 || reference.Success {
		t.Fatal("recorded source data exposed without authentication")
	}
	code, reference = do(t, srv, "GET", "/ec3api/v1/gis/reference", tok, nil)
	var geometry struct {
		Kind       string `json:"kind"`
		CapturedAt string `json:"capturedAt"`
	}
	if err := json.Unmarshal(reference.Data, &geometry); err != nil || code != 200 || geometry.Kind != "recorded-gis-response" || geometry.CapturedAt == "" {
		t.Fatal("GIS reference is not a dated, authenticated recording")
	}
	if err := handlers.SimulateTick(ctx, pool); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO reading_values(point_id,parameter_code,reading_time,reading_value,unit,status,source) SELECT point_id,'A_PLUS',now()-interval '2 seconds',999,'kWh','OK','COLLECT' FROM points ORDER BY point_id LIMIT 1`); err != nil {
		t.Fatal(err)
	}
	_, response := do(t, srv, "GET", "/ec3api/v1/gis/availability", tok, nil)
	var records []map[string]interface{}
	if err := json.Unmarshal(response.Data, &records); err != nil || len(records) != 87 {
		t.Fatalf("GIS observations unavailable: %v", err)
	}
	for _, row := range records {
		if row["LAST_READING_AT"] != nil {
			t.Fatal("simulator or configuration flag claimed recent readings")
		}
	}
	point := int64(records[0]["POINT_ID"].(float64))
	_, err := pool.Exec(ctx, `INSERT INTO reading_values(point_id,parameter_code,reading_time,reading_value,unit,status,source) VALUES($1,'A_PLUS',now()-interval '1 minute',0,'kWh','OK','INTEGRATION')`, point)
	if err != nil {
		t.Fatal(err)
	}
	_, response = do(t, srv, "GET", "/ec3api/v1/gis/availability", tok, nil)
	if err := json.Unmarshal(response.Data, &records); err != nil {
		t.Fatal(err)
	}
	recent := 0
	for _, row := range records {
		if row["LAST_READING_AT"] != nil {
			recent++
			if int64(row["POINT_ID"].(float64)) != point {
				t.Fatal("availability attached to wrong point")
			}
		}
	}
	if recent != 1 {
		t.Fatalf("expected exactly one observed point, got %d", recent)
	}
}
