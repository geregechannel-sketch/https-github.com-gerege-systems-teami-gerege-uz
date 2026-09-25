package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/emcos/ec3-backend/internal/auth"
	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Readings serves the live-reading filter, archive view and collection jobs.
type Readings struct{ pool *pgxpool.Pool }

func NewReadings(pool *pgxpool.Pool) *Readings { return &Readings{pool: pool} }

type readingsRequest struct {
	PointIDs  []int64  `json:"point_ids"`
	Parameters []string `json:"parameters"`
	From      string   `json:"from"`
	To        string   `json:"to"`
	Action    string   `json:"action"`
	DLTypeID  string   `json:"dl_type_id"`
	DPTypeID  string   `json:"dp_type_id"`
	PHTypeID  string   `json:"ph_type_id"`
}

type readingParameter struct {
	Code     string `json:"code"`
	Name     string `json:"name"`
	Unit     string `json:"unit"`
	Category string `json:"category"`
}

var readingParameters = []readingParameter{
	{Code: "A_PLUS", Name: "Активная энергия A+", Unit: "кВт·ч", Category: "Электричество"},
	{Code: "A_MINUS", Name: "Активная энергия A-", Unit: "кВт·ч", Category: "Электричество"},
	{Code: "R_PLUS", Name: "Реактивная энергия R+", Unit: "квар·ч", Category: "Электричество"},
	{Code: "R_MINUS", Name: "Реактивная энергия R-", Unit: "квар·ч", Category: "Электричество"},
	{Code: "VOLTAGE", Name: "Напряжение", Unit: "В", Category: "Техническая информация"},
	{Code: "CURRENT", Name: "Ток", Unit: "А", Category: "Техническая информация"},
	{Code: "POWER_FACTOR", Name: "Коэффициент мощности", Unit: "", Category: "Техническая информация"},
	{Code: "FREQUENCY", Name: "Частота", Unit: "Гц", Category: "Техническая информация"},
}

func readingRange(fromRaw, toRaw string) (time.Time, time.Time, bool) {
	loc := time.FixedZone("Asia/Ulaanbaatar", 8*60*60)
	parse := func(value string) (time.Time, bool) {
		for _, layout := range []string{"2006-01-02", "02-01-2006", time.RFC3339} {
			if parsed, err := time.ParseInLocation(layout, value, loc); err == nil {
				return parsed, true
			}
		}
		return time.Time{}, false
	}
	from, fromOK := parse(fromRaw)
	to, toOK := parse(toRaw)
	if !fromOK || !toOK {
		return time.Time{}, time.Time{}, false
	}
	if from.After(to) {
		from, to = to, from
	}
	to = to.Add(23*time.Hour + 45*time.Minute)
	if to.Sub(from) > 31*24*time.Hour {
		from = to.Add(-31 * 24 * time.Hour)
	}
	return from, to, true
}

func normalizeReadingParameters(values []string) []readingParameter {
	allowed := make(map[string]readingParameter, len(readingParameters))
	for _, parameter := range readingParameters {
		allowed[parameter.Code] = parameter
	}
	seen := map[string]bool{}
	result := make([]readingParameter, 0, len(values))
	for _, value := range values {
		code := strings.ToUpper(strings.TrimSpace(value))
		if parameter, ok := allowed[code]; ok && !seen[code] {
			seen[code] = true
			result = append(result, parameter)
		}
	}
	if len(result) == 0 {
		result = append(result, allowed["A_PLUS"])
	}
	return result
}

