package resource

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/emcos/ec3-backend/internal/auth"
	"github.com/emcos/ec3-backend/internal/grid"
	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Handler serves generic CRUD + grid for registered models.
type Handler struct {
	pool *pgxpool.Pool
	reg  *Registry
}

func NewHandler(pool *pgxpool.Pool, reg *Registry) *Handler {
	return &Handler{pool: pool, reg: reg}
}

const (
	defaultLimit = 100
	maxLimit     = 1000
)

func (h *Handler) canRead(r *http.Request, m *Model) bool {
	c, ok := auth.FromContext(r.Context())
	return ok && c.Has(m.ReadPriv)
}

func (h *Handler) canWrite(r *http.Request, m *Model) bool {
	c, ok := auth.FromContext(r.Context())
	return ok && c.Has(m.WritePriv)
}

func (h *Handler) selectCols(m *Model) string {
	fs := m.allFields()
	parts := make([]string, len(fs))
	for i, f := range fs {
		parts[i] = fmt.Sprintf(`%s AS "%s"`, f.Col, f.API)
	}
	return strings.Join(parts, ", ")
}

// scanRows maps pgx rows to []map[API]value using the model field order.
func (h *Handler) scanRows(ctx context.Context, m *Model, sql string, args ...interface{}) ([]map[string]interface{}, error) {
	rows, err := h.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	fs := m.allFields()
	out := []map[string]interface{}{}
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			return nil, err
		}
		rec := make(map[string]interface{}, len(fs))
		for i, f := range fs {
			if i < len(vals) {
				rec[f.API] = vals[i]
			}
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}

// List: GET /{model}?limit=&offset=  -> {data, totalCount}
func (h *Handler) List(w http.ResponseWriter, r *http.Request, m *Model) {
	if !m.List {
		httpx.Fail(w, http.StatusMethodNotAllowed, "list not supported")
		return
	}
	if !h.canRead(r, m) {
		httpx.Fail(w, http.StatusForbidden, "Недостаточно прав на выполнения операции")
		return
	}
	limit := grid.ClampLimit(atoi(r.URL.Query().Get("limit")), defaultLimit, maxLimit)
	offset := atoi(r.URL.Query().Get("offset"))
	ctx := r.Context()

	var total int64
	if err := h.pool.QueryRow(ctx, "SELECT count(*) FROM "+m.Table).Scan(&total); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	sql := fmt.Sprintf("SELECT %s FROM %s ORDER BY %s LIMIT %d OFFSET %d",
		h.selectCols(m), m.Table, m.PKField.Col, limit, offset)
	recs, err := h.scanRows(ctx, m, sql)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.OKList(w, recs, total)
}

// Query: POST /{model}/query  body {limit,offset,filters:[{c,p,v}],order} -> {data,totalCount}
func (h *Handler) Query(w http.ResponseWriter, r *http.Request, m *Model) {
	if !m.List {
		httpx.Fail(w, http.StatusMethodNotAllowed, "query not supported")
		return
	}
	if !h.canRead(r, m) {
		httpx.Fail(w, http.StatusForbidden, "Недостаточно прав на выполнения операции")
		return
	}
	var req grid.Request
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}
	where, args, err := grid.BuildWhere(req.Filters, m.resolve, 1)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, err.Error())
		return
	}
	whereSQL := ""
	if where != "" {
		whereSQL = " WHERE " + where
	}
	ctx := r.Context()

	var total int64
	if err := h.pool.QueryRow(ctx, "SELECT count(*) FROM "+m.Table+whereSQL, args...).Scan(&total); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	orderBy := grid.BuildOrderBy(req.Order, req.OrderDirections, m.resolve)
	if orderBy == "" {
		orderBy = "ORDER BY " + m.PKField.Col
	}
	limit := grid.ClampLimit(req.Limit, defaultLimit, maxLimit)
	sql := fmt.Sprintf("SELECT %s FROM %s%s %s LIMIT %d OFFSET %d",
		h.selectCols(m), m.Table, whereSQL, orderBy, limit, req.Offset)
	recs, err := h.scanRows(ctx, m, sql, args...)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpx.OKList(w, recs, total)
}

// GetOne: GET /{model}/{id}
func (h *Handler) GetOne(w http.ResponseWriter, r *http.Request, m *Model, id string) {
	if !m.Get {
		httpx.Fail(w, http.StatusMethodNotAllowed, "get not supported")
		return
	}
	if !h.canRead(r, m) {
		httpx.Fail(w, http.StatusForbidden, "Недостаточно прав на выполнения операции")
		return
	}
	idv, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid id")
		return
	}
	sql := fmt.Sprintf("SELECT %s FROM %s WHERE %s=$1", h.selectCols(m), m.Table, m.PKField.Col)
	recs, err := h.scanRows(r.Context(), m, sql, idv)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, err.Error())
		return
	}
	if len(recs) == 0 {
		httpx.Fail(w, http.StatusNotFound, "not found")
		return
	}
	httpx.OK(w, recs[0])
}

