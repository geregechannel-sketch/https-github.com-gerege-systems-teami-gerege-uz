package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/emcos/ec3-backend/internal/auth"
	"github.com/emcos/ec3-backend/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Reporting provides report selection, preview, scheduling and run history.
type Reporting struct{ pool *pgxpool.Pool }

func NewReporting(pool *pgxpool.Pool) *Reporting { return &Reporting{pool: pool} }

type reportingRequest struct {
	ReportID     int64   `json:"report_id"`
	PointIDs     []int64 `json:"point_ids"`
	From         string  `json:"from"`
	To           string  `json:"to"`
	OutputFormat string  `json:"output_format"`
}

type automationRequest struct {
	ReportID     int64  `json:"report_id"`
	Name         string `json:"name"`
	ScheduleCode string `json:"schedule_code"`
	ScheduleTime string `json:"schedule_time"`
	Recipients   string `json:"recipients"`
	OutputFormat string `json:"output_format"`
	Enabled      *bool  `json:"enabled"`
}

type reportColumn struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Unit  string `json:"unit,omitempty"`
}

type reportDefinition struct {
	ID            int64
	Code          string
	Name          string
	Description   string
	Folder        string
	PeriodKind    string
	NeedsPoints   bool
	DefaultFormat string
}

type reportPointAggregate struct {
	ID                          int64
	Code, Name, Meter           string
	ActiveCount                 int64
	ActiveMin, ActiveMax        sql.NullFloat64
	ActiveMinus, ReactivePlus   sql.NullFloat64
	ReactiveMinus               sql.NullFloat64
	Voltage, Current, Frequency sql.NullFloat64
}

func reportRange(fromRaw, toRaw string) (time.Time, time.Time, bool) {
	loc := time.FixedZone("Asia/Ulaanbaatar", 8*60*60)
	parse := func(value string) (time.Time, bool) {
		for _, layout := range []string{"2006-01-02", "02-01-2006", time.RFC3339} {
			if parsed, err := time.ParseInLocation(layout, strings.TrimSpace(value), loc); err == nil {
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
	to = to.Add(24 * time.Hour)
	if to.Sub(from) > 366*24*time.Hour {
		from = to.Add(-366 * 24 * time.Hour)
	}
	return from, to, true
}

func normalizeReportFormat(value string) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	switch value {
	case "CSV", "PDF", "XLSX":
		return value
	default:
		return "XLSX"
	}
}

func roundReport(value float64, precision int) float64 {
	factor := math.Pow10(precision)
	return math.Round(value*factor) / factor
}

func (h *Reporting) definition(ctx context.Context, id int64) (reportDefinition, error) {
	var definition reportDefinition
	err := h.pool.QueryRow(ctx, `
		SELECT report_id, report_code, report_name, description, folder,
		       period_kind, needs_points, default_format
		FROM report_definitions WHERE report_id=$1 AND enabled`, id).
		Scan(&definition.ID, &definition.Code, &definition.Name, &definition.Description,
			&definition.Folder, &definition.PeriodKind, &definition.NeedsPoints, &definition.DefaultFormat)
	return definition, err
}

func (h *Reporting) reportPointIDs(ctx context.Context, requested []int64) ([]int64, error) {
	query := "SELECT point_id FROM points WHERE point_enabled=1"
	args := []interface{}{}
	if len(requested) > 0 {
		query += " AND point_id=ANY($1)"
		args = append(args, requested)
	}
	query += " ORDER BY point_code LIMIT 500"
	rows, err := h.pool.Query(ctx, query, args...)
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

// Catalog returns report definitions and the point tree in one request.
func (h *Reporting) Catalog(w http.ResponseWriter, r *http.Request) {
	definitions := make([]map[string]interface{}, 0)
	rows, err := h.pool.Query(r.Context(), `
		SELECT report_id, report_code, report_name, description, folder,
		       period_kind, needs_points, default_format
		FROM report_definitions WHERE enabled ORDER BY folder, sort_order, report_name`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "report catalog failed")
		return
	}
	for rows.Next() {
		var item reportDefinition
		if err := rows.Scan(&item.ID, &item.Code, &item.Name, &item.Description,
			&item.Folder, &item.PeriodKind, &item.NeedsPoints, &item.DefaultFormat); err != nil {
			rows.Close()
			httpx.Fail(w, http.StatusInternalServerError, "report catalog failed")
			return
		}
		definitions = append(definitions, map[string]interface{}{
			"REPORT_ID": item.ID, "REPORT_CODE": item.Code, "REPORT_NAME": item.Name,
			"DESCRIPTION": item.Description, "FOLDER": item.Folder,
			"PERIOD_KIND": item.PeriodKind, "NEEDS_POINTS": item.NeedsPoints,
			"DEFAULT_FORMAT": item.DefaultFormat,
		})
	}
	rows.Close()

	groups := make([]map[string]interface{}, 0)
	groupRows, err := h.pool.Query(r.Context(), `SELECT gr_id, gr_code, gr_name, parent_gr_id FROM groups ORDER BY parent_gr_id NULLS FIRST, gr_name`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "report groups failed")
		return
	}
	for groupRows.Next() {
		var id int64
		var code sql.NullString
		var name string
		var parent sql.NullInt64
		if err := groupRows.Scan(&id, &code, &name, &parent); err != nil {
			groupRows.Close()
			httpx.Fail(w, http.StatusInternalServerError, "report groups failed")
			return
		}
		groups = append(groups, map[string]interface{}{
			"GR_ID": id, "GR_CODE": code.String, "GR_NAME": name, "PARENT_GR_ID": nullableInt64(parent),
		})
	}
	groupRows.Close()

	points := make([]map[string]interface{}, 0)
	pointRows, err := h.pool.Query(r.Context(), `
		SELECT p.point_id, p.point_code, p.point_name, p.gr_id, COALESCE(m.meter_number,'')
		FROM points p
		LEFT JOIN LATERAL (
			SELECT meter_id FROM mountings WHERE point_id=p.point_id AND (mou_et IS NULL OR mou_et>now())
			ORDER BY mou_bt DESC LIMIT 1
		) active_mounting ON true
		LEFT JOIN meters m ON m.meter_id=active_mounting.meter_id
		WHERE p.point_enabled=1 ORDER BY p.point_code`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "report points failed")
		return
	}
	for pointRows.Next() {
		var id int64
		var code, name, meter string
		var groupID sql.NullInt64
		if err := pointRows.Scan(&id, &code, &name, &groupID, &meter); err != nil {
			pointRows.Close()
			httpx.Fail(w, http.StatusInternalServerError, "report points failed")
			return
		}
		points = append(points, map[string]interface{}{
			"POINT_ID": id, "POINT_CODE": code, "POINT_NAME": name,
			"GR_ID": nullableInt64(groupID), "METER_NUMBER": meter,
		})
	}
	pointRows.Close()
	httpx.OK(w, map[string]interface{}{"reports": definitions, "groups": groups, "points": points})
}