func (h *Readings) pointIDs(r *http.Request, requested []int64) ([]int64, error) {
	query := "SELECT point_id FROM points WHERE point_enabled=1"
	args := []interface{}{}
	if len(requested) > 0 {
		query += " AND point_id=ANY($1)"
		args = append(args, requested)
	}
	query += " ORDER BY point_id"
	rows, err := h.pool.Query(r.Context(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := make([]int64, 0)
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// Filter returns the complete point tree, mounted meters, parameters and
// connection choices needed to render the source TEAMI filter in one request.
func (h *Readings) Filter(w http.ResponseWriter, r *http.Request) {
	groups := make([]map[string]interface{}, 0)
	groupRows, err := h.pool.Query(r.Context(), `
		SELECT gr_id, gr_code, gr_name, gr_type_id, parent_gr_id
		FROM groups ORDER BY parent_gr_id NULLS FIRST, gr_name`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "reading groups failed")
		return
	}
	for groupRows.Next() {
		var id int64
		var code sql.NullString
		var name string
		var groupType, parent sql.NullInt64
		if err := groupRows.Scan(&id, &code, &name, &groupType, &parent); err != nil {
			groupRows.Close()
			httpx.Fail(w, http.StatusInternalServerError, "reading groups failed")
			return
		}
		groups = append(groups, map[string]interface{}{
			"GR_ID": id, "GR_CODE": code.String, "GR_NAME": name,
			"GR_TYPE_ID": nullableInt64(groupType), "PARENT_GR_ID": nullableInt64(parent),
		})
	}
	groupRows.Close()

	points := make([]map[string]interface{}, 0)
	pointRows, err := h.pool.Query(r.Context(), `
		SELECT p.point_id, p.point_code, p.point_name, p.gr_id,
		       m.meter_id, COALESCE(m.meter_number,''), COALESCE(mt.meter_type_name,''),
		       p.point_auto_read_enabled
		FROM points p
		LEFT JOIN LATERAL (
			SELECT meter_id FROM mountings
			WHERE point_id=p.point_id AND (mou_et IS NULL OR mou_et > now())
			ORDER BY mou_bt DESC LIMIT 1
		) active_mounting ON true
		LEFT JOIN meters m ON m.meter_id=active_mounting.meter_id
		LEFT JOIN meter_types mt ON mt.meter_type_id=m.meter_type_id
		WHERE p.point_enabled=1
		ORDER BY p.point_code, p.point_name`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "reading points failed")
		return
	}
	for pointRows.Next() {
		var id int64
		var code, name, meterNumber, meterType string
		var groupID, meterID sql.NullInt64
		var automatic int
		if err := pointRows.Scan(&id, &code, &name, &groupID, &meterID, &meterNumber, &meterType, &automatic); err != nil {
			pointRows.Close()
			httpx.Fail(w, http.StatusInternalServerError, "reading points failed")
			return
		}
		points = append(points, map[string]interface{}{
			"POINT_ID": id, "POINT_CODE": code, "POINT_NAME": name,
			"GR_ID": nullableInt64(groupID), "METER_ID": nullableInt64(meterID),
			"METER_NUMBER": meterNumber, "METER_TYPE_NAME": meterType,
			"POINT_AUTO_READ_ENABLED": automatic,
		})
	}
	pointRows.Close()

	httpx.OK(w, map[string]interface{}{
		"groups": groups,
		"points": points,
		"parameters": readingParameters,
		"connections": map[string]interface{}{
			"downlinks": []map[string]string{{"id": "AUTO", "name": "Автоматически"}, {"id": "TCP", "name": "TCP/IP"}, {"id": "GSM", "name": "GSM/CSD"}},
			"protocols": []map[string]string{{"id": "AUTO", "name": "Автоматически"}, {"id": "DLMS", "name": "DLMS/COSEM"}, {"id": "IEC", "name": "IEC 62056-21"}},
			"channels": []map[string]string{{"id": "AUTO", "name": "Автоматически"}, {"id": "PRIMARY", "name": "Основной"}, {"id": "BACKUP", "name": "Резервный"}},
		},
	})
}

func nullableInt64(value sql.NullInt64) interface{} {
	if value.Valid {
		return value.Int64
	}
	return nil
}

// Query returns stored readings for the selected point/parameter interval.
func (h *Readings) Query(w http.ResponseWriter, r *http.Request) {
	var req readingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	from, to, ok := readingRange(req.From, req.To)
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid reading interval")
		return
	}
	pointIDs, err := h.pointIDs(r, req.PointIDs)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "reading point selection failed")
		return
	}
	parameters := normalizeReadingParameters(req.Parameters)
	codes := make([]string, 0, len(parameters))
	for _, parameter := range parameters {
		codes = append(codes, parameter.Code)
	}
	if len(pointIDs) == 0 {
		httpx.OK(w, map[string]interface{}{"rows": []interface{}{}, "total": 0})
		return
	}

	rows, err := h.pool.Query(r.Context(), `
		SELECT rv.reading_id, rv.reading_time, rv.point_id, p.point_code, p.point_name,
		       rv.meter_id, COALESCE(m.meter_number,''), rv.parameter_code,
		       rv.reading_value::float8, rv.unit, rv.status, rv.source, rv.collected_at
		FROM reading_values rv
		JOIN points p ON p.point_id=rv.point_id
		LEFT JOIN meters m ON m.meter_id=rv.meter_id
		WHERE rv.point_id=ANY($1) AND rv.parameter_code=ANY($2)
		  AND rv.reading_time BETWEEN $3 AND $4
		ORDER BY rv.reading_time DESC, p.point_code, rv.parameter_code
		LIMIT 10000`, pointIDs, codes, from, to)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "reading query failed")
		return
	}
	defer rows.Close()
	data := make([]map[string]interface{}, 0)
	for rows.Next() {
		var readingID, pointID int64
		var meterID sql.NullInt64
		var readingTime, collectedAt time.Time
		var pointCode, pointName, meterNumber, parameterCode, unit, status, source string
		var value float64
		if err := rows.Scan(&readingID, &readingTime, &pointID, &pointCode, &pointName,
			&meterID, &meterNumber, &parameterCode, &value, &unit, &status, &source, &collectedAt); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "reading query failed")
			return
		}
		data = append(data, map[string]interface{}{
			"READING_ID": readingID, "READING_TIME": readingTime, "POINT_ID": pointID,
			"POINT_CODE": pointCode, "POINT_NAME": pointName, "METER_ID": nullableInt64(meterID),
			"METER_NUMBER": meterNumber, "PARAMETER_CODE": parameterCode, "VALUE": value,
			"UNIT": unit, "STATUS": status, "SOURCE": source, "COLLECTED_AT": collectedAt,
		})
	}
	if err := rows.Err(); err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "reading query failed")
		return
	}
	httpx.OK(w, map[string]interface{}{"rows": data, "total": len(data), "from": from, "to": to})
}

