import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, fmtDate } from "../../api.js";
import { Badge, pctText } from "./shared.jsx";

export default function UserDetail({ me }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [pw, setPw] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const load = () => api(`/admin/users/${id}/`).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);
  const act = async (fn, msg) => {
    setErr(""); setOk("");
    try { await fn(); setOk(msg); load(); } catch (e) { setErr(e.message); }
  };
  if (!d) return err ? <p className="err">{err}</p> : <p>Loading...</p>;
  const u = d.user, self = me && me.id === u.id;
  return (
    <>
      <p><Link to="/manage/users">&larr; All users</Link></p>
      <div className="card">
        <h2>{u.name || u.username} {u.is_active ? <Badge kind="good">Active</Badge> : <Badge kind="bad">Blocked</Badge>} {u.is_staff && <Badge>Admin</Badge>}</h2>
        <p className="muted">{u.email} | username: {u.username}</p>
        <div className="stats">
          <div className="stat"><b>{u.attempts}</b><span>Tests submitted</span></div>
          <div className="stat"><b>{pctText(u.avg_percentage)}</b><span>Average</span></div>
          <div className="stat"><b>{pctText(u.best_percentage)}</b><span>Best</span></div>
          <div className="stat"><b className="sm">{fmtDate(u.date_joined)}</b><span>Joined</span></div>
          <div className="stat"><b className="sm">{fmtDate(u.last_login)}</b><span>Last login</span></div>
        </div>
        {err && <p className="err" role="alert">{err}</p>}
        {ok && <p className="okmsg" role="status">{ok}</p>}
        {!self && (
          <div className="bar">
            {u.is_active
              ? <button className="danger" onClick={() => act(() => api(`/admin/users/${id}/block/`, { method: "POST" }), "User blocked and logged out.")}>Block user</button>
              : <button className="pri" onClick={() => act(() => api(`/admin/users/${id}/unblock/`, { method: "POST" }), "User unblocked.")}>Unblock user</button>}
            <button onClick={() => act(() => api(`/admin/users/${id}/set-staff/`, { method: "POST", body: { is_staff: !u.is_staff } }), u.is_staff ? "Admin rights removed." : "User is now an admin.")}>
              {u.is_staff ? "Remove admin" : "Make admin"}</button>
            <button className="danger" onClick={() => setConfirmDel(true)}>Delete user</button>
          </div>
        )}
        <form className="filters" onSubmit={(e) => { e.preventDefault(); act(() => api(`/admin/users/${id}/set-password/`, { method: "POST", body: { password: pw } }), "Password updated. The user was logged out.").then(() => setPw("")); }}>
          <input type="text" placeholder="Set a new password for this user (min 8)" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} />
          <button>Set password</button>
        </form>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <h2>Tests taken</h2>
        {d.attempts.length === 0 ? <p>No attempts yet.</p> : (
          <div className="scroll"><table>
            <thead><tr><th>Test</th><th>Started</th><th>Status</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Skipped</th><th></th></tr></thead>
            <tbody>{d.attempts.map((a) => (
              <tr key={a.id}>
                <td>{a.test}</td><td>{fmtDate(a.started_at)}</td>
                <td><Badge kind={a.status === "submitted" ? "good" : ""}>{a.status.replace("_", " ")}</Badge></td>
                <td>{a.status === "submitted" ? `${a.score} / ${a.total_marks} (${pctText(a.percentage)})` : "-"}</td>
                <td>{a.correct}</td><td>{a.incorrect}</td><td>{a.unattempted}</td>
                <td>{a.status === "submitted" && <Link to={`/manage/attempts/${a.id}`}>Full result</Link>}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </div>
      {confirmDel && (
        <div className="overlay"><div className="card modal">
          <h2>Delete {u.name || u.username}?</h2>
          <p>This permanently deletes the user and all their test results. Blocking is safer if you may need the records.</p>
          <div className="bar">
            <button className="danger" onClick={() => api(`/admin/users/${id}/`, { method: "DELETE" }).then(() => nav("/manage/users")).catch((e) => { setErr(e.message); setConfirmDel(false); })}>Yes, delete</button>
            <button onClick={() => setConfirmDel(false)}>Cancel</button>
          </div>
        </div></div>
      )}
    </>
  );
}
