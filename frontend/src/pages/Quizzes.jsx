import { useEffect, useState } from "react";
import { api } from "../api.js";
import { QuizCard, Section } from "../ui.jsx";

export default function Quizzes() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/quizzes/").then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="err center">{err}</p>;
  if (!d) return <p className="center">Loading...</p>;
  const grid = (list) => <div className="cards">{list.map((q) => <QuizCard key={q.id} q={q} />)}</div>;
  const none = !d.hourly && !d.featured.length && !d.more.length && !d.past.length;
  return (
    <div className="wrap wide">
      <h1>Quizzes</h1>
      <p className="muted">A new quiz with fresh questions goes live every hour. Each quiz can be attempted once and you see your result straight away.</p>
      {none && <p>No quizzes yet. Check back soon.</p>}
      {d.hourly && <Section title="This hour's quiz">{grid([d.hourly])}</Section>}
      {d.featured.length > 0 && <Section title="Featured quizzes">{grid(d.featured)}</Section>}
      {d.more.length > 0 && <Section title="More quizzes">{grid(d.more)}</Section>}
      {d.past.length > 0 && <Section title="Earlier hourly quizzes">{grid(d.past)}</Section>}
    </div>
  );
}
