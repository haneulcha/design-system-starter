// src/generator/color.ts

import { formatHex, converter } from "culori";
import type { ColorPalette, ColorRole, NeutralUndertone } from "../schema/types.js";

const toOklch = converter("oklch");

function oklchToHex(l: number, c: number, h: number): string {
  const hex = formatHex({ mode: "oklch", l, c, h });
  return hex ?? "#000000";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function generatePalette(primaryHex: string, undertone: NeutralUndertone): ColorPalette {
  const base = toOklch(primaryHex);
  if (!base) throw new Error(`Invalid hex color: ${primaryHex}`);

  const { l: baseL, c: baseC, h: baseH = 0 } = base;

  // ── Primary (3 colors) ────────────────────────────────────────────────────
  const primary: ColorRole[] = [
    {
      name: "Brand Primary",
      hex: oklchToHex(baseL, baseC, baseH),
      description: "Main brand color",
    },
    {
      name: "Brand Dark",
      hex: oklchToHex(clamp(baseL - 0.15, 0, 1), baseC, baseH),
      description: "Darker variant for hover states and emphasis",
    },
    {
      name: "Brand Light",
      hex: oklchToHex(clamp(baseL + 0.2, 0, 1), baseC * 0.4, baseH),
      description: "Lighter tint for backgrounds and subtle accents",
    },
  ];

  // ── Accent (2 colors) ────────────────────────────────────────────────────
  const accentHue = (baseH + 150) % 360;
  const accent: ColorRole[] = [
    {
      name: "Accent",
      hex: oklchToHex(0.6, 0.12, accentHue),
      description: "Complementary accent for highlights and CTAs",
    },
    {
      name: "Accent Light",
      hex: oklchToHex(0.88, 0.04, accentHue),
      description: "Soft accent for subtle backgrounds",
    },
  ];

  // ── Neutral (11 steps) ───────────────────────────────────────────────────
  const neutralChroma = undertone === "neutral" ? 0.003 : 0.012;
  const neutralHue = undertone === "warm" ? 70 : undertone === "cool" ? 250 : baseH;
  const undertoneLabel = undertone === "warm" ? "warm" : undertone === "cool" ? "cool" : "neutral";

  const neutralSteps = [
    { name: "Gray 950", l: 0.13 },
    { name: "Gray 900", l: 0.18 },
    { name: "Gray 800", l: 0.26 },
    { name: "Gray 700", l: 0.35 },
    { name: "Gray 600", l: 0.44 },
    { name: "Gray 500", l: 0.53 },
    { name: "Gray 400", l: 0.62 },
    { name: "Gray 300", l: 0.72 },
    { name: "Gray 200", l: 0.82 },
    { name: "Gray 100", l: 0.91 },
    { name: "Gray 50",  l: 0.97 },
  ];

  const neutral: ColorRole[] = neutralSteps.map(({ name, l }) => ({
    name,
    hex: oklchToHex(l, neutralChroma, neutralHue),
    description: `${undertoneLabel} gray step at lightness ${l.toFixed(2)}`,
  }));

  // ── Semantic (4 fixed) ───────────────────────────────────────────────────
  const semantic: ColorRole[] = [
    {
      name: "Success Green",
      hex: oklchToHex(0.55, 0.15, 145),
      description: "Positive feedback and success states",
    },
    {
      name: "Error Red",
      hex: oklchToHex(0.55, 0.2, 25),
      description: "Errors, destructive actions, and alerts",
    },
    {
      name: "Warning Amber",
      hex: oklchToHex(0.65, 0.16, 80),
      description: "Caution states and non-critical warnings",
    },
    {
      name: "Info Blue",
      hex: oklchToHex(0.55, 0.14, 250),
      description: "Informational messages and guidance",
    },
  ];

  // ── Surface (4 colors) ───────────────────────────────────────────────────
  const surface: ColorRole[] = [
    {
      name: "Surface Base",
      hex: oklchToHex(1.0, 0.002, baseH),
      description: "Primary surface background",
    },
    {
      name: "Surface Subtle",
      hex: oklchToHex(0.98, 0.004, baseH),
      description: "Slightly tinted surface for cards and panels",
    },
    {
      name: "Surface Muted",
      hex: oklchToHex(0.96, 0.006, baseH),
      description: "Muted tinted surface for sidebars and secondary areas",
    },
    {
      name: "Surface Raised",
      hex: oklchToHex(0.95, 0.008, baseH),
      description: "Elevated surface for modals and dropdowns",
    },
  ];

  // ── Border (3 colors) ────────────────────────────────────────────────────
  const border: ColorRole[] = [
    {
      name: "Border Subtle",
      hex: oklchToHex(0.88, 0.006, baseH),
      description: "Subtle dividers and low-contrast separators",
    },
    {
      name: "Border Default",
      hex: oklchToHex(0.8, 0.01, baseH),
      description: "Default borders for inputs and containers",
    },
    {
      name: "Border Strong",
      hex: oklchToHex(0.65, 0.015, baseH),
      description: "High-contrast borders for focus and emphasis",
    },
  ];

  // ── Dark mode ────────────────────────────────────────────────────────────
  const darkSurface: ColorRole[] = [
    {
      name: "Dark Surface Base",
      hex: oklchToHex(0.12, 0.005, baseH),
      description: "Primary dark surface background",
    },
    {
      name: "Dark Surface Subtle",
      hex: oklchToHex(0.16, 0.007, baseH),
      description: "Elevated dark surface for cards",
    },
    {
      name: "Dark Surface Raised",
      hex: oklchToHex(0.2, 0.009, baseH),
      description: "Further elevated dark surface for modals",
    },
  ];

  const darkText: ColorRole[] = [
    {
      name: "Dark Text Muted",
      hex: oklchToHex(0.55, 0.01, baseH),
      description: "Secondary text on dark backgrounds",
    },
    {
      name: "Dark Text Default",
      hex: oklchToHex(0.75, 0.008, baseH),
      description: "Default text on dark backgrounds",
    },
    {
      name: "Dark Text Strong",
      hex: oklchToHex(0.95, 0.003, baseH),
      description: "High-contrast text on dark backgrounds",
    },
  ];

  const darkBorder: ColorRole[] = [
    {
      name: "Dark Border Subtle",
      hex: "rgba(255,255,255,0.08)",
      description: "Subtle border on dark surfaces",
    },
    {
      name: "Dark Border Default",
      hex: "rgba(255,255,255,0.15)",
      description: "Default border on dark surfaces",
    },
    {
      name: "Dark Border Strong",
      hex: "rgba(255,255,255,0.25)",
      description: "Strong border for focus on dark surfaces",
    },
  ];

  return {
    primary,
    accent,
    neutral,
    semantic,
    surface,
    border,
    dark: {
      surface: darkSurface,
      text: darkText,
      border: darkBorder,
    },
  };
}
