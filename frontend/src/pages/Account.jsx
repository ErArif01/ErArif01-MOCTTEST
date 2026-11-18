import { useState } from "react";
import { api } from "../api.js";

export default function Account() {
  const [f, setF] = useState({ current_password: "", new_password: "", confirm: "" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault(); setErr(""); setOk("");
    if (f.new_password !== f.confirm) { setErr("New passwords do not match."); return; }
    setBusy(true);
    try {
      const r = await api("/auth/change-password/", { method: "POST", body: { current_password: f.current_password, new_password: f.new_password } });
      localStorage.setItem("token", r.token);        // other devices are logged out, this one stays logged in
      setOk("Password changed. Other devices have been logged out.");
      setF({ current_password: "", new_password: "", confirm: "" });
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <div className="wrap">
      <form className="card auth" onSubmit={save}>
        <h1>Change password</h1>
        <p className="muted">You are logged in, so no OTP is needed. Just enter your current password.</p>
        <label>Current password<input type="password" required autoComplete="current-password" value={f.current_password} onChange={set("current_password")} /></label>
        <label>New password (min 8 characters)<input type="password" required autoComplete="new-password" value={f.new_password} onChange={set("new_password")} /></label>
        <label>Confirm new password<input type="password" required autoComplete="new-password" value={f.confirm} onChange={set("confirm")} /></label>
        {err && <p className="err" role="alert">{err}</p>}
        {ok && <p className="okmsg" role="status">{ok}</p>}
        <button className="pri" disabled={busy}>{busy ? "Saving..." : "Change password"}</button>
      </form>
    </div>
  );
}
