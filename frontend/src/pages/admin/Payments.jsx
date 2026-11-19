import { useEffect, useState } from "react";
import { api, fmtDate, rupee } from "../../api.js";
import { Badge, Pager } from "./shared.jsx";

export default function Payments() {
  const [d, setD] = useState(null);
  const [status, setStatus] = useState("paid");
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");
  useEffect(() => { api(`/admin/payments/?status=${status}&page=${page}`).then(setD).catch((e) => setErr(e.message)); }, [status, page]);
  return (
    <div className="card">
      <h2>Payments (Razorpay)</h2>
      {d && <div className="stats"><div className="stat big"><b>{rupee(d.revenue)}</b><span>Total revenue</span></div><div className="stat"><b>{d.paid_count}</b><span>Paid orders</span></div></div>}
      <div className="filters"><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="paid">Paid</option><option value="created">Not completed</option><option value="">All</option></select></div>
      {err && <p className="err">{err}</p>}
      {!d ? <p>Loading...</p> : d.results.length === 0 ? <p>No payments yet.</p> : (
        <div className="scroll"><table>
          <thead><tr><th>Date</th><th>User</th><th>Test</th><th>Amount</th><th>Status</th><th>Razorpay IDs</th></tr></thead>
          <tbody>{d.results.map((o) => (
            <tr key={o.id}><td>{fmtDate(o.paid_at || o.created_at)}</td><td>{o.user}<div className="muted">{o.email}</div></td><td>{o.test}</td><td>{rupee(o.amount)}</td>
              <td>{o.status === "paid" ? <Badge kind="good">Paid</Badge> : <Badge>Pending</Badge>}</td><td className="small">{o.order_id}<br />{o.payment_id}</td></tr>))}</tbody>
        </table></div>
      )}
      <Pager meta={d} onPage={setPage} />
    </div>
  );
}
