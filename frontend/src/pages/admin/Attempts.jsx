import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, fmtDate } from "../../api.js";
import { Badge, Pager, pctText } from "./shared.jsx";

export default function Attempts() {
  const [sp] = useSearchParams();
  const [data, setData] = useState(null);
  const [tests, setTests] = useState([]);
  const [q, setQ] = useState("");
  const [test, setTest] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");
  useEffect(() => { api("/admin/tests/").then(setTests).catch(() => {}); }, []);
  const load = useCallback(() => {
    api(`/admin/attempts/?q=${encodeURIComponent(q)}&test=${test}&status=${status}&page=${page}${sp.get("user") ? "&user=" + sp.get("user") : ""}`)
      .then(setData).catch((e) => setErr(e.message));
  }, [q, test, status, page, sp]);
  useEffect(() => { load(); }, [test, status, page]);
  return (
    <div className="card">
      <h2>All results</h2>
      <form className="filters" onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}>
        <input placeholder="Search user name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={test} onChange={(e) => { setTest(e.target.value); setPage(1); }}>
          <option value="">All tests</option>{tests.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Any status</option><option value="submitted">Submitted</option><option value="in_progress">In progress</option>
        </select>
        <button className="pri">Search</button>
      </form>
      {err && <p className="err">{err}</p>}
      {!data ? <p>Loading...</p> : (
        <>
          <div className="scroll"><table>
            <thead><tr><th>User</th><th>Test</th><th>Started</th><th>Status</th><th>Score</th><th>%</th><th>C / W / S</th><th></th></tr></thead>
            <tbody>{data.results.map((a) => (
              <tr key={a.id}>
                <td><Link to={`/manage/users/${a.user_id}`}>{a.user}</Link><div className="muted">{a.email}</div></td>
                <td>{a.test}</td><td>{fmtDate(a.started_at)}</td>
                <td><Badge kind={a.status === "submitted" ? "good" : ""}>{a.status.replace("_", " ")}</Badge></td>
                <td>{a.status === "submitted" ? `${a.score} / ${a.total_marks}` : "-"}</td><td>{pctText(a.percentage)}</td>
                <td>{a.status === "submitted" ? `${a.correct} / ${a.incorrect} / ${a.unattempted}` : "-"}</td>
                <td>{a.status === "submitted" && <Link to={`/manage/attempts/${a.id}`}>Full result</Link>}</td>
              </tr>))}</tbody>
          </table></div>
          {data.results.length === 0 && <p>No attempts found.</p>}
          <Pager meta={data} onPage={setPage} />
        </>
      )}
    </div>
  );
}
