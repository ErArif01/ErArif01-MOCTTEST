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
      <h1>Login</h1>
      <label>Email<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <label>Password<input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
      {err && <p className="err">{err}</p>}
      <button className="pri" disabled={busy}>{busy ? "Please wait..." : "Login"}</button>
      <p>New here? <Link to="/register">Create an account</Link></p>
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
      <label>Full name<input required value={f.name} onChange={set("name")} /></label>
      <label>Email<input type="email" required value={f.email} onChange={set("email")} /></label>
      <label>Password (min 8 characters)<input type="password" required value={f.password} onChange={set("password")} /></label>
      {err && <p className="err">{err}</p>}
      <button className="pri" disabled={busy}>{busy ? "Sending OTP..." : "Send OTP"}</button>
      <p>Already registered? <Link to="/login">Login</Link></p>
    </form>
  ) : (
    <form className="card auth" onSubmit={verify}>
      <h1>Verify email</h1>
      <p>{msg} Check <b>{f.email}</b> (also the spam folder).</p>
      <label>6-digit OTP<input inputMode="numeric" maxLength={6} required value={f.otp} onChange={set("otp")} /></label>
      {err && <p className="err">{err}</p>}
      <button className="pri" disabled={busy}>Verify and create account</button>
      <button type="button" onClick={sendOtp} disabled={busy}>Resend OTP</button>
      <button type="button" onClick={() => setStep(1)}>Change email</button>
    </form>
  );
}
