import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";

type Row = Record<string, any>;

function pkField(cols: string[]): string | undefined {
  return cols.find((c) => c.endsWith("_ID")) || cols.find((c) => c.endsWith("ID"));
}

export default function Module() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const baseModel = params.model || "";
  const model = params["*"] ? `${baseModel}/${params["*"]}` : baseModel;
  const urlFilterCol = searchParams.get("filter") || "";
  const urlFilterVal = searchParams.get("value") || "";
  const urlFilterExact = searchParams.get("exact") === "1";
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sel, setSel] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [filterCol, setFilterCol] = useState(urlFilterCol);
  const [filterVal, setFilterVal] = useState(urlFilterVal);
  const [appliedFilter, setAppliedFilter] = useState({
    col: urlFilterCol,
    val: urlFilterVal,
    exact: urlFilterExact,
  });

  const cols = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);
  const pk = useMemo(() => pkField(cols), [cols]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSel(null);
    setEditing(null);
    let env;
    if (appliedFilter.col && appliedFilter.val) {
      const numericValue = Number(appliedFilter.val);
      env = await api.post(`${model}/query`, {
        limit,
        offset,
        filters: [{
          c: appliedFilter.col,
          p: appliedFilter.exact ? "=" : "ilike",
          v: appliedFilter.exact && Number.isFinite(numericValue)
            ? numericValue
            : `%${appliedFilter.val}%`,
        }],
      });
    } else {
      env = await api.get(`${model}?limit=${limit}&offset=${offset}`);
    }
    setLoading(false);
    if (env.success) {
      setRows((env.data as Row[]) || []);
      setTotal(env.totalCount ?? (env.data as Row[])?.length ?? 0);
    } else {
      setError(env.message || "Алдаа");
      setRows([]);
      setTotal(0);
    }
  }, [model, limit, offset, appliedFilter]);

  useEffect(() => {
    setOffset(0);
    setFilterCol(urlFilterCol);
    setFilterVal(urlFilterVal);
    setAppliedFilter({ col: urlFilterCol, val: urlFilterVal, exact: urlFilterExact });
  }, [model, urlFilterCol, urlFilterVal, urlFilterExact]);
  useEffect(() => {
    load();
  }, [load]);

  function applyFilter() {
    setOffset(0);
    setAppliedFilter({ col: filterCol, val: filterVal.trim(), exact: false });
  }

  function resetFilter() {
    setFilterCol("");
    setFilterVal("");
    setOffset(0);
    setAppliedFilter({ col: "", val: "", exact: false });
  }

  async function save() {
    if (!editing) return;
    const body: Row = {};
    for (const k of Object.keys(editing)) if (k !== pk || editing.__new) body[k] = editing[k];
    let env;
    if (editing.__new) {
      delete body.__new;
      env = await api.post(model, body);
    } else if (pk) {
      env = await api.put(`${model}/${editing[pk]}`, body);
    } else {
      return;
    }
    if (env.success) {
      setEditing(null);
      load();
    } else {
      alert(env.message || "Хадгалах амжилтгүй");
    }
  }

  async function remove() {
    if (!editing || !pk || editing.__new) return;
    if (!confirm("Устгах уу?")) return;
    const env = await api.del(`${model}/${editing[pk]}`);
    if (env.success) {
      setEditing(null);
      load();
    } else alert(env.message || "Устгах амжилтгүй");
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, color: "var(--textColorHover)" }}>{model}</h2>
        <span style={{ opacity: 0.6, fontSize: 12 }}>({total})</span>
        <div style={{ flex: 1 }} />
        <select className="toshi-select" value={filterCol} onChange={(e) => setFilterCol(e.target.value)}>
          <option value="">— шүүлт багана —</option>
          {filterCol && !cols.includes(filterCol) && <option value={filterCol}>{filterCol}</option>}
          {cols.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          className="toshi-input"
          placeholder="Утга"
          value={filterVal}
          onChange={(e) => setFilterVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilter()}
        />
        <button className="toshi-btn toshi-btn--blue" onClick={applyFilter}>
          Найти
        </button>
        <button className="toshi-btn" disabled={!appliedFilter.col && !appliedFilter.val} onClick={resetFilter}>
          Сбросить
        </button>
        <button
          className="toshi-btn toshi-btn--green"
          onClick={() => {
            const blank: Row = { __new: true };
            for (const c of cols) if (c !== pk) blank[c] = "";
            setEditing(blank);
          }}
        >
          + Новый
        </button>
      </div>

      {error && <div style={{ color: "var(--btnRedBg)", marginBottom: 10 }}>{error}</div>}

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ flex: 1, overflowX: "auto" }}>
          {loading ? (
            <div className="toshi-loader" />
          ) : rows.length === 0 ? (
            <div style={{ opacity: 0.6, padding: 20 }}>Список пустой</div>
          ) : (
            <table className="toshi-grid">
              <thead>
                <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className={sel === r ? "is-selected" : ""}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSel(r);
                      setEditing({ ...r });
                    }}
                  >
                    {cols.map((c) => (
                      <td key={c}>{fmt(r[c])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
            <button className="toshi-btn" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
              ‹ Назад
            </button>
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              {total ? `${offset + 1}–${Math.min(offset + limit, total)} / ${total}` : "0 / 0"}
            </span>
            <button className="toshi-btn" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>
              Вперед ›
            </button>
          </div>
        </div>

        {editing && (
          <div className="toshi-popup" style={{ width: 320, flex: "0 0 320px" }}>
            <div className="toshi-popup__head">{editing.__new ? "Новая запись" : "Свойства"}</div>
            <div style={{ padding: 12, maxHeight: "70vh", overflow: "auto" }}>
              {Object.keys(editing)
                .filter((k) => k !== "__new")
                .map((k) => (
                  <div key={k} style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 11, opacity: 0.7 }}>{k}</label>
                    <input
                      className="toshi-input"
                      style={{ width: "100%" }}
                      disabled={k === pk && !editing.__new}
                      value={editing[k] ?? ""}
                      onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
                    />
                  </div>
                ))}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="toshi-btn toshi-btn--green" onClick={save}>
                  Сохранить
                </button>
                {!editing.__new && (
                  <button className="toshi-btn toshi-btn--red" onClick={remove}>
                    Удалить
                  </button>
                )}
                <button className="toshi-btn" onClick={() => (setEditing(null), setSel(null))}>
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function fmt(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
