import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { api } from "./api.js";
import { Login, Register, ForgotPassword } from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Instructions from "./pages/Instructions.jsx";
import Exam from "./pages/Exam.jsx";
import Result from "./pages/Result.jsx";
import Account from "./pages/Account.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import Overview from "./pages/admin/Overview.jsx";
import Users from "./pages/admin/Users.jsx";
import UserDetail from "./pages/admin/UserDetail.jsx";
import Attempts from "./pages/admin/Attempts.jsx";
import Tests from "./pages/admin/Tests.jsx";
import TestForm from "./pages/admin/TestForm.jsx";
import Questions from "./pages/admin/Questions.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const nav = useNavigate();
  const inExam = useLocation().pathname.startsWith("/exam");

  useEffect(() => {
    if (!localStorage.getItem("token")) { setReady(true); return; }
    api("/auth/me/").then(setUser).catch(() => localStorage.removeItem("token")).finally(() => setReady(true));
  }, []);

  const onAuth = (d) => { localStorage.setItem("token", d.token); setUser(d.user); nav("/"); };
  const logout = () => { localStorage.removeItem("token"); setUser(null); nav("/login"); };
  const guard = (el) => (user ? el : <Navigate to="/login" replace />);
  const admin = (el) => (user?.is_staff ? el : <Navigate to="/" replace />);
  if (!ready) return <p className="center">Loading...</p>;

  return (
    <>
      {user && !inExam && (
        <header className="nav">
          <Link to="/" className="brand">Mock Test Portal</Link>
          <nav className="navr">
            <NavLink to="/" end>Tests</NavLink>
            {user.is_staff && <NavLink to="/manage">Admin panel</NavLink>}
            <NavLink to="/account">{user.name || "Account"}</NavLink>
            <button onClick={logout}>Logout</button>
          </nav>
        </header>
      )}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onAuth={onAuth} />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register onAuth={onAuth} />} />
        <Route path="/forgot" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
        <Route path="/" element={guard(<Dashboard />)} />
        <Route path="/account" element={guard(<Account />)} />
        <Route path="/instructions/:testId" element={guard(<Instructions />)} />
        <Route path="/exam/:testId" element={guard(<Exam />)} />
        <Route path="/result/:id" element={guard(<Result />)} />
        <Route path="/manage" element={admin(<AdminLayout />)}>
          <Route index element={<Overview />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserDetail me={user} />} />
          <Route path="attempts" element={<Attempts />} />
          <Route path="attempts/:id" element={<Result admin />} />
          <Route path="tests" element={<Tests />} />
          <Route path="tests/new" element={<TestForm />} />
          <Route path="tests/:id" element={<TestForm />} />
          <Route path="questions" element={<Questions />} />
        </Route>
        <Route path="/admin-upload" element={<Navigate to="/manage/questions" replace />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
