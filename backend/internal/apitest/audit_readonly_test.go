package apitest

import "testing"

func TestAuditRejectsGenericWritesAndImport(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")
	for _, model := range []string{"audit", "audit_files", "user_sessions"} {
		code, before := do(t, srv, "GET", "/ec3api/v1/"+model, tok, nil)
		if code != 200 || !before.Success {
			t.Fatalf("cannot read %s", model)
		}
		for _, op := range [][2]string{
			{"POST", "/ec3api/v1/" + model},
			{"PUT", "/ec3api/v1/" + model + "/1"},
			{"DELETE", "/ec3api/v1/" + model + "/1"},
			{"POST", "/ec3api/v1/admin/import/" + model + "?replace=1"},
		} {
			code, result := do(t, srv, op[0], op[1], tok, []map[string]interface{}{})
			if (code != 403 && code != 405) || result.Success {
				t.Fatalf("%s %s must reject writes: %d", op[0], op[1], code)
			}
		}
		code, after := do(t, srv, "GET", "/ec3api/v1/"+model, tok, nil)
		if code != 200 || !after.Success || before.TotalCount == nil || after.TotalCount == nil || *before.TotalCount != *after.TotalCount {
			t.Fatalf("%s changed after rejected writes", model)
		}
	}
}