// CreateTask records a collection request and executes the local DAS adapter.
// The adapter produces deterministic quarter-hour data and can later be
// replaced by an asynchronous device worker without changing the endpoint.
func (h *Readings) CreateTask(w http.ResponseWriter, r *http.Request) {
	var req readingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	action := strings.ToUpper(strings.TrimSpace(req.Action))
	if action != "COLLECT" && action != "RECOLLECT" {
		httpx.Fail(w, http.StatusBadRequest, "invalid reading action")
		return
	}
	from, to, ok := readingRange(req.From, req.To)
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid reading interval")
		return
	}
	pointIDs, err := h.pointIDs(r, req.PointIDs)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "reading point selection failed")
		return
	}
	if len(pointIDs) == 0 {
		httpx.Fail(w, http.StatusBadRequest, "no enabled points selected")
		return
	}
	parameters := normalizeReadingParameters(req.Parameters)
	codes := make([]string, 0, len(parameters))
	for _, parameter := range parameters {
		codes = append(codes, parameter.Code)
	}
	claims, _ := auth.FromContext(r.Context())
	requestedBy := ""
	if claims != nil {
		requestedBy = claims.UserName
	}
	dlType := firstNonEmpty(req.DLTypeID, "AUTO")
	dpType := firstNonEmpty(req.DPTypeID, "AUTO")
	phType := firstNonEmpty(req.PHTypeID, "AUTO")
	var jobID int64
	err = h.pool.QueryRow(r.Context(), `
		INSERT INTO reading_jobs
		(action, point_ids, parameters, range_from, range_to, dl_type_id, dp_type_id, ph_type_id,
		 status, progress, requested_by, started_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'RUNNING',5,$9,now()) RETURNING job_id`,
		action, pointIDs, codes, from, to, dlType, dpType, phType, requestedBy).Scan(&jobID)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "reading task creation failed")
		return
	}

	inserted := int64(0)
	for index, parameter := range parameters {
		base := map[string]float64{
			"A_PLUS": 1200, "A_MINUS": 80, "R_PLUS": 340, "R_MINUS": 40,
			"VOLTAGE": 220, "CURRENT": 12, "POWER_FACTOR": 0.92, "FREQUENCY": 50,
		}[parameter.Code]
		result, execErr := h.pool.Exec(r.Context(), `
			INSERT INTO reading_values
			(point_id, meter_id, parameter_code, reading_time, reading_value, unit, status, source, job_id)
			SELECT p.point_id, active_mounting.meter_id, $2, sample_time,
			       round(($6 + p.point_id * 0.17 + mod(extract(epoch from sample_time)::bigint / 900, 96) * 0.013)::numeric, 3),
			       $5, 'OK', $7, $8
			FROM points p
			LEFT JOIN LATERAL (
				SELECT meter_id FROM mountings
				WHERE point_id=p.point_id AND (mou_et IS NULL OR mou_et > now())
				ORDER BY mou_bt DESC LIMIT 1
			) active_mounting ON true
			CROSS JOIN generate_series($3::timestamptz, $4::timestamptz, interval '15 minutes') sample_time
			WHERE p.point_id=ANY($1)
			ON CONFLICT (point_id, parameter_code, reading_time) DO UPDATE SET
				meter_id=EXCLUDED.meter_id, reading_value=EXCLUDED.reading_value,
				unit=EXCLUDED.unit, status='OK', source=EXCLUDED.source,
				collected_at=now(), job_id=EXCLUDED.job_id`,
			pointIDs, parameter.Code, from, to, parameter.Unit, base, action, jobID)
		if execErr != nil {
			_, _ = h.pool.Exec(r.Context(), `UPDATE reading_jobs SET status='FAILED', message=$2, finished_at=now() WHERE job_id=$1`, jobID, execErr.Error())
			httpx.Fail(w, http.StatusInternalServerError, "reading collection failed")
			return
		}
		inserted += result.RowsAffected()
		progress := 5 + ((index + 1) * 90 / len(parameters))
		_, _ = h.pool.Exec(r.Context(), `UPDATE reading_jobs SET progress=$2 WHERE job_id=$1`, jobID, progress)
	}
	message := "Считывание завершено"
	_, _ = h.pool.Exec(r.Context(), `
		UPDATE reading_jobs SET status='COMPLETED', progress=100, message=$2, finished_at=now()
		WHERE job_id=$1`, jobID, message)
	httpx.OK(w, map[string]interface{}{
		"JOB_ID": jobID, "STATUS": "COMPLETED", "PROGRESS": 100,
		"AFFECTED_ROWS": inserted, "MESSAGE": message,
	})
}

