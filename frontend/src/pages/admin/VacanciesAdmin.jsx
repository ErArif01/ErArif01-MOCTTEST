import { useEffect, useState } from "react";
import { api } from "../../api.js";
import CrudPage from "./CrudPage.jsx";
import { Badge } from "./shared.jsx";

export default function VacanciesAdmin() {
  const [exams, setExams] = useState(null);
  useEffect(() => { api("/admin/exams/").then(setExams).catch(() => setExams([])); }, []);
  if (!exams) return <p>Loading...</p>;
  return (
    <CrudPage title="Government vacancies" endpoint="/admin/vacancies"
      hint="Shown on the home page and the Vacancies page. Add post-wise vacancies, dates and qualification."
      blank={{ title: "", organization: "", total_posts: "", start_date: "", last_date: "", qualification: "", age_limit: "", fee: "", description: "", posts: [], notification_url: "", apply_url: "", exam: "", is_active: true }}
      fields={[{ name: "title", label: "Title (e.g. RRB ALP 2026)", required: true, wide: true }, { name: "organization", label: "Organization" }, { name: "total_posts", label: "Total vacancies", type: "number" },
        { name: "start_date", label: "Start date", type: "date" }, { name: "last_date", label: "Last date", type: "date" },
        { name: "qualification", label: "Qualification required", type: "textarea", rows: 3, wide: true }, { name: "age_limit", label: "Age limit" }, { name: "fee", label: "Application fee" },
        { name: "posts", label: "Post-wise vacancies", type: "rows", wide: true, sub: [{ name: "name", label: "Post name" }, { name: "count", label: "Vacancies" }, { name: "qualification", label: "Qualification" }] },
        { name: "description", label: "Details", type: "textarea", rows: 4, wide: true }, { name: "notification_url", label: "Notification link", type: "url" }, { name: "apply_url", label: "Apply link", type: "url" },
        { name: "exam", label: "Link to exam (Practice button)", type: "select", options: exams.map((e) => ({ value: e.id, label: `${e.category_name} / ${e.name}` })) },
        { name: "is_active", label: "Visible", type: "checkbox" }]}
      columns={[{ label: "Vacancy", render: (r) => <><b>{r.title}</b><div className="muted">{r.organization}</div></> }, { label: "Posts", render: (r) => r.total_posts ?? "-" },
        { label: "Last date", render: (r) => r.last_date || "-" }, { label: "Status", render: (r) => (r.is_active ? <Badge kind="good">Visible</Badge> : <Badge>Hidden</Badge>) }]} />
  );
}
