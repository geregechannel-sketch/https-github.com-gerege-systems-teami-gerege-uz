package teamisource

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Mapping is supplied by a trusted integration operator, never by the source
// response. No source/target identifier equality or timezone default is assumed.
type Mapping struct {
	SourceRef string
	Point     int64
	ML        int64
	MD        int64
	Agg       int64
	Unit      string
	Zone      *time.Location `json:"-"`
}

type Stored struct {
	Inserted  int
	Unchanged int
	Missing   int
	Receipt   string
}

// Store is an internal batch operation, not an HTTP import endpoint. A conflict
// rolls back the entire batch. It does not overwrite corrections automatically.
func Store(ctx context.Context, pool *pgxpool.Pool, request Request, mapping Mapping, body []byte) (Stored, error) {
	if pool == nil || mapping.Zone == nil || strings.TrimSpace(mapping.SourceRef) == "" || strings.TrimSpace(mapping.Unit) == "" || mapping.Point <= 0 || mapping.ML <= 0 || mapping.MD <= 0 || mapping.Agg <= 0 || len(request.ML) != 1 {
		return Stored{}, fmt.Errorf("explicit source/target mapping, unit and timezone required")
	}
	expected, err := NewRequest(request.Point, request.ML[0], request.MD, request.Agg, request.From, request.To)
	if err != nil {
		return Stored{}, err
	}
	wire, _ := json.Marshal(request)
	observed, _ := json.Marshal(expected)
	if string(wire) != string(observed) {
		return Stored{}, fmt.Errorf("unsupported source query flags")
	}
	archive, err := Decode(body, request.Point, request.ML[0])
	if err != nil {
		return Stored{}, err
	}
	from, _ := time.ParseInLocation("2006-01-02", request.From, mapping.Zone)
	to, _ := time.ParseInLocation("2006-01-02", request.To, mapping.Zone)
	to = to.AddDate(0, 0, 1)
	_, offsetFrom := from.Zone()
	_, offsetTo := to.Zone()
	selection, err := json.Marshal(struct {
		Request    Request
		Mapping    Mapping
		Zone       string
		OffsetFrom int
		OffsetTo   int
	}{request, mapping, mapping.Zone.String(), offsetFrom, offsetTo})
	if err != nil {
		return Stored{}, fmt.Errorf("invalid mapping")
	}
	// Fixed zones can share a name, so bind the effective range offsets as well.
	digest := sha256.New()
	digest.Write(selection)
	fmt.Fprintf(digest, "\n%d/%d\n", offsetFrom, offsetTo)
	digest.Write(body)
	result := Stored{Receipt: fmt.Sprintf("%x", digest.Sum(nil))}
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return Stored{}, fmt.Errorf("archive transaction unavailable")
	}
	defer tx.Rollback(context.Background())
	var targetExists bool
	if err := tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM points WHERE point_id=$1)", mapping.Point).Scan(&targetExists); err != nil || !targetExists {
		return Stored{}, fmt.Errorf("mapped target point does not exist")
	}
	// Serialize writers to this target series, including different source IDs.
	lock := fmt.Sprintf("archive:%d:%d:%d:%d", mapping.Point, mapping.ML, mapping.MD, mapping.Agg)
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtextextended($1,0))", lock); err != nil {
		return Stored{}, fmt.Errorf("archive series lock unavailable")
	}
	for i, row := range archive.Rows {
		begin, end, err := row.Interval(mapping.Zone)
		if err != nil || begin.Before(from) || !begin.Before(to) || end.After(to) {
			return Stored{}, fmt.Errorf("source interval outside requested period at row %d", i)
		}
		if row.Value == nil {
			result.Missing++
			continue
		}
		var readTime *time.Time
		if row.ReadTime != nil {
			t, err := time.ParseInLocation("2006-01-02 15:04:05", *row.ReadTime, mapping.Zone)
			if err != nil {
				return Stored{}, fmt.Errorf("invalid source read time at row %d", i)
			}
			readTime = &t
		}
		status := ""
		if row.Status != nil {
			status = *row.Status
		}
		args := []interface{}{mapping.Point, mapping.ML, mapping.MD, mapping.Agg, begin, end, row.Value.String(), mapping.Unit, status, mapping.SourceRef, string(row.Raw), readTime, mapping.Zone.String()}
		tag, err := tx.Exec(ctx, `INSERT INTO archive_samples(point_id,ml_id,md_id,aggs_id,begin_time,end_time,value,unit,source_status,source_ref,source_payload,source_read_time,source_time_zone) VALUES($1,$2,$3,$4,$5,$6,$7::numeric,$8,$9,$10,$11::jsonb,$12,$13) ON CONFLICT DO NOTHING`, args...)
		if err != nil {
			return Stored{}, fmt.Errorf("archive insert failed at row %d", i)
		}
		if tag.RowsAffected() == 1 {
			result.Inserted++
			continue
		}
		var same bool
		err = tx.QueryRow(ctx, `SELECT end_time=$6 AND value=$7::numeric AND unit=$8 AND source_status=$9 AND source_ref=$10 AND source_payload IS NOT DISTINCT FROM $11::jsonb AND source_read_time IS NOT DISTINCT FROM $12::timestamptz AND source_time_zone IS NOT DISTINCT FROM $13::text FROM archive_samples WHERE point_id=$1 AND ml_id=$2 AND md_id=$3 AND aggs_id=$4 AND begin_time=$5`, args...).Scan(&same)
		if err != nil || !same {
			return Stored{}, fmt.Errorf("archive conflict at row %d: review source correction or mapping", i)
		}
		result.Unchanged++
	}
	if _, err := tx.Exec(ctx, `INSERT INTO archive_source_receipts(receipt_id,source_ref,selection,response) VALUES($1,$2,$3::jsonb,$4::jsonb) ON CONFLICT DO NOTHING`, result.Receipt, mapping.SourceRef, string(selection), string(body)); err != nil {
		return Stored{}, fmt.Errorf("source receipt could not be retained")
	}
	if err := tx.Commit(ctx); err != nil {
		return Stored{}, fmt.Errorf("archive batch commit failed")
	}
	return result, nil
}
