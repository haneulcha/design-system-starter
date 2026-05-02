// src/schema/archetype-palettes.ts
//
// Per-archetype color palettes — corpus-curated, hand-picked.
//
// Source of truth: docs/research/color-roles-normalized.md (corpus hex by
// brand × role) + neutral-baseline.md / accent-baseline.md.
//
// Shape (v3):
//   - 9-stop neutral base scale per archetype (the gray foundation).
//   - Surface/text slots are REFERENCES into the base scale (canvas →
//     neutral.50, etc.). Editing a base stop cascades to every slot that
//     references it.
//   - Accent: one default + 3 corpus-curated alternatives the inspector
//     surfaces as recommendation chips.
//   - Status: 8 slots, per-archetype curated (warm-friendly's red is warmer,
//     bold-energetic's red is more saturated, etc. Not universal.)

import type { PresetName } from "./presets.js";

// ─── Slot taxonomies ────────────────────────────────────────────────────────

export type NeutralStop = "50" | "100" | "200" | "300" | "400" | "500" | "600" | "800" | "900";
export const NEUTRAL_STOPS: readonly NeutralStop[] = [
  "50", "100", "200", "300", "400", "500", "600", "800", "900",
];

export type SurfaceSlot = "canvas" | "soft" | "hairline";
export type TextSlot    = "ink" | "body" | "muted";
export type AccentSlot  = "accent";
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

/** Resolved flat palette — the shape downstream consumers (generator,
 *  figma transformer, web ColorPalette) read. Each slot is a hex string. */
export type ResolvedPalette = Record<PaletteSlot, string>;

// ─── Archetype palette spec ─────────────────────────────────────────────────

export interface ArchetypePalette {
  /** 9-stop neutral base scale. */
  baseScale: Record<NeutralStop, string>;
  /** Surface slots reference into the base scale. */
  surfaceRefs: Record<SurfaceSlot, NeutralStop>;
  /** Text slots reference into the base scale. */
  textRefs: Record<TextSlot, NeutralStop>;
  /** Default brand accent. */
  accent: string;
  /** 3 corpus-curated alternative accents the inspector exposes as chips. */
  recommendedAccents: readonly [string, string, string];
  /** 8 status slots, per-archetype curated. */
  status: Record<StatusSlot, string>;
}

// ─── Default ref mapping (shared across archetypes) ─────────────────────────

const DEFAULT_SURFACE_REFS: Record<SurfaceSlot, NeutralStop> = {
  canvas:   "50",
  soft:     "100",
  hairline: "300",
};

const DEFAULT_TEXT_REFS: Record<TextSlot, NeutralStop> = {
  ink:   "900",
  body:  "800",
  muted: "500",
};

// ─── Per-archetype curation ─────────────────────────────────────────────────

