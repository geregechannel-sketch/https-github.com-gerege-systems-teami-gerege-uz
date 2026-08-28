// Package resource is a metadata-driven model registry + generic CRUD/grid
// handler, mirroring the ec3api model-config architecture: each model declares a
// table, fields (API name <-> db column) and enabled actions, and one generic
// handler serves list/get/create/update/delete + the grid query DSL.
package resource

import "strings"

// Field maps an API field (UPPER_CASE, as returned by ec3api) to a db column.
type Field struct {
	API      string // e.g. "POINT_NAME"
	Col      string // e.g. "point_name"
	Writable bool   // may be set on create/update
	Required bool   // required (non-null) on create
}

// Model is the metadata for one ec3api resource.
type Model struct {
	Name      string // API model, e.g. "points"
	Table     string // db table, e.g. "points"
	PKField   Field  // primary key field
	Fields    []Field
	ReadPriv  string // privilege required to read (""=any authenticated)
	WritePriv string // privilege required to create/update/delete

	// Enabled actions.
	List, Get, Create, Update, Delete bool
}

// resolve returns the db column for an API name if it is a known field of the model.
func (m *Model) resolve(apiName string) (string, bool) {
	up := strings.ToUpper(strings.TrimSpace(apiName))
	if up == m.PKField.API {
		return m.PKField.Col, true
	}
	for _, f := range m.Fields {
		if f.API == up {
			return f.Col, true
		}
	}
	return "", false
}

// allFields returns pk + fields (pk first).
func (m *Model) allFields() []Field {
	return append([]Field{m.PKField}, m.Fields...)
}

// Registry holds models by API name.
type Registry struct {
	models map[string]*Model
}

func NewRegistry() *Registry { return &Registry{models: map[string]*Model{}} }

func (r *Registry) Add(m *Model) { r.models[m.Name] = m }

func (r *Registry) Get(name string) (*Model, bool) {
	m, ok := r.models[name]
	return m, ok
}

func (r *Registry) Names() []string {
	out := make([]string, 0, len(r.models))
	for n := range r.models {
		out = append(out, n)
	}
	return out
}
