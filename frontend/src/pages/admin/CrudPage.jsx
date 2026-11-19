import { useEffect, useState } from "react";
import { api } from "../../api.js";

/** Config-driven admin list + add/edit form (used for categories, exams, vacancies, news). */
export default function CrudPage({ title, endpoint, columns, fields, blank, multipart = false, hint, extraActions }) {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => api(`${endpoint}/`).then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [endpoint]);

  const startAdd = () => { setForm({ ...blank }); setEditRow(null); setErr(""); };
  const startEdit = (r) => {
    const f = {};
    fields.forEach((x) => { f[x.name] = x.type === "file" ? null : (r[x.name] ?? blank[x.name] ?? ""); });
    setForm(f); setEditRow(r); setErr(""); window.scrollTo(0, 0);
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const buildBody = () => {
    if (multipart) {
      const fd = new FormData();
      fields.forEach((x) => {
        const v = form[x.name];
        if (x.type === "file") { if (v instanceof File) fd.append(x.name, v); if (form["clear_" + x.name]) fd.append("clear_" + x.name, "true"); }
        else if (typeof v === "boolean") fd.append(x.name, v ? "true" : "false");
        else fd.append(x.name, v ?? "");
      });
      return { form: fd };
    }
    const body = {};
    fields.forEach((x) => {
      let v = form[x.name];
      if (["number", "date", "select"].includes(x.type) && v === "") v = null;
      body[x.name] = v;
    });
    return { body };
  };

  const save = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      await api(editRow ? `${endpoint}/${editRow.id}/` : `${endpoint}/`, { method: editRow ? "PATCH" : "POST", ...buildBody() });
      setForm(null); setEditRow(null); load();
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const remove = (r) => {
    if (window.confirm("Delete this item? This cannot be undone.")) api(`${endpoint}/${r.id}/`, { method: "DELETE" }).then(load).catch((x) => setErr(x.message));
  };

  const input = (x) => {
    const v = form[x.name];
    if (x.type === "textarea") return <textarea rows={x.rows || 4} value={v ?? ""} required={x.required} onChange={(e) => set(x.name, e.target.value)} />;
    if (x.type === "checkbox") return <input type="checkbox" checked={!!v} onChange={(e) => set(x.name, e.target.checked)} />;
    if (x.type === "select") return (
      <select value={v ?? ""} required={x.required} onChange={(e) => set(x.name, e.target.value)}>
        <option value="">{x.required ? "Select..." : "- none -"}</option>
        {(x.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>);
    if (x.type === "file") return (
      <>
        <input type="file" accept={x.accept} onChange={(e) => set(x.name, e.target.files[0] || null)} />
        {editRow && editRow[x.urlKey] && <span className="small"><a href={editRow[x.urlKey]} target="_blank" rel="noreferrer">Current file</a>{" "}
          <label className="chk"><input type="checkbox" checked={!!form["clear_" + x.name]} onChange={(e) => set("clear_" + x.name, e.target.checked)} /> remove</label></span>}
      </>);
    if (x.type === "rows") {
      const list = Array.isArray(v) ? v : [];
      const upd = (i, k, val) => set(x.name, list.map((r, j) => (j === i ? { ...r, [k]: val } : r)));
      return (
        <div className="rowsbox">
          {list.map((r, i) => (
            <div className="secrow" key={i}>
              {x.sub.map((s) => <input key={s.name} placeholder={s.label} value={r[s.name] ?? ""} onChange={(e) => upd(i, s.name, e.target.value)} />)}
              <button type="button" onClick={() => set(x.name, list.filter((_, j) => j !== i))}>Remove</button>
            </div>))}
          <button type="button" onClick={() => set(x.name, [...list, Object.fromEntries(x.sub.map((s) => [s.name, ""]))])}>+ Add row</button>
        </div>);
    }
    return <input type={x.type || "text"} value={v ?? ""} required={x.required} step={x.type === "number" ? "any" : undefined} placeholder={x.placeholder}
      onChange={(e) => set(x.name, e.target.value)} />;
  };

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="head"><h2>{title}</h2>{!form && <button className="pri" onClick={startAdd}>+ Add</button>}</div>
      {hint && <p className="muted">{hint}</p>}
      {err && <p className="err" role="alert">{err}</p>}
      {form && (
        <form className="qform" onSubmit={save}>
          <h3>{editRow ? "Edit" : "Add new"}</h3>
          <div className="formgrid">
            {fields.map((x) => (
              <label key={x.name} className={(x.wide ? "span2 " : "") + (x.type === "checkbox" ? "chk" : "")}>
                {x.type === "checkbox" ? <>{input(x)} {x.label}</> : <>{x.label}{x.required ? " *" : ""}{input(x)}</>}
              </label>))}
          </div>
          <div className="bar"><button className="pri" disabled={busy}>{busy ? "Saving..." : "Save"}</button><button type="button" onClick={() => { setForm(null); setEditRow(null); }}>Cancel</button></div>
        </form>
      )}
      {!rows ? <p>Loading...</p> : rows.length === 0 ? <p>Nothing here yet.</p> : (
        <div className="scroll"><table>
          <thead><tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}<th>Actions</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>{columns.map((c) => <td key={c.label}>{c.render(r)}</td>)}
              <td className="acts"><button onClick={() => startEdit(r)}>Edit</button>{extraActions && extraActions(r, load)}<button className="danger" onClick={() => remove(r)}>Delete</button></td></tr>))}</tbody>
        </table></div>
      )}
    </div>
  );
}
