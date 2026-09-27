package apitest

import (
	"context"
	"encoding/json"
	"testing"
)

func TestArchiveFiltersAndPreservesValues(t *testing.T) {
	srv, pool := setup(t)
	tok := login(t, srv, "admin", "admin123")
	var point int64
	if err := pool.QueryRow(context.Background(), "SELECT point_id FROM points ORDER BY point_id LIMIT 1").Scan(&point); err != nil {
		t.Fatal(err)
	}
	_, err := pool.Exec(context.Background(), `INSERT INTO archive_samples(point_id,ml_id,md_id,aggs_id,begin_time,end_time,value,unit,source_status,source_ref) VALUES
	($1,7,8,9,'2026-09-01T00:00:00+08:00','2026-09-01T00:30:00+08:00',123456789.123456789,'kWh','ORIGINAL','test-fixture'),
	($1,7,8,9,'2026-09-02T00:00:00+08:00','2026-09-02T00:30:00+08:00',2,'kWh','GENERATED','test-fixture'),
	($1,70,8,9,'2026-09-01T00:00:00+08:00','2026-09-01T00:30:00+08:00',3,'kW','UNKNOWN','test-fixture')`, point)
	if err != nil {
		t.Fatal(err)
	}
	request := map[string]interface{}{"POINT_ID": point, "ML_ID": 7, "MD_ID": 8, "AGGS_ID": 9, "FROM": "2026-09-01T00:00:00+08:00", "TO": "2026-09-02T00:00:00+08:00"}
	code, result := do(t, srv, "POST", "/ec3api/v1/archives/point", tok, request)
	if code != 200 || !result.Success || result.TotalCount == nil || *result.TotalCount != 1 {
		t.Fatalf("filtered archive: %d %s", code, result.Message)
	}
	var rows []map[string]interface{}
	if err := json.Unmarshal(result.Data, &rows); err != nil {
		t.Fatal(err)
	}
	if rows[0]["VALUE"] != "123456789.123456789" || rows[0]["UNIT"] != "kWh" || rows[0]["SOURCE_STATUS"] != "ORIGINAL" || rows[0]["BT"] != "2026-08-31T16:00:00Z" {
		t.Fatalf("archive value, unit, status or timezone changed: %v", rows)
	}
	request["FROM"] = "2026-09-01T00:15:00+08:00"
	request["INCLUDE_OVERLAP"] = true
	code, result = do(t, srv, "POST", "/ec3api/v1/archives/point", tok, request)
	if code != 200 || result.TotalCount == nil || *result.TotalCount != 1 {
		t.Fatal("coverage query must include an interval crossing the start boundary")
	}
	request["INCLUDE_OVERLAP"] = false
	code, result = do(t, srv, "POST", "/ec3api/v1/archives/point", tok, request)
	if code != 200 || result.TotalCount == nil || *result.TotalCount != 0 {
		t.Fatal("normal query must continue selecting by interval start")
	}
	request["FROM"] = "2026-09-01T00:00:00+08:00"
	request["ML_ID"] = 99
	code, result = do(t, srv, "POST", "/ec3api/v1/archives/point", tok, request)
	if code != 200 || !result.Success || result.TotalCount == nil || *result.TotalCount != 0 {
		t.Fatal("different parameter must not return unrelated readings")
	}
	request["FROM"] = "2026-09-01"
	code, _ = do(t, srv, "POST", "/ec3api/v1/archives/point", tok, request)
	if code != 400 {
		t.Fatal("timezone-free date must be rejected")
	}
	code, _ = do(t, srv, "POST", "/ec3api/v1/archives/point", "", request)
	if code != 401 {
		t.Fatal("unauthenticated archive read must be rejected")
	}
}
