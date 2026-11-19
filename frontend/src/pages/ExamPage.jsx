import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, pctText, rupee } from "../api.js";
import { buyTest } from "../payment.js";

const TYPE = { mock: "Full mock", sectional: "Sectional", pyp: "Previous year", topic: "Topic test" };
const TABS = [["all", "All tests"], ["free", "Free"], ["paid", "Paid"], ["pyp", "Previous papers"], ["sectional", "Sectional"], ["attempted", "My attempts"], ["syllabus", "Syllabus"]];

export default function ExamPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("all");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(0);
  const load = () => api(`/exams/${id}/`).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);
  const loggedIn = !!localStorage.getItem("token");
  const buy = async (t) => {
    if (!loggedIn) { sessionStorage.setItem("next", `/exams/${id}`); nav("/login"); return; }
    setErr(""); setBusy(t.id);
    try { if (await buyTest(t)) await load(); } catch (e) { setErr(e.message); }
    setBusy(0);
  };
  if (err && !d) return <p className="err center">{err}</p>;
  if (!d) return <p className="center">Loading...</p>;
  const { exam, tests } = d;
  const shown = tests.filter((t) => ({ all: true, free: !t.is_paid, paid: t.is_paid, pyp: t.test_type === "pyp", sectional: t.test_type === "sectional", attempted: t.attempts > 0 }[tab]));
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
              <div className="head"><span className="badge">{TYPE[t.test_type]}</span>{t.is_paid ? <span className="badge bad">{t.purchased ? "Purchased" : rupee(t.price)}</span> : <span className="badge good">FREE</span>}</div>
              <h3>{t.name}</h3>
              <p className="muted">{t.total_questions} questions &bull; {t.duration_minutes} min &bull; {t.total_marks} marks</p>
              <p className="muted small">{t.sections.map((s) => `${s.subject} ${s.count}`).join(" \u2022 ")}</p>
              {t.attempts > 0 && <p className="small">Best score: <b>{pctText(t.best_percentage)}</b> ({t.attempts} attempt{t.attempts > 1 ? "s" : ""}) <Link to={`/result/${t.best_attempt}`}>View</Link></p>}
              <div className="bar">
                {t.is_paid && !t.purchased
                  ? <button className="pri" disabled={busy === t.id} onClick={() => buy(t)}>{busy === t.id ? "Please wait..." : `Buy for ${rupee(t.price)}`}</button>
                  : <Link className="btn pri" to={`/instructions/${t.id}`}>{t.attempts ? "Attempt again" : "Start test"}</Link>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
