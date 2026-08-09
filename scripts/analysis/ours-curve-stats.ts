// scripts/analysis/ours-curve-stats.ts
//
// "우리 곡선"(src/lab/palette/ours.ts)의 곡선 테이블 산출 스크립트.
// tailwind 레퍼런스 17개 팔레트를 앵커 기준으로 정규화해 stop별
// 평균 L / 평균 C비율(C_i/C_anchor) / 평균 hue 드리프트를 뽑는다.
// 레퍼런스가 갱신되면(pnpm accent-scale-refs) 이걸 다시 돌려 ours.ts의
// OURS_CURVE 테이블과 비교·갱신할 것.
//
// 실행: pnpm tsx scripts/analysis/ours-curve-stats.ts

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { converter } from "culori";

const toOklch = converter("oklch");

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ref = JSON.parse(
  readFileSync(join(root, "data", "references", "tailwind-v4.json"), "utf8"),
) as {
  anchorIndex: number;
  stopKeys: string[];
  palettes: Record<string, string[]>;
};

const count = ref.stopKeys.length;
const acc = Array.from({ length: count }, () => ({
  l: [] as number[],
  cRatio: [] as number[],
  dh: [] as number[],
}));

for (const hexes of Object.values(ref.palettes)) {
  const os = hexes.map((h) => toOklch(h)!);
  const a = os[ref.anchorIndex];
  os.forEach((o, i) => {
    acc[i].l.push(o.l ?? 0);
    acc[i].cRatio.push((o.c ?? 0) / (a.c ?? 1));
    const dh = ((((o.h ?? 0) - (a.h ?? 0) + 540) % 360) - 180 + 360) % 360;
    acc[i].dh.push(dh > 180 ? dh - 360 : dh);
  });
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

console.log("stop | meanL (sd) | meanC/Ca (sd) | meanΔh° (sd)");
acc.forEach((a, i) => {
  console.log(
    `${ref.stopKeys[i].padStart(4)} | ${mean(a.l).toFixed(4)} (${sd(a.l).toFixed(3)}) | ${mean(a.cRatio).toFixed(3)} (${sd(a.cRatio).toFixed(3)}) | ${mean(a.dh).toFixed(1)} (${sd(a.dh).toFixed(1)})`,
  );
});
console.log(
  `\nanchorIndex: ${ref.anchorIndex} | palettes: ${Object.keys(ref.palettes).length}`,
);
console.log("\nOURS_CURVE 붙여넣기용:");
acc.forEach((a, i) => {
  console.log(
    `  { l: ${mean(a.l).toFixed(4)}, cMult: ${mean(a.cRatio).toFixed(3)} },`,
  );
});
