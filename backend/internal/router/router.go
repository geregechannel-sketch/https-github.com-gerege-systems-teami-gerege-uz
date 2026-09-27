package router

import (
	"net/http"

	"github.com/emcos/ec3-backend/internal/auth"
	"github.com/emcos/ec3-backend/internal/handlers"
	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/emcos/ec3-backend/internal/resource"
	"github.com/jackc/pgx/v5/pgxpool"
)

const base = "/ec3api/v1/"

// New builds the ec3api HTTP handler.
func New(pool *pgxpool.Pool, mgr *auth.Manager, reg *resource.Registry) http.Handler {
	mux := http.NewServeMux()
	rh := resource.NewHandler(pool, reg)
	authH := handlers.NewAuth(pool, mgr)
	dash := handlers.NewDashboard(pool)
	quality := handlers.NewQuality(pool)
	readings := handlers.NewReadings(pool)
	events := handlers.NewEventLog(pool)
	reporting := handlers.NewReporting(pool)
	telesignals := handlers.NewTelesignals(pool)
	schemes := handlers.NewSchemes(pool)
	loadControl := handlers.NewLoadControl(pool)
	meterRegistry := handlers.NewMeterRegistry(pool)
	us := handlers.NewUserSettings(pool)

	protected := func(fn http.HandlerFunc) http.Handler {
		return mgr.Middleware(fn)
	}

	// Health (no auth)
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			httpx.Fail(w, http.StatusServiceUnavailable, "db down")
			return
		}
		httpx.OK(w, map[string]interface{}{"status": "ok"})
	})

	// Auth (login is public; change_pw protected)
	mux.HandleFunc("POST "+base+"user/login", authH.Login)
	mux.Handle("POST "+base+"user/change_pw", protected(authH.ChangePw))

	// Dashboard
	mux.Handle("GET "+base+"homedashboard/query", protected(dash.Query))
	mux.Handle("POST "+base+"homedashboard/data", protected(dash.Data))

	// User settings
	mux.Handle("GET "+base+"usersettings", protected(us.List))
	mux.Handle("POST "+base+"usersettings", protected(us.Save))
	mux.Handle("DELETE "+base+"usersettings/{id}", protected(us.Delete))

	// appinfo/db_time (nice-to-have, protected)
	mux.Handle("GET "+base+"appinfo/db_time", protected(func(w http.ResponseWriter, r *http.Request) {
		var t string
		_ = pool.QueryRow(r.Context(), "SELECT to_char(now(),'YYYY-MM-DD HH24:MI:SS')").Scan(&t)
		httpx.OK(w, map[string]interface{}{"DB_TIME": t})
	}))

	// Track registered "METHOD pattern" to avoid duplicate mounts (panic).
	seen := map[string]bool{}
	handle := func(pattern string, h http.Handler) {
		if seen[pattern] {
			return
		}
		seen[pattern] = true
		mux.Handle(pattern, h)
	}

	// Quality reports use source-compatible response shapes instead of the
	// generic sub-action envelope.
	handle("GET "+base+"qualityreports/cnt", protected(quality.Count))
	handle("GET "+base+"qualityreports/holes", protected(quality.Holes))

	// Reading collection keeps the source TEAMI filter, archive and DAS task
	// flows behind a compact domain API.
	handle("GET "+base+"readings/filter", protected(readings.Filter))
	handle("POST "+base+"readings/query", protected(readings.Query))
	handle("POST "+base+"readings/tasks", protected(readings.CreateTask))
	handle("GET "+base+"readings/jobs", protected(readings.Jobs))

	// Event register preserves TEAMI's category, date, source and detail flow.
	handle("POST "+base+"eventlog/query", protected(events.Query))
	handle("GET "+base+"eventlog/summary", protected(events.Summary))
	handle("GET "+base+"eventlog/{id}", protected(events.Detail))

	// Reports use a domain API for catalog, previews, schedules and run history.
	handle("GET "+base+"reporting/catalog", protected(reporting.Catalog))
	handle("POST "+base+"reporting/preview", protected(reporting.Preview))
	handle("GET "+base+"reporting/runs", protected(reporting.Runs))
	handle("GET "+base+"reporting/runs/{id}", protected(reporting.RunResult))
	handle("GET "+base+"reporting/automations", protected(reporting.Automations))
	handle("POST "+base+"reporting/automations", protected(reporting.CreateAutomation))
	handle("PUT "+base+"reporting/automations/{id}", protected(reporting.UpdateAutomation))

	// Telesignals preserve the registry, history and operator-control workflows.
	handle("GET "+base+"telesignals/catalog", protected(telesignals.Catalog))
	handle("GET "+base+"telesignals/signals", protected(telesignals.List))
	handle("GET "+base+"telesignals/signals/{id}", protected(telesignals.Get))
	handle("POST "+base+"telesignals/signals", protected(telesignals.Create))
	handle("PUT "+base+"telesignals/signals/{id}", protected(telesignals.Update))
	handle("DELETE "+base+"telesignals/signals/{id}", protected(telesignals.Delete))
	handle("PUT "+base+"telesignals/signals/{id}/state", protected(telesignals.State))
	handle("POST "+base+"telesignals/signals/{id}/commands", protected(telesignals.Command))
	handle("GET "+base+"telesignals/types", protected(telesignals.Types))
	handle("POST "+base+"telesignals/types", protected(telesignals.CreateType))
	handle("PUT "+base+"telesignals/types/{id}", protected(telesignals.UpdateType))
	handle("DELETE "+base+"telesignals/types/{id}", protected(telesignals.DeleteType))
	handle("POST "+base+"telesignals/history/query", protected(telesignals.History))
	handle("POST "+base+"telesignals/history", protected(telesignals.AddHistory))
	handle("PUT "+base+"telesignals/history/{id}", protected(telesignals.UpdateHistory))
	handle("GET "+base+"telesignals/rules", protected(telesignals.Rules))
	handle("POST "+base+"telesignals/rules", protected(telesignals.CreateRule))
	handle("DELETE "+base+"telesignals/rules/{id}", protected(telesignals.DeleteRule))

	// Mnemonic diagrams combine a stored layout with current telesignal states.
	handle("GET "+base+"schemes", protected(schemes.Catalog))
	handle("GET "+base+"schemes/{id}/view", protected(schemes.View))

	// Load control preserves relay and device-limit operator workflows.
	handle("GET "+base+"loadcontrol/catalog", protected(loadControl.Catalog))
	handle("POST "+base+"loadcontrol/relays/query", protected(loadControl.Relays))
	handle("POST "+base+"loadcontrol/limits/query", protected(loadControl.Limits))
	handle("POST "+base+"loadcontrol/relays/command", protected(loadControl.RelayCommand))
	handle("POST "+base+"loadcontrol/limits/command", protected(loadControl.LimitCommand))

	// Meter registry joins classifier, mounting and point data into one workflow.
	handle("GET "+base+"meterregistry/catalog", protected(meterRegistry.Catalog))
	handle("POST "+base+"meterregistry/query", protected(meterRegistry.Query))
	handle("POST "+base+"meterregistry/save", protected(meterRegistry.Save))
	handle("DELETE "+base+"meterregistry/{id}", protected(meterRegistry.Delete))

	// Dedicated archive reads take precedence over generated grid placeholders.
	archive := handlers.NewArchives(pool)
	handle("POST "+base+"archives/point", protected(archive.Point))
	handle("GET "+base+"measurementsarchives", protected(archive.Parameters))

	// Bulk import (admin): POST /ec3api/v1/admin/import/{model}
	mux.Handle("POST "+base+"admin/import/{model}", protected(func(w http.ResponseWriter, r *http.Request) {
		m, ok := reg.Get(r.PathValue("model"))
		if !ok {
			httpx.Fail(w, http.StatusNotFound, "unknown model")
			return
		}
		rh.Import(w, r, m)
	}))

	// Generic base model routes (CRUD + grid).
	for _, name := range reg.Names() {
		m, _ := reg.Get(name)
		p := base + name
		handle("GET "+p, protected(func(w http.ResponseWriter, r *http.Request) { rh.List(w, r, m) }))
		handle("POST "+p+"/query", protected(func(w http.ResponseWriter, r *http.Request) { rh.Query(w, r, m) }))
		handle("GET "+p+"/{id}", protected(func(w http.ResponseWriter, r *http.Request) { rh.GetOne(w, r, m, r.PathValue("id")) }))
		handle("POST "+p, protected(func(w http.ResponseWriter, r *http.Request) { rh.Create(w, r, m) }))
		handle("PUT "+p+"/{id}", protected(func(w http.ResponseWriter, r *http.Request) { rh.Update(w, r, m, r.PathValue("id")) }))
		handle("DELETE "+p+"/{id}", protected(func(w http.ResponseWriter, r *http.Request) { rh.Delete(w, r, m, r.PathValue("id")) }))
	}

	// Generic sub-action routes ({model}/{action}) for the full endpoint surface.
	for _, sa := range resource.GeneratedSubActions() {
		if sa.Action == "query" {
			continue // reserved for the grid route above
		}
		baseModel, _ := reg.Get(sa.Base)
		p := base + sa.Base + "/" + sa.Action
		bm := baseModel
		if sa.Get {
			handle("GET "+p, protected(func(w http.ResponseWriter, r *http.Request) { rh.SubAction(w, r, bm) }))
		}
		if sa.Post {
			handle("POST "+p, protected(func(w http.ResponseWriter, r *http.Request) { rh.SubAction(w, r, bm) }))
		}
	}

	return cors(mux)
}

// cors allows the SPA frontend to call the API with the st-token header.
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, st-token")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
