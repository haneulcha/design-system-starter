# Color System Downstream Update Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `color.ts`의 새 OKLCH 기반 컬러 시스템에 맞춰 모든 다운스트림 코드를 업데이트한다.

**Architecture:** `ColorStep`이 `{ light: string; dark: string }` (hex)에서 `{ light: Oklch; dark: Oklch }`로 변경됨. 컬러 스케일 키가 hue name(`blue`, `red`)에서 role name(`brand`, `accent`)으로 변경됨. 각 소비자는 용도에 맞는 변환 함수(`formatOklch`, `oklchToHex`)를 사용하여 Oklch를 렌더링한다.

**Tech Stack:** TypeScript, culori, Vitest, React (web UI)

**Breaking changes summary:**

| 변경 | Before | After |
|------|--------|-------|
| `ColorStep.light/dark` | `string` (hex) | `Oklch` object |
| scale keys | hue name (`blue`, `cyan`) | role name (`brand`, `accent`) |
| `generateScales` signature | `(hex, undertone, colorCharacter)` | `(hex, config?)` |
| `detectHueName` | exported | removed |
| `colorCharacter` param | in `UserInputs` | removed |
| `generateSemantic` refs | `"blue-700"`, `"green-200"` | `"brand-700"`, `"green-200"` |

---

### Task 1: Add `oklchToHex` utility to color.ts

**Files:**
- Modify: `src/generator/color.ts:1-6`
- Test: `tests/generator/color.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `tests/generator/color.test.ts`, inside a new describe block at the end:

```ts
import {
  generateScales,
  parsePrimary,
  formatOklch,
  oklchToHex,
  toCssCustomProperties,
} from "../../src/generator/color.js";

// ... existing tests ...

