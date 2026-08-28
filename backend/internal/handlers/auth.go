// Package handlers holds the non-generic ec3api endpoints (auth, dashboard, usersettings).
package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/emcos/ec3-backend/internal/auth"
	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// Auth serves user/login and user/change_pw.
type Auth struct {
	pool *pgxpool.Pool
	mgr  *auth.Manager
}

func NewAuth(pool *pgxpool.Pool, mgr *auth.Manager) *Auth {
	return &Auth{pool: pool, mgr: mgr}
}

type loginReq struct {
	Login    string `json:"login"`
	Password string `json:"password"`
	// tolerate alternative field names
	UserName string `json:"USER_NAME"`
	Pass     string `json:"PASSWORD"`
}

// Login: POST user/login {login,password} -> {success, data:{token, USER_NAME, privileges, company, department}}
func (a *Auth) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	user := firstNonEmpty(req.Login, req.UserName)
	pass := firstNonEmpty(req.Password, req.Pass)
	if user == "" || pass == "" {
		httpx.Fail(w, http.StatusBadRequest, "Missing required parameter: login/password")
		return
	}

	var (
		uid                 int64
		hash                string
		privRaw             []byte
		company, department *string
		enabled             int
	)
	err := a.pool.QueryRow(r.Context(),
		`SELECT user_id, password_hash, privileges, company, department, enabled
		   FROM users WHERE user_name=$1`, user).
		Scan(&uid, &hash, &privRaw, &company, &department, &enabled)
	if err == pgx.ErrNoRows {
		httpx.Fail(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if enabled != 1 || bcrypt.CompareHashAndPassword([]byte(hash), []byte(pass)) != nil {
		httpx.Fail(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	privs := auth.PrivilegesJSON(privRaw)
	token, err := a.mgr.Issue(uid, user, privs)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.OK(w, map[string]interface{}{
		"token":      token, // client stores as jwtToken and sends as st-token
		"USER_NAME":  user,
		"privileges": privs,
		"company":    deref(company),
		"department": deref(department),
	})
}

type changePwReq struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

// ChangePw: POST user/change_pw {old_password,new_password}
func (a *Auth) ChangePw(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Fail(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	var req changePwReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.NewPassword == "" {
		httpx.Fail(w, http.StatusBadRequest, "Missing required parameter: new_password")
		return
	}
	var hash string
	if err := a.pool.QueryRow(r.Context(),
		`SELECT password_hash FROM users WHERE user_id=$1`, claims.UserID).Scan(&hash); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.OldPassword)) != nil {
		httpx.Fail(w, http.StatusUnauthorized, "old password mismatch")
		return
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if _, err := a.pool.Exec(r.Context(),
		`UPDATE users SET password_hash=$1 WHERE user_id=$2`, string(newHash), claims.UserID); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.OK(w, map[string]interface{}{"changed": true})
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func deref(s *string) interface{} {
	if s == nil {
		return nil
	}
	return *s
}
