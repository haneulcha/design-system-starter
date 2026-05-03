# Download Token Layering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the three download outputs (`design-tokens.css`, `tailwind.config.js`, `figma-system.json`) so every token category emits a base (primitive) layer with semantic aliases that reference it. Dark mode overrides only the base layer.

**Architecture:** Color primitives keyed by hue (`neutral.50…900`, `accent.500`, `red.{50,500}`, `green.{50,500}`, `amber.{50,500}`, `blue.{50,500}`); semantic vars (`bg-canvas`, `text-ink`, `accent-primary`, `status-error-bg`, …) reference the primitives via `var()`. Radius and shadow get parallel base→semantic layering. Spacing stays alias-only. Dark mode only mutates primitive vars; semantic refs cascade.

**Tech Stack:** TypeScript, Vitest. Pure-function generators in `src/generator/*`.

**Spec:** [`docs/superpowers/specs/2026-05-04-download-token-layering-design.md`](../specs/2026-05-04-download-token-layering-design.md)

---

## File Structure

| File | Role | Change |
|---|---|---|
| `src/generator/color-category.ts` | Color category source-of-truth | Modify `toLegacyColorScales` to emit new pseudo-hues |
| `src/generator/tokens.ts` | Token assembly | Rewrite `generateSemantic`; touch `buildDesignTokens` for radius primitive shape |
| `src/generator/css-export.ts` | CSS variable emit | Full rewrite |
| `src/generator/tailwind-export.ts` | Tailwind preset emit | Full rewrite |
| `src/figma/transformer.ts` | Figma JSON emit | Extend to 7 collections |
| `src/schema/types.ts` | Shared types | Adjust `DesignTokens.radiusPrimitives` (rename or augment), keep backward-compat |
| `tests/generator/tokens.test.ts` | Unit tests for tokens.ts | Update for new primitive/semantic shape |
| `tests/generator/integration.test.ts` | End-to-end checks | Update assertions on cssVariables/semantic format |
| `tests/figma/transformer.test.ts` | Figma transformer tests | Update for new collections + var names |
| `tests/generator/css-export.test.ts` | Dedicated css-export tests | **NEW** |
| `tests/generator/tailwind-export.test.ts` | Dedicated tailwind-export tests | **NEW** |

The CSS exporter and Tailwind exporter both consume `DesignTokens` only — they do not import schema/category modules directly. Keep that boundary.

---

## Status Hue Constant (Shared)

A constant used in multiple files. Define once, import where needed.

```ts
// src/schema/archetype-palettes.ts (append to bottom of existing file)

/** Maps the 4 status roles to fixed hue names for downstream emit
 *  (CSS vars, Tailwind, Figma). Naming is convention, not hue accuracy:
 *  warm-friendly's error-text trends orange but is still emitted as red-500. */
export const STATUS_HUE_NAMES = {
  error:   "red",
  success: "green",
  warning: "amber",
  info:    "blue",
} as const;

export type StatusHueName = typeof STATUS_HUE_NAMES[keyof typeof STATUS_HUE_NAMES];

/** Order matters — must match STATUS_HUE_NAMES values, used for stable
 *  iteration when emitting status primitives. */
export const STATUS_HUE_ORDER: readonly StatusHueName[] = ["red", "green", "amber", "blue"];
```

---

## Task 1: Status hue constants + new color primitive pseudo-hues

**Files:**
- Modify: `src/schema/archetype-palettes.ts` (append constants)
- Modify: `src/generator/color-category.ts` (rewrite `toLegacyColorScales`)
- Modify: `tests/generator/tokens.test.ts:36-64` (update generatePrimitive expectations)

The change: `toLegacyColorScales` currently emits two pseudo-hues (`palette` with 15 slots and `neutral` with 9 stops). After this task it emits **six** pseudo-hues:

- `neutral`: stops `50, 100, 200, 300, 400, 500, 600, 800, 900` — each `ColorStep.light` is the baseScale hex; `dark` is the inverted-position hex (so `neutral.50.dark = baseScale[900]`, achieving Radix-style scale-position semantics).
- `accent`: stop `500` — light=accent hex, dark=accent hex (no inversion).
- `red`, `green`, `amber`, `blue`: stops `50, 500` — `50` from status `*-bg`, `500` from status `*-text`. Dark values come from `adjustStatusForDark` (we need to expose this — see Step 3).

The legacy `palette` pseudo-hue is **removed** entirely. Any consumer that read it must migrate (only `tokens.ts:generateSemantic` does — handled in Task 2).

- [ ] **Step 1: Append status hue constants**

```ts
// src/schema/archetype-palettes.ts — append after the existing exports

/** Maps the 4 status roles to fixed hue names for downstream emit. */
export const STATUS_HUE_NAMES = {
  error:   "red",
  success: "green",
  warning: "amber",
  info:    "blue",
} as const;

export type StatusRole = keyof typeof STATUS_HUE_NAMES;
export type StatusHueName = typeof STATUS_HUE_NAMES[StatusRole];

export const STATUS_ROLES: readonly StatusRole[] = ["error", "success", "warning", "info"];
export const STATUS_HUE_ORDER: readonly StatusHueName[] = ["red", "green", "amber", "blue"];
```

- [ ] **Step 2: Expose adjustStatusForDark**

The current `color-category.ts` keeps `adjustStatusForDark` private. Promote it to an exported helper so `toLegacyColorScales` can derive dark status hues consistently with the existing dark palette derivation.

In `src/generator/color-category.ts`, change `function adjustStatusForDark` to `export function adjustStatusForDark` and add to its docstring:

```ts
/** Apply lightness inversion to status hex pairs for dark mode.
 *  Used by both palette resolution and primitive pseudo-hue emit. */
```

- [ ] **Step 3: Rewrite toLegacyColorScales**

Replace the current implementation in `src/generator/color-category.ts` (lines ~144-155):

```ts
export function toLegacyColorScales(tokens: ColorCategoryTokens): ColorScales {
  // Neutral pseudo-hue: 9 stops. light = baseScale hex; dark = baseScale at
  // the inverted-position hex (so the same var resolves to a dark backdrop
  // in dark mode).
  const neutral: Record<string, ColorStep> = {};
  for (const stop of NEUTRAL_STOPS) {
    const lightHex = tokens.baseScale[stop];
    const darkHex = tokens.baseScale[DARK_NEUTRAL_INVERSION[stop]];
    neutral[stop] = {
      light: parsePrimary(lightHex),
      dark:  parsePrimary(darkHex),
    };
  }

  // Accent pseudo-hue: single -500 stop, identical in both modes.
  const accent: Record<string, ColorStep> = {
    "500": {
      light: tokens.oklch.accent,
      dark:  tokens.oklch.accent,
    },
  };

  // Status hues. -50 = bg, -500 = text. Dark values from adjustStatusForDark.
  const statusLightSource = {
    "error-bg":     tokens.palette["error-bg"],
    "error-text":   tokens.palette["error-text"],
    "success-bg":   tokens.palette["success-bg"],
    "success-text": tokens.palette["success-text"],
    "warning-bg":   tokens.palette["warning-bg"],
    "warning-text": tokens.palette["warning-text"],
    "info-bg":      tokens.palette["info-bg"],
    "info-text":    tokens.palette["info-text"],
  };
  const statusDarkSource = adjustStatusForDark(statusLightSource);

  const buildHue = (role: StatusRole): Record<string, ColorStep> => ({
    "50":  {
      light: parsePrimary(statusLightSource[`${role}-bg` as const]),
      dark:  parsePrimary(statusDarkSource[`${role}-bg` as const]),
    },
    "500": {
      light: parsePrimary(statusLightSource[`${role}-text` as const]),
      dark:  parsePrimary(statusDarkSource[`${role}-text` as const]),
    },
  });

  return {
    neutral,
    accent,
    red:   buildHue("error"),
    green: buildHue("success"),
    amber: buildHue("warning"),
    blue:  buildHue("info"),
  };
}
```