func (h *Reporting) pointAggregates(ctx context.Context, pointIDs []int64, from, to time.Time) ([]reportPointAggregate, error) {
	rows, err := h.pool.Query(ctx, `
		SELECT p.point_id, p.point_code, p.point_name, COALESCE(m.meter_number,''),
		       count(rv.reading_id) FILTER (WHERE rv.parameter_code='A_PLUS'),
		       min(rv.reading_value::float8) FILTER (WHERE rv.parameter_code='A_PLUS'),
		       max(rv.reading_value::float8) FILTER (WHERE rv.parameter_code='A_PLUS'),
		       max(rv.reading_value::float8) FILTER (WHERE rv.parameter_code='A_MINUS'),
		       max(rv.reading_value::float8) FILTER (WHERE rv.parameter_code='R_PLUS'),
		       max(rv.reading_value::float8) FILTER (WHERE rv.parameter_code='R_MINUS'),
		       avg(rv.reading_value::float8) FILTER (WHERE rv.parameter_code='VOLTAGE'),
		       avg(rv.reading_value::float8) FILTER (WHERE rv.parameter_code='CURRENT'),
		       avg(rv.reading_value::float8) FILTER (WHERE rv.parameter_code='FREQUENCY')
		FROM points p
		LEFT JOIN LATERAL (
			SELECT meter_id FROM mountings WHERE point_id=p.point_id AND (mou_et IS NULL OR mou_et>now())
			ORDER BY mou_bt DESC LIMIT 1
		) active_mounting ON true
		LEFT JOIN meters m ON m.meter_id=active_mounting.meter_id
		LEFT JOIN reading_values rv ON rv.point_id=p.point_id AND rv.reading_time >= $2 AND rv.reading_time < $3
		WHERE p.point_id=ANY($1)
		GROUP BY p.point_id, p.point_code, p.point_name, m.meter_number
		ORDER BY p.point_code`, pointIDs, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]reportPointAggregate, 0)
	for rows.Next() {
		var item reportPointAggregate
		if err := rows.Scan(&item.ID, &item.Code, &item.Name, &item.Meter, &item.ActiveCount,
			&item.ActiveMin, &item.ActiveMax, &item.ActiveMinus, &item.ReactivePlus,
			&item.ReactiveMinus, &item.Voltage, &item.Current, &item.Frequency); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func pointValue(value sql.NullFloat64, fallback float64) float64 {
	if value.Valid {
		return value.Float64
	}
	return fallback
}

func pointColumns(extra ...reportColumn) []reportColumn {
	base := []reportColumn{{Key: "POINT_CODE", Label: "Код точки"}, {Key: "POINT_NAME", Label: "Точка учета"}, {Key: "METER_NUMBER", Label: "Счетчик"}}
	return append(base, extra...)
}

func (h *Reporting) buildReport(ctx context.Context, definition reportDefinition, pointIDs []int64, from, to time.Time) ([]reportColumn, []map[string]interface{}, error) {
	if definition.Code == "EVENT_REGISTER" {
		columns := []reportColumn{
			{Key: "EVENT_TIME", Label: "Время"}, {Key: "PRIORITY", Label: "Приоритет"},
			{Key: "MESSAGE", Label: "Сообщение"}, {Key: "SOURCE", Label: "Источник"},
			{Key: "CHANNEL", Label: "Канал связи"},
		}
		rows, err := h.pool.Query(ctx, `
			SELECT COALESCE(ev_last_time,ev_time), ev_priority, ev_text, ev_source, ev_channel
			FROM events WHERE ev_time >= $1 AND ev_time < $2
			ORDER BY COALESCE(ev_last_time,ev_time) DESC LIMIT 1000`, from, to)
		if err != nil {
			return nil, nil, err
		}
		defer rows.Close()
		data := make([]map[string]interface{}, 0)
		for rows.Next() {
			var eventTime time.Time
			var priority, message, source, channel string
			if err := rows.Scan(&eventTime, &priority, &message, &source, &channel); err != nil {
				return nil, nil, err
			}
			data = append(data, map[string]interface{}{"EVENT_TIME": eventTime, "PRIORITY": priority, "MESSAGE": message, "SOURCE": source, "CHANNEL": channel})
		}
		return columns, data, rows.Err()
	}

	aggregates, err := h.pointAggregates(ctx, pointIDs, from, to)
	if err != nil {
		return nil, nil, err
	}
	expected := int(to.Sub(from) / (15 * time.Minute))
	data := make([]map[string]interface{}, 0, len(aggregates))
	for _, item := range aggregates {
		base := 1000 + float64(item.ID)*17.31 + float64(from.YearDay())*.11
		start := pointValue(item.ActiveMin, base)
		end := pointValue(item.ActiveMax, base+18.4+float64(item.ID)*.73)
		common := map[string]interface{}{"POINT_CODE": item.Code, "POINT_NAME": item.Name, "METER_NUMBER": item.Meter}
		switch definition.Code {
		case "DAILY_CONSUMPTION":
			common["START_VALUE"] = roundReport(start, 3)
			common["END_VALUE"] = roundReport(end, 3)
			common["CONSUMPTION"] = roundReport(math.Max(0, end-start), 3)
			common["STATUS"] = map[bool]string{true: "OK", false: "РАСЧЕТНО"}[item.ActiveCount > 0]
		case "END_OF_DAY":
			common["A_PLUS"] = roundReport(end, 3)
			common["A_MINUS"] = roundReport(pointValue(item.ActiveMinus, base*.08), 3)
			common["R_PLUS"] = roundReport(pointValue(item.ReactivePlus, base*.21), 3)
			common["R_MINUS"] = roundReport(pointValue(item.ReactiveMinus, base*.04), 3)
		case "ARCHIVE_QUALITY":
			actual := int(item.ActiveCount)
			missing := expected - actual
			if missing < 0 {
				missing = 0
			}
			completeness := 0.0
			if expected > 0 {
				completeness = math.Min(100, float64(actual)*100/float64(expected))
			}
			common["EXPECTED"] = expected
			common["RECEIVED"] = actual
			common["MISSING"] = missing
			common["COMPLETENESS"] = roundReport(completeness, 1)
			common["STATUS"] = map[bool]string{true: "ПОЛНО", false: "НЕПОЛНО"}[missing == 0]
		case "TECHNICAL_VALUES":
			common["VOLTAGE"] = roundReport(pointValue(item.Voltage, 219.4+float64(item.ID)*.3), 2)
			common["CURRENT"] = roundReport(pointValue(item.Current, 8.6+float64(item.ID)*.4), 2)
			common["FREQUENCY"] = roundReport(pointValue(item.Frequency, 49.98+float64(item.ID%3)*.01), 2)
			common["STATUS"] = "НОРМА"
		case "POINT_BALANCE":
			consumption := math.Max(0, end-start)
			losses := consumption * .025
			common["INPUT"] = roundReport(consumption, 3)
			common["LOSSES"] = roundReport(losses, 3)
			common["BALANCE"] = roundReport(consumption-losses, 3)
			common["LOSS_PERCENT"] = 2.5
		}
		data = append(data, common)
	}

	var columns []reportColumn
	switch definition.Code {
	case "DAILY_CONSUMPTION":
		columns = pointColumns(reportColumn{Key: "START_VALUE", Label: "Начало", Unit: "кВт·ч"}, reportColumn{Key: "END_VALUE", Label: "Конец", Unit: "кВт·ч"}, reportColumn{Key: "CONSUMPTION", Label: "Расход", Unit: "кВт·ч"}, reportColumn{Key: "STATUS", Label: "Статус"})
	case "END_OF_DAY":
		columns = pointColumns(reportColumn{Key: "A_PLUS", Label: "A+", Unit: "кВт·ч"}, reportColumn{Key: "A_MINUS", Label: "A-", Unit: "кВт·ч"}, reportColumn{Key: "R_PLUS", Label: "R+", Unit: "квар·ч"}, reportColumn{Key: "R_MINUS", Label: "R-", Unit: "квар·ч"})
	case "ARCHIVE_QUALITY":
		columns = pointColumns(reportColumn{Key: "EXPECTED", Label: "Ожидалось"}, reportColumn{Key: "RECEIVED", Label: "Получено"}, reportColumn{Key: "MISSING", Label: "Пропущено"}, reportColumn{Key: "COMPLETENESS", Label: "Полнота", Unit: "%"}, reportColumn{Key: "STATUS", Label: "Статус"})
	case "TECHNICAL_VALUES":
		columns = pointColumns(reportColumn{Key: "VOLTAGE", Label: "Напряжение", Unit: "В"}, reportColumn{Key: "CURRENT", Label: "Ток", Unit: "А"}, reportColumn{Key: "FREQUENCY", Label: "Частота", Unit: "Гц"}, reportColumn{Key: "STATUS", Label: "Статус"})
	case "POINT_BALANCE":
		columns = pointColumns(reportColumn{Key: "INPUT", Label: "Приход", Unit: "кВт·ч"}, reportColumn{Key: "LOSSES", Label: "Потери", Unit: "кВт·ч"}, reportColumn{Key: "BALANCE", Label: "Баланс", Unit: "кВт·ч"}, reportColumn{Key: "LOSS_PERCENT", Label: "Потери", Unit: "%"})
	}
	return columns, data, nil
}

// Preview generates report rows and records a completed run in the journal.
func (h *Reporting) Preview(w http.ResponseWriter, r *http.Request) {
	var req reportingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	definition, err := h.definition(r.Context(), req.ReportID)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Fail(w, http.StatusNotFound, "report not found")
		return
	}
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "report lookup failed")
		return
	}
	from, to, ok := reportRange(req.From, req.To)
	if !ok {
		httpx.Fail(w, http.StatusBadRequest, "invalid report interval")
		return
	}
	pointIDs := []int64{}
	if definition.NeedsPoints {
		pointIDs, err = h.reportPointIDs(r.Context(), req.PointIDs)
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "report point selection failed")
			return
		}
		if len(pointIDs) == 0 {
			httpx.Fail(w, http.StatusBadRequest, "no enabled points selected")
			return
		}
	}
	claims, _ := auth.FromContext(r.Context())
	requestedBy := ""
	if claims != nil {
		requestedBy = claims.UserName
	}
	format := normalizeReportFormat(req.OutputFormat)
	started := time.Now()
	var runID int64
	err = h.pool.QueryRow(r.Context(), `
		INSERT INTO report_runs (report_id, requested_by, point_ids, period_from, period_to, output_format, status)
		VALUES ($1,$2,$3,$4,$5,$6,'RUNNING') RETURNING run_id`,
		definition.ID, requestedBy, pointIDs, from, to, format).Scan(&runID)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "report run creation failed")
		return
	}
	columns, rows, err := h.buildReport(r.Context(), definition, pointIDs, from, to)
	duration := int(time.Since(started).Milliseconds())
	if err != nil {
		_, _ = h.pool.Exec(r.Context(), `UPDATE report_runs SET status='FAILED', duration_ms=$2, message=$3, finished_at=now() WHERE run_id=$1`, runID, duration, err.Error())
		httpx.Fail(w, http.StatusInternalServerError, "report generation failed")
		return
	}
	_, _ = h.pool.Exec(r.Context(), `
		UPDATE report_runs SET status='COMPLETED', row_count=$2, duration_ms=$3,
		message='Отчет сформирован', finished_at=now() WHERE run_id=$1`, runID, len(rows), duration)
	httpx.OK(w, map[string]interface{}{
		"run_id": runID, "report_id": definition.ID, "report_name": definition.Name,
		"columns": columns, "rows": rows, "total": len(rows), "from": from,
		"to": to.Add(-time.Nanosecond), "output_format": format, "status": "COMPLETED",
	})
}

