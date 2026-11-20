import { useCallback, useEffect, useState } from "react";
import { api, downloadText, toCsv } from "../../api.js";
import { ExamSelect, Pager } from "./shared.jsx";

const blank = { subject: "", text: "", a: "", b: "", c: "", d: "", correct: "A", explanation: "" };

export default function Questions() {
  const [exams, setExams] = useState([]);
  const [exam, setExam] = useState("");            // selected exam folder
  const [subjects, setSubjects] = useState([]);
  const [data, setData] = useState(null);
  const [subject, setSubject] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [up, setUp] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api("/admin/exams/").then((r) => { setExams(r); if (r.length) setExam(String(r[0].id)); }).catch((e) => setErr(e.message)); }, []);
  const loadSubjects = () => exam && api(`/admin/stats/?exam=${exam}`).then(setSubjects).catch(() => {});
  const load = useCallback(() => {
    if (!exam) return;
    api(`/admin/questions/?exam=${exam}&subject=${encodeURIComponent(subject)}&q=${encodeURIComponent(q)}&page=${page}`).then(setData).catch((e) => setErr(e.message));
  }, [exam, subject, q, page]);
  useEffect(() => { setSubject(""); setPage(1); setForm(null); loadSubjects(); }, [exam]);
  useEffect(() => { load(); }, [exam, subject, page]);

  const upload = async (e) => {
    e.preventDefault(); setErr(""); setUp(null); setBusy(true);
    const form = e.target; const fd = new FormData(); fd.append("file", form.elements.file.files[0]); fd.append("exam", exam);
    try { setUp(await api("/admin/upload-questions/", { method: "POST", form: fd })); loadSubjects(); load(); form.reset(); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const slug = (t) => (t || "exam").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const COLS = ["subject", "question", "a", "b", "c", "d", "correct", "explanation"];
  const sample = () => {
    const subs = subjects.length ? subjects.slice(0, 4).map((x) => x.name) : ["Subject name"];
    const rows = subs.map((sj, i) => ({ subject: sj, question: `SAMPLE - delete this row. Type your ${sj} question here?`, a: "Option A", b: "Option B", c: "Option C", d: "Option D", correct: "ABCD"[i % 4], explanation: "Optional explanation" }));
    downloadText(`sample-questions-${slug(cur?.name)}.csv`, toCsv(COLS, rows));
  };
  const dl = (kind, rows, withError) => downloadText(`${kind}-questions-${slug(cur?.name)}.csv`, toCsv(withError ? [...COLS, "error"] : COLS, rows));
  const save = async (e) => {
    e.preventDefault(); setErr("");
    try {
      await api(editId ? `/admin/questions/${editId}/` : "/admin/questions/", { method: editId ? "PUT" : "POST", body: { ...form, exam } });
      setForm(null); setEditId(null); loadSubjects(); load();
    } catch (x) { setErr(x.message); }
  };
  const edit = (x) => { setEditId(x.id); setForm({ subject: x.subject, text: x.text, a: x.options[0], b: x.options[1], c: x.options[2], d: x.options[3], correct: x.correct, explanation: x.explanation }); window.scrollTo(0, 0); };
  const remove = (x) => { if (window.confirm("Delete this question? Past results keep showing it.")) api(`/admin/questions/${x.id}/`, { method: "DELETE" }).then(() => { loadSubjects(); load(); }).catch((e) => setErr(e.message)); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const cur = exams.find((x) => String(x.id) === exam);

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <h2>Question bank (folder per exam)</h2>
        <p className="muted">Every exam has its own questions and subjects (for example Hindi only in some exams). Choose the exam first.</p>
        <ExamSelect label="Exam" value={exam} required onChange={(v, e) => { if (e && !exams.some((x) => x.id === e.id)) setExams((l) => [...l, e]); setExam(String(v)); }} />
        {cur && <p className="muted">Subjects: {subjects.map((s) => `${s.name} ${s.n}`).join("  |  ") || "none yet"}</p>}
      </div>
      {exam && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <h2>Upload CSV into "{cur?.name}"</h2>
            <p>Columns: <code>subject,question,a,b,c,d,correct,explanation</code> (correct = A, B, C or D).
              Subjects can be anything this exam needs (for example Hindi, Science, English).</p>
            <div className="bar" style={{ marginTop: 0 }}><button type="button" onClick={sample}>Download sample CSV for {cur?.name}</button></div>
            <form className="filters" onSubmit={upload}>
              <input type="file" name="file" accept=".csv" required />
              <button className="pri" disabled={busy}>{busy ? "Uploading..." : "Upload"}</button>
            </form>
            {up && (
              <div className="report" role="status">
                <p><b className="okmsg">{up.created} uploaded</b> &bull; <b>{up.duplicates} already existed (skipped)</b> &bull; <b className={up.failed ? "err" : ""}>{up.failed} failed</b>{up.samples ? ` \u2022 ${up.samples} sample row(s) ignored` : ""}</p>
                <div className="bar" style={{ marginTop: 6 }}>
                  {up.created > 0 && <button onClick={() => dl("uploaded", up.created_rows)}>Download uploaded list ({up.created})</button>}
                  {up.failed > 0 && <button className="danger" onClick={() => dl("failed", up.failed_rows, true)}>Download failed list ({up.failed})</button>}
                  {up.duplicates > 0 && <button onClick={() => dl("duplicates", up.duplicate_rows)}>Download skipped duplicates ({up.duplicates})</button>}
                </div>
                {up.failed > 0 && <><p className="muted small">The failed file has an extra "error" column. Fix those rows, then upload the same file again. The error column is ignored and rows already uploaded are skipped.</p>
                  <div className="scroll"><table><thead><tr><th>Question</th><th>Problem</th></tr></thead><tbody>{up.failed_rows.slice(0, 20).map((r, i) => <tr key={i}><td>{r.question || "(empty)"}</td><td className="err">{r.error}</td></tr>)}</tbody></table></div>
                  {up.failed > 20 && <p className="muted small">Showing the first 20. Download the file to see all.</p>}</>}
              </div>
            )}
          </div>
          <div className="card">
            <div className="head"><h2>Questions</h2>{!form && <button className="pri" onClick={() => { setForm(blank); setEditId(null); }}>+ Add question</button>}</div>
            {err && <p className="err" role="alert">{err}</p>}
            {form && (
              <form className="qform" onSubmit={save}>
                <h3>{editId ? "Edit question" : "Add question"}</h3>
                <label>Subject<input list="subs" required value={form.subject} onChange={set("subject")} /></label>
                <datalist id="subs">{subjects.map((s) => <option key={s.name} value={s.name} />)}</datalist>
                <label>Question<textarea rows={3} required value={form.text} onChange={set("text")} /></label>
                <div className="formgrid">
                  {["a", "b", "c", "d"].map((k) => <label key={k}>Option {k.toUpperCase()}<input required value={form[k]} onChange={set(k)} /></label>)}
                  <label>Correct option<select value={form.correct} onChange={set("correct")}>{["A", "B", "C", "D"].map((x) => <option key={x}>{x}</option>)}</select></label>
                  <label className="span2">Explanation (optional)<input value={form.explanation} onChange={set("explanation")} /></label>
                </div>
                <div className="bar"><button className="pri">Save</button><button type="button" onClick={() => { setForm(null); setEditId(null); }}>Cancel</button></div>
              </form>
            )}
            <form className="filters" onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}>
              <select value={subject} onChange={(e) => { setSubject(e.target.value); setPage(1); }}>
                <option value="">All subjects</option>{subjects.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.n})</option>)}
              </select>
              <input placeholder="Search question text" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="pri">Search</button>
            </form>
            {!data ? <p>Loading...</p> : (
              <>
                {data.results.map((x) => (
                  <div className="qrow" key={x.id}>
                    <div><span className="badge">{x.subject}</span> <b>{x.text}</b>
                      <ol type="A" className="qopts">{x.options.map((o, i) => <li key={i} className={"ABCD"[i] === x.correct ? "right" : ""}>{o}</li>)}</ol></div>
                    <div className="acts"><button onClick={() => edit(x)}>Edit</button><button className="danger" onClick={() => remove(x)}>Delete</button></div>
                  </div>
                ))}
                {data.results.length === 0 && <p>No questions found.</p>}
                <Pager meta={data} onPage={setPage} />
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
