package apitest

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/emcos/ec3-backend/internal/auth"
	"github.com/emcos/ec3-backend/internal/db"
	"github.com/emcos/ec3-backend/internal/resource"
	"github.com/emcos/ec3-backend/internal/router"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func testURL() string {
	if v := os.Getenv("TEST_DATABASE_URL"); v != "" {
		return v
	}
	return "postgres://emcos:emcos@localhost:55432/emcos_test?sslmode=disable"
}

// setup returns a running test server and the pool, with a freshly migrated +
// seeded schema. It skips the test if no test database is reachable.
func setup(t *testing.T) (*httptest.Server, *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	pool, err := db.Connect(ctx, testURL())
	if err != nil {
		t.Skipf("test database unavailable (%v); set TEST_DATABASE_URL", err)
	}
	// hermetic: wipe and rebuild the schema
	if _, err := pool.Exec(ctx, `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`); err != nil {
		t.Fatalf("reset schema: %v", err)
	}
	if err := db.Migrate(ctx, pool); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	if err := db.SeedAdmin(ctx, pool, "admin", "admin123"); err != nil {
		t.Fatalf("seed: %v", err)
	}
	// a limited user with no 'config' privilege (RBAC test)
	hash, _ := bcrypt.GenerateFromPassword([]byte("viewer123"), bcrypt.DefaultCost)
	if _, err := pool.Exec(ctx,
		`INSERT INTO users (user_name, password_hash, privileges) VALUES ('viewer',$1,'["reports"]')`,
		string(hash)); err != nil {
		t.Fatalf("seed viewer: %v", err)
	}

	mgr := auth.NewManager("test-secret", time.Hour)
	reg := resource.NewRegistry()
	resource.RegisterCore(reg)
	srv := httptest.NewServer(router.New(pool, mgr, reg))
	t.Cleanup(func() { srv.Close(); pool.Close() })
	return srv, pool
}

type resp struct {
	Success    bool            `json:"success"`
	Data       json.RawMessage `json:"data"`
	TotalCount *int64          `json:"totalCount"`
	Code       int             `json:"code"`
	Message    string          `json:"message"`
}

func do(t *testing.T, srv *httptest.Server, method, path, token string, body interface{}) (int, resp) {
	t.Helper()
	var rdr io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rdr = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, srv.URL+path, rdr)
	if token != "" {
		req.Header.Set("st-token", token)
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	defer res.Body.Close()
	var r resp
	_ = json.NewDecoder(res.Body).Decode(&r)
	return res.StatusCode, r
}

// login returns a valid st-token for the given user.
func login(t *testing.T, srv *httptest.Server, user, pass string) string {
	t.Helper()
	code, r := do(t, srv, "POST", "/ec3api/v1/user/login", "", map[string]string{"login": user, "password": pass})
	if code != 200 || !r.Success {
		t.Fatalf("login %s failed: code=%d msg=%s", user, code, r.Message)
	}
	var data struct {
		Token string `json:"token"`
	}
	_ = json.Unmarshal(r.Data, &data)
	if data.Token == "" {
		t.Fatal("login returned empty token")
	}
	return data.Token
}

func TestLogin(t *testing.T) {
	srv, _ := setup(t)
	// success
	tok := login(t, srv, "admin", "admin123")
	if tok == "" {
		t.Fatal("empty token")
	}
	// wrong password
	code, r := do(t, srv, "POST", "/ec3api/v1/user/login", "", map[string]string{"login": "admin", "password": "nope"})
	if code != 401 || r.Success {
		t.Fatalf("expected 401, got %d success=%v", code, r.Success)
	}
	// unknown user
	code, _ = do(t, srv, "POST", "/ec3api/v1/user/login", "", map[string]string{"login": "ghost", "password": "x"})
	if code != 401 {
		t.Fatalf("expected 401 for unknown user, got %d", code)
	}
}

func TestAuthRequired(t *testing.T) {
	srv, _ := setup(t)
	code, r := do(t, srv, "GET", "/ec3api/v1/grouptypes", "", nil)
	if code != 401 || r.Success {
		t.Fatalf("expected 401 without token, got %d", code)
	}
	code, _ = do(t, srv, "GET", "/ec3api/v1/grouptypes", "garbage.token.here", nil)
	if code != 401 {
		t.Fatalf("expected 401 with bad token, got %d", code)
	}
}

func TestDictionaryList(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")
	code, r := do(t, srv, "GET", "/ec3api/v1/grouptypes", tok, nil)
	if code != 200 || !r.Success {
		t.Fatalf("grouptypes list failed: %d %s", code, r.Message)
	}
	var rows []map[string]interface{}
	_ = json.Unmarshal(r.Data, &rows)
	if len(rows) == 0 {
		t.Fatal("expected seeded group types")
	}
	if _, ok := rows[0]["GR_TYPE_NAME"]; !ok {
		t.Fatalf("expected UPPER_CASE keys, got %v", rows[0])
	}
	if r.TotalCount == nil || *r.TotalCount != int64(len(rows)) {
		t.Fatalf("totalCount mismatch: %v vs %d", r.TotalCount, len(rows))
	}
}

