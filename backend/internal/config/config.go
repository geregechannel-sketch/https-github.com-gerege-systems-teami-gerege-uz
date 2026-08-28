package config

import (
	"os"
	"time"
)

// Config holds runtime configuration, read from the environment.
type Config struct {
	DatabaseURL string
	JWTSecret   string
	JWTTTL      time.Duration
	Addr        string
}

// Load reads configuration from the environment with sensible dev defaults.
func Load() Config {
	return Config{
		DatabaseURL: env("DATABASE_URL", "postgres://emcos:emcos@localhost:55432/emcos?sslmode=disable"),
		JWTSecret:   env("JWT_SECRET", "dev-insecure-secret-change-me"),
		JWTTTL:      12 * time.Hour, // mirrors the app's short-lived st-token
		Addr:        env("ADDR", ":8080"),
	}
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
