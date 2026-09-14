package apitest

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/emcos/ec3-backend/internal/teamisource"
)

const sourceBatch = `{"success":true,"data":[{"POINT_ID":777,"ML_ID":1044,"BT":"2026-09-14 00:00:00","ET":"2026-09-14 00:15:00","VAL":8.460000000000001,"READ_TIME":"2026-09-14 11:58:10","HSS":0,"DSS":"1","SFS":"original","TFF_ID":0},{"POINT_ID":777,"ML_ID":1044,"BT":"2026-09-14 00:15:00","ET":"2026-09-14 00:30:00","VAL":null,"HSS":1},{"POINT_ID":777,"ML_ID":1044,"BT":"2026-09-14 00:30:00","ET":"2026-09-14 00:45:00","VAL":0,"HSS":0}]}`

func TestArchiveStoreIsAtomicAndIdempotent(t *testing.T) {
	srv, pool := setup(t)
	ctx := context.Background()
	var target int64
	if err := pool.QueryRow(ctx, "SELECT point_id FROM points ORDER BY point_id LIMIT 1").Scan(&target); err != nil {
		t.Fatal(err)
	}
	request, err := teamisource.NewRequest(777, 1044, 12, 13, "2026-09-14", "2026-09-14")
	if err != nil {
		t.Fatal(err)
	}
	mapping := teamisource.Mapping{SourceRef: "fixture-only", Point: target, ML: 44, MD: 15, Agg: 15, Unit: "kW", Zone: time.FixedZone("fixture-offset", 8*3600)}
	first, err := teamisource.Store(ctx, pool, request, mapping, []byte(sourceBatch))
	if err != nil || first.Inserted != 2 || first.Missing != 1 {
		t.Fatalf("first import: %+v %v", first, err)
	}
	second, err := teamisource.Store(ctx, pool, request, mapping, []byte(sourceBatch))
	if err != nil || second.Inserted != 0 || second.Unchanged != 2 || second.Receipt != first.Receipt {
		t.Fatalf("replay: %+v %v", second, err)
	}
	var value string
	var begin time.Time
	if err := pool.QueryRow(ctx, "SELECT value::text,begin_time FROM archive_samples WHERE point_id=$1 ORDER BY begin_time LIMIT 1", target).Scan(&value, &begin); err != nil || value != "8.460000000000001" || begin.UTC().Format(time.RFC3339) != "2026-09-13T16:00:00Z" {
		t.Fatal("decimal or timezone not preserved")
	}
	var rawMissing bool
	if err := pool.QueryRow(ctx, "SELECT response->'data'->1->'VAL' = 'null'::jsonb FROM archive_source_receipts WHERE receipt_id=$1", first.Receipt).Scan(&rawMissing); err != nil || !rawMissing {
		t.Fatal("missing source evidence lost")
	}
	// A new row precedes a conflicting correction: neither may be committed.
	extra := `{"POINT_ID":777,"ML_ID":1044,"BT":"2026-09-14 01:00:00","ET":"2026-09-14 01:15:00","VAL":9},`
	conflict := strings.Replace(sourceBatch, `"data":[`, `"data":[`+extra, 1)
	conflict = strings.Replace(conflict, "8.460000000000001", "999", 1)
	if _, err := teamisource.Store(ctx, pool, request, mapping, []byte(conflict)); err == nil {
		t.Fatal("conflicting correction accepted")
	}
	for table, expected := range map[string]int{"archive_samples": 2, "archive_source_receipts": 1} {
		var count int
		if err := pool.QueryRow(ctx, "SELECT count(*) FROM "+table).Scan(&count); err != nil || count != expected {
			t.Fatalf("batch rollback failed for %s: %d", table, count)
		}
	}
	// Verify stored samples are readable through the existing authenticated API.
	token := login(t, srv, "admin", "admin123")
	code, result := do(t, srv, "POST", "/ec3api/v1/archives/point", token, map[string]interface{}{"POINT_ID": target, "ML_ID": 44, "MD_ID": 15, "AGGS_ID": 15, "FROM": "2026-09-14T00:00:00+08:00", "TO": "2026-09-15T00:00:00+08:00"})
	if code != 200 || !result.Success || result.TotalCount == nil || *result.TotalCount != 2 {
		t.Fatal("stored readings not available through local archive API")
	}
	badMapping := mapping
	badMapping.Zone = nil
	if _, err := teamisource.Store(ctx, pool, request, badMapping, []byte(sourceBatch)); err == nil {
		t.Fatal("unverified timezone accepted")
	}
	foreign := strings.ReplaceAll(sourceBatch, `"POINT_ID":777`, `"POINT_ID":778`)
	if _, err := teamisource.Store(ctx, pool, request, mapping, []byte(foreign)); err == nil {
		t.Fatal("foreign source point accepted")
	}
	outside := strings.ReplaceAll(sourceBatch, "2026-09-14", "2026-09-15")
	if _, err := teamisource.Store(ctx, pool, request, mapping, []byte(outside)); err == nil {
		t.Fatal("out-of-period rows accepted")
	}
}
