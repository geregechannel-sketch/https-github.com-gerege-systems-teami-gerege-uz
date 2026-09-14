package teamisource

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

const example = `{"success":true,"data":[{"POINT_ID":7,"ML_ID":1044,"BT":"2026-09-14 00:00:00","ET":"2026-09-14 00:15:00","VAL":8.460000000000001,"READ_TIME":"2026-09-14 11:58:10","HSS":0,"DSS":"1","SFS":"Нормальные данные","TFF_ID":0,"DR":0.141},{"POINT_ID":7,"ML_ID":1044,"BT":"2026-09-14 00:15:00","ET":"2026-09-14 00:30:00","VAL":null,"HSS":1,"DSS":null,"SFS":null}],"DB_TIME":"2026-09-14 12:00:00"}`

func TestPreservesDecimalsMissingAndSourceMetadata(t *testing.T) {
	a, err := Decode([]byte(example), 7, 1044)
	if err != nil {
		t.Fatal(err)
	}
	if len(a.Rows) != 2 || a.Rows[0].Value.String() != "8.460000000000001" || a.Rows[1].Value != nil {
		t.Fatal("precision or missing value changed")
	}
	if *a.Rows[0].DSS != "1" || *a.Rows[0].Tariff != 0 || !strings.Contains(string(a.Rows[0].Raw), `"DR":0.141`) {
		t.Fatal("source metadata lost")
	}
	if _, _, err := a.Rows[0].Interval(nil); err == nil {
		t.Fatal("timezone must not be guessed")
	}
	begin, _, err := a.Rows[0].Interval(time.FixedZone("test-only-offset", 8*3600))
	if err != nil || begin.Format(time.RFC3339) != "2026-09-13T16:00:00Z" {
		t.Fatal("explicit offset conversion failed")
	}
}

func TestRejectsInvalidResponses(t *testing.T) {
	for _, body := range []string{
		`{"success":false,"data":[]}`,
		`{"success":true}`,
		example + `{}`,
		strings.ReplaceAll(example, `"POINT_ID":7`, `"POINT_ID":8`),
		strings.ReplaceAll(example, `"ML_ID":1044`, `"ML_ID":1045`),
		strings.Replace(example, `"VAL":8.460000000000001`, `"VAL":"bad"`, 1),
		strings.Replace(example, `"ET":"2026-09-14 00:15:00"`, `"ET":"2026-09-13 00:15:00"`, 1),
		strings.Replace(example, `"BT":"2026-09-14 00:15:00"`, `"BT":"2026-09-14 00:00:00"`, 1),
	} {
		if _, err := Decode([]byte(body), 7, 1044); err == nil {
			t.Fatal("invalid source response accepted")
		}
	}
}

func TestRequestUsesObservedWireFormat(t *testing.T) {
	r, err := NewRequest(7, 1044, 12, 13, "2026-09-14", "2026-09-14")
	if err != nil {
		t.Fatal(err)
	}
	b, err := json.Marshal(r)
	if err != nil || !strings.Contains(string(b), `"ML_ID":[1044]`) || !strings.Contains(string(b), `"FREEZED":1`) || !strings.Contains(string(b), `"WO_ACTS":0`) {
		t.Fatal("source wire format changed")
	}
	if _, err := NewRequest(7, 1044, 12, 13, "2026-02-30", "2026-03-01"); err == nil {
		t.Fatal("invalid calendar accepted")
	}
	if _, err := NewRequest(7, 1044, 12, 13, "2026-09-15", "2026-09-14"); err == nil {
		t.Fatal("reversed calendar accepted")
	}
}
