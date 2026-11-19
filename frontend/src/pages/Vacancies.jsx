import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { VacStatus, VacancyCard } from "../ui.jsx";
import { Pager } from "./admin/shared.jsx";

export function VacancyList() {
  const [d, setD] = useState(null);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");
  useEffect(() => { api(`/vacancies/?page=${page}`).then(setD).catch((e) => setErr(e.message)); }, [page]);
  return (
    <div className="wrap wide">
      <h1>Government vacancies</h1>
      {err && <p className="err">{err}</p>}
      {!d ? <p>Loading...</p> : d.results.length === 0 ? <p>No vacancies posted yet.</p> : <div className="cards">{d.results.map((v) => <VacancyCard key={v.id} v={v} />)}</div>}
      <Pager meta={d} onPage={setPage} />
    </div>
  );
}

export function VacancyDetail() {
  const { id } = useParams();
  const [v, setV] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api(`/vacancies/${id}/`).then(setV).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <p className="err center">{err}</p>;
  if (!v) return <p className="center">Loading...</p>;
  const row = (k, val) => (val ? <tr><th>{k}</th><td>{val}</td></tr> : null);
  return (
    <div className="wrap">
      <div className="card">
        <p><Link to="/vacancies">&larr; All vacancies</Link></p>
        <VacStatus s={v.status} />
        <h1>{v.title}</h1>
        <div className="scroll"><table className="kv"><tbody>
          {row("Organization", v.organization)}{row("Total vacancies", v.total_posts?.toLocaleString("en-IN"))}
          {row("Start date", v.start_date)}{row("Last date", v.last_date ? `${v.last_date}${v.days_left != null ? ` (${v.days_left} days left)` : ""}` : "")}
          {row("Qualification", v.qualification)}{row("Age limit", v.age_limit)}{row("Application fee", v.fee)}
        </tbody></table></div>
        {v.posts.length > 0 && <><h2>Post-wise vacancies</h2><div className="scroll"><table>
          <thead><tr><th>Post</th><th>Vacancies</th><th>Qualification</th></tr></thead>
          <tbody>{v.posts.map((p, i) => <tr key={i}><td>{p.name}</td><td>{p.count}</td><td>{p.qualification}</td></tr>)}</tbody></table></div></>}
        {v.description && v.description.split("\n").map((p, i) => (p.trim() ? <p key={i}>{p}</p> : null))}
        <div className="bar">
          {v.apply_url && <a className="btn pri" href={v.apply_url} target="_blank" rel="noreferrer">Apply online</a>}
          {v.notification_url && <a className="btn" href={v.notification_url} target="_blank" rel="noreferrer">Official notification</a>}
          {v.exam_id && <Link className="btn" to={`/exams/${v.exam_id}`}>Practice {v.exam} tests</Link>}
        </div>
      </div>
    </div>
  );
}
