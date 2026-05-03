// src/generator/tailwind-export.ts
//
// Emits a Tailwind v3 preset that references the CSS variables produced by
// css-export.ts. Use as a Tailwind preset; pair with the companion
// design-tokens.css file imported into your global styles.
//
// Both base (neutral.50, red.500, --radius-md) and semantic
// (bg-canvas, status-error-bg, --radius-button) layers are exposed.

import type { DesignTokens } from "../schema/types.js";

function v(name: string): string {
  return `var(--${name})`;
}

function quoteKey(key: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : `"${key}"`;
}

const COLOR_HUE_ORDER = ["neutral", "accent", "red", "green", "amber", "blue"] as const;

const RADIUS_BASE_KEYS = ["none", "xs", "sm", "md", "lg", "xl", "2xl", "pill", "circle"];
const RADIUS_SEMANTIC_KEYS = ["button", "input", "card", "subtle", "large"];

const SHADOW_BASE_KEYS = ["none", "xs", "sm", "md", "lg"];
const SHADOW_SEMANTIC_KEYS = ["hairline", "card", "popover", "modal"];

function renderHueObject(
  hue: string,
  stops: readonly string[],
  pad: number,
): string {
  const inner = stops
    .map((stop) => `${" ".repeat(pad + 2)}"${stop}": "var(--color-${hue}-${stop})",`)
    .join("\n");
  return `{\n${inner}\n${" ".repeat(pad)}}`;
}

export function generateTailwindConfig(tokens: DesignTokens): string {
  // ── colors ─────────────────────────────────────────────────────────────────
  const colorLines: string[] = [];
  for (const hue of COLOR_HUE_ORDER) {
    const hueMap = tokens.primitive.colors[hue];
    if (!hueMap) continue;
    const stops = Object.keys(hueMap).sort((a, b) => Number(a) - Number(b));
    colorLines.push(`        ${hue}: ${renderHueObject(hue, stops, 8)},`);
  }
  for (const role of Object.keys(tokens.semantic)) {
    const key = role.replace(/\//g, "-");
    colorLines.push(`        "${key}": "${v(`color-${key}`)}",`);
  }

  // ── spacing ────────────────────────────────────────────────────────────────
  const spacingLines = Object.keys(tokens.spacing).map(
    (name) => `        ${quoteKey(name)}: "${v(`spacing-${name}`)}",`,
  );

  // ── radius ─────────────────────────────────────────────────────────────────
  const radiusLines: string[] = [];
  for (const k of RADIUS_BASE_KEYS) {
    radiusLines.push(`        ${quoteKey(k)}: "${v(`radius-${k}`)}",`);
  }
  for (const k of RADIUS_SEMANTIC_KEYS) {
    radiusLines.push(`        ${quoteKey(k)}: "${v(`radius-${k}`)}",`);
  }

  // ── shadow ─────────────────────────────────────────────────────────────────
  const shadowLines: string[] = [];
  for (const k of SHADOW_BASE_KEYS) {
    shadowLines.push(`        ${quoteKey(k)}: "${v(`shadow-${k}`)}",`);
  }
  for (const k of SHADOW_SEMANTIC_KEYS) {
    shadowLines.push(`        ${quoteKey(k)}: "${v(`shadow-${k}`)}",`);
  }

  // ── fontFamily ─────────────────────────────────────────────────────────────
  const fontFamilyLines: string[] = [];
  for (const [slot, chain] of Object.entries(tokens.typography.families)) {
    const list = chain.split(",").map((s) => JSON.stringify(s.trim())).join(", ");
    fontFamilyLines.push(`        ${quoteKey(slot)}: [${list}],`);
  }

  // ── fontSize ───────────────────────────────────────────────────────────────
  const fontSizeLines = Object.keys(tokens.typography.styles).map((key) => {
    const sizeVar = v(`type-${key}-size`);
    const lhVar = v(`type-${key}-line-height`);
    const lsVar = v(`type-${key}-letter-spacing`);
    const wVar = v(`type-${key}-weight`);
    return `        ${quoteKey(key)}: [
          "${sizeVar}",
          {
            lineHeight: "${lhVar}",
            letterSpacing: "${lsVar}",
            fontWeight: "${wVar}",
          },
        ],`;
  });

  // ── assemble ───────────────────────────────────────────────────────────────
  const out: string[] = [];
  out.push("/**");
  out.push(` * ${tokens.brand.name} — Tailwind preset.`);
  out.push(" * Pairs with design-tokens.css. Import that file into your global");
  out.push(" * stylesheet and apply this preset to expose tokens as Tailwind classes.");
  out.push(" *");
  out.push(" * @type {import('tailwindcss').Config}");
  out.push(" */");
  out.push("module.exports = {");
  out.push("  theme: {");
  out.push("    extend: {");
  out.push("      colors: {");
  out.push(...colorLines);
  out.push("      },");
  out.push("      spacing: {");
  out.push(...spacingLines);
  out.push("      },");
  out.push("      borderRadius: {");
  out.push(...radiusLines);
  out.push("      },");
  out.push("      fontFamily: {");
  out.push(...fontFamilyLines);
  out.push("      },");
  out.push("      fontSize: {");
  out.push(...fontSizeLines);
  out.push("      },");
  out.push("      boxShadow: {");
  out.push(...shadowLines);
  out.push("      },");
  out.push("    },");
  out.push("  },");
  out.push("};");
  out.push("");
  return out.join("\n");
}
