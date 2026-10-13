package router

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/emcos/ec3-backend/internal/auth"
	"github.com/emcos/ec3-backend/internal/resource"
)

func TestViewerCannotRunOperatorMutations(t *testing.T) {
	reg := resource.NewRegistry()
	resource.RegisterCore(reg)
	resource.RegisterGenerated(reg)
	resource.RegisterExtras(reg)
	mgr := auth.NewManager("unit-test", time.Hour)
	token, err := mgr.Issue(1, "viewer", []string{"reports"})
	if err != nil {
		t.Fatal(err)
	}
	handler := New(nil, mgr, reg)
	for _, tc := range []struct{ method, path string }{
		{"POST", "readings/tasks"}, {"POST", "loadcontrol/relays/command"}, {"POST", "loadcontrol/limits/command"},
		{"POST", "telesignals/signals/1/commands"}, {"PUT", "telesignals/signals/1/state"},
		{"POST", "telesignals/signals"}, {"PUT", "telesignals/signals/1"}, {"DELETE", "telesignals/signals/1"},
		{"POST", "telesignals/types"}, {"PUT", "telesignals/types/1"}, {"DELETE", "telesignals/types/1"},
		{"POST", "telesignals/history"}, {"PUT", "telesignals/history/1"},
		{"POST", "telesignals/rules"}, {"DELETE", "telesignals/rules/1"},
		{"POST", "meterregistry/save"}, {"DELETE", "meterregistry/1"},
		{"POST", "reporting/automations"}, {"PUT", "reporting/automations/1"},
	} {
		req := httptest.NewRequest(tc.method, "/ec3api/v1/"+tc.path, strings.NewReader(`{}`))
		req.Header.Set("st-token", token)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		if w.Code != http.StatusForbidden {
			t.Errorf("%s %s: status %d", tc.method, tc.path, w.Code)
		}
	}
}
