import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { NewsCard, QuizCard, Section, Tile, VacancyCard } from "../ui.jsx";

export default function Home() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/home/").then(setD).catch((e) => setErr(e.message)); }, []);
  const quizzes = d ? [d.quizzes.hourly, ...d.quizzes.featured].filter(Boolean) : [];
  return (
    <>
      <section className="hero">
        <div className="herobox">
          <h1>Exam Crack Study Point</h1>
          <p>Free and paid mock tests, hourly quizzes, latest vacancies and exam updates. Pick your exam and start practising.</p>
          <div className="bar"><Link className="btn pri" to="/exams">Choose your exam</Link><Link className="btn" to="/quizzes">Play today's quiz</Link></div>
          {d && <div className="herostats"><span><b>{d.stats.exams}</b> exams</span><span><b>{d.stats.tests}</b> tests</span><span><b>{d.stats.questions}</b> questions</span></div>}
        </div>
      </section>
      <div className="wrap wide">
        {err && <p className="err">{err}</p>}
        {!d && !err && <p>Loading...</p>}
        {d && (
          <>
            {quizzes.length > 0 && <Section title="Quiz time" to="/quizzes"><div className="cards">{quizzes.map((q) => <QuizCard key={q.id} q={q} />)}</div></Section>}
            <Section title="Choose your exam" to="/exams">
              {d.categories.length === 0 ? <p>Exams will appear here soon.</p> : (
                <div className="cards">{d.categories.map((c) => <Tile key={c.id} to={`/category/${c.id}`} color={c.color} icon={c.icon} title={c.name} sub={c.description} meta={`${c.n_exams} exams \u2022 ${c.n_tests} tests`} />)}</div>
              )}
            </Section>
            {d.news.length > 0 && <Section title="Latest updates" to="/news"><div className="cards">{d.news.map((n) => <NewsCard key={n.id} n={n} />)}</div></Section>}
            {d.vacancies.length > 0 && <Section title="Latest vacancies" to="/vacancies"><div className="cards">{d.vacancies.map((v) => <VacancyCard key={v.id} v={v} />)}</div></Section>}
          </>
        )}
      </div>
    </>
  );
}
