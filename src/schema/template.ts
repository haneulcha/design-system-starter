// src/schema/template.ts

import type { DesignSystem } from "./types.js";
import {
  PALETTE_SLOTS,
  SURFACE_SLOTS,
  TEXT_SLOTS,
  ACCENT_SLOTS,
  STATUS_SLOTS,
  ARCHETYPE_PALETTES,
} from "./archetype-palettes.js";
import type { ColorCategoryTokens } from "../generator/color-category.js";
import {
  SIZE_SCALE,
  WEIGHT_SCALE,
  LINE_HEIGHT_SCALE,
  LETTER_SPACING_VALUES,
} from "./typography.js";
import type { TypographyCategoryTokens, TypographyToken } from "../generator/typography-category.js";

// ─── Section renderers ───────────────────────────────────────────────────────

function renderTheme(system: DesignSystem): string {
  const lines: string[] = [];
  lines.push("## 1. Theme & Atmosphere\n");
  lines.push(system.theme.atmosphere);
  lines.push("");
  lines.push("**Key Characteristics:**");
  for (const c of system.theme.characteristics) {
    lines.push(`- ${c}`);
  }
  return lines.join("\n");
}

function renderPaletteGroup(
  heading: string,
  slots: readonly string[],
  tokens: ColorCategoryTokens,
): string[] {
  const lines: string[] = [];
  const baseline = ARCHETYPE_PALETTES[tokens.preset];
  lines.push(`### ${heading}\n`);
  lines.push("| Slot | Hex | Source |");
  lines.push("|------|-----|--------|");
  for (const slot of slots) {
    const hex = tokens.palette[slot as keyof typeof tokens.palette];
    const isOverride = baseline[slot as keyof typeof baseline] !== hex;
    lines.push(`| \`${slot}\` | \`${hex}\` | ${isOverride ? "override" : "archetype"} |`);
  }
  return lines;
}

function renderColors(system: DesignSystem): string {
  const tokens = system.colorTokens;
  const lines: string[] = [];
  lines.push("## 2. Color System\n");
  lines.push(
    `Palette anchored on the **${tokens.preset}** archetype. ${PALETTE_SLOTS.length} ` +
      "slots total: 3 surface, 3 text, 1 accent, 8 status (4 roles × bg/text). Status " +
      "slots are universal across archetypes.\n",
  );

  const overrideCount = Object.keys(tokens.overrides).length;
  if (overrideCount > 0) {
    lines.push(`**Overrides applied:** ${overrideCount} slot(s) deviate from the archetype baseline.\n`);
  } else {
    lines.push("**Overrides applied:** none — palette matches the archetype baseline.\n");
  }

  lines.push(...renderPaletteGroup("Surface", SURFACE_SLOTS, tokens));
  lines.push("");
  lines.push(...renderPaletteGroup("Text", TEXT_SLOTS, tokens));
  lines.push("");
  lines.push(...renderPaletteGroup("Accent", ACCENT_SLOTS, tokens));
  lines.push("");
  lines.push(...renderPaletteGroup("Status", STATUS_SLOTS, tokens));

  return lines.join("\n");
}

function renderFontChains(tokens: TypographyCategoryTokens): string[] {
  const lines: string[] = [];
  lines.push("### Font Family Chains\n");
  lines.push(`- **Sans:** ${tokens.fontChains.sans}`);
  lines.push(`- **Mono:** ${tokens.fontChains.mono}`);
  lines.push(`- **Serif:** ${tokens.fontChains.serif}`);
  return lines;
}

function renderScales(): string[] {
  const lines: string[] = [];
  lines.push("### Scales\n");
  lines.push(`**Size scale (px):** ${SIZE_SCALE.join(", ")}`);
  lines.push(`**Weight scale:** ${WEIGHT_SCALE.join(", ")}`);
  lines.push(`**Line-height scale:** ${LINE_HEIGHT_SCALE.join(", ")}`);
  lines.push(`**Letter-spacing values:** ${LETTER_SPACING_VALUES.join(", ")}`);
  return lines;
}

