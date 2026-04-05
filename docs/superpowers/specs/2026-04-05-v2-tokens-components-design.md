# V2: 3-Layer Tokens + Production Components

## Overview

Design system starter의 토큰 구조를 3-layer (primitive → semantic → component)로 개편하고, 컴포넌트를 프로덕션 수준으로 개선한다. 6개 컴포넌트(Button, Input, Card, Badge, Avatar, Divider)를 포함하며, 모든 수치는 토큰으로만 기술된다.

## Core Philosophy

**토큰이 시스템의 유일한 single source of truth.**

- Primitive: 모든 원시값 소유
- Semantic: primitive만 참조 (자체 값 없음)
- Component: semantic만 참조 (자체 값 없음)
- 컴포넌트 스펙: 토큰 이름으로만 기술 (px 값 없음)
- 디자인에 필요한 값이 스케일에 없으면, 디자인을 스케일에 맞춤

---

## Token Architecture

### Layer 1: Primitive (`tokens/primitive.ts`)

원시 팔레트. 의미 없는 순수 색상값. oklch color generator가 생성.

프라이머리 컬러의 oklch hue에서 이름을 자동 결정 (0-30: red, 30-70: orange, 70-110: yellow, 110-170: green, 170-250: cyan, 250-310: blue, 310-360: purple).

포함 항목:
- **Brand hues**: `{hue}500`, `{hue}700`, `{hue}200` (primary에서 파생)
- **Accent hues**: `{accentHue}500`, `{accentHue}200` (hue + 150°)
- **Neutral scale**: `gray950` ~ `gray50` (11단계, undertone 적용)
- **Semantic hues**: `green500`, `green200`, `red500`, `red200`, `amber500`, `amber200`, `cyan500`, `cyan200`
- **Surface derivatives**: `surfaceSubtle`, `surfaceMuted`, `surfaceRaised` (oklch 파생)
- **Border derivatives**: `borderSubtle`, `borderDefault`, `borderStrong`
- **Dark variants**: `darkBg`, `darkSubtle`, `darkRaised`, `darkTextStrong`, `darkTextDefault`, `darkTextMuted`
- **Constants**: `white`, `black`

### Layer 2: Semantic (`tokens/semantic.ts`)

역할 기반 토큰. 100% primitive 참조. light/dark 모드 분기.

```
semantic.light:
  bgBase          → primitive.white
  bgSubtle        → primitive.surfaceSubtle
  bgMuted         → primitive.surfaceMuted
  bgRaised        → primitive.surfaceRaised
  textStrong      → primitive.gray900
  textDefault     → primitive.gray600
  textMuted       → primitive.gray400
  borderSubtle    → primitive.borderSubtle
  borderDefault   → primitive.borderDefault
  borderStrong    → primitive.borderStrong
  brandPrimary    → primitive.{hue}500
  brandHover      → primitive.{hue}700
  brandLight      → primitive.{hue}200
  accentPrimary   → primitive.{accentHue}500
  accentLight     → primitive.{accentHue}200
  success         → primitive.green500
  successLight    → primitive.green200
  error           → primitive.red500
  errorLight      → primitive.red200
  warning         → primitive.amber500
  warningLight    → primitive.amber200
  info            → primitive.cyan500
  infoLight       → primitive.cyan200

semantic.dark:
  bgBase          → primitive.darkBg
  bgSubtle        → primitive.darkSubtle
  bgRaised        → primitive.darkRaised
  textStrong      → primitive.darkTextStrong
  textDefault     → primitive.darkTextDefault
  textMuted       → primitive.darkTextMuted
  borderSubtle    → primitive.darkBorderSubtle
  borderDefault   → primitive.darkBorderDefault
  borderStrong    → primitive.darkBorderStrong
  brandPrimary    → primitive.{hue}500      (shared)
  brandHover      → primitive.{hue}700      (shared)
  brandLight      → primitive.{hue}200      (shared)
  (semantic hues shared)
```

### Layer 3: Component (`tokens/component.ts`)

컴포넌트 스코프. semantic만 참조. 상태별 세분화.

