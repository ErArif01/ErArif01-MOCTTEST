export function Pager({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return meta ? <p className="muted">{meta.total} record(s)</p> : null;
  return (
    <div className="pager">
      <button disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Previous</button>
      <span>Page {meta.page} of {meta.pages} ({meta.total})</span>
      <button disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>Next</button>
    </div>
  );
}
export const Badge = ({ kind, children }) => <span className={"badge " + (kind || "")}>{children}</span>;
export const pctText = (p) => (p == null ? "-" : p + "%");