function renderCategoryTable(
  label: string,
  category: string,
  variantKeys: string[],
  profiles: Record<string, TypographyToken>,
): string[] {
  const lines: string[] = [];
  lines.push(`#### ${label}\n`);
  lines.push("| variant | size | weight | line-height | letter-spacing |");
  lines.push("| --- | ---: | ---: | ---: | --- |");
  for (const variant of variantKeys) {
    const key = `${category}.${variant}`;
    const t = profiles[key];
    if (!t) continue;
    lines.push(`| ${variant} | ${t.size} | ${t.weight} | ${t.lineHeight} | ${t.letterSpacing} |`);
  }
  return lines;
}

function renderSingleVariantTable(profiles: Record<string, TypographyToken>): string[] {
  const lines: string[] = [];
  lines.push("#### Single-variant categories\n");
  lines.push("| category | family | size | weight | line-height | letter-spacing |");
  lines.push("| --- | --- | ---: | ---: | ---: | --- |");
  const singleKeys = ["card", "nav", "link", "badge"];
  for (const key of singleKeys) {
    const t = profiles[key];
    if (!t) continue;
    // Derive slot name from fontFamily chain: mono chain means "mono", serif means "serif", else "sans"
    const familySlot = t.fontFamily.startsWith('"Geist Mono"') || t.fontFamily.startsWith("Geist Mono")
      ? "mono"
      : t.fontFamily.startsWith("Georgia") || t.fontFamily.startsWith('"Georgia"')
        ? "serif"
        : "sans";
    lines.push(`| ${key} | ${familySlot} | ${t.size} | ${t.weight} | ${t.lineHeight} | ${t.letterSpacing} |`);
  }
  return lines;
}

function renderTypography(system: DesignSystem): string {
  const tokens = system.typographyTokens;
  const lines: string[] = [];
  lines.push("## 3. Typography\n");

  lines.push(...renderFontChains(tokens));
  lines.push("");
  lines.push(...renderScales());
  lines.push("");
  lines.push("### Category profiles\n");
  lines.push(...renderCategoryTable("Heading", "heading", ["xl", "lg", "md", "sm", "xs"], tokens.profiles));
  lines.push("");
  lines.push(...renderCategoryTable("Body", "body", ["lg", "md", "sm"], tokens.profiles));
  lines.push("");
  lines.push(...renderCategoryTable("Caption", "caption", ["md", "sm", "xs"], tokens.profiles));
  lines.push("");
  lines.push(...renderCategoryTable("Code (mono family)", "code", ["md", "sm", "xs"], tokens.profiles));
  lines.push("");
  lines.push(...renderCategoryTable("Button", "button", ["md", "sm"], tokens.profiles));
  lines.push("");
  lines.push(...renderSingleVariantTable(tokens.profiles));

  return lines.join("\n");
}

type SizeTableRow<S> = readonly [label: string, getter: (s: S) => string];

/** Render a markdown table with one column per size and one row per field.
 *  Used for every primitive that has a per-size matrix (button/input/card/
 *  badge/tab/avatar). */
function renderSizeTable<S>(
  sizes: Record<string, S>,
  rows: readonly SizeTableRow<S>[],
): string[] {
  const sizeNames = Object.keys(sizes);
  const lines: string[] = [];
  lines.push(`| | ${sizeNames.join(" | ")} |`);
  lines.push(`|---|${sizeNames.map(() => "---|").join("")}`);
  for (const [label, getter] of rows) {
    const cells = sizeNames.map((sz) => getter(sizes[sz])).join(" | ");
    lines.push(`| ${label} | ${cells} |`);
  }
  return lines;
}

