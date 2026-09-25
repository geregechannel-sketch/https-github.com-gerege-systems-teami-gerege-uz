package handlers

import "testing"

func TestQualityPointIDs(t *testing.T) {
	ids := qualityPointIDs("[1,2,2]", "3;bad", "4")
	if len(ids) != 4 || ids[0] != 1 || ids[3] != 4 {
		t.Fatalf("unexpected IDs: %v", ids)
	}
}

func TestQualityRange(t *testing.T) {
	_, _, days := qualityRange("2026-09-17", "2026-09-23", "DAY")
	if days != 7 {
		t.Fatalf("expected 7 days, got %d", days)
	}
	_, _, months := qualityRange("2026-01-01", "2026-09-23", "MONTH")
	if months != 9 {
		t.Fatalf("expected 9 months, got %d", months)
	}
}
