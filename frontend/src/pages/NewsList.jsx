import { useEffect, useState } from "react";
import { api } from "../api.js";
import { NewsCard } from "../ui.jsx";
import { Pager } from "./admin/shared.jsx";

export default function NewsList() {
  const [d, setD] = useState(null);
  const [cat, setCat] = useState("");
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");
  useEffect(() => { api(`/news/?category=${cat}&page=${page}`).then(setD).catch((e) => setErr(e.message)); }, [cat, page]);
  return (
    <div className="wrap wide">
      <h1>Latest updates</h1>
      {d && <div className="tabs"><button className={cat === "" ? "on" : ""} onClick={() => { setCat(""); setPage(1); }}>All</button>
        {d.categories.map((c) => <button key={c.value} className={cat === c.value ? "on" : ""} onClick={() => { setCat(c.value); setPage(1); }}>{c.label}</button>)}</div>}
      {err && <p className="err">{err}</p>}
      {!d ? <p>Loading...</p> : d.results.length === 0 ? <p>Nothing here yet.</p> : <div className="cards">{d.results.map((n) => <NewsCard key={n.id} n={n} />)}</div>}
      <Pager meta={d} onPage={setPage} />
    </div>
  );
}
