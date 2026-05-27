# design-review-pro

The server-backed Pro tier. This is what makes charging **enforceable** — the skill files are public
and copyable, so the paywall can't live in them. Instead the license check and the paid value live
here, on a Cloudflare Worker you control.

```
buyer pays (Gumroad/Stripe) → store webhook → POST /webhook → license key issued (KV)
buyer uses Pro feature      → skill calls /report with X-License-Key → gated by /verify
```

## Endpoints
- `GET /verify?key=KEY` → `{ valid, tier, email }` — the gate.
- `POST /report` (header `X-License-Key`) → generates a deep design report via the Claude API. Requires a valid key **and** `ANTHROPIC_API_KEY`.
- `POST /webhook` (header `X-Webhook-Secret`) → your store calls this on purchase to issue a key.

## Deploy
```bash
cd pro
npx wrangler kv namespace create LICENSES     # paste the id into wrangler.toml
npx wrangler secret put WEBHOOK_SECRET         # any long random string
npx wrangler secret put ANTHROPIC_API_KEY      # optional, enables /report
npx wrangler deploy
```

## Connect a store (Gumroad example)
1. Create the product on Gumroad (one-time or subscription).
2. Gumroad → Settings → Advanced → **Ping/Webhook URL** → `https://design-review-pro.<account>.workers.dev/webhook`
   (send your `X-Webhook-Secret` — or verify Gumroad's `seller_id`).
3. On purchase, `/webhook` mints a license key in KV. Email it to the buyer (wire Resend/Email Workers).
4. The buyer sets it locally (`export DESIGN_REVIEW_KEY=...`); the skill's Pro path calls `/report`.

## Why it's a real moat
Even though the Worker source is public, the **value is the running service**: a valid license (that
you sold) plus your hosted Claude API calls. Copying the code doesn't grant licenses or free compute —
they'd have to rebuild and run the whole thing themselves, which is true of any software product.