Add the corresponding import at the top of the file:

```ts
import {
  // ... existing imports
  STATUS_HUE_NAMES,
  STATUS_ROLES,
  type StatusRole,
} from "../schema/archetype-palettes.js";
```

- [ ] **Step 4: Update tokens.test.ts (generatePrimitive section)**

Replace the `describe("generatePrimitive", …)` block (lines ~36-64) with:

```ts
describe("generatePrimitive", () => {
  it("emits 6 pseudo-hues: neutral, accent, red, green, amber, blue", () => {
    expect(Object.keys(primitive.colors).sort()).toEqual(
      ["accent", "amber", "blue", "green", "neutral", "red"].sort(),
    );
  });

  it("neutral has 9 stops", () => {
    expect(Object.keys(primitive.colors.neutral)).toHaveLength(9);
  });

  it("accent has a single -500 stop", () => {
    expect(Object.keys(primitive.colors.accent)).toEqual(["500"]);
  });

  it("each status hue has -50 (bg) and -500 (text) stops", () => {
    for (const hue of ["red", "green", "amber", "blue"]) {
      expect(Object.keys(primitive.colors[hue]).sort()).toEqual(["50", "500"]);
    }
  });

  it("neutral.50 inverts in dark mode (Radix-style position semantics)", () => {
    const stop = primitive.colors.neutral["50"];
    expect(stop.light.l).toBeGreaterThan(stop.dark.l);
  });

  it("accent.500 is identical in light and dark", () => {
    const stop = primitive.colors.accent["500"];
    expect(stop.light).toEqual(stop.dark);
  });

  it("does NOT emit the legacy 'palette' pseudo-hue", () => {
    expect(primitive.colors).not.toHaveProperty("palette");
  });
});
```

- [ ] **Step 5: Run tests, expect Task-1 tests pass and Task-2 tests fail**

```bash
npx vitest run tests/generator/tokens.test.ts
```

Expected: `generatePrimitive` block passes. `generateSemantic` and `generateComponent` blocks fail (they still expect `palette/<slot>` refs). That is fine — Task 2 fixes them.

- [ ] **Step 6: Commit**

```bash
git add src/schema/archetype-palettes.ts src/generator/color-category.ts tests/generator/tokens.test.ts
git commit -m "feat(color): emit hue-keyed primitive pseudo-hues for new layering"
```

---

## Task 2: Rewrite generateSemantic to ref new pseudo-hues

**Files:**
- Modify: `src/generator/tokens.ts:63-96` (`generateSemantic` body)
- Modify: `tests/generator/tokens.test.ts:68-103` (semantic ref tests)
- Modify: `tests/generator/integration.test.ts:62-66` (drop the `^palette\/[a-z0-9-]+$` regex)

`generateSemantic` must emit refs that resolve through the new pseudo-hue keys. Reference format stays `<hue>/<step>` so the figma transformer's existing resolver works without change.

The mapping between semantic role and primitive ref must be derived from the **archetype's surfaceRefs/textRefs** (so per-archetype overrides cascade). Pass the archetype palette into `generateSemantic`.

- [ ] **Step 1: Update generateSemantic signature + body**

In `src/generator/tokens.ts`, replace `generateSemantic` (lines 63-96):

```ts
import {
  ARCHETYPE_PALETTES,
  STATUS_HUE_NAMES,
  type StatusRole,
} from "../schema/archetype-palettes.js";

// ─── Layer 2: Semantic ───────────────────────────────────────────────────────

/**
 * Builds the flat semantic alias map. Each value is a "<hue>/<stop>" ref into
 * the primitive layer (see generatePrimitive). Surface/text refs follow the
 * archetype palette's surfaceRefs/textRefs; status refs are fixed via
 * STATUS_HUE_NAMES.
 *
 * Hover/active/strong accent variants alias the single accent stop for v1 —
 * the corpus model is "one brand color, full stop". Future tonal variants
 * can be derived in CSS via color-mix().
 */
export function generateSemantic(colorTokens: ColorCategoryTokens): SemanticTokens {
  const arche = ARCHETYPE_PALETTES[colorTokens.preset];
  const surfaceRefs = arche.surfaceRefs;
  const textRefs = arche.textRefs;

  return {
    // Surface
    "bg/canvas":   `neutral/${surfaceRefs.canvas}`,
    "bg/soft":     `neutral/${surfaceRefs.soft}`,
    "bg/strong":   `neutral/${surfaceRefs.soft}`,    // collapsed — no "strong" slot
    "bg/card":     `neutral/${surfaceRefs.canvas}`,
    "bg/hairline": `neutral/${surfaceRefs.hairline}`,

    // Text
    "text/ink":         `neutral/${textRefs.ink}`,
    "text/body":        `neutral/${textRefs.body}`,
    "text/body-strong": `neutral/${textRefs.ink}`,
    "text/muted":       `neutral/${textRefs.muted}`,
    "text/muted-soft":  `neutral/${textRefs.muted}`,
    "text/on-primary":  `neutral/${surfaceRefs.canvas}`,  // light text on accent

    // Accent
    "accent/primary": "accent/500",
    "accent/hover":   "accent/500",
    "accent/active":  "accent/500",
    "accent/strong":  "accent/500",

    // Status
    "status/error-bg":     `${STATUS_HUE_NAMES.error}/50`,
    "status/error-text":   `${STATUS_HUE_NAMES.error}/500`,
    "status/success-bg":   `${STATUS_HUE_NAMES.success}/50`,
    "status/success-text": `${STATUS_HUE_NAMES.success}/500`,
    "status/warning-bg":   `${STATUS_HUE_NAMES.warning}/50`,
    "status/warning-text": `${STATUS_HUE_NAMES.warning}/500`,
    "status/info-bg":      `${STATUS_HUE_NAMES.info}/50`,
    "status/info-text":    `${STATUS_HUE_NAMES.info}/500`,
  };
}
```

- [ ] **Step 2: Update tokens.test.ts semantic tests**

Replace the relevant assertions:

```ts
// In tests/generator/tokens.test.ts, replace lines ~89-102

it("every value uses the '<hue>/<stop>' format with new pseudo-hues", () => {
  const validHues = new Set(["neutral", "accent", "red", "green", "amber", "blue"]);
  for (const [role, ref] of Object.entries(semantic)) {
    const slash = ref.indexOf("/");
    expect(slash, `${role}: ref "${ref}" missing slash`).toBeGreaterThan(0);
    const hue = ref.slice(0, slash);
    expect(validHues, `${role} hue "${hue}" not in valid set`).toContain(hue);
  }
});

it("every referenced stop exists in the matching primitive hue map", () => {
  for (const [role, ref] of Object.entries(semantic)) {
    const slash = ref.indexOf("/");
    const hue = ref.slice(0, slash);
    const stop = ref.slice(slash + 1);
    const hueMap = primitive.colors[hue];
    expect(hueMap, `hue "${hue}" missing from primitive.colors`).toBeTruthy();
    expect(hueMap, `${role} → ${ref}: stop "${stop}" missing`).toHaveProperty(stop);
  }
});
```

