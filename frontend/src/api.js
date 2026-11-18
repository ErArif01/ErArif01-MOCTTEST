export async function api(path, { method = "GET", body, form } = {}) {
  const headers = {};
  const t = localStorage.getItem("token");
  if (t) headers.Authorization = "Token " + t;
  let payload;
  if (form) payload = form;
  else if (body) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  const r = await fetch("/api" + path, { method, headers, body: payload });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && t) localStorage.removeItem("token");
    throw new Error(d.error || d.detail || "Request failed (" + r.status + ")");
  }
  return d;
}
export const fmtTime = (s) => {
  s = Math.max(0, s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return [h, m, x].map((n) => String(n).padStart(2, "0")).join(":");
};
