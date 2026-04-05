# V2 Plan B: Production Components + Template + Figma

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 3 minimal component stubs with 6 production-grade components (Button, Input, Card, Badge, Avatar, Divider), update the DESIGN.md renderer and Figma transformer to match. All component dimensions reference tokens only — zero hardcoded values.

**Architecture:** ComponentSpecs type expands to 6 components with size/state variants. All color values come from component tokens (which reference semantic tokens). All dimensions use spacing/radius/typography token names. Template and Figma transformer updated to render the richer specs.

**Tech Stack:** TypeScript, vitest

**Spec:** `docs/superpowers/specs/2026-04-05-v2-tokens-components-design.md`

**Prerequisite:** Plan A (3-layer tokens) complete. 171 tests passing.

---

## Core Principle

**Every value in component specs is a token reference, not a pixel/hex value.**

- Colors → component token keys (e.g., `"button.primary.bg"`)
- Dimensions → spacing token names (e.g., `"spacing.xl"`)
- Radii → radius token names (e.g., `"radius.button"`)
- Typography → typography style names (e.g., `"typography.button"`)
- Shadows → elevation names (e.g., `"elevation.raised"`)

---

## File Changes

| File | Action | What changes |
|---|---|---|
| `src/schema/types.ts` | Modify | Replace `ComponentSpecs` with 6 richly-typed component interfaces |
| `src/generator/components.ts` | Rewrite | 6 components with token-only references |
| `src/schema/template.ts` | Modify | Render 6 components in Section 4 |
| `src/generator/index.ts` | Modify | Pass token info to components generator |
| `tests/generator/components.test.ts` | Rewrite | Tests for 6 components |
| `tests/schema/template.test.ts` | Modify | Check for 6 component sections |
| `tests/generator/integration.test.ts` | Modify | Verify component structure |

---

### Task 1: Update ComponentSpecs types

**Files:**
- Modify: `src/schema/types.ts`

- [ ] **Step 1: Replace ComponentSpecs**

Read `src/schema/types.ts`. Replace the entire `// ═══ Components ═══` section (ButtonVariant, ComponentSpecs) with:

```ts
// ═══ Components ═══

export interface ComponentSize {
  height: string;       // spacing token name, e.g. "spacing.xl"
  paddingX: string;     // spacing token name
  gap: string;          // spacing token name
  fontSize: string;     // typography style name
  iconSize: string;     // spacing token name
  radius: string;       // radius token name
}

export interface ButtonSpec {
  sizes: Record<string, ComponentSize>;  // sm, md, lg
  variants: string[];                     // ["primary", "secondary", "ghost"]
}

export interface InputSpec {
  fieldHeight: string;      // spacing token name
  fieldPaddingX: string;    // spacing token name
  fieldRadius: string;      // radius token name
  labelFieldGap: string;    // spacing token name
  fieldHelperGap: string;   // spacing token name
  labelFont: string;        // typography style name
  valueFont: string;
  helperFont: string;
  iconSize: string;
  states: string[];          // ["default", "focus", "error", "disabled"]
}

export interface CardSpec {
  radius: string;
  contentPadding: string;
  contentGap: string;
  shadow: string;            // elevation name
  headerFont: string;
  bodyFont: string;
  footerGap: string;
  variants: string[];        // ["default", "compact"]
}

export interface BadgeSpec {
  sizes: Record<string, {
    height: string;
    paddingX: string;
    radius: string;
    font: string;
  }>;
  variants: string[];        // ["default", "success", "error", "warning", "info"]
}

export interface AvatarSpec {
  sizes: Record<string, {
    size: string;
    radius: string;
    font: string;
    statusDot: string;
  }>;
}

export interface DividerSpec {
  lineHeight: string;
  labelPaddingX: string;
  labelFont: string;
}

export interface ComponentSpecs {
  button: ButtonSpec;
  input: InputSpec;
  card: CardSpec;
  badge: BadgeSpec;
  avatar: AvatarSpec;
  divider: DividerSpec;
}
```

Also update `DesignSystem` if it still references old component sub-types (like `navigation`). The `DesignSystem.components` should be typed as the new `ComponentSpecs`.

