---
target: web/src/color-palette (/color-palette page)
total_score: 20
p0_count: 2
p1_count: 3
timestamp: 2026-08-30T04-57-49Z
slug: web-src-color-palette
---
⚠️ DEGRADED: single-context (session instruction forbids Agent/Task tool without explicit user request)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | `CSS 복사` discards `copyText()`'s boolean — zero success/failure feedback. Accent change silently wipes pins. |
| 2 | Match System / Real World | 2 | Raw English role IDs (`on-solid`, `text-strong`, `subtle-bg`) leak into an otherwise Korean UI. "앵커" never defined. |
| 3 | User Control and Freedom | 2 | Local escapes are good (Esc, 기본으로, 자동으로, 역할 기본값으로). No global undo; the destructive path has none. |
| 4 | Consistency and Standards | 2 | Candidate labels use 3 different vocabularies across 4 stops. |
| 5 | Error Prevention | 2 | Hex draft-state, gamut snap, number clamp all careful — but nothing guards the pin-wipe. |
| 6 | Recognition Rather Than Recall | 2 | Popover opens with 0/3 radios checked. The `•` auto-snap marker is unexplained visually. Adjustability signalled only by a 2px shadow. |
| 7 | Flexibility and Efficiency | 2 | URL state is a real strength. L×C pad and hue strip are pointer-only divs (no role, no tabindex). |
| 8 | Aesthetic and Minimalist Design | 2 | No slop, genuinely restrained — but 45% of the headline card is empty and the default state ships 10 warnings. |
| 9 | Error Recovery | 3 | `한 번에 고치기` works well (13 → 2 failures, swaps to undo, announces via `role=status`). It just never explains what it changed. |
| 10 | Help and Documentation | 1 | 0 paragraphs, 0 links, 0 tooltips on the entire page. |
| **Total** | | **20/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment**: Not AI slop. This reads as hand-built by someone with opinions — the depth-as-affordance shadow, the hover-preview-before-commit contract, the simultaneous light/dark mocks, the draft-state hex input. None of the absolute bans are present: no gradient text, no side-stripe borders, no glassmorphism, no eyebrow kickers, no identical card grids, no hero-metric template. Against the **product** register bar ("would a user fluent in Linear/Figma/Raycast trust this?"), it mostly holds. Where it falls short is not strangeness but incompleteness: missing states, missing explanation, missing recovery.

**Deterministic scan**: `detect.mjs --json web/src/color-palette web/src/components` → `[]`, exit 0. Clean.

**Visual overlays**: Not attempted — findings below come from direct DOM measurement in Chrome DevTools at emulated 1440×900 and 390×844 (`window.innerWidth` verified at both).

## Overall Impression

The engine is trustworthy and the core loop is well-built. What's missing is everything around it: the page never explains itself, never confirms an action, and never lets you take one back. The single biggest opportunity is **making the tool's own decisions visible** — right now it silently discards work, silently rewrites role mappings, and silently copies to clipboard.

## What's Working

1. **Hover-preview-before-commit, wired end to end.** `shownScales` feeds badges and mocks; `scales` feeds downloads and the sr-only summary. The distinction between "previewing" and "committed" is held consistently in four different places.
2. **`한 번에 고치기`.** Measured: `?a=f5d90a` → 13 contrast failures, 4 adjustable. One click → 2 failures, 0 adjustable, button swaps to `역할 기본값으로`, `role=status` announces "대비 미달 2건, 조정 가능 0건". Correct, reversible, announced.
3. **Simultaneous light/dark mocks.** Dark-only contrast failures are the ones that ship. Showing both instead of a toggle is the right call.

## Priority Issues

### [P0] `text-neutral-400` fails WCAG AA across the page — including inside the contrast warnings

`oklch(0.708 0 0)` on white measures **2.58:1** at 12px. Required: 4.5:1. Affected: all 22 stop captions (50…950 on both scales), all 4 semantic row labels, the `고정값 미달 N건` summary, and **every collapsed contrast-failure badge**. The least readable text on screen is the text telling you about readability.

**Fix**: Move `text-neutral-400` → `text-neutral-500` (`oklch(0.556)` ≈ 4.74:1) for anything carrying meaning. If 400 must stay for de-emphasis, raise those elements above 12px or accept them only on decorative marks.
**Command**: `/impeccable audit`

### [P0] Horizontal scroll below ~442px — the page is broken on every common phone

At a verified 390px viewport, `document.documentElement.scrollWidth` = **442** vs `innerWidth` = 390. 65 elements overflow. Driver measured: `① 앵커 정하기`'s inner `flex items-start gap-6` needs 256px (OklchPicker, floored by its three `w-16` L/C/H fields) + 24px gap + 112px hex label = 392px, plus card and page padding = 442px. Breaks iPhone SE (375), iPhone 12–15 (390), Galaxy S (360).

**Fix**: Let the anchor row wrap below `sm`, or move the hex field under the picker. The L/C/H row also needs `flex-wrap`.
**Command**: `/impeccable adapt`

### [P1] A 2° hue nudge destroys all pinned stops, unrecoverably

Measured: pinned stop 700 → URL `?v=1&a=3b82f6&s7=0e56c2`. Set H from 259.8 → 262 (roughly one pixel of hue-strip drag). URL becomes `?v=1&a=4480f6` — the pin is gone. `withAccent` clears all four pins by design, and the reasoning in its comment is sound (interpolating across a hue change would produce colors matching no candidate). But there is no warning, no toast, no undo, and because the URL effect uses `replaceState`, browser Back cannot recover it either. The primary tuning work is deleted by the primary input control with zero recovery.

