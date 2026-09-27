package teamisource

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestPullUsesCapturedReadContract(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		body, _ := io.ReadAll(r.Body)
		if r.Method != "POST" || r.URL.Path != "/ec3api/v1/archives/point" || r.Header.Get("st-token") != "fixture-only" || !strings.Contains(string(body), `"ML_ID":[1044]`) {
			t.Error("source wire contract changed")
		}
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, example)
	}))
	defer srv.Close()
	request, _ := NewRequest(7, 1044, 12, 13, "2026-09-14", "2026-09-14")
	data, err := Pull(context.Background(), srv.URL+"/ec3api/v1/archives/point", "fixture-only", request)
	if err != nil || string(data) != example || calls.Load() != 1 {
		t.Fatalf("pull failed: %v", err)
	}
	if _, err := Pull(context.Background(), srv.URL+"/ec3api/v1/commands", "fixture-only", request); err == nil || calls.Load() != 1 {
		t.Fatal("non-archive endpoint allowed")
	}
	if _, err := Pull(context.Background(), srv.URL+"/ec3api/v1/archives/point", "", request); err == nil || calls.Load() != 1 {
		t.Fatal("missing credential must stop before network")
	}
}

func TestPullNeverFollowsRedirectOrImportsErrors(t *testing.T) {
	var leaked atomic.Int32
	destination := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		leaked.Add(1)
	}))
	defer destination.Close()
	request, _ := NewRequest(7, 1044, 12, 13, "2026-09-14", "2026-09-14")
	for _, status := range []int{302, 401, 403, 500, 200} {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Location", destination.URL)
			w.WriteHeader(status)
			io.WriteString(w, "private-error-body")
		}))
		_, err := Pull(context.Background(), srv.URL+"/ec3api/v1/archives/point", "fixture-only", request)
		srv.Close()
		if err == nil || strings.Contains(err.Error(), "private-error-body") || strings.Contains(err.Error(), "fixture-only") {
			t.Fatal("error response accepted or private content exposed")
		}
	}
	if leaked.Load() != 0 {
		t.Fatal("redirect destination was contacted")
	}
}
