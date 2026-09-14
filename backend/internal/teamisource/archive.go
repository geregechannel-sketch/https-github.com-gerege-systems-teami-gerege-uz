// Package teamisource handles the observed TEAMI archive contract.
// Network and authentication are supplied separately by the integration host.
package teamisource

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"time"
)

type Request struct {
	From                   string  `json:"FROM"`
	To                     string  `json:"TO"`
	Point                  int64   `json:"POINT_ID"`
	ML                     []int64 `json:"ML_ID"`
	MD                     int64   `json:"MD_ID"`
	Agg                    int64   `json:"AGGS_ID"`
	WithoutBypass          int     `json:"WO_BYP"`
	WithoutActs            int     `json:"WO_ACTS"`
	BillingHour            int     `json:"BILLING_HOUR"`
	BillingHourPreviousDay int     `json:"BILLING_HOUR_FOR_PREV_DAY"`
	ShowMapData            int     `json:"SHOW_MAP_DATA"`
	Frozen                 int     `json:"FREEZED"`
}

// NewRequest reproduces the single-point, single-parameter capture. Dates are
// source calendar dates with an inclusive end, unlike the local archive API.
func NewRequest(point, ml, md, agg int64, from, to string) (Request, error) {
	a, err1 := time.Parse("2006-01-02", from)
	b, err2 := time.Parse("2006-01-02", to)
	if point <= 0 || ml <= 0 || md <= 0 || agg <= 0 || err1 != nil || err2 != nil || b.Before(a) || b.Sub(a) >= 366*24*time.Hour {
		return Request{}, fmt.Errorf("invalid source archive selection")
	}
	return Request{From: from, To: to, Point: point, ML: []int64{ml}, MD: md, Agg: agg, Frozen: 1}, nil
}

type Row struct {
	Point    int64           `json:"POINT_ID"`
	ML       int64           `json:"ML_ID"`
	Begin    string          `json:"BT"`
	End      string          `json:"ET"`
	Value    *json.Number    `json:"VAL"`
	ReadTime *string         `json:"READ_TIME"`
	HSS      *int            `json:"HSS"`
	DSS      *string         `json:"DSS"`
	Status   *string         `json:"SFS"`
	Tariff   *int64          `json:"TFF_ID"`
	Raw      json.RawMessage `json:"-"`
}

type Archive struct {
	Rows   []Row
	DBTime json.RawMessage
}

// Decode keeps source wall-clock timestamps and decimal text intact. Raw rows
// retain additional source fields without inventing semantics for them.
func Decode(body []byte, expectedPoint, expectedML int64) (Archive, error) {
	if len(body) > 16*1024*1024 || expectedPoint <= 0 || expectedML <= 0 {
		return Archive{}, fmt.Errorf("invalid source response bounds")
	}
	var envelope struct {
		Success bool              `json:"success"`
		Data    []json.RawMessage `json:"data"`
		DBTime  json.RawMessage   `json:"DB_TIME"`
	}
	d := json.NewDecoder(bytes.NewReader(body))
	if err := d.Decode(&envelope); err != nil || !envelope.Success || envelope.Data == nil || len(envelope.Data) > 10000 {
		return Archive{}, fmt.Errorf("invalid or unsuccessful source response")
	}
	if err := d.Decode(new(interface{})); err != io.EOF {
		return Archive{}, fmt.Errorf("expected one source response")
	}
	out := Archive{Rows: make([]Row, 0, len(envelope.Data)), DBTime: envelope.DBTime}
	seen := make(map[string]bool)
	for i, raw := range envelope.Data {
		var row Row
		if err := json.Unmarshal(raw, &row); err != nil || row.Point != expectedPoint || row.ML != expectedML {
			return Archive{}, fmt.Errorf("source selection mismatch at row %d", i)
		}
		a, err1 := time.Parse("2006-01-02 15:04:05", row.Begin)
		b, err2 := time.Parse("2006-01-02 15:04:05", row.End)
		if err1 != nil || err2 != nil || !b.After(a) || seen[row.Begin] {
			return Archive{}, fmt.Errorf("invalid or duplicate interval at row %d", i)
		}
		if row.ReadTime != nil {
			if _, err := time.Parse("2006-01-02 15:04:05", *row.ReadTime); err != nil {
				return Archive{}, fmt.Errorf("invalid source read time at row %d", i)
			}
		}
		seen[row.Begin] = true
		row.Raw = append(json.RawMessage(nil), raw...)
		out.Rows = append(out.Rows, row)
	}
	return out, nil
}

// Interval requires an explicitly verified source timezone. The observed wall
// clock strings alone are insufficient to infer UTC or the operator's timezone.
func (r Row) Interval(sourceZone *time.Location) (time.Time, time.Time, error) {
	if sourceZone == nil {
		return time.Time{}, time.Time{}, fmt.Errorf("source timezone must be verified before timestamp conversion")
	}
	a, err1 := time.ParseInLocation("2006-01-02 15:04:05", r.Begin, sourceZone)
	b, err2 := time.ParseInLocation("2006-01-02 15:04:05", r.End, sourceZone)
	if err1 != nil || err2 != nil || !b.After(a) {
		return time.Time{}, time.Time{}, fmt.Errorf("invalid source interval")
	}
	return a.UTC(), b.UTC(), nil
}
