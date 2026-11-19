import { useEffect, useState } from "react";
import { api, fmtDate } from "../../api.js";
import { Badge } from "./shared.jsx";

export default function QuizzesAdmin() {
  const [quizzes, setQuizzes] = useState(null);
  const [exams, setExams] = useState([]);
  const [cfg, setCfg] = useState(null);
  const [f, setF] = useState({ title: "", description: "", exam: "", subject: "", count: 10, is_featured: true });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [view, setView] = useState(null);
  const load = () => api("/admin/quizzes/").then(setQuizzes).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    api("/admin/exams/").then(setExams).catch(() => {});
    api("/admin/config/").then(setCfg).catch((e) => setErr(e.message));
  }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const create = async (e) => {
    e.preventDefault(); setErr(""); setOk("");
    try { await api("/admin/quizzes/", { method: "POST", body: f }); setOk("Quiz created."); setF({ ...f, title: "", description: "" }); load(); } catch (x) { setErr(x.message); }
  };
  const patch = (q, body) => api(`/admin/quizzes/${q.id}/`, { method: "PATCH", body }).then(load).catch((x) => setErr(x.message));
  const del = (q) => { if (window.confirm("Delete this quiz and all its attempts?")) api(`/admin/quizzes/${q.id}/`, { method: "DELETE" }).then(load).catch((x) => setErr(x.message)); };
  const showAttempts = (q) => api(`/admin/quizzes/${q.id}/attempts/`).then((rows) => setView({ q, rows })).catch((x) => setErr(x.message));
  const saveCfg = async (e) => {
    e.preventDefault(); setErr(""); setOk("");
    try { setCfg(await api("/admin/config/", { method: "PUT", body: cfg })); setOk("Hourly quiz settings saved."); } catch (x) { setErr(x.message); }
  };
  const subjOpts = (cfg?.subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>);
  const examOpts = exams.map((x) => <option key={x.id} value={x.id}>{x.category_name} / {x.name}</option>);
  return (
    <>
      {err && <p className="err" role="alert">{err}</p>}{ok && <p className="okmsg" role="status">{ok}</p>}
      {cfg && (
        <form className="card" onSubmit={saveCfg} style={{ marginBottom: 12 }}>
          <h2>Hourly quiz (automatic)</h2>
          <p className="muted">When on, a new quiz with random questions goes live every hour and every user sees the same one on the home page.</p>
          <div className="formgrid">
            <label className="chk"><input type="checkbox" checked={cfg.hourly_enabled} onChange={(e) => setCfg({ ...cfg, hourly_enabled: e.target.checked })} /> Hourly quiz is ON</label>
            <label>Questions per quiz<input type="number" min="1" max="50" value={cfg.hourly_count} onChange={(e) => setCfg({ ...cfg, hourly_count: e.target.value })} /></label>
            <label>Take questions from exam<select value={cfg.hourly_exam ?? ""} onChange={(e) => setCfg({ ...cfg, hourly_exam: e.target.value })}><option value="">All exams</option>{examOpts}</select></label>
            <label>Only this subject<select value={cfg.hourly_subject ?? ""} onChange={(e) => setCfg({ ...cfg, hourly_subject: e.target.value })}><option value="">All subjects</option>{subjOpts}</select></label>
          </div>
          <div className="bar"><button className="pri">Save settings</button></div>
        </form>
      )}
      <form className="card" onSubmit={create} style={{ marginBottom: 12 }}>
        <h2>Create a quiz</h2>
        <p className="muted">Random questions are picked from the chosen exam and subject. Featured quizzes appear on the home page.</p>
        <div className="formgrid">
          <label className="span2">Title<input required value={f.title} onChange={set("title")} placeholder="e.g. Railway GK mini quiz" /></label>
          <label className="span2">Description (optional)<input value={f.description} onChange={set("description")} /></label>
          <label>Exam<select value={f.exam} onChange={set("exam")}><option value="">All exams</option>{examOpts}</select></label>
          <label>Subject<select value={f.subject} onChange={set("subject")}><option value="">All subjects</option>{subjOpts}</select></label>
          <label>Number of questions<input type="number" min="1" max="100" value={f.count} onChange={set("count")} /></label>
          <label className="chk"><input type="checkbox" checked={f.is_featured} onChange={set("is_featured")} /> Show on home page (featured)</label>
        </div>
        <div className="bar"><button className="pri">Create quiz</button></div>
      </form>
      <div className="card">
        <h2>All quizzes</h2>
        {!quizzes ? <p>Loading...</p> : quizzes.length === 0 ? <p>No quizzes yet.</p> : (
          <div className="scroll"><table>
            <thead><tr><th>Quiz</th><th>Type</th><th>Questions</th><th>Attempts</th><th>Home page</th><th>Actions</th></tr></thead>
            <tbody>{quizzes.map((q) => (
              <tr key={q.id}><td><b>{q.title}</b><div className="muted">{q.exam_name} {fmtDate(q.created_at)}</div></td>
                <td>{q.kind === "hourly" ? <Badge>Hourly</Badge> : <Badge>Manual</Badge>}</td><td>{q.question_count}</td><td>{q.n_attempts}</td>
                <td>{q.kind === "manual" ? <button onClick={() => patch(q, { is_featured: !q.is_featured })}>{q.is_featured ? "Remove from home" : "Put on home"}</button> : "auto"}</td>
                <td className="acts"><button onClick={() => showAttempts(q)}>Results</button>
                  <button onClick={() => patch(q, { is_active: !q.is_active })}>{q.is_active ? "Hide" : "Show"}</button><button className="danger" onClick={() => del(q)}>Delete</button></td></tr>))}</tbody>
          </table></div>
        )}
      </div>
      {view && (
        <div className="overlay"><div className="card modal wide">
          <h2>{view.q.title}</h2>
          {view.rows.length === 0 ? <p>No attempts yet.</p> : <div className="scroll"><table><thead><tr><th>#</th><th>User</th><th>Score</th><th>%</th><th>Time</th></tr></thead>
            <tbody>{view.rows.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.user}<div className="muted">{r.email}</div></td><td>{r.correct}/{r.total}</td><td>{r.percentage}%</td><td>{fmtDate(r.at)}</td></tr>)}</tbody></table></div>}
          <div className="bar"><button onClick={() => setView(null)}>Close</button></div>
        </div></div>
      )}
    </>
  );
}
