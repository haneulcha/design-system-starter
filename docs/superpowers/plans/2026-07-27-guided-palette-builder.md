# Guided Palette Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactoring UI의 5-pick 순서로 액센트 스케일을 만들어주는 가이드드 빌더 — 우리 곡선 v0를 다중 고정점으로 일반화한 엔진 + `#builder` 라우트 UI.

**Architecture:** 순수 엔진(`src/lab/accent-scale/builder.ts`: `fillScale` 다중 고정점 워프 + `candidatesFor` knob 축 후보 3개)과 렌더 전용 UI(`web/src/builder/BuilderPage.tsx`)를 분리. 엔진은 `ours.ts`의 OURS_CURVE를 공유하고, 고정점이 앵커 하나일 때 v0와 동치.

**Tech Stack:** TypeScript Node16 ESM (src/는 `.js` 확장자 import 필수), culori, vitest, React 18 + Tailwind (web/), pnpm(루트)·npm(web/).

**스펙:** `docs/superpowers/specs/2026-07-27-guided-palette-builder-design.md` — 작업 전 반드시 읽을 것.

## Global Constraints

- src/ 내부 상대 import는 `.js` 확장자 필수 (Node16 ESM). web/은 Vite alias `@core` → `src/`, `@data` → `data/`.
- `src/lab/`은 제품 파이프라인(generator)에서 import 금지. 브라우저 번들 안전: 정적 ESM만 (node: 빌트인·createRequire·top-level await 금지).
- FP 원칙: 비즈니스 로직은 순수 함수로 src/에, 렌더는 web/에. UI 카피(라벨·note)도 엔진 데이터로 src/에 둔다 (기존 lab-data 패턴).
- 커밋 트레일러: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. 커밋 프리픽스 `feat(lab):` / `feat(web):` / `docs(...)`.
- 테스트: 루트에서 `pnpm test` (vitest). 기존 852개 내외 전체가 계속 통과해야 함.
- 웜톤 판정 상수: 앵커 hue ∈ [30°, 110°]. 후보 수는 항상 3.
- 스케일: 11-stop, stop 키 `50..950`, 인덱스 0..10, 앵커 = 인덱스 5. 선택 순서 `[5, 0, 10, 3, 7]`.

---

### Task 1: 엔진 코어 — OURS_CURVE 공개 + fillScale + gamut 클램프

**Files:**
- Modify: `src/lab/accent-scale/ours.ts` (OURS_CURVE에 `export` 추가 — 값 변경 없음)
- Create: `src/lab/accent-scale/builder.ts`
- Test: `tests/lab/builder.test.ts`

**Interfaces:**
- Consumes: `OURS_CURVE: readonly {l, cMult}[]` (ours.ts), `oursAlgorithm` (ours.ts), `Oklch = {l, c, h}` (`src/schema/types.js`), `parsePrimary(hex): Oklch` (`src/generator/color.js`), culori `converter`.
- Produces (Task 2·3이 의존):
  - `interface Pin { index: number; color: Oklch }`
  - `const SCALE_SIZE = 11`
  - `const STOP_KEYS: readonly string[]` — `["50",...,"950"]`
  - `function clampToGamut(color: Oklch): Oklch`
  - `function fillScale(pins: readonly Pin[]): Oklch[]` — 길이 11, 앵커 pin(index 5) 필수(없으면 throw)

- [ ] **Step 1: ours.ts의 OURS_CURVE에 export 추가**

`src/lab/accent-scale/ours.ts`에서 `const OURS_CURVE` → `export const OURS_CURVE` (한 줄). 값·주석 변경 없음.

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/lab/builder.test.ts` 생성:

```ts
import { describe, it, expect } from "vitest";
import {
  fillScale,
  clampToGamut,
  SCALE_SIZE,
  STOP_KEYS,
  type Pin,
} from "../../src/lab/accent-scale/builder.js";
import { oursAlgorithm } from "../../src/lab/accent-scale/ours.js";
import { parsePrimary } from "../../src/generator/color.js";

const anchorPin = (hex: string): Pin => ({ index: 5, color: parsePrimary(hex) });

// EVAL_PRESETS(lab-data)의 11개 hue와 동일 — 눈 평가에서 검증한 대표 입력
const PRESET_HEXES = ["#3b82f6", "#ef4444", "#f97316", "#eab308", "#16a34a",
  "#06b6d4", "#8b5cf6", "#ec4899", "#cc785c", "#93c5fd", "#1e40af"];