function renderComponents(system: DesignSystem): string {
  const t = system.componentTokens;
  const lines: string[] = [];
  lines.push("## 4. Components\n");
  lines.push(`_Knobs: \`cardSurface=${t.knobs.cardSurface}\`, \`buttonShape=${t.knobs.buttonShape}\`. ${t.philosophy}_\n`);

  // ── Button ──────────────────────────────────────────────────────────────────
  lines.push("### Button\n");
  lines.push("**Sizes:**\n");
  lines.push(...renderSizeTable(t.button.sizes, [
    ["height",   (s) => s.height],
    ["paddingX", (s) => s.paddingX],
    ["gap",      (s) => s.gap],
    ["fontSize", (s) => s.fontSize],
    ["iconSize", (s) => s.iconSize],
    ["radius",   (s) => s.radius],
  ]));
  lines.push("");
  lines.push(`**Variants:** ${t.button.variants.join(", ")}`);
  lines.push(`**States:** ${t.button.states.join(", ")}\n`);
  lines.push("**Colors:** component.button.{variant}.{state} tokens\n");
  lines.push("**Structure:**");
  lines.push("```");
  lines.push("[Button] horizontal auto-layout, center aligned");
  lines.push("  ├── [IconLeading?] instance swap");
  lines.push("  ├── [Label] text property");
  lines.push("  └── [IconTrailing?] instance swap");
  lines.push("```");

  // ── Input ───────────────────────────────────────────────────────────────────
  lines.push("\n### Input\n");
  lines.push("**Sizes:**\n");
  lines.push(...renderSizeTable(t.input.sizes, [
    ["height",     (s) => s.height],
    ["paddingX",   (s) => s.paddingX],
    ["radius",     (s) => s.radius],
    ["labelFont",  (s) => s.labelFont],
    ["valueFont",  (s) => s.valueFont],
    ["helperFont", (s) => s.helperFont],
  ]));
  lines.push("");
  lines.push(`**Variants:** ${t.input.variants.join(", ")}`);
  lines.push(`**States:** ${t.input.states.join(", ")}\n`);
  lines.push("**Structure:**");
  lines.push("```");
  lines.push("[Input] vertical auto-layout");
  lines.push("  ├── [Label] text property");
  lines.push("  ├── [Field] horizontal auto-layout");
  lines.push("  │   ├── [IconLeading?] instance swap");
  lines.push("  │   ├── [Value] text property");
  lines.push("  │   └── [IconTrailing?] instance swap");
  lines.push("  └── [HelperText?] text property");
  lines.push("```");

  // ── Card ────────────────────────────────────────────────────────────────────
  lines.push("\n### Card\n");
  lines.push("**Sizes:**\n");
  lines.push(...renderSizeTable(t.card.sizes, [
    ["radius",         (s) => s.radius],
    ["contentPadding", (s) => s.contentPadding],
    ["contentGap",     (s) => s.contentGap],
    ["elevatedShadow", (s) => s.elevatedShadow],
    ["headerFont",     (s) => s.headerFont],
    ["bodyFont",       (s) => s.bodyFont],
  ]));
  lines.push("");
  lines.push(`**Variants:** ${t.card.variants.join(", ")} _(default: ${t.card.defaultVariant})_\n`);
  lines.push("**Structure:**");
  lines.push("```");
  lines.push("[Card] vertical auto-layout");
  lines.push("  ├── [Header?] text property");
  lines.push("  ├── [Body] text property");
  lines.push("  └── [Footer?] horizontal auto-layout");
  lines.push("```");

  // ── Badge ───────────────────────────────────────────────────────────────────
  lines.push("\n### Badge\n");
  lines.push("**Sizes:**\n");
  lines.push(...renderSizeTable(t.badge.sizes, [
    ["height",   (s) => s.height],
    ["paddingX", (s) => s.paddingX],
    ["radius",   (s) => s.radius],
    ["font",     (s) => s.font],
  ]));
  lines.push("");
  lines.push(`**Variants:** ${t.badge.variants.join(", ")}`);

  // ── Tab ─────────────────────────────────────────────────────────────────────
  lines.push("\n### Tab\n");
  lines.push("**Sizes:**\n");
  lines.push(...renderSizeTable(t.tab.sizes, [
    ["height",   (s) => s.height],
    ["paddingX", (s) => s.paddingX],
    ["gap",      (s) => s.gap],
    ["font",     (s) => s.font],
  ]));
  lines.push("");
  lines.push(`**Variants:** ${t.tab.variants.join(", ")}`);
  lines.push(`**States:** ${t.tab.states.join(", ")}`);

  // ── Avatar ──────────────────────────────────────────────────────────────────
  lines.push("\n### Avatar\n");
  lines.push("**Sizes:**\n");
  lines.push(...renderSizeTable(t.avatar.sizes, [
    ["dimension", (s) => s.dimension],
  ]));
  lines.push("");
  lines.push(`**Variants:** ${t.avatar.variants.join(", ")}`);
  lines.push(`**Radius:** ${t.avatar.radius}`);

  return lines.join("\n");
}

