// web/src/lib/oklch.ts
//
// Thin culori wrapper for showing perceptual color metadata (OKLCH) next to
// hex in the inspector. Same converter the corpus analysis scripts use, so
// the numbers shown to users line up with the values reported in
// docs/research/accent-baseline.md and friends.

import { converter, formatHex } from "culori";

const toOklch = converter("oklch");

export interface Oklch {
  /** Lightness 0..1 */
  l: number;
  /** Chroma (~0..0.4) */
  c: number;
  /** Hue in degrees, or null for achromatic colors */
  h: number | null;
}

export function hexToOklch(hex: string): Oklch | null {
  const o = toOklch(hex);
  if (!o) return null;
  return {
    l: o.l ?? 0,
    c: o.c ?? 0,
    h: o.h ?? null,
  };
}

/** Compact label for inline display alongside a hex value.
 *  Example: "oklch 67 .10 41°" for #cc785c. */
export function formatOklchCompact(hex: string): string | null {
  const o = hexToOklch(hex);
  if (!o) return null;
  const l = Math.round(o.l * 100);
  // Drop the leading zero so ".10" reads tighter than "0.10".
  const c = o.c.toFixed(2).replace(/^0/, "");
  const h = o.h === null ? "—" : `${Math.round(o.h)}°`;
  return `oklch ${l} ${c} ${h}`;
}

/** Build a hex string from OKLCH components. Returns null if culori can't
 *  render the color (out-of-gamut, NaN, etc). Hue defaults to 0 for
 *  achromatic input. */
export function oklchToHex({
  l,
  c,
  h,
}: {
  l: number;
  c: number;
  h: number | null;
}): string | null {
  const out = formatHex({ mode: "oklch", l, c, h: h ?? 0 });
  return out ?? null;
}
