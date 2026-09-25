package handlers

import (
	"strings"
	"testing"
)

func TestMeterRegistryWhere(t *testing.T) {
	typeID := int64(3)
	where, args := meterRegistryWhere(meterRegistryQuery{Search: "TEC", MeterTypeID: &typeID, MountState: "mounted"})
	if !strings.Contains(where, "ILIKE $1") || !strings.Contains(where, "meter_type_id=$2") || !strings.Contains(where, "mou.mou_et IS NULL") {
		t.Fatalf("unexpected where clause: %s", where)
	}
	if len(args) != 2 || args[0] != "%TEC%" || args[1] != typeID {
		t.Fatalf("unexpected args: %#v", args)
	}
}

func TestMeterRegistryPage(t *testing.T) {
	limit, offset := meterRegistryPage(1000, -5)
	if limit != 500 || offset != 0 {
		t.Fatalf("unexpected page: %d %d", limit, offset)
	}
}