export const ARCHETYPE_PALETTES: Record<PresetName, ArchetypePalette> = {
  // Linear-inspired — cool slate, low chroma. canvas pure white for crispness.
  "clean-minimal": {
    baseScale: {
      "50":  "#ffffff",
      "100": "#f7f8f8",
      "200": "#ebedef",
      "300": "#e0e3e7",
      "400": "#b1b5be",
      "500": "#6b7280",
      "600": "#4b5563",
      "800": "#1f2329",
      "900": "#08090a",
    },
    surfaceRefs: DEFAULT_SURFACE_REFS,
    textRefs: DEFAULT_TEXT_REFS,
    accent: "#5e6ad2",
    recommendedAccents: ["#5e6ad2", "#000000", "#0070f3"],
    status: {
      "error-bg":     "#fef2f2",  "error-text":   "#b91c1c",
      "success-bg":   "#f0fdf4",  "success-text": "#166534",
      "warning-bg":   "#fefce8",  "warning-text": "#a16207",
      "info-bg":      "#eff6ff",  "info-text":    "#1e40af",
    },
  },

  // Claude-inspired — warm cream. Every neutral stop carries a cream/sand undertone.
  "warm-friendly": {
    baseScale: {
      "50":  "#ffffff",
      "100": "#faf9f5",
      "200": "#f0eee6",
      "300": "#e3dfd3",
      "400": "#b6b1a3",
      "500": "#6b6960",
      "600": "#4a4842",
      "800": "#2c2b28",
      "900": "#141413",
    },
    surfaceRefs: DEFAULT_SURFACE_REFS,
    textRefs: DEFAULT_TEXT_REFS,
    accent: "#cc785c",
    recommendedAccents: ["#cc785c", "#ff385c", "#635bff"],
    status: {
      "error-bg":     "#fef0ee",  "error-text":   "#c2410c",
      "success-bg":   "#f1fbef",  "success-text": "#4d7c0f",
      "warning-bg":   "#fff5e6",  "warning-text": "#ad6209",
      "info-bg":      "#eff6ff",  "info-text":    "#3b5cb8",
    },
  },

  // Spotify-inspired — pure achromatic, hard contrast.
  "bold-energetic": {
    baseScale: {
      "50":  "#ffffff",
      "100": "#f3f3f3",
      "200": "#e0e0e0",
      "300": "#d9d9d9",
      "400": "#a0a0a0",
      "500": "#707070",
      "600": "#535353",
      "800": "#1a1a1a",
      "900": "#000000",
    },
    surfaceRefs: DEFAULT_SURFACE_REFS,
    textRefs: DEFAULT_TEXT_REFS,
    accent: "#1db954",
    recommendedAccents: ["#1db954", "#0052ff", "#3ecf8e"],
    status: {
      "error-bg":     "#fee2e2",  "error-text":   "#dc2626",
      "success-bg":   "#dcfce7",  "success-text": "#16a34a",
      "warning-bg":   "#fef3c7",  "warning-text": "#d97706",
      "info-bg":      "#dbeafe",  "info-text":    "#2563eb",
    },
  },

  // Stripe-inspired — cool slate blue undertones throughout the scale.
  "professional": {
    baseScale: {
      "50":  "#ffffff",
      "100": "#fafafa",
      "200": "#f6f9fc",
      "300": "#e3e8ee",
      "400": "#aab7c4",
      "500": "#8898aa",
      "600": "#66738a",
      "800": "#1a3554",
      "900": "#0a2540",
    },
    surfaceRefs: DEFAULT_SURFACE_REFS,
    textRefs: DEFAULT_TEXT_REFS,
    accent: "#635bff",
    recommendedAccents: ["#635bff", "#0f62fe", "#18181b"],
    status: {
      "error-bg":     "#fef2f2",  "error-text":   "#b91c1c",
      "success-bg":   "#f0fdf4",  "success-text": "#15803d",
      "warning-bg":   "#fffbeb",  "warning-text": "#b45309",
      "info-bg":      "#eff6ff",  "info-text":    "#1d4ed8",
    },
  },

  // Figma-inspired — clean achromatic, expressive accent.
  "playful-creative": {
    baseScale: {
      "50":  "#ffffff",
      "100": "#f5f5f5",
      "200": "#ebebeb",
      "300": "#e5e5e5",
      "400": "#c2c2c2",
      "500": "#757575",
      "600": "#525252",
      "800": "#333333",
      "900": "#1e1e1e",
    },
    surfaceRefs: DEFAULT_SURFACE_REFS,
    textRefs: DEFAULT_TEXT_REFS,
    accent: "#a259ff",
    recommendedAccents: ["#a259ff", "#ff5733", "#ff7a59"],
    status: {
      "error-bg":     "#fee2e2",  "error-text":   "#e11d48",
      "success-bg":   "#d1fae5",  "success-text": "#059669",
      "warning-bg":   "#fef3c7",  "warning-text": "#d97706",
      "info-bg":      "#e0e7ff",  "info-text":    "#4f46e5",
    },
  },
};

// ─── Overrides shape ────────────────────────────────────────────────────────

export interface PaletteOverrides {
  /** Override individual base scale stops. Cascades to every surface/text
   *  slot that references the stop. */
  baseScale?: Partial<Record<NeutralStop, string>>;
  /** Replace the accent slot directly (no scale cascade). */
  accent?: string;
  /** Override individual status slots directly. */
  status?: Partial<Record<StatusSlot, string>>;
}

// ─── Resolution ─────────────────────────────────────────────────────────────

/** Compute the flat 15-slot palette from an archetype + overrides. */
export function resolvePalette(
  preset: PresetName,
  overrides?: PaletteOverrides,
): ResolvedPalette {
  const base = ARCHETYPE_PALETTES[preset];

  // Effective base scale: per-stop overrides applied.
  const effectiveBase: Record<NeutralStop, string> = { ...base.baseScale, ...overrides?.baseScale };

  const surface = Object.fromEntries(
    SURFACE_SLOTS.map((slot) => [slot, effectiveBase[base.surfaceRefs[slot]]]),
  ) as Record<SurfaceSlot, string>;

  const text = Object.fromEntries(
    TEXT_SLOTS.map((slot) => [slot, effectiveBase[base.textRefs[slot]]]),
  ) as Record<TextSlot, string>;

  const accent = overrides?.accent ?? base.accent;

  const status: Record<StatusSlot, string> = { ...base.status, ...overrides?.status };

  return { ...surface, ...text, accent, ...status };
}

/** Resolve the effective base scale (after overrides). */
export function resolveBaseScale(
  preset: PresetName,
  overrides?: PaletteOverrides,
): Record<NeutralStop, string> {
  const base = ARCHETYPE_PALETTES[preset];
  return { ...base.baseScale, ...overrides?.baseScale };
}
