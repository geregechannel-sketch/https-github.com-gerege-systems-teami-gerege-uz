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

	// appinfo/db_time (nice-to-have, protected)
	mux.Handle("GET "+base+"appinfo/db_time", protected(func(w http.ResponseWriter, r *http.Request) {
		var t string
		_ = pool.QueryRow(r.Context(), "SELECT to_char(now(),'YYYY-MM-DD HH24:MI:SS')").Scan(&t)
		httpx.OK(w, map[string]interface{}{"DB_TIME": t})
	}))

	// Generic model routes.
	for _, name := range reg.Names() {
		m, _ := reg.Get(name)
		p := base + name
		mux.Handle("GET "+p, protected(func(w http.ResponseWriter, r *http.Request) { rh.List(w, r, m) }))
		mux.Handle("POST "+p+"/query", protected(func(w http.ResponseWriter, r *http.Request) { rh.Query(w, r, m) }))
		mux.Handle("GET "+p+"/{id}", protected(func(w http.ResponseWriter, r *http.Request) { rh.GetOne(w, r, m, r.PathValue("id")) }))
		mux.Handle("POST "+p, protected(func(w http.ResponseWriter, r *http.Request) { rh.Create(w, r, m) }))
		mux.Handle("PUT "+p+"/{id}", protected(func(w http.ResponseWriter, r *http.Request) { rh.Update(w, r, m, r.PathValue("id")) }))
		mux.Handle("DELETE "+p+"/{id}", protected(func(w http.ResponseWriter, r *http.Request) { rh.Delete(w, r, m, r.PathValue("id")) }))
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
