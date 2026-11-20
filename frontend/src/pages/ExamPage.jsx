import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, pctText, rupee } from "../api.js";
import { buyTest } from "../payment.js";

function QrModal({ test, cfg, onClose, onDone }) {
  const [utr, setUtr] = useState("");
  const [shot, setShot] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const m = cfg.manual;
  const upiLink = m.upi_id ? `upi://pay?pa=${encodeURIComponent(m.upi_id)}&pn=${encodeURIComponent(m.payee_name || "Exam Crack Study Point")}&am=${test.price}&cu=INR&tn=${encodeURIComponent(test.name.slice(0, 40))}` : "";
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    const fd = new FormData(); fd.append("test_id", test.id); fd.append("utr", utr.trim()); if (shot) fd.append("screenshot", shot);
    try { const r = await api("/payments/manual/", { method: "POST", form: fd }); setMsg(r.message); onDone(); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <div className="overlay"><div className="card modal wide" role="dialog" aria-label="Pay by QR">
      <h2>Pay {rupee(test.price)} for {test.name}</h2>
      {msg ? (<><p className="okmsg">{msg}</p><div className="bar"><button className="pri" onClick={onClose}>Close</button></div></>) : (
        <>
          <ol className="steps"><li>Scan the QR code with any UPI app (or use the UPI ID) and pay exactly <b>{rupee(test.price)}</b>.</li><li>Copy the <b>UTR / transaction ID</b> from your payment app.</li><li>Enter it below. The test unlocks after the admin confirms the money.</li></ol>
          <div className="qrbox">
            {m.qr_url && <img className="qrimg big" src={m.qr_url} alt="QR code to pay" />}
            <div>
              {m.upi_id && <p>UPI ID: <b>{m.upi_id}</b> <button type="button" onClick={() => navigator.clipboard?.writeText(m.upi_id)}>Copy</button></p>}
              {m.payee_name && <p className="muted">Name: {m.payee_name}</p>}
              {upiLink && <a className="btn" href={upiLink}>Open UPI app (mobile)</a>}
              {m.note && <p className="muted">{m.note}</p>}
            </div>
          </div>
          <form onSubmit={submit} className="qform">
            <label>UTR / transaction ID *<input required minLength={6} maxLength={40} value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 412345678901" /></label>
            <label>Payment screenshot (optional)<input type="file" accept="image/*" onChange={(e) => setShot(e.target.files[0] || null)} /></label>
            {err && <p className="err" role="alert">{err}</p>}
            <div className="bar"><button className="pri" disabled={busy}>{busy ? "Submitting..." : "I have paid, submit"}</button><button type="button" onClick={onClose}>Cancel</button></div>
          </form>
        </>
      )}
    </div></div>
  );
}

export default function ExamPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [cfg, setCfg] = useState({ payments_enabled: false, manual: { enabled: false } });
  const [tab, setTab] = useState("all");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(0);
  const [qr, setQr] = useState(null);
  const load = () => api(`/exams/${id}/`).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); api("/config/").then(setCfg).catch(() => {}); }, [id]);
  const loggedIn = !!localStorage.getItem("token");
  const needLogin = () => { sessionStorage.setItem("next", `/exams/${id}`); nav("/login"); };
  const buy = async (t) => {
    if (!loggedIn) return needLogin();
    setErr(""); setBusy(t.id);
    try { if (await buyTest(t)) await load(); } catch (e) { setErr(e.message); }
    setBusy(0);
  };
  if (err && !d) return <p className="err center">{err}</p>;
  if (!d) return <p className="center">Loading...</p>;
  const { exam, tests, test_types: types } = d;
  const typeName = Object.fromEntries(types.map((t) => [t.key, t.name]));
  const TABS = [["all", "All tests"], ["free", "Free"], ["paid", "Paid"], ...types.map((t) => ["type:" + t.key, t.name]), ["attempted", "My attempts"], ["syllabus", "Syllabus"]];
  const shown = tests.filter((t) => (tab === "all" ? true : tab === "free" ? !t.is_paid : tab === "paid" ? t.is_paid : tab === "attempted" ? t.attempts > 0 : tab.startsWith("type:") ? t.test_type === tab.slice(5) : true));
  const noPay = !cfg.payments_enabled && !cfg.manual?.enabled;
  return (
    <div className="wrap wide">
      <div className="exhead" style={{ "--c": exam.color }}>
        <span className="ticon">{exam.icon}</span>
        <div><p className="small"><Link to={`/category/${exam.category.id}`}>{exam.category.name}</Link></p><h1>{exam.name}</h1>{exam.description && <p>{exam.description}</p>}</div>
      </div>
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</div>
      {err && <p className="err" role="alert">{err}</p>}
      {tab === "syllabus" ? (
        <div className="card">{exam.syllabus ? <ul className="syl">{exam.syllabus.split("\n").filter((x) => x.trim()).map((x, i) => <li key={i}>{x}</li>)}</ul> : <p>Syllabus will be added soon.</p>}</div>
      ) : shown.length === 0 ? <p>No tests in this tab yet.</p> : (
        <div className="tcards">
          {shown.map((t) => (
            <div className="card tcard" key={t.id}>
              <div className="head"><span className="badge">{typeName[t.test_type] || t.test_type_name}</span>{t.is_paid ? <span className="badge bad">{t.purchased ? "Purchased" : rupee(t.price)}</span> : <span className="badge good">FREE</span>}</div>
              <h3>{t.name}</h3>
              <p className="muted">{t.total_questions} questions &bull; {t.duration_minutes} min &bull; {t.total_marks} marks</p>
              <p className="muted small">{t.sections.map((s) => `${s.subject} ${s.count}`).join(" \u2022 ")}</p>
              {t.attempts > 0 && <p className="small">Best score: <b>{pctText(t.best_percentage)}</b> ({t.attempts} attempt{t.attempts > 1 ? "s" : ""}) <Link to={`/result/${t.best_attempt}`}>View</Link></p>}
              {t.pay_status === "rejected" && <p className="err small">Your last payment was not accepted: {t.pay_note}</p>}
              <div className="bar">
                {!(t.is_paid && !t.purchased) ? <Link className="btn pri" to={`/instructions/${t.id}`}>{t.attempts ? "Attempt again" : "Start test"}</Link>
                  : t.pay_status === "pending" ? <span className="badge bad">Payment under review. The test unlocks after admin approval.</span>
                  : noPay ? <span className="muted small">Payments are not available yet.</span>
                  : <>
                    {cfg.payments_enabled && <button className="pri" disabled={busy === t.id} onClick={() => buy(t)}>{busy === t.id ? "Please wait..." : `Pay ${rupee(t.price)} online`}</button>}
                    {cfg.manual?.enabled && <button className={cfg.payments_enabled ? "" : "pri"} onClick={() => (loggedIn ? setQr(t) : needLogin())}>Pay via QR / UPI</button>}
                  </>}
              </div>
            </div>
          ))}
        </div>
      )}
      {qr && <QrModal test={qr} cfg={cfg} onClose={() => setQr(null)} onDone={load} />}
    </div>
  );
}
