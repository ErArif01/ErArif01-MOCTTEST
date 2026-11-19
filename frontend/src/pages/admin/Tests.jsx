import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, rupee } from "../../api.js";
import { Badge } from "./shared.jsx";

export default function Tests() {
  const [tests, setTests] = useState(null);
  const [err, setErr] = useState("");
  const [del, setDel] = useState(null);
  const load = () => api("/admin/tests/").then(setTests).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const toggle = (t) => api(`/admin/tests/${t.id}/toggle/`, { method: "POST" }).then(load).catch((e) => setErr(e.message));
  const remove = () => api(`/admin/tests/${del.id}/`, { method: "DELETE" }).then(() => { setDel(null); load(); }).catch((e) => { setErr(e.message); setDel(null); });
  return (
    <div className="card">
      <div className="head"><h2>Tests</h2><Link className="btn pri" to="/manage/tests/new">+ New test</Link></div>
      {err && <p className="err" role="alert">{err}</p>}
      {!tests ? <p>Loading...</p> : tests.length === 0 ? <p>No tests yet. Upload questions first, then create a test.</p> : (
        <div className="scroll"><table>
          <thead><tr><th>Test</th><th>Paper</th><th>Time</th><th>Marks</th><th>Attempts</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{tests.map((t) => (
            <tr key={t.id}>
              <td><b>{t.name}</b><div className="muted">{t.exam} &bull; {t.test_type}</div></td>
              <td>{t.total_questions} Q<div className="muted">{t.sections.map((s) => `${s.subject} ${s.count}`).join(", ")}</div></td>
              <td>{t.duration_minutes} min</td>
              <td>+{t.marks_per_question} / -{t.negative_marks}<div>{t.is_paid ? <Badge kind="bad">{rupee(t.price)}</Badge> : <Badge kind="good">Free</Badge>}</div></td>
              <td>{t.n_submitted} / {t.n_attempts}</td>
              <td>{t.is_active ? <Badge kind="good">Live</Badge> : <Badge>Hidden</Badge>}</td>
              <td className="acts">
                <Link className="btn" to={`/manage/tests/${t.id}`}>Edit</Link>
                <button onClick={() => toggle(t)}>{t.is_active ? "Hide" : "Publish"}</button>
                <button className="danger" onClick={() => setDel(t)}>Delete</button>
              </td>
            </tr>))}</tbody>
        </table></div>
      )}
      {del && (
        <div className="overlay"><div className="card modal">
          <h2>Delete "{del.name}"?</h2>
          <p>{del.n_attempts > 0 ? "This test has attempts, so it cannot be deleted. Hide it instead." : "This cannot be undone."}</p>
          <div className="bar">
            {del.n_attempts === 0 && <button className="danger" onClick={remove}>Yes, delete</button>}
            <button onClick={() => setDel(null)}>Close</button>
          </div>
        </div></div>
      )}
    </div>
  );
}
