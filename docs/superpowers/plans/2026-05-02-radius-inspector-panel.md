# Radius Inspector Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the broken `web/` baseline against the current category-knob schema, then ship the first inspector panel (Radius) inside a new 3-column ResultPage layout.

**Architecture:** Phase A repairs `web/` so `tsc --noEmit` passes (DS components read `tokens.borderRadius/elevation`; typography reads `system.typographyTokens`; `WizardState` matches current `UserInputs`). Phase B introduces a right-rail Inspector with 6 category tabs (5 disabled placeholders + Radius active) and validates the sticky-preset override model end-to-end.

**Tech Stack:** React 19, TypeScript 5.7, Vite 6, Tailwind v4. Tests are typescript compile + visual verification in dev server (web/ has no unit-test runner; the project's vitest setup covers `src/` only).

**Source spec:** `docs/superpowers/specs/2026-05-02-knob-panel-design.md`

---

## Task 1: Branch + verify broken baseline

**Files:** none modified

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b feat/radius-inspector-panel
```

- [ ] **Step 2: Confirm web/ is broken at type-check (this is the starting state)**

Run: `cd web && pnpm exec tsc --noEmit 2>&1 | wc -l`
Expected: 30+ lines of errors, including:
- `'mood' does not exist on type 'DesignSystem'`
- `'buttonRadius' does not exist on type 'ArchetypePreset'`
- `'typography' does not exist on type 'DesignSystem'`
- `'precise' is not assignable to type 'MoodArchetype'`

This is what we're fixing. No commit.

---

## Task 2: Fix `lib/tokens.ts` — typography read + remove dead shadow helper

**Files:**
- Modify: `web/src/lib/tokens.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import type { DesignTokens, DesignSystem, Oklch } from "@core/schema/types.js";
import { formatOklch, formatOklchAlpha } from "@core/generator/color.js";

// ─── Token Resolution ───────────────────────────────────────────────────────

export function resolveOklch(tokens: DesignTokens, semanticKey: string): Oklch | null {
  const ref = tokens.semantic[semanticKey];
  if (!ref) return null;
  const lastDash = ref.lastIndexOf("-");
  const hue = ref.slice(0, lastDash);
  const step = ref.slice(lastDash + 1);
  return tokens.primitive.colors[hue]?.[step]?.light ?? null;
}

export function resolveColor(tokens: DesignTokens, key: string): string {
  const color = resolveOklch(tokens, key);
  return color ? formatOklch(color) : "oklch(0.8 0 0)";
}

export function resolveColorAlpha(tokens: DesignTokens, key: string, alpha: number): string {
  const color = resolveOklch(tokens, key);
  return color ? formatOklchAlpha(color, alpha) : "oklch(0.8 0 0)";
}

export function resolveComponentColor(tokens: DesignTokens, componentPath: string): string {
  const [comp, variant, prop] = componentPath.split(".");
  const semanticKey = tokens.component[comp]?.[variant]?.[prop];
  if (!semanticKey) return "oklch(0.8 0 0)";
  if (semanticKey === "transparent") return "transparent";
  return resolveColor(tokens, semanticKey);
}

// ─── Font ───────────────────────────────────────────────────────────────────

/** Returns the fully-resolved sans font chain from typographyTokens. */
export function buildFontFamily(system: DesignSystem): string {
  return system.typographyTokens.fontChains.sans;
}

/** Strips fallback chain to the first family name (for Google Fonts loader). */
export function primaryFontName(system: DesignSystem): string {
  const first = system.typographyTokens.fontChains.sans.split(",")[0].trim();
  return first.replace(/^["']|["']$/g, "");
}

export function loadGoogleFont(family: string): void {
  const id = `gf-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

export function parsePx(size: string): number {
  return parseInt(size, 10);
}

export function weightLabel(weight: number): string {
  const map: Record<number, string> = {
    100: "Thin", 200: "Extra Light", 300: "Light", 400: "Regular",
    500: "Medium", 600: "Semi Bold", 700: "Bold", 800: "Extra Bold", 900: "Black",
  };
  return map[weight] ?? String(weight);
}
```

Notes on what changed:
- `buildFontFamily` reads `system.typographyTokens.fontChains.sans` (which already includes the full fallback chain — no need to wrap).
- `primaryFontName` is a new helper that extracts the first family for `loadGoogleFont`.
- Removed `resolveShadow` and `SHADOW_MAP` — DS components will read `tokens.elevation.*` directly.
- Removed `getArchetype` import (no longer used here).

- [ ] **Step 2: Type-check (other files still broken; this file should be clean)**

Run: `cd web && pnpm exec tsc --noEmit 2>&1 | grep "lib/tokens"`
Expected: empty (no errors from `lib/tokens.ts`).

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/tokens.ts
git commit -m "refactor(web/lib): read typographyTokens; drop dead resolveShadow"
```

---

## Task 3: Fix `DSButton`

**Files:**
- Modify: `web/src/components/DSButton.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { resolveColor, resolveComponentColor, buildFontFamily } from "../lib/tokens";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface DSButtonProps {
  variant?: ButtonVariant;
  disabled?: boolean;
  children: React.ReactNode;
  tokens: DesignTokens;
  system: DesignSystem;
}

function computeStyles(
  variant: ButtonVariant,
  disabled: boolean,
  tokens: DesignTokens,
  system: DesignSystem,
) {
  const fontFamily = buildFontFamily(system);
  const borderRadius = tokens.borderRadius.button;
  const shadow = tokens.elevation.raised ?? "none";

  const brandPrimary = resolveComponentColor(tokens, "button.primary.bg");
  const bgSubtle = resolveColor(tokens, "bg/subtle");
  const textMuted = resolveColor(tokens, "text/muted");
  const borderDefault = resolveColor(tokens, "border/default");

  const base = {
    borderRadius,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 500,
    fontFamily,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };

  if (disabled) {
    return {
      ...base,
      backgroundColor: bgSubtle,
      color: textMuted,
      border: `1px solid ${borderDefault}`,
    };
  }

  switch (variant) {
    case "primary":
      return { ...base, backgroundColor: brandPrimary, color: "white", border: "none", boxShadow: shadow };
    case "secondary":
      return { ...base, backgroundColor: `color-mix(in oklch, ${brandPrimary} 10%, transparent)`, color: brandPrimary, border: "none", boxShadow: shadow };
    case "ghost":
      return { ...base, backgroundColor: "transparent", color: brandPrimary, border: `1.5px solid ${brandPrimary}` };
  }
}

export function DSButton({ variant = "primary", disabled = false, children, tokens, system }: DSButtonProps) {
  const styles = computeStyles(variant, disabled, tokens, system);
  return <button style={styles} disabled={disabled}>{children}</button>;
}
```

Notes:
- Dropped `getArchetype` import and `archetype.buttonRadius`/`archetype.shadowIntensity` reads.
- `borderRadius` now `tokens.borderRadius.button`.
- `boxShadow` reads `tokens.elevation.raised`. Generator-emitted elevation keys are `ring | raised | floating | overlay` (the `none` level is skipped at emit time). `raised` is the right level for buttons and cards; if the active elevation style maps `raised` to `"none"`, the level is omitted from the token map and we fall back to CSS `"none"`.

- [ ] **Step 2: Type-check this file**

Run: `cd web && pnpm exec tsc --noEmit 2>&1 | grep "DSButton"`
Expected: empty.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/DSButton.tsx
git commit -m "refactor(web/DSButton): read tokens.borderRadius/elevation; drop archetype"
```

---

## Task 4: Fix `DSInput`, `DSCard`, `DSBadge`, `DSDivider`

**Files:**
- Modify: `web/src/components/DSInput.tsx`
- Modify: `web/src/components/DSCard.tsx`
- Modify: `web/src/components/DSBadge.tsx`
- Modify: `web/src/components/DSDivider.tsx` (only if it imports `getArchetype` or `resolveShadow`; current code doesn't but verify)

- [ ] **Step 1: Rewrite `DSInput.tsx`**

```tsx
import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { resolveColor, buildFontFamily } from "../lib/tokens";

type InputState = "default" | "focus" | "error" | "disabled";

interface DSInputProps {
  state?: InputState;
  value?: string;
  tokens: DesignTokens;
  system: DesignSystem;
}

function computeStyles(state: InputState, tokens: DesignTokens, system: DesignSystem) {
  const fontFamily = buildFontFamily(system);
  const borderRadius = tokens.borderRadius.input;

  const bgBase = resolveColor(tokens, "bg/base");
  const bgSubtle = resolveColor(tokens, "bg/subtle");
  const textPrimary = resolveColor(tokens, "text/primary");
  const textMuted = resolveColor(tokens, "text/muted");
  const borderDefault = resolveColor(tokens, "border/default");
  const brandPrimary = resolveColor(tokens, "brand/primary");
  const errorColor = resolveColor(tokens, "status/error");

  const base = {
    width: "100%", padding: "8px 12px", borderRadius, fontSize: 14,
    outline: "none", boxSizing: "border-box" as const, fontFamily,
  };

  switch (state) {
    case "focus":    return { ...base, border: `2px solid ${brandPrimary}`, backgroundColor: bgBase, color: textPrimary };
    case "error":    return { ...base, border: `1px solid ${errorColor}`, backgroundColor: bgBase, color: textPrimary };
    case "disabled": return { ...base, border: `1px solid ${borderDefault}`, backgroundColor: bgSubtle, color: textMuted, cursor: "not-allowed", opacity: 0.7 };
    default:         return { ...base, border: `1px solid ${borderDefault}`, backgroundColor: bgBase, color: textPrimary };
  }
}

export function DSInput({ state = "default", value = "Input value", tokens, system }: DSInputProps) {
  const styles = computeStyles(state, tokens, system);
  return <input readOnly disabled={state === "disabled"} value={value} style={styles} />;
}
```

- [ ] **Step 2: Rewrite `DSCard.tsx`**

```tsx
import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { resolveColor, buildFontFamily } from "../lib/tokens";

interface DSCardProps {
  children: React.ReactNode;
  image?: { src: string; alt: string };
  tokens: DesignTokens;
  system: DesignSystem;
}

function computeStyles(tokens: DesignTokens, system: DesignSystem) {
  const fontFamily = buildFontFamily(system);
  const bgBase = resolveColor(tokens, "bg/base");
  const borderDefault = resolveColor(tokens, "border/default");
  const shadow = tokens.elevation.raised ?? "none";

  return {
    container: {
      borderRadius: tokens.borderRadius.card,
      border: `1px solid ${borderDefault}`,
      backgroundColor: bgBase,
      boxShadow: shadow,
      overflow: "hidden" as const,
      fontFamily,
    },
    image: { width: "100%", height: 160, objectFit: "cover" as const, display: "block" as const },
    body: { padding: "16px 20px" },
  };
}

export function DSCard({ children, image, tokens, system }: DSCardProps) {
  const styles = computeStyles(tokens, system);
  return (
    <div style={styles.container}>
      {image && <img src={image.src} alt={image.alt} style={styles.image} />}
      <div style={styles.body}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `DSBadge.tsx`**

```tsx
import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { resolveColor, resolveColorAlpha, buildFontFamily } from "../lib/tokens";

type BadgeVariant = "default" | "success" | "error" | "warning" | "info";

interface DSBadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  tokens: DesignTokens;
  system: DesignSystem;
}

function computeStyles(variant: BadgeVariant, tokens: DesignTokens, system: DesignSystem) {
  const fontFamily = buildFontFamily(system);
  const bgSubtle = resolveColor(tokens, "bg/subtle");
  const textPrimary = resolveColor(tokens, "text/primary");
  const borderDefault = resolveColor(tokens, "border/default");

  const base = {
    display: "inline-flex" as const, alignItems: "center" as const,
    padding: "3px 10px",
    borderRadius: tokens.borderRadius.pill,
    fontSize: 12, fontWeight: 500, fontFamily,
  };

  if (variant === "default") {
    return { ...base, backgroundColor: bgSubtle, color: textPrimary, border: `1px solid ${borderDefault}` };
  }

  const statusKey = `status/${variant}` as const;
  return {
    ...base,
    backgroundColor: resolveColorAlpha(tokens, statusKey, 0.09),
    color: resolveColor(tokens, statusKey),
    border: `1px solid ${resolveColorAlpha(tokens, statusKey, 0.25)}`,
  };
}

export function DSBadge({ variant = "default", children, tokens, system }: DSBadgeProps) {
  const styles = computeStyles(variant, tokens, system);
  return <span style={styles}>{children}</span>;
}
```

- [ ] **Step 4: Verify `DSDivider.tsx` requires no changes**

Run: `grep -E "getArchetype|resolveShadow|archetype\." web/src/components/DSDivider.tsx`
Expected: no matches. (DSDivider only uses `resolveColor` + `buildFontFamily`, both still valid.)

- [ ] **Step 5: Type-check the 4 files**

Run: `cd web && pnpm exec tsc --noEmit 2>&1 | grep -E "DSInput|DSCard|DSBadge|DSDivider"`
Expected: empty.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/DSInput.tsx web/src/components/DSCard.tsx web/src/components/DSBadge.tsx
git commit -m "refactor(web/DS): read tokens.borderRadius/elevation; drop archetype"
```

---

## Task 5: Fix `TypeScale`

**Files:**
- Modify: `web/src/components/TypeScale.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { useEffect } from "react";
import type { DesignSystem } from "@core/schema/types.js";
import { loadGoogleFont, primaryFontName, weightLabel } from "../lib/tokens";

const DISPLAY_KEYS = [
  "heading.xl", "heading.lg", "heading.md", "heading.sm", "heading.xs",
  "body.lg", "body.md", "body.sm",
  "caption.md", "caption.sm",
] as const;

export function TypeScale({ system }: { system: DesignSystem }) {
  const primaryFont = primaryFontName(system);

  useEffect(() => {
    if (primaryFont) loadGoogleFont(primaryFont);
  }, [primaryFont]);

  const profiles = system.typographyTokens.profiles;

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
          Type Scale — {primaryFont}
        </span>
      </div>
      <div className="divide-y divide-neutral-100">
        {DISPLAY_KEYS.filter((k) => profiles[k]).map((key) => {
          const t = profiles[key];
          return (
            <div key={key} className="px-5 py-3 flex items-baseline gap-4">
              <div className="shrink-0" style={{ width: 120 }}>
                <div className="text-neutral-400 uppercase tracking-wide" style={{ fontSize: 11 }}>
                  {key}
                </div>
                <div className="text-neutral-400 mt-0.5" style={{ fontSize: 10 }}>
                  {t.size}px / {weightLabel(t.weight)}
                </div>
              </div>
              <div
                className="truncate text-neutral-900"
                style={{
                  fontFamily: t.fontFamily,
                  fontSize: Math.min(t.size, 64),
                  fontWeight: t.weight,
                  letterSpacing: t.letterSpacing,
                  lineHeight: t.lineHeight,
                }}
              >
                The quick brown fox
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

Notes:
- `system.typography.hierarchy` no longer exists. Iterate `typographyTokens.profiles` (a `Record<string, TypographyToken>` keyed like `"heading.xl"`, `"body.md"`).
- `DISPLAY_KEYS` whitelists which keys to render and in what order — `profiles` includes button/card/nav/link/badge entries that aren't useful for a type-scale view.
- `t.size` is a number (px), `t.letterSpacing` is a string (e.g. `"-0.02em"`), `t.fontFamily` is the full chain — pass each through directly.

- [ ] **Step 2: Type-check this file**

Run: `cd web && pnpm exec tsc --noEmit 2>&1 | grep "TypeScale"`
Expected: empty.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/TypeScale.tsx
git commit -m "refactor(web/TypeScale): read typographyTokens.profiles"
```

---

## Task 6: Reshape `useGenerator.ts`

**Files:**
- Modify: `web/src/hooks/useGenerator.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import { useMemo } from "react";
import { generate } from "@core/generator/index.js";
import type { GenerateResult } from "@core/generator/index.js";
import type { ColorScales } from "@core/schema/types.js";
import type { RadiusInput } from "@core/schema/radius.js";
import type { PresetName } from "@core/schema/presets.js";
import { PRESET_NAMES } from "@core/schema/presets.js";
import { transformToFigma } from "@core/figma/transformer.js";
import type { FigmaDesignSystem } from "@core/figma/types.js";

export interface WizardState {
  brandName: string;
  brandColor: string;
  preset: PresetName;
  fontFamily: string;
  /** Per-category overrides. `undefined` = use preset value. */
  radiusKnobs?: RadiusInput;
}

export const DEFAULT_STATE: WizardState = {
  brandName: "Untitled",
  brandColor: "#5e6ad2",
  preset: "professional",
  fontFamily: "Inter",
};

export interface FullResult extends GenerateResult {
  figma: FigmaDesignSystem;
}

export function useGenerateResult(state: WizardState): FullResult | null {
  return useMemo(() => {
    try {
      const result = generate({
        brandName: state.brandName,
        brandColor: state.brandColor,
        fontFamily: state.fontFamily,
        preset: state.preset,
        radiusKnobs: state.radiusKnobs,
      });
      const figma = transformToFigma(result.tokens);
      return { ...result, figma };
    } catch {
      return null;
    }
  }, [state.brandName, state.brandColor, state.preset, state.fontFamily, state.radiusKnobs]);
}

export { PRESET_NAMES };
export type { PresetName, ColorScales, GenerateResult, RadiusInput };
```

Notes:
- `WizardState` field renames: `primaryColor` → `brandColor`, `mood: MoodArchetype` → `preset: PresetName`. Matches `UserInputs`.
- `radiusKnobs?: RadiusInput` added — undefined means "use preset".
- Default `preset` changed from invalid `"precise"` to valid `"professional"`.
- Re-exports `PRESET_NAMES` for the sidebar selector and `RadiusInput` for the inspector panel.

- [ ] **Step 2: Type-check this file**

Run: `cd web && pnpm exec tsc --noEmit 2>&1 | grep "useGenerator"`
Expected: empty (consumers will still error — those are fixed in later tasks).

- [ ] **Step 3: Commit**

```bash
git add web/src/hooks/useGenerator.ts
git commit -m "refactor(web/useGenerator): reshape WizardState to current UserInputs + radiusKnobs"
```

---

## Task 7: Fix `StepArchetype`

**Files:**
- Modify: `web/src/steps/StepArchetype.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { ARCHETYPES, getArchetype } from "@core/schema/archetypes.js";
import { PRESETS } from "@core/schema/presets.js";
import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import type { PresetName } from "../hooks/useGenerator";
import { DSButton } from "../components/DSButton";
import { DSInput } from "../components/DSInput";
import { DSCard } from "../components/DSCard";
import { DSBadge } from "../components/DSBadge";
import { DSDivider } from "../components/DSDivider";
import { resolveColor, resolveComponentColor, buildFontFamily } from "../lib/tokens";

const REFERENCES: Record<PresetName, string> = {
  "clean-minimal":    "Vercel, Linear, Notion",
  "warm-friendly":    "Airbnb, Claude, Stripe",
  "bold-energetic":   "Spotify, Coinbase, Supabase",
  "professional":     "Stripe, IBM, X.ai",
  "playful-creative": "Figma, Clay, Resend",
};

const PRESET_KEYS: PresetName[] = [
  "clean-minimal", "warm-friendly", "bold-energetic", "professional", "playful-creative",
];

export function StepArchetype({
  value,
  tokens,
  system,
  onChange,
}: {
  value: PresetName;
  tokens: DesignTokens | null;
  system: DesignSystem | null;
  onChange: (v: PresetName) => void;
}) {
  const selected = getArchetype(value);
  const brandColor = tokens ? resolveComponentColor(tokens, "button.primary.bg") : "#6b7280";

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">Choose your archetype</h2>
      <p className="text-neutral-500 mb-8">
        Each archetype defines a visual personality — radius, weight, shadow, and spacing.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-8">
        {PRESET_KEYS.map((key) => {
          const arch = ARCHETYPES[key];
          const presetRadiusStyle = PRESETS[key].radiusKnobs?.style ?? "standard";
          const previewRadius =
            presetRadiusStyle === "pill" ? 9999 :
            presetRadiusStyle === "sharp" ? 4 :
            presetRadiusStyle === "generous" ? 12 : 8;
          const isSelected = key === value;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={[
                "text-left p-4 rounded-lg border transition-all",
                isSelected ? "border-neutral-900 ring-2 ring-neutral-900 bg-white"
                           : "border-neutral-200 bg-white hover:border-neutral-400",
              ].join(" ")}
            >
              <div className="mb-3">
                <span
                  className="inline-block px-3 py-1 text-xs font-medium text-white"
                  style={{
                    borderRadius: previewRadius,
                    backgroundColor: isSelected ? brandColor : "#6b7280",
                  }}
                >
                  Button
                </span>
              </div>
              <div className="font-semibold text-sm text-neutral-900 mb-1">{arch.label}</div>
              <div className="text-xs text-neutral-500 mb-2 leading-snug">{arch.description}</div>
              <div className="text-[11px] text-neutral-400">{REFERENCES[key]}</div>
            </button>
          );
        })}
      </div>

      {tokens && system && (() => {
        const fontFamily = buildFontFamily(system);
        const textPrimary = resolveColor(tokens, "text/primary");
        const textMuted = resolveColor(tokens, "text/muted");
        const borderDefault = resolveColor(tokens, "border/default");
        const sectionClass = "mb-6";
        const labelClass = "text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3";

        return (
          <div className="border border-neutral-200 rounded-xl p-6 bg-neutral-50" style={{ fontFamily }}>
            <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-5">
              Component Preview — {selected.label}
            </div>

            <div className={sectionClass}>
              <div className={labelClass}>Buttons</div>
              <div className="flex flex-wrap gap-3 items-center">
                <DSButton variant="primary" tokens={tokens} system={system}>Primary</DSButton>
                <DSButton variant="secondary" tokens={tokens} system={system}>Secondary</DSButton>
                <DSButton variant="ghost" tokens={tokens} system={system}>Ghost</DSButton>
                <DSButton variant="primary" disabled tokens={tokens} system={system}>Disabled</DSButton>
              </div>
            </div>

            <div className={sectionClass}>
              <div className={labelClass}>Inputs</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontFamily }}>Default</div>
                  <DSInput tokens={tokens} system={system} value="Input value" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontFamily }}>Focus</div>
                  <DSInput state="focus" tokens={tokens} system={system} value="Focused input" />
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <div className={labelClass}>Card</div>
              <DSCard tokens={tokens} system={system}>
                <div style={{ fontSize: 16, fontWeight: 600, color: textPrimary, marginBottom: 8, fontFamily }}>
                  Card Title
                </div>
                <div style={{ fontSize: 14, color: textMuted, lineHeight: 1.6, fontFamily }}>
                  Sample card content.
                </div>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderDefault}`, display: "flex", gap: 8 }}>
                  <DSButton variant="primary" tokens={tokens} system={system}>Action</DSButton>
                  <DSButton variant="ghost" tokens={tokens} system={system}>Cancel</DSButton>
                </div>
              </DSCard>
            </div>

            <div className={sectionClass}>
              <div className={labelClass}>Badges</div>
              <div className="flex flex-wrap gap-2">
                <DSBadge variant="default" tokens={tokens} system={system}>Default</DSBadge>
                <DSBadge variant="success" tokens={tokens} system={system}>Success</DSBadge>
                <DSBadge variant="error" tokens={tokens} system={system}>Error</DSBadge>
              </div>
            </div>

            <div className={sectionClass}>
              <div className={labelClass}>Divider</div>
              <DSDivider label="Section label" tokens={tokens} system={system} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
```

Notes:
- Mood vocabulary updated to `PresetName` (clean-minimal / warm-friendly / bold-energetic / professional / playful-creative).
- Mini-button preview radius derives from `PRESETS[key].radiusKnobs?.style` (since `archetype.buttonRadius` is gone).
- Image card removed from preview to reduce surface area; restored in the result page.

- [ ] **Step 2: Type-check this file**

Run: `cd web && pnpm exec tsc --noEmit 2>&1 | grep "StepArchetype"`
Expected: empty.

- [ ] **Step 3: Commit**

```bash
git add web/src/steps/StepArchetype.tsx
git commit -m "refactor(web/StepArchetype): preset vocabulary; derive preview radius from PRESETS"
```

---

## Task 8: Fix `StepFont`

**Files:**
- Modify: `web/src/steps/StepFont.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { useEffect, useState } from "react";
import type { DesignSystem } from "@core/schema/types.js";
import type { PresetName } from "../hooks/useGenerator";
import { loadGoogleFont } from "../lib/tokens";
import { TypeScale } from "../components/TypeScale";

interface FontSuggestion { name: string; fallback: string }

const SUGGESTED_FONTS: Record<PresetName, FontSuggestion[]> = {
  "clean-minimal":    [{ name: "Inter", fallback: "system-ui, sans-serif" }, { name: "Geist", fallback: "system-ui, sans-serif" }, { name: "Manrope", fallback: "system-ui, sans-serif" }],
  "warm-friendly":    [{ name: "Inter", fallback: "system-ui, sans-serif" }, { name: "DM Sans", fallback: "system-ui, sans-serif" }, { name: "Plus Jakarta Sans", fallback: "system-ui, sans-serif" }],
  "bold-energetic":   [{ name: "Inter", fallback: "system-ui, sans-serif" }, { name: "Space Grotesk", fallback: "system-ui, sans-serif" }, { name: "Sora", fallback: "system-ui, sans-serif" }],
  "professional":     [{ name: "Inter", fallback: "system-ui, sans-serif" }, { name: "IBM Plex Sans", fallback: "system-ui, sans-serif" }, { name: "Source Sans 3", fallback: "system-ui, sans-serif" }],
  "playful-creative": [{ name: "Inter", fallback: "system-ui, sans-serif" }, { name: "Outfit", fallback: "system-ui, sans-serif" }, { name: "Quicksand", fallback: "system-ui, sans-serif" }],
};

const DEFAULT_FONT: Record<PresetName, string> = {
  "clean-minimal": "Inter",
  "warm-friendly": "Inter",
  "bold-energetic": "Inter",
  "professional": "Inter",
  "playful-creative": "Inter",
};

export function StepFont({
  value,
  preset,
  onChange,
  system,
}: {
  value: string;
  preset: PresetName;
  onChange: (v: string) => void;
  system: DesignSystem | null;
}) {
  const suggestedFonts = SUGGESTED_FONTS[preset];
  const suggestedNames = suggestedFonts.map((f) => f.name);
  const isCustom = !suggestedNames.includes(value);

  const [customInput, setCustomInput] = useState(isCustom ? value : "");
  const [showCustom, setShowCustom] = useState(isCustom);

  useEffect(() => {
    if (value) loadGoogleFont(value);
  }, [value]);

  useEffect(() => {
    const newNames = SUGGESTED_FONTS[preset].map((f) => f.name);
    if (!newNames.includes(value) && !showCustom) {
      onChange(DEFAULT_FONT[preset]);
    }
  }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">Choose your font</h2>
      <p className="text-neutral-500 mb-8">
        Select from fonts suited to your archetype, or enter any Google Fonts family.
      </p>

      <div className="flex flex-col gap-2 mb-8">
        {suggestedFonts.map((font) => {
          const isSelected = !showCustom && value === font.name;
          return (
            <label
              key={font.name}
              className={[
                "flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all",
                isSelected ? "border-neutral-900 ring-2 ring-neutral-900 bg-white"
                           : "border-neutral-200 bg-white hover:border-neutral-400",
              ].join(" ")}
            >
              <input
                type="radio" name="font" value={font.name} checked={isSelected}
                onChange={() => { setShowCustom(false); onChange(font.name); }}
                className="accent-neutral-900"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-neutral-900">{font.name}</div>
                <div
                  className="text-base text-neutral-600 truncate"
                  style={{ fontFamily: `'${font.name}', ${font.fallback}` }}
                >
                  The quick brown fox
                </div>
              </div>
            </label>
          );
        })}

        <label
          className={[
            "flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all",
            showCustom ? "border-neutral-900 ring-2 ring-neutral-900 bg-white"
                       : "border-neutral-200 bg-white hover:border-neutral-400",
          ].join(" ")}
        >
          <input
            type="radio" name="font" value="custom" checked={showCustom}
            onChange={() => { setShowCustom(true); if (customInput) onChange(customInput); }}
            className="accent-neutral-900"
          />
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-900">Custom</span>
            {showCustom && (
              <input
                type="text" value={customInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setCustomInput(v);
                  if (v.trim()) onChange(v.trim());
                }}
                placeholder="e.g. Lato, Raleway, Nunito…"
                className="flex-1 text-sm px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:border-neutral-600"
                autoFocus onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </label>
      </div>

      {system && <TypeScale system={system} />}
    </div>
  );
}
```

Notes:
- `mood: MoodArchetype` prop renamed to `preset: PresetName`.
- Local `SUGGESTED_FONTS` and `DEFAULT_FONT` maps replace `archetype.suggestedFonts`/`archetype.defaultFont` (which were removed). All 5 keys filled — `Inter` is always first as a safe baseline.

- [ ] **Step 2: Type-check this file**

Run: `cd web && pnpm exec tsc --noEmit 2>&1 | grep "StepFont"`
Expected: empty.

- [ ] **Step 3: Commit**

```bash
git add web/src/steps/StepFont.tsx
git commit -m "refactor(web/StepFont): preset vocabulary; static suggested-fonts map"
```

---

## Task 9: Fix `App.tsx` and `ResultPage` to use new state names; verify whole-app type-check

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/result/ResultPage.tsx`

- [ ] **Step 1: Update `App.tsx` — rename props passed to steps and ResultPage**

Replace the file contents:

```tsx
import { useState } from "react";
import { ProgressBar } from "./components/ProgressBar";
import { StepColor } from "./steps/StepColor";
import { StepArchetype } from "./steps/StepArchetype";
import { StepFont } from "./steps/StepFont";
import { ResultPage } from "./result/ResultPage";
import { DEFAULT_STATE, useGenerateResult, type WizardState, type PresetName } from "./hooks/useGenerator";

type Screen = "wizard" | "result";

export function App() {
  const [screen, setScreen] = useState<Screen>("wizard");
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  const result = useGenerateResult(state);

  const update = (partial: Partial<WizardState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  if (screen === "result") {
    return (
      <ResultPage
        state={state}
        result={result}
        onChange={update}
        onBack={() => { setScreen("wizard"); setStep(2); }}
      />
    );
  }

  const next = () => { if (step < 2) setStep(step + 1); else setScreen("result"); };
  const back = () => { if (step > 0) setStep(step - 1); };

  return (
    <div className="min-h-screen bg-white antialiased">
      <div className="max-w-3xl mx-auto px-4">
        <ProgressBar current={step} />
        <div className="py-8">
          {step === 0 && (
            <StepColor
              value={state.brandColor}
              onChange={(c: string) => update({ brandColor: c })}
              scales={result?.system.colors ?? null}
            />
          )}
          {step === 1 && (
            <StepArchetype
              value={state.preset}
              tokens={result?.tokens ?? null}
              system={result?.system ?? null}
              onChange={(p: PresetName) => update({ preset: p })}
            />
          )}
          {step === 2 && (
            <StepFont
              value={state.fontFamily}
              preset={state.preset}
              onChange={(f: string) => update({ fontFamily: f })}
              system={result?.system ?? null}
            />
          )}
        </div>
        <div className="flex justify-between pb-12">
          <button
            onClick={back}
            className={`px-6 py-2 rounded text-sm transition-colors ${
              step === 0 ? "invisible" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Back
          </button>
          <button
            onClick={next}
            className="px-6 py-2 rounded bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors"
          >
            {step === 2 ? "Generate" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `ResultPage.tsx` — rename `state.primaryColor` → `state.brandColor`, `state.mood` → `state.preset`; replace mood radio grid with preset radio grid; replace `archetype.suggestedFonts` with the static map**

Open `web/src/result/ResultPage.tsx` and apply these changes:

(a) Update imports + add static font map at top of file:

```tsx
import { useEffect, useState } from "react";
import type { WizardState, FullResult, PresetName } from "../hooks/useGenerator";
import { ARCHETYPES, getArchetype } from "@core/schema/archetypes.js";
import { ColorScale } from "../components/ColorScale";
import { DSButton } from "../components/DSButton";
import { DSInput } from "../components/DSInput";
import { DSCard } from "../components/DSCard";
import { DSBadge } from "../components/DSBadge";
import { DSDivider } from "../components/DSDivider";
import { TypeScale } from "../components/TypeScale";
import { DownloadPanel } from "./DownloadPanel";
import { loadGoogleFont, resolveColor, buildFontFamily } from "../lib/tokens";

const SUGGESTED_FONTS: Record<PresetName, string[]> = {
  "clean-minimal":    ["Inter", "Geist", "Manrope"],
  "warm-friendly":    ["Inter", "DM Sans", "Plus Jakarta Sans"],
  "bold-energetic":   ["Inter", "Space Grotesk", "Sora"],
  "professional":     ["Inter", "IBM Plex Sans", "Source Sans 3"],
  "playful-creative": ["Inter", "Outfit", "Quicksand"],
};
```

(b) Inside the component, update the references:

- Replace `getArchetype(state.mood)` with `getArchetype(state.preset)`.
- Replace `archetype.suggestedFonts` and `suggestedFonts.map((f) => f.name)` lookups with `SUGGESTED_FONTS[state.preset]` (array of strings — adapt downstream code: `suggestedNames` is just `SUGGESTED_FONTS[state.preset]`; `suggestedFonts.map(f => <option ... value={f.name}>{f.name}</option>)` becomes `SUGGESTED_FONTS[state.preset].map(f => <option key={f} value={f}>{f}</option>)`).
- Replace `state.primaryColor` (2 occurrences in the input fields) with `state.brandColor` and `onChange({ primaryColor: ... })` with `onChange({ brandColor: ... })`.
- Replace `state.mood` with `state.preset` in the radio-group section. `name="result-mood"` → `name="result-preset"`. `state.mood === a.mood` → `state.preset === a.mood`. `onChange({ mood: a.mood as MoodArchetype })` → `onChange({ preset: a.mood as PresetName })`. (The `ARCHETYPES` map's keys still match `PresetName` because `MoodArchetype` and `PresetName` share the same string union.)
- The header line `{state.mood} archetype — {state.fontFamily}` becomes `{state.preset} archetype — {state.fontFamily}`.

- [ ] **Step 3: Type-check the whole web/ tree**

Run: `cd web && pnpm exec tsc --noEmit`
Expected: zero errors. (If any remain, fix in place.)

- [ ] **Step 4: Smoke-test the dev server**

Run: `cd web && pnpm dev` (in another terminal or background).
Open `http://localhost:5173`. Verify:
- 3-step wizard renders without console errors.
- Each archetype card shows a small button preview with its preset's radius.
- Reaching the result page renders color scales, components, and the type scale.

- [ ] **Step 5: Commit baseline repair**

```bash
git add web/src/App.tsx web/src/result/ResultPage.tsx
git commit -m "refactor(web): rename primaryColor→brandColor, mood→preset; tsc clean"
```

---

## Task 10: Build inspector skeleton (`Inspector`, `CategoryTabs`, `KnobRow`, `ResetButton`)

**Files:**
- Create: `web/src/inspector/Inspector.tsx`
- Create: `web/src/inspector/CategoryTabs.tsx`
- Create: `web/src/inspector/KnobRow.tsx`
- Create: `web/src/inspector/ResetButton.tsx`

- [ ] **Step 1: Create `KnobRow.tsx`**

```tsx
import type { ReactNode } from "react";

interface KnobRowProps {
  selected: boolean;
  isPreset?: boolean;
  isDefault?: boolean;
  onClick: () => void;
  preview: ReactNode;
  label: string;
  tokens: string;
}

export function KnobRow({ selected, isPreset, isDefault, onClick, preview, label, tokens }: KnobRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-left",
        selected
          ? "border-[1.5px] border-neutral-900 bg-neutral-50"
          : "border border-neutral-200 bg-white hover:border-neutral-400",
      ].join(" ")}
    >
      <div className="shrink-0 flex items-center gap-1" style={{ width: 44 }}>
        {preview}
      </div>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className={selected ? "text-neutral-900 font-medium text-[13px]" : "text-neutral-700 text-[13px]"}>
          {label}
        </span>
        {selected && isPreset && (
          <span className="text-[9px] text-neutral-400 uppercase tracking-wider">preset</span>
        )}
        {selected && isDefault && (
          <span className="text-[9px] text-neutral-400 uppercase tracking-wider">default</span>
        )}
      </div>
      <span className="font-mono text-[10px] text-neutral-400 tabular-nums shrink-0">{tokens}</span>
    </button>
  );
}
```

- [ ] **Step 2: Create `ResetButton.tsx`**

```tsx
export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1"
    >
      <span>↺</span> Reset to preset
    </button>
  );
}
```

- [ ] **Step 3: Create `CategoryTabs.tsx`**

```tsx
export type InspectorCategory = "color" | "typography" | "spacing" | "radius" | "elevation" | "component";

const TABS: { key: InspectorCategory; label: string; enabled: boolean }[] = [
  { key: "color",      label: "Color",      enabled: false },
  { key: "typography", label: "Type",       enabled: false },
  { key: "spacing",    label: "Spacing",    enabled: false },
  { key: "radius",     label: "Radius",     enabled: true  },
  { key: "elevation",  label: "Elevation",  enabled: false },
  { key: "component",  label: "Component",  enabled: false },
];

export function CategoryTabs({
  active,
  onChange,
}: {
  active: InspectorCategory;
  onChange: (cat: InspectorCategory) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 rounded-md">
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            disabled={!t.enabled}
            onClick={() => t.enabled && onChange(t.key)}
            className={[
              "px-2 py-1.5 text-[11px] rounded transition-all",
              !t.enabled       ? "text-neutral-300 cursor-not-allowed" :
              isActive         ? "bg-white text-neutral-900 shadow-sm font-medium" :
                                 "text-neutral-600 hover:text-neutral-900",
            ].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create `Inspector.tsx`**

```tsx
import { useState } from "react";
import type { WizardState } from "../hooks/useGenerator";
import { CategoryTabs, type InspectorCategory } from "./CategoryTabs";
import { RadiusPanel } from "./panels/RadiusPanel";

interface InspectorProps {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}

export function Inspector({ state, onChange }: InspectorProps) {
  const [active, setActive] = useState<InspectorCategory>("radius");

  return (
    <aside className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-neutral-200 lg:h-screen lg:sticky lg:top-0 lg:overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Inspector
        </div>
        <CategoryTabs active={active} onChange={setActive} />
        <div className="pt-2">
          {active === "radius" && <RadiusPanel state={state} onChange={onChange} />}
          {active !== "radius" && (
            <div className="text-[12px] text-neutral-400 italic px-1 py-8 text-center">
              Coming soon — this category panel ships in a follow-up slice.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 5: Type-check (RadiusPanel doesn't exist yet — error expected)**

Run: `cd web && pnpm exec tsc --noEmit 2>&1 | grep "Inspector\|CategoryTabs\|KnobRow\|ResetButton"`
Expected: only errors about missing `./panels/RadiusPanel` — Task 11 fixes this.

- [ ] **Step 6: Commit (skeleton not yet wired)**

```bash
git add web/src/inspector/
git commit -m "feat(web/inspector): skeleton — Inspector, CategoryTabs, KnobRow, ResetButton"
```

---

## Task 11: Build `RadiusPanel`

**Files:**
- Create: `web/src/inspector/panels/RadiusPanel.tsx`

- [ ] **Step 1: Create the panel**

```tsx
import type { WizardState } from "../../hooks/useGenerator";
import type { RadiusStyle } from "@core/schema/radius.js";
import { RADIUS_STYLE_OPTIONS, STYLE_PROFILES, DEFAULT_RADIUS_KNOBS } from "@core/schema/radius.js";
import { PRESETS } from "@core/schema/presets.js";
import { KnobRow } from "../KnobRow";
import { ResetButton } from "../ResetButton";

const TOKEN_LABEL: Record<RadiusStyle, string> = {
  sharp:    "4·4·8",
  standard: "8·8·12",
  generous: "12·8·16",
  pill:     "∞·∞·12",
};

function previewRadiusPx(style: RadiusStyle, slot: "button" | "input"): number | string {
  const v = STYLE_PROFILES[style][slot];
  return v === "pill" ? 9999 : v;
}

function MiniPreview({ style }: { style: RadiusStyle }) {
  const btn = previewRadiusPx(style, "button");
  const inp = previewRadiusPx(style, "input");
  return (
    <>
      <div style={{ width: 22, height: 12, background: "#262626", borderRadius: btn }} />
      <div style={{ width: 16, height: 12, background: "#fff", border: "1px solid #d4d4d0", borderRadius: inp }} />
    </>
  );
}

export function RadiusPanel({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}) {
  const presetStyle = PRESETS[state.preset].radiusKnobs?.style;
  const overriddenStyle = state.radiusKnobs?.style;
  const effective: RadiusStyle = overriddenStyle ?? presetStyle ?? DEFAULT_RADIUS_KNOBS.style;
  const isOverridden = overriddenStyle !== undefined;

  function selectStyle(style: RadiusStyle) {
    onChange({ radiusKnobs: { style } });
  }

  function resetCategory() {
    onChange({ radiusKnobs: undefined });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
            Radius
            {isOverridden && <span className="w-1.5 h-1.5 rounded-full bg-neutral-900" title="Overridden" />}
          </div>
          <div className="text-[11px] text-neutral-500">Corner geometry</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-[10px] text-neutral-400 uppercase tracking-wider px-1">Style</div>
        {RADIUS_STYLE_OPTIONS.map((style) => (
          <KnobRow
            key={style}
            selected={effective === style}
            isPreset={presetStyle === style}
            isDefault={presetStyle == null && DEFAULT_RADIUS_KNOBS.style === style}
            onClick={() => selectStyle(style)}
            preview={<MiniPreview style={style} />}
            label={style}
            tokens={TOKEN_LABEL[style]}
          />
        ))}
      </div>

      {isOverridden && (
        <div className="pt-2">
          <ResetButton onClick={resetCategory} />
        </div>
      )}
    </div>
  );
}
```

Notes:
- `effective` selection drives the `selected` highlight: user override > preset > schema default.
- Clicking a row always writes `{ radiusKnobs: { style } }` — even if it equals the preset (EC-1: store as override, show ↺ Reset + `preset` badge).
- ResetButton only renders when `isOverridden`.
- `MiniPreview` uses pure CSS (no DSButton recursion).

- [ ] **Step 2: Type-check the panel**

Run: `cd web && pnpm exec tsc --noEmit 2>&1 | grep "RadiusPanel\|Inspector"`
Expected: empty.

- [ ] **Step 3: Commit**

```bash
git add web/src/inspector/panels/
git commit -m "feat(web/inspector): RadiusPanel — first knob with sticky-preset model"
```

---

## Task 12: Wire `ResultPage` to 3-column layout

**Files:**
- Modify: `web/src/result/ResultPage.tsx`

- [ ] **Step 1: Import the Inspector at the top of the file**

Add to existing imports:

```tsx
import { Inspector } from "../inspector/Inspector";
```

- [ ] **Step 2: Wrap the existing layout in a 3-column flex**

Find the outer container in `ResultPage` (currently `<div className="min-h-screen bg-white antialiased flex flex-col md:flex-row">`) and change it to:

```tsx
<div className="min-h-screen bg-white antialiased flex flex-col lg:flex-row">
  {/* Left sidebar: Basics — keep existing <aside> as-is */}
  ...
  {/* Main preview: keep existing <main> */}
  ...
  {/* NEW: Right rail Inspector */}
  <Inspector state={state} onChange={onChange} />
</div>
```

The breakpoint changes from `md` to `lg` so the 3-column only triggers when there's enough room (≥ 1024px). On smaller screens, all three stack vertically.

- [ ] **Step 3: Type-check**

Run: `cd web && pnpm exec tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Visual verification (manual)**

Run: `cd web && pnpm dev` (background)

Verify in browser at `http://localhost:5173`:
1. Complete the wizard → reach result page.
2. Confirm 3 columns at ≥ 1024px viewport: left basics, center preview, right inspector with `Radius` tab active.
3. Click each radius style row (sharp / standard / generous / pill) — each should immediately update the buttons, inputs, and cards in the center preview to use the new corner geometry.
4. The `↺ Reset to preset` link appears only after first override. Clicking it returns the preview to the preset's radius and removes the link.
5. Switch the preset radio (e.g., professional → playful-creative). If a radius override is active, it persists (sticky-preset model). Resetting then yields the new preset's radius.
6. The 5 disabled tabs (Color / Type / Spacing / Elevation / Component) show "Coming soon" body.

- [ ] **Step 5: Commit**

```bash
git add web/src/result/ResultPage.tsx
git commit -m "feat(web/ResultPage): 3-column layout with inspector rail"
```

---

## Task 13: Final verification + push

**Files:** none modified

- [ ] **Step 1: Whole-tree type-check**

Run: `cd web && pnpm exec tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Backend tests still pass (sanity — no `src/` files were touched)**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 3: Build verification**

Run: `cd web && pnpm build`
Expected: build succeeds with no type or runtime errors.

- [ ] **Step 4: DoD check (from spec §EC-4)**

- [x] `pnpm exec tsc --noEmit` (web/) passes — confirmed in Step 1.
- [ ] All 4 radius styles render visually different in main preview — confirmed via Step 4 of Task 12.
- [ ] ↺ Reset returns preview to active preset's radius — confirmed via Step 4 of Task 12.

- [ ] **Step 5: Push the branch**

```bash
git push -u origin feat/radius-inspector-panel
```

Done. PR can be opened separately when ready for review.