- [ ] **Step 2: Verify — type errors expected in components.ts, template.ts**

Run: `npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
git add src/schema/types.ts
git commit -m "refactor(schema): rich component types for 6 components"
```

---

### Task 2: Rewrite components.ts

**Files:**
- Rewrite: `src/generator/components.ts`
- Rewrite: `tests/generator/components.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/generator/components.test.ts
import { describe, it, expect } from "vitest";
import { generateComponents } from "../../src/generator/components.js";
import { getArchetype } from "../../src/schema/archetypes.js";

describe("generateComponents", () => {
  const archetype = getArchetype("clean-minimal");
  const specs = generateComponents(archetype);

  describe("button", () => {
    it("has 3 sizes", () => {
      expect(Object.keys(specs.button.sizes)).toEqual(["sm", "md", "lg"]);
    });

    it("all size values are token references", () => {
      for (const [, size] of Object.entries(specs.button.sizes)) {
        expect(size.height).toMatch(/^spacing\./);
        expect(size.paddingX).toMatch(/^spacing\./);
        expect(size.gap).toMatch(/^spacing\./);
        expect(size.fontSize).toMatch(/^typography\./);
        expect(size.iconSize).toMatch(/^spacing\./);
        expect(size.radius).toMatch(/^radius\./);
      }
    });

    it("has 3 variants", () => {
      expect(specs.button.variants).toEqual(["primary", "secondary", "ghost"]);
    });
  });

  describe("input", () => {
    it("dimensions are token references", () => {
      expect(specs.input.fieldHeight).toMatch(/^spacing\./);
      expect(specs.input.fieldRadius).toMatch(/^radius\./);
      expect(specs.input.labelFont).toMatch(/^typography\./);
    });

    it("has 4 states", () => {
      expect(specs.input.states).toEqual(["default", "focus", "error", "disabled"]);
    });
  });

  describe("card", () => {
    it("dimensions are token references", () => {
      expect(specs.card.radius).toMatch(/^radius\./);
      expect(specs.card.contentPadding).toMatch(/^spacing\./);
      expect(specs.card.shadow).toMatch(/^elevation\./);
      expect(specs.card.headerFont).toMatch(/^typography\./);
    });
  });

  describe("badge", () => {
    it("has sm and md sizes", () => {
      expect(Object.keys(specs.badge.sizes)).toEqual(["sm", "md"]);
    });

    it("has 5 color variants", () => {
      expect(specs.badge.variants).toEqual(["default", "success", "error", "warning", "info"]);
    });
  });

  describe("avatar", () => {
    it("has 3 sizes", () => {
      expect(Object.keys(specs.avatar.sizes)).toEqual(["sm", "md", "lg"]);
    });

    it("sizes use spacing tokens", () => {
      expect(specs.avatar.sizes.sm.size).toMatch(/^spacing\./);
      expect(specs.avatar.sizes.sm.radius).toMatch(/^radius\./);
    });
  });

  describe("divider", () => {
    it("dimensions are token references", () => {
      expect(specs.divider.lineHeight).toMatch(/^spacing\./);
      expect(specs.divider.labelFont).toMatch(/^typography\./);
    });
  });

  it("uses archetype-specific radius", () => {
    const bold = generateComponents(getArchetype("bold-energetic"));
    expect(bold.button.sizes.md.radius).toBe("radius.button");
    // bold-energetic has buttonRadius "9999px" → archetype maps to radius.button
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Rewrite src/generator/components.ts**

The function signature changes: it now takes only `archetype` (no palette needed — colors come from component tokens, not the palette directly).

```ts
import type { ArchetypePreset, ComponentSpecs } from "../schema/types.js";

