import { NavLink, Outlet } from "react-router-dom";

const TABS = [["", "Overview"], ["users", "Users"], ["attempts", "Results"], ["exams", "Exams"], ["tests", "Tests"], ["questions", "Questions"],
  ["quizzes", "Quizzes"], ["news", "News"], ["vacancies", "Vacancies"], ["payments", "Payments"]];

export default function AdminLayout() {
  return (
    <div className="wrap wide">
      <h1>Admin panel</h1>
      <nav className="subnav" aria-label="Admin sections">
        {TABS.map(([p, l]) => <NavLink key={p} to={"/manage" + (p ? "/" + p : "")} end={p === ""}>{l}</NavLink>)}
      </nav>
      <Outlet />
    </div>
  );
}
