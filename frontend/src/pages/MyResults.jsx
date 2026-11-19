import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmtDate, pctText } from "../api.js";

export default function MyResults() {
  const [hist, setHist] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/attempts/").then(setHist).catch((e) => setErr(e.message)); }, []);
  return (
    <div className="wrap wide">
      <h1>My results</h1>
      {err && <p className="err">{err}</p>}
      {!hist ? <p>Loading...</p> : hist.length === 0 ? <p>You have not attempted any test yet. <Link to="/exams">Choose an exam</Link></p> : (
        <div className="card scroll"><table>
          <thead><tr><th>Test</th><th>Date</th><th>Score</th><th>Percentage</th><th></th></tr></thead>
          <tbody>{hist.map((h) => (
            <tr key={h.id}><td>{h.test}</td><td>{fmtDate(h.started_at)}</td>
              <td>{h.submitted ? `${h.score} / ${h.total_marks}` : "In progress"}</td><td>{pctText(h.percentage)}</td>
              <td>{h.submitted ? <Link to={`/result/${h.id}`}>View result</Link> : <Link to={`/take/${h.test_id}`}>Resume</Link>}</td></tr>))}</tbody>
        </table></div>
      )}
    </div>
  );
}