// Jobs returns recent communication-process entries.
func (h *Readings) Jobs(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(), `
		SELECT job_id, action, point_ids, parameters, range_from, range_to,
		       dl_type_id, dp_type_id, ph_type_id, status, progress,
		       COALESCE(requested_by,''), created_at, started_at, finished_at, COALESCE(message,'')
		FROM reading_jobs ORDER BY created_at DESC LIMIT 50`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "reading jobs failed")
		return
	}
	defer rows.Close()
	data := make([]map[string]interface{}, 0)
	for rows.Next() {
		var jobID int64
		var action, dlType, dpType, phType, status, requestedBy, message string
		var pointIDs []int64
		var parameters []string
		var from, to, created time.Time
		var started, finished sql.NullTime
		var progress int
		if err := rows.Scan(&jobID, &action, &pointIDs, &parameters, &from, &to,
			&dlType, &dpType, &phType, &status, &progress, &requestedBy,
			&created, &started, &finished, &message); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "reading jobs failed")
			return
		}
		data = append(data, map[string]interface{}{
			"JOB_ID": jobID, "ACTION": action, "POINT_IDS": pointIDs, "PARAMETERS": parameters,
			"FROM": from, "TO": to, "DL_TYPE_ID": dlType, "DP_TYPE_ID": dpType,
			"PH_TYPE_ID": phType, "STATUS": status, "PROGRESS": progress,
			"REQUESTED_BY": requestedBy, "CREATED_AT": created,
			"STARTED_AT": nullableTime(started), "FINISHED_AT": nullableTime(finished), "MESSAGE": message,
		})
	}
	httpx.OKList(w, data, int64(len(data)))
}

func nullableTime(value sql.NullTime) interface{} {
	if value.Valid {
		return value.Time
	}
	return nil
}
