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

/** Build a hex string from OKLCH components. Out-of-gamut colors are
 *  CLAMPED to the nearest displayable hex by culori — this never returns
 *  null for a finite color. Returns null only for unrenderable input (NaN).
 *  Hue defaults to 0 for achromatic input. */
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

const toRgb = converter("rgb");

/** sRGB 안에 실제로 존재하는 색일 때만 hex를 반환하고, 범위 밖이면 null.
 *  oklchToHex와 달리 클램프하지 않는다 — 피커가 gamut 경계를 투명 셀로
 *  그릴 수 있게 하는 용도. eps는 경계에서의 부동소수 스펙클 방지. */
export function oklchToHexIfDisplayable({
  l,
  c,
  h,
}: {
  l: number;
  c: number;
  h: number | null;
}): string | null {
  const rgb = toRgb({ mode: "oklch", l, c, h: h ?? 0 });
  if (!rgb) return null;
  const eps = 1e-4;
  const inRange = (v: number | undefined) =>
    typeof v === "number" && v >= -eps && v <= 1 + eps;
  if (!inRange(rgb.r) || !inRange(rgb.g) || !inRange(rgb.b)) return null;
  return formatHex(rgb) ?? null;
}

/** 해당 밝기·색상(hue)에서 sRGB로 표현 가능한 최대치로 채도를 잘라 반환.
 *  이미 범위 안이면 그대로. 피커 패드에서 범위 밖을 찍었을 때 마커와
 *  실제 색이 어긋나지 않도록 gamut 경계로 스냅하는 용도 (이진 탐색 20회,
 *  채도 해상도 ≈ 0.4 / 2^20 — 픽셀 단위보다 훨씬 정밀). */
export function clampChromaToGamut(
  l: number,
  c: number,
  h: number | null,
): number {
  if (oklchToHexIfDisplayable({ l, c, h }) !== null) return c;
  let lo = 0;
  let hi = c;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (oklchToHexIfDisplayable({ l, c: mid, h }) !== null) lo = mid;
    else hi = mid;
  }
  return lo;
}
