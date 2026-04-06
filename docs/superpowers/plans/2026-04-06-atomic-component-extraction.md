# Atomic Component Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract reusable atomic components from wizard steps and result page so UI building blocks are defined once and shared across all screens.

**Architecture:** Shared token resolution utilities in `lib/tokens.ts`. Seven atomic components in `components/`. Wizard steps and ResultPage consume atomic components instead of inline rendering. Three result files deleted.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, OKLCH color via `@core/generator/color.js`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `web/src/lib/tokens.ts` | Token resolution utilities + shared helpers |
| Create | `web/src/components/ColorScale.tsx` | Color scale palette with step header |
| Create | `web/src/components/DSButton.tsx` | Design system button (primary/secondary/ghost/disabled) |
| Create | `web/src/components/DSInput.tsx` | Design system input (default/focus/error/disabled) |
| Create | `web/src/components/DSCard.tsx` | Design system card container |
| Create | `web/src/components/DSBadge.tsx` | Design system badge (default/success/error/warning/info) |
| Create | `web/src/components/DSDivider.tsx` | Design system divider with optional label |
| Create | `web/src/components/TypeScale.tsx` | Typography scale display |
| Modify | `web/src/steps/StepColor.tsx` | Replace inline scale → `<ColorScale>` |
| Modify | `web/src/steps/StepArchetype.tsx` | Replace inline preview → atomic components; receive `tokens`+`system` |
| Modify | `web/src/steps/StepFont.tsx` | Replace inline type preview → `<TypeScale>` |
| Modify | `web/src/result/ResultPage.tsx` | Replace preview components → atomic components |
| Modify | `web/src/App.tsx` | Pass `tokens`+`system` to StepArchetype |
| Delete | `web/src/result/ColorPreview.tsx` | Replaced by `ColorScale` |
| Delete | `web/src/result/ComponentPreview.tsx` | Replaced by individual atomic components |
| Delete | `web/src/result/TypePreview.tsx` | Replaced by `TypeScale` |

---

### Task 1: Create token resolution utilities

**Files:**
- Create: `web/src/lib/tokens.ts`

- [ ] **Step 1: Create `web/src/lib/tokens.ts`**

```ts
import type { DesignTokens, DesignSystem, Oklch } from "@core/schema/types.js";
import { formatOklch, formatOklchAlpha } from "@core/generator/color.js";
import { getArchetype } from "@core/schema/archetypes.js";

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
  if (!semanticKey || semanticKey === "transparent") return semanticKey ?? "oklch(0.8 0 0)";
  return resolveColor(tokens, semanticKey);
}

// ─── Shadow ─────────────────────────────────────────────────────────────────

const SHADOW_MAP: Record<string, string> = {
  whisper: "0 1px 2px rgba(0,0,0,0.04)",
  subtle: "0 1px 3px rgba(0,0,0,0.08)",
  medium: "0 4px 12px rgba(0,0,0,0.12)",
  dramatic: "0 8px 24px rgba(0,0,0,0.2)",
};

export function resolveShadow(intensity: string): string {
  return SHADOW_MAP[intensity] ?? SHADOW_MAP.subtle;
}

// ─── Font ───────────────────────────────────────────────────────────────────

export function buildFontFamily(system: DesignSystem): string {
  return system.typography.families.primary
    ? `'${system.typography.families.primary}', system-ui, sans-serif`
    : "system-ui, sans-serif";
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

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/haneul/Projects/design-system-starter/web && npx tsc --noEmit --pretty`
Expected: No errors related to `lib/tokens.ts`

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/tokens.ts
git commit -m "refactor(web): extract token resolution utilities to lib/tokens.ts"
```

---

### Task 2: Create ColorScale component

**Files:**
- Create: `web/src/components/ColorScale.tsx`

- [ ] **Step 1: Create `web/src/components/ColorScale.tsx`**

```tsx
import type { ColorScales } from "@core/schema/types.js";
import { formatOklch } from "@core/generator/color.js";

function getStepKeys(scales: ColorScales): string[] {
  const first = Object.values(scales)[0];
  if (!first) return [];
  return Object.keys(first).sort((a, b) => Number(a) - Number(b));
}

