// Command gen reads docs/endpoints-params.txt (the extracted EC3 model config)
// and generates, for the full ~983-endpoint surface:
//   - internal/db/migrations/0003_generated.sql : a table per entity root
//   - internal/resource/generated.go            : registry models + sub-action specs
//
// Run from the backend/ directory:  go run ./cmd/gen
package main

import (
	"bufio"
	"fmt"
	"os"
	"regexp"
	"sort"
	"strings"
)

// Roots handled by hand-written code (RegisterCore) or special handlers — the
// generator must not create duplicate tables/models for these, but MAY still
// register their sub-actions.
var coreRoots = map[string]bool{
	"points": true, "groups": true, "grouptypes": true, "pointtypes": true,
	"measuringdevicetypes": true, "ecocategories": true, "ecoprofiles": true,
	"dataservers": true, "systemmodules": true, "measuringdevices": true,
	"datapoints": true, "events": true,
}

// Endpoints already served by dedicated handlers — skip entirely.
var specialPaths = map[string]bool{
	"user/login": true, "user/login_az": true, "user/change_pw": true,
	"usersettings": true, "usersettings/data": true,
	"homedashboard/query": true, "homedashboard/data": true,
	"appinfo/db_time": true,
}

// Params that are query/control knobs, never persisted columns.
var controlParams = map[string]bool{
	"FILTERS": true, "ORDER": true, "ORDERDIRECTIONS": true, "ORDERNULLS": true,
	"LIMIT": true, "OFFSET": true, "SCOPE": true, "ACTION": true, "EXACT_SEARCH": true,
	"SEARCH": true, "SEARCH_STRING": true, "SEARCH_BEHAVIOUR_DP": true,
	"SEARCH_BEHAVIOUR_XF": true, "SEARCH_BEHAVIOUR_BGA": true, "WITH_ADD_LABEL": true,
	"SHOW_DELETED": true, "SHOW_SYSTEM_DP": true, "SHOW_EXPIRED_SRC": true,
	"SHOW_NON_DISCRETE": true, "SHOW_POINT_ANYWAY": true, "SHOW_MAP_DATA": true,
	"FROM": true, "TO": true, "DATE_FROM": true, "DATE_TO": true, "SESSION_FILTERS": true,
	"INTERVAL": true, "MOVE": true, "FORCED": true, "CHECK_GR_CHILDREN": true,
	"Q_VIEW": true, "Q_TYPE": true, "APPEND_TYPE": true,
}

type endpoint struct {
	path    string
	methods []string
	fields  []field
}
type field struct {
	name  string
	flags string
}

var lineRe = regexp.MustCompile(`^(\S+) \[([^\]]*)\](?: :: (.*))?$`)
var fieldRe = regexp.MustCompile(`^([A-Za-z0-9_]+)(?:\(([^)]*)\))?$`)