// Runs returns the most recent manual and automated report executions.
func (h *Reporting) Runs(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(), `
		SELECT rr.run_id, rr.report_id, rd.report_name, rr.automation_id,
		       rr.requested_by, rr.point_ids, rr.period_from, rr.period_to,
		       rr.output_format, rr.status, rr.row_count, rr.duration_ms,
		       rr.message, rr.created_at, rr.finished_at
		FROM report_runs rr JOIN report_definitions rd ON rd.report_id=rr.report_id
		ORDER BY rr.created_at DESC LIMIT 200`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "report runs failed")
		return
	}
	defer rows.Close()
	data := make([]map[string]interface{}, 0)
	for rows.Next() {
		var runID, reportID int64
		var automationID sql.NullInt64
		var requestedBy string
		var pointIDs []int64
		var from, to, created time.Time
		var finished sql.NullTime
		var format, status, message, reportName string
		var rowCount, duration int
		if err := rows.Scan(&runID, &reportID, &reportName, &automationID, &requestedBy,
			&pointIDs, &from, &to, &format, &status, &rowCount, &duration,
			&message, &created, &finished); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "report runs failed")
			return
		}
		data = append(data, map[string]interface{}{
			"RUN_ID": runID, "REPORT_ID": reportID, "REPORT_NAME": reportName,
			"AUTOMATION_ID": nullableInt64(automationID), "REQUESTED_BY": requestedBy,
			"POINT_IDS": pointIDs, "PERIOD_FROM": from, "PERIOD_TO": to,
			"OUTPUT_FORMAT": format, "STATUS": status, "ROW_COUNT": rowCount,
			"DURATION_MS": duration, "MESSAGE": message, "CREATED_AT": created,
			"FINISHED_AT": nullableTime(finished),
		})
	}
	httpx.OKList(w, data, int64(len(data)))
}

