import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { api } from "./api.js";
import { Login, Register, ForgotPassword } from "./pages/Auth.jsx";
import Home from "./pages/Home.jsx";
import Categories from "./pages/Categories.jsx";
import ExamPage from "./pages/ExamPage.jsx";
import Quizzes from "./pages/Quizzes.jsx";
import QuizPlay from "./pages/QuizPlay.jsx";
import NewsList from "./pages/NewsList.jsx";
import NewsDetail from "./pages/NewsDetail.jsx";
import { VacancyList, VacancyDetail } from "./pages/Vacancies.jsx";
import MyResults from "./pages/MyResults.jsx";
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
import Exams from "./pages/admin/Exams.jsx";
import VacanciesAdmin from "./pages/admin/VacanciesAdmin.jsx";
import NewsAdmin from "./pages/admin/NewsAdmin.jsx";
import QuizzesAdmin from "./pages/admin/QuizzesAdmin.jsx";
import Payments from "./pages/admin/Payments.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const inExam = loc.pathname.startsWith("/take");

  useEffect(() => {
    if (!localStorage.getItem("token")) { setReady(true); return; }
    api("/auth/me/").then(setUser).catch(() => localStorage.removeItem("token")).finally(() => setReady(true));
  }, []);

  const onAuth = (d) => {
    localStorage.setItem("token", d.token); setUser(d.user);
    const next = sessionStorage.getItem("next"); sessionStorage.removeItem("next");
    nav(next || "/");
  };
  const logout = () => { localStorage.removeItem("token"); setUser(null); nav("/login"); };
  const guard = (el) => {
    if (user) return el;
    sessionStorage.setItem("next", loc.pathname + loc.search);
    return <Navigate to="/login" replace />;
  };
  const admin = (el) => (user?.is_staff ? el : <Navigate to="/" replace />);
  if (!ready) return <p className="center">Loading...</p>;

  return (
    <>
      {!inExam && (
        <header className="nav">
          <Link to="/" className="brand">Exam Crack Study Point</Link>
          <nav className="navr" aria-label="Main">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/exams">Exams</NavLink>
            <NavLink to="/quizzes">Quizzes</NavLink>
            <NavLink to="/news">Updates</NavLink>
            <NavLink to="/vacancies">Vacancies</NavLink>
            {user ? (
              <>
                <NavLink to="/my">My results</NavLink>
                {user.is_staff && <NavLink to="/manage">Admin</NavLink>}
                <NavLink to="/account">{user.name || "Account"}</NavLink>
                <button onClick={logout}>Logout</button>
              </>
            ) : (
              <><NavLink to="/login">Login</NavLink><Link className="btn navbtn" to="/register">Register</Link></>
            )}
          </nav>
        </header>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/exams" element={<Categories />} />
        <Route path="/category/:id" element={<Categories />} />
        <Route path="/exams/:id" element={<ExamPage />} />
        <Route path="/quizzes" element={<Quizzes />} />
        <Route path="/quiz/:id" element={guard(<QuizPlay />)} />
        <Route path="/news" element={<NewsList />} />
        <Route path="/news/:id" element={<NewsDetail />} />
        <Route path="/vacancies" element={<VacancyList />} />
        <Route path="/vacancies/:id" element={<VacancyDetail />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onAuth={onAuth} />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register onAuth={onAuth} />} />
        <Route path="/forgot" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
        <Route path="/my" element={guard(<MyResults />)} />
        <Route path="/account" element={guard(<Account />)} />
        <Route path="/instructions/:testId" element={guard(<Instructions />)} />
        <Route path="/take/:testId" element={guard(<Exam />)} />
        <Route path="/result/:id" element={guard(<Result />)} />
        <Route path="/manage" element={admin(<AdminLayout />)}>
          <Route index element={<Overview />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserDetail me={user} />} />
          <Route path="attempts" element={<Attempts />} />
          <Route path="attempts/:id" element={<Result admin />} />
          <Route path="exams" element={<Exams />} />
          <Route path="tests" element={<Tests />} />
          <Route path="tests/new" element={<TestForm />} />
          <Route path="tests/:id" element={<TestForm />} />
          <Route path="questions" element={<Questions />} />
          <Route path="quizzes" element={<QuizzesAdmin />} />
          <Route path="news" element={<NewsAdmin />} />
          <Route path="vacancies" element={<VacanciesAdmin />} />
          <Route path="payments" element={<Payments />} />
        </Route>
        <Route path="/admin-upload" element={<Navigate to="/manage/questions" replace />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
