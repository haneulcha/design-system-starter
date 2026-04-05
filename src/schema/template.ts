// src/schema/template.ts

import type {
  DesignSystem,
  ColorRole,
  ButtonVariant,
  TypeStyle,
  ElevationLevel,
  Breakpoint,
} from "./types.js";

// ─── Color helpers ───────────────────────────────────────────────────────────

function renderColorList(colors: ColorRole[]): string {
  return colors
    .map((c) => `- **${c.name}** (\`${c.hex}\`): ${c.description}`)
    .join("\n");
}

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

function renderColors(system: DesignSystem): string {
  const lines: string[] = [];
  lines.push("## 2. Color System\n");

  lines.push("### Primary\n");
  lines.push(renderColorList(system.colors.primary));

  lines.push("\n### Accent\n");
  lines.push(renderColorList(system.colors.accent));

  lines.push("\n### Neutral Scale\n");
  lines.push(renderColorList(system.colors.neutral));

  lines.push("\n### Semantic\n");
  lines.push(renderColorList(system.colors.semantic));

  lines.push("\n### Surface & Background\n");
  lines.push(renderColorList(system.colors.surface));

  lines.push("\n### Border\n");
  lines.push(renderColorList(system.colors.border));

  lines.push("\n### Dark Mode\n");
  lines.push("**Surfaces:**");
  lines.push(renderColorList(system.colors.dark.surface));
  lines.push("\n**Text:**");
  lines.push(renderColorList(system.colors.dark.text));
  lines.push("\n**Borders:**");
  lines.push(renderColorList(system.colors.dark.border));

  return lines.join("\n");
}

function renderTypography(system: DesignSystem): string {
  const lines: string[] = [];
  lines.push("## 3. Typography\n");

  lines.push("### Font Families\n");
  const f = system.typography.families;
  lines.push(`- **Primary:** ${f.primary}, ${f.primaryFallback}`);
  lines.push(`- **Mono:** ${f.mono}, ${f.monoFallback}`);

  lines.push("\n### Type Scale\n");
  lines.push(
    "| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |"
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const t of system.typography.hierarchy) {
    lines.push(
      `| ${t.role} | ${t.font} | ${t.size} | ${t.weight} | ${t.lineHeight} | ${t.letterSpacing} | ${t.notes} |`
    );
  }

  lines.push("\n### Principles\n");
  for (const p of system.typography.principles) {
    lines.push(`- ${p}`);
  }

  return lines.join("\n");
}

function renderComponents(system: DesignSystem): string {
  const lines: string[] = [];
  lines.push("## 4. Components\n");

  lines.push("### Buttons\n");
  for (const btn of system.components.buttons) {
    lines.push(`**${btn.name}**`);
    lines.push(`- Background: \`${btn.background}\``);
    lines.push(`- Text: \`${btn.text}\``);
    lines.push(`- Padding: ${btn.padding}`);
    lines.push(`- Radius: ${btn.radius}`);
    lines.push(`- Shadow: ${btn.shadow}`);
    lines.push(`- Hover: \`${btn.hoverBg}\``);
    lines.push(`- Use: ${btn.use}`);
    lines.push("");
  }

  lines.push("### Cards & Containers\n");
  const c = system.components.cards;
  lines.push(`- Background: \`${c.background}\``);
  lines.push(`- Border: ${c.border}`);
  lines.push(`- Radius: ${c.radius}`);
  lines.push(`- Shadow: ${c.shadow}`);
  lines.push(`- Padding: ${c.padding}`);
  lines.push(`- Hover Effect: ${c.hoverEffect}`);

  lines.push("\n### Inputs & Forms\n");
  const inp = system.components.inputs;
  lines.push(`- Background: \`${inp.background}\``);
  lines.push(`- Border: ${inp.border}`);
  lines.push(`- Radius: ${inp.radius}`);
  lines.push(`- Focus Border: \`${inp.focusBorder}\``);
  lines.push(`- Focus Shadow: ${inp.focusShadow}`);
  lines.push(`- Padding: ${inp.padding}`);
  lines.push(`- Text Color: \`${inp.textColor}\``);
  lines.push(`- Placeholder Color: \`${inp.placeholderColor}\``);

  lines.push("\n### Navigation\n");
  const nav = system.components.navigation;
  lines.push(`- Background: \`${nav.background}\``);
  lines.push(`- Position: ${nav.position}`);
  lines.push(`- Link Size: ${nav.linkSize}`);
  lines.push(`- Link Weight: ${nav.linkWeight}`);
  lines.push(`- Link Color: \`${nav.linkColor}\``);
  lines.push(`- Active Indicator: ${nav.activeIndicator}`);

  return lines.join("\n");
}

function renderLayout(system: DesignSystem): string {
  const lines: string[] = [];
  lines.push("## 5. Layout & Spacing\n");

  lines.push("### Spacing System\n");
  lines.push("Base unit: 8px. Scale:");
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
    `**Mood:** ${system.mood}`,
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
