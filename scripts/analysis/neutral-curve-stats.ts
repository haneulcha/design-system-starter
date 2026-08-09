// scripts/analysis/neutral-curve-stats.ts
//
// 뉴트럴 곡선 상수(src/lab/palette/neutral.ts)의 산출 스크립트.
// tailwind 뉴트럴 5종을 읽어 stop별 평균 L과, C_max로 정규화한 채도 모양을
// 약(zinc·stone) / 강(slate·gray) 두 그룹으로 나눠 평균한다.
// 두 그룹으로 나누는 이유: 어두운 쪽(800~950)에서 C 모양이 C_max와 상관해
// 갈리므로(sd 0.25~0.29) 평균 하나로 뭉개면 그 종속성이 사라진다.
// 스펙: docs/superpowers/specs/2026-08-09-palette-generator-color-system-design.md
//
// 실행: pnpm neutral-curve-stats

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { converter } from "culori";

const require = createRequire(import.meta.url);
const toOklch = converter("oklch");

const STOPS = ["50","100","200","300","400","500","600","700","800","900","950"];
const ALL = ["slate", "gray", "zinc", "neutral", "stone"] as const;
const SOFT = ["zinc", "stone"] as const;   // C_max 0.017 / 0.013
const STRONG = ["slate", "gray"] as const; // C_max 0.046 / 0.034

const themeCss = readFileSync(require.resolve("tailwindcss/theme.css"), "utf8");

interface Stop { l: number; c: number; h: number }

function ramp(hue: string): Stop[] {
  return STOPS.map((s) => {
    const m = themeCss.match(new RegExp(`--color-${hue}-${s}:\\s*([^;]+);`));
    if (!m) throw new Error(`neutral-curve-stats: --color-${hue}-${s} 없음`);
    const o = toOklch(m[1].trim())!;
    return { l: o.l ?? 0, c: o.c ?? 0, h: o.h ?? NaN };
  });
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const cMax = (r: Stop[]) => Math.max(...r.map((o) => o.c));
const normalized = (name: string) => {
  const r = ramp(name);
  const m = cMax(r);
  return r.map((o) => o.c / m);
};

const all = ALL.map(ramp);
console.log("NEUTRAL_CURVE l (tailwind 뉴트럴 5종 평균):");
console.log("[" + STOPS.map((_, i) => mean(all.map((r) => r[i].l)).toFixed(4)).join(", ") + "]");

const soft = SOFT.map(normalized);
const strong = STRONG.map(normalized);
console.log("\nC_SHAPE_SOFT (zinc·stone 평균):");
console.log("[" + STOPS.map((_, i) => mean(soft.map((r) => r[i])).toFixed(3)).join(", ") + "]");
console.log("C_SHAPE_STRONG (slate·gray 평균):");
console.log("[" + STOPS.map((_, i) => mean(strong.map((r) => r[i])).toFixed(3)).join(", ") + "]");

console.log("\n램프별 C_max / hue@C_max (틴트 어트랙터 근거):");
for (const name of ALL) {
  const r = ramp(name);
  const m = cMax(r);
  const at = r.find((o) => o.c === m)!;
  console.log(
    `  ${name.padEnd(8)} C_max=${m.toFixed(4)}  hue=${isNaN(at.h) || m === 0 ? "무채색" : at.h.toFixed(1)}`,
  );
}
console.log(
  `\nSOFT ref C_max mean = ${mean(SOFT.map((n) => cMax(ramp(n)))).toFixed(4)}` +
  ` | STRONG ref C_max mean = ${mean(STRONG.map((n) => cMax(ramp(n)))).toFixed(4)}`,
);