```
button.primary:
  bg              → semantic.brandPrimary
  bgHover         → semantic.brandHover
  bgActive        → semantic.brandHover     (same — active는 hover 유지 또는 archetype에서 결정)
  bgDisabled      → semantic.bgMuted
  text            → primitive.white         (예외: 대비 보장을 위해 primitive 직접 참조 허용)
  textDisabled    → semantic.textMuted

button.secondary:
  bg              → semantic.bgMuted
  bgHover         → semantic.bgRaised
  bgActive        → semantic.borderSubtle
  bgDisabled      → semantic.bgMuted
  text            → semantic.textStrong
  textDisabled    → semantic.textMuted

button.ghost:
  bg              → transparent
  bgHover         → semantic.bgSubtle
  bgActive        → semantic.bgMuted
  bgDisabled      → transparent
  text            → semantic.brandPrimary
  textDisabled    → semantic.textMuted
  border          → semantic.borderDefault
  borderDisabled  → semantic.borderSubtle

input:
  bg              → semantic.bgBase
  bgDisabled      → semantic.bgMuted
  border          → semantic.borderDefault
  borderFocus     → semantic.brandPrimary
  borderError     → semantic.error
  borderDisabled  → semantic.borderSubtle
  text            → semantic.textStrong
  placeholder     → semantic.textMuted
  label           → semantic.textStrong
  helper          → semantic.textDefault
  errorText       → semantic.error

card:
  bg              → semantic.bgSubtle
  border          → semantic.borderSubtle
  headerText      → semantic.textStrong
  bodyText        → semantic.textDefault

badge.default:
  bg              → semantic.bgMuted
  text            → semantic.textDefault
badge.success:
  bg              → semantic.successLight
  text            → semantic.success
badge.error:
  bg              → semantic.errorLight
  text            → semantic.error
badge.warning:
  bg              → semantic.warningLight
  text            → semantic.warning
badge.info:
  bg              → semantic.infoLight
  text            → semantic.info

avatar:
  bg              → semantic.brandLight
  text            → semantic.brandPrimary
  statusOnline    → semantic.success
  statusOffline   → semantic.textMuted

divider:
  line            → semantic.borderSubtle
  labelText       → semantic.textMuted
```

### Output: `tokens/index.ts`

```ts
export { primitive } from "./primitive.js";
export { semantic } from "./semantic.js";
export { component } from "./component.js";

// Tailwind theme용 flat merge
export function tailwindTheme() { ... }
```

---

## Component Specifications

모든 수치는 토큰 이름으로만 기술.

Available spacing scale: `3xs(2)`, `2xs(4)`, `xs(8)`, `sm(12)`, `md(16)`, `lg(24)`, `xl(32)`, `2xl(48)`, `3xl(64)`, `4xl(80)`

Available radius: `none`, `subtle`, `button`, `input`, `card`, `large`, `pill`

### Button

Variants: primary, secondary, ghost
Sizes: sm, md, lg
States: default, hover, active, disabled
Properties: label (TEXT), iconLeading (BOOLEAN), iconTrailing (BOOLEAN)

| Dimension | sm | md | lg |
|---|---|---|---|
| height | `spacing.xl` | `spacing.2xl` | `spacing.3xl` |
| paddingX | `spacing.sm` | `spacing.md` | `spacing.lg` |
| gap | `spacing.2xs` | `spacing.xs` | `spacing.xs` |
| radius | `radius.button` | `radius.button` | `radius.button` |
| font | `typography.caption` | `typography.button` | `typography.body` |
| iconSize | `spacing.md` | `spacing.md` | `spacing.lg` |

Structure:
```
[Button] horizontal auto-layout, center aligned
  ├── [IconLeading?] instance swap
  ├── [Label] text property
  └── [IconTrailing?] instance swap
```

Colors: all from `component.button.{variant}.{property}` tokens.

### Input

States: default, focus, error, disabled
Properties: label (TEXT), value (TEXT), helperText (TEXT), showHelper (BOOLEAN), showError (BOOLEAN)

| Dimension | Token |
|---|---|
| field height | `spacing.2xl` |
| field paddingX | `spacing.sm` |
| field radius | `radius.input` |
| label↔field gap | `spacing.2xs` |
| field↔helper gap | `spacing.2xs` |
| label font | `typography.label` |
| value font | `typography.body` |
| helper/error font | `typography.caption` |
| icon size | `spacing.md` |

Structure:
```
[Input] vertical auto-layout, gap spacing.2xs
  ├── [Label]
  ├── [Field] horizontal auto-layout, height spacing.2xl
  │     ├── [IconLeading?] spacing.md
  │     └── [Value]
  ├── [HelperText?] typography.caption
  └── [ErrorText?] typography.caption
```

Colors: all from `component.input.{property}` tokens.

### Card

Variants: default (with image), compact (no image)
Properties: title (TEXT), body (TEXT), showImage (BOOLEAN), showFooter (BOOLEAN)

| Dimension | Token |
|---|---|
| radius | `radius.card` |
| content padding | `spacing.lg` |
| content gap | `spacing.sm` |
| shadow | `elevation.raised` |
| border | `component.card.border` |
| title font | `typography.card-title` |
| body font | `typography.body` |
| footer gap | `spacing.xs` |

