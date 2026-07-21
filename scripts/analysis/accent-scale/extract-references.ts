// scripts/analysis/accent-scale/extract-references.ts
//
// 레퍼런스 팔레트 추출 (순수 함수부).
// - Tailwind v4: node_modules/tailwindcss/theme.css 의 --color-<hue>-<stop> oklch 변수 파싱
// - Radix: @radix-ui/colors 의 light 스케일만 필터
// 산출 형식은 data/references/*.json 의 ReferenceSet (plan Task 2 참조).

import { formatHex, parse } from "culori";
import * as radix from "@radix-ui/colors";

const VAR_RE = /--color-([a-z]+)-(\d+):\s*(oklch\([^)]+\))/g;

/** 무채색/뉴트럴 계열 — 액센트 벤치마크(뉴트럴은 스코프 외)에서 제외. */
const TAILWIND_EXCLUDE = new Set([
  "gray", "mauve", "mist", "neutral", "olive", "slate", "stone", "taupe", "zinc",
]);

/** theme.css 텍스트에서 hue → hex[] (stopKeys 순서) 추출.
 *  요청한 stop이 하나라도 없는 hue는 제외. 뉴트럴 계열(TAILWIND_EXCLUDE)도 제외. */
export function parseTailwindTheme(
  css: string,
  stopKeys: readonly string[],
): Record<string, string[]> {
  const byHue = new Map<string, Map<string, string>>();
  for (const m of css.matchAll(VAR_RE)) {
    const [, hue, stop, oklch] = m;
    if (TAILWIND_EXCLUDE.has(hue)) continue;
    const parsed = parse(oklch);
    if (!parsed) continue;
    const hex = formatHex(parsed);
    if (!hex) continue;
    if (!byHue.has(hue)) byHue.set(hue, new Map());
    byHue.get(hue)!.set(stop, hex);
  }
  const out: Record<string, string[]> = {};
  for (const [hue, stops] of byHue) {
    if (stopKeys.every((k) => stops.has(k))) {
      out[hue] = stopKeys.map((k) => stops.get(k)!);
    }
  }
  return out;
}

/** 무채색/특수 계열 — 액센트 벤치마크에서 제외. */
const RADIX_EXCLUDE = new Set([
  "gray", "mauve", "slate", "sage", "olive", "sand",
  "white", "black",
]);

/** @radix-ui/colors 에서 12-step light 스케일만.
 *  키 규칙: light 스케일은 "blue", 그 외 "blueDark"/"blueA"/"blueDarkA"/"blueP3" 등. */
export function radixLightScales(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [name, scale] of Object.entries(radix)) {
    if (/Dark|A$|P3/.test(name)) continue;
    if (RADIX_EXCLUDE.has(name)) continue;
    if (typeof scale !== "object" || scale === null) continue;
    const steps = Object.values(scale as Record<string, string>);
    if (steps.length !== 12) continue;
    // whiteA/blackA 등 alpha 값 방어: hex 6자리만 통과
    if (!steps.every((s) => /^#[0-9a-fA-F]{6}$/.test(s))) continue;
    out[name] = steps;
  }
  return out;
}
