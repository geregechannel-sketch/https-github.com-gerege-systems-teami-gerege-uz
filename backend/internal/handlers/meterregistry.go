package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/emcos/ec3-backend/internal/auth"
	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MeterRegistry implements the meter catalog used by the TEAMI classifiers module.
type MeterRegistry struct{ pool *pgxpool.Pool }

func NewMeterRegistry(pool *pgxpool.Pool) *MeterRegistry { return &MeterRegistry{pool: pool} }

type meterRegistryQuery struct {
	Search      string `json:"search"`
	MeterTypeID *int64 `json:"meter_type_id"`
	MountState  string `json:"mount_state"`
	Limit       int    `json:"limit"`
	Offset      int    `json:"offset"`
}

type meterRegistrySave struct {
	MeterID     *int64 `json:"meter_id"`
	MeterTypeID int64  `json:"meter_type_id"`
	MeterNumber string `json:"meter_number"`
	Made        string `json:"made"`
	ExplStart   string `json:"expl_start"`
	MeterClass  string `json:"meter_class"`
}

func meterRegistryWhere(req meterRegistryQuery) (string, []interface{}) {
	conditions := []string{"1=1"}
	args := make([]interface{}, 0, 2)
	if value := strings.TrimSpace(req.Search); value != "" {
		args = append(args, "%"+value+"%")
		conditions = append(conditions, fmt.Sprintf("concat_ws(' ',m.meter_number,mt.meter_type_name,mt.meter_type_producer,m.meter_class,p.point_code,p.point_name) ILIKE $%d", len(args)))
	}
	if req.MeterTypeID != nil && *req.MeterTypeID > 0 {
		args = append(args, *req.MeterTypeID)
		conditions = append(conditions, fmt.Sprintf("m.meter_type_id=$%d", len(args)))
	}
	switch strings.ToUpper(strings.TrimSpace(req.MountState)) {
	case "MOUNTED":
		conditions = append(conditions, "mou.mou_id IS NOT NULL AND mou.mou_et IS NULL")
	case "UNMOUNTED":
		conditions = append(conditions, "(mou.mou_id IS NULL OR mou.mou_et IS NOT NULL)")
	}
	return strings.Join(conditions, " AND "), args
}

func meterRegistryPage(limit, offset int) (int, int) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 500 {
		limit = 500
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}

func meterWriteAllowed(r *http.Request) bool {
	claims, ok := auth.FromContext(r.Context())
	return ok && claims.Has("config")
}

const meterRegistryFrom = `
	FROM meters m
	LEFT JOIN meter_types mt ON mt.meter_type_id=m.meter_type_id
	LEFT JOIN LATERAL (
		SELECT x.mou_id,x.point_id,x.mou_bt,x.mou_et
		FROM mountings x
		WHERE x.meter_id=m.meter_id
		ORDER BY (x.mou_et IS NULL) DESC,x.mou_bt DESC
		LIMIT 1
	) mou ON true
	LEFT JOIN points p ON p.point_id=mou.point_id`

func (h *MeterRegistry) Catalog(w http.ResponseWriter, r *http.Request) {
	types := make([]map[string]interface{}, 0)
	rows, err := h.pool.Query(r.Context(), `SELECT meter_type_id,meter_type_name,meter_type_producer FROM meter_types ORDER BY meter_type_name`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "meter type catalog failed")
		return
	}
	for rows.Next() {
		var id int64
		var name string
		var producer sql.NullString
		if err := rows.Scan(&id, &name, &producer); err != nil {
			rows.Close()
			httpx.Fail(w, http.StatusInternalServerError, "meter type catalog failed")
			return
		}
		types = append(types, map[string]interface{}{"METER_TYPE_ID": id, "METER_TYPE_NAME": name, "METER_TYPE_PRODUCER": producer.String})
	}
	rows.Close()

	var total, mounted int64
	err = h.pool.QueryRow(r.Context(), `
		SELECT count(*),count(*) FILTER (WHERE EXISTS(
			SELECT 1 FROM mountings mou WHERE mou.meter_id=m.meter_id AND mou.mou_et IS NULL
		)) FROM meters m`).Scan(&total, &mounted)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "meter summary failed")
		return
	}
	httpx.OK(w, map[string]interface{}{
		"types":   types,
		"summary": map[string]interface{}{"TOTAL": total, "MOUNTED": mounted, "UNMOUNTED": total - mounted, "TYPE_COUNT": len(types)},
	})
}

