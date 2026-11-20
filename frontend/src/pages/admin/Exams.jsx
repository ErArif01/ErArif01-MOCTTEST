import { useEffect, useState } from "react";
import { api } from "../../api.js";
import CrudPage from "./CrudPage.jsx";
import { Badge } from "./shared.jsx";

const dot = (c) => <span className="dot" style={{ background: c || "#999" }} />;

export default function Exams() {
  const [cats, setCats] = useState(null);
  useEffect(() => { api("/admin/categories/").then(setCats).catch(() => setCats([])); }, []);
  return (
    <>
      <CrudPage title="1. Categories (home page cards)" endpoint="/admin/categories"
        hint="Big cards on the home page, like Railways, SSC, Banking, UPSSSC. Use an emoji as the icon."
        blank={{ name: "", icon: "\uD83D\uDCDA", color: "#0b4f8a", description: "", order: 0, is_active: true }}
        fields={[{ name: "name", label: "Name", required: true }, { name: "icon", label: "Icon (emoji)" }, { name: "color", label: "Card colour", type: "color" },
          { name: "order", label: "Order (small = first)", type: "number" }, { name: "description", label: "Short description", wide: true }, { name: "is_active", label: "Visible", type: "checkbox" }]}
        columns={[{ label: "Category", render: (r) => <>{dot(r.color)} {r.icon} <b>{r.name}</b></> }, { label: "Exams", render: (r) => r.n_exams },
          { label: "Order", render: (r) => r.order }, { label: "Status", render: (r) => (r.is_active ? <Badge kind="good">Visible</Badge> : <Badge>Hidden</Badge>) }]} />
      {cats && (
        <CrudPage key={cats.length} title="2. Exams / vacancies (cards inside a category)" endpoint="/admin/exams"
          hint="One card per post, for example RRB ALP, RRB Group D, SSC CGL. Every exam has its own question bank, tests and syllabus."
          blank={{ category: "", name: "", icon: "\uD83C\uDFAF", color: "", description: "", syllabus: "", order: 0, is_active: true }}
          fields={[{ name: "category", label: "Category", type: "select", required: true, options: cats.map((c) => ({ value: c.id, label: c.name })),
              addNew: { label: "+ Add new category...", placeholder: "New category name (e.g. Banking)", create: async (name) => { const c = await api("/admin/categories/", { method: "POST", body: { name, icon: "\uD83D\uDCDA", color: "#0b4f8a", order: 0, is_active: true } }); return { value: c.id, label: c.name }; } } },
            { name: "name", label: "Exam name", required: true }, { name: "icon", label: "Icon (emoji)" }, { name: "color", label: "Colour (optional, e.g. #c0392b)", placeholder: "uses category colour" },
            { name: "order", label: "Order", type: "number" }, { name: "description", label: "Short description", wide: true },
            { name: "syllabus", label: "Syllabus (one topic per line)", type: "textarea", rows: 6, wide: true }, { name: "is_active", label: "Visible", type: "checkbox" }]}
          columns={[{ label: "Exam", render: (r) => <>{r.icon} <b>{r.name}</b><div className="muted">{r.category_name}</div></> }, { label: "Questions", render: (r) => r.n_questions },
            { label: "Tests", render: (r) => r.n_tests }, { label: "Status", render: (r) => (r.is_active ? <Badge kind="good">Visible</Badge> : <Badge>Hidden</Badge>) }]} />
      )}
    </>
  );
}
