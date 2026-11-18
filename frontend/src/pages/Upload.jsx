import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Upload({ user }) {
  const [stats, setStats] = useState([]);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => api("/admin/stats/").then(setStats).catch(() => {});
  useEffect(() => { if (user.is_staff) load(); }, []);
  if (!user.is_staff) return <p className="err center">Admin access only.</p>;
  const send = async (e) => {
    e.preventDefault(); setErr(""); setRes(null); setBusy(true);
    const fd = new FormData(); fd.append("file", e.target.file.files[0]);
    try { setRes(await api("/admin/upload-questions/", { method: "POST", form: fd })); load(); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <div className="wrap">
      <div className="card">
        <h1>Upload questions (CSV)</h1>
        <p>Columns: <code>subject,question,a,b,c,d,correct,explanation</code> (correct = A, B, C or D). <a href="/sample_questions.csv" download>Download sample CSV</a></p>
        <form onSubmit={send}>
          <input type="file" name="file" accept=".csv" required />
          <button className="pri" disabled={busy}>{busy ? "Uploading..." : "Upload"}</button>
        </form>
        {err && <p className="err">{err}</p>}
        {res && <><p><b>{res.created}</b> new questions added (duplicates are skipped).</p>{res.errors.map((x, i) => <p key={i} className="err">{x}</p>)}</>}
        <h2>Question bank</h2>
        <table><thead><tr><th>Subject</th><th>Questions</th></tr></thead>
          <tbody>{stats.map((s) => <tr key={s.name}><td>{s.name}</td><td>{s.n}</td></tr>)}</tbody></table>
        <p className="muted">Create tests (name, time, negative marking, subject-wise question counts) in the Admin panel under Tests.</p>
      </div>
    </div>
  );
}
