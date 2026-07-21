// src/lab/accent-scale/bench.ts
//
// 벤치마크 계산 (순수). 프로토콜은 스펙 §벤치마크 프로토콜:
// 레퍼런스의 앵커 stop을 알고리즘에 입력 → 같은 stop 수/앵커 위치로 유도 →
// stop별 ΔE(OK) → 알고리즘/hue family별 mean/max 집계.
// 코퍼스 정합: 유도 스케일의 C_max + 앵커 ±2 구간 L 범위의 중앙값을
// accent-baseline.md 코퍼스 중앙값과 나란히 보여준다.

import { converter } from "culori";
import { oklchToHex } from "../../generator/color.js";
import { deltaEOk, hueFamily, type HueFamily } from "./metric.js";
import type { AccentAlgorithm } from "./types.js";

const toOklch = converter("oklch");

export interface ReferenceSet {
  source: string;
  version: string;
  anchorIndex: number;
  stopKeys: string[];
  palettes: Record<string, string[]>;
}

export interface PaletteResult {
  algorithmId: string;
  source: string;
  palette: string;
  family: HueFamily;
  perStop: number[];
  mean: number;
  max: number;
}

// docs/research/accent-baseline.md 코퍼스 중앙값 (58 systems)
export const CORPUS_MEDIANS = {
  cMax: 0.2131,
  lLow: 0.512,
  lHigh: 0.669,
} as const;

const mean = (xs: readonly number[]): number =>
  xs.reduce((a, b) => a + b, 0) / xs.length;

const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

function anchorHue(refHexes: readonly string[], anchorIndex: number): number {
  const o = toOklch(refHexes[anchorIndex]);
  return o?.h ?? 0;
}

export function benchPalette(
  algo: AccentAlgorithm,
  ref: ReferenceSet,
  paletteName: string,
): PaletteResult {
  const refHexes = ref.palettes[paletteName];
  const derived = algo.derive(refHexes[ref.anchorIndex], {
    count: refHexes.length,
    anchorIndex: ref.anchorIndex,
  });
  const perStop = derived.map((c, i) => deltaEOk(oklchToHex(c), refHexes[i]));
  return {
    algorithmId: algo.id,
    source: ref.source,
    palette: paletteName,
    family: hueFamily(anchorHue(refHexes, ref.anchorIndex)),
    perStop,
    mean: mean(perStop),
    max: Math.max(...perStop),
  };
}

export function benchAll(
  algos: readonly AccentAlgorithm[],
  refSets: readonly ReferenceSet[],
): PaletteResult[] {
  return algos.flatMap((algo) =>
    refSets.flatMap((ref) =>
      Object.keys(ref.palettes).map((name) => benchPalette(algo, ref, name)),
    ),
  );
}

export interface Summary {
  byAlgorithm: Record<string, { mean: number; max: number; n: number }>;
  byAlgorithmFamily: Record<string, Record<string, { mean: number; max: number; n: number }>>;
}

export function summarize(results: readonly PaletteResult[]): Summary {
  const byAlgorithm: Summary["byAlgorithm"] = {};
  const byAlgorithmFamily: Summary["byAlgorithmFamily"] = {};
  const grouped = new Map<string, PaletteResult[]>();
  for (const r of results) {
    const key = r.algorithmId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }
  for (const [id, rows] of grouped) {
    byAlgorithm[id] = {
      mean: mean(rows.map((r) => r.mean)),
      max: Math.max(...rows.map((r) => r.max)),
      n: rows.length,
    };
    byAlgorithmFamily[id] = {};
    const fams = new Map<string, PaletteResult[]>();
    for (const r of rows) {
      if (!fams.has(r.family)) fams.set(r.family, []);
      fams.get(r.family)!.push(r);
    }
    for (const [fam, famRows] of fams) {
      byAlgorithmFamily[id][fam] = {
        mean: mean(famRows.map((r) => r.mean)),
        max: Math.max(...famRows.map((r) => r.max)),
        n: famRows.length,
      };
    }
  }
  return { byAlgorithm, byAlgorithmFamily };
}

