import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export function Login({ onAuth }) {
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { onAuth(await api("/auth/login/", { method: "POST", body: f })); }
    catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <form className="card auth" onSubmit={go}>
      <h1>Login to Exam Crack Study Point</h1>
      <label>Email or username<input type="text" required autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <label>Password<input type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="pri" disabled={busy}>{busy ? "Please wait..." : "Login"}</button>
      <p className="links"><Link to="/forgot">Forgot password?</Link><span>New here? <Link to="/register">Create an account</Link></span></p>
    </form>
  );
}

export function Register({ onAuth }) {
  const [f, setF] = useState({ name: "", email: "", password: "", otp: "" });
  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const sendOtp = async (e) => {
    e?.preventDefault(); setErr(""); setMsg(""); setBusy(true);
    try {
      if (f.password.length < 8) throw new Error("Password must be at least 8 characters.");
      const r = await api("/auth/send-otp/", { method: "POST", body: { email: f.email } });
      setMsg(r.message); setStep(2);
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const verify = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { onAuth(await api("/auth/register/", { method: "POST", body: f })); }
    catch (x) { setErr(x.message); setBusy(false); }
  };

  return step === 1 ? (
    <form className="card auth" onSubmit={sendOtp}>
      <h1>Register</h1>
      <label>Full name<input required autoComplete="name" value={f.name} onChange={set("name")} /></label>
      <label>Email<input type="email" required autoComplete="email" value={f.email} onChange={set("email")} /></label>
      <label>Password (min 8 characters)<input type="password" required autoComplete="new-password" value={f.password} onChange={set("password")} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="pri" disabled={busy}>{busy ? "Sending OTP..." : "Send OTP"}</button>
      <p className="links"><span>Already registered? <Link to="/login">Login</Link></span></p>
    </form>
  ) : (
    <form className="card auth" onSubmit={verify}>
      <h1>Verify email</h1>
      <p>{msg} Check <b>{f.email}</b> (also the spam folder).</p>
      <label>6-digit OTP<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={f.otp} onChange={set("otp")} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="pri" disabled={busy}>Verify and create account</button>
      <button type="button" onClick={sendOtp} disabled={busy}>Resend OTP</button>
      <button type="button" onClick={() => setStep(1)}>Change email</button>
    </form>
  );
}

export function ForgotPassword() {
  const [f, setF] = useState({ email: "", otp: "", new_password: "", confirm: "" });
  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const sendOtp = async (e) => {
    e?.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = await api("/auth/forgot-password/", { method: "POST", body: { email: f.email } });
      setMsg(r.message); setStep(2);
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const reset = async (e) => {
    e.preventDefault(); setErr("");
    if (f.new_password !== f.confirm) { setErr("Passwords do not match."); return; }
    setBusy(true);
    try {
      const r = await api("/auth/reset-password/", { method: "POST", body: { email: f.email, otp: f.otp, new_password: f.new_password } });
      setMsg(r.message); setStep(3);
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };

  if (step === 3) return (
    <div className="card auth"><h1>Password updated</h1><p>{msg}</p><Link className="btn pri" to="/login">Go to login</Link></div>
  );
  return step === 1 ? (
    <form className="card auth" onSubmit={sendOtp}>
      <h1>Forgot password</h1>
      <p className="muted">Enter your registered email. We will send a 6-digit OTP to it.</p>
      <label>Email<input type="email" required autoComplete="email" value={f.email} onChange={set("email")} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="pri" disabled={busy}>{busy ? "Sending OTP..." : "Send OTP"}</button>
      <p className="links"><Link to="/login">Back to login</Link></p>
    </form>
  ) : (
    <form className="card auth" onSubmit={reset}>
      <h1>Reset password</h1>
      <p>{msg} Check <b>{f.email}</b> (also the spam folder).</p>
      <label>6-digit OTP<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={f.otp} onChange={set("otp")} /></label>
      <label>New password (min 8 characters)<input type="password" required autoComplete="new-password" value={f.new_password} onChange={set("new_password")} /></label>
      <label>Confirm new password<input type="password" required autoComplete="new-password" value={f.confirm} onChange={set("confirm")} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="pri" disabled={busy}>Reset password</button>
      <button type="button" onClick={sendOtp} disabled={busy}>Resend OTP</button>
    </form>
  );
}
