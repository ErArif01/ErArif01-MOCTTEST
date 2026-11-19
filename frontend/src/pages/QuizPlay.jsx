import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { OptionRow } from "../ui.jsx";

export default function QuizPlay() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [ans, setAns] = useState({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api(`/quizzes/${id}/`).then(setD).catch((e) => setErr(e.message)); }, [id]);
  const submit = async () => {
    setBusy(true); setErr("");
    try { setD(await api(`/quizzes/${id}/submit/`, { method: "POST", body: { answers: ans } })); window.scrollTo(0, 0); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  if (err && !d) return <p className="err center">{err}</p>;
  if (!d) return <p className="center">Loading...</p>;
  if (d.attempted) {
    const r = d.result;
    return (
      <div className="wrap">
        <div className="card">
          <h1>{r.quiz.title}</h1>
          <div className="stats">
            <div className="stat big"><b>{r.correct} / {r.total}</b><span>Your score</span></div>
            <div className="stat"><b>{r.percentage}%</b><span>Percentage</span></div>
            <div className="stat good"><b>{r.correct}</b><span>Correct</span></div>
            <div className="stat bad"><b>{r.incorrect}</b><span>Wrong</span></div>
            <div className="stat"><b>{r.skipped}</b><span>Skipped</span></div>
            <div className="stat"><b>#{r.rank}</b><span>Rank of {r.participants}</span></div>
          </div>
          {r.leaderboard.length > 0 && <><h2>Top scorers</h2><ol className="lb">{r.leaderboard.map((x, i) => <li key={i}>{x.name} &mdash; {x.correct}/{x.total}</li>)}</ol></>}
          <div className="bar"><Link className="btn pri" to="/quizzes">More quizzes</Link><Link className="btn" to="/">Home</Link></div>
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <h2>Answers</h2>
          {r.review.map((q, n) => (
            <div key={q.id} className="rv">
              <p><b>{n + 1}. {q.text}</b> <span className={"tag " + q.status}>{q.status}</span></p>
              {q.options.map((t, i) => { const L = "ABCD"[i]; return <OptionRow key={L} letter={L} state={L === q.correct ? "good" : L === q.selected ? "bad" : ""} text={t + (L === q.selected ? " (your answer)" : "") + (L === q.correct ? " (correct)" : "")} />; })}
              {q.explanation && <p className="muted">{q.explanation}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }
  const answered = Object.keys(ans).length;
  return (
    <div className="wrap">
      <div className="card">
        <h1>{d.quiz.title}</h1>
        <p className="muted">{d.quiz.description} +1 for each correct answer, no negative marking. You can attempt this quiz only once.</p>
        {d.questions.map((q, n) => (
          <div key={q.id} className="rv">
            <p><b>{n + 1}. {q.text}</b></p>
            {q.options.map((t, i) => { const L = "ABCD"[i]; return <OptionRow key={L} letter={L} text={t} name={"q" + q.id} checked={ans[q.id] === L} onPick={() => setAns({ ...ans, [q.id]: L })} />; })}
          </div>
        ))}
        {err && <p className="err" role="alert">{err}</p>}
        <div className="bar"><button className="pri" disabled={busy} onClick={submit}>{busy ? "Submitting..." : `Submit (${answered}/${d.questions.length} answered)`}</button></div>
      </div>
    </div>
  );
}
