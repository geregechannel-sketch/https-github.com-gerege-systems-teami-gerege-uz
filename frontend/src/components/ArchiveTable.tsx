type Row = Record<string, any>;
const columns = [
  ["BT", "Интервалын эхлэл"], ["ET", "Интервалын төгсгөл"],
  ["VAL", "Заалт"], ["UNIT", "Нэгж"], ["READ_TIME", "Уншсан цаг"],
  ["SOURCE_STATUS", "Эхийн төлөв"], ["SFS", "Эхийн тайлбар"],
  ["HSS", "HSS"], ["DSS", "DSS"], ["TFF_ID", "Тарифын ID"],
  ["HAS_ACT", "HAS_ACT"], ["BYP_EXISTS", "BYP_EXISTS"],
] as const;

export default function ArchiveTable({ rows }: { rows: Row[] }) {
  const visible = columns.filter(([key]) => rows.some(r => key in r));
  return <div style={{ overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
    <table className="toshi-grid" style={{ fontSize: 12, width: "100%" }}>
      <thead><tr>{visible.map(([key, label]) => <th key={key} title={key}>{label}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{visible.map(([key]) => <td key={key} style={{ whiteSpace: "nowrap" }}>
        {key === "VAL" && (r[key] === null || r[key] === undefined)
          ? <span style={{ color: "#a45412" }}>Өгөгдөлгүй</span>
          : String(r[key] ?? "—")}
      </td>)}</tr>)}</tbody>
    </table>
  </div>;
}
