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
    if (r.status === 401 && t) {          // token expired, or the admin blocked this user
      localStorage.removeItem("token");
      if (!location.pathname.startsWith("/login")) location.assign("/login");
    }
    const flat = (x) => (x && typeof x === "object" ? Object.entries(x).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`).join(" | ") : "");
    throw new Error(d.error || d.detail || flat(d) || "Request failed (" + r.status + ")");
  }
  return d;
}
export const fmtTime = (s) => {
  s = Math.max(0, s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return [h, m, x].map((n) => String(n).padStart(2, "0")).join(":");
};
export const fmtDate = (d) => (d ? new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "-");
export const rupee = (n) => "\u20B9" + Number(n).toLocaleString("en-IN");
export const pctText = (p) => (p == null ? "-" : p + "%");
export function videoEmbed(url) {            // YouTube link -> embeddable url (otherwise null)
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return "https://www.youtube.com/embed/" + u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v") || (u.pathname.startsWith("/embed/") || u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2] : "");
      return id ? "https://www.youtube.com/embed/" + id : null;
    }
  } catch { /* not a url */ }
  return null;
}

const csvCell = (v) => { v = v == null ? "" : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
export const toCsv = (cols, rows) => [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\r\n");
export function downloadText(filename, text) {          // UTF-8 with BOM so Excel shows Hindi correctly
  const url = URL.createObjectURL(new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
