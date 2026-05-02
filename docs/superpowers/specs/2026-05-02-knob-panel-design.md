# Inspector Knob Panels — Design Spec

**Date:** 2026-05-02
**Scope:** First slice — repair web baseline + ship Radius inspector panel
**Follow-up:** 5 more category panels (Color, Typography, Spacing, Elevation, Component) reuse the same architecture and KnobRow pattern.

## Problem

The schema and generator now expose 6 categories of inductively-derived knobs (color, typography, spacing, radius, elevation, component) plus 5 cross-category presets. The web app (`web/`) was not updated during the migration. It is currently broken at type-check (30+ errors) and only exposes the legacy 4-input wizard (brand / primary color / mood / font). Users cannot touch the per-category knobs.

## Goal

1. Repair the web app to compile against the current schema/generator.
2. Replace the existing result-page sidebar with a new 3-column layout (basics ‖ preview ‖ inspector).
3. Ship the **Radius inspector panel** as the first working knob surface, validating the architecture, KnobRow pattern, and sticky-preset override model.
4. Stub the remaining 5 category tabs (disabled) so future slices only fill in panels.

Out of scope:
- Color / Typography / Spacing / Elevation / Component panels (later slices).
- Wizard polish (`StepArchetype` / `StepFont` get minimum repair only).
- Persistence (URL params, localStorage, named saved configs).
- Mobile redesign — acceptable to stack to one column at `< lg`.

## Decisions (from brainstorming)

| ID | Decision | Source |
|---|---|---|
| D1 | **Layout:** right inspector with category tabs (Figma-style) | §1 — chose B over sidebar-expansion / inline-toolbar |
| D2 | **Override model:** sticky preset — mood stays selected; individual knob edits override on top; per-category ↺ Reset | §2 — chose Sticky over "Customized" / "Detach" |
| D3 | **First category:** Radius (single knob, 4 enum options — minimal infra surface) | §3 — chose Radius over Color / Typography |
| D4 | **Knob render pattern:** full-width row — mini button/input preview · label · monospace token-value | §4 — chose C over chip-grid / segmented |
| D5 | **Repair strategy:** repair-as-you-go inside the same PR as the inspector intro | §design-1 — chose over fix-only PR / wholesale rewrite |

## Architecture

### Layout

```
ResultPage (3-column on lg+, stacks below)
├── Left sidebar (w-72)        — Basics: brand name, brand color, preset, font, download
├── Main preview (flex-1)      — Color scales, components, typography (existing)
└── Right inspector (w-80)     — Tabs + active panel + ↺ Reset
```

### New files

| File | Responsibility |
|---|---|
| `web/src/inspector/Inspector.tsx` | Right-rail container; owns active-tab state; slots active panel |
| `web/src/inspector/CategoryTabs.tsx` | 6-tab strip; disabled state for unbuilt categories |
| `web/src/inspector/KnobRow.tsx` | Reusable row: mini-preview ‖ label ‖ token-value ‖ preset-badge |
| `web/src/inspector/ResetButton.tsx` | Per-category "↺ Reset to preset" |
| `web/src/inspector/panels/RadiusPanel.tsx` | First implemented panel; renders 4 KnobRow for `style` knob |

### Touched files (repair + integration)

| File | Change |
|---|---|
| `web/src/App.tsx` | Wire expanded `WizardState` (knob overrides) |
| `web/src/result/ResultPage.tsx` | Split sidebar into Basics; add `<Inspector>` rail; fix typography reads |
| `web/src/hooks/useGenerator.ts` | Reshape `WizardState`; rename `primaryColor`→`brandColor`, `mood`→`preset`; pass `radiusKnobs` to `generate()` |
| `web/src/components/DSButton.tsx` | Drop `archetype` prop; read `tokens.borderRadius.button` and `tokens.elevation.*` |
| `web/src/components/DSInput.tsx` | Drop `archetype` prop; read `tokens.borderRadius.input` |
| `web/src/components/DSCard.tsx` | Drop `archetype` prop; read `tokens.borderRadius.card` and `tokens.elevation.*` |
| `web/src/components/DSBadge.tsx` | Drop `archetype` prop; read `tokens.borderRadius.pill` |
| `web/src/components/TypeScale.tsx` | Read `system.typographyTokens` instead of removed `system.typography` |
| `web/src/lib/tokens.ts` | Fix `system.typography` references |
| `web/src/steps/StepArchetype.tsx` | Update mood vocabulary to `clean-minimal | warm-friendly | bold-energetic | professional | playful-creative` |
| `web/src/steps/StepFont.tsx` | Drop `archetype.suggestedFonts` reads (use a static suggested list inline for now) |

## State flow

### WizardState shape

```ts
interface WizardState {
  brandName: string;
  brandColor: string;
  preset: PresetName;
  fontFamily: string;
  radiusKnobs?: RadiusInput;
  // future: colorKnobs, typographyKnobs, spacingKnobs, elevationKnobs, componentKnobs
}
```

`undefined` knob = "use preset value". Setting to a defined value = explicit override.

### useGenerator passthrough

```ts
generate({
  brandName: state.brandName,
  brandColor: state.brandColor,
  fontFamily: state.fontFamily,
  preset: state.preset,
  radiusKnobs: state.radiusKnobs,
});
```

