import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="wrap wide">
      <h1>Admin panel</h1>
      <nav className="subnav" aria-label="Admin sections">
        <NavLink to="/manage" end>Overview</NavLink>
        <NavLink to="/manage/users">Users</NavLink>
        <NavLink to="/manage/attempts">Results</NavLink>
        <NavLink to="/manage/tests">Tests</NavLink>
        <NavLink to="/manage/questions">Questions</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