- [ ] **Step 3: Update integration.test.ts**

In `tests/generator/integration.test.ts` lines ~62-66, change:

```ts
it("tokens.semantic values use the '<hue>/<stop>' format", () => {
  for (const [role, value] of Object.entries(result.tokens.semantic)) {
    expect(value, `semantic["${role}"] = "${value}"`).toMatch(/^[a-z]+\/[a-z0-9]+$/);
  }
});
```

Also remove or update the assertion at lines ~39-43 about "single 'palette' hue" — replace with a check for the 6 new hues:

```ts
it("tokens.primitive.colors has 6 hue keys: neutral/accent/red/green/amber/blue", () => {
  expect(Object.keys(result.tokens.primitive.colors).sort()).toEqual(
    ["accent", "amber", "blue", "green", "neutral", "red"].sort(),
  );
});
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/generator/tokens.test.ts tests/generator/integration.test.ts
```

Expected: tokens.test.ts and the touched integration tests pass. Some figma + cssVariables assertions in `integration.test.ts` may still pass loosely (the format checks `:root {`, `module.exports = {`, etc.) — that's fine, they survive the change.

- [ ] **Step 5: Commit**

```bash
git add src/generator/tokens.ts tests/generator/tokens.test.ts tests/generator/integration.test.ts
git commit -m "feat(tokens): rewrite generateSemantic to ref hue-keyed primitives"
```

---

## Task 3: Rewrite css-export — color section (base + semantic + dark)

**Files:**
- Create: `tests/generator/css-export.test.ts`
- Modify: `src/generator/css-export.ts` (replace color section)

The color emit becomes:

```css
:root {
  /* Color Primitives — Neutral */
  --color-neutral-50:  oklch(...);
  --color-neutral-100: oklch(...);
  ...
  --color-neutral-900: oklch(...);

  /* Color Primitives — Accent */
  --color-accent-500: oklch(...);

  /* Color Primitives — Status */
  --color-red-50:    oklch(...);
  --color-red-500:   oklch(...);
  --color-green-50:  oklch(...);
  --color-green-500: oklch(...);
  --color-amber-50:  oklch(...);
  --color-amber-500: oklch(...);
  --color-blue-50:   oklch(...);
  --color-blue-500:  oklch(...);

  /* Colors (semantic) */
  --color-bg-canvas:   var(--color-neutral-50);
  --color-bg-soft:     var(--color-neutral-100);
  --color-bg-hairline: var(--color-neutral-300);
  --color-text-ink:    var(--color-neutral-900);
  ...
  --color-accent-primary: var(--color-accent-500);
  --color-status-error-bg:    var(--color-red-50);
  --color-status-error-text:  var(--color-red-500);
  ...
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-neutral-50:  oklch(<dark mode hex>);
    ...
    --color-red-500:     oklch(<lightened>);
    --color-red-50:      oklch(<darkened>);
    ...
    /* accent omitted — same in both modes */
  }
}
```

The semantic key emit translates `bg/canvas` → `--color-bg-canvas` (slash → dash) and the value translates `neutral/50` → `var(--color-neutral-50)`.

- [ ] **Step 1: Write the failing test (new test file)**

