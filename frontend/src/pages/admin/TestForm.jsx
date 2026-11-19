import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api.js";

export default function TestForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [f, setF] = useState({ name: "", exam: "", test_type: "mock", is_paid: false, price: 0, description: "", duration_minutes: 90, marks_per_question: 1, negative_marks: 0.25, instructions: "", is_active: true });
  const [secs, setSecs] = useState([{ subject: "", num_questions: 10 }]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/admin/exams/").then(setExams).catch((e) => setErr(e.message));
    if (id) api(`/admin/tests/${id}/`).then((t) => {
      setF({ name: t.name, exam: t.exam_id ?? "", test_type: t.test_type, is_paid: t.is_paid, price: t.price, description: t.description, duration_minutes: t.duration_minutes, marks_per_question: t.marks_per_question, negative_marks: t.negative_marks, instructions: t.instructions, is_active: t.is_active });
      setSecs(t.sections.map((s) => ({ subject: s.subject, num_questions: s.count })));
    }).catch((e) => setErr(e.message));
  }, [id]);
  useEffect(() => { if (f.exam) api(`/admin/stats/?exam=${f.exam}`).then(setSubjects).catch(() => setSubjects([])); else setSubjects([]); }, [f.exam]);
  const avail = (name) => subjects.find((s) => s.name === name)?.n ?? 0;
  const total = secs.reduce((a, s) => a + (Number(s.num_questions) || 0), 0);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const setSec = (i, k, v) => setSecs(secs.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const save = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      await api(id ? `/admin/tests/${id}/` : "/admin/tests/", { method: id ? "PUT" : "POST", body: { ...f, sections: secs } });
      nav("/manage/tests");
    } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <form className="card" onSubmit={save}>
      <p><Link to="/manage/tests">&larr; All tests</Link></p>
      <h2>{id ? "Edit test" : "New test"}</h2>
      <div className="formgrid">
        <label className="span2">Test name<input required value={f.name} onChange={set("name")} placeholder="e.g. RRB ALP Full Mock 1" /></label>
        <label>Exam (vacancy)<select required value={f.exam} onChange={set("exam")}><option value="">Select exam...</option>{exams.map((x) => <option key={x.id} value={x.id}>{x.category_name} / {x.name}</option>)}</select></label>
        <label>Test type<select value={f.test_type} onChange={set("test_type")}><option value="mock">Full mock test</option><option value="sectional">Sectional test</option><option value="pyp">Previous year paper</option><option value="topic">Topic test</option></select></label>
        <label className="chk"><input type="checkbox" checked={f.is_paid} onChange={set("is_paid")} /> This is a PAID test</label>
        {f.is_paid && <label>Price (rupees)<input type="number" min="1" required value={f.price} onChange={set("price")} /></label>}
        <label>Duration (minutes)<input type="number" min="1" max="600" required value={f.duration_minutes} onChange={set("duration_minutes")} /></label>
        <label>Marks per question<input type="number" step="any" min="0.01" required value={f.marks_per_question} onChange={set("marks_per_question")} /></label>
        <label>Negative marks per wrong answer<input type="number" step="any" min="0" required value={f.negative_marks} onChange={set("negative_marks")} /></label>
        <label className="chk"><input type="checkbox" checked={f.is_active} onChange={set("is_active")} /> Visible to students</label>
      </div>
      <h3>Paper pattern (random questions from this exam's bank)</h3>
      {!f.exam && <p className="muted">Choose the exam first. Subjects come from that exam's question bank.</p>}
      {secs.map((s, i) => (
        <div className="secrow" key={i}>
          <select required value={s.subject} onChange={(e) => setSec(i, "subject", e.target.value)}>
            <option value="">Select subject</option>
            {subjects.map((x) => <option key={x.name} value={x.name}>{x.name} ({x.n} available)</option>)}
          </select>
          <input type="number" min="1" required value={s.num_questions} onChange={(e) => setSec(i, "num_questions", e.target.value)} aria-label="Number of questions" />
          <button type="button" onClick={() => setSecs(secs.filter((_, j) => j !== i))} disabled={secs.length === 1}>Remove</button>
          {s.subject && Number(s.num_questions) > avail(s.subject) && <span className="err small">Only {avail(s.subject)} questions in bank</span>}
        </div>
      ))}
      <div className="bar"><button type="button" onClick={() => setSecs([...secs, { subject: "", num_questions: 10 }])}>+ Add subject</button></div>
      <p><b>Total: {total} questions, {(total * Number(f.marks_per_question || 0)).toFixed(2)} marks</b></p>
      <label>Short description (optional)<input value={f.description} onChange={set("description")} /></label>
      <label>Extra instructions for students (one per line, optional)<textarea rows={4} value={f.instructions} onChange={set("instructions")} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="bar"><button className="pri" disabled={busy}>{busy ? "Saving..." : "Save test"}</button><Link className="btn" to="/manage/tests">Cancel</Link></div>
    </form>
  );
}
