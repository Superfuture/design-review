---
name: design-review
description: Run a sharp, prioritized design critique of a UI — a URL, a screenshot/image, or a component file — covering visual hierarchy, typography, spacing, color & contrast, motion, component states, responsiveness, accessibility, and brand consistency. Returns findings ranked from blocking to polish, each with a specific fix; can optionally apply the fixes to code. Use when the user asks to review/critique a design, page, screen, component, or screenshot, or to check craft/accessibility before shipping.
---

# design-review

A senior-level craft critique. Opinionated and specific — not a generic checklist dump.

## 1. Acquire the artifact
- **Screenshot / image** → Read it. Best for *visual* judgment (hierarchy, type, spacing, color).
- **Component / code file** → Read it (and related CSS/tokens). Enables implementation-level fixes
  with `file:line` references and `--apply`.
- **URL** → WebFetch the page source for markup/CSS. ⚠️ WebFetch returns text, not a render — for
  visual judgment also ask the user for a **screenshot** (and the viewport: desktop/mobile).
- If you have neither a screenshot nor code for a visual review, ask for one before guessing.

## 2. Evaluate against the rubric
Review against every dimension in `checklist.md`:
hierarchy & layout · typography · spacing & rhythm · color & contrast · motion ·
component states · accessibility · responsiveness · content & copy · consistency & brand.
Check actual numbers where possible (contrast ratios, line-heights, measure in ch, tap-target px,
animation durations) rather than vibes.

## 3. Report — ranked, concrete, scannable
Group findings by severity, most important first. **Lead with the few that matter; don't list
everything.** For each finding give:
- **What** — the specific issue (quote the element / `file:line` when code is available)
- **Why** — the craft or usability reason it matters (one line)
- **Fix** — a concrete, specific change (exact value, not "increase spacing")

Severity tiers:
- 🔴 **Blocking** — broken, inaccessible, or fails WCAG AA / unusable on a target device.
- 🟠 **Important** — noticeably hurts hierarchy, readability, usability, or consistency.
- 🟡 **Polish** — refinement that sharpens the craft.

End with **"Strengths"** (2–4 things done well — critique builds on what works) and, if useful,
the single highest-leverage change to make first.

## 4. Optional: apply fixes
If invoked with `--apply` (or the user asks), make the code edits for the **clear, safe** findings
(contrast, spacing values, focus states, reduced-motion, semantic tags, alt text). Leave subjective
or restructuring changes as recommendations unless the user confirms. Re-verify contrast/values after editing.

## Tone
Direct and respectful, like reviewing a colleague's work: precise about problems, never vague, and
always paired with the fix. Calibrate depth to the surface — a marketing hero gets motion/type
scrutiny; a form gets states/accessibility scrutiny.