func (h *MeterRegistry) Query(w http.ResponseWriter, r *http.Request) {
	var req meterRegistryQuery
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	where, args := meterRegistryWhere(req)
	limit, offset := meterRegistryPage(req.Limit, req.Offset)

	var total int64
	if err := h.pool.QueryRow(r.Context(), `SELECT count(*) `+meterRegistryFrom+` WHERE `+where, args...).Scan(&total); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "meter count failed")
		return
	}
	queryArgs := append(append([]interface{}{}, args...), limit, offset)
	rows, err := h.pool.Query(r.Context(), `
		SELECT m.meter_id,m.meter_number,m.meter_type_id,mt.meter_type_name,mt.meter_type_producer,
		       m.made,m.expl_start,m.meter_class,mou.mou_id,mou.mou_bt,mou.mou_et,
		       p.point_id,p.point_code,p.point_name
		`+meterRegistryFrom+` WHERE `+where+`
		ORDER BY m.meter_number
		LIMIT $`+strconv.Itoa(len(args)+1)+` OFFSET $`+strconv.Itoa(len(args)+2), queryArgs...)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "meter query failed")
		return
	}
	defer rows.Close()
	out := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int64
		var number string
		var typeID sql.NullInt64
		var typeName, producer, meterClass, pointCode, pointName sql.NullString
		var made, explStart, mountedAt, unmountedAt sql.NullTime
		var mountingID, pointID sql.NullInt64
		if err := rows.Scan(&id, &number, &typeID, &typeName, &producer, &made, &explStart, &meterClass, &mountingID, &mountedAt, &unmountedAt, &pointID, &pointCode, &pointName); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "meter query failed")
			return
		}
		mounted := mountingID.Valid && !unmountedAt.Valid
		out = append(out, map[string]interface{}{
			"METER_ID": id, "METER_NUMBER": number, "METER_TYPE_ID": nullableInt64(typeID),
			"METER_TYPE_NAME": typeName.String, "METER_TYPE_PRODUCER": producer.String,
			"MADE": meterNullableTime(made), "EXPL_START": meterNullableTime(explStart), "METER_CLASS": meterClass.String,
			"MOUNTED": mounted, "MOU_ID": nullableInt64(mountingID), "MOU_BT": meterNullableTime(mountedAt), "MOU_ET": meterNullableTime(unmountedAt),
			"POINT_ID": nullableInt64(pointID), "POINT_CODE": pointCode.String, "POINT_NAME": pointName.String,
		})
	}
	httpx.OKList(w, out, total)
}

func (h *MeterRegistry) Save(w http.ResponseWriter, r *http.Request) {
	if !meterWriteAllowed(r) {
		httpx.Fail(w, http.StatusForbidden, "forbidden")
		return
	}
	var req meterRegistrySave
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	req.MeterNumber = strings.TrimSpace(req.MeterNumber)
	if req.MeterNumber == "" || req.MeterTypeID <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "meter number and type are required")
		return
	}
	var duplicate bool
	err := h.pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM meters WHERE lower(meter_number)=lower($1) AND ($2::bigint IS NULL OR meter_id<>$2))`, req.MeterNumber, req.MeterID).Scan(&duplicate)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "meter validation failed")
		return
	}
	if duplicate {
		httpx.Fail(w, http.StatusConflict, "meter number already exists")
		return
	}
	var id int64
	if req.MeterID == nil {
		err = h.pool.QueryRow(r.Context(), `
			INSERT INTO meters(meter_type_id,meter_number,made,expl_start,meter_class)
			VALUES($1,$2,NULLIF($3,'')::date,NULLIF($4,'')::date,NULLIF($5,'')) RETURNING meter_id`,
			req.MeterTypeID, req.MeterNumber, strings.TrimSpace(req.Made), strings.TrimSpace(req.ExplStart), strings.TrimSpace(req.MeterClass)).Scan(&id)
	} else {
		id = *req.MeterID
		result, updateErr := h.pool.Exec(r.Context(), `
			UPDATE meters SET meter_type_id=$1,meter_number=$2,made=NULLIF($3,'')::date,
			expl_start=NULLIF($4,'')::date,meter_class=NULLIF($5,'') WHERE meter_id=$6`,
			req.MeterTypeID, req.MeterNumber, strings.TrimSpace(req.Made), strings.TrimSpace(req.ExplStart), strings.TrimSpace(req.MeterClass), id)
		err = updateErr
		if err == nil && result.RowsAffected() == 0 {
			httpx.Fail(w, http.StatusNotFound, "meter not found")
			return
		}
	}
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "meter save failed")
		return
	}
	httpx.OK(w, map[string]interface{}{"METER_ID": id, "METER_NUMBER": req.MeterNumber})
}

func (h *MeterRegistry) Delete(w http.ResponseWriter, r *http.Request) {
	if !meterWriteAllowed(r) {
		httpx.Fail(w, http.StatusForbidden, "forbidden")
		return
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "invalid meter id")
		return
	}
	var mounted bool
	if err := h.pool.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM mountings WHERE meter_id=$1)`, id).Scan(&mounted); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "meter delete check failed")
		return
	}
	if mounted {
		httpx.Fail(w, http.StatusConflict, "meter has mounting history")
		return
	}
	result, err := h.pool.Exec(r.Context(), `DELETE FROM meters WHERE meter_id=$1`, id)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "meter delete failed")
		return
	}
	if result.RowsAffected() == 0 {
		httpx.Fail(w, http.StatusNotFound, "meter not found")
		return
	}
	httpx.OK(w, map[string]interface{}{"METER_ID": id})
}

func meterNullableTime(value sql.NullTime) interface{} {
	if !value.Valid {
		return nil
	}
	return value.Time
}
