package teamisource

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Pull reads only the observed archive endpoint. The token must be provisioned
// by the integration operator; this function never extracts browser sessions.
// It makes one attempt and does not log request headers, bodies or error bodies.
func Pull(ctx context.Context, endpoint, token string, request Request) ([]byte, error) {
	u, err := url.Parse(endpoint)
	if err != nil || u.User != nil || u.Hostname() == "" || (u.Scheme != "http" && u.Scheme != "https") || u.Path != "/ec3api/v1/archives/point" || u.RawQuery != "" || u.Fragment != "" || u.RawPath != "" {
		return nil, fmt.Errorf("an explicit TEAMI archive endpoint is required")
	}
	if strings.TrimSpace(token) == "" || strings.ContainsAny(token, "\r\n") {
		return nil, fmt.Errorf("integration authentication is required")
	}
	if len(request.ML) != 1 {
		return nil, fmt.Errorf("one source measurement is required")
	}
	expected, err := NewRequest(request.Point, request.ML[0], request.MD, request.Agg, request.From, request.To)
	if err != nil {
		return nil, err
	}
	body, _ := json.Marshal(request)
	canonical, _ := json.Marshal(expected)
	if !bytes.Equal(body, canonical) {
		return nil, fmt.Errorf("unsupported source query flags")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u.String(), bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("cannot prepare source archive request")
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("st-token", token)
	client := &http.Client{
		Timeout: 20 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	res, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("source archive transport failed")
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("source archive HTTP %d; no data imported", res.StatusCode)
	}
	const maximum = 16 * 1024 * 1024
	data, err := io.ReadAll(io.LimitReader(res.Body, maximum+1))
	if err != nil || len(data) > maximum {
		return nil, fmt.Errorf("source archive response incomplete or too large")
	}
	if _, err := Decode(data, request.Point, request.ML[0]); err != nil {
		return nil, err
	}
	return data, nil
}

// PullAndStore connects a single source read to transactional persistence.
// There is intentionally no automatic login, scheduler or public HTTP route.
func PullAndStore(ctx context.Context, pool *pgxpool.Pool, endpoint, token string, request Request, mapping Mapping) (Stored, error) {
	if mapping.Zone == nil {
		return Stored{}, fmt.Errorf("source timezone must be verified before pulling")
	}
	body, err := Pull(ctx, endpoint, token, request)
	if err != nil {
		return Stored{}, err
	}
	return Store(ctx, pool, request, mapping, body)
}
