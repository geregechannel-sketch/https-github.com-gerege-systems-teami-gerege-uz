// Package auth implements the st-token JWT scheme and RBAC used by ec3api.
package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/golang-jwt/jwt/v5"
)

type ctxKey int

const userKey ctxKey = 1

// Claims carried in the st-token JWT.
type Claims struct {
	UserID     int64    `json:"uid"`
	UserName   string   `json:"unm"`
	Privileges []string `json:"prv"`
	jwt.RegisteredClaims
}

// Manager issues and verifies st-tokens.
type Manager struct {
	secret []byte
	ttl    time.Duration
}

func NewManager(secret string, ttl time.Duration) *Manager {
	return &Manager{secret: []byte(secret), ttl: ttl}
}

// Issue creates a signed st-token for the given user.
func (m *Manager) Issue(userID int64, userName string, privileges []string) (string, error) {
	now := time.Now()
	c := Claims{
		UserID:     userID,
		UserName:   userName,
		Privileges: privileges,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userName,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(m.ttl)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(m.secret)
}

// Parse verifies a token string and returns its claims.
func (m *Manager) Parse(token string) (*Claims, error) {
	c := &Claims{}
	t, err := jwt.ParseWithClaims(token, c, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return m.secret, nil
	})
	if err != nil || !t.Valid {
		return nil, errors.New("invalid token")
	}
	return c, nil
}

// Middleware validates the st-token header and injects claims into the context.
func (m *Manager) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tok := r.Header.Get("st-token")
		if tok == "" {
			httpx.Fail(w, http.StatusUnauthorized, "missing st-token")
			return
		}
		claims, err := m.Parse(tok)
		if err != nil {
			httpx.Fail(w, http.StatusUnauthorized, "invalid or expired st-token")
			return
		}
		ctx := context.WithValue(r.Context(), userKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// FromContext returns the authenticated claims, if any.
func FromContext(ctx context.Context) (*Claims, bool) {
	c, ok := ctx.Value(userKey).(*Claims)
	return c, ok
}

// Has reports whether the claims grant a privilege ("*" grants everything).
func (c *Claims) Has(priv string) bool {
	if priv == "" {
		return true
	}
	for _, p := range c.Privileges {
		if p == "*" || p == priv {
			return true
		}
	}
	return false
}

// PrivilegesJSON parses a jsonb privileges column into a string slice.
func PrivilegesJSON(raw []byte) []string {
	var out []string
	_ = json.Unmarshal(raw, &out)
	return out
}
