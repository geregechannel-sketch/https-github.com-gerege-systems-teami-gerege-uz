package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/emcos/ec3-backend/internal/auth"
	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/jackc/pgx/v5/pgxpool"
)

// UserSettings serves usersettings (saved views per module), scoped to the
// authenticated user (+ public ones).
type UserSettings struct {
	pool *pgxpool.Pool
}

func NewUserSettings(pool *pgxpool.Pool) *UserSettings { return &UserSettings{pool: pool} }

// List: GET usersettings?uv_module=ARCHIVES
func (u *UserSettings) List(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Fail(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	module := r.URL.Query().Get("uv_module")
	rows, err := u.pool.Query(r.Context(), `
		SELECT uv_id, uv_name, uv_public, uv_module, uv_type, uv_subtype, uv_tech_info,
		       COALESCE(uv_author, (SELECT user_name FROM users WHERE user_id=us.user_id)) AS uv_author,
		       to_char(db_time,'YYYY-MM-DD HH24:MI:SS') AS db_time
		  FROM user_settings us
		 WHERE (user_id=$1 OR uv_public=1)
		   AND ($2='' OR uv_module=$2)
		 ORDER BY uv_id`, claims.UserID, module)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()
	out := []map[string]interface{}{}
	for rows.Next() {
		var (
			id                         int64
			public                     int
			name, module, dbTime, auth string
			utype, subtype             *string
			tech                       []byte
		)
		if err := rows.Scan(&id, &name, &public, &module, &utype, &subtype, &tech, &auth, &dbTime); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, err.Error())
			return
		}
		var techVal interface{}
		if len(tech) > 0 {
			_ = json.Unmarshal(tech, &techVal)
		}
		out = append(out, map[string]interface{}{
			"UV_ID": id, "UV_NAME": name, "UV_PUBLIC": public, "UV_MODULE": module,
			"UV_TYPE": deref(utype), "UV_SUBTYPE": deref(subtype), "UV_TECH_INFO": techVal,
			"UV_AUTHOR": auth, "USER_NAME": auth, "DB_TIME": dbTime,
		})
	}
	httpx.OK(w, out)
}

// Delete: DELETE usersettings/{id}
func (u *UserSettings) Delete(w http.ResponseWriter, r *http.Request) {
	if _, ok := auth.FromContext(r.Context()); !ok {
		httpx.Fail(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	id := r.PathValue("id")
	if _, err := u.pool.Exec(r.Context(), `DELETE FROM user_settings WHERE uv_id=$1`, id); err != nil {
		httpx.Fail(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, map[string]interface{}{"UV_ID": id})
}

type saveReq struct {
	UVName   string          `json:"UV_NAME"`
	UVModule string          `json:"UV_MODULE"`
	UVType   string          `json:"UV_TYPE"`
	UVPublic int             `json:"UV_PUBLIC"`
	UVData   json.RawMessage `json:"UV_TECH_INFO"`
}

// Save: POST usersettings  {UV_NAME, UV_MODULE, ...}
func (u *UserSettings) Save(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Fail(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	var req saveReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UVName == "" || req.UVModule == "" {
		httpx.Fail(w, http.StatusBadRequest, "Missing required parameter: UV_NAME/UV_MODULE")
		return
	}
	var tech interface{}
	if len(req.UVData) > 0 {
		tech = []byte(req.UVData)
	}
	var id int64
	if err := u.pool.QueryRow(r.Context(), `
		INSERT INTO user_settings (uv_name, uv_public, uv_module, uv_type, uv_tech_info, user_id)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING uv_id`,
		req.UVName, req.UVPublic, req.UVModule, nullIfEmpty(req.UVType), tech, claims.UserID).Scan(&id); err != nil {
		httpx.Fail(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, map[string]interface{}{"UV_ID": id})
}

func nullIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
