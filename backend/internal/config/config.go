package config

import (
	"os"
	"time"
)

// BuildCommit is set by the release build, without exposing runtime secrets.
var BuildCommit = "unknown"

// Config holds runtime configuration, read from the environment.
type Config struct {
	DatabaseURL      string
	JWTSecret        string
	JWTTTL           time.Duration
	Addr             string
	DeviceSimulation bool
}

// Load reads configuration from the environment with sensible dev defaults.
func Load() Config {
	return Config{
		DatabaseURL:      env("DATABASE_URL", "postgres://emcos:emcos@localhost:55432/emcos?sslmode=disable"),
		JWTSecret:        env("JWT_SECRET", "dev-insecure-secret-change-me"),
		JWTTTL:           12 * time.Hour, // mirrors the app's short-lived st-token
		Addr:             env("ADDR", ":8080"),
		DeviceSimulation: SimulationEnabled(),
	}
}

// Simulation requires an explicit operator opt-in; production defaults to off.
func SimulationEnabled() bool {
	return os.Getenv("DEVICE_SIMULATION_ENABLED") == "true"
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
