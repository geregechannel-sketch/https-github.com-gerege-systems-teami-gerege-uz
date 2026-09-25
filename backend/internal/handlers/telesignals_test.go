package handlers

import (
	"testing"
	"time"
)

func TestSignalTimeRangeDateIncludesWholeDay(t *testing.T) {
	from, to, ok := signalTimeRange("2026-09-23", "2026-09-23")
	if !ok {
		t.Fatal("expected valid signal range")
	}
	if got := to.Sub(from); got != 24*time.Hour-time.Nanosecond {
		t.Fatalf("expected whole day, got %v", got)
	}
}

func TestSignalTimeRangeSwapsBounds(t *testing.T) {
	from, to, ok := signalTimeRange("2026-09-24", "2026-09-23")
	if !ok || !from.Before(to) {
		t.Fatalf("expected ordered bounds: from=%v to=%v ok=%v", from, to, ok)
	}
}