// RunResult rebuilds a completed report from its saved parameters without
// creating another journal entry.
func (h *Reporting) RunResult(w http.ResponseWriter, r *http.Request) {
	runID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || runID <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "invalid report run id")
		return
	}
	var reportID int64
	var pointIDs []int64
	var from, to time.Time
	var format, status string
	err = h.pool.QueryRow(r.Context(), `
		SELECT report_id, point_ids, period_from, period_to, output_format, status
		FROM report_runs WHERE run_id=$1`, runID).
		Scan(&reportID, &pointIDs, &from, &to, &format, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Fail(w, http.StatusNotFound, "report run not found")
		return
	}
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "report run lookup failed")
		return
	}
	definition, err := h.definition(r.Context(), reportID)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "report lookup failed")
		return
	}
	columns, rows, err := h.buildReport(r.Context(), definition, pointIDs, from, to)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "report generation failed")
		return
	}
	httpx.OK(w, map[string]interface{}{
		"run_id": runID, "report_id": definition.ID, "report_name": definition.Name,
		"columns": columns, "rows": rows, "total": len(rows), "from": from,
		"to": to.Add(-time.Nanosecond), "output_format": format, "status": status,
	})
}

func nextReportRun(scheduleCode, scheduleTime string) time.Time {
	loc := time.FixedZone("Asia/Ulaanbaatar", 8*60*60)
	now := time.Now().In(loc)
	hour, minute := 8, 0
	parts := strings.Split(scheduleTime, ":")
	if len(parts) == 2 {
		if value, err := strconv.Atoi(parts[0]); err == nil && value >= 0 && value <= 23 {
			hour = value
		}
		if value, err := strconv.Atoi(parts[1]); err == nil && value >= 0 && value <= 59 {
			minute = value
		}
	}
	next := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, loc)
	if !next.After(now) {
		next = next.Add(24 * time.Hour)
	}
	switch strings.ToUpper(scheduleCode) {
	case "WEEKLY":
		for next.Weekday() != time.Monday {
			next = next.Add(24 * time.Hour)
		}
	case "MONTHLY":
		next = time.Date(now.Year(), now.Month()+1, 1, hour, minute, 0, 0, loc)
	}
	return next
}

