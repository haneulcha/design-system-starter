# Atomic Component Extraction Design

**Date:** 2026-04-06
**Goal:** Extract reusable atomic components from wizard steps and result page so that UI building blocks are defined once and shared across all screens.

## Background

The web app has a wizard flow (Color → Archetype → Font) and a ResultPage. Currently, each screen implements its own rendering for color scales, buttons, inputs, cards, typography, etc. Code is duplicated and changes must be applied in multiple places.

## Design Decisions

- **Component shape reference:** StepArchetype's component forms (sizing, padding, structure)
- **Color resolution:** Full token chain (component → semantic → primitive → OKLCH) applied everywhere
- **ColorScale header:** Step numbers (50, 100, …, 950) displayed as a header row above color bars
- **Architecture:** Flat `components/` directory (Approach A)
- **Code style:** Functional programming; business logic (token resolution, style computation) separated from UI rendering

## Shared Token Resolution Layer

Extract from `ComponentPreview.tsx` into `web/src/lib/tokens.ts`:

```ts
resolveOklch(tokens, semanticKey): Oklch | null
resolveColor(tokens, key): string
resolveColorAlpha(tokens, key, alpha): string
resolveComponentColor(tokens, componentPath): string
```

Also consolidate duplicated utilities:
- `loadGoogleFont` (currently in StepFont + TypePreview)
- `parsePx` (currently in StepFont + TypePreview)

## Atomic Components

All placed in `web/src/components/`.

### 1. ColorScale
- **Props:** `scales: ColorScales`
- **Renders:** Per-hue color bar with hover tooltips (step number + OKLCH value). Header row showing scale step numbers.
- **Based on:** ColorPreview rendering + header addition
- **Used in:** StepColor, ResultPage

### 2. DSButton
- **Props:** `variant: 'primary' | 'secondary' | 'ghost'`, `disabled?: boolean`, `children`, `tokens: DesignTokens`, `system: DesignSystem`
- **Renders:** Button with token-resolved colors, archetype-derived radius/shadow
- **Based on:** StepArchetype button form (px-4 py-2, text-sm, font-medium)
- **Used in:** StepArchetype component preview, ResultPage

### 3. DSInput
- **Props:** `state?: 'default' | 'focus' | 'error' | 'disabled'`, `value: string`, `tokens: DesignTokens`, `system: DesignSystem`
- **Renders:** Input with token-resolved border/bg colors per state, archetype-derived radius
- **Based on:** StepArchetype input form
- **Used in:** StepArchetype component preview, ResultPage

### 4. DSCard
- **Props:** `children: ReactNode`, `tokens: DesignTokens`, `system: DesignSystem`
- **Renders:** Card container with token-resolved border/bg, archetype-derived radius/shadow
- **Based on:** StepArchetype card form
- **Used in:** StepArchetype component preview, ResultPage

### 5. DSBadge
- **Props:** `variant: 'default' | 'success' | 'error' | 'warning' | 'info'`, `children`, `tokens: DesignTokens`, `system: DesignSystem`
- **Renders:** Pill badge with token-resolved status colors (9% bg alpha, 25% border alpha)
- **Based on:** ComponentPreview badge rendering
- **Used in:** ResultPage (currently), available for future use in wizard

### 6. DSDivider
- **Props:** `label?: string`, `tokens: DesignTokens`, `system: DesignSystem`
- **Renders:** Horizontal rule with optional centered label, token-resolved colors
- **Based on:** ComponentPreview divider rendering
- **Used in:** ResultPage (currently), available for future use

### 7. TypeScale
- **Props:** `system: DesignSystem`
- **Renders:** Typography hierarchy table with role, size/weight metadata, and preview text. Handles font loading internally.
- **Based on:** TypePreview rendering (role label + size/weight info + preview)
- **Used in:** StepFont, ResultPage

## Screen Changes

### StepColor.tsx
- Keep: color picker + hex input
- Replace: inline scale rendering → `<ColorScale scales={scales} />`

### StepArchetype.tsx
- Keep: 2x2 archetype selection grid with mini button preview
- Replace: "Component Preview" section → compose with `<DSButton>`, `<DSInput>`, `<DSCard>`
- Change: receive `tokens` + `system` instead of just `brandColor`

### StepFont.tsx
- Keep: font radio selector + custom input
- Replace: typography preview → `<TypeScale system={system} />`

### ResultPage.tsx
- Replace: `<ColorPreview>` → `<ColorScale>`
- Replace: `<ComponentPreview>` → compose `<DSButton>`, `<DSInput>`, `<DSCard>`, `<DSBadge>`, `<DSDivider>` with section labels
- Replace: `<TypePreview>` → `<TypeScale>`

## Files to Delete

- `web/src/result/ColorPreview.tsx`
- `web/src/result/TypePreview.tsx`
- `web/src/result/ComponentPreview.tsx`

## Logic/UI Separation Pattern

Each component separates concerns:
1. **Style computation** — pure functions that take tokens/system and return style objects
2. **UI rendering** — component body consumes computed styles, handles only JSX

Example pattern:
```ts
// Pure function: business logic
function computeButtonStyles(variant, tokens, system) {
  return { backgroundColor, color, borderRadius, ... }
}

// Component: UI only
function DSButton({ variant, tokens, system, children }) {
  const styles = computeButtonStyles(variant, tokens, system)
  return <button style={styles}>{children}</button>
}
```
