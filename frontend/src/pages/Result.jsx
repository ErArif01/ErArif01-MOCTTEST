import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, fmtTime } from "../api.js";

export default function Result() {
  const { id } = useParams();
  const [r, setR] = useState(null);
  const [err, setErr] = useState("");
  const [flt, setFlt] = useState("all");
  useEffect(() => { api(`/attempts/${id}/result/`).then(setR).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <p className="err center">{err}</p>;
  if (!r) return <p className="center">Loading result...</p>;
  const box = (t, v, c) => <div className={"stat " + (c || "")}><b>{v}</b><span>{t}</span></div>;
  const list = r.review.filter((q) => flt === "all" || q.status === flt);
  return (
    <div className="wrap">
      <div className="card">
        <h1>{r.test}: Result</h1>
        <div className="stats">
          {box("Score", `${r.score} / ${r.total_marks}`, "big")}
          {box("Percentage", r.percentage + "%", "big")}
          {box("Correct", r.correct, "good")}
          {box("Incorrect", r.incorrect, "bad")}
          {box("Unattempted", r.unattempted)}
          {box("Attempted", `${r.attempted} / ${r.total_questions}`)}
          {box("Accuracy", r.accuracy + "%")}
          {box("Marks lost (negative)", r.marks_lost)}
          {box("Time taken", `${fmtTime(r.time_taken_seconds)} of ${r.duration_minutes} min`)}
        </div>
        <p className="muted">Calculation: {r.correct} x {r.marks_per_question} - {r.incorrect} x {r.negative_marks} = {r.score}</p>
        <h2>Section-wise</h2>
        <div className="scroll"><table>
          <thead><tr><th>Section</th><th>Questions</th><th>Correct</th><th>Incorrect</th><th>Skipped</th><th>Score</th></tr></thead>
          <tbody>{r.sections.map((s) => <tr key={s.section}><td>{s.section}</td><td>{s.total}</td><td>{s.correct}</td><td>{s.incorrect}</td><td>{s.skipped}</td><td>{s.score}</td></tr>)}</tbody>
        </table></div>
        <div className="bar"><Link className="btn" to="/">Back to dashboard</Link></div>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h2>Answer review</h2>
        <div className="tabs">
          {["all", "correct", "incorrect", "skipped"].map((f) => <button key={f} className={flt === f ? "on" : ""} onClick={() => setFlt(f)}>{f}</button>)}
        </div>
        {list.map((q) => (
          <div key={q.id} className="rv">
            <p><b>{r.review.indexOf(q) + 1}. {q.text}</b> <span className={"tag " + q.status}>{q.status}</span></p>
            {q.options.map((t, i) => {
              const L = "ABCD"[i];
              const c = L === q.correct ? "good" : L === q.selected ? "bad" : "";
              return <div key={L} className={"opt " + c}>{L}. {t}{L === q.selected ? "  (your answer)" : ""}{L === q.correct ? "  (correct)" : ""}</div>;
            })}
            {q.explanation && <p className="muted">{q.explanation}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
