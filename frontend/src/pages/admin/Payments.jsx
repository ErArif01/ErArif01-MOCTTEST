import { useEffect, useState } from "react";
import { api, fmtDate, rupee } from "../../api.js";
import { Badge, Pager } from "./shared.jsx";

const STATUS = { paid: ["good", "Paid"], pending: ["bad", "To verify"], rejected: ["", "Rejected"], created: ["", "Not completed"] };

export default function Payments() {
  const [d, setD] = useState(null);
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [rej, setRej] = useState(null);           // {order, reason}
  const [st, setSt] = useState(null);             // QR / UPI settings
  const [qr, setQr] = useState(null);
  const [clearQr, setClearQr] = useState(false);
  const [tests, setTests] = useState([]);
  const [grant, setGrant] = useState({ email: "", test_id: "" });
  const load = () => api(`/admin/payments/?status=${status}&page=${page}`).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [status, page]);
  useEffect(() => {
    api("/admin/payment-settings/").then(setSt).catch((e) => setErr(e.message));
    api("/admin/tests/").then((t) => setTests(t.filter((x) => x.is_paid))).catch(() => {});
  }, []);
  const act = async (fn, msg) => { setErr(""); setOk(""); try { await fn(); setOk(msg); load(); } catch (e) { setErr(e.message); } };
  const saveSettings = async (e) => {
    e.preventDefault(); setErr(""); setOk("");
    const fd = new FormData();
    fd.append("manual_enabled", st.manual_enabled ? "true" : "false"); fd.append("upi_id", st.upi_id || ""); fd.append("payee_name", st.payee_name || ""); fd.append("manual_note", st.manual_note || "");
    if (qr) fd.append("upi_qr", qr); if (clearQr) fd.append("clear_upi_qr", "true");
    try { setSt(await api("/admin/payment-settings/", { method: "PUT", form: fd })); setQr(null); setClearQr(false); setOk("QR / UPI settings saved."); e.target.reset(); } catch (x) { setErr(x.message); }
  };
  return (
    <>
      {err && <p className="err" role="alert">{err}</p>}{ok && <p className="okmsg" role="status">{ok}</p>}
      <div className="card" style={{ marginBottom: 12 }}>
        <h2>Payments</h2>
        {d && <div className="stats"><div className="stat big"><b>{rupee(d.revenue)}</b><span>Money received</span></div><div className="stat"><b>{d.paid_count}</b><span>Paid orders</span></div>
          <div className={"stat " + (d.pending_count ? "bad" : "")}><b>{d.pending_count}</b><span>QR payments to verify</span></div></div>}
        <div className="tabs">{[["pending", "To verify"], ["paid", "Paid"], ["rejected", "Rejected"], ["created", "Not completed"], ["", "All"]].map(([k, l]) =>
          <button key={l} className={status === k ? "on" : ""} onClick={() => { setStatus(k); setPage(1); }}>{l}</button>)}</div>
        {!d ? <p>Loading...</p> : d.results.length === 0 ? <p>Nothing here.</p> : (
          <div className="scroll"><table>
            <thead><tr><th>Date</th><th>User</th><th>Test</th><th>Amount</th><th>Method</th><th>Transaction</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{d.results.map((o) => (
              <tr key={o.id}><td>{fmtDate(o.paid_at || o.created_at)}</td><td>{o.user}<div className="muted">{o.email}</div></td><td>{o.test}</td><td>{rupee(o.amount)}</td>
                <td>{o.method === "manual" ? "QR / UPI" : "Razorpay"}</td>
                <td className="small">{o.method === "manual" ? <>UTR: <b>{o.utr}</b>{o.screenshot && <><br /><a href={o.screenshot} target="_blank" rel="noreferrer">View screenshot</a></>}{o.note && <><br />{o.note}</>}</> : <>{o.order_id}<br />{o.payment_id}</>}</td>
                <td><Badge kind={STATUS[o.status]?.[0]}>{STATUS[o.status]?.[1] || o.status}</Badge></td>
                <td className="acts">{o.method === "manual" && o.status !== "paid" && <button className="pri" onClick={() => act(() => api(`/admin/payments/${o.id}/approve/`, { method: "POST" }), "Payment approved. The test is unlocked for the user.")}>Approve</button>}
                  {o.method === "manual" && o.status === "pending" && <button className="danger" onClick={() => setRej({ order: o, reason: "" })}>Reject</button>}</td></tr>))}</tbody>
          </table></div>
        )}
        <Pager meta={d} onPage={setPage} />
      </div>

      <form className="card" onSubmit={saveSettings} style={{ marginBottom: 12 }}>
        <h2>QR / UPI payment (manual)</h2>
        <p className="muted">Show your own QR code. Users pay, then enter the UPI transaction (UTR) number here on the site. When the money reaches your account, press Approve above and the test unlocks.</p>
        {st && (
          <>
            <div className="formgrid">
              <label className="chk"><input type="checkbox" checked={st.manual_enabled} onChange={(e) => setSt({ ...st, manual_enabled: e.target.checked })} /> Show QR / UPI payment to users</label>
              <label>UPI ID<input value={st.upi_id} placeholder="yourname@bank" onChange={(e) => setSt({ ...st, upi_id: e.target.value })} /></label>
              <label>Payee name<input value={st.payee_name} onChange={(e) => setSt({ ...st, payee_name: e.target.value })} /></label>
              <label>QR code image (jpg, png)<input type="file" accept="image/*" onChange={(e) => setQr(e.target.files[0] || null)} /></label>
              <label className="span2">Instructions shown to users<textarea rows={3} value={st.manual_note} onChange={(e) => setSt({ ...st, manual_note: e.target.value })} placeholder="e.g. Pay the exact amount, then enter the UTR number. Approval takes up to 2 hours." /></label>
            </div>
            {st.qr_url && <p><img className="qrimg" src={st.qr_url} alt="Current QR code" /> <label className="chk"><input type="checkbox" checked={clearQr} onChange={(e) => setClearQr(e.target.checked)} /> remove this QR image</label></p>}
          </>
        )}
        <div className="bar"><button className="pri">Save QR / UPI settings</button></div>
      </form>

      <form className="card" onSubmit={(e) => { e.preventDefault(); act(() => api("/admin/payments/grant/", { method: "POST", body: grant }), "Access granted."); }}>
        <h2>Give a user access manually</h2>
        <p className="muted">For example when someone paid on WhatsApp or in cash. This unlocks the paid test for that user without any payment record.</p>
        <div className="filters">
          <input type="text" required placeholder="User email or username" value={grant.email} onChange={(e) => setGrant({ ...grant, email: e.target.value })} />
          <select required value={grant.test_id} onChange={(e) => setGrant({ ...grant, test_id: e.target.value })}><option value="">Select paid test...</option>{tests.map((t) => <option key={t.id} value={t.id}>{t.exam} / {t.name} ({rupee(t.price)})</option>)}</select>
          <button className="pri">Give access</button>
        </div>
      </form>

      {rej && (
        <div className="overlay"><div className="card modal">
          <h2>Reject this payment?</h2>
          <p className="muted">{rej.order.user} &bull; UTR {rej.order.utr}. The user will see your reason and can submit again.</p>
          <label>Reason (shown to the user)<input autoFocus value={rej.reason} placeholder="e.g. Amount not received in account" onChange={(e) => setRej({ ...rej, reason: e.target.value })} /></label>
          <div className="bar">
            <button className="danger" onClick={() => act(() => api(`/admin/payments/${rej.order.id}/reject/`, { method: "POST", body: { reason: rej.reason } }), "Payment rejected.").then(() => setRej(null))}>Reject</button>
            <button onClick={() => setRej(null)}>Cancel</button>
          </div>
        </div></div>
      )}
    </>
  );
}