export function ColorScale({ scales }: { scales: ColorScales }) {
  const steps = getStepKeys(scales);

  return (
    <div className="space-y-3">
      {/* Step header row */}
      <div className="flex gap-0.5">
        {steps.map((step) => (
          <div key={step} className="flex-1 text-center text-[10px] font-mono text-neutral-400">
            {step}
          </div>
        ))}
      </div>

      {/* Color rows */}
      {Object.entries(scales).map(([hue, scale]) => (
        <div key={hue}>
          <div className="text-xs font-medium text-neutral-500 mb-1 capitalize">{hue}</div>
          <div className="flex gap-0.5">
            {Object.entries(scale)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([step, vals]) => (
                <div
                  key={step}
                  className="flex-1 h-9 first:rounded-l last:rounded-r relative group"
                  style={{ backgroundColor: formatOklch(vals.light) }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/70 text-white leading-tight">
                      {step}
                    </span>
                    <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-black/70 text-white leading-tight mt-0.5">
                      {formatOklch(vals.light)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/haneul/Projects/design-system-starter/web && npx tsc --noEmit --pretty`
Expected: No errors related to `ColorScale.tsx`

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ColorScale.tsx
git commit -m "feat(web): add ColorScale atomic component with step header"
```

---

### Task 3: Create DSButton component

**Files:**
- Create: `web/src/components/DSButton.tsx`

- [ ] **Step 1: Create `web/src/components/DSButton.tsx`**

```tsx
import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { getArchetype } from "@core/schema/archetypes.js";
import { resolveColor, resolveComponentColor, resolveShadow, buildFontFamily } from "../lib/tokens";

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
  const archetype = getArchetype(system.mood);
  const fontFamily = buildFontFamily(system);
  const borderRadius = archetype.buttonRadius;
  const shadow = resolveShadow(archetype.shadowIntensity);

  const brandPrimary = resolveComponentColor(tokens, "button.primary.bg");
  const bgSubtle = resolveColor(tokens, "bg/subtle");
  const textPrimary = resolveColor(tokens, "text/primary");
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
      return {
        ...base,
        backgroundColor: brandPrimary,
        color: "white",
        border: "none",
        boxShadow: shadow,
      };
    case "secondary":
      return {
        ...base,
        backgroundColor: `color-mix(in oklch, ${brandPrimary} 10%, transparent)`,
        color: brandPrimary,
        border: "none",
        boxShadow: shadow,
      };
    case "ghost":
      return {
        ...base,
        backgroundColor: "transparent",
        color: brandPrimary,
        border: `1.5px solid ${brandPrimary}`,
      };
  }
}

export function DSButton({
  variant = "primary",
  disabled = false,
  children,
  tokens,
  system,
}: DSButtonProps) {
  const styles = computeStyles(variant, disabled, tokens, system);

  return (
    <button style={styles} disabled={disabled}>
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/haneul/Projects/design-system-starter/web && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web/src/components/DSButton.tsx
git commit -m "feat(web): add DSButton atomic component"
```

---

### Task 4: Create DSInput component

**Files:**
- Create: `web/src/components/DSInput.tsx`

- [ ] **Step 1: Create `web/src/components/DSInput.tsx`**

```tsx
import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { getArchetype } from "@core/schema/archetypes.js";
import { resolveColor, buildFontFamily } from "../lib/tokens";

type InputState = "default" | "focus" | "error" | "disabled";

interface DSInputProps {
  state?: InputState;
  value?: string;
  tokens: DesignTokens;
  system: DesignSystem;
}

function computeStyles(
  state: InputState,
  tokens: DesignTokens,
  system: DesignSystem,
) {
  const archetype = getArchetype(system.mood);
  const fontFamily = buildFontFamily(system);
  const borderRadius = archetype.inputRadius;

  const bgBase = resolveColor(tokens, "bg/base");
  const bgSubtle = resolveColor(tokens, "bg/subtle");
  const textPrimary = resolveColor(tokens, "text/primary");
  const textMuted = resolveColor(tokens, "text/muted");
  const borderDefault = resolveColor(tokens, "border/default");
  const brandPrimary = resolveColor(tokens, "brand/primary");
  const errorColor = resolveColor(tokens, "status/error");

  const base = {
    width: "100%",
    padding: "8px 12px",
    borderRadius,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily,
  };

  switch (state) {
    case "focus":
      return {
        ...base,
        border: `2px solid ${brandPrimary}`,
        backgroundColor: bgBase,
        color: textPrimary,
      };
    case "error":
      return {
        ...base,
        border: `1px solid ${errorColor}`,
        backgroundColor: bgBase,
        color: textPrimary,
      };
    case "disabled":
      return {
        ...base,
        border: `1px solid ${borderDefault}`,
        backgroundColor: bgSubtle,
        color: textMuted,
        cursor: "not-allowed",
        opacity: 0.7,
      };
    default:
      return {
        ...base,
        border: `1px solid ${borderDefault}`,
        backgroundColor: bgBase,
        color: textPrimary,
      };
  }
}

export function DSInput({
  state = "default",
  value = "Input value",
  tokens,
  system,
}: DSInputProps) {
  const styles = computeStyles(state, tokens, system);

  return (
    <input
      readOnly
      disabled={state === "disabled"}
      value={value}
      style={styles}
    />
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/haneul/Projects/design-system-starter/web && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web/src/components/DSInput.tsx
git commit -m "feat(web): add DSInput atomic component"
```

---

### Task 5: Create DSCard component

**Files:**
- Create: `web/src/components/DSCard.tsx`

- [ ] **Step 1: Create `web/src/components/DSCard.tsx`**

```tsx
import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { getArchetype } from "@core/schema/archetypes.js";
import { resolveColor, resolveShadow, buildFontFamily } from "../lib/tokens";

interface DSCardProps {
  children: React.ReactNode;
  tokens: DesignTokens;
  system: DesignSystem;
}

function computeStyles(tokens: DesignTokens, system: DesignSystem) {
  const archetype = getArchetype(system.mood);
  const fontFamily = buildFontFamily(system);

  const bgBase = resolveColor(tokens, "bg/base");
  const borderDefault = resolveColor(tokens, "border/default");
  const shadow = resolveShadow(archetype.shadowIntensity);

  return {
    container: {
      borderRadius: archetype.cardRadius,
      border: `1px solid ${borderDefault}`,
      backgroundColor: bgBase,
      boxShadow: shadow,
      padding: "16px 20px",
      fontFamily,
    },
  };
}

export function DSCard({ children, tokens, system }: DSCardProps) {
  const { container } = computeStyles(tokens, system);

  return <div style={container}>{children}</div>;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/haneul/Projects/design-system-starter/web && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web/src/components/DSCard.tsx
git commit -m "feat(web): add DSCard atomic component"
```

---

### Task 6: Create DSBadge component

**Files:**
- Create: `web/src/components/DSBadge.tsx`

- [ ] **Step 1: Create `web/src/components/DSBadge.tsx`**

```tsx
import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { getArchetype } from "@core/schema/archetypes.js";
import { resolveColor, resolveColorAlpha, buildFontFamily } from "../lib/tokens";

type BadgeVariant = "default" | "success" | "error" | "warning" | "info";

interface DSBadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  tokens: DesignTokens;
  system: DesignSystem;
}

function computeStyles(
  variant: BadgeVariant,
  tokens: DesignTokens,
  system: DesignSystem,
) {
  const archetype = getArchetype(system.mood);
  const fontFamily = buildFontFamily(system);

  const bgSubtle = resolveColor(tokens, "bg/subtle");
  const textPrimary = resolveColor(tokens, "text/primary");
  const borderDefault = resolveColor(tokens, "border/default");

  const base = {
    display: "inline-flex" as const,
    alignItems: "center" as const,
    padding: "3px 10px",
    borderRadius: archetype.pillRadius,
    fontSize: 12,
    fontWeight: 500,
    fontFamily,
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

export function DSBadge({
  variant = "default",
  children,
  tokens,
  system,
}: DSBadgeProps) {
  const styles = computeStyles(variant, tokens, system);

  return <span style={styles}>{children}</span>;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/haneul/Projects/design-system-starter/web && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web/src/components/DSBadge.tsx
git commit -m "feat(web): add DSBadge atomic component"
```

---

### Task 7: Create DSDivider component

**Files:**
- Create: `web/src/components/DSDivider.tsx`

- [ ] **Step 1: Create `web/src/components/DSDivider.tsx`**

```tsx
import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { resolveColor, buildFontFamily } from "../lib/tokens";

interface DSDividerProps {
  label?: string;
  tokens: DesignTokens;
  system: DesignSystem;
}

function computeStyles(tokens: DesignTokens, system: DesignSystem) {
  const fontFamily = buildFontFamily(system);
  const borderDefault = resolveColor(tokens, "border/default");
  const textMuted = resolveColor(tokens, "text/muted");

  return {
    line: { flex: 1, height: 1, backgroundColor: borderDefault },
    label: {
      fontSize: 12,
      color: textMuted,
      fontWeight: 500,
      fontFamily,
      whiteSpace: "nowrap" as const,
    },
  };
}

export function DSDivider({ label, tokens, system }: DSDividerProps) {
  const styles = computeStyles(tokens, system);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={styles.line} />
      {label && <span style={styles.label}>{label}</span>}
      {label && <div style={styles.line} />}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/haneul/Projects/design-system-starter/web && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web/src/components/DSDivider.tsx
git commit -m "feat(web): add DSDivider atomic component"
```

---

### Task 8: Create TypeScale component

**Files:**
- Create: `web/src/components/TypeScale.tsx`

- [ ] **Step 1: Create `web/src/components/TypeScale.tsx`**

```tsx
import { useEffect } from "react";
import type { DesignSystem } from "@core/schema/types.js";
import { loadGoogleFont, parsePx, weightLabel } from "../lib/tokens";

export function TypeScale({ system }: { system: DesignSystem }) {
  const primaryFont = system.typography.families.primary;

  useEffect(() => {
    if (primaryFont) loadGoogleFont(primaryFont);
  }, [primaryFont]);

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
          Type Scale — {primaryFont}
        </span>
      </div>
      <div className="divide-y divide-neutral-100">
        {system.typography.hierarchy.map((entry) => {
          const px = parsePx(entry.size);
          return (
            <div key={entry.role} className="px-5 py-3 flex items-baseline gap-4">
              <div className="shrink-0" style={{ width: 120 }}>
                <div
                  className="text-neutral-400 uppercase tracking-wide"
                  style={{ fontSize: 11 }}
                >
                  {entry.role}
                </div>
                <div className="text-neutral-400 mt-0.5" style={{ fontSize: 10 }}>
                  {px}px / {weightLabel(entry.weight)}
                </div>
              </div>
              <div
                className="truncate text-neutral-900"
                style={{
                  fontFamily: `'${entry.font}', system-ui, sans-serif`,
                  fontSize: Math.min(px, 64),
                  fontWeight: entry.weight,
                  letterSpacing: entry.letterSpacing,
                  lineHeight: entry.lineHeight,
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

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/haneul/Projects/design-system-starter/web && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web/src/components/TypeScale.tsx
git commit -m "feat(web): add TypeScale atomic component"
```

---

### Task 9: Wire StepColor to use ColorScale

**Files:**
- Modify: `web/src/steps/StepColor.tsx`

- [ ] **Step 1: Rewrite `StepColor.tsx` to use `ColorScale`**

```tsx
import type { ColorScales } from "@core/schema/types.js";
import { ColorScale } from "../components/ColorScale";

export function StepColor({
  value,
  onChange,
  scales,
}: {
  value: string;
  onChange: (v: string) => void;
  scales: ColorScales | null;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">
        Pick your primary color
      </h2>
      <p className="text-neutral-500 mb-8">
        Everything else is derived from this single color.
      </p>

      <div className="flex items-center gap-4 mb-8">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 rounded cursor-pointer border-0 p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
            else if (v.length <= 7) onChange(v);
          }}
          className="font-mono text-sm px-3 py-2 border border-neutral-300 rounded w-28"
          placeholder="#5e6ad2"
        />
      </div>

      {scales && <ColorScale scales={scales} />}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/haneul/Projects/design-system-starter/web && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web/src/steps/StepColor.tsx
git commit -m "refactor(web): wire StepColor to use ColorScale component"
```

---

### Task 10: Wire StepArchetype to use atomic components

**Files:**
- Modify: `web/src/steps/StepArchetype.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Rewrite `StepArchetype.tsx` to use atomic components**

The archetype selection grid (2x2 cards with mini button preview) stays the same. The "Component Preview" section at the bottom is replaced with atomic components. Props change: `brandColor` is removed, `tokens` and `system` are added.

```tsx
import { ARCHETYPES, getArchetype } from "@core/schema/archetypes.js";
import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import type { MoodArchetype } from "../hooks/useGenerator";
import { DSButton } from "../components/DSButton";
import { DSInput } from "../components/DSInput";
import { DSCard } from "../components/DSCard";
import { resolveColor, resolveComponentColor, buildFontFamily } from "../lib/tokens";

const REFERENCES: Record<MoodArchetype, string> = {
  precise: "Stripe, IBM, X.ai",
  confident: "Vercel, Notion, Airbnb",
  expressive: "Linear, Apple, Claude",
  modern: "Supabase, Resend, Coinbase",
};

const ARCHETYPE_KEYS: MoodArchetype[] = ["precise", "confident", "expressive", "modern"];

export function StepArchetype({
  value,
  tokens,
  system,
  onChange,
}: {
  value: MoodArchetype;
  tokens: DesignTokens | null;
  system: DesignSystem | null;
  onChange: (v: MoodArchetype) => void;
}) {
  const selected = getArchetype(value);
  const brandColor = tokens ? resolveComponentColor(tokens, "button.primary.bg") : "#6b7280";

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">
        Choose your archetype
      </h2>
      <p className="text-neutral-500 mb-8">
        Each archetype defines a visual personality — radius, weight, shadow, and spacing.
      </p>

      {/* 2×2 grid of archetype cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {ARCHETYPE_KEYS.map((key) => {
          const arch = ARCHETYPES[key];
          const isSelected = key === value;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={[
                "text-left p-4 rounded-lg border transition-all",
                isSelected
                  ? "border-neutral-900 ring-2 ring-neutral-900 bg-white"
                  : "border-neutral-200 bg-white hover:border-neutral-400",
              ].join(" ")}
            >
              {/* Mini button preview */}
              <div className="mb-3">
                <span
                  className="inline-block px-3 py-1 text-xs font-medium text-white"
                  style={{
                    borderRadius: arch.buttonRadius,
                    backgroundColor: isSelected ? brandColor : "#6b7280",
                  }}
                >
                  Button
                </span>
              </div>

              <div className="font-semibold text-sm text-neutral-900 mb-1">
                {arch.label}
              </div>
              <div className="text-xs text-neutral-500 mb-2 leading-snug">
                {arch.description}
              </div>
              <div className="text-[11px] text-neutral-400">
                {REFERENCES[key]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Component preview using atomic components */}
      {tokens && system && (
        <div className="border border-neutral-200 rounded-xl p-6 bg-neutral-50">
          <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
            Component Preview — {selected.label}
          </div>

          {/* Buttons row */}
          <div className="flex flex-wrap gap-3 mb-5">
            <DSButton variant="primary" tokens={tokens} system={system}>Primary</DSButton>
            <DSButton variant="secondary" tokens={tokens} system={system}>Secondary</DSButton>
            <DSButton variant="ghost" tokens={tokens} system={system}>Ghost</DSButton>
          </div>

          {/* Card */}
          <div className="mb-4">
            <DSCard tokens={tokens} system={system}>
              <div
                className="text-sm font-medium mb-1"
                style={{ color: resolveColor(tokens, "text/primary"), fontFamily: buildFontFamily(system) }}
              >
                Card Component
              </div>
              <div
                className="text-xs"
                style={{ color: resolveColor(tokens, "text/muted"), fontFamily: buildFontFamily(system) }}
              >
                radius: {selected.cardRadius} · shadow: {selected.shadowIntensity}
              </div>
            </DSCard>
          </div>

          {/* Input */}
          <div>
            <DSInput tokens={tokens} system={system} value="Input field" />
            <div className="text-[11px] text-neutral-400 mt-1">
              input radius: {selected.inputRadius}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `App.tsx` to pass `tokens` and `system` to StepArchetype**

In `App.tsx`, change the StepArchetype rendering from:

```tsx
<StepArchetype
  value={state.mood}
  brandColor={result ? getBrandColor(result) : state.primaryColor}
  onChange={(m: MoodArchetype) => update({ mood: m })}
/>
```

to:

```tsx
<StepArchetype
  value={state.mood}
  tokens={result?.tokens ?? null}
  system={result?.system ?? null}
  onChange={(m: MoodArchetype) => update({ mood: m })}
/>
```

Also remove the `getBrandColor` function and the `import { oklchToHex }` since they are no longer used in App.tsx.

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/haneul/Projects/design-system-starter/web && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add web/src/steps/StepArchetype.tsx web/src/App.tsx
git commit -m "refactor(web): wire StepArchetype to use atomic components"
```

---

### Task 11: Wire StepFont to use TypeScale

**Files:**
- Modify: `web/src/steps/StepFont.tsx`

- [ ] **Step 1: Rewrite `StepFont.tsx` to use `TypeScale`**

Replace the inline typography preview with `<TypeScale>`. Remove local `loadGoogleFont` and `parsePx` (now in `lib/tokens`). Keep `loadGoogleFont` import for the font selector's dynamic loading.

```tsx
import { useEffect, useState } from "react";
import { getArchetype } from "@core/schema/archetypes.js";
import type { DesignSystem } from "@core/schema/types.js";
import type { MoodArchetype } from "../hooks/useGenerator";
import { loadGoogleFont } from "../lib/tokens";
import { TypeScale } from "../components/TypeScale";

export function StepFont({
  value,
  mood,
  onChange,
  system,
}: {
  value: string;
  mood: MoodArchetype;
  onChange: (v: string) => void;
  system: DesignSystem | null;
}) {
  const archetype = getArchetype(mood);
  const suggestedFonts = archetype.suggestedFonts;

  const suggestedNames = suggestedFonts.map((f) => f.name);
  const isCustom = !suggestedNames.includes(value);

  const [customInput, setCustomInput] = useState(isCustom ? value : "");
  const [showCustom, setShowCustom] = useState(isCustom);

  useEffect(() => {
    if (value) loadGoogleFont(value);
  }, [value]);

  useEffect(() => {
    const newArchetype = getArchetype(mood);
    const newNames = newArchetype.suggestedFonts.map((f) => f.name);
    if (!newNames.includes(value) && !showCustom) {
      onChange(newArchetype.defaultFont);
    }
  }, [mood]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSuggestedSelect(name: string) {
    setShowCustom(false);
    onChange(name);
  }

  function handleCustomToggle() {
    setShowCustom(true);
    if (customInput) {
      onChange(customInput);
    }
  }

  function handleCustomInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setCustomInput(v);
    if (v.trim()) {
      onChange(v.trim());
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">
        Choose your font
      </h2>
      <p className="text-neutral-500 mb-8">
        Select from fonts suited to your archetype, or enter any Google Fonts family.
      </p>

      {/* Font selector */}
      <div className="flex flex-col gap-2 mb-8">
        {suggestedFonts.map((font) => {
          const isSelected = !showCustom && value === font.name;
          return (
            <label
              key={font.name}
              className={[
                "flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all",
                isSelected
                  ? "border-neutral-900 ring-2 ring-neutral-900 bg-white"
                  : "border-neutral-200 bg-white hover:border-neutral-400",
              ].join(" ")}
            >
              <input
                type="radio"
                name="font"
                value={font.name}
                checked={isSelected}
                onChange={() => handleSuggestedSelect(font.name)}
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

        {/* Custom option */}
        <label
          className={[
            "flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all",
            showCustom
              ? "border-neutral-900 ring-2 ring-neutral-900 bg-white"
              : "border-neutral-200 bg-white hover:border-neutral-400",
          ].join(" ")}
        >
          <input
            type="radio"
            name="font"
            value="custom"
            checked={showCustom}
            onChange={handleCustomToggle}
            className="accent-neutral-900"
          />
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-900">Custom</span>
            {showCustom && (
              <input
                type="text"
                value={customInput}
                onChange={handleCustomInputChange}
                placeholder="e.g. Lato, Raleway, Nunito…"
                className="flex-1 text-sm px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:border-neutral-600"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </label>
      </div>

      {/* Typography preview */}
      {system && <TypeScale system={system} />}
    </div>
  );
}
```

- [ ] **Step 2: Update `App.tsx` to pass `system` instead of `typography` to StepFont**

In `App.tsx`, change:

```tsx
<StepFont
  value={state.fontFamily}
  mood={state.mood}
  onChange={(f: string) => update({ fontFamily: f })}
  typography={result?.system.typography ?? null}
/>
```

to:

```tsx
<StepFont
  value={state.fontFamily}
  mood={state.mood}
  onChange={(f: string) => update({ fontFamily: f })}
  system={result?.system ?? null}
/>
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/haneul/Projects/design-system-starter/web && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add web/src/steps/StepFont.tsx web/src/App.tsx
git commit -m "refactor(web): wire StepFont to use TypeScale component"
```

---

### Task 12: Wire ResultPage to use atomic components

**Files:**
- Modify: `web/src/result/ResultPage.tsx`

- [ ] **Step 1: Rewrite `ResultPage.tsx` to use atomic components**

Replace imports of `ColorPreview`, `ComponentPreview`, `TypePreview` with atomic components. Remove local `loadGoogleFont` (now in `lib/tokens`).

The main preview area changes from three monolithic components to a composition of atomic components:

```tsx
import { useEffect, useState } from "react";
import type { WizardState, MoodArchetype, FullResult } from "../hooks/useGenerator";
import { ARCHETYPES, getArchetype } from "../hooks/useGenerator";
import { ColorScale } from "../components/ColorScale";
import { DSButton } from "../components/DSButton";
import { DSInput } from "../components/DSInput";
import { DSCard } from "../components/DSCard";
import { DSBadge } from "../components/DSBadge";
import { DSDivider } from "../components/DSDivider";
import { TypeScale } from "../components/TypeScale";
import { DownloadPanel } from "./DownloadPanel";
import { loadGoogleFont, resolveColor, buildFontFamily } from "../lib/tokens";

export function ResultPage({
  state,
  result,
  onChange,
  onBack,
}: {
  state: WizardState;
  result: FullResult | null;
  onChange: (p: Partial<WizardState>) => void;
  onBack: () => void;
}) {
  const archetype = getArchetype(state.mood);
  const suggestedFonts = archetype.suggestedFonts;
  const suggestedNames = suggestedFonts.map((f) => f.name);
  const isCustom = !suggestedNames.includes(state.fontFamily);
  const [customFontInput, setCustomFontInput] = useState(isCustom ? state.fontFamily : "");
  const [showCustomFont, setShowCustomFont] = useState(isCustom);

  useEffect(() => {
    if (state.fontFamily) loadGoogleFont(state.fontFamily);
  }, [state.fontFamily]);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-500 text-sm">Generating your design system…</div>
      </div>
    );
  }

  const archetypeEntries = Object.values(ARCHETYPES);
  const { system, tokens } = result;
  const sectionClass = "mb-8";
  const labelClass = "text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3";
  const textPrimary = resolveColor(tokens, "text/primary");
  const textMuted = resolveColor(tokens, "text/muted");
  const fontFamily = buildFontFamily(system);
  const borderDefault = resolveColor(tokens, "border/default");

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* Sidebar — unchanged */}
      <aside className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-neutral-200 md:h-screen md:sticky md:top-0 md:overflow-y-auto">
        <div className="p-5 space-y-6">
          <button
            onClick={onBack}
            className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back to wizard
          </button>

          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              Brand Name
            </label>
            <input
              type="text"
              value={state.brandName}
              onChange={(e) => onChange({ brandName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors"
              placeholder="Untitled"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                className="w-9 h-9 rounded cursor-pointer border border-neutral-200 p-0.5 bg-white"
              />
              <input
                type="text"
                value={state.primaryColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange({ primaryColor: v });
                  else if (v.length <= 7) onChange({ primaryColor: v });
                }}
                className="flex-1 font-mono text-sm px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-500"
                placeholder="#5e6ad2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              Archetype
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {archetypeEntries.map((a) => (
                <label
                  key={a.mood}
                  className={[
                    "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm",
                    state.mood === a.mood
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="result-mood"
                    value={a.mood}
                    checked={state.mood === a.mood}
                    onChange={() => onChange({ mood: a.mood as MoodArchetype })}
                    className="sr-only"
                  />
                  {a.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
              Font Family
            </label>
            <select
              value={showCustomFont ? "custom" : state.fontFamily}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "custom") {
                  setShowCustomFont(true);
                  if (customFontInput) onChange({ fontFamily: customFontInput });
                } else {
                  setShowCustomFont(false);
                  onChange({ fontFamily: val });
                }
              }}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-500 bg-white appearance-none"
            >
              {suggestedFonts.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
            {showCustomFont && (
              <input
                type="text"
                value={customFontInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setCustomFontInput(v);
                  if (v.trim()) onChange({ fontFamily: v.trim() });
                }}
                className="mt-2 w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-500"
                placeholder="e.g. Lato, Raleway, Nunito…"
                autoFocus
              />
            )}
          </div>

          <DownloadPanel result={result} />
        </div>
      </aside>

      {/* Main preview area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-12">
          {/* Header */}
          <div>
            <h1
              className="text-3xl font-semibold text-neutral-900 mb-1"
              style={{ fontFamily: `'${state.fontFamily}', system-ui, sans-serif` }}
            >
              {state.brandName || "Untitled"} Design System
            </h1>
            <p className="text-neutral-500 text-sm capitalize">
              {state.mood} archetype — {state.fontFamily}
            </p>
          </div>

          {/* Color scales */}
          <section>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Color Scales</h2>
            <ColorScale scales={system.colors} />
          </section>

          {/* Components */}
          <section style={{ fontFamily }}>
            <h2 className="text-lg font-semibold text-neutral-900 mb-6">Components</h2>

            {/* Buttons */}
            <div className={sectionClass}>
              <div className={labelClass}>Buttons</div>
              <div className="flex flex-wrap gap-3 items-center">
                <DSButton variant="primary" tokens={tokens} system={system}>Primary</DSButton>
                <DSButton variant="secondary" tokens={tokens} system={system}>Secondary</DSButton>
                <DSButton variant="ghost" tokens={tokens} system={system}>Ghost</DSButton>
                <DSButton variant="primary" disabled tokens={tokens} system={system}>Disabled</DSButton>
              </div>
            </div>

            {/* Inputs */}
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
                <div>
                  <div style={{ fontSize: 11, color: resolveColor(tokens, "status/error"), marginBottom: 4, fontFamily }}>Error</div>
                  <DSInput state="error" tokens={tokens} system={system} value="Invalid value" />
                  <div style={{ fontSize: 11, color: resolveColor(tokens, "status/error"), marginTop: 4, fontFamily }}>
                    This field has an error
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontFamily }}>Disabled</div>
                  <DSInput state="disabled" tokens={tokens} system={system} value="Disabled input" />
                </div>
              </div>
            </div>

            {/* Card */}
            <div className={sectionClass}>
              <div className={labelClass}>Card</div>
              <div style={{ maxWidth: 360 }}>
                <DSCard tokens={tokens} system={system}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: textPrimary, marginBottom: 8, fontFamily }}>
                    Card Title
                  </div>
                  <div style={{ fontSize: 14, color: textMuted, lineHeight: 1.6, fontFamily }}>
                    This is a sample card component showing how content sits within the design system's card container.
                  </div>
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderDefault}`, display: "flex", gap: 8 }}>
                    <DSButton variant="primary" tokens={tokens} system={system}>Action</DSButton>
                    <DSButton variant="ghost" tokens={tokens} system={system}>Cancel</DSButton>
                  </div>
                </DSCard>
              </div>
            </div>

            {/* Badges */}
            <div className={sectionClass}>
              <div className={labelClass}>Badges</div>
              <div className="flex flex-wrap gap-2">
                <DSBadge variant="default" tokens={tokens} system={system}>Default</DSBadge>
                <DSBadge variant="success" tokens={tokens} system={system}>Success</DSBadge>
                <DSBadge variant="error" tokens={tokens} system={system}>Error</DSBadge>
                <DSBadge variant="warning" tokens={tokens} system={system}>Warning</DSBadge>
                <DSBadge variant="info" tokens={tokens} system={system}>Info</DSBadge>
              </div>
            </div>

            {/* Divider */}
            <div className={sectionClass}>
              <div className={labelClass}>Divider</div>
              <DSDivider label="Section label" tokens={tokens} system={system} />
            </div>
          </section>

          {/* Typography */}
          <section>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Typography</h2>
            <TypeScale system={system} />
          </section>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/haneul/Projects/design-system-starter/web && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web/src/result/ResultPage.tsx
git commit -m "refactor(web): wire ResultPage to use atomic components"
```

---

### Task 13: Delete replaced files and verify build

**Files:**
- Delete: `web/src/result/ColorPreview.tsx`
- Delete: `web/src/result/ComponentPreview.tsx`
- Delete: `web/src/result/TypePreview.tsx`

- [ ] **Step 1: Delete the three replaced files**

```bash
git rm web/src/result/ColorPreview.tsx web/src/result/ComponentPreview.tsx web/src/result/TypePreview.tsx
```

- [ ] **Step 2: Remove stale re-export of `ColorScales` type from `useGenerator.ts` if needed**

Check `web/src/hooks/useGenerator.ts` — it currently re-exports `ColorScales`. This is still used by the `ColorScale` component (via `@core/schema/types.js` directly), and by `StepColor` (via `useGenerator`). Verify the type import path in `StepColor.tsx` — it was changed to import from `@core/schema/types.js` directly, which is correct.

No changes needed in `useGenerator.ts`.

- [ ] **Step 3: Full type check**

Run: `cd /Users/haneul/Projects/design-system-starter/web && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 4: Build the project**

Run: `cd /Users/haneul/Projects/design-system-starter/web && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 5: Visual smoke test**

Run: `cd /Users/haneul/Projects/design-system-starter/web && npm run dev`

Verify in browser:
1. Step 0 (Color): Color scale palette shows with step header row (50, 100, ..., 950) and hover tooltips with OKLCH values
2. Step 1 (Archetype): Component Preview section shows token-resolved buttons, card, and input
3. Step 2 (Font): Typography preview renders using the `TypeScale` component with role/size/weight metadata
4. ResultPage: All sections (Color Scales, Components, Typography) render identically to before, using the same atomic components as the wizard steps

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(web): delete replaced preview components (ColorPreview, ComponentPreview, TypePreview)"
```
