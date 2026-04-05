# V2 Plan A: 3-Layer Token Architecture

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the flat token system into 3-layer architecture (primitive → semantic → component) where each layer only references the layer below, never hardcoded values.

**Architecture:** `color.ts` gains hue detection. `tokens.ts` is rewritten with 3 generator functions. New `token-writer.ts` produces TS output files. `DesignTokens` type restructured.

**Tech Stack:** TypeScript, culori, vitest

**Spec:** `docs/superpowers/specs/2026-04-05-v2-tokens-components-design.md`

---

### Task 1: Update DesignTokens type

**Files:**
- Modify: `src/schema/types.ts`

- [ ] **Step 1: Add 3-layer token types**

Replace the `DesignTokens` interface (lines 199-224) with:

```ts
// ═══ Design Tokens — 3-Layer Architecture ═══

export interface PrimitiveTokens {
  colors: Record<string, string>;
}

export interface SemanticTokens {
  light: Record<string, string>;
  dark: Record<string, string>;
}

export interface ComponentTokens {
  [component: string]: {
    [variant: string]: Record<string, string>;
  };
}

export interface DesignTokens {
  brand: { name: string; mood: MoodArchetype };
  primitive: PrimitiveTokens;
  semantic: SemanticTokens;
  component: ComponentTokens;
  typography: {
    families: Record<string, string>;
    styles: Record<string, {
      fontFamily: string;
      fontSize: number;
      fontWeight: number;
      lineHeight: number;
      letterSpacing: number;
    }>;
  };
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  elevation: Record<string, string>;
  breakpoint: Record<string, number>;
}
```

- [ ] **Step 2: Verify types compile (errors in downstream files expected)**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 3: Commit**

```bash
git add src/schema/types.ts
git commit -m "refactor(schema): 3-layer token types"
```

---

### Task 2: Add hue detection to color.ts

**Files:**
- Modify: `src/generator/color.ts`
- Modify: `tests/generator/color.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `tests/generator/color.test.ts`:

```ts
import { detectHueName } from "../../src/generator/color.js";

