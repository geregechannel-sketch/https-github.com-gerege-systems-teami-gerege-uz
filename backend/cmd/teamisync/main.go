// Command teamisync pulls explicitly mapped TEAMI archives into local storage.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
	_ "time/tzdata"

	"github.com/emcos/ec3-backend/internal/db"
	"github.com/emcos/ec3-backend/internal/teamisource"
)

type selection struct {
	SourcePoint int64  `json:"source_point"`
	SourceML    int64  `json:"source_ml"`
	SourceMD    int64  `json:"source_md"`
	SourceAgg   int64  `json:"source_agg"`
	TargetPoint int64  `json:"target_point"`
	TargetML    int64  `json:"target_ml"`
	TargetMD    int64  `json:"target_md"`
	TargetAgg   int64  `json:"target_agg"`
	Unit        string `json:"unit"`
}

type plan struct {
	SourceRef string      `json:"source_ref"`
	Timezone  string      `json:"timezone"`
	From      string      `json:"from"`
	To        string      `json:"to"`
	Series    []selection `json:"series"`
}

type prepared struct {
	Request teamisource.Request
	Mapping teamisource.Mapping
}

func prepare(r io.Reader) ([]prepared, error) {
	d := json.NewDecoder(io.LimitReader(r, 1024*1024+1))
	d.DisallowUnknownFields()
	var p plan
	if err := d.Decode(&p); err != nil {
		return nil, errors.New("invalid sync plan")
	}
	if err := d.Decode(new(interface{})); err != io.EOF {
		return nil, errors.New("one sync plan required")
	}
	if strings.TrimSpace(p.SourceRef) == "" || p.Timezone == "" || len(p.Series) == 0 || len(p.Series) > 1000 {
		return nil, errors.New("explicit source reference, timezone and 1-1000 series required")
	}
	zone, err := time.LoadLocation(p.Timezone)
	if err != nil || p.Timezone == "Local" {
		return nil, errors.New("explicit source IANA timezone required")
	}
	seen := map[string]bool{}
	queries := make([]prepared, 0, len(p.Series))
	for i, s := range p.Series {
		request, err := teamisource.NewRequest(s.SourcePoint, s.SourceML, s.SourceMD, s.SourceAgg, p.From, p.To)
		if err != nil || s.TargetPoint <= 0 || s.TargetML <= 0 || s.TargetMD <= 0 || s.TargetAgg <= 0 || strings.TrimSpace(s.Unit) == "" {
			return nil, fmt.Errorf("invalid explicit selection at series %d", i)
		}
		key := fmt.Sprintf("%d/%d/%d/%d", s.TargetPoint, s.TargetML, s.TargetMD, s.TargetAgg)
		if seen[key] {
			return nil, fmt.Errorf("duplicate target at series %d", i)
		}
		seen[key] = true
		queries = append(queries, prepared{request, teamisource.Mapping{SourceRef: p.SourceRef, Point: s.TargetPoint, ML: s.TargetML, MD: s.TargetMD, Agg: s.TargetAgg, Unit: s.Unit, Zone: zone}})
	}
	return queries, nil
}

func run(ctx context.Context, path string, out io.Writer) error {
	f, err := os.Open(path)
	if err != nil {
		return errors.New("sync plan unavailable")
	}
	defer f.Close()
	queries, err := prepare(f)
	if err != nil {
		return err
	}
	endpoint, token, databaseURL := os.Getenv("TEAMI_ARCHIVE_ENDPOINT"), os.Getenv("TEAMI_TOKEN"), os.Getenv("DATABASE_URL")
	if endpoint == "" || token == "" || databaseURL == "" {
		return errors.New("TEAMI_ARCHIVE_ENDPOINT, TEAMI_TOKEN and DATABASE_URL must be provisioned")
	}
	pool, err := db.Connect(ctx, databaseURL)
	if err != nil {
		return errors.New("target database unavailable")
	}
	defer pool.Close()
	// The server owns migrations. This command never creates or resets a schema.
	for i, query := range queries {
		result, err := teamisource.PullAndStore(ctx, pool, endpoint, token, query.Request, query.Mapping)
		if err != nil {
			return fmt.Errorf("series %d failed: %w", i, err)
		}
		if err := json.NewEncoder(out).Encode(struct {
			Series int                `json:"series"`
			Result teamisource.Stored `json:"result"`
		}{i, result}); err != nil {
			return errors.New("cannot write sync result")
		}
	}
	return nil
}

func main() {
	path := flag.String("config", "", "explicit source/target archive mapping JSON")
	flag.Parse()
	if *path == "" {
		fmt.Fprintln(os.Stderr, "-config is required")
		os.Exit(2)
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := run(ctx, *path, os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
