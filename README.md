# design-review

A senior design critique in your terminal — a [Claude Code](https://claude.com/claude-code) skill.

Point it at a URL, a screenshot, or a component file and get **ranked, specific findings** across
visual hierarchy, typography, spacing, color & contrast, motion, component states, responsiveness,
accessibility, and brand consistency — each with a concrete fix you can optionally auto-apply.

Findings come back **blocking → important → polish**, against real thresholds (WCAG ratios, 45–75ch
measure, motion timings, 44px tap targets), plus a Strengths section and the single highest-leverage
change to make first.

→ **Landing page:** https://superfuture.github.io/design-review/

## Install

```bash
# In Claude Code
/plugin marketplace add Superfuture/design-review
/plugin install design-review@superfuture
```

Or drop the skill in manually:

```bash
git clone https://github.com/Superfuture/design-review /tmp/dr \
  && cp -r /tmp/dr/design-review/skills/design-review ~/.claude/skills/design-review
```

## Use

```
design review officialjp.com
critique this paywall screenshot      (paste an image)
review ContentView.swift before I ship
design review https://example.com --apply
```

## What's in here

```
.claude-plugin/marketplace.json     # so others can /plugin marketplace add this repo
design-review/                      # the plugin
  .claude-plugin/plugin.json
  skills/design-review/
    SKILL.md                        # process + how it reviews
    checklist.md                    # the 10-dimension craft rubric
index.html                          # landing page (GitHub Pages)
pro/                                # optional server-backed Pro tier (license gating)
```

## Pro tier

The free skill is fully usable. A server-backed **Pro** tier (expanded rubric + report generation,
gated by a license key) lives in [`pro/`](./pro) — see its README for how the licensing Worker and
a Gumroad/Stripe checkout wire together.

MIT © Joey Primiani