export interface CorpusFit {
  medianCMax: number;
  medianLLow: number;
  medianLHigh: number;
}

/** 유도 스케일들의 C_max 와 앵커 ±2 구간 L 범위의 중앙값.
 *  코퍼스 L_min/L_max 가 액센트 핵심 stop들 기준이므로 같은 창으로 맞춘다. */
export function corpusStats(
  algo: AccentAlgorithm,
  refSets: readonly ReferenceSet[],
): CorpusFit {
  const cMaxes: number[] = [];
  const lLows: number[] = [];
  const lHighs: number[] = [];
  for (const ref of refSets) {
    for (const refHexes of Object.values(ref.palettes)) {
      const derived = algo.derive(refHexes[ref.anchorIndex], {
        count: refHexes.length,
        anchorIndex: ref.anchorIndex,
      });
      cMaxes.push(Math.max(...derived.map((c) => c.c)));
      const lo = Math.max(0, ref.anchorIndex - 2);
      const hi = Math.min(derived.length - 1, ref.anchorIndex + 2);
      const window = derived.slice(lo, hi + 1).map((c) => c.l);
      lLows.push(Math.min(...window));
      lHighs.push(Math.max(...window));
    }
  }
  return {
    medianCMax: median(cMaxes),
    medianLLow: median(lLows),
    medianLHigh: median(lHighs),
  };
}

const f = (n: number): string => n.toFixed(4);

export function renderReport(
  results: readonly PaletteResult[],
  algos: readonly AccentAlgorithm[],
  refSets: readonly ReferenceSet[],
): string {
  const s = summarize(results);
  const lines: string[] = [
    "# Accent Scale Bench Report",
    "",
    "_`pnpm accent-scale-bench` 가 재생성하는 파일 — 손으로 수정하지 말 것._",
    `_References: ${refSets.map((r) => `${r.source}@${r.version}`).join(", ")}. ΔE = Oklab 유클리드 거리._`,
    "",
    "## Summary (전체 mean/max ΔE, 낮을수록 재현력 좋음)",
    "",
    "| algorithm | palettes | mean ΔE | max ΔE |",
    "| --- | ---: | ---: | ---: |",
    ...algos
      .filter((a) => s.byAlgorithm[a.id])
      .map((a) => {
        const row = s.byAlgorithm[a.id];
        return `| ${a.id} | ${row.n} | ${f(row.mean)} | ${f(row.max)} |`;
      }),
    "",
    "## By hue family (mean ΔE)",
    "",
  ];
  const families = [...new Set(results.map((r) => r.family))].sort();
  lines.push(
    `| algorithm | ${families.join(" | ")} |`,
    `| --- | ${families.map(() => "---:").join(" | ")} |`,
  );
  for (const a of algos) {
    const fams = s.byAlgorithmFamily[a.id];
    if (!fams) continue;
    lines.push(
      `| ${a.id} | ${families.map((fam) => (fams[fam] ? f(fams[fam].mean) : "—")).join(" | ")} |`,
    );
  }
  lines.push(
    "",
    "## Corpus fit (accent-baseline.md 중앙값 대비)",
    "",
    "| algorithm | median C_max | median L(low) | median L(high) |",
    "| --- | ---: | ---: | ---: |",
    `| _corpus (n=58)_ | ${f(CORPUS_MEDIANS.cMax)} | ${f(CORPUS_MEDIANS.lLow)} | ${f(CORPUS_MEDIANS.lHigh)} |`,
    ...algos.map((a) => {
      const c = corpusStats(a, refSets);
      return `| ${a.id} | ${f(c.medianCMax)} | ${f(c.medianLLow)} | ${f(c.medianLHigh)} |`;
    }),
    "",
  );
  return lines.join("\n");
}
