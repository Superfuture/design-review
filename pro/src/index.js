/**
 * design-review-pro — license gating + server-side value.
 *
 * Why this makes "Pro" enforceable: the skill files are public/copyable, so you
 * can't gate by hiding rubric text. Instead the PAID VALUE happens here, on the
 * server, behind a license check:
 *   • GET  /verify?key=...     → is this license valid?  (the gating primitive)
 *   • POST /report             → generates a deep design report via the Claude API
 *                                 — requires a valid key (header: X-License-Key)
 *   • POST /webhook            → your store (Gumroad/Stripe) calls this on purchase
 *                                 to issue a license key (header: X-Webhook-Secret)
 *
 * Bindings (wrangler.toml):
 *   KV  LICENSES                      license store
 *   secret WEBHOOK_SECRET             shared secret your store sends
 *   secret ANTHROPIC_API_KEY          (optional) enables /report
 */

const json = (status, obj) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

async function getLicense(env, key) {
  if (!key) return null;
  const raw = await env.LICENSES.get(`lic:${key}`);
  return raw ? JSON.parse(raw) : null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-License-Key, X-Webhook-Secret",
        },
      });
    }

    // ── Info ────────────────────────────────────────────────────────────────
    if (path === "/" && request.method === "GET") {
      return json(200, {
        service: "design-review-pro",
        endpoints: ["/verify?key=", "POST /report", "POST /webhook"],
      });
    }

    // ── Verify a license (the core gate) ─────────────────────────────────────
    if (path === "/verify" && request.method === "GET") {
      const lic = await getLicense(env, url.searchParams.get("key"));
      if (lic?.active) return json(200, { valid: true, tier: lic.tier, email: lic.email });
      return json(200, { valid: false });
    }

    // ── Waitlist signup (painted-door: Pro/Team buttons collect emails) ──────
    if (path === "/waitlist" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json(400, { error: "Invalid JSON" }); }
      if (String(body.company_url || "").trim()) return json(200, { ok: true }); // honeypot
      const email = String(body.email || "").trim().slice(0, 200);
      const tier = String(body.tier || "").trim().slice(0, 40);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: "Invalid email" });
      await env.LICENSES.put(
        `waitlist:${Date.now()}:${email}`,
        JSON.stringify({ email, tier, ts: new Date().toISOString() })
      );
      return json(200, { ok: true });
    }

    // ── Issue a license (called by your store webhook) ───────────────────────
    if (path === "/webhook" && request.method === "POST") {
      if (request.headers.get("X-Webhook-Secret") !== env.WEBHOOK_SECRET) {
        return json(401, { error: "Bad webhook secret" });
      }
      let body;
      try { body = await request.json(); } catch { return json(400, { error: "Invalid JSON" }); }
      // Map your store's payload → a license. (Gumroad: body.email, body.product_permalink, etc.)
      const email = String(body.email || "").trim();
      const tier = String(body.tier || "pro").trim();
      if (!email) return json(400, { error: "Missing email" });
      const key = `dr_${crypto.randomUUID().replace(/-/g, "")}`;
      await env.LICENSES.put(`lic:${key}`, JSON.stringify({
        email, tier, active: true, created: new Date().toISOString(),
      }));
      // In production, email the key to the buyer (e.g. via Resend / Email Workers).
      return json(200, { ok: true, key });
    }

    // ── Deep report (the paid value; requires a valid key) ───────────────────
    if (path === "/report" && request.method === "POST") {
      const lic = await getLicense(env, request.headers.get("X-License-Key"));
      if (!lic?.active) return json(402, { error: "Valid license required" });
      if (!env.ANTHROPIC_API_KEY) {
        return json(503, { error: "Report service not configured (set ANTHROPIC_API_KEY)" });
      }
      let body;
      try { body = await request.json(); } catch { return json(400, { error: "Invalid JSON" }); }
      const notes = String(body.notes || "").slice(0, 12000);

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-7",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: `You are a senior product design lead. Produce a detailed, prioritized design `
              + `critique (blocking → important → polish), with specific fixes and exact values, for `
              + `the following UI:\n\n${notes}`,
          }],
        }),
      });
      if (!res.ok) return json(502, { error: "Upstream error", status: res.status });
      const data = await res.json();
      return json(200, { report: data.content?.[0]?.text ?? "", tier: lic.tier });
    }

    return json(404, { error: "Not found" });
  },
};