export function generateComponents(archetype: ArchetypePreset): ComponentSpecs {
  return {
    button: {
      sizes: {
        sm: {
          height: "spacing.xl",
          paddingX: "spacing.sm",
          gap: "spacing.2xs",
          fontSize: "typography.caption",
          iconSize: "spacing.md",
          radius: "radius.button",
        },
        md: {
          height: "spacing.2xl",
          paddingX: "spacing.md",
          gap: "spacing.xs",
          fontSize: "typography.button",
          iconSize: "spacing.md",
          radius: "radius.button",
        },
        lg: {
          height: "spacing.3xl",
          paddingX: "spacing.lg",
          gap: "spacing.xs",
          fontSize: "typography.body",
          iconSize: "spacing.lg",
          radius: "radius.button",
        },
      },
      variants: ["primary", "secondary", "ghost"],
    },

    input: {
      fieldHeight: "spacing.2xl",
      fieldPaddingX: "spacing.sm",
      fieldRadius: "radius.input",
      labelFieldGap: "spacing.2xs",
      fieldHelperGap: "spacing.2xs",
      labelFont: "typography.label",
      valueFont: "typography.body",
      helperFont: "typography.caption",
      iconSize: "spacing.md",
      states: ["default", "focus", "error", "disabled"],
    },

    card: {
      radius: "radius.card",
      contentPadding: "spacing.lg",
      contentGap: "spacing.sm",
      shadow: "elevation.raised",
      headerFont: "typography.card-title",
      bodyFont: "typography.body",
      footerGap: "spacing.xs",
      variants: ["default", "compact"],
    },

    badge: {
      sizes: {
        sm: {
          height: "spacing.lg",
          paddingX: "spacing.xs",
          radius: "radius.pill",
          font: "typography.label",
        },
        md: {
          height: "spacing.xl",
          paddingX: "spacing.sm",
          radius: "radius.pill",
          font: "typography.caption",
        },
      },
      variants: ["default", "success", "error", "warning", "info"],
    },

    avatar: {
      sizes: {
        sm: { size: "spacing.xl", radius: "radius.pill", font: "typography.caption", statusDot: "spacing.xs" },
        md: { size: "spacing.2xl", radius: "radius.pill", font: "typography.button", statusDot: "spacing.xs" },
        lg: { size: "spacing.3xl", radius: "radius.pill", font: "typography.body", statusDot: "spacing.sm" },
      },
    },

    divider: {
      lineHeight: "spacing.3xs",
      labelPaddingX: "spacing.sm",
      labelFont: "typography.caption",
    },
  };
}
```

- [ ] **Step 4: Run tests — all PASS**

- [ ] **Step 5: Commit**

```bash
git add src/generator/components.ts tests/generator/components.test.ts
git commit -m "feat(generator): 6 production components with token-only references"
```

---

### Task 3: Update template.ts for 6 components

**Files:**
- Modify: `src/schema/template.ts`
- Modify: `tests/schema/template.test.ts`

- [ ] **Step 1: Update template test mock**

Read `tests/schema/template.test.ts`. Update `createMockSystem()` to use the new `ComponentSpecs` shape:

```ts
components: {
  button: {
    sizes: {
      sm: { height: "spacing.xl", paddingX: "spacing.sm", gap: "spacing.2xs", fontSize: "typography.caption", iconSize: "spacing.md", radius: "radius.button" },
      md: { height: "spacing.2xl", paddingX: "spacing.md", gap: "spacing.xs", fontSize: "typography.button", iconSize: "spacing.md", radius: "radius.button" },
      lg: { height: "spacing.3xl", paddingX: "spacing.lg", gap: "spacing.xs", fontSize: "typography.body", iconSize: "spacing.lg", radius: "radius.button" },
    },
    variants: ["primary", "secondary", "ghost"],
  },
  input: {
    fieldHeight: "spacing.2xl", fieldPaddingX: "spacing.sm", fieldRadius: "radius.input",
    labelFieldGap: "spacing.2xs", fieldHelperGap: "spacing.2xs",
    labelFont: "typography.label", valueFont: "typography.body", helperFont: "typography.caption",
    iconSize: "spacing.md", states: ["default", "focus", "error", "disabled"],
  },
  card: {
    radius: "radius.card", contentPadding: "spacing.lg", contentGap: "spacing.sm",
    shadow: "elevation.raised", headerFont: "typography.card-title", bodyFont: "typography.body",
    footerGap: "spacing.xs", variants: ["default", "compact"],
  },
  badge: {
    sizes: {
      sm: { height: "spacing.lg", paddingX: "spacing.xs", radius: "radius.pill", font: "typography.label" },
      md: { height: "spacing.xl", paddingX: "spacing.sm", radius: "radius.pill", font: "typography.caption" },
    },
    variants: ["default", "success", "error", "warning", "info"],
  },
  avatar: {
    sizes: {
      sm: { size: "spacing.xl", radius: "radius.pill", font: "typography.caption", statusDot: "spacing.xs" },
      md: { size: "spacing.2xl", radius: "radius.pill", font: "typography.button", statusDot: "spacing.xs" },
      lg: { size: "spacing.3xl", radius: "radius.pill", font: "typography.body", statusDot: "spacing.sm" },
    },
  },
  divider: { lineHeight: "spacing.3xs", labelPaddingX: "spacing.sm", labelFont: "typography.caption" },
},
```

Add tests checking the new component sections exist:
- `### Button` with size table and variants
- `### Input` with states
- `### Card`
- `### Badge` with variants
- `### Avatar` with sizes
- `### Divider`

