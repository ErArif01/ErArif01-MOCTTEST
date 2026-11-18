import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import { api } from "./api.js";
import { Login, Register } from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Instructions from "./pages/Instructions.jsx";
import Exam from "./pages/Exam.jsx";
import Result from "./pages/Result.jsx";
import Upload from "./pages/Upload.jsx";

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
  if (!ready) return <p className="center">Loading...</p>;

  return (
    <>
      {user && !inExam && (
        <header className="nav">
          <Link to="/" className="brand">Mock Test Portal</Link>
          <span className="navr">
            <span>{user.name}</span>
            {user.is_staff && <Link to="/admin-upload">Upload questions</Link>}
            {user.is_staff && <a href="/admin/">Admin panel</a>}
            <button onClick={logout}>Logout</button>
          </span>
        </header>
      )}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onAuth={onAuth} />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register onAuth={onAuth} />} />
        <Route path="/" element={guard(<Dashboard />)} />
        <Route path="/instructions/:testId" element={guard(<Instructions />)} />
        <Route path="/exam/:testId" element={guard(<Exam />)} />
        <Route path="/result/:id" element={guard(<Result />)} />
        <Route path="/admin-upload" element={guard(<Upload user={user} />)} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