func TestDashboard(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")
	code, r := do(t, srv, "POST", "/ec3api/v1/homedashboard/data", tok, map[string]interface{}{})
	if code != 200 || !r.Success {
		t.Fatalf("dashboard failed: %d %s", code, r.Message)
	}
	var tiles []map[string]interface{}
	_ = json.Unmarshal(r.Data, &tiles)
	if len(tiles) != 3 {
		t.Fatalf("expected 3 KPI tiles, got %d", len(tiles))
	}
	// seed inserted 1 enabled point -> "1 шт."
	if tiles[0]["STAT"] != "1 шт." {
		t.Fatalf("expected accounting points '1 шт.', got %v", tiles[0]["STAT"])
	}
}

func TestPointsCRUD(t *testing.T) {
	srv, _ := setup(t)
	tok := login(t, srv, "admin", "admin123")

	// create
	code, r := do(t, srv, "POST", "/ec3api/v1/points", tok, map[string]interface{}{
		"POINT_CODE": "TP99", "POINT_NAME": "Тест цэг", "POINT_ENABLED": 1, "POINT_COMMERCIAL": 1,
	})
	if code != 200 || !r.Success {
		t.Fatalf("create point failed: %d %s", code, r.Message)
	}
	var created map[string]interface{}
	_ = json.Unmarshal(r.Data, &created)
	id, _ := created["POINT_ID"].(float64)
	if id == 0 {
		t.Fatalf("expected POINT_ID, got %v", created)
	}
	if created["POINT_NAME"] != "Тест цэг" {
		t.Fatalf("name mismatch: %v", created["POINT_NAME"])
	}

	// get
	code, r = do(t, srv, "GET", "/ec3api/v1/points/"+itoa(int64(id)), tok, nil)
	if code != 200 || !r.Success {
		t.Fatalf("get point failed: %d", code)
	}

	// update
	code, r = do(t, srv, "PUT", "/ec3api/v1/points/"+itoa(int64(id)), tok, map[string]interface{}{
		"POINT_NAME": "Шинэчилсэн",
	})
	if code != 200 || !r.Success {
		t.Fatalf("update failed: %d %s", code, r.Message)
	}
	_ = json.Unmarshal(r.Data, &created)
	if created["POINT_NAME"] != "Шинэчилсэн" {
		t.Fatalf("update not applied: %v", created["POINT_NAME"])
	}

	// missing required field on create
	code, r = do(t, srv, "POST", "/ec3api/v1/points", tok, map[string]interface{}{"POINT_CODE": "X"})
	if code != 400 {
		t.Fatalf("expected 400 for missing POINT_NAME, got %d", code)
	}

	// delete
	code, r = do(t, srv, "DELETE", "/ec3api/v1/points/"+itoa(int64(id)), tok, nil)
	if code != 200 || !r.Success {
		t.Fatalf("delete failed: %d", code)
	}
	code, _ = do(t, srv, "GET", "/ec3api/v1/points/"+itoa(int64(id)), tok, nil)
	if code != 404 {
		t.Fatalf("expected 404 after delete, got %d", code)
	}
}

func TestGridQueryFilterPagination(t *testing.T) {
	srv, pool := setup(t)
	tok := login(t, srv, "admin", "admin123")
	// insert a handful of points
	for i := 0; i < 5; i++ {
		do(t, srv, "POST", "/ec3api/v1/points", tok, map[string]interface{}{
			"POINT_CODE": "G" + itoa(int64(i)), "POINT_NAME": "grid", "POINT_ENABLED": i % 2,
		})
	}
	_ = pool

	// filter POINT_ENABLED = 1
	code, r := do(t, srv, "POST", "/ec3api/v1/points/query", tok, map[string]interface{}{
		"limit": 2, "offset": 0,
		"filters": []map[string]interface{}{{"c": "POINT_ENABLED", "p": "=", "v": 1}},
	})
	if code != 200 || !r.Success {
		t.Fatalf("grid query failed: %d %s", code, r.Message)
	}
	var rows []map[string]interface{}
	_ = json.Unmarshal(r.Data, &rows)
	if len(rows) > 2 {
		t.Fatalf("limit not honored: %d rows", len(rows))
	}
	if r.TotalCount == nil {
		t.Fatal("expected totalCount")
	}
	for _, row := range rows {
		if row["POINT_ENABLED"].(float64) != 1 {
			t.Fatalf("filter not applied: %v", row["POINT_ENABLED"])
		}
	}

	// injection attempt in filter column -> 400
	code, _ = do(t, srv, "POST", "/ec3api/v1/points/query", tok, map[string]interface{}{
		"filters": []map[string]interface{}{{"c": "point_name); DROP TABLE points;--", "p": "=", "v": "x"}},
	})
	if code != 400 {
		t.Fatalf("expected 400 for injection column, got %d", code)
	}
}

func TestRBAC(t *testing.T) {
	srv, _ := setup(t)
	viewer := login(t, srv, "viewer", "viewer123") // has only "reports"

	// viewer can read dictionaries
	code, _ := do(t, srv, "GET", "/ec3api/v1/pointtypes", viewer, nil)
	if code != 200 {
		t.Fatalf("viewer read should be allowed, got %d", code)
	}
	// viewer cannot create points (needs "config")
	code, r := do(t, srv, "POST", "/ec3api/v1/points", viewer, map[string]interface{}{
		"POINT_CODE": "Z1", "POINT_NAME": "nope",
	})
	if code != 403 || r.Success {
		t.Fatalf("expected 403 for viewer create, got %d success=%v", code, r.Success)
	}
}

func itoa(n int64) string {
	b := []byte{}
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	for n > 0 {
		b = append([]byte{byte('0' + n%10)}, b...)
		n /= 10
	}
	if neg {
		b = append([]byte{'-'}, b...)
	}
	return string(b)
}