// Create: POST /{model}  body {API_FIELD: value, ...}
func (h *Handler) Create(w http.ResponseWriter, r *http.Request, m *Model) {
	if !m.Create {
		httpx.Fail(w, http.StatusMethodNotAllowed, "create not supported")
		return
	}
	if !h.canWrite(r, m) {
		httpx.Fail(w, http.StatusForbidden, "Недостаточно прав на выполнения операции")
		return
	}
	body := map[string]interface{}{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	var cols []string
	var ph []string
	var args []interface{}
	n := 1
	for _, f := range m.Fields {
		if !f.Writable {
			continue
		}
		v, present := lookupCI(body, f.API)
		if !present {
			if f.Required {
				httpx.Fail(w, http.StatusBadRequest, "Missing required parameter: "+f.API)
				return
			}
			continue
		}
		cols = append(cols, f.Col)
		ph = append(ph, fmt.Sprintf("$%d", n))
		args = append(args, v)
		n++
	}
	if len(cols) == 0 {
		httpx.Fail(w, http.StatusBadRequest, "no writable fields provided")
		return
	}
	sql := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) RETURNING %s",
		m.Table, strings.Join(cols, ","), strings.Join(ph, ","), m.PKField.Col)
	var newID int64
	if err := h.pool.QueryRow(r.Context(), sql, args...).Scan(&newID); err != nil {
		httpx.Fail(w, http.StatusBadRequest, err.Error())
		return
	}
	h.GetOne(w, r, m, strconv.FormatInt(newID, 10))
}

// Update: PUT /{model}/{id}
func (h *Handler) Update(w http.ResponseWriter, r *http.Request, m *Model, id string) {
	if !m.Update {
		httpx.Fail(w, http.StatusMethodNotAllowed, "update not supported")
		return
	}
	if !h.canWrite(r, m) {
		httpx.Fail(w, http.StatusForbidden, "Недостаточно прав на выполнения операции")
		return
	}
	idv, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid id")
		return
	}
	body := map[string]interface{}{}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	var sets []string
	var args []interface{}
	n := 1
	for _, f := range m.Fields {
		if !f.Writable {
			continue
		}
		if v, present := lookupCI(body, f.API); present {
			sets = append(sets, fmt.Sprintf("%s=$%d", f.Col, n))
			args = append(args, v)
			n++
		}
	}
	if len(sets) == 0 {
		httpx.Fail(w, http.StatusBadRequest, "no writable fields provided")
		return
	}
	args = append(args, idv)
	sql := fmt.Sprintf("UPDATE %s SET %s WHERE %s=$%d", m.Table, strings.Join(sets, ","), m.PKField.Col, n)
	ct, err := h.pool.Exec(r.Context(), sql, args...)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, err.Error())
		return
	}
	if ct.RowsAffected() == 0 {
		httpx.Fail(w, http.StatusNotFound, "not found")
		return
	}
	h.GetOne(w, r, m, id)
}

// Delete: DELETE /{model}/{id}
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request, m *Model, id string) {
	if !m.Delete {
		httpx.Fail(w, http.StatusMethodNotAllowed, "delete not supported")
		return
	}
	if !h.canWrite(r, m) {
		httpx.Fail(w, http.StatusForbidden, "Недостаточно прав на выполнения операции")
		return
	}
	idv, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid id")
		return
	}
	ct, err := h.pool.Exec(r.Context(), "DELETE FROM "+m.Table+" WHERE "+m.PKField.Col+"=$1", idv)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, err.Error())
		return
	}
	if ct.RowsAffected() == 0 {
		httpx.Fail(w, http.StatusNotFound, "not found")
		return
	}
	httpx.OK(w, map[string]interface{}{m.PKField.API: idv, "deleted": true})
}

func atoi(s string) int { n, _ := strconv.Atoi(s); return n }

// lookupCI does a case-insensitive lookup in the JSON body (clients may send
// POINT_NAME or point_name).
func lookupCI(body map[string]interface{}, api string) (interface{}, bool) {
	if v, ok := body[api]; ok {
		return v, true
	}
	for k, v := range body {
		if strings.EqualFold(k, api) {
			return v, true
		}
	}
	return nil, false
}