describe("detectHueName", () => {
  it("maps hue ranges to color names", () => {
    expect(detectHueName(10)).toBe("red");
    expect(detectHueName(50)).toBe("orange");
    expect(detectHueName(90)).toBe("yellow");
    expect(detectHueName(145)).toBe("green");
    expect(detectHueName(200)).toBe("cyan");
    expect(detectHueName(265)).toBe("blue");
    expect(detectHueName(320)).toBe("purple");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run tests/generator/color.test.ts`

- [ ] **Step 3: Implement detectHueName**

Add to `src/generator/color.ts` before `generatePalette`:

```ts
export function detectHueName(hue: number): string {
  const h = ((hue % 360) + 360) % 360;
  if (h < 30) return "red";
  if (h < 70) return "orange";
  if (h < 110) return "yellow";
  if (h < 170) return "green";
  if (h < 250) return "cyan";
  if (h < 310) return "blue";
  return "purple";
}
```

- [ ] **Step 4: Run tests — all PASS**

- [ ] **Step 5: Commit**

```bash
git add src/generator/color.ts tests/generator/color.test.ts
git commit -m "feat(generator): hue name detection for primitive naming"
```

---

### Task 3: Rewrite tokens.ts — 3-layer generators

**Files:**
- Rewrite: `src/generator/tokens.ts`
- Create: `tests/generator/tokens.test.ts`

- [ ] **Step 1: Write tests**

Create `tests/generator/tokens.test.ts` with these test groups:

**generatePrimitive tests:**
- Has hue-named brand colors (e.g. `blue500`, `blue700`, `blue200` for primary #5e6ad2)
- Has neutral scale (`gray950` through `gray50`)
- Has semantic hues with light variants (`green500`, `green200`, `red500`, `red200`, `amber500`, `amber200`, `cyan500`, `cyan200`)
- Has surface primitives (`surfaceBase`, `surfaceSubtle`, `surfaceMuted`, `surfaceRaised`)
- Has border primitives (`borderSubtle`, `borderDefault`, `borderStrong`)
- Has dark mode primitives (`darkBg`, `darkSubtle`, `darkRaised`, `darkTextMuted`, `darkTextDefault`, `darkTextStrong`, `darkBorderSubtle`, `darkBorderDefault`, `darkBorderStrong`)
- Has constants (`white` = `#ffffff`, `black` = `#000000`)
- ALL values are valid hex strings (`/^#[0-9a-f]{6}$/i`)

**generateSemantic tests:**
- Has expected keys: `bgBase`, `bgSubtle`, `textStrong`, `textDefault`, `textMuted`, `brandPrimary`, `brandHover`, `brandLight`, `error`, `errorLight`, `success`, `successLight`, etc.
- ALL values in `light` are keys that exist in `primitive.colors`
- ALL values in `dark` are keys that exist in `primitive.colors`
- No value is a hex string — all are primitive key references

**generateComponent tests:**
- Has `button.primary`, `button.secondary`, `button.ghost`
- Button primary has: `bg`, `bgHover`, `bgActive`, `bgDisabled`, `text`, `textDisabled`
- Has `input`, `card`, `badge`, `avatar`, `divider`
- ALL leaf values exist as keys in `semantic.light` (except `"transparent"`)

Test setup: call `generatePalette("#5e6ad2", "neutral")`, then feed result to each layer sequentially.

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run tests/generator/tokens.test.ts`

- [ ] **Step 3: Implement tokens.ts**

Rewrite `src/generator/tokens.ts`. Three exported functions:

**`generatePrimitive(palette, primaryHex)`**: 
- Use `culori` to extract oklch hue from `primaryHex`, call `detectHueName(hue)` → `brandHue`
- Same for accent: compute `(hue + 150) % 360` → `detectHueName` → `accentHue`
- Map `palette.primary[0..2]` → `{brandHue}500`, `{brandHue}700`, `{brandHue}200`
- Map `palette.accent[0..1]` → `{accentHue}500`, `{accentHue}200`
- Map `palette.neutral[0..10]` → `gray950` through `gray50`
- Map `palette.semantic[0..3]` → `green500`, `red500`, `amber500`, `cyan500`
- Generate light variants using culori: for each semantic color, create oklch with `l: 0.9, c: 0.04, h: sameHue` → `green200`, `red200`, `amber200`, `cyan200`
- Map `palette.surface[0..3]` → `surfaceBase`, `surfaceSubtle`, `surfaceMuted`, `surfaceRaised`
- Map `palette.border[0..2]` → `borderSubtle`, `borderDefault`, `borderStrong`
- Map dark surfaces → `darkBg`, `darkSubtle`, `darkRaised`
- Map dark text → `darkTextMuted`, `darkTextDefault`, `darkTextStrong`
- Dark borders: generate hex values using oklch (`l:0.18`, `l:0.22`, `l:0.28` with low chroma) → `darkBorderSubtle`, `darkBorderDefault`, `darkBorderStrong`
- Add `white: "#ffffff"`, `black: "#000000"`

**`generateSemantic(primitive, archetype)`**:
- `brandHue` = detect from primitive keys (find key matching `*500` that isn't gray/green/red/amber/cyan)
- Returns `{ light, dark }` where every value is a KEY from primitive.colors:

```
light.bgBase → "surfaceBase"
light.bgSubtle → "surfaceSubtle"
light.bgMuted → "surfaceMuted"
light.bgRaised → "surfaceRaised"
light.textStrong → "gray900"
light.textDefault → "gray600"
light.textMuted → "gray400"
light.borderSubtle → "borderSubtle"
light.borderDefault → "borderDefault"
light.borderStrong → "borderStrong"
light.brandPrimary → "{brandHue}500"
light.brandHover → "{brandHue}700"
light.brandLight → "{brandHue}200"
light.accentPrimary → "{accentHue}500"
light.accentLight → "{accentHue}200"
light.success → "green500"
light.successLight → "green200"
light.error → "red500"
light.errorLight → "red200"
light.warning → "amber500"
light.warningLight → "amber200"
light.info → "cyan500"
light.infoLight → "cyan200"

dark.bgBase → "darkBg"
dark.bgSubtle → "darkSubtle"
dark.bgRaised → "darkRaised"
dark.textStrong → "darkTextStrong"
dark.textDefault → "darkTextDefault"
dark.textMuted → "darkTextMuted"
dark.borderSubtle → "darkBorderSubtle"
dark.borderDefault → "darkBorderDefault"
dark.borderStrong → "darkBorderStrong"
dark.brandPrimary → "{brandHue}500"  (shared)
dark.brandHover → "{brandHue}700"    (shared)
dark.brandLight → "{brandHue}200"    (shared)
(all semantic hues shared)
```

**`generateComponent(semantic)`**:
- Returns nested object, every leaf value is a KEY from semantic:

```
button.primary: bg→"brandPrimary", bgHover→"brandHover", bgActive→"brandHover",
                bgDisabled→"bgMuted", text→"white" (NOTE: "white" is in semantic? No—)
```

Wait — `"white"` is a primitive key, not a semantic key. Per the spec: component layer references semantic only, but `button.primary.text` needs white for contrast. The spec says: *"예외: 대비 보장을 위해 primitive 직접 참조 허용"*.

Decision: Add `white` and `black` to semantic layer as well:
```
light.white → "white"
light.black → "black"
dark.white → "white"
dark.black → "black"
```

Then component can reference `"white"` which exists in semantic.

Component mapping (all values are semantic keys):
```
button.primary: bg→"brandPrimary", bgHover→"brandHover", bgActive→"brandHover",
                bgDisabled→"bgMuted", text→"white", textDisabled→"textMuted"
button.secondary: bg→"bgMuted", bgHover→"bgRaised", bgActive→"borderSubtle",
                  bgDisabled→"bgMuted", text→"textStrong", textDisabled→"textMuted"
button.ghost: bg→"transparent", bgHover→"bgSubtle", bgActive→"bgMuted",
              bgDisabled→"transparent", text→"brandPrimary", textDisabled→"textMuted",
              border→"borderDefault", borderDisabled→"borderSubtle"
input.default: bg→"bgBase", border→"borderDefault", text→"textStrong",
               placeholder→"textMuted", label→"textStrong", helper→"textDefault"
input.focus: borderFocus→"brandPrimary"
input.error: borderError→"error", errorText→"error"
input.disabled: bgDisabled→"bgMuted", borderDisabled→"borderSubtle"
card.default: bg→"bgSubtle", border→"borderSubtle", headerText→"textStrong",
              bodyText→"textDefault"
badge.default: bg→"bgMuted", text→"textDefault"
badge.success: bg→"successLight", text→"success"
badge.error: bg→"errorLight", text→"error"
badge.warning: bg→"warningLight", text→"warning"
badge.info: bg→"infoLight", text→"info"
avatar.default: bg→"brandLight", text→"brandPrimary",
                statusOnline→"success", statusOffline→"textMuted"
divider.default: line→"borderSubtle", labelText→"textMuted"
```

Also export a convenience `buildDesignTokens(system)` that produces the full `DesignTokens` object (calling all 3 generators + adding typography/spacing/radius/elevation/breakpoint from DesignSystem).

- [ ] **Step 4: Run tests — all PASS**

Run: `npx vitest run tests/generator/tokens.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/generator/tokens.ts tests/generator/tokens.test.ts
git commit -m "feat(generator): 3-layer token generators (primitive/semantic/component)"
```

---

### Task 4: Token writer — TS file output

**Files:**
- Create: `src/generator/token-writer.ts`
- Create: `tests/generator/token-writer.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/generator/token-writer.test.ts
import { describe, it, expect } from "vitest";
import { writePrimitiveTs, writeSemanticTs, writeComponentTs, writeIndexTs } from "../../src/generator/token-writer.js";
import type { PrimitiveTokens, SemanticTokens, ComponentTokens } from "../../src/schema/types.js";

const mockPrimitive: PrimitiveTokens = {
  colors: { blue500: "#5e6ad2", gray900: "#111113", white: "#ffffff" },
};

const mockSemantic: SemanticTokens = {
  light: { brandPrimary: "blue500", textStrong: "gray900", white: "white" },
  dark: { brandPrimary: "blue500", textStrong: "white", white: "white" },
};

const mockComponent: ComponentTokens = {
  button: {
    primary: { bg: "brandPrimary", text: "white" },
  },
};

describe("writePrimitiveTs", () => {
  it("generates valid TypeScript with as const", () => {
    const ts = writePrimitiveTs(mockPrimitive);
    expect(ts).toContain("export const primitive");
    expect(ts).toContain("as const");
    expect(ts).toContain('"blue500": "#5e6ad2"');
  });
});

describe("writeSemanticTs", () => {
  it("references primitive keys, not hex values", () => {
    const ts = writeSemanticTs(mockSemantic);
    expect(ts).toContain("export const semantic");
    expect(ts).toContain("as const");
    expect(ts).toContain('"brandPrimary": "blue500"');
    expect(ts).not.toContain("#5e6ad2"); // no hex in semantic
  });
});

describe("writeComponentTs", () => {
  it("references semantic keys", () => {
    const ts = writeComponentTs(mockComponent);
    expect(ts).toContain("export const component");
    expect(ts).toContain('"bg": "brandPrimary"');
  });
});

describe("writeIndexTs", () => {
  it("re-exports all layers", () => {
    const ts = writeIndexTs();
    expect(ts).toContain('from "./primitive.js"');
    expect(ts).toContain('from "./semantic.js"');
    expect(ts).toContain('from "./component.js"');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run tests/generator/token-writer.test.ts`

- [ ] **Step 3: Implement token-writer.ts**

```ts
// src/generator/token-writer.ts
import type { PrimitiveTokens, SemanticTokens, ComponentTokens } from "../schema/types.js";

function toTsObject(obj: Record<string, unknown>, indent: number = 2): string {
  const pad = " ".repeat(indent);
  const entries = Object.entries(obj).map(([k, v]) => {
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      return `${pad}"${k}": ${toTsObject(v as Record<string, unknown>, indent + 2)}`;
    }
    return `${pad}"${k}": ${JSON.stringify(v)}`;
  });
  return `{\n${entries.join(",\n")}\n${" ".repeat(indent - 2)}}`;
}

export function writePrimitiveTs(tokens: PrimitiveTokens): string {
  return `export const primitive = ${toTsObject({ colors: tokens.colors })} as const;\n`;
}

export function writeSemanticTs(tokens: SemanticTokens): string {
  return `export const semantic = ${toTsObject(tokens)} as const;\n`;
}

export function writeComponentTs(tokens: ComponentTokens): string {
  return `export const component = ${toTsObject(tokens)} as const;\n`;
}

export function writeIndexTs(): string {
  return `export { primitive } from "./primitive.js";
export { semantic } from "./semantic.js";
export { component } from "./component.js";
`;
}
```

- [ ] **Step 4: Run tests — all PASS**

- [ ] **Step 5: Commit**

```bash
git add src/generator/token-writer.ts tests/generator/token-writer.test.ts
git commit -m "feat(generator): TS file writer for 3-layer tokens"
```

---

### Task 5: Update orchestrator + integration tests

**Files:**
- Modify: `src/generator/index.ts`
- Modify: `tests/generator/integration.test.ts`

- [ ] **Step 1: Update orchestrator**

Modify `src/generator/index.ts`:
- Import new functions: `generatePrimitive`, `generateSemantic`, `generateComponent`, `buildDesignTokens` from `./tokens.js`
- Import token writer functions from `./token-writer.js`
- Add `tokenFiles: Record<string, string>` to `GenerateResult` (key = filename, value = content)
- In `generate()`:
  1. Call `generatePrimitive(palette, inputs.primaryColor)`
  2. Call `generateSemantic(primitive, archetype)`
  3. Call `generateComponent(semantic)`
  4. Call `buildDesignTokens(system)` for the full DesignTokens
  5. Call token writer functions to produce TS file strings
  6. Return `{ system, designMd, tokens, tokenFiles }`

- [ ] **Step 2: Update integration tests**

Modify `tests/generator/integration.test.ts`:
- Change `result.tokens.color.light["brand-primary"]` → `result.tokens.primitive.colors` has keys
- Add: `result.tokens.semantic.light` values are all keys in `result.tokens.primitive.colors`
- Add: `result.tokens.component.button.primary` exists
- Add: `result.tokenFiles` has 4 entries (`primitive.ts`, `semantic.ts`, `component.ts`, `index.ts`)
- Keep: 9 sections check, no template placeholders check

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/generator/index.ts tests/generator/integration.test.ts
git commit -m "feat(generator): wire 3-layer tokens + TS file output in orchestrator"
```

---

### Task 6: Update CLI to write token files

**Files:**
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Add token file output**

After existing file writes, add:

```ts
// Write token TS files
const tokensDir = join(outDir, "tokens");
mkdirSync(tokensDir, { recursive: true });
for (const [filename, content] of Object.entries(result.tokenFiles)) {
  writeFileSync(join(tokensDir, filename), content, "utf-8");
}
```

Update the console output to mention `output/tokens/`.

- [ ] **Step 2: Test manually**

Run: `npx tsx src/cli/index.ts` or the gen script.
Expected: `output/tokens/` directory with 4 .ts files.

- [ ] **Step 3: Commit**

```bash
git add src/cli/index.ts
git commit -m "feat(cli): write 3-layer token TS files to output/tokens/"
```

---

## Verification

1. `npx vitest run` — all tests pass
2. `npx tsc --noEmit` — no type errors
3. Generate output: verify `output/tokens/primitive.ts` has hex values, `semantic.ts` has primitive key refs only, `component.ts` has semantic key refs only
4. `output/design-tokens.json` has `{ primitive, semantic, component, ... }` structure
