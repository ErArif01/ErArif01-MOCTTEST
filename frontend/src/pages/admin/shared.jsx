import { useEffect, useState } from "react";
import { api } from "../../api.js";

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

const NEW = "__new__";

/** A dropdown that ends with "+ Add new ...". Picking it opens a small inline form. onCreate(name) must return {value,label}. */
export function SelectAdd({ label, value, onChange, options, required, blankLabel, addLabel = "+ Add new...", onCreate, placeholder = "Name", children }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setErr(""); setBusy(true);
    try { const o = await onCreate(name.trim()); setAdding(false); setName(""); onChange(String(o.value), o); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <div className="selectadd">
      <label>{label}{required ? " *" : ""}
        <select value={adding ? NEW : value ?? ""} required={required && !adding}
          onChange={(e) => { if (e.target.value === NEW) { setAdding(true); setErr(""); } else { setAdding(false); onChange(e.target.value); } }}>
          <option value="">{blankLabel ?? (required ? "Select..." : "- none -")}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          <option value={NEW}>{addLabel}</option>
        </select>
      </label>
      {adding && (
        <div className="addbox">
          <input autoFocus placeholder={placeholder} value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (name.trim()) create(); } }} />
          {children}
          <button type="button" className="pri" disabled={busy || !name.trim()} onClick={create}>{busy ? "Saving..." : "Save"}</button>
          <button type="button" onClick={() => { setAdding(false); setErr(""); }}>Cancel</button>
          {err && <span className="err small" role="alert">{err}</span>}
        </div>
      )}
    </div>
  );
}

/** Exam dropdown with "+ Add new exam" (and a category picker / new category inside the quick form). */
export function ExamSelect({ label = "Exam (vacancy)", value, onChange, required, blankLabel, refreshKey }) {
  const [exams, setExams] = useState([]);
  const [cats, setCats] = useState([]);
  const [cat, setCat] = useState("");
  const [newCat, setNewCat] = useState("");
  const load = () => Promise.all([api("/admin/exams/"), api("/admin/categories/")]).then(([e, c]) => { setExams(e); setCats(c); setCat((x) => x || (c[0] ? String(c[0].id) : "__new__")); }).catch(() => {});
  useEffect(() => { load(); }, [refreshKey]);
  const create = async (name) => {
    let catId = cat;
    if (cat === "__new__") {
      if (!newCat.trim()) throw new Error("Type the new category name.");
      const c = await api("/admin/categories/", { method: "POST", body: { name: newCat.trim(), icon: "\uD83D\uDCDA", color: "#0b4f8a", order: 0, is_active: true } });
      catId = String(c.id); setNewCat(""); setCat(catId);
    }
    if (!catId) throw new Error("Choose a category.");
    const e = await api("/admin/exams/", { method: "POST", body: { category: catId, name, icon: "\uD83C\uDFAF", color: "", description: "", syllabus: "", order: 0, is_active: true } });
    await load();
    return { value: e.id, label: `${e.category_name} / ${e.name}`, exam: e };
  };
  return (
    <SelectAdd label={label} value={value} required={required} blankLabel={blankLabel} addLabel="+ Add new exam..." placeholder="New exam name (e.g. RRB Group D)"
      options={exams.map((e) => ({ value: e.id, label: `${e.category_name} / ${e.name}` }))}
      onChange={(v, o) => onChange(v, o?.exam || exams.find((e) => String(e.id) === String(v)))} onCreate={create}>
      <select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="__new__">+ New category...</option>
      </select>
      {cat === "__new__" && <input placeholder="New category name (e.g. Railways)" value={newCat} onChange={(e) => setNewCat(e.target.value)} />}
    </SelectAdd>
  );
}
