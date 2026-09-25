package handlers

import "testing"

func TestReadingRange(t *testing.T) {
	from, to, ok := readingRange("2026-09-23", "2026-09-23")
	if !ok {
		t.Fatal("expected valid interval")
	}
	if got := int(to.Sub(from).Minutes()); got != 23*60+45 {
		t.Fatalf("expected a full quarter-hour day, got %d minutes", got)
	}

	from, to, ok = readingRange("2026-09-23", "2026-09-01")
	if !ok || from.After(to) {
		t.Fatalf("expected reversed dates to be normalized: %v - %v", from, to)
	}

	if _, _, ok := readingRange("bad", "2026-09-23"); ok {
		t.Fatal("expected invalid date to be rejected")
	}
}

func TestNormalizeReadingParameters(t *testing.T) {
	parameters := normalizeReadingParameters([]string{"a_plus", "A_PLUS", "voltage", "bad"})
	if len(parameters) != 2 || parameters[0].Code != "A_PLUS" || parameters[1].Code != "VOLTAGE" {
		t.Fatalf("unexpected parameters: %#v", parameters)
	}
	defaults := normalizeReadingParameters(nil)
	if len(defaults) != 1 || defaults[0].Code != "A_PLUS" {
		t.Fatalf("unexpected defaults: %#v", defaults)
	}
}
