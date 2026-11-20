import { Link } from "react-router-dom";
import { fmtDate, videoEmbed } from "./api.js";

export const Section = ({ title, to, linkText = "View all", children }) => (
  <section className="sect">
    <div className="head"><h2>{title}</h2>{to && <Link to={to} className="more">{linkText} &rarr;</Link>}</div>
    {children}
  </section>
);

export const Tile = ({ to, color, icon, title, sub, meta }) => (
  <Link to={to} className="tile" style={{ "--c": color || "#0b4f8a" }}>
    <span className="ticon" aria-hidden="true">{icon}</span>
    <b>{title}</b>
    {sub && <span className="tsub">{sub}</span>}
    {meta && <span className="tmeta">{meta}</span>}
  </Link>
);

export const QuizCard = ({ q }) => (
  <Link to={`/quiz/${q.id}`} className={"qcard" + (q.kind === "hourly" ? " live" : "")}>
    <span className="badge">{q.kind === "hourly" ? "LIVE \u2022 HOURLY" : q.is_featured ? "FEATURED" : "QUIZ"}</span>
    <b>{q.title}</b>
    <span className="muted">{q.question_count} questions{q.exam ? ` \u2022 ${q.exam}` : ""}</span>
    <span className="qgo">{q.attempted ? `Your score: ${q.correct}/${q.total} \u2022 View result` : "Start quiz \u2192"}</span>
  </Link>
);

export const NewsCard = ({ n }) => (
  <Link to={`/news/${n.id}`} className="ncard">
    <div className="nimg" style={n.image ? { backgroundImage: `url(${n.image})` } : undefined}>{!n.image && <span>{n.has_video ? "\u25B6" : "\uD83D\uDCF0"}</span>}</div>
    <div className="nbody">
      <span className="badge">{n.category_label}</span>{n.has_video && <span className="badge good">Video</span>}
      <b>{n.title}</b>
      {n.summary && <span className="muted">{n.summary}</span>}
      <span className="muted small">{fmtDate(n.created_at)}</span>
    </div>
  </Link>
);

const VAC = { open: ["good", "Open"], closing: ["bad", "Closing soon"], upcoming: ["", "Upcoming"], closed: ["", "Closed"] };
export const VacStatus = ({ s }) => <span className={"badge " + VAC[s][0]}>{VAC[s][1]}</span>;

export const VacancyCard = ({ v }) => (
  <Link to={`/vacancies/${v.id}`} className="vcard">
    <div className="head"><VacStatus s={v.status} />{v.total_posts != null && <b className="vposts">{v.total_posts.toLocaleString("en-IN")} posts</b>}</div>
    <b>{v.title}</b>
    {v.organization && <span className="muted">{v.organization}</span>}
    <span className="muted small">Last date: {v.last_date || "-"}{v.days_left != null ? ` (${v.days_left} days left)` : ""}</span>
  </Link>
);

export function VideoBlock({ file, url }) {
  const emb = url ? videoEmbed(url) : null;
  if (file) return <video className="video" controls preload="metadata" src={file} />;
  if (emb) return <div className="video"><iframe src={emb} title="Video" allowFullScreen loading="lazy" /></div>;
  if (url) return <p><a href={url} target="_blank" rel="noreferrer">Watch the video</a></p>;
  return null;
}

export function OptionRow({ letter, text, state, onPick, name, checked }) {
  const Tag = onPick ? "label" : "div";
  return (
    <Tag className={"opt" + (onPick ? "" : " static") + (state ? " " + state : checked ? " sel" : "")}>
      {onPick && <input type="radio" className="sr" name={name} checked={checked} onChange={onPick} />}
      <span className="ob">{letter}</span><span className="ot">{text}</span>
    </Tag>
  );
}
