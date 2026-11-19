import { api } from "./api.js";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`) && window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error("Could not load the payment window. Check your internet."));
    document.body.appendChild(s);
  });
}

/** Opens Razorpay checkout for a paid test. Resolves true when paid, false when the user closes the window. */
export async function buyTest(test) {
  const cfg = await api("/config/");
  if (!cfg.payments_enabled) throw new Error("Online payments are not enabled yet. Please contact the admin.");
  await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  const o = await api("/payments/create-order/", { method: "POST", body: { test_id: test.id } });
  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay({
      key: o.key_id, amount: o.amount, currency: o.currency, order_id: o.order_id,
      name: "Exam Crack Study Point", description: o.test_name,
      prefill: { name: o.user.name, email: o.user.email }, theme: { color: "#0b4f8a" },
      handler: async (r) => {
        try { await api("/payments/verify/", { method: "POST", body: r }); resolve(true); } catch (e) { reject(e); }
      },
      modal: { ondismiss: () => resolve(false) },
    });
    rz.open();
  });
}