Structure:
```
[Card] vertical auto-layout, gap none
  ├── [Image?] fill width, top corners radius.card
  └── [Content] vertical auto-layout, padding spacing.lg, gap spacing.sm
        ├── [Title]
        ├── [Body]
        └── [Footer?] horizontal, gap spacing.xs
              ├── [ActionPrimary] Button sm
              └── [ActionSecondary?] Button sm ghost
```

### Badge

Variants: default, success, error, warning, info
Sizes: sm, md
Properties: label (TEXT)

| Dimension | sm | md |
|---|---|---|
| height | `spacing.lg` | `spacing.xl` |
| paddingX | `spacing.xs` | `spacing.sm` |
| radius | `radius.pill` | `radius.pill` |
| font | `typography.label` | `typography.caption` |

Colors: all from `component.badge.{variant}.{property}` tokens.

### Avatar

Sizes: sm, md, lg
Properties: initials (TEXT), showStatus (BOOLEAN)

| Dimension | sm | md | lg |
|---|---|---|---|
| size | `spacing.xl` | `spacing.2xl` | `spacing.3xl` |
| radius | `radius.pill` | `radius.pill` | `radius.pill` |
| font | `typography.caption` | `typography.button` | `typography.body` |
| statusDot | `spacing.xs` | `spacing.xs` | `spacing.sm` |

Colors: all from `component.avatar.{property}` tokens.

### Divider

Properties: showLabel (BOOLEAN), label (TEXT)

| Dimension | Token |
|---|---|
| line height | `spacing.3xs` |
| label paddingX | `spacing.sm` |
| label font | `typography.caption` |

Colors: `component.divider.line`, `component.divider.labelText`.

---

## Implementation Architecture

### Changed Modules

| Module | Change |
|---|---|
| `src/schema/types.ts` | Add `PrimitiveTokens`, `SemanticTokens`, `ComponentTokens` types. Update `DesignTokens` to `{ primitive, semantic, component, spacing, borderRadius, elevation, breakpoint, typography }` |
| `src/generator/color.ts` | Generate primitive names based on oklch hue detection (hue → color name). Output raw palette keyed by `{colorName}{step}` instead of semantic names |
| `src/generator/tokens.ts` | Split into `generatePrimitive()`, `generateSemantic(primitive, archetype)`, `generateComponent(semantic)`. Semantic/component never produce own hex values |
| `src/generator/components.ts` | 6 components with full state/size specs. All values reference component tokens |
| `src/schema/template.ts` | Section 2 renders primitive/semantic/component layers separately |
| `src/figma/transformer.ts` | 3 Figma variable collections: Primitives (hidden scopes), Semantic (Light/Dark), Component (Light/Dark) |
| **New** `src/generator/token-writer.ts` | Generates `output/tokens/*.ts` files as strings (pure function, no fs) |
| `src/cli/index.ts` | Write `output/tokens/` directory |

### Unchanged Modules

| Module | Reason |
|---|---|
| `src/schema/archetypes.ts` | Preset structure unchanged |
| `src/generator/typography.ts` | Typography scale independent |
| `src/generator/layout.ts` | Spacing/radius scales unchanged |
| `src/generator/elevation.ts` | Independent |
| `src/generator/responsive.ts` | Independent |

### Output Files

```
output/
├── DESIGN.md
├── design-tokens.json       → { primitive, semantic, component, spacing, ... }
├── figma-system.json         → 3 collections
└── tokens/
    ├── primitive.ts
    ├── semantic.ts
    ├── component.ts
    └── index.ts
```

### Dependency Flow

```
color.ts → raw palette with hue-based names
    ↓
generatePrimitive(palette, spacing, radius) → PrimitiveTokens
    ↓
generateSemantic(primitive, archetype) → SemanticTokens (refs only)
    ↓
generateComponent(semantic) → ComponentTokens (refs only)
    ↓
token-writer.ts → .ts files (strings)
figma/transformer.ts → Figma structure
schema/template.ts → DESIGN.md
```

---

## Figma Mapping

| Code Layer | Figma Collection | Modes | Scopes |
|---|---|---|---|
| primitive | Primitives | Value (1) | `[]` (hidden) |
| semantic | Semantic | Light, Dark | role-appropriate (FRAME_FILL, TEXT_FILL, STROKE_COLOR) |
| component | Component | Light, Dark | component-specific |

Semantic and component variables alias to primitives. In Figma this means `{ type: 'VARIABLE_ALIAS', id: primitiveVar.id }`.
