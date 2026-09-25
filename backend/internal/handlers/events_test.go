package handlers

import "testing"

func TestEventCategoryID(t *testing.T) {
	cases := map[string]int{"all": 0, "oracle": 1, "software": 2, "connection": 3, "data": 4, "system": 5, "3": 3, "99": 0}
	for input, expected := range cases {
		if actual := eventCategoryID(input); actual != expected {
			t.Fatalf("eventCategoryID(%q)=%d, want %d", input, actual, expected)
		}
	}
}

func TestEventLogRange(t *testing.T) {
	from, to, ok := eventLogRange("2026-09-20", "2026-09-23")
	if !ok || to.Sub(from).Hours() != 96 {
		t.Fatalf("unexpected event range: %v %v ok=%v", from, to, ok)
	}
	from, to, ok = eventLogRange("23-09-2026", "20-09-2026")
	if !ok || to.Sub(from).Hours() != 96 {
		t.Fatalf("reversed event range was not normalized: %v %v ok=%v", from, to, ok)
	}
}

func TestEventLogWhere(t *testing.T) {
	where, args, ok := eventLogWhere(eventLogRequest{
		Category: "system", From: "2026-09-20", To: "2026-09-23",
		Priority: "error", Search: "таймаут", Source: "DAS",
	})
	if !ok || len(args) != 6 {
		t.Fatalf("unexpected event where args: %q %#v ok=%v", where, args, ok)
	}
	if where == "" {
		t.Fatal("expected a where clause")
	}
}
