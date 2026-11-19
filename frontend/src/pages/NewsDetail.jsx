import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, fmtDate } from "../api.js";
import { VideoBlock } from "../ui.jsx";

export default function NewsDetail() {
  const { id } = useParams();
  const [n, setN] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api(`/news/${id}/`).then(setN).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <p className="err center">{err}</p>;
  if (!n) return <p className="center">Loading...</p>;
  return (
    <div className="wrap">
      <article className="card">
        <p><Link to="/news">&larr; All updates</Link></p>
        <span className="badge">{n.category_label}</span> <span className="muted small">{fmtDate(n.created_at)}</span>
        <h1>{n.title}</h1>
        {n.image && <img className="nfull" src={n.image} alt="" />}
        <VideoBlock file={n.video} url={n.video_url} />
        {n.body.split("\n").map((p, i) => (p.trim() ? <p key={i}>{p}</p> : null))}
        {n.exam_id && <div className="bar"><Link className="btn pri" to={`/exams/${n.exam_id}`}>Practice {n.exam} tests</Link></div>}
      </article>
    </div>
  );
}
