// scripts/analysis/neutral-curve-stats.ts
//
// 뉴트럴 곡선 상수(src/lab/palette/neutral.ts) **와** 시맨틱 앵커/hue 램프
// 상수(src/lab/palette/semantic.ts)의 산출 스크립트 — 이름은 뉴트럴만 가리키지만
// 둘 다 여기서 나온다 (tailwind theme.css를 이미 파싱하고 있어 자연스러운 자리).
// tailwind 뉴트럴 5종을 읽어 stop별 평균 L과, C_max로 정규화한 채도 모양을
// 약(zinc·stone) / 강(slate·gray) 두 그룹으로 나눠 평균한다.
// 두 그룹으로 나누는 이유: 어두운 쪽(800~950)에서 C 모양이 C_max와 상관해
// 갈리므로(sd 0.25~0.29) 평균 하나로 뭉개면 그 종속성이 사라진다.
// 시맨틱 파트는 red/amber/green/blue의 stop-500을 앵커로, 나머지 10개 stop의
// hue를 500 기준 Δh로 찍는다 — semantic.ts의 SEMANTIC_ANCHORS 테이블과
// 자리·자릿수까지 맞춰 눈으로 대조할 수 있게 포맷한다.
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

// ─── 시맨틱 앵커 (semantic.ts의 SEMANTIC_ANCHORS 산출) ───────────────────────
// stop-500을 앵커로 싣고, 나머지 10개 stop의 hue를 500 기준 Δh(원형 최단거리)
// 로 찍는다 — semantic.ts에 그대로 옮겨 적는 값이라 자릿수를 맞춘다
// (앵커: l/c 소수 3자리, h 소수 1자리 / Δh: 소수 1자리).
const SEMANTIC = ["red", "amber", "green", "blue"] as const;
console.log("\n시맨틱 앵커 (stop-500) + hue 램프 (Δh, 500 기준 원형 최단거리):");
for (const name of SEMANTIC) {
  const r = ramp(name);
  const anchor = r[5];
  const deltas = r.map((o) => ((o.h - anchor.h + 540) % 360) - 180);
  console.log(
    `  ${name.padEnd(8)} anchor { l: ${anchor.l.toFixed(3)}, c: ${anchor.c.toFixed(3)}, h: ${anchor.h.toFixed(1)} }`,
  );
  console.log(`    hueRamp: [${deltas.map((d) => d.toFixed(1)).join(", ")}]`);
}
