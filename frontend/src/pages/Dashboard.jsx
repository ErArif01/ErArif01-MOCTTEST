import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function Dashboard() {
  const [tests, setTests] = useState(null);
  const [hist, setHist] = useState([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    api("/tests/").then(setTests).catch((e) => setErr(e.message));
    api("/attempts/").then(setHist).catch(() => {});
  }, []);
  return (
    <div className="wrap">
      <h1>Available tests</h1>
      {err && <p className="err">{err}</p>}
      {tests && tests.length === 0 && <p>No tests are available yet.</p>}
      <div className="tests">
        {tests?.map((t) => (
          <div className="card" key={t.id}>
            <h2>{t.name}</h2>
            {t.description && <p>{t.description}</p>}
            <p>{t.total_questions} questions | {t.duration_minutes} min | {t.total_marks} marks | negative marking: {t.negative_marks}</p>
            <p className="muted">{t.sections.map((s) => `${s.subject} ${s.count}`).join(", ")}</p>
            <Link className="btn pri" to={`/instructions/${t.id}`}>Start test</Link>
          </div>
        ))}
      </div>
      <h1>My attempts</h1>
      {hist.length === 0 ? <p>You have not attempted any test yet.</p> : (
        <div className="scroll"><table>
          <thead><tr><th>Test</th><th>Date</th><th>Score</th><th>Percentage</th><th></th></tr></thead>
          <tbody>{hist.map((h) => (
            <tr key={h.id}>
              <td>{h.test}</td><td>{new Date(h.started_at).toLocaleString()}</td>
              <td>{h.submitted ? `${h.score} / ${h.total_marks}` : "In progress"}</td>
              <td>{h.percentage != null ? h.percentage + "%" : "-"}</td>
              <td>{h.submitted ? <Link to={`/result/${h.id}`}>View result</Link> : <Link to={`/exam/${h.test_id}`}>Resume</Link>}</td>
            </tr>))}</tbody>
        </table></div>
      )}
    </div>
  );
}
