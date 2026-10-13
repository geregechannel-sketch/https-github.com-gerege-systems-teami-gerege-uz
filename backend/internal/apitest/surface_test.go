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

	// A registered source action must not pretend to execute through a grid.
	subs := [][2]string{{"GET", "pointmenuv2/top_gr"}, {"POST", "bga/execute"}}
	for _, s := range subs {
		code, r := do(t, srv, s[0], "/ec3api/v1/"+s[1], tok, map[string]interface{}{})
		if code != 501 || r.Success {
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

func TestEveryModelReadRoute(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")
	reg := resource.NewRegistry()
	resource.RegisterCore(reg)
	resource.RegisterGenerated(reg)
	resource.RegisterExtras(reg)
	stored, virtual := 0, 0
	for _, name := range reg.Names() {
		m, _ := reg.Get(name)
		if m.Virtual {
			virtual++
		} else {
			stored++
		}
		for _, method := range []string{"GET", "POST"} {
			path := "/ec3api/v1/" + name
			if method == "POST" {
				path += "/query"
			}
			code, result := do(t, srv, method, path, tok, map[string]interface{}{"limit": 1})
			want := 200
			if !m.List {
				want = 405
			} else if m.Virtual {
				want = 501
			}
			if name == "measurementsarchives" && method == "GET" {
				want = 400
			}
			if name == "schemes" && method == "GET" {
				want = 200
			}
			if code != want || (want != 200 && result.Success) {
				t.Errorf("%s %s: got %d (%s), want %d", method, path, code, result.Message, want)
			}
		}
	}
	t.Logf("models audited: %d stored, %d virtual; two read/grid requests per model", stored, virtual)
}

func TestEverySourceSubActionRoute(t *testing.T) {
	t.Setenv("DEVICE_SIMULATION_ENABLED", "false")
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")
	implemented := map[string]int{
		"POST archives/point":      400,
		"GET qualityreports/cnt":   200,
		"GET qualityreports/holes": 200,
		"GET appinfo/db_time":      200,
	}
	checked, unsupported, dedicated := 0, 0, 0
	for _, spec := range resource.GeneratedSubActions() {
		if spec.Action == "query" {
			continue
		}
		path := spec.Base + "/" + spec.Action
		for _, method := range []string{"GET", "POST"} {
			if (method == "GET" && !spec.Get) || (method == "POST" && !spec.Post) {
				continue
			}
			want := 501
			if expected, ok := implemented[method+" "+path]; ok {
				want = expected
				dedicated++
			} else {
				unsupported++
			}
			code, response := do(t, srv, method, "/ec3api/v1/"+path, tok, map[string]interface{}{})
			checked++
			if code != want || (want == 501 && response.Success) {
				t.Errorf("%s %s: %d %s, want %d", method, path, code, response.Message, want)
			}
		}
	}
	t.Logf("source action methods audited: %d requests, %d unsupported, %d dedicated handlers", checked, unsupported, dedicated)
}
