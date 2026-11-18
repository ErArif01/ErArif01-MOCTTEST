import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, fmtTime } from "../api.js";

export default function Exam() {
  const { testId } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [ans, setAns] = useState({});
  const [mark, setMark] = useState({});
  const [seen, setSeen] = useState({ 0: true });
  const [cur, setCur] = useState(0);
  const [left, setLeft] = useState(0);
  const [modal, setModal] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(0);
  const doneRef = useRef(false);
  const ansRef = useRef({});

  useEffect(() => {
    api(`/tests/${testId}/start/`, { method: "POST" })
      .then((r) => {
        setD(r); setAns(r.answers || {}); ansRef.current = r.answers || {};
        endRef.current = Date.now() + r.remaining_seconds * 1000; setLeft(r.remaining_seconds);
      })
      .catch((e) => setErr(e.message));
  }, [testId]);

  const submit = async () => {
    if (doneRef.current) return;
    doneRef.current = true; setBusy(true);
    try {
      await api(`/attempts/${d.attempt_id}/submit/`, { method: "POST", body: { answers: ansRef.current } });
      nav(`/result/${d.attempt_id}`, { replace: true });
    } catch (e) { doneRef.current = false; setBusy(false); setErr(e.message); }
  };

  useEffect(() => {
    if (!d) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) { clearInterval(t); submit(); }
    }, 1000);
    return () => clearInterval(t);
  }, [d]);

  useEffect(() => {
    const warn = (e) => { if (!doneRef.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const sections = useMemo(() => {
    if (!d) return [];
    const out = [];
    d.questions.forEach((q, i) => {
      const last = out[out.length - 1];
      if (last && last.name === q.section) last.end = i; else out.push({ name: q.section, start: i, end: i });
    });
    return out;
  }, [d]);

  if (err && !d) return <div className="wrap"><p className="err">{err}</p><button onClick={() => nav("/")}>Back</button></div>;
  if (!d) return <p className="center">Preparing your test...</p>;

  const qs = d.questions, q = qs[cur];
  const persist = (n) => { ansRef.current = n; setAns(n); api(`/attempts/${d.attempt_id}/save/`, { method: "POST", body: { answers: n } }).catch(() => {}); };
  const pick = (L) => persist({ ...ansRef.current, [q.id]: L });
  const clear = () => { const n = { ...ansRef.current }; delete n[q.id]; persist(n); };
  const go = (i) => { i = Math.max(0, Math.min(qs.length - 1, i)); setCur(i); setSeen((s) => ({ ...s, [i]: true })); };
  const status = (i) => {
    const a = !!ans[qs[i].id], m = !!mark[i];
    return m && a ? "ma" : m ? "mk" : a ? "an" : seen[i] ? "na" : "nv";
  };
  const counts = { an: 0, na: 0, mk: 0, ma: 0, nv: 0 };
  qs.forEach((_, i) => counts[status(i)]++);
  const answered = Object.keys(ans).length;
  const curSec = sections.find((s) => cur >= s.start && cur <= s.end);

  return (
    <div className="exam">
      <div className="top">
        <b>{d.test.name}</b>
        <span className={"timer" + (left < 300 ? " low" : "")}>{fmtTime(left)}</span>
      </div>
      <div className="tabs">
        {sections.map((s) => (
          <button key={s.name} className={s === curSec ? "on" : ""} onClick={() => go(s.start)}>{s.name}</button>
        ))}
      </div>
      <div className="grid">
        <div className="card">
          <div className="muted">Question {cur + 1} of {qs.length} | +{d.test.marks_per_question} / -{d.test.negative_marks}</div>
          <p className="qt">{q.text}</p>
          {q.options.map((t, i) => {
            const L = "ABCD"[i];
            return (
              <label key={L} className={"opt" + (ans[q.id] === L ? " sel" : "")}>
                <input type="radio" name={"q" + q.id} checked={ans[q.id] === L} onChange={() => pick(L)} />
                <span>{L}.</span><span>{t}</span>
              </label>
            );
          })}
          <div className="bar">
            <button className="pri" onClick={() => { setMark((m) => ({ ...m, [cur]: false })); go(cur + 1); }}>Save &amp; Next</button>
            <button onClick={() => { setMark((m) => ({ ...m, [cur]: true })); go(cur + 1); }}>Mark for Review &amp; Next</button>
            <button onClick={clear}>Clear Response</button>
            <button onClick={() => go(cur - 1)}>Previous</button>
          </div>
        </div>
        <div className="card">
          <div className="pal">
            {qs.map((_, i) => <button key={i} className={status(i) + (i === cur ? " cur" : "")} onClick={() => go(i)}>{i + 1}</button>)}
          </div>
          <ul className="legend">
            <li><i className="an" /> Answered {counts.an}</li><li><i className="na" /> Not answered {counts.na}</li>
            <li><i className="nv" /> Not visited {counts.nv}</li><li><i className="mk" /> Marked {counts.mk}</li>
            <li><i className="ma" /> Answered and marked {counts.ma}</li>
          </ul>
          <button className="pri full" onClick={() => setModal(true)}>Submit test</button>
        </div>
      </div>
      {modal && (
        <div className="overlay"><div className="card modal">
          <h2>Submit test?</h2>
          <p>Answered: <b>{answered}</b> | Not answered: <b>{qs.length - answered}</b> | Marked for review: <b>{counts.mk + counts.ma}</b></p>
          <p>Time left: {fmtTime(left)}. You cannot return to the test after submitting.</p>
          {err && <p className="err">{err}</p>}
          <div className="bar">
            <button className="pri" disabled={busy} onClick={submit}>{busy ? "Submitting..." : "Yes, submit"}</button>
            <button disabled={busy} onClick={() => setModal(false)}>Go back to test</button>
          </div>
        </div></div>
      )}
    </div>
  );
}
