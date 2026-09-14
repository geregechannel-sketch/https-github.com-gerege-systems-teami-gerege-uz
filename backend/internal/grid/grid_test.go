package grid

import (
	"strings"
	"testing"
)

// resolver whitelisting a couple of columns.
func testResolve(api string) (string, bool) {
	switch api {
	case "POINT_NAME":
		return "point_name", true
	case "POINT_ENABLED":
		return "point_enabled", true
	case "GR_ID":
		return "gr_id", true
	}
	return "", false
}

func TestBuildWhere_DefaultOperator(t *testing.T) {
	where, args, err := BuildWhere([]Filter{{C: "POINT_ENABLED", V: 1}}, testResolve, 1)
	if err != nil {
		t.Fatal(err)
	}
	if where != "point_enabled = $1" {
		t.Fatalf("got %q", where)
	}
	if len(args) != 1 || args[0] != 1 {
		t.Fatalf("args %v", args)
	}
}

func TestBuildWhere_Operators(t *testing.T) {
	where, args, err := BuildWhere([]Filter{
		{C: "POINT_NAME", P: "ilike", V: "%tp%"},
		{C: "GR_ID", P: ">=", V: 5},
	}, testResolve, 1)
	if err != nil {
		t.Fatal(err)
	}
	if where != "point_name ILIKE $1 AND gr_id >= $2" {
		t.Fatalf("got %q", where)
	}
	if len(args) != 2 {
		t.Fatalf("args %v", args)
	}
}

func TestBuildWhere_In(t *testing.T) {
	where, args, err := BuildWhere([]Filter{
		{C: "GR_ID", P: "in", V: []interface{}{1, 2, 3}},
	}, testResolve, 1)
	if err != nil {
		t.Fatal(err)
	}
	if where != "gr_id IN ($1,$2,$3)" {
		t.Fatalf("got %q", where)
	}
	if len(args) != 3 {
		t.Fatalf("args %v", args)
	}
}

func TestBuildWhere_Null(t *testing.T) {
	where, args, err := BuildWhere([]Filter{{C: "GR_ID", P: "null"}}, testResolve, 1)
	if err != nil || where != "gr_id IS NULL" || len(args) != 0 {
		t.Fatalf("where=%q args=%v err=%v", where, args, err)
	}
}

// The critical security test: an unknown/injection column must be rejected, so
// the c/p/v DSL can never inject SQL.
func TestBuildWhere_RejectsUnknownColumn(t *testing.T) {
	_, _, err := BuildWhere([]Filter{
		{C: "point_name; DROP TABLE points;--", P: "=", V: "x"},
	}, testResolve, 1)
	if err == nil {
		t.Fatal("expected rejection of unknown/injection column")
	}
}

func TestBuildWhere_RejectsBadOperator(t *testing.T) {
	_, _, err := BuildWhere([]Filter{{C: "GR_ID", P: "; DROP", V: 1}}, testResolve, 1)
	if err == nil {
		t.Fatal("expected rejection of bad operator")
	}
}

func TestBuildOrderBy(t *testing.T) {
	got := BuildOrderBy([]string{"GR_ID", "EVIL"}, []string{"desc"}, testResolve)
	if got != "ORDER BY gr_id DESC" {
		t.Fatalf("got %q (EVIL must be dropped)", got)
	}
	if strings.Contains(got, "EVIL") {
		t.Fatal("unknown order column leaked")
	}
}

func TestClampLimit(t *testing.T) {
	cases := []struct{ in, def, max, want int }{
		{0, 100, 1000, 100},
		{-5, 100, 1000, 100},
		{50, 100, 1000, 50},
		{5000, 100, 1000, 1000},
	}
	for _, c := range cases {
		if got := ClampLimit(c.in, c.def, c.max); got != c.want {
			t.Errorf("ClampLimit(%d)=%d want %d", c.in, got, c.want)
		}
	}
}