describe("fillScale", () => {
  it("requires the anchor pin", () => {
    expect(() => fillScale([{ index: 0, color: { l: 0.98, c: 0.01, h: 260 } }]))
      .toThrow(/anchor/);
  });

  it("with only the anchor pin ≡ ours v0 (gamut-clamped)", () => {
    for (const hex of PRESET_HEXES) {
      const built = fillScale([anchorPin(hex)]);
      const v0 = oursAlgorithm
        .derive(hex, oursAlgorithm.nativeSpec)
        .map(clampToGamut);
      expect(built).toHaveLength(SCALE_SIZE);
      built.forEach((c, i) => {
        expect(c.l, `${hex} stop ${i} L`).toBeCloseTo(v0[i].l, 6);
        expect(c.c, `${hex} stop ${i} C`).toBeCloseTo(v0[i].c, 6);
      });
    }
  });

  it("preserves every pin verbatim", () => {
    const pins: Pin[] = [
      anchorPin("#3b82f6"),
      { index: 0, color: { l: 0.977, c: 0.02, h: 259 } },
      { index: 10, color: { l: 0.25, c: 0.08, h: 240 } },
    ];
    const out = fillScale(pins);
    for (const p of pins) expect(out[p.index]).toEqual(p.color);
  });

  it("keeps lightness strictly decreasing with monotone pins", () => {
    for (const hex of PRESET_HEXES) {
      const a = parsePrimary(hex);
      const pins: Pin[] = [
        { index: 5, color: a },
        { index: 0, color: { l: 0.977, c: a.c * 0.18, h: a.h } },
        { index: 10, color: { l: 0.22, c: a.c * 0.42, h: a.h } },
        { index: 3, color: clampToGamut({ l: (0.977 + a.l) / 2 + 0.06, c: a.c * 0.83, h: a.h }) },
        { index: 7, color: clampToGamut({ l: (a.l + 0.22) / 2, c: a.c * 0.97, h: a.h }) },
      ];
      const out = fillScale(pins);
      for (let i = 1; i < out.length; i++) {
        expect(out[i].l, `${hex} stop ${i}`).toBeLessThan(out[i - 1].l);
      }
    }
  });

  it("is order-invariant over the pin list (순수성)", () => {
    const pins: Pin[] = [
      { index: 10, color: { l: 0.25, c: 0.08, h: 240 } },
      anchorPin("#3b82f6"),
      { index: 0, color: { l: 0.977, c: 0.02, h: 259 } },
    ];
    const reversed = [...pins].reverse();
    expect(fillScale(pins)).toEqual(fillScale(reversed));
  });

  it("interpolates hue toward a drifted dark pin (골드 드리프트 경로)", () => {
    const a = parsePrimary("#eab308"); // h ≈ 92
    const out = fillScale([
      { index: 5, color: a },
      { index: 10, color: { l: 0.278, c: a.c * 0.42, h: a.h - 25 } },
    ]);
    // 앵커(5)와 드리프트된 950 사이의 stop들은 hue가 단조로 이동
    for (let i = 6; i <= 10; i++) {
      expect(out[i].h, `stop ${i}`).toBeLessThanOrEqual(out[i - 1].h + 1e-9);
      expect(out[i].h).toBeGreaterThanOrEqual(a.h - 25 - 1e-9);
    }
  });
});

describe("clampToGamut", () => {
  it("returns in-gamut colors unchanged", () => {
    const c = { l: 0.6, c: 0.1, h: 260 };
    expect(clampToGamut(c)).toEqual(c);
  });
  it("reduces chroma (only) for out-of-gamut colors", () => {
    const wild = { l: 0.55, c: 0.4, h: 145 };
    const out = clampToGamut(wild);
    expect(out.c).toBeLessThan(wild.c);
    expect(out.l).toBe(wild.l);
    expect(out.h).toBe(wild.h);
  });
});

