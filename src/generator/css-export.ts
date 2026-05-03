// src/generator/css-export.ts
//
// Emits a CSS variables file from DesignTokens.
// 2-layer architecture: primitives defined first, semantic vars reference them
// via var(). Dark mode only overrides the primitive layer — semantics cascade.

import type { DesignTokens, Oklch } from "../schema/types.js";
import { formatOklch } from "./color.js";

function fmtOklch(o: Oklch): string {
  return formatOklch(o);
}

/** Format a CSS variable name segment: keep kebab-case, replace "/" with "-". */
function varName(prefix: string, key: string): string {
  return `--${prefix}-${key.replace(/\//g, "-")}`;
}

function fmtRadius(value: number): string {
  if (value === -1) return "50%";
  if (value === 9999) return "9999px";
  return `${value}px`;
}

export function generateCssVariables(tokens: DesignTokens): string {
  const lines: string[] = [];

  // ─── :root ────────────────────────────────────────────────────────────────
  lines.push("/**");
  lines.push(` * ${tokens.brand.name} — design tokens (CSS variables).`);
  lines.push(" * Generated from DesignTokens. Use directly or with the companion");
  lines.push(" * tailwind.config.js (which references these variable names).");
  lines.push(" */");
  lines.push(":root {");

  // ── Color Primitives (base layer) ─────────────────────────────────────────
  // Hue-keyed: neutral.50-900, accent.500, red/green/amber/blue × {50, 500}.
  // Dark mode overrides only this section — semantics cascade via var().
  const HUE_ORDER = ["neutral", "accent", "red", "green", "amber", "blue"] as const;
  const HUE_LABEL: Record<string, string> = {
    neutral: "Neutral",
    accent:  "Accent",
    red:     "Status (red)",
    green:   "Status (green)",
    amber:   "Status (amber)",
    blue:    "Status (blue)",
  };

  for (const hue of HUE_ORDER) {
    const hueMap = tokens.primitive.colors[hue];
    if (!hueMap) continue;
    lines.push(`  /* ${HUE_LABEL[hue]} */`);
    const stops = Object.keys(hueMap).sort((a, b) => Number(a) - Number(b));
    for (const stop of stops) {
      lines.push(`  --color-${hue}-${stop}: ${fmtOklch(hueMap[stop].light)};`);
    }
    lines.push("");
  }

  // ── Color Semantic (alias layer) ──────────────────────────────────────────
  // Each var references a primitive via var(). No values baked in.
  lines.push("  /* Colors (semantic) */");
  for (const [role, ref] of Object.entries(tokens.semantic)) {
    const v = varName("color", role);
    if (ref === "transparent") {
      lines.push(`  ${v}: transparent;`);
      continue;
    }
    const slash = ref.indexOf("/");
    if (slash !== -1) {
      const hue = ref.slice(0, slash);
      const stop = ref.slice(slash + 1);
      lines.push(`  ${v}: var(--color-${hue}-${stop});`);
    }
  }

  // ── Spacing ───────────────────────────────────────────────────────────────
  lines.push("");
  lines.push("  /* Spacing */");
  for (const [name, value] of Object.entries(tokens.spacing)) {
    lines.push(`  ${varName("spacing", name)}: ${value}px;`);
  }

  // ── Radius Primitives (base layer, sm/md/lg names) ───────────────────────
  // Reserved 6px stop is NOT exposed; every other SCALE stop maps to an alias.
  const RADIUS_PX_TO_ALIAS: Record<number, string> = {
    0: "none",
    2: "xs",
    4: "sm",
    8: "md",
    12: "lg",
    16: "xl",
    24: "2xl",
    9999: "pill",
    [-1]: "circle", // -1 sentinel = 50%
  };
  const RADIUS_ALIAS_VALUE: Record<string, string> = {
    none: "0",
    xs: "2px",
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "24px",
    pill: "9999px",
    circle: "50%",
  };
  const RADIUS_ALIAS_ORDER = ["none", "xs", "sm", "md", "lg", "xl", "2xl", "pill", "circle"];

  lines.push("");
  lines.push("  /* Radius Primitives */");
  for (const alias of RADIUS_ALIAS_ORDER) {
    lines.push(`  --radius-${alias}: ${RADIUS_ALIAS_VALUE[alias]};`);
  }

  // ── Border Radius Semantic (alias layer) ─────────────────────────────────
  // Skip names that already exist as base aliases (none/pill/circle) —
  // emitting `--radius-none: var(--radius-none)` would be a self-reference
  // cycle that resolves to invalid in CSS.
  const RADIUS_BASE_NAMES = new Set(RADIUS_ALIAS_ORDER);
  lines.push("");
  lines.push("  /* Border Radius (semantic) */");
  for (const [name, value] of Object.entries(tokens.borderRadius)) {
    if (RADIUS_BASE_NAMES.has(name)) continue;
    const v = varName("radius", name);
    const alias = RADIUS_PX_TO_ALIAS[value];
    if (alias) {
      lines.push(`  ${v}: var(--radius-${alias});`);
    } else {
      lines.push(`  ${v}: ${fmtRadius(value)};`);
    }
  }

  // ── Typography — font families ────────────────────────────────────────────
  lines.push("");
  lines.push("  /* Typography — families */");
  for (const [slot, chain] of Object.entries(tokens.typography.families)) {
    lines.push(`  ${varName("font", slot)}: ${chain};`);
  }

  // ── Typography — styles ───────────────────────────────────────────────────
  lines.push("");
  lines.push("  /* Typography — styles */");
  for (const [key, style] of Object.entries(tokens.typography.styles)) {
    lines.push(`  ${varName("type", key)}-size: ${style.fontSize}px;`);
    lines.push(`  ${varName("type", key)}-weight: ${style.fontWeight};`);
    lines.push(`  ${varName("type", key)}-line-height: ${style.lineHeight};`);
    lines.push(
      `  ${varName("type", key)}-letter-spacing: ${
        style.letterSpacing === 0 ? "0" : `${style.letterSpacing}em`
      };`,
    );
  }

  // ── Shadow Primitives (base layer) ───────────────────────────────────────
  // Map elevation level → base alias.
  const ELEVATION_TO_BASE: Record<string, string> = {
    none: "none",
    ring: "xs",
    raised: "sm",
    floating: "md",
    overlay: "lg",
  };
  const SHADOW_BASE_ORDER = ["none", "xs", "sm", "md", "lg"];

  // Resolve base alias → shadow string. Use tokens.elevation values.
  const shadowByAlias: Record<string, string> = {};
  for (const [levelName, value] of Object.entries(tokens.elevation)) {
    const alias = ELEVATION_TO_BASE[levelName];
    if (alias) shadowByAlias[alias] = value;
  }

  lines.push("");
  lines.push("  /* Shadow Primitives */");
  for (const alias of SHADOW_BASE_ORDER) {
    if (shadowByAlias[alias] !== undefined) {
      lines.push(`  --shadow-${alias}: ${shadowByAlias[alias]};`);
    }
  }

  // ── Shadow Semantic (alias layer) ────────────────────────────────────────
  lines.push("");
  lines.push("  /* Shadows (semantic) */");
  const SHADOW_SEMANTIC: Array<[string, string]> = [
    ["hairline", "xs"],
    ["card", "sm"],
    ["popover", "md"],
    ["modal", "lg"],
  ];
  for (const [role, base] of SHADOW_SEMANTIC) {
    if (shadowByAlias[base] !== undefined) {
      lines.push(`  --shadow-${role}: var(--shadow-${base});`);
    }
  }

  // ── Breakpoints ───────────────────────────────────────────────────────────
  lines.push("");
  lines.push("  /* Breakpoints */");
  for (const [name, value] of Object.entries(tokens.breakpoint)) {
    lines.push(`  ${varName("breakpoint", name)}: ${value}px;`);
  }

  lines.push("}");

  // ─── Dark mode: override primitive layer only ─────────────────────────────
  // Iterate the same hue order; emit only the lines where dark differs from
  // light. Semantic vars cascade automatically via var().
  const darkPrimitiveLines: string[] = [];
  for (const hue of HUE_ORDER) {
    const hueMap = tokens.primitive.colors[hue];
    if (!hueMap) continue;
    const stops = Object.keys(hueMap).sort((a, b) => Number(a) - Number(b));
    for (const stop of stops) {
      const step = hueMap[stop];
      const dark = fmtOklch(step.dark);
      const light = fmtOklch(step.light);
      if (dark !== light) {
        darkPrimitiveLines.push(`    --color-${hue}-${stop}: ${dark};`);
      }
    }
  }
  if (darkPrimitiveLines.length > 0) {
    lines.push("");
    lines.push("@media (prefers-color-scheme: dark) {");
    lines.push("  :root {");
    lines.push(...darkPrimitiveLines);
    lines.push("  }");
    lines.push("}");
  }

  lines.push("");
  return lines.join("\n");
}
