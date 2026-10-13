package apitest

import (
	"context"
	"encoding/json"
	"testing"
)

func TestReportsDoNotManufactureReadingsOrLosses(t *testing.T) {
	t.Setenv("DEVICE_SIMULATION_ENABLED", "false")
	srv, pool := setup(t)
	tok := login(t, srv, "admin", "admin123")
	for _, codeName := range []string{"DAILY_CONSUMPTION", "END_OF_DAY", "TECHNICAL_VALUES", "POINT_BALANCE", "ARCHIVE_QUALITY"} {
		var id int64
		if err := pool.QueryRow(context.Background(), `SELECT report_id FROM report_definitions WHERE report_code=$1`, codeName).Scan(&id); err != nil {
			t.Fatal(err)
		}
		code, result := do(t, srv, "POST", "/ec3api/v1/reporting/preview", tok, map[string]interface{}{"report_id": id, "from": "2026-09-14", "to": "2026-09-14"})
		if code != 200 || !result.Success {
			t.Fatalf("%s preview failed: %d %s", codeName, code, result.Message)
		}
		var data struct {
			Rows []map[string]interface{} `json:"rows"`
		}
		if err := json.Unmarshal(result.Data, &data); err != nil || len(data.Rows) == 0 {
			t.Fatalf("%s report rows unavailable: %v", codeName, err)
		}
		for _, row := range data.Rows {
			for _, key := range []string{"CONSUMPTION", "A_PLUS", "A_MINUS", "R_PLUS", "R_MINUS", "VOLTAGE", "CURRENT", "FREQUENCY", "INPUT", "LOSSES", "BALANCE", "LOSS_PERCENT", "EXPECTED", "MISSING", "COMPLETENESS"} {
				if value, exists := row[key]; exists && value != nil {
					t.Errorf("%s fabricated %s=%v", codeName, key, value)
				}
			}
		}
	}
}
