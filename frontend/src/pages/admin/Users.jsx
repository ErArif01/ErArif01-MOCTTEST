import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmtDate } from "../../api.js";
import { Badge, Pager, pctText } from "./shared.jsx";

export default function Users() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    api(`/admin/users/?q=${encodeURIComponent(q)}&status=${status}&page=${page}`).then(setData).catch((e) => setErr(e.message));
  }, [q, status, page]);
  useEffect(() => { load(); }, [status, page]);
  const toggle = async (u) => {
    setErr("");
    try { await api(`/admin/users/${u.id}/${u.is_active ? "block" : "unblock"}/`, { method: "POST" }); load(); }
    catch (e) { setErr(e.message); }
  };
  return (
    <div className="card">
      <form className="filters" onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}>
        <input placeholder="Search name, email or username" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All users</option><option value="active">Active</option>
          <option value="blocked">Blocked</option><option value="staff">Admins</option>
        </select>
        <button className="pri">Search</button>
      </form>
      {err && <p className="err" role="alert">{err}</p>}
      {!data ? <p>Loading...</p> : (
        <>
          <div className="scroll"><table>
            <thead><tr><th>User</th><th>Status</th><th>Joined</th><th>Last login</th><th>Tests</th><th>Avg</th><th>Best</th><th>Actions</th></tr></thead>
            <tbody>{data.results.map((u) => (
              <tr key={u.id}>
                <td><Link to={`/manage/users/${u.id}`}>{u.name || u.username}</Link><div className="muted">{u.email}{u.username !== u.email ? ` (${u.username})` : ""}</div></td>
                <td>{u.is_active ? <Badge kind="good">Active</Badge> : <Badge kind="bad">Blocked</Badge>} {u.is_staff && <Badge>Admin</Badge>}</td>
                <td>{fmtDate(u.date_joined)}</td><td>{fmtDate(u.last_login)}</td>
                <td>{u.attempts}</td><td>{pctText(u.avg_percentage)}</td><td>{pctText(u.best_percentage)}</td>
                <td className="acts">
                  <Link className="btn" to={`/manage/users/${u.id}`}>View</Link>
                  <button className={u.is_active ? "danger" : "pri"} onClick={() => toggle(u)}>{u.is_active ? "Block" : "Unblock"}</button>
                </td>
              </tr>))}</tbody>
          </table></div>
          {data.results.length === 0 && <p>No users found.</p>}
          <Pager meta={data} onPage={setPage} />
        </>
      )}
    </div>
  );
}
