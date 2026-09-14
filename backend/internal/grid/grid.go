// Package grid implements the ec3api generic grid query:
//
//	{ limit, offset, filters:[{c,p,v}], order, orderDirections }
//
// filters are translated to a parameterized SQL WHERE clause. Column names are
// whitelisted via a resolver (API name -> db column); anything not whitelisted is
// rejected, so the c/p/v DSL cannot be used for SQL injection.
package grid

import (
	"fmt"
	"strings"
)

// Filter is one {c,p,v} predicate. C = column (API name), P = operator, V = value.
type Filter struct {
	C string      `json:"c"`
	P string      `json:"p"`
	V interface{} `json:"v"`
}

// Request is the grid query body.
type Request struct {
	Limit           int      `json:"limit"`
	Offset          int      `json:"offset"`
	Filters         []Filter `json:"filters"`
	Order           []string `json:"order"`
	OrderDirections []string `json:"orderDirections"`
}

// Resolver maps an API column name to a safe, fully-qualified db column, and
// reports whether it is allowed. Only columns it approves may appear in SQL.
type Resolver func(apiName string) (dbCol string, ok bool)

// allowed SQL operators keyed by the DSL predicate token.
var ops = map[string]string{
	"=": "=", "!=": "<>", "<>": "<>",
	">": ">", ">=": ">=", "<": "<", "<=": "<=",
	"like": "LIKE", "ilike": "ILIKE",
}

// BuildWhere returns a WHERE fragment (without the "WHERE" keyword) and its args.
// placeholders are numbered starting at startArg. An empty filter set yields "".
func BuildWhere(filters []Filter, resolve Resolver, startArg int) (string, []interface{}, error) {
	var clauses []string
	var args []interface{}
	n := startArg
	for _, f := range filters {
		col, ok := resolve(f.C)
		if !ok {
			return "", nil, fmt.Errorf("unknown filter column %q", f.C)
		}
		p := strings.ToLower(strings.TrimSpace(f.P))
		switch p {
		case "null", "isnull":
			clauses = append(clauses, col+" IS NULL")
		case "notnull", "isnotnull":
			clauses = append(clauses, col+" IS NOT NULL")
		case "in":
			vals, ok := toSlice(f.V)
			if !ok || len(vals) == 0 {
				return "", nil, fmt.Errorf("filter %q: 'in' needs a non-empty array", f.C)
			}
			ph := make([]string, len(vals))
			for i, v := range vals {
				ph[i] = fmt.Sprintf("$%d", n)
				args = append(args, v)
				n++
			}
			clauses = append(clauses, fmt.Sprintf("%s IN (%s)", col, strings.Join(ph, ",")))
		default:
			sqlOp, ok := ops[p]
			if p == "" {
				sqlOp, ok = "=", true // default operator
			}
			if !ok {
				return "", nil, fmt.Errorf("filter %q: unsupported operator %q", f.C, f.P)
			}
			clauses = append(clauses, fmt.Sprintf("%s %s $%d", col, sqlOp, n))
			args = append(args, f.V)
			n++
		}
	}
	return strings.Join(clauses, " AND "), args, nil
}

// BuildOrderBy returns an "ORDER BY ..." fragment (or "") from whitelisted columns.
func BuildOrderBy(order, directions []string, resolve Resolver) string {
	var parts []string
	for i, c := range order {
		col, ok := resolve(c)
		if !ok {
			continue
		}
		dir := "ASC"
		if i < len(directions) && strings.EqualFold(directions[i], "desc") {
			dir = "DESC"
		}
		parts = append(parts, col+" "+dir)
	}
	if len(parts) == 0 {
		return ""
	}
	return "ORDER BY " + strings.Join(parts, ", ")
}

// ClampLimit bounds a requested limit to [1, max]; 0/negative -> def.
func ClampLimit(limit, def, max int) int {
	if limit <= 0 {
		return def
	}
	if limit > max {
		return max
	}
	return limit
}

func toSlice(v interface{}) ([]interface{}, bool) {
	switch s := v.(type) {
	case []interface{}:
		return s, true
	default:
		return nil, false
	}
}
