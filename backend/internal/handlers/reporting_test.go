package handlers

import (
	"testing"
	"time"
)

func TestReportRange(t *testing.T) {
	from, to, ok := reportRange("2026-09-20", "2026-09-23")
	if !ok || to.Sub(from).Hours() != 96 {
		t.Fatalf("unexpected report range: %v %v ok=%v", from, to, ok)
	}
	if _, _, ok := reportRange("bad", "2026-09-23"); ok {
		t.Fatal("expected invalid report range")
	}
}

func TestNormalizeReportFormat(t *testing.T) {
	for input, expected := range map[string]string{"csv": "CSV", "PDF": "PDF", "xlsx": "XLSX", "doc": "XLSX"} {
		if actual := normalizeReportFormat(input); actual != expected {
			t.Fatalf("normalizeReportFormat(%q)=%q, want %q", input, actual, expected)
		}
	}
}

func TestNextReportRun(t *testing.T) {
	for _, schedule := range []string{"DAILY", "WEEKLY", "MONTHLY"} {
		if !nextReportRun(schedule, "08:30").After(time.Now()) {
			t.Fatalf("next run for %s is not in the future", schedule)
		}
	}
}
