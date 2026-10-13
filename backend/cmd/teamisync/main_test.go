package main

import (
	"encoding/json"
	"strings"
	"testing"
)

func validPlan() plan {
	return plan{SourceRef: "test-source", Timezone: "Asia/Ulaanbaatar", From: "2026-09-14", To: "2026-09-14", Series: []selection{{SourcePoint: 7, SourceML: 1044, SourceMD: 12, SourceAgg: 13, TargetPoint: 45, TargetML: 1044, TargetMD: 12, TargetAgg: 13, Unit: "kW"}}}
}

func TestPrepareRequiresVerifiedMapping(t *testing.T) {
	for _, tc := range []struct {
		name   string
		change func(*plan)
	}{
		{"timezone", func(p *plan) { p.Timezone = "" }},
		{"local timezone", func(p *plan) { p.Timezone = "Local" }},
		{"source reference", func(p *plan) { p.SourceRef = "" }},
		{"target point", func(p *plan) { p.Series[0].TargetPoint = 0 }},
		{"unit", func(p *plan) { p.Series[0].Unit = "" }},
		{"dates", func(p *plan) { p.To = "2026-09-13" }},
		{"duplicate target", func(p *plan) { p.Series = append(p.Series, p.Series[0]) }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p := validPlan()
			tc.change(&p)
			b, _ := json.Marshal(p)
			if _, err := prepare(strings.NewReader(string(b))); err == nil {
				t.Fatal("invalid mapping accepted")
			}
		})
	}
	b, _ := json.Marshal(validPlan())
	queries, err := prepare(strings.NewReader(string(b)))
	if err != nil || len(queries) != 1 || queries[0].Request.Point != 7 || queries[0].Mapping.Point != 45 {
		t.Fatalf("mapping mismatch: %v %v", queries, err)
	}
	if _, err := prepare(strings.NewReader(string(b) + "{}")); err == nil {
		t.Fatal("trailing JSON accepted")
	}
	if _, err := prepare(strings.NewReader(`{"token":"secret"}`)); err == nil {
		t.Fatal("credentials in plan accepted")
	}
}
