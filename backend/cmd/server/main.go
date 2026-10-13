// Command server runs the EC3 backend (Go + PostgreSQL).
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/emcos/ec3-backend/internal/auth"
	"github.com/emcos/ec3-backend/internal/config"
	"github.com/emcos/ec3-backend/internal/db"
	"github.com/emcos/ec3-backend/internal/handlers"
	"github.com/emcos/ec3-backend/internal/resource"
	"github.com/emcos/ec3-backend/internal/router"
)

func main() {
	cfg := config.Load()
	ctx, stopProcess := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stopProcess()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	adminUser := env("SEED_ADMIN_USER", "admin")
	adminPass := env("SEED_ADMIN_PASSWORD", "admin123")
	if err := db.SeedAdmin(ctx, pool, adminUser, adminPass); err != nil {
		log.Fatalf("seed: %v", err)
	}

	mgr := auth.NewManager(cfg.JWTSecret, cfg.JWTTTL)
	reg := resource.NewRegistry()
	resource.RegisterCore(reg)
	resource.RegisterGenerated(reg) // full ~983-endpoint surface
	resource.RegisterExtras(reg)    // deep menu-leaf models (event logs, audit, stats, config)

	if cfg.DeviceSimulation {
		log.Println("device simulation enabled; readings are not device measurements")
		go handlers.RunSimulator(ctx, pool, 15*time.Second)
	}

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           router.New(pool, mgr, reg),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("ec3 backend listening on %s", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("serve: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("shutting down...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
