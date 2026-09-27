package apitest

import (
	"context"
	"errors"
	"testing"

	"github.com/emcos/ec3-backend/internal/db"
	"github.com/jackc/pgx/v5/pgconn"
)

func TestAuditSurvivesRestartAndRejectsSQLMutation(t *testing.T) {
	_, pool := setup(t)
	ctx := context.Background()
	for _, table := range []string{"audit_log", "audit_files", "user_sessions"} {
		var n int
		if err := pool.QueryRow(ctx, "SELECT count(*) FROM "+table).Scan(&n); err != nil || n != 0 {
			t.Fatalf("new database must not fabricate %s records", table)
		}
	}
	if _, err := pool.Exec(ctx, `INSERT INTO audit_log(aud_time,aud_detail) VALUES ('2026-09-01T00:00:00Z','retained-fixture'); INSERT INTO audit_files(af_time,af_file) VALUES ('2026-09-01T00:00:00Z','retained-fixture'); INSERT INTO user_sessions(us_user) VALUES ('retained-fixture')`); err != nil {
		t.Fatal(err)
	}
	if err := db.Migrate(ctx, pool); err != nil {
		t.Fatalf("restart migrations: %v", err)
	}
	for _, table := range []string{"audit_log", "audit_files", "user_sessions"} {
		var n int
		if err := pool.QueryRow(ctx, "SELECT count(*) FROM "+table).Scan(&n); err != nil || n != 1 {
			t.Fatalf("restart changed %s", table)
		}
	}
	for _, statement := range []string{
		"UPDATE audit_log SET aud_detail='changed'",
		"DELETE FROM audit_log", "TRUNCATE audit_log",
		"UPDATE audit_files SET af_file='changed'",
		"DELETE FROM audit_files", "TRUNCATE audit_files",
	} {
		_, err := pool.Exec(ctx, statement)
		var pgerr *pgconn.PgError
		if !errors.As(err, &pgerr) || pgerr.Code != "42501" {
			t.Fatalf("expected mutation rejection for %s: %v", statement, err)
		}
	}
	var detail string
	if err := pool.QueryRow(ctx, "SELECT aud_detail FROM audit_log").Scan(&detail); err != nil || detail != "retained-fixture" {
		t.Fatal("audit evidence changed")
	}
}

func TestTariffVerificationFailsExplicitly(t *testing.T) {
	srv, _ := setup(t)
	token := login(t, srv, "admin", "admin123")
	for _, action := range []string{"verification", "grc_rule"} {
		for _, method := range []string{"GET", "POST"} {
			code, result := do(t, srv, method, "/ec3api/v1/tarifflists/"+action, token, nil)
			if code != 501 || result.Success {
				t.Fatalf("unimplemented tariff action must not report success: %s %s %d", method, action, code)
			}
		}
	}
}
