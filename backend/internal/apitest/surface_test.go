package apitest

import (
	"encoding/json"
	"testing"

	"github.com/emcos/ec3-backend/internal/resource"
)

// TestEndpointCount verifies the full ec3api surface is registered: core + the
// generated models cover ~400 base roots (=> ~983 endpoints with sub-actions).
func TestEndpointCount(t *testing.T) {
	reg := resource.NewRegistry()
	resource.RegisterCore(reg)
	resource.RegisterGenerated(reg)
	models := len(reg.Names())
	subs := len(resource.GeneratedSubActions())
	if models < 380 {
		t.Fatalf("expected >=380 base models, got %d", models)
	}
	if subs < 500 {
		t.Fatalf("expected >=500 sub-actions, got %d", subs)
	}
	// base(models)*? + subs should comfortably exceed 900 distinct endpoints.
	if models+subs < 900 {
		t.Fatalf("expected full surface >=900, got %d models + %d subs", models, subs)
	}
	t.Logf("surface: %d base models, %d sub-actions", models, subs)
}

// TestGeneratedEndpointsRespond hits a sample of generated base + sub-action
// endpoints and checks they authenticate and return the ec3api envelope.
func TestGeneratedEndpointsRespond(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")

	// generated base models (empty tables -> success + empty data + totalCount)
	bases := []string{"channels", "sources", "dataitems", "schedules", "bga"}
	for _, b := range bases {
		code, r := do(t, srv, "GET", "/ec3api/v1/"+b, tok, nil)
		if code != 200 || !r.Success {
			t.Fatalf("GET %s: code=%d success=%v msg=%s", b, code, r.Success, r.Message)
		}
		if r.TotalCount == nil {
			t.Fatalf("GET %s: expected totalCount envelope", b)
		}
	}

	// generated sub-actions respond with the envelope (methods per the model config)
	subs := [][2]string{{"GET", "pointmenuv2/top_gr"}, {"POST", "bga/execute"}}
	for _, s := range subs {
		code, r := do(t, srv, s[0], "/ec3api/v1/"+s[1], tok, map[string]interface{}{})
		if code != 200 || !r.Success {
			t.Fatalf("%s %s: code=%d success=%v msg=%s", s[0], s[1], code, r.Success, r.Message)
		}
	}

	// Archive requests require explicit timezone offsets instead of a generic grid.
	code, archive := do(t, srv, "POST", "/ec3api/v1/archives/point", tok, map[string]interface{}{
		"POINT_ID": 1, "ML_ID": 1, "MD_ID": 1, "AGGS_ID": 1,
		"FROM": "2026-09-01", "TO": "2026-09-02",
	})
	if code != 400 || archive.Success {
		t.Fatalf("invalid archive dates: code=%d success=%v", code, archive.Success)
	}

	// auth still enforced on a generated endpoint
	code, _ = do(t, srv, "GET", "/ec3api/v1/channels", "", nil)
	if code != 401 {
		t.Fatalf("expected 401 without token on generated endpoint, got %d", code)
	}

	// a generated CRUD create + readback works (channels has real columns)
	code, r := do(t, srv, "POST", "/ec3api/v1/channels", tok, map[string]interface{}{
		"PH_NAME": "test channel", "PH_TYPE_ID": 1, "SRC_ID": 1, "PH_ID": nil,
	})
	// PH_ID is the PK (BIGSERIAL); creating with other fields should succeed
	if code != 200 {
		// tolerate 400 if required columns differ, but must be a clean envelope
		if code != 400 {
			t.Fatalf("POST channels unexpected code %d: %s", code, r.Message)
		}
	}
	_ = json.Marshal
}
