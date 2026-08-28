package db

import (
	"context"
	"embed"
	"fmt"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Connect opens a pgx pool and verifies connectivity.
func Connect(ctx context.Context, url string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}

// Migrate runs every embedded *.sql migration in filename order (idempotent DDL).
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return err
	}
	var files []string
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)
	for _, f := range files {
		b, err := migrationsFS.ReadFile("migrations/" + f)
		if err != nil {
			return err
		}
		if _, err := pool.Exec(ctx, string(b)); err != nil {
			return fmt.Errorf("migration %s: %w", f, err)
		}
	}
	return nil
}

// SeedAdmin ensures a default admin user exists (bcrypt password). Idempotent.
// Also seeds a small demo tree (Mongolia > Choibalsan) with a point + meter.
func SeedAdmin(ctx context.Context, pool *pgxpool.Pool, username, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO users (user_name, password_hash, privileges, company, department)
		VALUES ($1, $2, '["*"]', 'TOSH ELECTROAPPARAT', 'Choibalsan')
		ON CONFLICT (user_name) DO NOTHING`, username, string(hash)); err != nil {
		return err
	}

	// Demo group tree + one point + one meter mounting (only if points empty).
	var n int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM points`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	_, err = pool.Exec(ctx, `
		WITH country AS (
			INSERT INTO groups (gr_code, gr_name, gr_type_id, is_public)
			VALUES ('MN','Монголия',(SELECT gr_type_id FROM group_types WHERE gr_type_code='COUNTRY'),1)
			RETURNING gr_id),
		city AS (
			INSERT INTO groups (gr_code, gr_name, gr_type_id, parent_gr_id, is_public)
			VALUES ('CB','г.Чойбалсан, ЖКН№8',(SELECT gr_type_id FROM group_types WHERE gr_type_code='REGION'),(SELECT gr_id FROM country),1)
			RETURNING gr_id),
		pt AS (
			INSERT INTO points (point_code, point_name, point_type_id, ec_id, gr_id,
				point_enabled, point_commercial, point_auto_read_enabled, point_licensed)
			VALUES ('TP43','ТП 43 ЖКН№8',
				(SELECT point_type_id FROM point_types WHERE point_type_code='COMMERCIAL'),
				(SELECT ec_id FROM eco_categories WHERE ec_code='IN'),
				(SELECT gr_id FROM city), 1,1,1,1)
			RETURNING point_id),
		mt AS (
			INSERT INTO meters (meter_type_id, meter_number, made, expl_start, meter_class)
			VALUES ((SELECT meter_type_id FROM meter_types WHERE meter_type_name='EMCOS-3F'),
				'SN-00291','2022-01-01','2022-03-01','0.5S')
			RETURNING meter_id)
		INSERT INTO mountings (meter_id, point_id, mou_bt)
		SELECT (SELECT meter_id FROM mt), (SELECT point_id FROM pt), now()`)
	return err
}
