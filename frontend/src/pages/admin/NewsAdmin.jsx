import { useEffect, useState } from "react";
import { api, fmtDate } from "../../api.js";
import CrudPage from "./CrudPage.jsx";
import { Badge } from "./shared.jsx";

const CATS = [["news", "Latest news"], ["result", "Result"], ["admit_card", "Admit card"], ["answer_key", "Answer key"], ["form_guide", "How to fill form"], ["solution", "Test solution"], ["syllabus", "Syllabus"], ["job", "Job alert"]];

export default function NewsAdmin() {
  const [exams, setExams] = useState(null);
  useEffect(() => { api("/admin/exams/").then(setExams).catch(() => setExams([])); }, []);
  if (!exams) return <p>Loading...</p>;
  return (
    <CrudPage title="News and updates" endpoint="/admin/news" multipart
      hint="Add results, admit cards, form-filling guides or test solutions. Upload an image (max 5 MB) and a video (max 30 MB), or paste a YouTube link for longer videos."
      blank={{ title: "", category: "news", summary: "", body: "", image: null, video: null, video_url: "", exam: "", is_pinned: false, is_published: true }}
      fields={[{ name: "title", label: "Title", required: true, wide: true }, { name: "category", label: "Type", type: "select", required: true, options: CATS.map(([value, label]) => ({ value, label })) },
        { name: "exam", label: "Link to exam (optional)", type: "select", options: exams.map((e) => ({ value: e.id, label: `${e.category_name} / ${e.name}` })) },
        { name: "summary", label: "Short summary (shown on the card)", wide: true }, { name: "body", label: "Full text", type: "textarea", rows: 7, wide: true },
        { name: "image", label: "Image (jpg, png, webp)", type: "file", accept: "image/*", urlKey: "image_url" }, { name: "video", label: "Video file (mp4, webm)", type: "file", accept: "video/mp4,video/webm,video/quicktime", urlKey: "video_file_url" },
        { name: "video_url", label: "Or YouTube / video link", type: "url", wide: true }, { name: "is_pinned", label: "Pin on top", type: "checkbox" }, { name: "is_published", label: "Published", type: "checkbox" }]}
      columns={[{ label: "Title", render: (r) => <><b>{r.title}</b><div className="muted">{fmtDate(r.created_at)}</div></> }, { label: "Type", render: (r) => <Badge>{CATS.find((c) => c[0] === r.category)?.[1]}</Badge> },
        { label: "Media", render: (r) => [r.image_url && "Image", (r.video_file_url || r.video_url) && "Video"].filter(Boolean).join(", ") || "-" },
        { label: "Status", render: (r) => <>{r.is_published ? <Badge kind="good">Live</Badge> : <Badge>Draft</Badge>} {r.is_pinned && <Badge>Pinned</Badge>}</> }]} />
  );
}
