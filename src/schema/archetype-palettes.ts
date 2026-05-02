// src/schema/archetype-palettes.ts
//
// Per-archetype color palettes — corpus-curated, hand-picked.
//
// Source of truth: docs/research/color-roles-normalized.md (corpus hex by
// brand × role). Each archetype's palette draws from one signature exemplar
// brand (per ARCHETYPES.cue), with status colors held universal across
// archetypes (red error, green success, etc. — the corpus shows ~95%
// convergence on these hues regardless of brand personality).
//
// This file replaces the prior ColorKnobs derivation pipeline (brandColor →
// computed scales). Palettes are now the single source of truth; the user
// picks an archetype and optionally overrides individual slots.

import type { PresetName } from "./presets.js";

// ─── Palette slot enum ──────────────────────────────────────────────────────

/** Surface tokens — page background, cards/inputs, borders. */
export type SurfaceSlot = "canvas" | "soft" | "hairline";

/** Text tokens — headlines, body, secondary copy. */
export type TextSlot = "ink" | "body" | "muted";

/** Brand accent — primary CTA / focus / link color. */
export type AccentSlot = "accent";

/** Status tokens — 4 roles × 2 variants (bg, text). Border variant deferred. */
export type StatusSlot =
  | "error-bg"   | "error-text"
  | "success-bg" | "success-text"
  | "warning-bg" | "warning-text"
  | "info-bg"    | "info-text";

export type PaletteSlot = SurfaceSlot | TextSlot | AccentSlot | StatusSlot;

export const SURFACE_SLOTS: readonly SurfaceSlot[] = ["canvas", "soft", "hairline"];
export const TEXT_SLOTS:    readonly TextSlot[]    = ["ink", "body", "muted"];
export const ACCENT_SLOTS:  readonly AccentSlot[]  = ["accent"];
export const STATUS_SLOTS:  readonly StatusSlot[]  = [
  "error-bg",   "error-text",
  "success-bg", "success-text",
  "warning-bg", "warning-text",
  "info-bg",    "info-text",
];

export const PALETTE_SLOTS: readonly PaletteSlot[] = [
  ...SURFACE_SLOTS, ...TEXT_SLOTS, ...ACCENT_SLOTS, ...STATUS_SLOTS,
];

export type ArchetypePalette = Record<PaletteSlot, string>;

// ─── Status palette — universal across archetypes ───────────────────────────
//
// Corpus shows red/green/orange/blue convergence regardless of personality
// (Airbnb, Spotify, Linear, Stripe all use the same hue families for status).
// Held constant so a "warm-friendly" success badge still reads as success.

const STATUS_UNIVERSAL: Record<StatusSlot, string> = {
  "error-bg":     "#fef2f2",
  "error-text":   "#b91c1c",
  "success-bg":   "#f0fdf4",
  "success-text": "#15803d",
  "warning-bg":   "#fffbeb",
  "warning-text": "#b45309",
  "info-bg":      "#eff6ff",
  "info-text":    "#1d4ed8",
};

// ─── 5 archetype palettes ───────────────────────────────────────────────────

export const ARCHETYPE_PALETTES: Record<PresetName, ArchetypePalette> = {
  // Linear — restrained, near-achromatic neutral, blurple accent
  "clean-minimal": {
    canvas:   "#ffffff",
    soft:     "#f7f8f8",
    hairline: "#e6e8eb",
    ink:      "#08090a",
    body:     "#3c4149",
    muted:    "#6b7280",
    accent:   "#5e6ad2",
    ...STATUS_UNIVERSAL,
  },

  // Claude — warm cream canvas, near-black ink, coral accent
  "warm-friendly": {
    canvas:   "#faf9f5",
    soft:     "#f0eee6",
    hairline: "#e3dfd3",
    ink:      "#141413",
    body:     "#2c2b28",
    muted:    "#6b6960",
    accent:   "#cc785c",
    ...STATUS_UNIVERSAL,
  },

  // Spotify-inspired — high-energy green on near-black surface (light variant)
  "bold-energetic": {
    canvas:   "#ffffff",
    soft:     "#f3f3f3",
    hairline: "#d9d9d9",
    ink:      "#000000",
    body:     "#1a1a1a",
    muted:    "#535353",
    accent:   "#1db954",
    ...STATUS_UNIVERSAL,
  },

  // Stripe — cool slate ink, blurple accent, near-white canvas
  "professional": {
    canvas:   "#fafafa",
    soft:     "#f6f9fc",
    hairline: "#e3e8ee",
    ink:      "#0a2540",
    body:     "#425466",
    muted:    "#8898aa",
    accent:   "#635bff",
    ...STATUS_UNIVERSAL,
  },

  // Figma — clean white canvas, expressive purple accent
  "playful-creative": {
    canvas:   "#ffffff",
    soft:     "#f5f5f5",
    hairline: "#e5e5e5",
    ink:      "#1e1e1e",
    body:     "#333333",
    muted:    "#757575",
    accent:   "#a259ff",
    ...STATUS_UNIVERSAL,
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

export type PaletteOverrides = Partial<Record<PaletteSlot, string>>;

/** Apply per-slot overrides on top of an archetype palette. */
export function resolvePalette(
  preset: PresetName,
  overrides?: PaletteOverrides,
): ArchetypePalette {
  const base = ARCHETYPE_PALETTES[preset];
  if (!overrides) return base;
  return { ...base, ...overrides };
}
