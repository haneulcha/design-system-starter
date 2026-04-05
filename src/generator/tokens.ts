// src/generator/tokens.ts

import type { DesignSystem, DesignTokens } from "../schema/types.js";

function kebab(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-");
}

function parsePx(s: string): number {
  const match = s.match(/^(\d+(?:\.\d+)?)px/);
  return match ? parseFloat(match[1]) : 0;
}

export function generateTokens(system: DesignSystem): DesignTokens {
  // ── brand ────────────────────────────────────────────────────────────────
  const brand = { name: system.brandName, mood: system.mood };

  // ── color.light ──────────────────────────────────────────────────────────
  const light: Record<string, string> = {};

  for (const c of system.colors.primary) {
    light[kebab(c.name)] = c.hex;
  }
  for (const c of system.colors.accent) {
    light[kebab(c.name)] = c.hex;
  }
  for (const c of system.colors.neutral) {
    light[kebab(c.name)] = c.hex;
  }
  for (const c of system.colors.semantic) {
    light[kebab(c.name)] = c.hex;
  }
  for (const c of system.colors.surface) {
    light[kebab(c.name)] = c.hex;
  }
  for (const c of system.colors.border) {
    light[kebab(c.name)] = c.hex;
  }

  // ── color.dark ───────────────────────────────────────────────────────────
  const dark: Record<string, string> = {};

  // Dark-specific: surface, text, border
  for (const c of system.colors.dark.surface) {
    dark[kebab(c.name)] = c.hex;
  }
  // Alias: "dark-background" points to the first dark surface (Dark Surface Base)
  if (system.colors.dark.surface.length > 0) {
    dark["dark-background"] = system.colors.dark.surface[0].hex;
  }
  for (const c of system.colors.dark.text) {
    dark[kebab(c.name)] = c.hex;
  }
  for (const c of system.colors.dark.border) {
    dark[kebab(c.name)] = c.hex;
  }

  // Shared: primary, accent, semantic (same as light)
  for (const c of system.colors.primary) {
    dark[kebab(c.name)] = c.hex;
  }
  for (const c of system.colors.accent) {
    dark[kebab(c.name)] = c.hex;
  }
  for (const c of system.colors.semantic) {
    dark[kebab(c.name)] = c.hex;
  }

  // ── typography ───────────────────────────────────────────────────────────
  const families: Record<string, string> = {
    primary: system.typography.families.primary,
    primaryFallback: system.typography.families.primaryFallback,
    mono: system.typography.families.mono,
    monoFallback: system.typography.families.monoFallback,
  };

  const styles: DesignTokens["typography"]["styles"] = {};
  for (const t of system.typography.hierarchy) {
    const key = kebab(t.role);
    const fontSize = parsePx(t.size);
    const lineHeightRaw = parseFloat(t.lineHeight);
    const lineHeight = isNaN(lineHeightRaw) ? 1.5 : lineHeightRaw;
    let letterSpacing: number;
    if (t.letterSpacing === "normal" || t.letterSpacing === "0.04em") {
      letterSpacing = 0;
    } else {
      const parsed = parseFloat(t.letterSpacing);
      letterSpacing = isNaN(parsed) ? 0 : parsed;
    }
    styles[key] = {
      fontFamily: t.font,
      fontSize,
      fontWeight: t.weight,
      lineHeight,
      letterSpacing,
    };
  }

  // ── spacing ──────────────────────────────────────────────────────────────
  const spacing: Record<string, number> = {};
  for (const s of system.layout.spacing) {
    spacing[s.name] = parsePx(s.value);
  }

  // ── borderRadius ─────────────────────────────────────────────────────────
  const borderRadius: Record<string, number> = {};
  for (const r of system.layout.borderRadius) {
    const key = kebab(r.name);
    if (r.value === "50%") {
      borderRadius[key] = -1;
    } else if (r.value === "9999px") {
      borderRadius[key] = 9999;
    } else {
      borderRadius[key] = parsePx(r.value);
    }
  }

  // ── elevation ────────────────────────────────────────────────────────────
  const elevation: Record<string, string> = {};
  for (const lvl of system.elevation.levels) {
    if (lvl.shadow === "none") continue;
    elevation[kebab(lvl.name)] = lvl.shadow;
  }

  // ── breakpoint ───────────────────────────────────────────────────────────
  const breakpoint: Record<string, number> = {};
  for (const bp of system.responsive.breakpoints) {
    breakpoint[kebab(bp.name)] = parsePx(bp.minWidth);
  }

  return {
    brand,
    color: { light, dark },
    typography: { families, styles },
    spacing,
    borderRadius,
    elevation,
    breakpoint,
  };
}