func main() {
	f, err := os.Open("../docs/endpoints-params.txt")
	if err != nil {
		fmt.Fprintln(os.Stderr, "cannot open endpoints-params.txt:", err)
		os.Exit(1)
	}
	defer f.Close()

	var eps []endpoint
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 1024*1024), 1024*1024)
	for sc.Scan() {
		line := strings.TrimRight(sc.Text(), " ")
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		m := lineRe.FindStringSubmatch(line)
		if m == nil {
			continue
		}
		ep := endpoint{path: m[1]}
		if m[2] != "-" && m[2] != "" {
			ep.methods = strings.Split(m[2], ",")
		}
		if m[3] != "" {
			for _, part := range strings.Split(m[3], ", ") {
				fm := fieldRe.FindStringSubmatch(strings.TrimSpace(part))
				if fm != nil {
					ep.fields = append(ep.fields, field{name: fm[1], flags: fm[2]})
				}
			}
		}
		eps = append(eps, ep)
	}

	// group by root — build maps directly
	rcols := map[string][]string{}
	rseen := map[string]map[string]bool{}
	rbase := map[string]bool{}
	rsubs := map[string]map[string][]string{}
	order := []string{}

	addCol := func(rt, col string) {
		if rseen[rt] == nil {
			rseen[rt] = map[string]bool{}
		}
		if !rseen[rt][col] {
			rseen[rt][col] = true
			rcols[rt] = append(rcols[rt], col)
		}
	}

	for _, ep := range eps {
		if specialPaths[ep.path] {
			continue
		}
		if strings.HasPrefix(ep.path, "/") || strings.Contains(ep.path, "{") {
			continue // helper/param-only paths
		}
		path := ep.path
		if i := strings.IndexByte(path, '?'); i >= 0 {
			path = path[:i] // drop ?query-string variants -> merge into base path
		}
		if path == "" {
			continue
		}
		parts := strings.SplitN(path, "/", 2)
		rt := parts[0]
		if _, ok := rseen[rt]; !ok {
			order = append(order, rt)
			rseen[rt] = map[string]bool{}
			rsubs[rt] = map[string][]string{}
		}
		// collect columns (entity attributes) unless a core root (has its own table)
		if !coreRoots[rt] {
			for _, fl := range ep.fields {
				n := fl.name
				if controlParams[n] {
					continue
				}
				// only persist fields that are body attributes or bare id/attr fields
				if strings.Contains(fl.flags, "add") || fl.flags == "" {
					addCol(rt, n)
				}
			}
		}
		if len(parts) == 1 {
			rbase[rt] = true
		} else {
			rsubs[rt][parts[1]] = ep.methods
		}
	}
	sort.Strings(order)

	// ---- emit SQL ----
	var sql strings.Builder
	sql.WriteString("-- AUTO-GENERATED from docs/endpoints-params.txt by cmd/gen. Do not edit.\n")
	sql.WriteString("-- One table per non-core entity root; columns from the model's add/attr fields.\n\n")
	for _, rt := range order {
		if coreRoots[rt] {
			continue
		}
		cols := rcols[rt]
		if len(cols) == 0 {
			continue // virtual root (no table)
		}
		table := tableName(rt)
		pk := pickPK(cols)
		sql.WriteString(fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s (\n", table))
		var lines []string
		if pk != "" {
			lines = append(lines, fmt.Sprintf("    %s BIGSERIAL PRIMARY KEY", dbCol(pk)))
		} else {
			lines = append(lines, "    row_id BIGSERIAL PRIMARY KEY")
		}
		for _, c := range cols {
			if c == pk {
				continue
			}
			lines = append(lines, fmt.Sprintf("    %s %s", dbCol(c), sqlType(c)))
		}
		sql.WriteString(strings.Join(lines, ",\n"))
		sql.WriteString("\n);\n\n")
	}
	writeFile("internal/db/migrations/0003_generated.sql", sql.String())

	// ---- emit Go ----
	var g strings.Builder
	g.WriteString("// Code generated by cmd/gen from docs/endpoints-params.txt. DO NOT EDIT.\n")
	g.WriteString("package resource\n\n")
	g.WriteString("// RegisterGenerated adds every non-core entity root as a metadata-driven model\n")
	g.WriteString("// (base CRUD + grid). Sub-actions are returned by GeneratedSubActions.\n")
	g.WriteString("func RegisterGenerated(r *Registry) {\n")
	baseModelCount := 0
	for _, rt := range order {
		if coreRoots[rt] {
			continue
		}
		cols := rcols[rt]
		table := tableName(rt)
		if len(cols) == 0 {
			// virtual model: list/query return empty, keeps the endpoint existing
			g.WriteString(fmt.Sprintf("\tr.Add(&Model{Name: %q, Virtual: true, List: true, Get: false, PKField: f(%q, %q, false, false)})\n",
				rt, "ID", "id"))
			baseModelCount++
			continue
		}
		pk := pickPK(cols)
		pkCol := "row_id"
		pkAPI := "ROW_ID"
		if pk != "" {
			pkCol = dbCol(pk)
			pkAPI = pk
		}
		g.WriteString(fmt.Sprintf("\tr.Add(&Model{Name: %q, Table: %q, WritePriv: \"config\",\n", rt, table))
		g.WriteString("\t\tList: true, Get: true, Create: true, Update: true, Delete: true,\n")
		g.WriteString(fmt.Sprintf("\t\tPKField: f(%q, %q, false, false),\n", pkAPI, pkCol))
		g.WriteString("\t\tFields: []Field{\n")
		for _, c := range cols {
			if c == pk {
				continue
			}
			g.WriteString(fmt.Sprintf("\t\t\tf(%q, %q, true, false),\n", c, dbCol(c)))
		}
		g.WriteString("\t\t}})\n")
		baseModelCount++
	}
	g.WriteString("}\n\n")

	// sub-actions
	g.WriteString("// GeneratedSubActions lists every {model}/{action} endpoint to mount generically.\n")
	g.WriteString("func GeneratedSubActions() []SubActionSpec {\n\treturn []SubActionSpec{\n")
	subCount := 0
	for _, rt := range order {
		acts := rsubs[rt]
		names := make([]string, 0, len(acts))
		for a := range acts {
			names = append(names, a)
		}
		sort.Strings(names)
		for _, a := range names {
			methods := acts[a]
			get := hasMethod(methods, "GET") || len(methods) == 0
			post := hasMethod(methods, "POST") || hasMethod(methods, "PUT") || hasMethod(methods, "DELETE") || len(methods) == 0
			g.WriteString(fmt.Sprintf("\t\t{Base: %q, Action: %q, Get: %v, Post: %v},\n", rt, a, get, post))
			subCount++
		}
	}
	g.WriteString("\t}\n}\n")
	writeFile("internal/resource/generated.go", g.String())

	fmt.Printf("generated: %d base models, %d sub-actions, from %d endpoints\n", baseModelCount, subCount, len(eps))
}

func hasMethod(ms []string, m string) bool {
	for _, x := range ms {
		if x == m {
			return true
		}
	}
	return false
}

// tableName sanitises a root into a safe table identifier, prefixed to avoid
// clashing with core tables / reserved words.
var nonIdent = regexp.MustCompile(`[^a-z0-9_]`)

func tableName(root string) string {
	s := nonIdent.ReplaceAllString(strings.ToLower(root), "_")
	return "g_" + s
}

// dbCol maps an API field name to a safe, reserved-word-proof db column.
func dbCol(api string) string {
	return "c_" + nonIdent.ReplaceAllString(strings.ToLower(api), "_")
}

func pickPK(cols []string) string {
	// prefer a *_ID column
	for _, c := range cols {
		if strings.HasSuffix(c, "_ID") {
			return c
		}
	}
	return ""
}

func sqlType(col string) string {
	switch {
	case strings.HasSuffix(col, "_ID"), strings.HasSuffix(col, "_NR"),
		strings.HasSuffix(col, "_COUNT"), strings.HasSuffix(col, "_PRIORITY"),
		strings.HasSuffix(col, "_DEPTH"), strings.HasSuffix(col, "_LAG"):
		return "BIGINT"
	case strings.HasSuffix(col, "_ENABLED"), strings.HasSuffix(col, "_DELETED"),
		strings.HasSuffix(col, "_PUBLIC"), strings.HasSuffix(col, "_INTERNAL"),
		strings.HasSuffix(col, "_COMMERCIAL"), strings.HasSuffix(col, "_LICENSED"),
		strings.HasPrefix(col, "IS_"):
		return "INTEGER"
	case strings.HasSuffix(col, "_BT"), strings.HasSuffix(col, "_ET"),
		strings.HasSuffix(col, "_TIME"), strings.HasSuffix(col, "_DATE"):
		return "TIMESTAMPTZ"
	default:
		return "TEXT"
	}
}

func writeFile(path, content string) {
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		fmt.Fprintln(os.Stderr, "write", path, err)
		os.Exit(1)
	}
	fmt.Println("wrote", path)
}
