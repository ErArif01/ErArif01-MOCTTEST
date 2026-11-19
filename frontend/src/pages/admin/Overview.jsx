import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmtDate, rupee } from "../../api.js";
import { Badge, pctText } from "./shared.jsx";

export default function Overview() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/admin/overview/").then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="err">{err}</p>;
  if (!d) return <p>Loading...</p>;
  const S = (label, v, c) => <div className={"stat " + (c || "")}><b>{v}</b><span>{label}</span></div>;
  return (
    <>
      <div className="stats">
        {S("Total users", d.users.total, "big")}
        {S("Active users", d.users.active, "good")}
        {S("Blocked users", d.users.blocked, "bad")}
        {S("New (7 days)", d.users.new_7d)}
        {S("Tests (active/total)", `${d.tests.active}/${d.tests.total}`)}
        {S("Questions in bank", d.questions)}
        {S("Attempts started", d.attempts.total)}
        {S("Attempts submitted", d.attempts.submitted)}
        {S("Attempts (24h)", d.attempts.today)}
        {S("Average score", pctText(d.avg_percentage), "big")}
        {S("Exams", d.exams)}
        {S("Quizzes", d.quizzes)}
        {S("News posts", d.news)}
        {S("Vacancies", d.vacancies)}
        {S("Revenue", rupee(d.revenue), "good")}
        {S("Paid orders", d.paid_orders)}
      </div>
      <div className="card">
        <h2>Recent attempts</h2>
        {d.recent.length === 0 ? <p>No attempts yet.</p> : (
          <div className="scroll"><table>
            <thead><tr><th>User</th><th>Test</th><th>Started</th><th>Status</th><th>Score</th><th></th></tr></thead>
            <tbody>{d.recent.map((a) => (
              <tr key={a.id}>
                <td><Link to={`/manage/users/${a.user_id}`}>{a.user}</Link><div className="muted">{a.email}</div></td>
                <td>{a.test}</td><td>{fmtDate(a.started_at)}</td>
                <td><Badge kind={a.status === "submitted" ? "good" : ""}>{a.status.replace("_", " ")}</Badge></td>
                <td>{a.status === "submitted" ? `${a.score} / ${a.total_marks} (${pctText(a.percentage)})` : "-"}</td>
                <td>{a.status === "submitted" && <Link to={`/manage/attempts/${a.id}`}>View</Link>}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h2>Question bank</h2>
        <p>{d.subjects.map((s) => `${s.name}: ${s.n}`).join("  |  ") || "No questions yet."}</p>
        <Link className="btn" to="/manage/questions">Manage questions</Link>
      </div>
    </>
  );
}
