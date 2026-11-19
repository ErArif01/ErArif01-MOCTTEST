import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { Tile } from "../ui.jsx";

const examTile = (e, c) => <Tile key={e.id} to={`/exams/${e.id}`} color={e.color || c.color} icon={e.icon} title={e.name} sub={e.description}
  meta={`${e.n_tests} tests \u2022 ${e.n_free} free \u2022 ${e.n_paid} paid`} />;

export default function Categories() {      // /exams (all categories) and /category/:id (one)
  const { id } = useParams();
  const [cats, setCats] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/categories/").then(setCats).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="err center">{err}</p>;
  if (!cats) return <p className="center">Loading...</p>;
  const list = id ? cats.filter((c) => String(c.id) === id) : cats;
  if (id && list.length === 0) return <p className="center">Category not found. <Link to="/exams">All exams</Link></p>;
  return (
    <div className="wrap wide">
      <h1>{id ? list[0].name : "Choose your exam"}</h1>
      {id && <p className="muted">{list[0].description} <Link to="/exams">&larr; All categories</Link></p>}
      {list.map((c) => (
        <section className="sect" key={c.id}>
          {!id && <div className="head"><h2>{c.icon} {c.name}</h2><Link className="more" to={`/category/${c.id}`}>Open &rarr;</Link></div>}
          {c.exams.length === 0 ? <p className="muted">No exams here yet.</p> : <div className="cards">{c.exams.map((e) => examTile(e, c))}</div>}
        </section>
      ))}
    </div>
  );
}