Generator already does `inputs.radiusKnobs ?? preset?.radiusKnobs`. The web layer only knows touched/untouched; it never inspects the preset's value to compute the call.

### Inspector "effective value" computation

```ts
effectiveRadiusStyle =
  state.radiusKnobs?.style                     // user override
  ?? PRESETS[state.preset].radiusKnobs?.style  // preset value
  ?? DEFAULT_RADIUS_KNOBS.style;               // ultimate fallback
```

Inspector imports `PRESETS` and `DEFAULT_RADIUS_KNOBS` from `@core/schema`.

### Reset

```ts
onResetCategory("radius") → setState({ ...state, radiusKnobs: undefined });
```

Stateless: re-yields preset value. No diff bookkeeping.

### Override indicator

```ts
isRadiusOverridden = state.radiusKnobs?.style !== undefined;
```

Inspector header shows a `•` dot when overridden. Footer shows ↺ Reset only when overridden. KnobRow shows a `preset` badge when the user's selection happens to equal the preset value.

## Radius panel detail

### Visual structure

```tsx
<InspectorPanel category="radius">
  <PanelHeader title="Radius" subtitle="Corner geometry" overridden={isOverridden} />
  <KnobSection label="Style">
    <KnobRow selected={effective === "sharp"}    isPreset={presetValue === "sharp"}    onClick={...} preview={<Mini btn={4} input={4} />}        label="sharp"    tokens="4·4·8" />
    <KnobRow selected={effective === "standard"} isPreset={presetValue === "standard"} onClick={...} preview={<Mini btn={8} input={8} />}        label="standard" tokens="8·8·12" />
    <KnobRow selected={effective === "generous"} isPreset={presetValue === "generous"} onClick={...} preview={<Mini btn={12} input={8} />}       label="generous" tokens="12·8·16" />
    <KnobRow selected={effective === "pill"}     isPreset={presetValue === "pill"}     onClick={...} preview={<Mini btn="pill" input="pill" />}  label="pill"     tokens="∞·∞·12" />
  </KnobSection>
  {isOverridden && <ResetButton onClick={() => onResetCategory("radius")} />}
</InspectorPanel>
```

### KnobRow visual spec

| Region | Content | Width |
|---|---|---|
| Mini preview | div with actual `border-radius`: button (18×12) + input (14×12) side-by-side | ~44px fixed |
| Label | knob value name (lowercase) | flex:1 |
| Token value | `button·input·card` px (mono, 9px, right-aligned) | auto |

### State styles

- Unselected: `border: 1px solid neutral-200`
- Selected: `border: 1.5px solid neutral-900`, `bg: neutral-50`
- Preset-match: small grey `preset` text-badge after the label
- Overridden: panel header dot `•`, footer ↺ Reset visible

### Live update

`onClick` → `onChange({ radiusKnobs: { style: ... } })` — `useGenerator`'s `useMemo` re-runs, all preview components re-render with the new `tokens.borderRadius.*` values.

### Mini preview safety

- Mini preview uses pure CSS divs (no `DSButton` recursion — inspector must stay light).
- `pill` (9999px) at 18px width simply renders as a horizontal capsule — intended.
- Card radius is not drawn in the mini preview (would crowd at 44px) — token-value text carries that info.

## Reset semantics & edge cases

**EC-1. User explicitly selects the same value as the preset.**
Store as override (`state.radiusKnobs = { style: "sharp" }`). Show ↺ Reset and `preset` badge. Preserves user intent across future preset changes.

**EC-2. User changes preset while a category is overridden.**
Override persists. Sticky-preset model is consistent. ↺ Reset remains visible as the discoverable escape hatch. (Optional v2: toast.)

**EC-3. Preset omits a category's knobs.**
Falls through to `DEFAULT_RADIUS_KNOBS`. Inspector shows a grey `default` badge instead of `preset`. All v1 PRESETS specify `radiusKnobs`, so this path is near-dead but typed correctly.

**EC-4. Definition of Done.**
- `pnpm exec tsc --noEmit` in `web/` passes.
- All 4 radius styles render visibly differently in the main preview when clicked.
- ↺ Reset returns the preview to the active preset's radius.

## Risks & rejected alternatives

- **Rejected: fix-only PR first, then inspector PR.** Splits the work but adds a no-visible-change phase. Repair-as-you-go is more efficient because the same files (`DSButton`, `DSCard`, etc.) need both the legacy-removal change and the new `tokens`-only read pattern.
- **Rejected: wholesale wizard removal.** Would later complicate revising onboarding to a corpus-aware first-run flow.
- **Risk: KnobRow grows a long flexible API as 5 more panels need it.** Mitigation: when the second category panel lands, refactor KnobRow only if its API is genuinely strained — don't pre-design for the unbuilt 4.
- **Risk: 3-column at `lg` could feel cramped on 13" laptops.** Acceptable for v1; revisit if user feedback flags it.

## Future slices (not in this spec)

1. **Color panel.** Knobs: `neutral.tint` (4), `semantic.depth` (2), `accent.secondary` (on/off). KnobRow grows to handle multi-knob panels.
2. **Typography panel.** Knobs: `headingStyle` + font family chains (sans/serif/mono).
3. **Spacing panel.** Knob: `density` (compact/cozy/spacious).
4. **Elevation panel.** Knobs: `style` × `intensity`.
5. **Component panel.** Knobs: `cardSurface` + `buttonShape`.
