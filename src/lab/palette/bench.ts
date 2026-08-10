// src/lab/palette/bench.ts
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

export type SummaryBySource = Record<
  string,
  Record<string, { mean: number; max: number; n: number }>
>;

/** algorithm × source(레퍼런스 출처) 별 mean/max ΔE. tailwind+radix를 풀링하는
 *  summarize()의 pooled 집계와 달리, 출처별로 분리해 radix 알고리즘이 자기 자신의
 *  스냅 타겟(radix 출처)에서만 유리해지는 자기참조 편향을 드러낸다. */
export function summarizeBySource(results: readonly PaletteResult[]): SummaryBySource {
  const bySource: SummaryBySource = {};
  const grouped = new Map<string, PaletteResult[]>();
  for (const r of results) {
    if (!grouped.has(r.algorithmId)) grouped.set(r.algorithmId, []);
    grouped.get(r.algorithmId)!.push(r);
  }
  for (const [id, rows] of grouped) {
    bySource[id] = {};
    const bySrc = new Map<string, PaletteResult[]>();
    for (const r of rows) {
      if (!bySrc.has(r.source)) bySrc.set(r.source, []);
      bySrc.get(r.source)!.push(r);
    }
    for (const [src, srcRows] of bySrc) {
      bySource[id][src] = {
        mean: mean(srcRows.map((r) => r.mean)),
        max: Math.max(...srcRows.map((r) => r.max)),
        n: srcRows.length,
      };
    }
  }
  return bySource;
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
  const bySource = summarizeBySource(results);
  const sources = [...new Set(results.map((r) => r.source))];
  const lines: string[] = [
    "# Accent Scale Bench Report",
    "",
    "_`pnpm accent-scale-bench` 가 재생성하는 파일 — 손으로 수정하지 말 것._",
    `_References: ${refSets.map((r) => `${r.source}@${r.version}`).join(", ")}. ΔE = Oklab 유클리드 거리._`,
    "",
    "## Summary — pooled (전체 mean/max ΔE, 낮을수록 재현력 좋음)",
    "",
    "_모든 레퍼런스 출처(tailwind+radix 등)를 합산한 값. 아래 §Comparability caveats 참고 —_",
    "_radix 알고리즘은 레퍼런스 팔레트 중 25/42가 자기 자신의 스냅 타겟이라 pooled 순위가 낙관적이다._",
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
    "## Summary by source (mean ΔE)",
    "",
    "_출처별로 분리한 mean ΔE — pooled 표가 감추는 알고리즘별 편향을 드러낸다._",
    "",
    `| algorithm | ${sources.join(" | ")} |`,
    `| --- | ${sources.map(() => "---:").join(" | ")} |`,
    ...algos
      .filter((a) => bySource[a.id])
      .map((a) => {
        const row = bySource[a.id];
        return `| ${a.id} | ${sources.map((src) => (row[src] ? f(row[src].mean) : "—")).join(" | ")} |`;
      }),
    "",
    "## Comparability caveats",
    "",
    "- radix 레퍼런스는 radix.ts 자신의 스냅 타겟(24개 Radix 공식 스케일)에서 파생되었으므로, radix 알고리즘의 radix-출처 ΔE는 구조적으로 거의 0에 가깝다(자기참조) — 다른 알고리즘과 공정 비교 불가.",
    "- radix 알고리즘은 요청된 anchorIndex를 count≠12일 때 존중하지 않는다 — 자신의 네이티브 12-step에서 위치 비례로 선형 재표집하므로, tailwind ΔE에는 앵커 위치 불일치가 일부 섞여 있다.",
    "- hct/v1은 입력 L을 무시하는 고정 lightness 사다리를 쓰고, leonardo는 고정 1.06→19 contrast-ratio 사다리를 쓴다 — 모두 레퍼런스별로 튜닝되지 않은 어댑터 파라미터화 선택이며, 벤치마크 대상 알고리즘의 근본 한계이지 버그가 아니다.",
    "- ours의 곡선 테이블(OURS_CURVE)은 tailwind 17개 팔레트의 평균에 적합시킨 것이다 — tailwind-출처 ΔE는 in-sample(홈그라운드)이므로 낙관적이며, 일반화 성능은 radix-출처 열로 판단할 것.",
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
    "_L(low)/L(high) = 유도 스케일들의 앵커 ±2 스텝 구간 내 최소/최대 L 각각의, 팔레트 전체에 대한 중앙값._",
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