**Fix**: The reset is correct; its invisibility is not. Options, in order of cost: (a) toast — "액센트가 바뀌어 조정한 4자리를 되돌렸습니다" + 실행 취소; (b) keep one previous state in memory behind an undo affordance; (c) `pushState` on accent commit only, so Back is a real exit.
**Command**: `/impeccable harden`

### [P1] The default state opens with 10 unfixable contrast warnings and no explanation

On first load (`#3b82f6`): 10 failures — 1 adjustable (`액센트 on-solid`), 9 fixed. `shifts` is empty, so `한 번에 고치기` never renders. The user's first impression is a warning panel offering no action. The 9 fixed ones are baked into `SEMANTIC_ANCHORS` — not the user's doing and not fixable here — but nothing says so.

The warnings are also pure jargon: `⚠ 액센트 on-solid (라이트 · solid) 3.67 / 4.5`. It names a role ID, two colons of context, and two bare numbers. It does not say what is wrong, where it shows up, or what to do.

**Fix**: Split the surface. Adjustable failures get plain-language text plus an action. Fixed failures move behind one line that explains *why* they can't be fixed ("상태색은 고정 앵커라 이 화면에서 못 바꿉니다"). Consider not counting fixed failures in the headline at all.
**Command**: `/impeccable clarify`

### [P1] The candidate popover contradicts itself: 1–3 options, three vocabularies, nothing selected

Measured across the four adjustable stops on the default accent:

| stop | count | labels |
|---|---|---|
| 50 | 2 | 중립적 · 균형 |
| 300 | **1** | 차분한 |
| 700 | 3 | 차분한 · 균형 · 쨍한 |
| 950 | 3 | 기본 · 더 깊게 · 얕게 |

Three separate label systems for one kind of decision, so the user can never learn a rule. Stop 300 opens a "choose one" radio group containing exactly one option that is already in effect — it reads as broken (the `dedupeByHex` comment predicts this and decides silence is informative; in the browser it is not). And **0 of 3 radios are checked on open** — the current value is represented only by an unlabeled `기본으로` button at the bottom, so "what am I looking at now" is unanswerable.

**Fix**: One vocabulary across all stops. Check the radio matching the current color, including the curve default (make "기본" a real first option rather than a trailing reset). When dedup collapses to one candidate, say so instead of showing a degenerate radio group.
**Command**: `/impeccable clarify`

### [P2] Substantial dead space in both columns

`① 앵커 정하기` card: 740px wide, content ends at 405px → **335px (45%) empty**. Right rail: `main` 863px tall vs `aside` 481px → **382px of vertical dead space**. Meanwhile the palette strips are cramped and the popover panel is 110px wide.

**Fix**: Either narrow the anchor card to its content and put something in the recovered width (the hex field, a saved-palettes strip, the semantic scales), or widen the picker. The right rail could absorb the semantic scales or a per-role stop map.
**Command**: `/impeccable layout`

## Persona Red Flags

**Sam (Accessibility-Dependent)** — the sharpest failures:
- The L×C pad and hue strip are plain `<div>`s with `onPointerDown` — no `tabindex`, no `role="slider"`, no `aria-valuenow`. Tab order confirms only 21 focusables and the two pickers are not among them. The L/C/H number fields are a functional workaround, not an equivalent.
- Body text at **2.58:1** in 22+ places (see P0).
- Touch/click targets: tint chips 27px, strength toggles 23px, number fields 23px tall. All under the 44px guideline.
- Arrow-keying the candidate radios commits immediately, so "preview before choosing" — the screen's stated contract — does not hold on keyboard. (Documented in the spec as known limitation 3; still a live failure for this persona.)

**Jordan (First-Timer)**:
- Zero explanatory prose (`main p` count = 0). "앵커" is never defined; neither is what the four output files are or which one you want.
- The `•` next to `쿨 그레이` has no visible legend — its meaning exists only in `aria-label` ("자동"), which sighted users never receive.
- Download buttons are labeled with filenames. `palette.css` vs `palette.theme.css` is undecidable without opening both.
- Adjustability is signalled by a 2px flat shadow. Jordan will not discover that four of eleven swatches are clickable.

**Riley (Stress Tester)**:
- Found the pin-wipe in under a minute (P1 above).
- `CSS 복사` returns a boolean that `void copyText(...)` throws away — a clipboard rejection is indistinguishable from success.
- `한 번에 고치기` rewrites role→stop mappings (`&t=8-&ts=9-`) with no statement of what changed. The output is a design system spec; silently altering it is the one thing this tool cannot afford.

## Minor Observations

- **0 links on the page.** `/color-palette` is a dead end — no path back to `#builder`, `#lab`, or the root wizard, and no path in.
- **No motion anywhere relevant.** No `prefers-reduced-motion` block exists in the whole `web/src` tree. The one place motion would earn its keep — 11 swatches re-rendering as you drag hue — snaps instantly.
- **Token dogfooding is partial**: 21 `var(--ds-*)` uses vs 46 raw Tailwind spacing utilities in `web/src/color-palette/`. Partly the recorded D1 boundary (layout-level only), so this is a note, not a complaint — but the boundary is worth re-reading now that the page is otherwise stable.
- `BAR_STOPS` in `PreviewPane` reads raw indices instead of going through `at()`. Correct today only because `[3,4,5,6,7]` is symmetric under dark mirroring. The comment says so; a future edit will not.

## Questions to Consider

- The tool's whole claim is "we check contrast for you." What does it cost you that its own chrome fails the check it performs?
- If 9 of 10 default warnings are unfixable by the user, are they warnings or are they footnotes?
- `한 번에 고치기` changes the shape of the system being exported. What would it look like for that change to be legible instead of merely correct?
- The anchor card is 45% empty and the popover is 110px wide. Which of those is the real constraint?
