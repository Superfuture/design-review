# Design Review Rubric

Check against each dimension. Prefer concrete measurements over impressions.

## 1. Visual hierarchy & layout
- One clear focal point; obvious primary action. Eye knows where to go first.
- Scan path follows importance (size, weight, color, position).
- Related items grouped (proximity); unrelated items separated. Gestalt holds up.
- Everything aligns to a grid / shared edges — no stray, near-but-not-quite alignments.
- Whitespace used as structure, not leftover. Generous around focal elements.

## 2. Typography
- Limited type scale (≈5–7 steps), each step clearly distinct (≥ ~1.2 ratio).
- Line-height: tighter for display (1.0–1.2), ~1.4–1.6 for body.
- Measure (line length) ~45–75 characters for body text.
- Display/large text has tightened letter-spacing; small caps/labels slightly loose.
- ≤2 typefaces (or a deliberate pairing). Consistent weights.
- No widows/orphans on headlines; no rivers; numerals consistent (tabular where aligning).

## 3. Spacing & rhythm
- Consistent spacing scale (e.g. 4/8px steps) — no arbitrary 13px/27px gaps.
- Vertical rhythm consistent between sections; padding symmetric where expected.
- Density appropriate to content; touch UIs roomier than dense dashboards.

## 4. Color & contrast
- WCAG AA: body text ≥ 4.5:1; large text (≥24px / 19px bold) and UI/icons ≥ 3:1. (AAA 7:1 if claimed.)
- Never rely on color alone to convey meaning (add icon/label/shape).
- Restrained palette; accent color used sparingly for emphasis/CTAs.
- Sufficient contrast on disabled/placeholder without them reading as active.

## 5. Motion
- Purposeful (guides attention, shows continuity) — not decoration that delays.
- UI transitions fast: ~150–250ms; larger/entrance ~300–500ms.
- Natural easing: ease-out for enters, ease-in for exits; avoid linear (except continuous).
- Honors `prefers-reduced-motion` — provides a reduced/instant variant.
- No layout shift, jank, or animations blocking interaction.

## 6. Component states
- Every interactive element has hover, focus-visible, active, and disabled states.
- Visible focus ring (don't remove outline without a replacement) — keyboard users.
- Loading, empty, and error states designed (not just the happy path).
- Tap targets ≥ 44×44px (iOS) / 48dp (Android); adequate spacing between.
- Buttons/links look the part; primary vs secondary clearly differentiated.

## 7. Accessibility
- Semantic HTML (headings in order, `button` vs `a`, landmarks); ARIA only to fill gaps.
- All images have meaningful `alt` (or empty alt if decorative); icons have labels.
- Form inputs have associated `<label>`s; errors announced and linked.
- Full keyboard operability; logical focus order; visible focus.
- Color contrast (see §4); supports zoom/200% and reduced motion.

## 8. Responsiveness
- Fluid type/spacing (clamp) or sensible breakpoints; no fixed widths that overflow.
- No horizontal scroll; nothing clipped or overlapping at common widths (320–1440+).
- Touch vs pointer affordances appropriate; images don't distort (aspect-ratio).

## 9. Content & copy
- Headlines clear and specific; scannable; jargon-free.
- CTA labels describe the action ("Start free trial", not "Submit").
- Microcopy guides (placeholders, helper text, error messages are human).
- No misleading states (e.g. a "Sent ✓" that didn't actually send).

## 10. Consistency & brand
- Design tokens reused (color, type, spacing, radius, shadow) — no one-off values.
- Consistent corner radii, shadow elevation, icon style/stroke weight.
- Matches the product's brand voice and visual language across screens.