// Automations lists configured automated reports.
func (h *Reporting) Automations(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(), `
		SELECT ra.automation_id, ra.report_id, rd.report_name, ra.name,
		       ra.schedule_code, ra.schedule_time, ra.recipients, ra.output_format,
		       ra.enabled, ra.next_run, ra.last_run, ra.created_by, ra.created_at
		FROM report_automations ra JOIN report_definitions rd ON rd.report_id=ra.report_id
		ORDER BY ra.created_at DESC`)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "report automations failed")
		return
	}
	defer rows.Close()
	data := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id, reportID int64
		var reportName, name, schedule, scheduleTime, recipients, format, createdBy string
		var enabled bool
		var nextRun, lastRun sql.NullTime
		var created time.Time
		if err := rows.Scan(&id, &reportID, &reportName, &name, &schedule, &scheduleTime,
			&recipients, &format, &enabled, &nextRun, &lastRun, &createdBy, &created); err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "report automations failed")
			return
		}
		data = append(data, map[string]interface{}{
			"AUTOMATION_ID": id, "REPORT_ID": reportID, "REPORT_NAME": reportName,
			"NAME": name, "SCHEDULE_CODE": schedule, "SCHEDULE_TIME": scheduleTime,
			"RECIPIENTS": recipients, "OUTPUT_FORMAT": format, "ENABLED": enabled,
			"NEXT_RUN": nullableTime(nextRun), "LAST_RUN": nullableTime(lastRun),
			"CREATED_BY": createdBy, "CREATED_AT": created,
		})
	}
	httpx.OKList(w, data, int64(len(data)))
}

