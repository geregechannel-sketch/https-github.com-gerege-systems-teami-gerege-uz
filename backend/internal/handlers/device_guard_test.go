package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDisconnectedDeviceCommandsHaveNoSideEffects(t *testing.T) {
	t.Setenv("DEVICE_SIMULATION_ENABLED", "false")
	// A nil pool makes any accidental persistence before rejection fail the test.
	for _, tc := range []struct {
		name, body string
		handler    http.HandlerFunc
	}{
		{"collection", `{"action":"COLLECT","from":"2026-09-14","to":"2026-09-14"}`, NewReadings(nil).CreateTask},
		{"relay", `{"action":"ENABLE","ids":[1]}`, NewLoadControl(nil).RelayCommand},
		{"device read", `{"action":"READ_DEVICE","ids":[1]}`, NewLoadControl(nil).RelayCommand},
		{"limit write", `{"action":"INITIATE","ids":[1]}`, NewLoadControl(nil).LimitCommand},
		{"signal", `{"action":"SEND"}`, NewTelesignals(nil).Command},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/commands", strings.NewReader(tc.body))
			req.SetPathValue("id", "1")
			w := httptest.NewRecorder()
			tc.handler(w, req)
			if w.Code != http.StatusNotImplemented || !strings.Contains(w.Body.String(), `"success":false`) {
				t.Fatalf("unexpected device result: %d %s", w.Code, w.Body.String())
			}
		})
	}
}