Create `tests/generator/css-export.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generate } from "../../src/generator/index.js";

const { cssVariables } = generate({
  brandName: "CssTest",
  preset: "professional",
  fontFamily: "Inter",
});

describe("css-export — color primitives (base layer)", () => {
  it("emits all 9 neutral stops", () => {
    for (const stop of ["50", "100", "200", "300", "400", "500", "600", "800", "900"]) {
      expect(cssVariables).toMatch(new RegExp(`--color-neutral-${stop}: oklch\\(`));
    }
  });

  it("emits accent-500", () => {
    expect(cssVariables).toMatch(/--color-accent-500: oklch\(/);
  });

  it("emits 4 status hues × 2 stops each", () => {
    for (const hue of ["red", "green", "amber", "blue"]) {
      expect(cssVariables).toMatch(new RegExp(`--color-${hue}-50: oklch\\(`));
      expect(cssVariables).toMatch(new RegExp(`--color-${hue}-500: oklch\\(`));
    }
  });

  it("does not emit the legacy --color-palette-* primitives", () => {
    expect(cssVariables).not.toMatch(/--color-palette-/);
  });
});

describe("css-export — color semantics (alias layer)", () => {
  it("bg-canvas references a neutral stop", () => {
    expect(cssVariables).toMatch(/--color-bg-canvas: var\(--color-neutral-\d+\);/);
  });

  it("text-ink references a neutral stop", () => {
    expect(cssVariables).toMatch(/--color-text-ink: var\(--color-neutral-\d+\);/);
  });

  it("accent-primary references --color-accent-500", () => {
    expect(cssVariables).toContain("--color-accent-primary: var(--color-accent-500);");
  });

  it("status semantics reference status hue stops", () => {
    expect(cssVariables).toMatch(/--color-status-error-bg:\s*var\(--color-red-50\);/);
    expect(cssVariables).toMatch(/--color-status-error-text:\s*var\(--color-red-500\);/);
    expect(cssVariables).toMatch(/--color-status-success-bg:\s*var\(--color-green-50\);/);
    expect(cssVariables).toMatch(/--color-status-info-text:\s*var\(--color-blue-500\);/);
  });
});

describe("css-export — dark mode", () => {
  it("dark block contains primitive overrides only (no semantic vars)", () => {
    const darkMatch = cssVariables.match(
      /@media \(prefers-color-scheme: dark\) \{\s*:root \{([\s\S]*?)\}\s*\}/,
    );
    expect(darkMatch, "dark block missing").toBeTruthy();
    const darkBody = darkMatch![1];
    // Must contain primitives
    expect(darkBody).toMatch(/--color-neutral-50:/);
    // Must NOT contain semantics
    expect(darkBody).not.toMatch(/--color-bg-canvas:/);
    expect(darkBody).not.toMatch(/--color-text-ink:/);
    expect(darkBody).not.toMatch(/--color-status-error-/);
  });

  it("dark block does NOT override accent-500 (same in both modes)", () => {
    const darkMatch = cssVariables.match(
      /@media \(prefers-color-scheme: dark\) \{\s*:root \{([\s\S]*?)\}\s*\}/,
    );
    expect(darkMatch![1]).not.toMatch(/--color-accent-500:/);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
npx vitest run tests/generator/css-export.test.ts
```

Expected: most/all assertions fail because css-export still emits `--color-palette-*`.

- [ ] **Step 3: Rewrite css-export.ts color section**

Replace the color emit blocks in `src/generator/css-export.ts`. The new implementation iterates `tokens.primitive.colors` keyed by hue, then iterates `tokens.semantic` to emit refs.

Replace lines 36-60 (palette + semantic blocks) with:

```ts
  // ── Color Primitives (base layer) ─────────────────────────────────────────
  // Hue-keyed: neutral.50-900, accent.500, red/green/amber/blue × {50, 500}.
  // Dark mode overrides only this section — semantics cascade via var().
  const HUE_ORDER = ["neutral", "accent", "red", "green", "amber", "blue"] as const;
  const HUE_LABEL: Record<string, string> = {
    neutral: "Neutral",
    accent:  "Accent",
    red:     "Status (red)",
    green:   "Status (green)",
    amber:   "Status (amber)",
    blue:    "Status (blue)",
  };

  for (const hue of HUE_ORDER) {
    const hueMap = tokens.primitive.colors[hue];
    if (!hueMap) continue;
    lines.push(`  /* ${HUE_LABEL[hue]} */`);
    // Sort stops numerically for stable output (50, 100, …, 900)
    const stops = Object.keys(hueMap).sort((a, b) => Number(a) - Number(b));
    for (const stop of stops) {
      lines.push(`  --color-${hue}-${stop}: ${fmtOklch(hueMap[stop].light)};`);
    }
    lines.push("");
  }

  // ── Color Semantic (alias layer) ──────────────────────────────────────────
  lines.push("  /* Colors (semantic) */");
  for (const [role, ref] of Object.entries(tokens.semantic)) {
    const v = `--color-${role.replace(/\//g, "-")}`;
    if (ref === "transparent") {
      lines.push(`  ${v}: transparent;`);
      continue;
    }
    const slash = ref.indexOf("/");
    if (slash !== -1) {
      const hue = ref.slice(0, slash);
      const stop = ref.slice(slash + 1);
      lines.push(`  ${v}: var(--color-${hue}-${stop});`);
    }
  }
```

- [ ] **Step 4: Update css-export dark block**

Replace lines 131-146 with:

```ts
  // ─── Dark mode: override primitive layer only ─────────────────────────────
  // Iterate the same hue order; emit lines only where dark differs from light.
  const darkPrimitiveLines: string[] = [];
  for (const hue of HUE_ORDER) {
    const hueMap = tokens.primitive.colors[hue];
    if (!hueMap) continue;
    const stops = Object.keys(hueMap).sort((a, b) => Number(a) - Number(b));
    for (const stop of stops) {
      const step = hueMap[stop];
      const dark = fmtOklch(step.dark);
      const light = fmtOklch(step.light);
      if (dark !== light) {
        darkPrimitiveLines.push(`    --color-${hue}-${stop}: ${dark};`);
      }
    }
  }
  if (darkPrimitiveLines.length > 0) {
    lines.push("");
    lines.push("@media (prefers-color-scheme: dark) {");
    lines.push("  :root {");
    lines.push(...darkPrimitiveLines);
    lines.push("  }");
    lines.push("}");
  }
```

Also delete the now-unused `paletteStops` constant near the top.

- [ ] **Step 5: Run tests**

```bash
npx vitest run tests/generator/css-export.test.ts tests/generator/integration.test.ts
```

Expected: css-export.test.ts passes. integration.test.ts dark/cssVariables checks still pass.

- [ ] **Step 6: Commit**

```bash
git add tests/generator/css-export.test.ts src/generator/css-export.ts
git commit -m "feat(css-export): emit hue-keyed color primitives + semantic var() refs"
```

---

## Task 4: CSS export — radius base (sm/md/lg) + semantic refs

**Files:**
- Modify: `src/generator/css-export.ts` (radius section, lines ~69-90)
- Modify: `tests/generator/css-export.test.ts` (add radius cases)

The radius emit becomes:

```css
/* Radius Primitives */
--radius-none:   0;
--radius-xs:     2px;
--radius-sm:     4px;
--radius-md:     8px;
--radius-lg:     12px;
--radius-xl:     16px;
--radius-2xl:    24px;
--radius-pill:   9999px;
--radius-circle: 50%;

/* Border Radius (semantic) */
--radius-button: var(--radius-md);   /* style=standard */
--radius-input:  var(--radius-md);
--radius-card:   var(--radius-lg);
--radius-subtle: var(--radius-sm);
--radius-large:  var(--radius-2xl);
```

We need a px → alias-name map. Reserved 6px is dropped from base emit. The semantic `tokens.borderRadius` map already has px values; we look up the matching alias name to emit `var(--radius-<alias>)`.

- [ ] **Step 1: Add failing tests**

Append to `tests/generator/css-export.test.ts`:

```ts
describe("css-export — radius", () => {
  it("emits 9 base radius primitives with sm/md/lg names", () => {
    expect(cssVariables).toContain("--radius-none: 0;");
    expect(cssVariables).toContain("--radius-xs: 2px;");
    expect(cssVariables).toContain("--radius-sm: 4px;");
    expect(cssVariables).toContain("--radius-md: 8px;");
    expect(cssVariables).toContain("--radius-lg: 12px;");
    expect(cssVariables).toContain("--radius-xl: 16px;");
    expect(cssVariables).toContain("--radius-2xl: 24px;");
    expect(cssVariables).toContain("--radius-pill: 9999px;");
    expect(cssVariables).toContain("--radius-circle: 50%;");
  });

  it("does not emit the reserved 6px stop", () => {
    expect(cssVariables).not.toMatch(/--radius-(scale-)?6:/);
  });

  it("does not emit legacy --radius-scale-N primitives", () => {
    expect(cssVariables).not.toMatch(/--radius-scale-/);
  });

  it("semantic radius refs the base layer via var()", () => {
    expect(cssVariables).toMatch(/--radius-button: var\(--radius-(xs|sm|md|lg|xl|2xl|pill)\);/);
    expect(cssVariables).toMatch(/--radius-card: var\(--radius-(sm|md|lg|xl|2xl)\);/);
    expect(cssVariables).toMatch(/--radius-subtle: var\(--radius-sm\);/);
    expect(cssVariables).toMatch(/--radius-large: var\(--radius-2xl\);/);
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
npx vitest run tests/generator/css-export.test.ts -t "radius"
```

- [ ] **Step 3: Rewrite radius section in css-export.ts**

Replace lines 69-90 (Radius Primitives + Border Radius) with:

```ts
  // ── Radius Primitives (base layer, sm/md/lg names) ───────────────────────
  /** Map px stop → alias name. 6px is reserved and not emitted. */
  const RADIUS_PX_TO_ALIAS: Record<number, string> = {
    0: "none",
    2: "xs",
    4: "sm",
    8: "md",
    12: "lg",
    16: "xl",
    24: "2xl",
    9999: "pill",
    [-1]: "circle", // -1 sentinel = 50%
  };
  const RADIUS_ALIAS_ORDER = ["none", "xs", "sm", "md", "lg", "xl", "2xl", "pill", "circle"];

  lines.push("");
  lines.push("  /* Radius Primitives */");
  // Emit every alias even if not in tokens.radiusPrimitives, so the base
  // layer is stable across knob changes.
  const RADIUS_ALIAS_VALUE: Record<string, string> = {
    none: "0",
    xs: "2px",
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "24px",
    pill: "9999px",
    circle: "50%",
  };
  for (const alias of RADIUS_ALIAS_ORDER) {
    lines.push(`  --radius-${alias}: ${RADIUS_ALIAS_VALUE[alias]};`);
  }

  // ── Border Radius Semantic (alias layer) ─────────────────────────────────
  lines.push("");
  lines.push("  /* Border Radius (semantic) */");
  for (const [name, value] of Object.entries(tokens.borderRadius)) {
    const v = varName("radius", name);
    const alias = RADIUS_PX_TO_ALIAS[value];
    if (alias) {
      lines.push(`  ${v}: var(--radius-${alias});`);
    } else {
      // Fallback for unmapped values (e.g., a future custom px). Emit raw.
      lines.push(`  ${v}: ${fmtRadius(value)};`);
    }
  }
```

Note: also delete the unused `radiusSet` and `radiusPrimitives` iteration block above. The base layer no longer reads `tokens.radiusPrimitives` — its alias names are fixed at 9, independent of style knob.

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/generator/css-export.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/generator/css-export.ts tests/generator/css-export.test.ts
git commit -m "feat(css-export): radius base layer with sm/md/lg names"
```

---

## Task 5: CSS export — shadow base + semantic

**Files:**
- Modify: `src/generator/css-export.ts` (elevation section, lines ~113-118)
- Modify: `tests/generator/css-export.test.ts` (add shadow cases)

Map elevation level → base alias:

| level | base name |
|---|---|
| none | none |
| ring | xs |
| raised | sm |
| floating | md |
| overlay | lg |

Semantic aliases:

| semantic | refs |
|---|---|
| hairline | xs |
| card | sm |
| popover | md |
| modal | lg |

`none` semantic is not surfaced.

- [ ] **Step 1: Add failing tests**

Append to `tests/generator/css-export.test.ts`:

```ts
describe("css-export — shadow", () => {
  it("emits 5 base shadow primitives", () => {
    expect(cssVariables).toContain("--shadow-none: none;");
    expect(cssVariables).toMatch(/--shadow-xs: .+;/);
    expect(cssVariables).toMatch(/--shadow-sm: .+;/);
    expect(cssVariables).toMatch(/--shadow-md: .+;/);
    expect(cssVariables).toMatch(/--shadow-lg: .+;/);
  });

  it("emits 4 semantic shadow aliases referencing base", () => {
    expect(cssVariables).toContain("--shadow-hairline: var(--shadow-xs);");
    expect(cssVariables).toContain("--shadow-card: var(--shadow-sm);");
    expect(cssVariables).toContain("--shadow-popover: var(--shadow-md);");
    expect(cssVariables).toContain("--shadow-modal: var(--shadow-lg);");
  });

  it("does not emit the legacy --shadow-{ring,raised,floating,overlay} names", () => {
    // Old direct-emit pattern is gone; semantics use UI-role names.
    expect(cssVariables).not.toMatch(/--shadow-raised:\s/);
    expect(cssVariables).not.toMatch(/--shadow-floating:\s/);
    expect(cssVariables).not.toMatch(/--shadow-overlay:\s/);
    expect(cssVariables).not.toMatch(/--shadow-ring:\s/);
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
npx vitest run tests/generator/css-export.test.ts -t "shadow"
```

- [ ] **Step 3: Rewrite shadow section in css-export.ts**

Replace lines 113-118 (Elevation block) with:

```ts
  // ── Shadow Primitives (base layer) ───────────────────────────────────────
  /** Map elevation level → base alias. */
  const ELEVATION_TO_BASE: Record<string, string> = {
    none: "none",
    ring: "xs",
    raised: "sm",
    floating: "md",
    overlay: "lg",
  };
  /** Order matches base-alias scale (none → lg). */
  const SHADOW_BASE_ORDER = ["none", "xs", "sm", "md", "lg"];

  lines.push("");
  lines.push("  /* Shadow Primitives */");
  for (const [levelName, value] of Object.entries(tokens.elevation)) {
    const alias = ELEVATION_TO_BASE[levelName];
    if (!alias) continue;
    lines.push(`  --shadow-${alias}: ${value};`);
  }

  // ── Shadow Semantic (alias layer) ────────────────────────────────────────
  lines.push("");
  lines.push("  /* Shadows (semantic) */");
  const SHADOW_SEMANTIC: Array<[string, string]> = [
    ["hairline", "xs"],
    ["card", "sm"],
    ["popover", "md"],
    ["modal", "lg"],
  ];
  for (const [role, base] of SHADOW_SEMANTIC) {
    lines.push(`  --shadow-${role}: var(--shadow-${base});`);
  }
```

**Note:** The elevation generator currently filters `none` levels in `buildDesignTokens` (`if (lvl.shadow === "none") continue;` at line 246). For the new structure we want `none` retained. Update `tokens.ts:buildDesignTokens` to keep `none`:

```ts
// src/generator/tokens.ts — buildDesignTokens elevation block
const elevation: Record<string, string> = {};
for (const lvl of system.elevation.levels) {
  elevation[kebab(lvl.name)] = lvl.shadow;  // include "none"
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/generator/css-export.test.ts tests/generator/integration.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/generator/css-export.ts src/generator/tokens.ts tests/generator/css-export.test.ts
git commit -m "feat(css-export): shadow base + semantic layers (none/xs/sm/md/lg → hairline/card/popover/modal)"
```

---

## Task 6: Tailwind export — base + semantic

**Files:**
- Modify: `src/generator/tailwind-export.ts` (full rewrite)
- Create: `tests/generator/tailwind-export.test.ts`

Tailwind config exposes both layers. Colors as nested objects (`neutral.50`, `red.500`, …) plus flat semantic kebab names. Radius/shadow flat with both base + semantic keys.

- [ ] **Step 1: Write failing tests**

Create `tests/generator/tailwind-export.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generate } from "../../src/generator/index.js";

const { tailwindConfig } = generate({
  brandName: "TwTest",
  preset: "professional",
  fontFamily: "Inter",
});

describe("tailwind-export — colors", () => {
  it("emits neutral as nested object with all 9 stops", () => {
    expect(tailwindConfig).toMatch(/neutral:\s*\{/);
    for (const stop of ["50", "100", "200", "300", "400", "500", "600", "800", "900"]) {
      expect(tailwindConfig).toMatch(
        new RegExp(`"${stop}":\\s*"var\\(--color-neutral-${stop}\\)"`),
      );
    }
  });

  it("emits accent with -500 and DEFAULT", () => {
    expect(tailwindConfig).toMatch(/accent:\s*\{/);
    expect(tailwindConfig).toMatch(/"500":\s*"var\(--color-accent-500\)"/);
  });

  it("emits status hues red/green/amber/blue with 50 + 500", () => {
    for (const hue of ["red", "green", "amber", "blue"]) {
      expect(tailwindConfig).toMatch(new RegExp(`${hue}:\\s*\\{`));
      expect(tailwindConfig).toMatch(new RegExp(`"50":\\s*"var\\(--color-${hue}-50\\)"`));
      expect(tailwindConfig).toMatch(new RegExp(`"500":\\s*"var\\(--color-${hue}-500\\)"`));
    }
  });

  it("emits semantic flat kebab keys", () => {
    expect(tailwindConfig).toMatch(/"bg-canvas":\s*"var\(--color-bg-canvas\)"/);
    expect(tailwindConfig).toMatch(/"text-ink":\s*"var\(--color-text-ink\)"/);
    expect(tailwindConfig).toMatch(/"accent-primary":\s*"var\(--color-accent-primary\)"/);
    expect(tailwindConfig).toMatch(/"status-error-bg":\s*"var\(--color-status-error-bg\)"/);
  });
});

describe("tailwind-export — radius", () => {
  it("borderRadius has both base and semantic keys", () => {
    // base
    for (const k of ["none", "xs", "sm", "md", "lg", "xl", "2xl", "pill", "circle"]) {
      expect(tailwindConfig).toMatch(
        new RegExp(`"?${k}"?:\\s*"var\\(--radius-${k}\\)"`),
      );
    }
    // semantic
    for (const k of ["button", "input", "card", "subtle", "large"]) {
      expect(tailwindConfig).toMatch(
        new RegExp(`${k}:\\s*"var\\(--radius-${k}\\)"`),
      );
    }
  });
});

describe("tailwind-export — shadow", () => {
  it("boxShadow has 5 base + 4 semantic keys", () => {
    for (const k of ["none", "xs", "sm", "md", "lg"]) {
      expect(tailwindConfig).toMatch(
        new RegExp(`"?${k}"?:\\s*"var\\(--shadow-${k}\\)"`),
      );
    }
    for (const k of ["hairline", "card", "popover", "modal"]) {
      expect(tailwindConfig).toMatch(
        new RegExp(`${k}:\\s*"var\\(--shadow-${k}\\)"`),
      );
    }
  });
});
```

- [ ] **Step 2: Run, expect failure**

```bash
npx vitest run tests/generator/tailwind-export.test.ts
```

- [ ] **Step 3: Rewrite tailwind-export.ts**

Replace the full file with:

```ts
// src/generator/tailwind-export.ts
//
// Emits a Tailwind v3 preset that references the CSS variables produced by
// css-export.ts. Use as a Tailwind preset; pair with the companion
// design-tokens.css file imported into your global styles.
//
// Both base (neutral.50, red.500, --radius-md) and semantic
// (bg-canvas, status-error-bg, --radius-button) layers are exposed.

import type { DesignTokens } from "../schema/types.js";

function v(name: string): string {
  return `var(--${name})`;
}

function quoteKey(key: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : `"${key}"`;
}

const COLOR_HUE_ORDER = ["neutral", "accent", "red", "green", "amber", "blue"] as const;

const RADIUS_BASE_KEYS = ["none", "xs", "sm", "md", "lg", "xl", "2xl", "pill", "circle"];
const RADIUS_SEMANTIC_KEYS = ["button", "input", "card", "subtle", "large"];

const SHADOW_BASE_KEYS = ["none", "xs", "sm", "md", "lg"];
const SHADOW_SEMANTIC_KEYS = ["hairline", "card", "popover", "modal"];

function renderHueObject(
  hue: string,
  stops: readonly string[],
  pad: number,
): string {
  const inner = stops
    .map((stop) => `${" ".repeat(pad + 2)}"${stop}": "var(--color-${hue}-${stop})",`)
    .join("\n");
  return `{\n${inner}\n${" ".repeat(pad)}}`;
}

export function generateTailwindConfig(tokens: DesignTokens): string {
  // ── colors ─────────────────────────────────────────────────────────────────
  const colorLines: string[] = [];
  // base — nested per hue
  for (const hue of COLOR_HUE_ORDER) {
    const hueMap = tokens.primitive.colors[hue];
    if (!hueMap) continue;
    const stops = Object.keys(hueMap).sort((a, b) => Number(a) - Number(b));
    colorLines.push(`        ${hue}: ${renderHueObject(hue, stops, 8)},`);
  }
  // semantic — flat kebab
  for (const role of Object.keys(tokens.semantic)) {
    const key = role.replace(/\//g, "-");
    colorLines.push(`        "${key}": "${v(`color-${key}`)}",`);
  }

  // ── spacing ────────────────────────────────────────────────────────────────
  const spacingLines = Object.keys(tokens.spacing).map(
    (name) => `        ${quoteKey(name)}: "${v(`spacing-${name}`)}",`,
  );

  // ── radius ─────────────────────────────────────────────────────────────────
  const radiusLines: string[] = [];
  for (const k of RADIUS_BASE_KEYS) {
    radiusLines.push(`        ${quoteKey(k)}: "${v(`radius-${k}`)}",`);
  }
  for (const k of RADIUS_SEMANTIC_KEYS) {
    radiusLines.push(`        ${quoteKey(k)}: "${v(`radius-${k}`)}",`);
  }

  // ── shadow ─────────────────────────────────────────────────────────────────
  const shadowLines: string[] = [];
  for (const k of SHADOW_BASE_KEYS) {
    shadowLines.push(`        ${quoteKey(k)}: "${v(`shadow-${k}`)}",`);
  }
  for (const k of SHADOW_SEMANTIC_KEYS) {
    shadowLines.push(`        ${quoteKey(k)}: "${v(`shadow-${k}`)}",`);
  }

  // ── fontFamily ─────────────────────────────────────────────────────────────
  const fontFamilyLines: string[] = [];
  for (const [slot, chain] of Object.entries(tokens.typography.families)) {
    const list = chain.split(",").map((s) => JSON.stringify(s.trim())).join(", ");
    fontFamilyLines.push(`        ${quoteKey(slot)}: [${list}],`);
  }

  // ── fontSize ───────────────────────────────────────────────────────────────
  const fontSizeLines = Object.keys(tokens.typography.styles).map((key) => {
    const sizeVar = v(`type-${key}-size`);
    const lhVar = v(`type-${key}-line-height`);
    const lsVar = v(`type-${key}-letter-spacing`);
    const wVar = v(`type-${key}-weight`);
    return `        ${quoteKey(key)}: [
          "${sizeVar}",
          {
            lineHeight: "${lhVar}",
            letterSpacing: "${lsVar}",
            fontWeight: "${wVar}",
          },
        ],`;
  });

  // ── assemble ───────────────────────────────────────────────────────────────
  const out: string[] = [];
  out.push("/**");
  out.push(` * ${tokens.brand.name} — Tailwind preset.`);
  out.push(" * Pairs with design-tokens.css. Import that file into your global");
  out.push(" * stylesheet and apply this preset to expose tokens as Tailwind classes.");
  out.push(" *");
  out.push(" * @type {import('tailwindcss').Config}");
  out.push(" */");
  out.push("module.exports = {");
  out.push("  theme: {");
  out.push("    extend: {");
  out.push("      colors: {");
  out.push(...colorLines);
  out.push("      },");
  out.push("      spacing: {");
  out.push(...spacingLines);
  out.push("      },");
  out.push("      borderRadius: {");
  out.push(...radiusLines);
  out.push("      },");
  out.push("      fontFamily: {");
  out.push(...fontFamilyLines);
  out.push("      },");
  out.push("      fontSize: {");
  out.push(...fontSizeLines);
  out.push("      },");
  out.push("      boxShadow: {");
  out.push(...shadowLines);
  out.push("      },");
  out.push("    },");
  out.push("  },");
  out.push("};");
  out.push("");
  return out.join("\n");
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/generator/tailwind-export.test.ts tests/generator/integration.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/generator/tailwind-export.ts tests/generator/tailwind-export.test.ts
git commit -m "feat(tailwind-export): expose base+semantic layers for color/radius/shadow"
```

---

## Task 7: Figma transformer — Color Primitives reshape

**Files:**
- Modify: `src/figma/transformer.ts` (lines 159-178 — Color Primitives collection)
- Modify: `tests/figma/transformer.test.ts` (lines 43-65 — Color Primitives + Colors assertions)

The Color Primitives collection now lists every hue×stop combination, named `<hue>-<stop>` (e.g., `neutral-50`, `red-500`, `accent-500`) — total 18 variables.

The Colors collection (semantic) keeps its existing approach (resolves each `tokens.semantic` entry through `primitive.colors[hue][step]`) and benefits automatically from the new ref shape introduced in Task 2.

- [ ] **Step 1: Update test expectations**

Replace the `Color Primitives` assertion block in `tests/figma/transformer.test.ts` (lines 43-54):

```ts
it("creates Color Primitives collection (base layer) with light/dark modes", () => {
  const prim = figma.variableCollections.find((c) => c.name === "Color Primitives");
  expect(prim).toBeTruthy();
  expect(prim!.modes.map((m) => m.name)).toContain("Light");
  expect(prim!.modes.map((m) => m.name)).toContain("Dark");
  // 9 neutral + 1 accent + 4 status × 2 = 18
  expect(prim!.variables).toHaveLength(18);
  // Sample names
  expect(prim!.variables.map((v) => v.name)).toContain("neutral-50");
  expect(prim!.variables.map((v) => v.name)).toContain("neutral-900");
  expect(prim!.variables.map((v) => v.name)).toContain("accent-500");
  expect(prim!.variables.map((v) => v.name)).toContain("red-50");
  expect(prim!.variables.map((v) => v.name)).toContain("blue-500");
  // neutral-50 differs across modes (Radix-style scale-position semantics)
  const n50 = prim!.variables.find((v) => v.name === "neutral-50")!;
  expect(n50.valuesByMode["mode-light"]).not.toBe(n50.valuesByMode["mode-dark"]);
  // accent-500 same across modes
  const a500 = prim!.variables.find((v) => v.name === "accent-500")!;
  expect(a500.valuesByMode["mode-light"]).toBe(a500.valuesByMode["mode-dark"]);
});
```

- [ ] **Step 2: Run, expect failure**

```bash
npx vitest run tests/figma/transformer.test.ts -t "Color Primitives"
```

- [ ] **Step 3: Rewrite Color Primitives collection in transformer.ts**

Replace lines 159-178 (Color Primitives section) with:

```ts
  // Color Primitives: hue-keyed base layer (neutral.50-900, accent.500, status hues × {50,500}).
  const HUE_ORDER = ["neutral", "accent", "red", "green", "amber", "blue"];
  const colorPrimitiveVariables: FigmaVariable[] = [];
  for (const hue of HUE_ORDER) {
    const hueMap = primitiveColors[hue];
    if (!hueMap) continue;
    const stops = Object.keys(hueMap).sort((a, b) => Number(a) - Number(b));
    for (const stop of stops) {
      colorPrimitiveVariables.push({
        name: `${hue}-${stop}`,
        type: "COLOR",
        valuesByMode: {
          [lightModeId]: oklchToHex(hueMap[stop].light),
          [darkModeId]: oklchToHex(hueMap[stop].dark),
        },
      });
    }
  }
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/figma/transformer.test.ts
```

Expected: Color Primitives test passes. Colors collection test (lines 56-65) should also still pass — it only asserts on key names like `bg/canvas`, which are unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/figma/transformer.ts tests/figma/transformer.test.ts
git commit -m "feat(figma): emit hue-keyed Color Primitives (18 vars) replacing slot-based palette"
```

---

## Task 8: Figma transformer — Radius Primitives renaming

**Files:**
- Modify: `src/figma/transformer.ts` (Radius Primitives section, lines 207-220)
- Modify: `tests/figma/transformer.test.ts` (Radius Primitives test, lines 74-83)

The Figma Radius Primitives collection switches from raw px-as-name (`"4"`, `"24"`) to alias-name (`none`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `pill`). `circle` is excluded (50% is not numeric, can't be a Figma FLOAT variable).

- [ ] **Step 1: Update test expectations**

Replace `tests/figma/transformer.test.ts` lines 74-83:

```ts
it("creates Radius Primitives collection with sm/md/lg names", () => {
  const rp = figma.variableCollections.find((c) => c.name === "Radius Primitives");
  expect(rp).toBeTruthy();
  // 8 alias names — circle (50%) excluded as not numeric
  expect(rp!.variables.length).toBe(8);
  expect(rp!.variables.every((v) => v.type === "FLOAT")).toBe(true);
  const names = rp!.variables.map((v) => v.name);
  for (const n of ["none", "xs", "sm", "md", "lg", "xl", "2xl", "pill"]) {
    expect(names, `missing radius alias: ${n}`).toContain(n);
  }
  // No legacy raw-px names
  expect(names).not.toContain("4");
  expect(names).not.toContain("24");
});
```

- [ ] **Step 2: Run, expect failure**

```bash
npx vitest run tests/figma/transformer.test.ts -t "Radius Primitives"
```

- [ ] **Step 3: Update transformer.ts Radius Primitives section**

Replace lines 207-220 with:

```ts
  // Radius Primitives: 8 named scale stops (sm/md/lg/...). circle excluded
  // because 50% is not a numeric FLOAT.
  const RADIUS_ALIASES: Array<[string, number]> = [
    ["none", 0],
    ["xs", 2],
    ["sm", 4],
    ["md", 8],
    ["lg", 12],
    ["xl", 16],
    ["2xl", 24],
    ["pill", 9999],
  ];
  const radiusPrimitiveVariables: FigmaVariable[] = RADIUS_ALIASES.map(([name, value]) => ({
    name,
    type: "FLOAT",
    valuesByMode: { [radiusModeId]: value },
  }));
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/figma/transformer.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/figma/transformer.ts tests/figma/transformer.test.ts
git commit -m "feat(figma): rename Radius Primitives to sm/md/lg alias names"
```

---

## Task 9: Figma transformer — Shadow Primitives + Shadows collections

**Files:**
- Modify: `src/figma/transformer.ts` (effect styles section + new collections)
- Modify: `tests/figma/transformer.test.ts` (add shadow collection assertions)

Two new variable collections:
- **Shadow Primitives** — 5 vars (none/xs/sm/md/lg), type STRING (Figma supports STRING vars). Source: `tokens.elevation` mapped via the level→alias table.
- **Shadows** — 4 vars (hairline/card/popover/modal), type STRING, values are the same resolved shadow strings.

The existing `effectStyles` array (parsed shadow layers for Figma effect styles) stays as-is — it's used differently (effect styles, not variables). Only naming is updated to use the new alias names.

**Note:** Check if `FigmaVariable.type` already supports `"STRING"`. If not, decide whether to (a) add it or (b) emit shadow strings inside an effect-style, not a variable. Given Figma supports string variables, (a) is the right call. Verify `src/figma/types.ts` and update the discriminated union if needed.

- [ ] **Step 1: Verify FigmaVariable type union supports STRING**

```bash
grep -n "FigmaVariable" src/figma/types.ts
```

If the `type` field is currently `"COLOR" | "FLOAT"`, add `"STRING"` to the union. Also ensure `valuesByMode` allows `string` values for STRING type. Edit accordingly.

- [ ] **Step 2: Add failing tests**

Append to `tests/figma/transformer.test.ts`:

```ts
it("creates Shadow Primitives collection (base layer)", () => {
  const sp = figma.variableCollections.find((c) => c.name === "Shadow Primitives");
  expect(sp).toBeTruthy();
  expect(sp!.variables.length).toBe(5);
  const names = sp!.variables.map((v) => v.name);
  for (const n of ["none", "xs", "sm", "md", "lg"]) {
    expect(names, `missing shadow alias: ${n}`).toContain(n);
  }
});

it("creates Shadows collection (semantic layer)", () => {
  const s = figma.variableCollections.find((c) => c.name === "Shadows");
  expect(s).toBeTruthy();
  expect(s!.variables.length).toBe(4);
  const names = s!.variables.map((v) => v.name);
  for (const n of ["hairline", "card", "popover", "modal"]) {
    expect(names, `missing semantic shadow: ${n}`).toContain(n);
  }
});

it("Shadow effect styles use alias names (not raised/floating)", () => {
  const xs = figma.effectStyles.find((s) => s.name === "Xs");
  const sm = figma.effectStyles.find((s) => s.name === "Sm");
  expect(xs).toBeTruthy();
  expect(sm).toBeTruthy();
});
```

The earlier test `find((s) => s.name === "Raised")` (line 100) must be updated to `name === "Sm"`.

- [ ] **Step 3: Run, expect failure**

```bash
npx vitest run tests/figma/transformer.test.ts -t "Shadow"
```

- [ ] **Step 4: Add new collections in transformer.ts**

After the existing `radiusCollection` block (~line 235), add:

```ts
  // ── Shadow collections ─────────────────────────────────────────────────────
  const shadowModeId = "mode-default";

  /** Map elevation level → base alias. */
  const ELEVATION_TO_BASE: Record<string, string> = {
    none: "none",
    ring: "xs",
    raised: "sm",
    floating: "md",
    overlay: "lg",
  };
  const SHADOW_BASE_ORDER = ["none", "xs", "sm", "md", "lg"];

  // Resolve base alias → shadow string. Use tokens.elevation values.
  const shadowByAlias: Record<string, string> = {};
  for (const [levelName, value] of Object.entries(tokens.elevation)) {
    const alias = ELEVATION_TO_BASE[levelName];
    if (alias) shadowByAlias[alias] = value;
  }

  const shadowPrimitiveVariables: FigmaVariable[] = SHADOW_BASE_ORDER
    .filter((alias) => shadowByAlias[alias] !== undefined)
    .map((alias) => ({
      name: alias,
      type: "STRING",
      valuesByMode: { [shadowModeId]: shadowByAlias[alias] },
    }));

  const shadowPrimitivesCollection: FigmaVariableCollection = {
    name: "Shadow Primitives",
    modes: [{ name: "Default", modeId: shadowModeId }],
    variables: shadowPrimitiveVariables,
  };

  const SHADOW_SEMANTIC: Array<[string, string]> = [
    ["hairline", "xs"],
    ["card", "sm"],
    ["popover", "md"],
    ["modal", "lg"],
  ];
  const shadowSemanticVariables: FigmaVariable[] = SHADOW_SEMANTIC
    .filter(([, base]) => shadowByAlias[base] !== undefined)
    .map(([name, base]) => ({
      name,
      type: "STRING",
      valuesByMode: { [shadowModeId]: shadowByAlias[base] },
    }));

  const shadowsCollection: FigmaVariableCollection = {
    name: "Shadows",
    modes: [{ name: "Default", modeId: shadowModeId }],
    variables: shadowSemanticVariables,
  };
```

Also update `effectStyles` (lines 250-259) to use the new alias names:

```ts
  // ── Effect styles ──────────────────────────────────────────────────────────
  const effectStyles: FigmaEffectStyle[] = SHADOW_BASE_ORDER
    .map((alias) => {
      const shadowStr = shadowByAlias[alias];
      if (!shadowStr) return null;
      const shadows = parseShadowString(shadowStr);
      if (shadows.length === 0) return null;
      return {
        name: kebabToTitleCase(alias),  // "Xs", "Sm", "Md", "Lg"
        shadows,
      };
    })
    .filter((e): e is FigmaEffectStyle => e !== null);
```

Add the new collections to the return value:

```ts
  return {
    variableCollections: [
      colorPrimitivesCollection,
      colorsCollection,
      spacingCollection,
      radiusPrimitivesCollection,
      radiusCollection,
      shadowPrimitivesCollection,
      shadowsCollection,
    ],
    textStyles,
    effectStyles,
  };
```

- [ ] **Step 5: Update existing effectStyles test**

In `tests/figma/transformer.test.ts` line 100 area, replace:

```ts
it("creates effect styles from elevation tokens", () => {
  expect(figma.effectStyles.length).toBeGreaterThanOrEqual(2);
  const sm = figma.effectStyles.find((s) => s.name === "Sm");
  expect(sm).toBeTruthy();
  expect(sm!.shadows.length).toBeGreaterThanOrEqual(1);
});
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run tests/figma/transformer.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/figma/transformer.ts src/figma/types.ts tests/figma/transformer.test.ts
git commit -m "feat(figma): add Shadow Primitives + Shadows collections (base + semantic)"
```

---

## Task 10: Final integration verification + cleanup

**Files:**
- Run all tests
- Manual sanity check (CLI generate)

- [ ] **Step 1: Full test run**

```bash
npx vitest run
```

Expected: all green. If any test fails, fix and rerun.

- [ ] **Step 2: CLI smoke test**

```bash
npx tsx src/cli/index.ts --preset professional --brand "TestRun" --out /tmp/dl-check
ls /tmp/dl-check
cat /tmp/dl-check/design-tokens.css | head -50
cat /tmp/dl-check/tailwind.config.js | head -30
```

Verify:
- design-tokens.css has the 6 hue blocks + semantic block + radius primitives + shadow primitives + dark @media block.
- tailwind.config.js has nested `colors: { neutral: {...}, accent: {...}, red: {...}, ... }`.
- figma-system.json has 7 variableCollections.

- [ ] **Step 3: Verify dark-only-overrides-base invariant**

```bash
grep -A 100 "@media (prefers-color-scheme: dark)" /tmp/dl-check/design-tokens.css | grep -E "^\s+--"
```

Expected output: only `--color-{hue}-{stop}` lines. No `--color-bg-`, `--color-text-`, `--color-status-`, `--color-accent-primary`. If any semantic var leaks into the dark block, fix the css-export.

- [ ] **Step 4: Update lint/typecheck**

```bash
npx tsc --noEmit
```

Expected: no type errors. Address any drift.

- [ ] **Step 5: Stage + commit cleanup if needed**

```bash
git status
# If lingering changes:
git add -p
git commit -m "chore: post-refactor cleanup"
```

- [ ] **Step 6: Final commit / branch wrap**

If the branch is feature-named and ready for PR:

```bash
git log --oneline main..HEAD
```

Confirm the commit history reads cleanly. Otherwise the work is ready to push.

---

## Self-Review Notes

**Spec coverage:**
- §1 Color: Tasks 1, 2, 3 ✓
- §2 Spacing: no change needed (already alias-only); Task 10 verifies output ✓
- §3 Radius: Task 4 (CSS), Task 6 (Tailwind), Task 8 (Figma) ✓
- §4 Shadow: Task 5 (CSS), Task 6 (Tailwind), Task 9 (Figma) ✓
- §5 Tailwind: Task 6 ✓
- §6 Figma: Tasks 7, 8, 9 ✓
- §7 DESIGN.md: not changed (per spec) ✓
- §8 Files to touch: all listed ✓
- §10 Open Q1 (semantic key format): kept `"bg/canvas"` slash form — slash → dash translation happens at emit time in css-export and tailwind-export. Decision deferred to plan = answered in implementation.
- §10 Open Q2 (emit order): interleaved per category (current pattern preserved).
- §10 Open Q3 (exporter input): `DesignTokens.primitive.colors.<hue>` reachable cleanly — no need to thread `ColorCategoryTokens` directly.

**Type consistency:** `DesignTokens` shape unchanged at the type level; only the *values* inside `primitive.colors` change keys (palette → six hues). This is a runtime contract change but the `Record<string, Record<string, ColorStep>>` type signature handles it. `tokens.semantic` still `Record<string, string>`.

**Placeholder scan:** No TBDs. Every step has exact code or exact command.
