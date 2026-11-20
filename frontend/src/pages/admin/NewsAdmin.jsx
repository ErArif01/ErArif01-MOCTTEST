import { useEffect, useState } from "react";
import { api, fmtDate } from "../../api.js";
import CrudPage from "./CrudPage.jsx";
import { Badge } from "./shared.jsx";

export default function NewsAdmin() {
  const [cats, setCats] = useState(null);
  useEffect(() => { api("/admin/news-categories/").then(setCats).catch(() => setCats([])); }, []);
  if (!cats) return <p>Loading...</p>;
  const label = (k) => cats.find((c) => c.key === k)?.name || k;
  return (
    <CrudPage title="News and updates" endpoint="/admin/news" multipart
      hint="Add results, admit cards, form-filling guides or test solutions. Upload an image (max 5 MB) and a video (max 30 MB), or paste a YouTube link for longer videos."
      blank={{ title: "", category: cats[0]?.key || "news", summary: "", body: "", image: null, video: null, video_url: "", exam: "", is_pinned: false, is_published: true }}
      fields={[{ name: "title", label: "Title", required: true, wide: true },
        { name: "category", label: "Type", type: "select", required: true, options: cats.map((c) => ({ value: c.key, label: c.name })),
          addNew: { label: "+ Add new type...", placeholder: "New news type (e.g. Scholarship)", create: async (name) => { const c = await api("/admin/news-categories/", { method: "POST", body: { name } }); setCats((x) => [...x, c]); return { value: c.key, label: c.name }; } } },
        { name: "exam", label: "Link to exam (optional)", type: "examselect" },
        { name: "summary", label: "Short summary (shown on the card)", wide: true }, { name: "body", label: "Full text", type: "textarea", rows: 7, wide: true },
        { name: "image", label: "Image (jpg, png, webp)", type: "file", accept: "image/*", urlKey: "image_url" }, { name: "video", label: "Video file (mp4, webm)", type: "file", accept: "video/mp4,video/webm,video/quicktime", urlKey: "video_file_url" },
        { name: "video_url", label: "Or YouTube / video link", type: "url", wide: true }, { name: "is_pinned", label: "Pin on top", type: "checkbox" }, { name: "is_published", label: "Published", type: "checkbox" }]}
      columns={[{ label: "Title", render: (r) => <><b>{r.title}</b><div className="muted">{fmtDate(r.created_at)}</div></> }, { label: "Type", render: (r) => <Badge>{label(r.category)}</Badge> },
        { label: "Media", render: (r) => [r.image_url && "Image", (r.video_file_url || r.video_url) && "Video"].filter(Boolean).join(", ") || "-" },
        { label: "Status", render: (r) => <>{r.is_published ? <Badge kind="good">Live</Badge> : <Badge>Draft</Badge>} {r.is_pinned && <Badge>Pinned</Badge>}</> }]} />
  );
}