- [ ] **Step 2: Update renderComponents in template.ts**

Read `src/schema/template.ts`. Rewrite the `renderComponents` function to render all 6 components.

For each component, render:
- Component name as `### ComponentName`
- A table of dimensions (token references)
- Variants/states list
- Structure diagram (ASCII)

Example output for Button:

```
### Button

**Sizes:**

| | sm | md | lg |
|---|---|---|---|
| height | spacing.xl | spacing.2xl | spacing.3xl |
| paddingX | spacing.sm | spacing.md | spacing.lg |
| gap | spacing.2xs | spacing.xs | spacing.xs |
| fontSize | typography.caption | typography.button | typography.body |
| iconSize | spacing.md | spacing.md | spacing.lg |
| radius | radius.button | radius.button | radius.button |

**Variants:** primary, secondary, ghost

**Color tokens:** See component token layer (`component.button.*`)

**Structure:**
\`\`\`
[Button] horizontal auto-layout, center aligned
  ├── [IconLeading?] instance swap
  ├── [Label] text property
  └── [IconTrailing?] instance swap
\`\`\`
```

Similar for all 6 components. Use the spec document for exact structure diagrams.

- [ ] **Step 3: Run tests — all PASS**

- [ ] **Step 4: Commit**

```bash
git add src/schema/template.ts tests/schema/template.test.ts
git commit -m "feat(schema): template renders 6 production components"
```

---

### Task 4: Update orchestrator

**Files:**
- Modify: `src/generator/index.ts`

- [ ] **Step 1: Update generate() function**

Read `src/generator/index.ts`. The `generateComponents` call needs to change:

OLD: `const components = generateComponents(colors, archetype);`
NEW: `const components = generateComponents(archetype);`

The function no longer takes the palette — component colors are defined in the component token layer, not in the component spec itself.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

- [ ] **Step 3: Commit**

```bash
git add src/generator/index.ts
git commit -m "refactor(generator): components no longer depend on palette directly"
```

---

### Task 5: Update integration tests

**Files:**
- Modify: `tests/generator/integration.test.ts`

- [ ] **Step 1: Update component assertions**

Read `tests/generator/integration.test.ts`. Update the component-related assertions:

- Check `result.system.components.button.sizes` has 3 keys
- Check `result.system.components.button.variants` has 3 entries
- Check `result.system.components.input.states` has 4 entries
- Check `result.system.components.badge.variants` has 5 entries
- Check `result.system.components.avatar.sizes` has 3 keys
- Check `result.system.components.divider.lineHeight` is a token reference

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```
ALL must pass.

- [ ] **Step 3: Commit**

```bash
git add tests/generator/integration.test.ts
git commit -m "test: update integration tests for 6 production components"
```

---

## Verification

1. `npx vitest run` — all tests pass
2. `npx tsc --noEmit` — no type errors
3. `npx tsx scripts/gen.ts` — generates output
4. Check `output/DESIGN.md` Section 4 has all 6 components with token-only dimensions
5. Check `output/tokens/component.ts` has token entries for all 6 components