describe("oklchToHex", () => {
  it("converts oklch to 6-digit hex", () => {
    const hex = oklchToHex({ l: 0.5, c: 0.15, h: 250 });
    expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("black returns near-black hex", () => {
    const hex = oklchToHex({ l: 0, c: 0, h: 0 });
    expect(hex).toBe("#000000");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/generator/color.test.ts`
Expected: FAIL — `oklchToHex` is not exported

- [ ] **Step 3: Implement oklchToHex**

In `src/generator/color.ts`, update the import and add the export:

```ts
import { oklch, parse, formatHex } from "culori";
import type { Oklch, ColorStep, ColorScales } from "../schema/types.js";

// ... existing code ...

export const oklchToHex = (color: Oklch): string =>
  formatHex({ mode: "oklch", l: color.l, c: color.c, h: color.h }) ?? "#000000";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/generator/color.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/generator/color.ts tests/generator/color.test.ts
git commit -m "feat(color): add oklchToHex conversion utility"
```

---

### Task 2: Update types — `PrimitiveTokens`, remove `colorCharacter` from `UserInputs`

**Files:**
- Modify: `src/schema/types.ts:11-19, 214-217`

- [ ] **Step 1: Update `PrimitiveTokens` to use `ColorStep`**

In `src/schema/types.ts`, change `PrimitiveTokens`:

```ts
// Before:
export interface PrimitiveTokens {
  colors: Record<string, Record<string, { light: string; dark: string }>>;
}

// After:
export interface PrimitiveTokens {
  colors: Record<string, Record<string, ColorStep>>;
}
```

- [ ] **Step 2: Remove `colorCharacter` from `UserInputs`**

In `src/schema/types.ts`:

```ts
// Before:
export interface UserInputs {
  brandName: string;
  primaryColor: string;
  mood: MoodArchetype;
  fontFamily: string;
  colorCharacter: ColorCharacter;
}

// After:
export interface UserInputs {
  brandName: string;
  primaryColor: string;
  mood: MoodArchetype;
  fontFamily: string;
}
```

Keep `ColorCharacter` type definition — it may be used elsewhere.

- [ ] **Step 3: Commit**

```bash
git add src/schema/types.ts
git commit -m "refactor(types): align PrimitiveTokens with Oklch, remove colorCharacter from UserInputs"
```

---

### Task 3: Update `tokens.ts` — Semantic layer role references

**Files:**
- Modify: `src/generator/tokens.ts:23-104`

Semantic references must change from detected hue names (`blue-700`) to fixed role names (`brand-700`). The auto-detection logic in `generateSemantic` is no longer needed.

- [ ] **Step 1: Simplify `generateSemantic`**

Replace the entire `generateSemantic` function:

```ts
export function generateSemantic(
  primitive: PrimitiveTokens,
  accentExists: boolean = true,
): SemanticTokens {
  return {
    // Background
    "bg/base": "gray-100",
    "bg/subtle": "gray-200",
    "bg/muted": "gray-300",

    // Text
    "text/primary": "gray-1000",
    "text/secondary": "gray-900",
    "text/muted": "gray-700",
    "text/disabled": "gray-500",

    // Border
    "border/default": "gray-400",
    "border/subtle": "gray-300",
    "border/strong": "gray-600",

    // Brand (always "brand" role)
    "brand/primary": "brand-700",
    "brand/secondary": "brand-800",
    "brand/subtle": "brand-200",
    "brand/muted": "brand-100",

    // Accent (always "accent" role)
    ...(accentExists && primitive.colors["accent"] ? {
      "accent/primary": "accent-700",
      "accent/subtle": "accent-200",
    } : {}),

    // Status
    "status/success": "green-700",
    "status/success-subtle": "green-200",
    "status/success-text": "green-900",
    "status/error": "red-700",
    "status/error-subtle": "red-200",
    "status/error-text": "red-900",
    "status/warning": "amber-700",
    "status/warning-subtle": "amber-200",
    "status/warning-text": "amber-900",
    "status/info": "blue-700",
    "status/info-subtle": "blue-200",
    "status/info-text": "blue-900",

    // Constants
    "white": "gray-100",
    "black": "gray-1000",
  };
}
```

Note: `brand/primary` is now `brand-700` (the anchor step) instead of old `blue-500`. `brand/secondary` is `brand-800` (hover state per the spec's role column).

- [ ] **Step 2: Commit**

```bash
git add src/generator/tokens.ts
git commit -m "refactor(tokens): update semantic refs to role-based scale keys"
```

---

### Task 4: Update `index.ts` — Orchestration

**Files:**
- Modify: `src/generator/index.ts:6-7, 46-152`

This file has the most changes: import cleanup, `generateScales` call, `detectHueName` removal, agent guide hex conversion.

- [ ] **Step 1: Update imports**

```ts
// Before:
import { generateScales, detectHueName } from "./color.js";
import { converter } from "culori";

// After:
import { generateScales, oklchToHex, formatOklch } from "./color.js";
```

- [ ] **Step 2: Update `generate` function**

Replace the `generateScales` call and agent guide section:

```ts
export function generate(inputs: UserInputs): GenerateResult {
  const archetype = getArchetype(inputs.mood);

  // Generate all subsystems
  const scales = generateScales(inputs.primaryColor);
  const fontFamily = inputs.fontFamily || archetype.defaultFont;
  // ... typography, components, layout, elevation, responsive unchanged ...
```

- [ ] **Step 3: Update agent guide section**

Replace lines 74-111 (agent guide building):

```ts
  // Build agent guide — convert Oklch to hex for display
  const primaryHex = oklchToHex(scales.brand["700"].light);
  const surfaceBase = oklchToHex(scales.gray["100"].light);
  const neutral900 = oklchToHex(scales.gray["900"].light);
  const neutral600 = oklchToHex(scales.gray["600"].light);
  const borderDefault = oklchToHex(scales.gray["400"].light);
  const accentHex = oklchToHex(scales.accent["700"].light);

  const quickColors = [
    { name: "Primary CTA", hex: primaryHex },
    { name: "Background", hex: surfaceBase },
    { name: "Heading Text", hex: neutral900 },
    { name: "Body Text", hex: neutral600 },
    { name: "Border", hex: borderDefault },
    { name: "Accent", hex: accentHex },
  ];
```

Example prompts and iteration tips: replace `${primaryHex}` references (they now come from the oklchToHex calls above, so variable names stay the same).

- [ ] **Step 4: Update semantic generation call**

```ts
  // Before:
  const semantic = generateSemantic(primitive, brandHueName, accentHueName !== brandHueName ? accentHueName : undefined);

  // After:
  const semantic = generateSemantic(primitive);
```

- [ ] **Step 5: Remove all `detectHueName` and `converter` usage**

Delete lines referencing `toOklch`, `baseH`, `brandHueName`, `accentHueName`, `accentHueAngle` — they're no longer needed. The role names are fixed.

- [ ] **Step 6: Commit**

```bash
git add src/generator/index.ts
git commit -m "refactor(index): adapt orchestration to role-based color system"
```

---

### Task 5: Update `elevation.ts` and `template.ts`

**Files:**
- Modify: `src/generator/elevation.ts:1-4`
- Modify: `src/schema/template.ts:24-42`

- [ ] **Step 1: Fix elevation.ts**

```ts
// Before:
import type { ArchetypePreset, ColorScales, ElevationSystem } from "../schema/types.js";

export function generateElevation(archetype: ArchetypePreset, scales: ColorScales): ElevationSystem {
  const border = scales.gray?.["300"]?.light ?? "#d4d4d4";

// After:
import type { ArchetypePreset, ColorScales, ElevationSystem } from "../schema/types.js";
import { oklchToHex } from "../generator/color.js";

export function generateElevation(archetype: ArchetypePreset, scales: ColorScales): ElevationSystem {
  const borderColor = scales.gray?.["300"]?.light;
  const border = borderColor ? oklchToHex(borderColor) : "#d4d4d4";
```

- [ ] **Step 2: Fix template.ts — renderColors**

```ts
// Before:
lines.push(`| ${step} | \`${values.light}\` | \`${values.dark}\` |`);

// After:
import { formatOklch } from "../generator/color.js";
// ... inside renderColors:
lines.push(`| ${step} | \`${formatOklch(values.light)}\` | \`${formatOklch(values.dark)}\` |`);
```

Also update the section description from "Each color has 10 steps" if needed — the steps are still 100-1000, so this is fine.

- [ ] **Step 3: Commit**

```bash
git add src/generator/elevation.ts src/schema/template.ts
git commit -m "refactor(elevation,template): convert Oklch to display format"
```

---

### Task 6: Update `figma/transformer.ts`

**Files:**
- Modify: `src/figma/transformer.ts:107-155`

The transformer resolves semantic references through `primitive.colors`, which now contain `Oklch` objects instead of hex strings. The `resolveColorMode` function needs to convert Oklch to hex for Figma consumption.

- [ ] **Step 1: Update resolveColorMode**

```ts
import { oklchToHex } from "../generator/color.js";

// Inside transformToFigma:
function resolveColorMode(ref: string, mode: "light" | "dark"): string {
  const lastDash = ref.lastIndexOf("-");
  if (lastDash !== -1) {
    const hue = ref.slice(0, lastDash);
    const step = ref.slice(lastDash + 1);
    const hueMap = primitiveColors[hue];
    if (hueMap && hueMap[step]) {
      return oklchToHex(hueMap[step][mode]);
    }
  }
  return ref; // fallback (e.g. "transparent")
}
```

Everything downstream of `resolveColorMode` (`hexToFigmaColor`, `colorVariables`) continues to work unchanged since it still receives hex strings.

- [ ] **Step 2: Commit**

```bash
git add src/figma/transformer.ts
git commit -m "refactor(figma): resolve Oklch to hex in transformer"
```

---

### Task 7: Update tests — `tokens.test.ts` and `integration.test.ts`

**Files:**
- Modify: `tests/generator/tokens.test.ts:14, 43-49, 54-64, 69-109`
- Modify: `tests/generator/integration.test.ts:14-19, 46-53, 55-72`

- [ ] **Step 1: Fix tokens.test.ts**

Update `generateScales` call (line 14):

```ts
// Before:
const scales = generateScales("#5e6ad2", "cool", "balanced");

// After:
const scales = generateScales("#5e6ad2");
```

Update hex assertion (lines 43-49) to check for Oklch structure:

```ts
it("each step has light and dark Oklch values", () => {
  for (const [hue, scale] of Object.entries(primitive.colors)) {
    for (const [step, value] of Object.entries(scale)) {
      expect(value.light, `${hue}-${step}.light`).toHaveProperty("l");
      expect(value.light, `${hue}-${step}.light`).toHaveProperty("c");
      expect(value.light, `${hue}-${step}.light`).toHaveProperty("h");
      expect(value.dark, `${hue}-${step}.dark`).toHaveProperty("l");
      expect(value.dark, `${hue}-${step}.dark`).toHaveProperty("c");
      expect(value.dark, `${hue}-${step}.dark`).toHaveProperty("h");
    }
  }
});
```

Update hue count and names (lines 54-64):

```ts
it("has at least 7 roles (gray + brand + accent + 4 semantic)", () => {
  expect(Object.keys(primitive.colors).length).toBeGreaterThanOrEqual(7);
});

it("has expected role keys", () => {
  const roles = Object.keys(primitive.colors);
  expect(roles).toContain("brand");
  expect(roles).toContain("accent");
  expect(roles).toContain("gray");
  expect(roles).toContain("green");
  expect(roles).toContain("red");
  expect(roles).toContain("amber");
  expect(roles).toContain("blue");
});
```

Update semantic test — remove `accent/primary` and `accent/subtle` from required roles if accent might not exist:

```ts
// The expectedRoles list should match the new semantic output.
// "accent/primary" and "accent/subtle" are conditional — test separately.
const expectedRoles = [
  "bg/base", "bg/subtle", "bg/muted",
  "text/primary", "text/secondary", "text/muted", "text/disabled",
  "border/default", "border/subtle", "border/strong",
  "brand/primary", "brand/secondary", "brand/subtle", "brand/muted",
  "status/success", "status/success-subtle", "status/success-text",
  "status/error", "status/error-subtle", "status/error-text",
  "status/warning", "status/warning-subtle", "status/warning-text",
  "status/info", "status/info-subtle", "status/info-text",
  "white", "black",
];
```

Update semantic reference pattern — "brand" is now a valid hue name:

```ts
it("ALL values match \"{role}-{step}\" pattern", () => {
  const pattern = /^[a-z]+-\d{3,4}$/;
  for (const [role, value] of Object.entries(semantic)) {
    expect(value, `semantic["${role}"] = "${value}"`).toMatch(pattern);
  }
});
```

Update generateSemantic call (line 22):

```ts
// Before:
semantic = generateSemantic(primitive);

// After (no change needed — already correct signature):
semantic = generateSemantic(primitive);
```

- [ ] **Step 2: Fix integration.test.ts**

Update the `generate()` call — remove `colorCharacter`:

```ts
// Before:
const result = generate({
  brandName: "TestBrand",
  primaryColor: "#5e6ad2",
  mood,
  fontFamily: "Inter",
  colorCharacter: "balanced",
});

// After:
const result = generate({
  brandName: "TestBrand",
  primaryColor: "#5e6ad2",
  mood,
  fontFamily: "Inter",
});
```

Update hex assertion (lines 49-50) to check Oklch:

```ts
it("tokens.primitive.colors each step has light and dark Oklch", () => {
  for (const [hue, scale] of Object.entries(result.tokens.primitive.colors)) {
    for (const [step, value] of Object.entries(scale)) {
      expect(value.light, `${hue}-${step}.light`).toHaveProperty("l");
      expect(value.dark, `${hue}-${step}.dark`).toHaveProperty("l");
    }
  }
});
```

Update hue count assertion:

```ts
it("tokens.primitive.colors has role-keyed nested scales", () => {
  const colors = result.tokens.primitive.colors;
  expect(Object.keys(colors).length).toBeGreaterThanOrEqual(7);
  expect(colors).toHaveProperty("brand");
  expect(colors).toHaveProperty("gray");
  for (const [role, scale] of Object.entries(colors)) {
    expect(Object.keys(scale).length, `${role} should have 10 steps`).toBe(10);
  }
});
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests in `tests/generator/` pass. Web tests may still fail (handled in Task 8).

- [ ] **Step 4: Commit**

```bash
git add tests/generator/tokens.test.ts tests/generator/integration.test.ts
git commit -m "test: update token and integration tests for Oklch color system"
```

---

### Task 8: Update web UI

**Files:**
- Modify: `web/src/hooks/useGenerator.ts:4, 9-15, 29-44, 48`
- Modify: `web/src/App.tsx:7, 11-18, 54-59`
- Modify: `web/src/steps/StepColor.tsx:1-15, 45-63, 80`
- Modify: `web/src/result/ColorPreview.tsx:18, 25`

- [ ] **Step 1: Update useGenerator.ts**

Remove `ColorCharacter` from imports, `WizardState`, and `DEFAULT_STATE`:

```ts
import type { ColorScales, MoodArchetype } from "@core/schema/types.js";

export interface WizardState {
  primaryColor: string;
  mood: MoodArchetype;
  fontFamily: string;
  brandName: string;
}

export const DEFAULT_STATE: WizardState = {
  primaryColor: "#5e6ad2",
  mood: "precise",
  fontFamily: "Inter",
  brandName: "Untitled",
};
```

Update `useGenerateResult` — remove `colorCharacter` from generate call:

```ts
export function useGenerateResult(state: WizardState): FullResult | null {
  return useMemo(() => {
    try {
      const result = generate({
        brandName: state.brandName,
        primaryColor: state.primaryColor,
        mood: state.mood,
        fontFamily: state.fontFamily,
      });
      const figma = transformToFigma(result.tokens);
      return { ...result, figma };
    } catch {
      return null;
    }
  }, [state.brandName, state.primaryColor, state.mood, state.fontFamily]);
}
```

Update exports:

```ts
export type { MoodArchetype, ColorScales, GenerateResult };
```

- [ ] **Step 2: Update App.tsx**

Remove `ColorCharacter` import. Update `getBrandColor` to handle Oklch:

```ts
import { DEFAULT_STATE, useGenerateResult, type WizardState, type MoodArchetype, type FullResult } from "./hooks/useGenerator";
import { oklchToHex } from "@core/generator/color.js";

function getBrandColor(result: FullResult): string {
  const semanticKey = result.tokens.semantic["brand/primary"];
  if (!semanticKey) return "#666";
  const parts = semanticKey.split("-");
  const step = parts[parts.length - 1];
  const hue = parts.slice(0, -1).join("-");
  const colorStep = result.tokens.primitive.colors[hue]?.[step];
  return colorStep ? oklchToHex(colorStep.light) : "#666";
}
```

Remove `colorCharacter` from StepColor props:

```tsx
{step === 0 && (
  <StepColor
    value={state.primaryColor}
    onChange={(c: string) => update({ primaryColor: c })}
    scales={result?.system.colors ?? null}
  />
)}
```

- [ ] **Step 3: Update StepColor.tsx**

Remove `ColorCharacter` props, remove vivid/balanced/muted selector. Convert Oklch for `backgroundColor`:

```tsx
import type { ColorScales } from "../hooks/useGenerator";
import { formatOklch } from "@core/generator/color.js";

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

      {scales && (
        <div className="space-y-4">
          {Object.entries(scales).map(([hue, scale]) => (
            <div key={hue}>
              <div className="text-xs font-medium text-neutral-500 mb-1 capitalize">
                {hue}
              </div>
              <div className="flex gap-0.5">
                {Object.entries(scale)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([step, vals]) => (
                    <div
                      key={step}
                      className="flex-1 h-8 first:rounded-l last:rounded-r relative group"
                      style={{ backgroundColor: formatOklch(vals.light) }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/70 text-white">
                          {step}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update ColorPreview.tsx**

```tsx
import type { ColorScales } from "../hooks/useGenerator";
import { formatOklch } from "@core/generator/color.js";

export function ColorPreview({ scales }: { scales: ColorScales }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Color Scales</h2>
      <div className="space-y-3">
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
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/useGenerator.ts web/src/App.tsx web/src/steps/StepColor.tsx web/src/result/ColorPreview.tsx
git commit -m "refactor(web): adapt UI to Oklch color system, remove colorCharacter"
```

---

### Task 9: Update scripts

**Files:**
- Modify: `scripts/dump-scales.ts`
- Modify: `scripts/gen.ts:5-10`

- [ ] **Step 1: Fix dump-scales.ts**

```ts
import { generateScales } from "../src/generator/color.js";
console.log(JSON.stringify(generateScales("#5e6ad2")));
```

- [ ] **Step 2: Fix gen.ts — remove colorCharacter**

```ts
const result = generate({
  brandName: "Acme",
  primaryColor: "#5e6ad2",
  mood: "precise",
  fontFamily: "Inter",
});
```

- [ ] **Step 3: Commit**

```bash
git add scripts/dump-scales.ts scripts/gen.ts
git commit -m "fix(scripts): update to new generateScales signature"
```

---

### Task 10: Full test run and verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL tests pass.

- [ ] **Step 2: Run generation script**

Run: `npx tsx scripts/gen.ts`
Expected: Generates output files without errors. Check:
- `output/DESIGN.md` renders oklch values in color tables
- `output/design-tokens.json` contains Oklch objects in primitive.colors
- `output/figma-system.json` contains hex colors (converted from Oklch)

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit any final fixes if needed**

---

## Files changed summary

| File | Change type |
|------|------------|
| `src/generator/color.ts` | Add `oklchToHex` export |
| `src/schema/types.ts` | `PrimitiveTokens` uses `ColorStep`, remove `colorCharacter` from `UserInputs` |
| `src/generator/tokens.ts` | Simplify `generateSemantic` to role-based refs |
| `src/generator/index.ts` | New `generateScales` call, remove `detectHueName`, Oklch→hex in agent guide |
| `src/generator/elevation.ts` | Oklch→hex for shadow border |
| `src/schema/template.ts` | `formatOklch` for markdown display |
| `src/figma/transformer.ts` | Oklch→hex in `resolveColorMode` |
| `tests/generator/tokens.test.ts` | Fix signature, Oklch assertions, role-based keys |
| `tests/generator/integration.test.ts` | Remove `colorCharacter`, Oklch assertions |
| `tests/generator/color.test.ts` | Add `oklchToHex` tests |
| `web/src/hooks/useGenerator.ts` | Remove `ColorCharacter`, simplify state |
| `web/src/App.tsx` | Remove `ColorCharacter`, Oklch→hex in `getBrandColor` |
| `web/src/steps/StepColor.tsx` | Remove character selector, `formatOklch` for CSS |
| `web/src/result/ColorPreview.tsx` | `formatOklch` for CSS and display |
| `scripts/dump-scales.ts` | Fix signature |
| `scripts/gen.ts` | Remove `colorCharacter` |

## Not changed (intentionally)

| File | Reason |
|------|--------|
| `src/schema/archetypes.ts` | `neutralUndertone` stays in preset — may be used for future non-color purposes |
| `ColorCharacter` type definition | Kept in types.ts — only removed from `UserInputs` |
| `src/generator/token-writer.ts` | Serializes via `JSON.stringify` — Oklch objects serialize fine as `{ l, c, h }` |
| `web/src/steps/StepArchetype.tsx` | No color dependencies |
| `web/src/steps/StepFont.tsx` | No color dependencies |