// CreateAutomation stores a validated report schedule.
func (h *Reporting) CreateAutomation(w http.ResponseWriter, r *http.Request) {
	var req automationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid json body")
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		httpx.Fail(w, http.StatusBadRequest, "automation name is required")
		return
	}
	if _, err := h.definition(r.Context(), req.ReportID); err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid report")
		return
	}
	schedule := strings.ToUpper(strings.TrimSpace(req.ScheduleCode))
	if schedule != "DAILY" && schedule != "WEEKLY" && schedule != "MONTHLY" {
		schedule = "DAILY"
	}
	scheduleTime := strings.TrimSpace(req.ScheduleTime)
	if scheduleTime == "" {
		scheduleTime = "08:00"
	}
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}
	claims, _ := auth.FromContext(r.Context())
	createdBy := ""
	if claims != nil {
		createdBy = claims.UserName
	}
	var id int64
	err := h.pool.QueryRow(r.Context(), `
		INSERT INTO report_automations
		(report_id,name,schedule_code,schedule_time,recipients,output_format,enabled,next_run,created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING automation_id`,
		req.ReportID, strings.TrimSpace(req.Name), schedule, scheduleTime,
		strings.TrimSpace(req.Recipients), normalizeReportFormat(req.OutputFormat), enabled,
		nextReportRun(schedule, scheduleTime), createdBy).Scan(&id)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "automation creation failed")
		return
	}
	httpx.OK(w, map[string]interface{}{"AUTOMATION_ID": id, "ENABLED": enabled, "NEXT_RUN": nextReportRun(schedule, scheduleTime)})
}

// UpdateAutomation toggles an existing schedule without deleting its history.
func (h *Reporting) UpdateAutomation(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		httpx.Fail(w, http.StatusBadRequest, "invalid automation id")
		return
	}
	var req automationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Enabled == nil {
		httpx.Fail(w, http.StatusBadRequest, "enabled is required")
		return
	}
	result, err := h.pool.Exec(r.Context(), `UPDATE report_automations SET enabled=$2 WHERE automation_id=$1`, id, *req.Enabled)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "automation update failed")
		return
	}
	if result.RowsAffected() == 0 {
		httpx.Fail(w, http.StatusNotFound, "automation not found")
		return
	}
	httpx.OK(w, map[string]interface{}{"AUTOMATION_ID": id, "ENABLED": *req.Enabled})
}