function renderLayout(system: DesignSystem): string {
  const lines: string[] = [];
  lines.push("## 5. Layout & Spacing\n");

  lines.push("### Spacing System\n");
  const density = system.spacingTokens.knobs.density;
  lines.push(`4-multiple scale. Density: \`${density}\` (section = ${system.spacingTokens.aliases.section}px). Aliases:`);
  for (const s of system.layout.spacing) {
    lines.push(`- **${s.name}:** ${s.value}`);
  }

  lines.push("\n### Grid & Container\n");
  const g = system.layout.grid;
  lines.push(`- Max Width: ${g.maxWidth}`);
  lines.push(`- Columns: ${g.columns}`);
  lines.push(`- Gutter: ${g.gutter}`);

  lines.push("\n### Whitespace Philosophy\n");
  lines.push(system.layout.whitespacePhilosophy);

  lines.push("\n### Border Radius Scale\n");
  for (const r of system.layout.borderRadius) {
    lines.push(`- **${r.name}** (${r.value}): ${r.use}`);
  }

  return lines.join("\n");
}

function renderElevation(system: DesignSystem): string {
  const lines: string[] = [];
  lines.push("## 6. Elevation & Shadows\n");

  lines.push("| Level | Treatment | Use |");
  lines.push("| --- | --- | --- |");
  for (const lvl of system.elevation.levels) {
    lines.push(`| ${lvl.name} (${lvl.level}) | \`${lvl.shadow}\` | ${lvl.use} |`);
  }

  lines.push("");
  lines.push("**Shadow Philosophy:** " + system.elevation.philosophy);

  return lines.join("\n");
}

function renderDosAndDonts(system: DesignSystem): string {
  const lines: string[] = [];
  lines.push("## 7. Dos and Don'ts\n");

  lines.push("### Do\n");
  for (const d of system.dos) {
    lines.push(`- ${d}`);
  }

  lines.push("\n### Don't\n");
  for (const d of system.donts) {
    lines.push(`- ${d}`);
  }

  return lines.join("\n");
}

function renderResponsive(system: DesignSystem): string {
  const lines: string[] = [];
  lines.push("## 8. Responsive Design\n");

  lines.push("### Breakpoints\n");
  lines.push("| Name | Width | Key Changes |");
  lines.push("| --- | --- | --- |");
  for (const bp of system.responsive.breakpoints) {
    const width =
      bp.maxWidth && bp.maxWidth !== ""
        ? `${bp.minWidth} – ${bp.maxWidth}`
        : `${bp.minWidth}+`;
    lines.push(`| ${bp.name} | ${width} | ${bp.changes} |`);
  }

  lines.push("\n### Touch Targets\n");
  lines.push(system.responsive.touchTarget);

  lines.push("\n### Collapsing Strategy\n");
  for (const s of system.responsive.collapsingStrategy) {
    lines.push(`- ${s}`);
  }

  lines.push("\n### Image Behavior\n");
  for (const b of system.responsive.imageBehavior) {
    lines.push(`- ${b}`);
  }

  return lines.join("\n");
}

function renderAgentGuide(system: DesignSystem): string {
  const lines: string[] = [];
  lines.push("## 9. Agent Guide\n");

  lines.push("### Quick Color Reference\n");
  for (const c of system.agentGuide.quickColors) {
    lines.push(`- **${c.name}:** \`${c.hex}\``);
  }

  lines.push("\n### Example Component Prompts\n");
  for (const p of system.agentGuide.examplePrompts) {
    lines.push(`- ${p}`);
  }

  lines.push("\n### Iteration Guide\n");
  system.agentGuide.iterationTips.forEach((tip, i) => {
    lines.push(`${i + 1}. ${tip}`);
  });

  return lines.join("\n");
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function renderDesignMd(system: DesignSystem): string {
  const sections = [
    `# Design System: ${system.brandName}`,
    "",
    renderTheme(system),
    "",
    renderColors(system),
    "",
    renderTypography(system),
    "",
    renderComponents(system),
    "",
    renderLayout(system),
    "",
    renderElevation(system),
    "",
    renderDosAndDonts(system),
    "",
    renderResponsive(system),
    "",
    renderAgentGuide(system),
  ];

  return sections.join("\n");
}