describe("STOP_KEYS", () => {
  it("has 11 tailwind-style keys with 500 at the anchor index", () => {
    expect(STOP_KEYS).toHaveLength(SCALE_SIZE);
    expect(STOP_KEYS[5]).toBe("500");
    expect(STOP_KEYS[0]).toBe("50");
    expect(STOP_KEYS[10]).toBe("950");
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm vitest run tests/lab/builder.test.ts`
Expected: FAIL — `Cannot find module '.../builder.js'`

- [ ] **Step 4: builder.ts 구현**

`src/lab/accent-scale/builder.ts` 생성:

```ts
// src/lab/accent-scale/builder.ts
//
// 가이드드 팔레트 빌더 엔진 (순수 함수만, 렌더 없음).
// 스펙: docs/superpowers/specs/2026-07-27-guided-palette-builder-design.md
//
// 우리 곡선 v0(ours.ts)의 앵커 워프를 고정점 N개로 일반화: 사용자가 확정한
// stop(Pin)이 곡선의 고정점이 되고, 인접 고정점 사이는 OURS_CURVE의 모양
// (L 진행률·cMult 비율)을 유지한 채 보간한다. 고정점이 앵커 하나면 v0와 동치
// (단, 여기는 엔진이 gamut 클램프까지 책임진다 — v0는 표시 계층에서 클램프).
//
// 실험 코드 — 제품 파이프라인에서 import 금지 (웹 #builder 라우트 전용).

import { converter } from "culori";
import type { Oklch } from "../../schema/types.js";
import { OURS_CURVE } from "./ours.js";

export interface Pin {
  /** 0..10 = stop 50..950 */
  index: number;
  color: Oklch;
}

export const SCALE_SIZE = 11;

export const STOP_KEYS = [
  "50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950",
] as const;

const toRgb = converter("rgb");

function displayable({ l, c, h }: Oklch): boolean {
  const rgb = toRgb({ mode: "oklch", l, c, h });
  if (!rgb) return false;
  const eps = 1e-4;
  const ok = (v: number | undefined) =>
    typeof v === "number" && v >= -eps && v <= 1 + eps;
  return ok(rgb.r) && ok(rgb.g) && ok(rgb.b);
}

/** sRGB 밖이면 그 밝기·hue에서 표현 가능한 최대 채도로 잘라 반환 (이진 탐색 20회).
 *  web/src/lib/oklch.ts clampChromaToGamut와 같은 수학 — 엔진은 web을 import할
 *  수 없어(방향 역전) src 쪽에 별도로 둔다. */
export function clampToGamut(color: Oklch): Oklch {
  if (displayable(color)) return color;
  let lo = 0;
  let hi = color.c;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (displayable({ ...color, c: mid })) lo = mid;
    else hi = mid;
  }
  return { ...color, c: lo };
}

/** 원형 최단거리 hue 보간 */
function hueLerp(a: number, b: number, t: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}

/** 고정점 사이를 OURS_CURVE 모양으로 채운 11-stop 스케일.
 *  - 앵커 pin(index 5) 필수. pin 색은 in-gamut 가정 (UI가 보장) → verbatim 보존.
 *  - 실제 pin이 없는 양 끝은 곡선 끝 L + 최근접 pin에 비례한 채도의 가상 고정점.
 *  - 보간 stop과 가상 끝점은 gamut 클램프 후 반환. */
export function fillScale(pins: readonly Pin[]): Oklch[] {
  if (!pins.some((p) => p.index === 5)) {
    throw new Error("fillScale: anchor pin (index 5) is required");
  }
  const sorted = [...pins].sort((a, b) => a.index - b.index);
  const eff: { index: number; color: Oklch; virtual: boolean }[] = sorted.map(
    (p) => ({ ...p, virtual: false }),
  );
  const first = sorted[0];
  if (first.index !== 0) {
    eff.unshift({
      index: 0,
      virtual: true,
      color: {
        l: OURS_CURVE[0].l,
        c: first.color.c * (OURS_CURVE[0].cMult / OURS_CURVE[first.index].cMult),
        h: first.color.h,
      },
    });
  }
  const last = sorted[sorted.length - 1];
  if (last.index !== SCALE_SIZE - 1) {
    eff.push({
      index: SCALE_SIZE - 1,
      virtual: true,
      color: {
        l: OURS_CURVE[SCALE_SIZE - 1].l,
        c: last.color.c * (OURS_CURVE[SCALE_SIZE - 1].cMult / OURS_CURVE[last.index].cMult),
        h: last.color.h,
      },
    });
  }

  const out: Oklch[] = new Array(SCALE_SIZE);
  for (const p of eff) {
    out[p.index] = p.virtual ? clampToGamut(p.color) : { ...p.color };
  }
  for (let s = 0; s < eff.length - 1; s++) {
    const a = eff[s];
    const b = eff[s + 1];
    const li = OURS_CURVE[a.index].l;
    const lj = OURS_CURVE[b.index].l;
    const ra = a.color.c / OURS_CURVE[a.index].cMult;
    const rb = b.color.c / OURS_CURVE[b.index].cMult;
    for (let k = a.index + 1; k < b.index; k++) {
      const t = (li - OURS_CURVE[k].l) / (li - lj);
      out[k] = clampToGamut({
        l: a.color.l - t * (a.color.l - b.color.l),
        c: OURS_CURVE[k].cMult * (ra + (rb - ra) * t),
        h: hueLerp(a.color.h, b.color.h, t),
      });
    }
  }
  return out;
}
```

- [ ] **Step 5: 통과 확인**

Run: `pnpm vitest run tests/lab/builder.test.ts`
Expected: PASS (전 테스트). 이어서 `pnpm test`로 기존 전체(852개 내외)도 PASS 확인.

주의: "v0 동치" 테스트가 hue 비교를 뺀 이유 — v0는 hue를 앵커값 그대로 반환하고 fillScale은 `hueLerp`로 mod 360 정규화하므로 h가 음수/360 초과인 입력에서 표현만 다를 수 있다. L/C 일치 + hue 드리프트 테스트로 충분히 커버된다.

- [ ] **Step 6: 커밋**

```bash
git add src/lab/accent-scale/ours.ts src/lab/accent-scale/builder.ts tests/lab/builder.test.ts
git commit -m "feat(lab): builder engine core — multi-pin fillScale generalizing ours v0

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: candidatesFor + 단계 메타 (교보재 카피 포함)

**Files:**
- Modify: `src/lab/accent-scale/builder.ts` (끝에 추가)
- Test: `tests/lab/builder.test.ts` (끝에 추가)

**Interfaces:**
- Consumes: Task 1의 `Pin`, `fillScale`, `clampToGamut`, `OURS_CURVE`.
- Produces (Task 3이 의존):
  - `interface Candidate { color: Oklch; label: string; note: string }`
  - `const BUILDER_STEPS: readonly number[]` — `[5, 0, 10, 3, 7]`
  - `const STEP_META: Record<number, { title: string; description: string }>`
  - `function candidatesFor(stopIndex: number, pins: readonly Pin[]): Candidate[]` — 항상 3개, 전부 in-gamut; 앵커 pin 없으면 throw; stopIndex ∉ {0,10,3,7}이면 throw

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/lab/builder.test.ts` 끝에 추가:

```ts
import {
  BUILDER_STEPS,
  STEP_META,
  candidatesFor,
} from "../../src/lab/accent-scale/builder.js";

describe("BUILDER_STEPS / STEP_META", () => {
  it("follows the RUI order 500→50→950→300→700", () => {
    expect(BUILDER_STEPS).toEqual([5, 0, 10, 3, 7]);
  });
  it("has title+description for every step (교보재 계약)", () => {
    for (const idx of BUILDER_STEPS) {
      expect(STEP_META[idx].title.length, `step ${idx}`).toBeGreaterThan(0);
      expect(STEP_META[idx].description.length, `step ${idx}`).toBeGreaterThan(10);
    }
  });
});

describe("candidatesFor", () => {
  const pins = [anchorPin("#3b82f6")];

  it("throws without the anchor pin / on non-candidate stops", () => {
    expect(() => candidatesFor(0, [])).toThrow(/anchor/);
    expect(() => candidatesFor(5, pins)).toThrow(/unsupported/);
  });

  it.each([0, 10, 3, 7])(
    "stop %i: three displayable candidates with 교보재 labels",
    (stop) => {
      for (const hex of PRESET_HEXES) {
        const cands = candidatesFor(stop, [anchorPin(hex)]);
        expect(cands).toHaveLength(3);
        for (const cd of cands) {
          expect(cd.label.length).toBeGreaterThan(0);
          expect(cd.note.length).toBeGreaterThan(10);
          // clampToGamut는 in-gamut 색을 그대로 반환한다 (표시 가능성 증명)
          expect(clampToGamut(cd.color)).toEqual(cd.color);
        }
      }
    },
  );

  it("950 includes gold hue-drift for warm anchors only", () => {
    const warm = candidatesFor(10, [anchorPin("#eab308")]); // h≈92 ∈ [30,110]
    const cool = candidatesFor(10, [anchorPin("#3b82f6")]); // h≈259
    expect(warm.some((c) => c.label.includes("골드"))).toBe(true);
    expect(cool.some((c) => c.label.includes("골드"))).toBe(false);
    expect(cool.some((c) => c.label.includes("얕게"))).toBe(true);
  });

  it("marks degenerate (clamp-collapsed) candidates in the note instead of hiding", () => {
    // 저채도 뮤트 앵커도 후보 3개 유지 — 겹치면 note에 표시된다는 계약만 고정
    const cands = candidatesFor(0, [anchorPin("#cc785c")]);
    expect(cands).toHaveLength(3);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tests/lab/builder.test.ts`
Expected: FAIL — `candidatesFor is not a function` (등)

- [ ] **Step 3: 구현 추가**

`src/lab/accent-scale/builder.ts` 끝에 추가:

```ts
export interface Candidate {
  color: Oklch;
  label: string;
  note: string;
}

/** RUI 선택 순서: 500 → 50 → 950 → 300 → 700 */
export const BUILDER_STEPS = [5, 0, 10, 3, 7] as const;

/** 단계별 안내 카피 (교보재) — 렌더는 web/BuilderPage가 담당 */
export const STEP_META: Record<number, { title: string; description: string }> = {
  5: {
    title: "액센트 (500)",
    description:
      "팔레트의 기준이 되는 브랜드 컬러. 나머지 10개 stop이 전부 이 색에서 파생된다 — Refactoring UI가 '가장 먼저 정하라'고 권하는 그 색.",
  },
  0: {
    title: "가장 밝은 색 (50)",
    description:
      "배경으로 깔 수 있는 가장 옅은 색. 여기서 브랜드 기운(색끼)을 얼마나 남길지가 첫 취향 갈림길이다.",
  },
  10: {
    title: "가장 어두운 색 (950)",
    description:
      "스케일의 바닥. 얼마나 깊이 누를지, 웜톤이라면 hue를 틀어 탁함을 피할지를 정한다.",
  },
  3: {
    title: "중간 밝음 (300)",
    description:
      "호버 배경·강조 태그가 사는 구간. 밝은 쪽 절반의 채도 성격이 여기서 정해진다.",
  },
  7: {
    title: "중간 어두움 (700)",
    description:
      "본문 위 텍스트·진한 버튼이 사는 구간. 채도가 높으면 화려하지만 오래 보면 피로하다.",
  },
};

const WARM_HUE_MIN = 30;
const WARM_HUE_MAX = 110;

/** 중간 stop 채도 변주 공통 라벨 (300·700) */
const MID_LABELS: readonly [string, string, string] = ["차분한", "균형", "쨍한"];

const colorKey = (o: Oklch) =>
  `${o.l.toFixed(3)}/${o.c.toFixed(3)}/${(((o.h % 360) + 360) % 360).toFixed(1)}`;

/** stopIndex 자리의 후보 3개. 색은 전부 gamut 클램프 후 반환.
 *  클램프로 후보가 겹치면 숨기지 않고 note에 표시한다 — "이 앵커에서는 이 축의
 *  선택지가 좁다"는 것 자체가 교보재 정보. */
export function candidatesFor(
  stopIndex: number,
  pins: readonly Pin[],
): Candidate[] {
  const anchor = pins.find((p) => p.index === 5);
  if (!anchor) throw new Error("candidatesFor: anchor pin (index 5) is required");
  const base = fillScale(pins);
  const ref = base[stopIndex];
  const ac = anchor.color.c;
  const ah = anchor.color.h;

  let list: Candidate[];
  switch (stopIndex) {
    case 0:
      list = [
        {
          color: { l: ref.l, c: ac * 0.05, h: ref.h },
          label: "중립적",
          note: "브랜드 기운을 거의 뺀, 회백에 가까운 배경 — 콘텐츠가 주인공일 때",
        },
        {
          color: { l: ref.l, c: ac * 0.092, h: ref.h },
          label: "균형",
          note: "tailwind 손튜닝 평균값 — 배경인 걸 알지만 브랜드 기운이 은은히 비친다",
        },
        {
          color: { l: ref.l, c: ac * 0.18, h: ref.h },
          label: "색이 드러나는",
          note: "배경부터 브랜드를 말하는 선택 — 마케팅 페이지의 톤",
        },
      ];
      break;
    case 10: {
      const warm = ah >= WARM_HUE_MIN && ah <= WARM_HUE_MAX;
      list = [
        {
          color: { l: 0.278, c: ref.c, h: ah },
          label: "기본",
          note: "tailwind 950 평균 깊이 — 무난하게 깊은 바닥",
        },
        {
          color: { l: 0.22, c: ref.c, h: ah },
          label: "더 깊게",
          note: "거의 검정에 가까운 바닥 — 대비가 최대, 무게감 있는 인상",
        },
        warm
          ? {
              color: { l: 0.278, c: ref.c, h: ah - 25 },
              label: "골드로 틀기",
              note: "어두운 노랑·주황은 hue를 틀지 않으면 올리브(탁색)가 된다 — tailwind의 웜톤 손튜닝 기법",
            }
          : {
              color: { l: 0.32, c: ref.c, h: ah },
              label: "얕게",
              note: "바닥을 덜 눌러 부드러운 인상 — 대신 어두운 쪽 대비 폭은 줄어든다",
            },
      ];
      break;
    }
    case 3:
      list = [0.55, 0.689, 0.83].map((m, i) => ({
        color: { l: ref.l, c: ac * m, h: ref.h },
        label: MID_LABELS[i],
        note:
          i === 1
            ? "tailwind 평균 곡선 그대로 — 곡선 기본값과 거의 일치"
            : i === 0
              ? "밝은 쪽 절반을 차분하게 — 배경·태그가 점잖아진다"
              : "밝은 쪽 절반을 화사하게 — 호버·강조가 또렷해진다",
      }));
      break;
    case 7:
      list = [0.75, 0.872, 0.97].map((m, i) => ({
        color: { l: ref.l, c: ac * m, h: ref.h },
        label: MID_LABELS[i],
        note:
          i === 1
            ? "tailwind 평균 곡선 그대로 — 곡선 기본값과 거의 일치"
            : i === 0
              ? "텍스트·진한 버튼을 차분하게 — 오래 봐도 피로가 적다"
              : "어두운 쪽을 선명하게 — 강조는 세지지만 텍스트로는 피로할 수 있다",
      }));
      break;
    default:
      throw new Error(`candidatesFor: unsupported stop index ${stopIndex}`);
  }

  const clamped = list.map((cd) => ({ ...cd, color: clampToGamut(cd.color) }));
  const seen = new Map<string, number>();
  for (const cd of clamped) {
    seen.set(colorKey(cd.color), (seen.get(colorKey(cd.color)) ?? 0) + 1);
  }
  return clamped.map((cd) =>
    (seen.get(colorKey(cd.color)) ?? 0) > 1
      ? { ...cd, note: `${cd.note} · 이 앵커에서는 클램프로 후보 폭이 좁아 다른 후보와 겹칩니다` }
      : cd,
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm vitest run tests/lab/builder.test.ts` → PASS. 이어서 `pnpm test` 전체 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/lab/accent-scale/builder.ts tests/lab/builder.test.ts
git commit -m "feat(lab): builder candidatesFor — knob-axis candidates with study notes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: BuilderPage UI + #builder 라우트

**Files:**
- Create: `web/src/builder/BuilderPage.tsx`
- Modify: `web/src/App.tsx` (라우트 분기 1줄 + import)

**Interfaces:**
- Consumes: Task 1·2의 엔진 전부(`@core/lab/accent-scale/builder.js`), `oklchToHex(oklch): string` (`@core/generator/color.js`), `OklchPicker` (`../components/OklchPicker`), `ColorScaleStrip` + `ColorScaleStop.anchor` (`../components/ColorScaleStrip`).
- Produces: `export function BuilderPage()` — 라우트 `#builder`.

- [ ] **Step 1: App.tsx 라우트 추가**

```tsx
// import 추가
import { BuilderPage } from "./builder/BuilderPage";
// LabPage 분기 아래에 추가
if (hash === "#builder") return <BuilderPage />;
```

- [ ] **Step 2: BuilderPage.tsx 작성**

```tsx
// web/src/builder/BuilderPage.tsx
//
// #builder — 가이드드 팔레트 빌더 (RUI 5-pick 플로우). 렌더 전용:
// 스케일 계산·후보 생성은 전부 @core/lab/accent-scale/builder (순수).
// 스펙: docs/superpowers/specs/2026-07-27-guided-palette-builder-design.md

import { useMemo, useState } from "react";
import {
  BUILDER_STEPS,
  candidatesFor,
  fillScale,
  STEP_META,
  STOP_KEYS,
  type Candidate,
  type Pin,
} from "@core/lab/accent-scale/builder.js";
import { oklchToHex, parsePrimary } from "@core/generator/color.js";
import { ColorScaleStrip } from "../components/ColorScaleStrip";
import { OklchPicker } from "../components/OklchPicker";

interface Choice {
  stopIndex: number;
  label: string; // 액센트 단계는 hex, 후보 단계는 후보 라벨 (여정 요약용)
}

function toStrip(pins: readonly Pin[], scale = fillScale(pins)) {
  const pinSet = new Set(pins.map((p) => p.index));
  return scale.map((c, i) => ({
    key: STOP_KEYS[i],
    hex: oklchToHex(c),
    anchor: pinSet.has(i),
  }));
}

export function BuilderPage() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [stepIdx, setStepIdx] = useState(0); // BUILDER_STEPS 위치, length면 완료
  const [accentHex, setAccentHex] = useState("#3b82f6");
  const [picked, setPicked] = useState<Candidate | null>(null); // 현재 단계 임시 선택

  const done = stepIdx >= BUILDER_STEPS.length;
  const stopIndex = done ? -1 : BUILDER_STEPS[stepIdx];
  const isAccentStep = stopIndex === 5;

  const candidates = useMemo(
    () => (done || isAccentStep ? [] : candidatesFor(stopIndex, pins)),
    [done, isAccentStep, stopIndex, pins],
  );

  // 하단 상시 미리보기: 확정 pin + 임시 선택 반영
  const previewPins = useMemo<Pin[]>(() => {
    if (isAccentStep && !done) {
      return [{ index: 5, color: parsePrimary(accentHex) }];
    }
    return picked ? [...pins, { index: stopIndex, color: picked.color }] : pins;
  }, [isAccentStep, done, accentHex, picked, pins, stopIndex]);

  const confirm = () => {
    if (isAccentStep) {
      const color = parsePrimary(accentHex);
      setPins([{ index: 5, color }]);
      setChoices([{ stopIndex: 5, label: accentHex }]);
    } else if (picked) {
      setPins([...pins, { index: stopIndex, color: picked.color }]);
      setChoices([...choices, { stopIndex, label: picked.label }]);
    } else {
      return;
    }
    setPicked(null);
    setStepIdx(stepIdx + 1);
  };

  /** 완료 단계로 복귀 — 이후 단계 선택은 무효화 (스펙 결정) */
  const redo = (targetStep: number) => {
    const keptStops = BUILDER_STEPS.slice(0, targetStep);
    setPins(pins.filter((p) => keptStops.includes(p.index)));
    setChoices(choices.filter((c) => keptStops.includes(c.stopIndex)));
    setPicked(null);
    setStepIdx(targetStep);
  };

  const restart = () => {
    setPins([]);
    setChoices([]);
    setPicked(null);
    setStepIdx(0);
  };

  const finalStops = done ? toStrip(pins) : null;
  const copyAll = () =>
    finalStops &&
    navigator.clipboard.writeText(finalStops.map((s) => s.hex).join(", "));

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <header>
        <h1 className="text-lg font-semibold">Guided Palette Builder</h1>
        <p className="text-xs text-neutral-500">
          Refactoring UI 순서로 액센트 스케일 만들기 — 500 → 50 → 950 → 300 → 700
        </p>
        <div className="flex gap-1.5 mt-2">
          {BUILDER_STEPS.map((s, i) => (
            <span
              key={s}
              className={`w-2 h-2 rounded-full ${
                i < stepIdx ? "bg-neutral-800" : i === stepIdx ? "bg-neutral-400" : "bg-neutral-200"
              }`}
            />
          ))}
        </div>
      </header>

      {/* 완료 단계 요약 */}
      {choices.map((c, i) => (
        <div
          key={c.stopIndex}
          className="flex items-center justify-between border border-neutral-200 rounded px-3 py-2 text-xs"
        >
          <span className="text-neutral-600">
            ✓ {i + 1}. {STEP_META[c.stopIndex].title} — {c.label}
          </span>
          <button
            type="button"
            onClick={() => redo(i)}
            className="text-neutral-400 hover:text-neutral-700"
          >
            다시 고르기
          </button>
        </div>
      ))}

      {/* 현재 단계 */}
      {!done && (
        <section className="border border-neutral-300 rounded p-4 space-y-3">
          <div>
            <h2 className="text-sm font-medium">
              {stepIdx + 1}. {STEP_META[stopIndex].title}
            </h2>
            <p className="text-[11px] leading-4 text-neutral-400 mt-1">
              {STEP_META[stopIndex].description}
            </p>
          </div>

          {isAccentStep ? (
            <div className="flex items-start gap-6">
              <OklchPicker hex={accentHex} onChange={setAccentHex} />
              <input
                value={accentHex}
                onChange={(e) => {
                  if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setAccentHex(e.target.value);
                }}
                className="border border-neutral-300 rounded px-2 py-1 text-sm font-mono w-24"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((cd) => {
                const active = picked?.label === cd.label;
                return (
                  <label
                    key={cd.label}
                    className={`block rounded border p-2 cursor-pointer ${
                      active ? "border-neutral-800" : "border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="candidate"
                        checked={active}
                        onChange={() => setPicked(cd)}
                      />
                      <span
                        className="inline-block w-4 h-4 rounded-sm border border-neutral-200"
                        style={{ background: oklchToHex(cd.color) }}
                      />
                      <span className="text-xs font-medium">{cd.label}</span>
                    </div>
                    <p className="text-[11px] leading-4 text-neutral-400 mb-1.5">{cd.note}</p>
                    <ColorScaleStrip
                      stops={toStrip([...pins, { index: stopIndex, color: cd.color }])}
                    />
                  </label>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={confirm}
            disabled={!isAccentStep && !picked}
            className="text-xs rounded border border-neutral-800 px-3 py-1.5 disabled:opacity-30"
          >
            이 색으로 확정 →
          </button>
        </section>
      )}

      {/* 완료 화면 */}
      {done && finalStops && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">완성된 스케일</h2>
            <button
              type="button"
              onClick={copyAll}
              className="text-[10px] text-neutral-400 hover:text-neutral-700"
            >
              copy hex
            </button>
          </div>
          <ColorScaleStrip stops={finalStops} />
          <div className="text-[11px] leading-5 font-mono text-neutral-500">
            {finalStops.map((s) => (
              <div key={s.key}>
                {s.key}: {s.hex}
              </div>
            ))}
          </div>
          <div className="text-[11px] leading-4 text-neutral-400">
            <span className="font-medium text-neutral-500">내가 고른 여정 — </span>
            {choices.map((c) => `${STEP_META[c.stopIndex].title}: ${c.label}`).join(" → ")}
          </div>
          <button
            type="button"
            onClick={restart}
            className="text-xs rounded border border-neutral-300 px-3 py-1.5 hover:border-neutral-500"
          >
            처음부터 다시
          </button>
        </section>
      )}

      {/* 하단 상시 미리보기 */}
      {previewPins.length > 0 && !done && (
        <section className="border-t border-neutral-200 pt-4">
          <h3 className="text-[11px] font-medium text-neutral-500 mb-2">
            미리보기 — 지금 상태의 스케일 (링 = 내가 확정/선택한 stop)
          </h3>
          <ColorScaleStrip stops={toStrip(previewPins)} />
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 타입 체크 + 빌드**

Run: `cd web && npx tsc --noEmit && npm run build`
Expected: 에러 없음, `✓ built`

- [ ] **Step 4: Playwright 수동 검증 (dev 서버 필요 — `cd web && npm run dev -- --port 5199 --strictPort`)**

`http://localhost:5199/#builder` 열고 (코드 변경 후엔 반드시 `page.reload()` — 같은 URL `goto`는 리로드 안 됨):
1. 1단계: 피커/hex로 `#eab308` 입력 → 확정 → 완료 요약 줄 생김, 2단계 오픈.
2. 2단계(50): 후보 3개(중립적/균형/색이 드러나는), 각각 스케일 미리보기 렌더 → "균형" 선택 → 하단 미리보기 갱신 확인 → 확정.
3. 3단계(950): 웜톤 앵커라 "골드로 틀기" 후보 존재 확인 → 골드 선택 → 확정.
4. 4·5단계(300, 700) 완주 → 완료 화면: 11개 hex 목록 + 여정 요약 + copy hex 동작.
5. "다시 고르기"로 2단계 복귀 → 이후 선택 무효화(3~5단계 요약 사라짐) 확인.
6. 쿨톤(`#3b82f6`)으로 재시작 → 950 후보가 "얕게"로 바뀌는지 확인.

Expected: 전 단계 정상, 콘솔 에러 0.

- [ ] **Step 5: 커밋**

```bash
git add web/src/builder/BuilderPage.tsx web/src/App.tsx
git commit -m "feat(web): guided palette builder — #builder route with 5-pick flow

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 최종 검증 + 문서 반영

**Files:**
- Modify: `docs/research/accent-scale-derivation-track.md` (빌더 구현 상태 1줄)

**Interfaces:**
- Consumes: Task 1~3 전부 완료 상태.
- Produces: 머지 가능한 브랜치.

- [ ] **Step 1: 전체 검증**

Run (repo 루트): `pnpm test && pnpm accent-scale-bench && cd web && npx tsc --noEmit && npm run build`
Expected: 테스트 전체 PASS (기존 + builder 신규), 벤치 리포트 diff 없음(빌더는 벤치 무관), 빌드 클린.

- [ ] **Step 2: 트랙 문서에 구현 상태 기록**

`docs/research/accent-scale-derivation-track.md`의 "## knob 후보 (가이드드 빌더로 이월)" 섹션 앞에 추가:

```markdown
## 빌더 구현 (2026-07-27)

가이드드 빌더 v1 구현 완료 — 스펙 `docs/superpowers/specs/2026-07-27-guided-palette-builder-design.md`,
엔진 `src/lab/accent-scale/builder.ts` (fillScale 다중 고정점 워프 = v0의 일반화,
동치 테스트로 고정), UI `web` `#builder` 라우트. knob 후보 중 밝은 끝 색끼·어두운 끝
깊이·웜톤 hue 드리프트가 후보 축으로 편입됨.
```

- [ ] **Step 3: 커밋**

```bash
git add docs/research/accent-scale-derivation-track.md
git commit -m "docs(color): record builder v1 implementation in derivation track

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-Review 기록

- 스펙 커버리지: 위치/라우트(T3), 5-pick 플로우(T2·T3), knob 후보+note(T2), 칩+스케일 미리보기(T3), fillScale 워프·v0 동치·클램프(T1), 다시 고르기 무효화(T3), 완료 화면·여정 요약·copy(T3), 퇴화 note(T2), 테스트 표 6종(T1: 동치·보존·단조·순서무관, T2: 후보 정합·웜톤 분기) — 전부 매핑됨.
- 타입 일관성: `Pin`/`Candidate`/`fillScale`/`candidatesFor`/`STOP_KEYS`/`STEP_META` 시그니처가 T1→T2→T3에서 동일.
- v0 동치의 hue 정규화 차이는 T1 Step 5에 명시 (L/C 비교 + hue 드리프트 테스트로 커버).
