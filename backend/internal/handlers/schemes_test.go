package handlers

import "testing"

func TestSchemeSignalState(t *testing.T) {
	tests := []struct {
		current, signalType string
		blocked             bool
		want                string
	}{
		{"1", "POWER", false, "on"},
		{"0", "POWER", false, "off"},
		{"1", "ALARM", false, "alarm"},
		{"1", "POWER", true, "blocked"},
	}
	for _, test := range tests {
		if got := schemeSignalState(test.current, test.signalType, test.blocked); got != test.want {
			t.Fatalf("state(%q,%q,%v)=%q, want %q", test.current, test.signalType, test.blocked, got, test.want)
		}
	}
}
