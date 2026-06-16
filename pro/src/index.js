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
 *   send_email EMAIL                  emails waitlist signups to you
 *   secret WEBHOOK_SECRET             shared secret your store sends
 *   secret ANTHROPIC_API_KEY          (optional) enables /report
 */

import { EmailMessage } from "cloudflare:email";

// Base64 of a UTF-8 string for RFC 2047 Subject encoding (no legacy globals).
function b64utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// Notify the owner of a new waitlist signup. Best-effort: never blocks the response.
async function notify(env, { email, tier }) {
  if (!env.EMAIL || !env.FROM_ADDRESS || !env.TO_ADDRESS) return;
  const subject = `Waitlist signup — ${tier || "Pro"}`;
  const body = [
    "New design-review waitlist signup:",
    "",
    `Email: ${email}`,
    `Tier:  ${tier || "Pro"}`,
    `Time:  ${new Date().toISOString()}`,
  ].join("\n");
  const raw = [
    `From: design-review <${env.FROM_ADDRESS}>`,
    `To: ${env.TO_ADDRESS}`,
    `Reply-To: ${email}`,
    `Subject: =?UTF-8?B?${b64utf8(subject)}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "",
    body,
  ].join("\r\n");
  try {
    await env.EMAIL.send(new EmailMessage(env.FROM_ADDRESS, env.TO_ADDRESS, raw));
  } catch (_) { /* don't fail the signup if email send hiccups */ }
}

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

// ── Stripe helpers ──────────────────────────────────────────────────────────
const STRIPE_API = "https://api.stripe.com/v1";
function stripeHeaders(env) {
  return {
    Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}
async function stripeGet(env, p) {
  const r = await fetch(`${STRIPE_API}${p}`, { headers: stripeHeaders(env) });
  return r.json();
}
async function stripePost(env, p, params) {
  const r = await fetch(`${STRIPE_API}${p}`, {
    method: "POST",
    headers: stripeHeaders(env),
    body: new URLSearchParams(params).toString(),
  });
  return r.json();
}
// One license key per Stripe Checkout session, idempotent (safe to call from both
// the success-page claim and the webhook backstop).
async function mintKeyForSession(env, sessionId, email, tier = "pro") {
  const existing = await env.LICENSES.get(`sess:${sessionId}`);
  if (existing) return existing;
  const key = `dr_${crypto.randomUUID().replace(/-/g, "")}`;
  await env.LICENSES.put(`lic:${key}`, JSON.stringify({
    email, tier, active: true, created: new Date().toISOString(), session: sessionId,
  }));
  await env.LICENSES.put(`sess:${sessionId}`, key);
  return key;
}
// Verify a Stripe webhook signature: HMAC-SHA256 over `${t}.${payload}`.
async function stripeSigValid(secret, payload, sigHeader) {
  if (!secret || !sigHeader) return false;
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => kv.split("=").map((s) => s.trim()))
  );
  if (!parts.t || !parts.v1) return false;
  const enc = new TextEncoder();
  const ck = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", ck, enc.encode(`${parts.t}.${payload}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
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
        endpoints: ["/verify?key=", "GET /buy", "GET /claim?session_id=", "POST /webhook", "POST /report"],
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
      await notify(env, { email, tier });
      return json(200, { ok: true });
    }

    // ── Start Stripe checkout ────────────────────────────────────────────────
    // Landing "Get Pro" links here. Creates a one-time Checkout Session and
    // redirects to Stripe's hosted page. On success Stripe sends the buyer to
    // <LANDING>/activate.html?session_id=... where the key is shown.
    if (path === "/buy" && request.method === "GET") {
      if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
        return json(503, { error: "Checkout not configured yet" });
      }
      const landing = env.LANDING_URL || "https://crit.officialjp.com";
      const session = await stripePost(env, "/checkout/sessions", {
        mode: "payment",
        "line_items[0][price]": env.STRIPE_PRICE_ID,
        "line_items[0][quantity]": "1",
        allow_promotion_codes: "true",
        success_url: `${landing}/activate.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${landing}/#pricing`,
      });
      if (!session.url) {
        return json(502, { error: "Stripe session failed", detail: session.error?.message });
      }
      return Response.redirect(session.url, 303);
    }

    // ── Claim the key after payment (called by activate.html) ────────────────
    if (path === "/claim" && request.method === "GET") {
      const sid = url.searchParams.get("session_id");
      if (!sid) return json(400, { error: "Missing session_id" });
      if (!env.STRIPE_SECRET_KEY) return json(503, { error: "Checkout not configured yet" });
      const session = await stripeGet(env, `/checkout/sessions/${encodeURIComponent(sid)}`);
      if (session.error) return json(502, { error: "Could not look up that session" });
      if (session.payment_status !== "paid") return json(402, { error: "Payment not complete" });
      const email = session.customer_details?.email || session.customer_email || "";
      const key = await mintKeyForSession(env, sid, email);
      return json(200, { ok: true, key, email });
    }

    // ── Stripe webhook (backstop: mint the key even if the buyer closes the tab)
    if (path === "/webhook" && request.method === "POST") {
      const payload = await request.text();
      const valid = await stripeSigValid(
        env.STRIPE_WEBHOOK_SECRET, payload, request.headers.get("Stripe-Signature")
      );
      if (!valid) return json(401, { error: "Bad signature" });
      let event;
      try { event = JSON.parse(payload); } catch { return json(400, { error: "Invalid JSON" }); }
      if (event.type === "checkout.session.completed") {
        const s = event.data.object;
        if (s.payment_status === "paid") {
          const email = s.customer_details?.email || s.customer_email || "";
          await mintKeyForSession(env, s.id, email);
        }
      }
      return json(200, { received: true });
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
      const notes = String(body.notes || "").slice(0, 16000);
      const target = String(body.target || "a UI").slice(0, 200);
      if (!notes) return json(400, { error: "Missing notes (the UI to review)" });

      // The PRO rubric lives only here, server-side. This is the paid moat:
      // depth that is not in the public skill files.
      const SYS = `You are a senior product design lead running a PRO-tier critique. `
        + `Review across all ten craft dimensions: visual hierarchy & layout; typography; spacing & rhythm; `
        + `color & contrast (do the WCAG AA math, give ratios); motion; component states (hover/focus/active/disabled, loading/empty/error); `
        + `accessibility (semantics, labels, keyboard, reduced-motion); responsiveness (320 to 1440+); content & copy; consistency & brand. `
        + `Then add PRO depth the free tier does not cover:\n`
        + `- Mobile & SwiftUI patterns: safe-area insets, Dynamic Type, tap targets >= 44pt, native vs custom controls, haptics, list/scroll behavior.\n`
        + `- Brand-token consistency: are colors, spacing, radii, shadows and type drawn from a single coherent token set? Flag every one-off value with the token it should use.\n\n`
        + `Rank findings blocking -> important -> polish. For each: What (quote the element), Why (one line), Fix (exact value, not "increase spacing"). `
        + `End with "Strengths" (2-4) and the single highest-leverage change to make first. Be specific and concise. Do not use em dashes.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 3200,
          system: SYS,
          messages: [{
            role: "user",
            content: `Target: ${target}\n\nUI to review (code, URL, and/or observations):\n\n${notes}\n\nReturn the full Pro critique.`,
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
