# 팔레트 생성기 색 시스템 확장 (사이클 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 액센트 11-stop만 만들던 `#builder` 생성기를 액센트 + 뉴트럴 + 시맨틱 4종까지 만드는 색 시스템 생성기로 확장한다.

**Architecture:** 뉴트럴은 자체 L 곡선(`NEUTRAL_CURVE`, 상수) + 액센트 hue에서 스냅한 이산 틴트 어트랙터로 만들고, 시맨틱은 기존 `OURS_CURVE`에 고정 앵커와 실측 hue 램프를 태워 만든다. 세 종류 모두 하나의 역할표(`SCALE_ROLES`)와 하나의 다크 미러 규칙(`i → 10−i`, solid 예외)을 공유한다.

**Tech Stack:** TypeScript (Node16 ESM, 상대 import에 `.js` 확장자 필수), vitest, culori, React 19 + Tailwind 4 (web), pnpm(루트) / npm(web).

**스펙:** `docs/superpowers/specs/2026-08-09-palette-generator-color-system-design.md`

## Global Constraints

- **랩 격리:** `src/generator/`는 `src/lab/`을 import하지 않는다. 역방향(lab → generator)은 허용.
- **브라우저 안전:** `src/lab/` 아래는 정적 ESM만. `node:fs` 등 Node 전용 API 금지 (web이 번들한다).
- **ESM 확장자:** `src/`·`tests/` 안의 상대 import는 반드시 `.js`로 끝난다 (`./builder.js`). 루트는 TypeScript Node16.
- **FP 원칙:** 계산과 UI 문구(라벨·note)는 엔진에, `web/`은 렌더만 한다.
- **엔진에 실패 경로를 만들지 않는다.** 계약 위반 가드(throw)만 두고, 사용자 입력에서 도달 가능한 실패는 UI가 막는다.
- **테스트 실행:** 루트에서 `pnpm test` (vitest run). 단일 파일은 `pnpm vitest run tests/lab/<name>.test.ts`.
- **web 타입체크:** `cd web && npx tsc -b --noEmit`.
- **커밋 메시지 말미:** `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
- **상수 계보 주석:** 데이터에서 나온 테이블 상단에는 산출 스크립트 경로와 산출 일자를 주석으로 남긴다 (`ours.ts` 선례).

---

## File Structure

| 파일 | 책임 |
| --- | --- |
| `src/lab/palette/**` | `src/lab/accent-scale/**`에서 이동 (Task 1). 내용 무변경 |
| `src/lab/palette/neutral.ts` | 뉴트럴 곡선·틴트 어트랙터·스냅·후보·빌드 (Task 3–4) |
| `src/lab/palette/semantic.ts` | 시맨틱 앵커 4종 + 스케일 빌드 (Task 5) |
| `src/lab/palette/roles.ts` | `SCALE_ROLES` + 3종 스케일 `cssSnippet` (Task 6) |
| `scripts/analysis/neutral-curve-stats.ts` | 뉴트럴 상수 재생성 (Task 2) |
| `web/src/builder/BuilderPage.tsx` | 스텝 모델 확장 + 뉴트럴 단계 + 완료 화면 3종 (Task 7–8) |

`scripts/analysis/accent-scale-{bench,refs}.ts`와 `package.json`의 동명 스크립트는 **개명하지 않는다** — 실제로 액센트 벤치/레퍼런스 추출이 맞다.

---

## Task 1: 디렉터리 개명 (`accent-scale` → `palette`)

동작 변경 0. 이후 모든 태스크가 새 경로 위에서 진행되므로 먼저 한다.

**Files:**
- Move: `src/lab/accent-scale/` → `src/lab/palette/` (13파일)
- Modify: `tests/lab/*.test.ts` (7파일), `web/src/lab/LabPage.tsx`, `web/src/builder/BuilderPage.tsx`, `scripts/analysis/accent-scale-bench.ts`, `scripts/analysis/ours-curve-stats.ts`의 import 경로

- [ ] **Step 1: 현재 테스트가 전부 통과하는지 확인 (기준선)**

Run: `pnpm test`
Expected: PASS. 통과하지 않으면 멈추고 보고할 것 — 개명 전 기준선이 필요하다.

- [ ] **Step 2: git mv로 디렉터리 이동**

```bash
git mv src/lab/accent-scale src/lab/palette
```

- [ ] **Step 3: import 경로 일괄 치환**

```bash
grep -rl "lab/accent-scale" src tests web/src scripts \
  | xargs sed -i '' 's#lab/accent-scale#lab/palette#g'
```

이건 import 경로와 파일 헤더 주석(`// src/lab/accent-scale/roles.ts`)을 함께 고친다 — 둘 다 원하는 결과다.

- [ ] **Step 4: 치환 누락 확인**

Run: `grep -rn "lab/accent-scale" src tests web/src scripts; echo "exit=$?"`
Expected: 매치 0건 (grep exit=1). `scripts/analysis/accent-scale-{bench,refs}.ts`라는 **파일명 자체**는 남아야 정상이다 — 위 grep은 `lab/accent-scale` 경로만 찾으므로 걸리지 않는다.

- [ ] **Step 5: 테스트 + web 타입체크**

Run: `pnpm test && (cd web && npx tsc -b --noEmit)`
Expected: 둘 다 PASS

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(lab): accent-scale → palette

뉴트럴·시맨틱이 들어오면 accent-scale이라는 디렉터리 이름이 내용과 맞지
않는다. 경로와 헤더 주석만 이동 — 동작 변경 없음.

scripts/analysis/accent-scale-{bench,refs}는 실제로 액센트 벤치/레퍼런스
추출이 맞으므로 그대로 둔다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 뉴트럴 레퍼런스 산출 스크립트

Task 3–4가 쓸 상수의 **출처**를 코드로 남긴다. 이 스크립트가 없으면 상수가 근거 없는 매직넘버가 된다 (IDENTITY: "스키마 상수 하나하나에 왜 이 값인가의 계보").

**Files:**
- Create: `scripts/analysis/neutral-curve-stats.ts`
- Modify: `package.json` (스크립트 항목 추가)

**Interfaces:**
- Produces: 콘솔 출력 — `NEUTRAL_CURVE`의 `l` 배열, `C_SHAPE_SOFT`, `C_SHAPE_STRONG`, 램프별 `C_max`와 `hue@C_max`. Task 3이 이 값을 상수로 싣는다.

- [ ] **Step 1: 스크립트 작성**

`scripts/analysis/neutral-curve-stats.ts`:

```ts
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
```

- [ ] **Step 2: package.json에 스크립트 등록**

`package.json`의 `scripts`에 추가 (`accent-scale-bench` 다음 줄):

```json
    "neutral-curve-stats": "tsx scripts/analysis/neutral-curve-stats.ts"
```

- [ ] **Step 3: 실행해서 값 확인**

Run: `pnpm neutral-curve-stats`

Expected 출력 (Task 3이 이 값을 그대로 싣는다):

```
NEUTRAL_CURVE l (tailwind 뉴트럴 5종 평균):
[0.9848, 0.9684, 0.9244, 0.8702, 0.7066, 0.5532, 0.4434, 0.3720, 0.2736, 0.2098, 0.1384]

C_SHAPE_SOFT (zinc·stone 평균):
[0.038, 0.068, 0.233, 0.369, 0.826, 0.971, 0.923, 0.767, 0.446, 0.407, 0.301]
C_SHAPE_STRONG (slate·gray 평균):
[0.062, 0.120, 0.230, 0.386, 0.758, 0.897, 0.909, 0.978, 0.931, 0.957, 0.868]

램프별 C_max / hue@C_max (틴트 어트랙터 근거):
  slate    C_max=0.0460  hue=257.4
  gray     C_max=0.0340  hue=259.7
  zinc     C_max=0.0170  hue=285.8
  neutral  C_max=0.0000  hue=무채색
  stone    C_max=0.0130  hue=58.1

SOFT ref C_max mean = 0.0150 | STRONG ref C_max mean = 0.0400
```

값이 다르면 tailwind 버전이 바뀐 것이다 — 멈추고 보고할 것. 계획의 상수는 tailwind v4.3.3 기준이다.

- [ ] **Step 4: 커밋**

```bash
git add scripts/analysis/neutral-curve-stats.ts package.json
git commit -m "$(cat <<'EOF'
chore(analysis): neutral curve stats script

뉴트럴 곡선 상수의 산출 스크립트. tailwind 뉴트럴 5종에서 stop별 평균 L과
정규화 채도 모양을 뽑는다. 채도 모양은 약(zinc·stone)/강(slate·gray) 두
그룹으로 나눠 평균 — 어두운 쪽에서 C 모양이 C_max와 상관해 갈리므로
(sd 0.25~0.29) 하나로 평균하면 그 종속성이 사라진다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 뉴트럴 곡선 + 틴트 어트랙터 + `snapTint`

**Files:**
- Create: `src/lab/palette/neutral.ts`
- Test: `tests/lab/neutral.test.ts`

**Interfaces:**
- Consumes: `SCALE_SIZE`(=11) from `./builder.js`
- Produces:
  - `NEUTRAL_CURVE: readonly { l: number }[]` — 길이 11
  - `C_SHAPE_SOFT: readonly number[]`, `C_SHAPE_STRONG: readonly number[]` — 각 길이 11
  - `SOFT_REF_CMAX = 0.015`, `STRONG_REF_CMAX = 0.040`
  - `interface TintAttractor { id; label; hue: number | null; note: string }`
  - `TINT_ATTRACTORS: readonly TintAttractor[]` — 정확히 5개
  - `snapTint(accentHue: number): TintAttractor` — 유채색 4개 중 원형 거리 최소
  - `cShape(index: number, strength: number): number`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/lab/neutral.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  NEUTRAL_CURVE,
  C_SHAPE_SOFT,
  C_SHAPE_STRONG,
  TINT_ATTRACTORS,
  snapTint,
  cShape,
  SOFT_REF_CMAX,
  STRONG_REF_CMAX,
} from "../../src/lab/palette/neutral.js";
import { SCALE_SIZE } from "../../src/lab/palette/builder.js";

describe("NEUTRAL_CURVE", () => {
  it("has 11 stops with strictly decreasing lightness", () => {
    expect(NEUTRAL_CURVE).toHaveLength(SCALE_SIZE);
    for (let i = 1; i < NEUTRAL_CURVE.length; i++) {
      expect(NEUTRAL_CURVE[i].l, `stop ${i}`).toBeLessThan(NEUTRAL_CURVE[i - 1].l);
    }
  });

  it("matches the tailwind neutral mean measured 2026-08-09", () => {
    const expected = [
      0.9848, 0.9684, 0.9244, 0.8702, 0.7066,
      0.5532, 0.4434, 0.372, 0.2736, 0.2098, 0.1384,
    ];
    NEUTRAL_CURVE.forEach((s, i) => expect(s.l, `stop ${i}`).toBeCloseTo(expected[i], 4));
  });

  it("drops faster than the accent curve past stop 400 (why it needs its own table)", () => {
    // 액센트 OURS_CURVE의 500은 0.6838 — 뉴트럴은 0.13 이상 더 어둡다.
    expect(NEUTRAL_CURVE[5].l).toBeLessThan(0.6838 - 0.12);
    // 반대로 밝은 쪽 50은 액센트(0.9772)보다 밝다.
    expect(NEUTRAL_CURVE[0].l).toBeGreaterThan(0.9772);
  });
});

describe("chroma shape tables", () => {
  it("both have 11 entries in 0..1", () => {
    for (const t of [C_SHAPE_SOFT, C_SHAPE_STRONG]) {
      expect(t).toHaveLength(SCALE_SIZE);
      for (const v of t) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("STRONG holds chroma at the dark end while SOFT lets it fall", () => {
    // 이 방향성이 V3의 발견 — 뒤집히면 강도-종속 모델이 무너진다.
    for (const i of [8, 9, 10]) {
      expect(C_SHAPE_STRONG[i], `stop ${i}`).toBeGreaterThan(C_SHAPE_SOFT[i] + 0.2);
    }
  });

  it("agrees at the light end (where the ramps did not diverge)", () => {
    for (const i of [2, 3]) {
      expect(Math.abs(C_SHAPE_STRONG[i] - C_SHAPE_SOFT[i]), `stop ${i}`).toBeLessThan(0.05);
    }
  });
});

describe("cShape", () => {
  it("returns SOFT at the soft reference strength and STRONG at the strong one", () => {
    for (let i = 0; i < SCALE_SIZE; i++) {
      expect(cShape(i, SOFT_REF_CMAX), `soft ${i}`).toBeCloseTo(C_SHAPE_SOFT[i], 5);
      expect(cShape(i, STRONG_REF_CMAX), `strong ${i}`).toBeCloseTo(C_SHAPE_STRONG[i], 5);
    }
  });

  it("clamps outside the reference range instead of extrapolating", () => {
    expect(cShape(9, 0.0)).toBeCloseTo(C_SHAPE_SOFT[9], 5);
    expect(cShape(9, 0.5)).toBeCloseTo(C_SHAPE_STRONG[9], 5);
  });
});

describe("TINT_ATTRACTORS", () => {
  it("has exactly 5 entries with unique ids and exactly one achromatic", () => {
    expect(TINT_ATTRACTORS).toHaveLength(5);
    expect(new Set(TINT_ATTRACTORS.map((a) => a.id)).size).toBe(5);
    expect(TINT_ATTRACTORS.filter((a) => a.hue === null)).toHaveLength(1);
  });

  it("hues are in 0..360 and notes are educational", () => {
    for (const a of TINT_ATTRACTORS) {
      if (a.hue !== null) {
        expect(a.hue, a.id).toBeGreaterThanOrEqual(0);
        expect(a.hue, a.id).toBeLessThan(360);
      }
      expect(a.label.length, a.id).toBeGreaterThan(0);
      expect(a.note.length, a.id).toBeGreaterThan(10);
    }
  });
});

describe("snapTint", () => {
  it("never returns the achromatic attractor", () => {
    for (let h = 0; h < 360; h++) {
      expect(snapTint(h).hue, `hue ${h}`).not.toBeNull();
    }
  });

  it("picks the circular-nearest chromatic attractor for every hue", () => {
    const chromatic = TINT_ATTRACTORS.filter((a) => a.hue !== null);
    const dist = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
    for (let h = 0; h < 360; h++) {
      const best = Math.min(...chromatic.map((a) => dist(h, a.hue!)));
      expect(dist(h, snapTint(h).hue!), `hue ${h}`).toBeCloseTo(best, 6);
    }
  });

  it("pushes orange accents to the warm attractor, not to their own hue", () => {
    // 순수 웜 그레이는 갈색이 된다 — radix sand 107°, tw stone 58°가 밀어낸 이유.
    for (const h of [30, 40, 50]) {
      const t = snapTint(h);
      expect(t.id, `hue ${h}`).toBe("warm");
      expect(t.hue!, `hue ${h}`).toBeGreaterThan(h + 25);
    }
  });

  it("maps blue and purple accents to their own neighbourhood", () => {
    expect(snapTint(259).id).toBe("cool");
    expect(snapTint(290).id).toBe("purple");
    expect(snapTint(150).id).toBe("green");
  });

  it("handles hues outside 0..360 by normalizing", () => {
    expect(snapTint(-100).id).toBe(snapTint(260).id);
    expect(snapTint(620).id).toBe(snapTint(260).id);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm vitest run tests/lab/neutral.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/lab/palette/neutral.js"`

- [ ] **Step 3: `neutral.ts` 구현**

`src/lab/palette/neutral.ts`:

```ts
// src/lab/palette/neutral.ts
//
// 뉴트럴 스케일 파생. 액센트와 달리 자체 L 곡선을 쓰고, hue는 액센트에서
// 이산 어트랙터로 스냅한다 (neutral.h = accent.h는 웜에서 갈색으로 붕괴).
// 스펙: docs/superpowers/specs/2026-08-09-palette-generator-color-system-design.md
//
// 상수 출처: scripts/analysis/neutral-curve-stats.ts (tailwind v4.3.3, 2026-08-09).
// 레퍼런스 갱신 시 다시 돌려 비교할 것.

import { SCALE_SIZE } from "./builder.js";

/** stop 50..950의 평균 L. tailwind 뉴트럴 5종(slate·gray·zinc·neutral·stone)
 *  의 sd가 0.001~0.008 — 다섯 램프가 같은 사다리를 쓴다. 즉 취향 축이 아니다. */
export const NEUTRAL_CURVE: readonly { l: number }[] = [
  { l: 0.9848 }, { l: 0.9684 }, { l: 0.9244 }, { l: 0.8702 },
  { l: 0.7066 }, { l: 0.5532 }, { l: 0.4434 }, { l: 0.372 },
  { l: 0.2736 }, { l: 0.2098 }, { l: 0.1384 },
];

/** C_max로 정규화한 채도 모양 — 틴트가 옅은 램프(zinc·stone). */
export const C_SHAPE_SOFT: readonly number[] = [
  0.038, 0.068, 0.233, 0.369, 0.826, 0.971, 0.923, 0.767, 0.446, 0.407, 0.301,
];

/** 같은 모양 — 틴트가 진한 램프(slate·gray). 어두운 쪽에서 채도를 유지한다. */
export const C_SHAPE_STRONG: readonly number[] = [
  0.062, 0.12, 0.23, 0.386, 0.758, 0.897, 0.909, 0.978, 0.931, 0.957, 0.868,
];

/** 두 모양 테이블의 기준 C_max (해당 램프들의 평균). */
export const SOFT_REF_CMAX = 0.015;
export const STRONG_REF_CMAX = 0.04;

/** 채도 모양은 독립 축이 아니라 틴트 강도의 종속 변수다 —
 *  진한 램프일수록 어두운 쪽까지 채도를 끌고 간다(C_max와 상관).
 *  두 기준 테이블 사이를 강도로 보간하고, 범위 밖은 외삽 없이 클램프. */
export function cShape(index: number, strength: number): number {
  const t = Math.min(
    1,
    Math.max(0, (strength - SOFT_REF_CMAX) / (STRONG_REF_CMAX - SOFT_REF_CMAX)),
  );
  return C_SHAPE_SOFT[index] + (C_SHAPE_STRONG[index] - C_SHAPE_SOFT[index]) * t;
}

export interface TintAttractor {
  readonly id: "achromatic" | "cool" | "purple" | "green" | "warm";
  readonly label: string;
  /** null = 무채색 (hue 없음 — 스냅 대상이 아니다). */
  readonly hue: number | null;
  readonly note: string;
}

/** hue 값은 tailwind 5종 + radix 6종 실측의 종합.
 *  cool: tw slate 257.4 / gray 259.7 · purple: tw zinc 285.8, radix mauve 292.9 / slate 277.7
 *  green: radix sage 167.6 / olive 136.6 · warm: tw stone 58.1, radix sand 106.7 */
export const TINT_ATTRACTORS: readonly TintAttractor[] = [
  {
    id: "achromatic",
    label: "무채색",
    hue: null,
    note: "순수 회색. tailwind neutral·radix gray가 여기 — 브랜드 기운을 배경에 전혀 섞지 않는 선택.",
  },
  {
    id: "cool",
    label: "쿨 그레이",
    hue: 258,
    note: "파랑 쪽으로 살짝 기운 회색. tailwind slate(257°)·gray(260°)가 쓰는 자리 — 가장 흔한 틴트.",
  },
  {
    id: "purple",
    label: "퍼플 그레이",
    hue: 286,
    note: "보라 쪽 회색. tailwind zinc(286°)·radix mauve(293°) — 보라·남색 브랜드와 어울린다.",
  },
  {
    id: "green",
    label: "그린 그레이",
    hue: 150,
    note: "초록 쪽 회색. radix sage(168°)·olive(137°) — 초록·청록 브랜드의 배경.",
  },
  {
    id: "warm",
    label: "웜 그레이",
    hue: 85,
    note: "따뜻한 회색. 주황 브랜드라도 hue를 그대로 쓰면 갈색이 되므로 노랑·올리브 쪽으로 크게 민다 — tailwind stone(58°)·radix sand(107°)가 그렇게 한다.",
  },
];

const CHROMATIC = TINT_ATTRACTORS.filter(
  (a): a is TintAttractor & { hue: number } => a.hue !== null,
);

/** 원형 최단거리 (0..180) */
function hueDistance(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

/** 액센트 hue → 최근접 유채색 어트랙터.
 *  무채색은 hue가 없어 거리 계산 대상이 아니다 — 사용자가 후보에서 직접 고른다. */
export function snapTint(accentHue: number): TintAttractor {
  const h = ((accentHue % 360) + 360) % 360;
  let best = CHROMATIC[0];
  for (const a of CHROMATIC) {
    if (hueDistance(h, a.hue) < hueDistance(h, best.hue)) best = a;
  }
  return best;
}

// SCALE_SIZE 계약 확인 — 곡선 테이블이 스케일 길이와 어긋나면 즉시 터진다.
if (NEUTRAL_CURVE.length !== SCALE_SIZE) {
  throw new Error("neutral.ts: NEUTRAL_CURVE length must equal SCALE_SIZE");
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/lab/neutral.test.ts`
Expected: PASS (전체 케이스)

- [ ] **Step 5: 커밋**

```bash
git add src/lab/palette/neutral.ts tests/lab/neutral.test.ts
git commit -m "$(cat <<'EOF'
feat(lab): neutral curve + tint attractors

뉴트럴은 액센트 곡선을 공유하지 못한다 — 500에서 ΔL 0.131, 900에서 0.185.
단 tailwind 5종의 sd가 0.001~0.008이라 뉴트럴 L은 취향 축이 아닌 상수.

hue는 액센트를 따라가지 않고 어트랙터 4개(cool 258·purple 286·green 150·
warm 85) 중 최근접으로 스냅한다. 웜이 핵심 — 오렌지 액센트에 hue를 그대로
쓰면 갈색이 되므로 60°+ 밀어낸다 (tw stone 58°, radix sand 107°).

채도 모양은 독립 축이 아니라 강도의 종속 변수라 두 테이블 보간으로 표현.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `buildNeutral` + `neutralCandidates`

**Files:**
- Modify: `src/lab/palette/neutral.ts`
- Test: `tests/lab/neutral.test.ts` (append)

**Interfaces:**
- Consumes: Task 3의 `NEUTRAL_CURVE`·`cShape`·`snapTint`·`TINT_ATTRACTORS`; `clampToGamut`·`type Candidate` from `./builder.js`; `type Oklch` from `../../schema/types.js`
- Produces:
  - `interface NeutralTint { hue: number | null; strength: number }`
  - `buildNeutral(tint: NeutralTint): Oklch[]` — 길이 11
  - `TINT_STRENGTHS = { soft: 0.017, strong: 0.04 }`
  - `neutralCandidates(accentHue: number): Candidate[]` — 정확히 3개. `Candidate`는 `builder.ts`의 기존 타입(`{ color: Oklch; label: string; note: string }`)

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/lab/neutral.test.ts` 끝에 append:

```ts
import { buildNeutral, neutralCandidates, TINT_STRENGTHS } from "../../src/lab/palette/neutral.js";

describe("buildNeutral", () => {
  it("returns 11 stops with strictly decreasing lightness", () => {
    const scale = buildNeutral({ hue: 258, strength: TINT_STRENGTHS.soft });
    expect(scale).toHaveLength(SCALE_SIZE);
    for (let i = 1; i < scale.length; i++) {
      expect(scale[i].l, `stop ${i}`).toBeLessThan(scale[i - 1].l);
    }
  });

  it("keeps chroma far below accent territory", () => {
    const scale = buildNeutral({ hue: 258, strength: TINT_STRENGTHS.strong });
    // 액센트 C_max 코퍼스 중앙값은 0.213 — 뉴트럴은 그 1/5 아래에 머문다.
    for (const s of scale) expect(s.c).toBeLessThan(0.05);
  });

  it("emits pure grey when the tint is achromatic", () => {
    const scale = buildNeutral({ hue: null, strength: 0 });
    for (const s of scale) expect(s.c).toBe(0);
  });

  it("carries the requested hue on every chromatic stop", () => {
    const scale = buildNeutral({ hue: 85, strength: TINT_STRENGTHS.soft });
    for (const s of scale) {
      if (s.c > 0) expect(s.h).toBeCloseTo(85, 6);
    }
  });

  it("strong tint holds more chroma at the dark end than soft", () => {
    const soft = buildNeutral({ hue: 258, strength: TINT_STRENGTHS.soft });
    const strong = buildNeutral({ hue: 258, strength: TINT_STRENGTHS.strong });
    expect(strong[9].c).toBeGreaterThan(soft[9].c);
  });

  it("throws on a negative strength (programmer error guard)", () => {
    expect(() => buildNeutral({ hue: 258, strength: -0.01 })).toThrow();
  });
});

describe("neutralCandidates", () => {
  it("offers exactly 3 candidates: achromatic, snapped soft, snapped strong", () => {
    const list = neutralCandidates(259);
    expect(list).toHaveLength(3);
    expect(list[0].color.c).toBe(0);
    expect(list[1].color.h).toBeCloseTo(258, 6);
    expect(list[2].color.h).toBeCloseTo(258, 6);
    expect(list[2].color.c).toBeGreaterThan(list[1].color.c);
  });

  it("labels and notes are educational", () => {
    for (const c of neutralCandidates(40)) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.note.length).toBeGreaterThan(10);
    }
  });

  it("names the snapped attractor in the note so the user sees the reasoning", () => {
    const warm = neutralCandidates(40);
    expect(warm[1].note).toContain("웜");
    const cool = neutralCandidates(259);
    expect(cool[1].note).toContain("쿨");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run tests/lab/neutral.test.ts`
Expected: FAIL — `buildNeutral`/`neutralCandidates`/`TINT_STRENGTHS` is not exported

- [ ] **Step 3: 구현 추가**

`src/lab/palette/neutral.ts`의 import 줄을 다음으로 교체:

```ts
import { SCALE_SIZE, clampToGamut, type Candidate } from "./builder.js";
import type { Oklch } from "../../schema/types.js";
```

파일 끝(SCALE_SIZE 가드 위)에 추가:

```ts
export interface NeutralTint {
  /** null = 무채색. */
  readonly hue: number | null;
  /** 스케일 최대 채도 (실측 범위 0.010–0.046). */
  readonly strength: number;
}

/** 후보로 쓰는 두 강도. 실측 범위 안에서 "은은/뚜렷"을 대표한다. */
export const TINT_STRENGTHS = { soft: 0.017, strong: 0.04 } as const;

/** 확정된 틴트 → 11-stop 뉴트럴. L은 상수 곡선, C는 강도×모양, hue는 고정. */
export function buildNeutral(tint: NeutralTint): Oklch[] {
  if (!(tint.strength >= 0)) {
    throw new Error(`buildNeutral: strength must be >= 0, got ${tint.strength}`);
  }
  if (tint.hue === null || tint.strength === 0) {
    return NEUTRAL_CURVE.map((s) => ({ l: s.l, c: 0, h: 0 }));
  }
  const h = ((tint.hue % 360) + 360) % 360;
  return NEUTRAL_CURVE.map((s, i) =>
    clampToGamut({ l: s.l, c: tint.strength * cShape(i, tint.strength), h }),
  );
}

/** 대표색(스케일의 500 자리)으로 칩을 그린다 — 액센트 후보와 같은 형태. */
function representative(tint: NeutralTint): Oklch {
  return buildNeutral(tint)[5];
}

/** 후보 3개: 무채색 / 자동 틴트(스냅, 은은) / 뚜렷한 틴트(같은 hue, 진하게).
 *  스냅된 어트랙터 이름을 note에 노출해 "왜 이 hue인가"가 화면에서 읽히게 한다. */
export function neutralCandidates(accentHue: number): Candidate[] {
  const snapped = snapTint(accentHue);
  return [
    {
      color: representative({ hue: null, strength: 0 }),
      label: "무채색",
      note: "브랜드 기운을 배경에 섞지 않는 선택 — tailwind neutral·radix gray의 자리. 콘텐츠가 주인공일 때.",
    },
    {
      color: representative({ hue: snapped.hue, strength: TINT_STRENGTHS.soft }),
      label: `${snapped.label} (은은)`,
      note: `당신의 액센트에서 가장 가까운 "${snapped.label}" 자리로 붙였습니다 — ${snapped.note}`,
    },
    {
      color: representative({ hue: snapped.hue, strength: TINT_STRENGTHS.strong }),
      label: `${snapped.label} (뚜렷)`,
      note: "같은 hue를 더 진하게. 어두운 쪽까지 색끼가 남아 배경 전체에 인격이 생긴다 — 그래도 액센트 채도의 1/5 수준.",
    },
  ];
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/lab/neutral.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lab/palette/neutral.ts tests/lab/neutral.test.ts
git commit -m "$(cat <<'EOF'
feat(lab): buildNeutral + neutral tint candidates

확정된 틴트에서 11-stop을 만들고, 액센트 hue에서 후보 3개(무채색 / 스냅된
어트랙터 은은 / 뚜렷)를 제시한다. 반환 타입은 builder.ts의 Candidate를
그대로 써서 UI가 액센트 후보와 같은 컴포넌트로 렌더한다.

스냅된 어트랙터 이름을 note에 노출 — "왜 이 hue인가"가 화면에서 읽혀야 한다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 시맨틱 파생

**Files:**
- Create: `src/lab/palette/semantic.ts`
- Test: `tests/lab/semantic.test.ts`

**Interfaces:**
- Consumes: `OURS_CURVE` from `./ours.js`; `SCALE_SIZE`·`clampToGamut` from `./builder.js`; `type Oklch` from `../../schema/types.js`
- Produces:
  - `type SemanticId = "error" | "success" | "warning" | "info"`
  - `interface SemanticAnchor { id; label; anchor: Oklch; hueRamp: readonly number[]; note: string }`
  - `SEMANTIC_ANCHORS: readonly SemanticAnchor[]` — 정확히 4개
  - `buildSemantic(anchor: SemanticAnchor): Oklch[]` — 길이 11

- [ ] **Step 0: `fillScale`에 선택적 hue 램프 인자 추가**

hue 램프를 **gamut 클램프 이전에** 적용해야 한다. 앵커 hue에서 클램프한 뒤 hue를
돌리면 최종 hue에서 표현 가능한 채도를 미리 잘라버린다 — amber 실측으로 stop 200에서
0.0799 → 0.0550 (**31% 손실**, 순서를 고치면 +45% 회복), stop 700에서 0.1639 → 0.1231.

`src/lab/palette/builder.ts`의 `fillScale` 시그니처와 두 클램프 지점을 고친다:

```ts
export function fillScale(
  pins: readonly Pin[],
  /** stop별 Δh (11개). 클램프 직전에 적용된다 — 시맨틱 스케일용. */
  hueRamp?: readonly number[],
): Oklch[] {
```

본문에서 `hueRamp`를 적용하는 헬퍼를 두고, 기존 `clampToGamut(...)` 호출 두 곳
(가상 끝점 `out[p.index] = p.virtual ? clampToGamut(p.color) : ...` 와 보간 루프의
`out[k] = clampToGamut({...})`)을 이 헬퍼로 감싼다:

```ts
  const ramped = (c: Oklch, i: number): Oklch =>
    hueRamp ? { ...c, h: (((c.h + hueRamp[i]) % 360) + 360) % 360 } : c;
  // 가상 끝점:  out[p.index] = p.virtual ? clampToGamut(ramped(p.color, p.index)) : { ...p.color };
  // 보간 루프:  out[k] = clampToGamut(ramped({ l: …, c: …, h: … }, k));
```

**핀 자리는 verbatim을 유지한다** — R1(앵커 보존). 시맨틱 앵커의 `hueRamp[5]`는 0이라
어차피 동일하다.

- [ ] **Step 0b: 기존 동작이 안 바뀌는지 확인**

Run: `pnpm vitest run tests/lab/builder.test.ts tests/lab/algorithms.test.ts`
Expected: PASS — `hueRamp`를 넘기지 않으면 이전과 완전히 같아야 한다 (ours v0 동치 테스트가 이걸 지킨다).

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/lab/semantic.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  SEMANTIC_ANCHORS,
  buildSemantic,
  type SemanticId,
} from "../../src/lab/palette/semantic.js";
import { SCALE_SIZE } from "../../src/lab/palette/builder.js";

/** status-hue-principles.md의 코퍼스 관측 밴드 — tailwind 앵커가 여기 들어야 한다. */
const CORPUS_BANDS: Record<SemanticId, [number, number]> = {
  error: [11, 34],
  warning: [67, 90],
  success: [145, 163],
  info: [254, 262],
};

describe("SEMANTIC_ANCHORS", () => {
  it("has exactly 4 roles with unique ids", () => {
    expect(SEMANTIC_ANCHORS).toHaveLength(4);
    expect(new Set(SEMANTIC_ANCHORS.map((a) => a.id)).size).toBe(4);
  });

  it("every anchor hue falls inside the corpus-observed band", () => {
    for (const a of SEMANTIC_ANCHORS) {
      const [lo, hi] = CORPUS_BANDS[a.id];
      expect(a.anchor.h, a.id).toBeGreaterThanOrEqual(lo);
      expect(a.anchor.h, a.id).toBeLessThanOrEqual(hi);
    }
  });

  it("hue ramps have 11 entries and are zero at the anchor", () => {
    for (const a of SEMANTIC_ANCHORS) {
      expect(a.hueRamp, a.id).toHaveLength(SCALE_SIZE);
      expect(a.hueRamp[5], a.id).toBe(0);
    }
  });

  it("only the warm role drifts hue substantially", () => {
    // amber는 밝은 쪽 +25°, 어두운 쪽 -24°. 나머지는 10° 안쪽.
    for (const a of SEMANTIC_ANCHORS) {
      const maxDrift = Math.max(...a.hueRamp.map(Math.abs));
      if (a.id === "warning") expect(maxDrift).toBeGreaterThan(20);
      else expect(maxDrift, a.id).toBeLessThan(10);
    }
  });

  it("labels and notes are educational", () => {
    for (const a of SEMANTIC_ANCHORS) {
      expect(a.label.length, a.id).toBeGreaterThan(0);
      expect(a.note.length, a.id).toBeGreaterThan(10);
    }
  });
});

describe("buildSemantic", () => {
  it("returns 11 stops with strictly decreasing lightness for every role", () => {
    for (const a of SEMANTIC_ANCHORS) {
      const scale = buildSemantic(a);
      expect(scale, a.id).toHaveLength(SCALE_SIZE);
      for (let i = 1; i < scale.length; i++) {
        expect(scale[i].l, `${a.id} stop ${i}`).toBeLessThan(scale[i - 1].l);
      }
    }
  });

  it("preserves the anchor verbatim at index 5", () => {
    for (const a of SEMANTIC_ANCHORS) {
      const scale = buildSemantic(a);
      expect(scale[5].l, a.id).toBeCloseTo(a.anchor.l, 6);
      expect(scale[5].c, a.id).toBeCloseTo(a.anchor.c, 6);
      expect(scale[5].h, a.id).toBeCloseTo(a.anchor.h, 6);
    }
  });

  it("applies the measured hue ramp — warning swings both ways", () => {
    const warning = SEMANTIC_ANCHORS.find((a) => a.id === "warning")!;
    const scale = buildSemantic(warning);
    expect(scale[0].h).toBeGreaterThan(warning.anchor.h + 20);  // 밝은 쪽 노랑으로
    expect(scale[10].h).toBeLessThan(warning.anchor.h - 20);    // 어두운 쪽 주황으로
  });

  it("applies the hue ramp before clamping, not after", () => {
    // 순서가 뒤집히면 앵커 hue에서 잘린 채도를 들고 hue만 도는 꼴이 된다.
    // amber stop 200은 올바른 순서에서 0.079 근처, 뒤집히면 0.055 근처.
    const warning = SEMANTIC_ANCHORS.find((a) => a.id === "warning")!;
    expect(buildSemantic(warning)[2].c).toBeGreaterThan(0.07);
  });

  it("keeps every stop inside sRGB", () => {
    for (const a of SEMANTIC_ANCHORS) {
      for (const s of buildSemantic(a)) {
        expect(s.c, a.id).toBeGreaterThanOrEqual(0);
        expect(s.l, a.id).toBeGreaterThan(0);
        expect(s.l, a.id).toBeLessThanOrEqual(1);
      }
    }
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run tests/lab/semantic.test.ts`
Expected: FAIL — 모듈 해석 실패

- [ ] **Step 3: `semantic.ts` 구현**

`src/lab/palette/semantic.ts`:

```ts
// src/lab/palette/semantic.ts
//
// 시맨틱(상태색) 스케일 파생. 액센트와 달리 사용자 입력이 없다 —
// 빨강=위험/초록=성공은 문화적으로 고정된 자리이고, 코퍼스가 관측한 밴드 폭도
// 좁다(blue 8°). 곡선은 OURS_CURVE를 그대로 재사용한다: tailwind red/green/blue가
// 그 곡선에서 벗어나는 정도가 mean|ΔL| 0.018~0.029뿐이다.
// 스펙: docs/superpowers/specs/2026-08-09-palette-generator-color-system-design.md
//
// 앵커·hueRamp 출처: tailwind v4.3.3의 red/green/amber/blue 실측 (2026-08-09).
// 규칙을 발명하지 않고 레퍼런스 실측을 그대로 싣는다.

import { SCALE_SIZE, fillScale } from "./builder.js";
import type { Oklch } from "../../schema/types.js";

export type SemanticId = "error" | "success" | "warning" | "info";

export interface SemanticAnchor {
  readonly id: SemanticId;
  readonly label: string;
  /** tailwind 500 실측 — 코퍼스 관측 밴드 안에 든다. */
  readonly anchor: Oklch;
  /** stop별 Δh (앵커 기준, 11개). 규칙이 아니라 레퍼런스 실측. */
  readonly hueRamp: readonly number[];
  readonly note: string;
}

export const SEMANTIC_ANCHORS: readonly SemanticAnchor[] = [
  {
    id: "error",
    label: "오류 (빨강)",
    anchor: { l: 0.637, c: 0.237, h: 25.3 },
    hueRamp: [-8.0, -7.6, -7.0, -5.8, -3.1, 0, 2.0, 2.2, 1.6, 0.4, 0.7],
    note: "검증 실패·파괴적 동작. 코퍼스 58종의 빨강이 11~34°에 모여 있다 — 브랜드가 무엇이든 이 자리를 지킨다.",
  },
  {
    id: "warning",
    label: "경고 (앰버)",
    anchor: { l: 0.769, c: 0.188, h: 70.1 },
    hueRamp: [25.2, 25.5, 25.7, 21.5, 14.3, 0, -11.8, -21.1, -23.9, -24.2, -24.4],
    note: "주의 환기. 웜톤이라 밝은 쪽은 노랑(+25°), 어두운 쪽은 주황(−24°)으로 튼다 — 안 틀면 어두운 노랑이 올리브(탁색)가 된다.",
  },
  {
    id: "success",
    label: "성공 (초록)",
    anchor: { l: 0.723, c: 0.219, h: 149.6 },
    hueRamp: [6.2, 7.2, 6.4, 4.9, 2.1, 0, -0.4, 0.5, 1.7, 3.0, 3.4],
    note: "확인·완료. 순수 초록(120°)보다 청록 쪽인 150° 근처가 코퍼스의 합의점이다.",
  },
  {
    id: "info",
    label: "정보 (파랑)",
    anchor: { l: 0.623, c: 0.214, h: 259.8 },
    hueRamp: [-5.2, -4.2, -5.7, -8.0, -5.2, 0, 3.1, 4.6, 5.8, 5.7, 8.1],
    note: "안내. 코퍼스에서 밴드 폭이 8°로 가장 좁다 — \"파랑\"에 대한 합의가 가장 강하다. 파랑 브랜드와 겹치는 건 감수한다.",
  },
];

const ANCHOR_INDEX = 5;

/** 앵커 + 실측 hue 램프 → 11-stop.
 *  L·C 워프는 fillScale이 이미 하는 일이다 (앵커 하나짜리 고정점 = 우리 곡선 v0와
 *  동치, 양 끝은 곡선 자체 값에 고정되고 구간별 아핀 리매핑이 단조를 보장한다).
 *  hue 램프는 fillScale에 넘겨 **클램프 이전에** 적용시킨다 — 순서가 계약이다
 *  (Step 0 참조). 워프를 다시 구현하지 않는다. */
export function buildSemantic(anchor: SemanticAnchor): Oklch[] {
  return fillScale([{ index: ANCHOR_INDEX, color: anchor.anchor }], anchor.hueRamp);
}

// 램프 길이 계약 — 스케일 길이와 어긋나면 즉시 터진다.
for (const a of SEMANTIC_ANCHORS) {
  if (a.hueRamp.length !== SCALE_SIZE) {
    throw new Error(`semantic.ts: ${a.id} hueRamp must have ${SCALE_SIZE} entries`);
  }
}
```

> `fillScale` 재사용이 핵심이다. 워프를 직접 구현하면 밝은 쪽 끝점을 L=1로 잡아
> red-50이 순백이 되는 실수를 하기 쉽다 — 액센트 워프는 양 끝을 곡선 자체 값
> (0.9772 / 0.2777)에 고정하지 1/0에 고정하지 않는다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/lab/semantic.test.ts`
Expected: PASS

"preserves the anchor verbatim"이 hue에서만 실패하면 `hueRamp[5]`가 0이 아닌 것이다 — 실측표를 다시 확인할 것.

- [ ] **Step 5: 커밋**

```bash
git add src/lab/palette/semantic.ts tests/lab/semantic.test.ts
git commit -m "$(cat <<'EOF'
feat(lab): semantic scales from the accent curve

시맨틱은 새 곡선이 필요 없다 — tailwind red/green/blue가 OURS_CURVE에서
벗어나는 정도가 mean|ΔL| 0.018~0.029뿐. 앵커 4개와 stop별 hue 램프를
레퍼런스 실측 그대로 싣고, 규칙을 발명하지 않는다.

amber만 드리프트가 큰데(+25°/−24°) 이는 액센트 트랙이 이미 정량화한
"웜톤은 어두운 stop에서 주황으로 튼다"와 같은 현상이다.

앵커 4종이 코퍼스 관측 밴드 안에 드는 것을 테스트로 고정한다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 역할 레이어 일반화 (`SCALE_ROLES` + 3종 `cssSnippet`)

**Files:**
- Modify: `src/lab/palette/roles.ts`
- Modify: `tests/lab/roles.test.ts`
- Modify: `web/src/builder/BuilderPage.tsx` (import 이름만 — `ACCENT_ROLES` → `SCALE_ROLES`, `AccentRole` → `ScaleRole`)

**Interfaces:**
- Consumes: `SemanticId` from `./semantic.js`
- Produces:
  - `type ScaleRole` (기존 `AccentRole`에서 개명, 필드 무변경)
  - `SCALE_ROLES: readonly ScaleRole[]` (기존 `ACCENT_ROLES`에서 개명, 값 무변경)
  - `type ScaleName = "accent" | "neutral" | SemanticId`
  - `interface ScaleSet { accent; neutral; semantic: Record<SemanticId, readonly string[]> }`
  - `cssSnippet(scales: ScaleSet): string`

- [ ] **Step 1: 실패하는 테스트로 교체**

`tests/lab/roles.test.ts`에서 `ACCENT_ROLES` → `SCALE_ROLES`, `AccentRole` → `ScaleRole`로 치환하고, `cssSnippet` describe 블록 전체를 다음으로 교체:

```ts
import { SCALE_ROLES, cssSnippet, type ScaleSet } from "../../src/lab/palette/roles.js";
import { buildNeutral, TINT_STRENGTHS } from "../../src/lab/palette/neutral.js";
import { SEMANTIC_ANCHORS, buildSemantic } from "../../src/lab/palette/semantic.js";
import { fillScale, STOP_KEYS, type Pin } from "../../src/lab/palette/builder.js";
import { oklchToHex, parsePrimary } from "../../src/generator/color.js";

function sampleScales(): ScaleSet {
  const pins: Pin[] = [{ index: 5, color: parsePrimary("#3b82f6") }];
  const semantic = Object.fromEntries(
    SEMANTIC_ANCHORS.map((a) => [a.id, buildSemantic(a).map(oklchToHex)]),
  ) as ScaleSet["semantic"];
  return {
    accent: fillScale(pins).map(oklchToHex),
    neutral: buildNeutral({ hue: 258, strength: TINT_STRENGTHS.soft }).map(oklchToHex),
    semantic,
  };
}

describe("cssSnippet", () => {
  const SCALE_NAMES = ["accent", "neutral", "error", "success", "warning", "info"];

  it("emits 11 primitives for each of the 6 scales", () => {
    const css = cssSnippet(sampleScales());
    for (const name of SCALE_NAMES) {
      for (const key of STOP_KEYS) {
        expect(css, `${name}-${key}`).toContain(`--${name}-${key}:`);
      }
    }
  });

  it("emits every role for every scale in :root", () => {
    const css = cssSnippet(sampleScales());
    const root = css.slice(css.indexOf(":root"), css.indexOf(".dark"));
    for (const name of SCALE_NAMES) {
      for (const role of SCALE_ROLES) {
        expect(root, `${name}-${role.id}`).toContain(`--${name}-${role.id}:`);
      }
    }
  });

  it("re-declares only the roles that actually move, for every scale", () => {
    const css = cssSnippet(sampleScales());
    const dark = css.slice(css.indexOf(".dark"));
    const moving = SCALE_ROLES.filter((r) => r.darkIndex !== r.lightIndex);
    expect(moving).toHaveLength(5);
    expect(dark.match(/--[a-z-]+-[a-z-]+:/g) ?? []).toHaveLength(moving.length * 6);
    for (const name of SCALE_NAMES) {
      expect(dark, `${name}-solid`).not.toContain(`--${name}-solid:`);
    }
  });

  it("has no dangling var() references", () => {
    const css = cssSnippet(sampleScales());
    const declared = new Set(
      [...css.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]),
    );
    for (const m of css.matchAll(/var\((--[\w-]+)\)/g)) {
      expect(declared, m[1]).toContain(m[1]);
    }
  });

  it("throws when any scale is not 11 long", () => {
    const bad = sampleScales();
    expect(() => cssSnippet({ ...bad, neutral: bad.neutral.slice(0, 10) })).toThrow();
    expect(() =>
      cssSnippet({ ...bad, semantic: { ...bad.semantic, error: [] } }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run tests/lab/roles.test.ts`
Expected: FAIL — `SCALE_ROLES` is not exported

- [ ] **Step 3: `roles.ts` 일반화**

`src/lab/palette/roles.ts`에서:

1. `AccentRole` → `ScaleRole`, `ACCENT_ROLES` → `SCALE_ROLES`로 개명 (인터페이스 필드와 6개 값은 **그대로**).
2. 헤더 주석의 "다크 액센트 역할 재배치"를 "역할 레이어 — 세 종류 스케일 공통"으로 갱신하고 새 스펙 경로를 추가.
3. `cssSnippet`을 다음으로 교체:

```ts
import type { SemanticId } from "./semantic.js";

export type ScaleName = "accent" | "neutral" | SemanticId;

export interface ScaleSet {
  readonly accent: readonly string[];
  readonly neutral: readonly string[];
  readonly semantic: Readonly<Record<SemanticId, readonly string[]>>;
}

/** 스케일 3종 → 2-레이어 CSS 커스텀 프로퍼티 스니펫.
 *  .dark에는 매핑이 실제로 바뀌는 역할만 — 재선언하지 않은 것 = 안 바뀐 것.
 *  세 종류가 같은 역할표·같은 미러 규칙을 쓴다: 다크 규칙이 시스템에 하나뿐이다. */
export function cssSnippet(scales: ScaleSet): string {
  const named: [ScaleName, readonly string[]][] = [
    ["accent", scales.accent],
    ["neutral", scales.neutral],
    ...(Object.entries(scales.semantic) as [SemanticId, readonly string[]][]),
  ];
  for (const [name, hexes] of named) {
    if (hexes.length !== SCALE_SIZE) {
      throw new Error(
        `cssSnippet: ${name} expected ${SCALE_SIZE} hexes, got ${hexes.length}`,
      );
    }
  }

  const lines: string[] = [":root {"];
  for (const [name, hexes] of named) {
    STOP_KEYS.forEach((key, i) => lines.push(`  --${name}-${key}: ${hexes[i]};`));
  }
  lines.push("");
  for (const [name] of named) {
    for (const role of SCALE_ROLES) {
      lines.push(`  --${name}-${role.id}: var(--${name}-${STOP_KEYS[role.lightIndex]});`);
    }
  }
  lines.push("}", "", ".dark {");
  for (const [name] of named) {
    for (const role of SCALE_ROLES) {
      if (role.darkIndex !== role.lightIndex) {
        lines.push(`  --${name}-${role.id}: var(--${name}-${STOP_KEYS[role.darkIndex]});`);
      }
    }
  }
  lines.push("}");
  return lines.join("\n") + "\n";
}
```

- [ ] **Step 4: web의 import 이름 갱신**

`web/src/builder/BuilderPage.tsx`에서 `ACCENT_ROLES` → `SCALE_ROLES`, `AccentRole` → `ScaleRole`로 치환하고 import를 추가한다:

```tsx
import { SCALE_ROLES, cssSnippet, type ScaleRole, type ScaleSet } from "@core/lab/palette/roles.js";
import { SEMANTIC_ANCHORS, buildSemantic } from "@core/lab/palette/semantic.js";
```

(`buildSemantic`은 Task 8이 쓴다 — 여기서 함께 import해 두면 Task 8이 import 줄을 다시 건드리지 않는다.)

`cssSnippet` 호출부는 Task 8에서 고치므로, 지금은 `DarkSection`의 `copyCss`를 임시로 다음과 같이 둔다 (Task 8이 정식 교체):

```ts
  const copyCss = () => navigator.clipboard.writeText(cssSnippet({
    accent: hexes,
    neutral: hexes,
    semantic: Object.fromEntries(
      SEMANTIC_ANCHORS.map((a) => [a.id, hexes]),
    ) as ScaleSet["semantic"],
  }));
```

> 이 임시 코드는 Task 8에서 실제 스케일로 교체된다. Task 6만 단독으로 리뷰될 때 web이 컴파일되게 하려는 최소 조치다.

- [ ] **Step 5: 테스트 + 타입체크**

Run: `pnpm test && (cd web && npx tsc -b --noEmit)`
Expected: 둘 다 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/lab/palette/roles.ts tests/lab/roles.test.ts web/src/builder/BuilderPage.tsx
git commit -m "$(cat <<'EOF'
feat(lab): generalize role layer to all three scale kinds

ACCENT_ROLES → SCALE_ROLES (값 무변경). cssSnippet이 액센트 11-stop 하나가
아니라 스케일 6종(액센트·뉴트럴·시맨틱 4)을 받는다.

프리미티브 66 + :root 시맨틱 36 + .dark 30. 세 종류가 같은 역할표와 같은
미러 규칙(i → 10−i, solid 예외)을 쓴다 — 다크 규칙이 시스템에 하나만 남는다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 빌더 스텝 모델 확장 + 뉴트럴 단계

기존 `BUILDER_STEPS = [5, 0, 10, 3, 7]`은 **stop 인덱스 배열**이라 뉴트럴 단계를 표현할 수 없다. 스텝을 판별 유니온으로 바꾼다.

**Files:**
- Modify: `src/lab/palette/builder.ts`
- Modify: `tests/lab/builder.test.ts`
- Modify: `web/src/builder/BuilderPage.tsx`

**Interfaces:**
- Produces:
  - `type BuilderStep = { kind: "accent-anchor" } | { kind: "accent-stop"; stopIndex: number } | { kind: "neutral-tint" }`
  - `BUILDER_FLOW: readonly BuilderStep[]` — 6단계
  - `STEP_META`에 `"neutral"` 키 추가
  - `BUILDER_STEPS`는 **유지** (기존 테스트·`toStrip` 호환)

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/lab/builder.test.ts` 끝에 append:

```ts
import { BUILDER_FLOW, STEP_META } from "../../src/lab/palette/builder.js";

describe("BUILDER_FLOW", () => {
  it("has 6 steps: anchor, 4 accent stops, then the neutral tint", () => {
    expect(BUILDER_FLOW).toHaveLength(6);
    expect(BUILDER_FLOW[0]).toEqual({ kind: "accent-anchor" });
    expect(BUILDER_FLOW.slice(1, 5).map((s) => s.kind)).toEqual(
      ["accent-stop", "accent-stop", "accent-stop", "accent-stop"],
    );
    expect(BUILDER_FLOW[5]).toEqual({ kind: "neutral-tint" });
  });

  it("keeps the RUI accent order 500 → 50 → 950 → 300 → 700", () => {
    const stops = BUILDER_FLOW.flatMap((s) =>
      s.kind === "accent-stop" ? [s.stopIndex] : s.kind === "accent-anchor" ? [5] : [],
    );
    expect(stops).toEqual([5, 0, 10, 3, 7]);
  });

  it("has copy for every step including the neutral one", () => {
    for (const s of BUILDER_FLOW) {
      const key = s.kind === "neutral-tint" ? "neutral" : s.kind === "accent-anchor" ? 5 : s.stopIndex;
      const meta = STEP_META[key];
      expect(meta, String(key)).toBeDefined();
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(10);
    }
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run tests/lab/builder.test.ts`
Expected: FAIL — `BUILDER_FLOW` is not exported

- [ ] **Step 3: `builder.ts`에 스텝 모델 추가**

`src/lab/palette/builder.ts`의 `BUILDER_STEPS` 선언 **다음에** 추가:

```ts
/** 빌더 단계. stop 인덱스 배열로는 뉴트럴 단계를 표현할 수 없어 판별 유니온을 쓴다. */
export type BuilderStep =
  | { readonly kind: "accent-anchor" }
  | { readonly kind: "accent-stop"; readonly stopIndex: number }
  | { readonly kind: "neutral-tint" };

/** RUI 순서(500 → 50 → 950 → 300 → 700) 뒤에 뉴트럴 틴트 한 단계. */
export const BUILDER_FLOW: readonly BuilderStep[] = [
  { kind: "accent-anchor" },
  { kind: "accent-stop", stopIndex: 0 },
  { kind: "accent-stop", stopIndex: 10 },
  { kind: "accent-stop", stopIndex: 3 },
  { kind: "accent-stop", stopIndex: 7 },
  { kind: "neutral-tint" },
];
```

그리고 `STEP_META`의 타입을 `Record<number, ...>`에서 `Record<number | "neutral", ...>`로 넓히고 항목을 추가:

```ts
  neutral: {
    title: "배경 회색 (뉴트럴)",
    description:
      "화면 면적의 대부분을 차지하는 회색. 액센트 hue를 그대로 쓰지 않고 그레이가 자연스러운 몇 자리 중 가장 가까운 곳으로 붙인다 — 주황을 그대로 쓰면 갈색이 되기 때문이다.",
  },
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/lab/builder.test.ts`
Expected: PASS

- [ ] **Step 5: `BuilderPage`를 새 스텝 모델로 전환**

`web/src/builder/BuilderPage.tsx`:

1. import 추가:

```tsx
import { BUILDER_FLOW, type BuilderStep } from "@core/lab/palette/builder.js";
import {
  neutralCandidates,
  buildNeutral,
  snapTint,
  TINT_STRENGTHS,
  type NeutralTint,
} from "@core/lab/palette/neutral.js";
```
2. **`Choice`가 stop 인덱스를 키로 쓰는 걸 먼저 고친다.** 현재 `Choice`는
`{ stopIndex, label }`이고 `BuilderPage.tsx:256`·`:360`이 `STEP_META[c.stopIndex].title`을
읽는다. 뉴트럴 선택은 stop이 없어 `-1`이 들어가고 `STEP_META[-1]`은 `undefined` →
런타임 크래시다. 키를 스텝 메타 키로 바꾼다:

```tsx
interface Choice {
  metaKey: number | "neutral"; // STEP_META 조회용
  label: string;
}
```

그리고 세 곳을 갱신:
- `:252` `key={c.stopIndex}` → `key={i}`
- `:256` `STEP_META[c.stopIndex].title` → `STEP_META[c.metaKey].title`
- `:360` `STEP_META[c.stopIndex].title` → `STEP_META[c.metaKey].title`

3. 상태에 뉴트럴 틴트 추가하고 파생값을 스텝 종류로 분기:

```tsx
  const [neutralTint, setNeutralTint] = useState<NeutralTint | null>(null);

  const done = stepIdx >= BUILDER_FLOW.length;
  const step: BuilderStep | null = done ? null : BUILDER_FLOW[stepIdx];
  const isAccentStep = step?.kind === "accent-anchor";
  const isNeutralStep = step?.kind === "neutral-tint";
  const stopIndex = step?.kind === "accent-stop" ? step.stopIndex : -1;

  const accentHue = useMemo(
    () => (pins.find((p) => p.index === 5)?.color.h ?? parsePrimary(accentHex).h),
    [pins, accentHex],
  );

  const candidates = useMemo(() => {
    if (!step) return [];
    if (step.kind === "accent-anchor") return [];
    if (step.kind === "neutral-tint") return neutralCandidates(accentHue);
    return candidatesFor(step.stopIndex, pins);
  }, [step, pins, accentHue]);
```

4. **후보 미리보기 스트립을 스텝 종류로 분기한다.** `BuilderPage.tsx:317`은 후보마다
`toStrip([...pins, { index: stopIndex, color: cd.color }])`를 그리는데, 뉴트럴 단계의
`stopIndex`는 `-1`이라 `fillScale`이 `OURS_CURVE[-1].cMult`를 읽고 터진다. 또한 뉴트럴
후보를 액센트 스케일로 미리보는 것 자체가 틀렸다 — 뉴트럴 스케일을 보여줘야 한다:

```tsx
  const previewStrip = (cd: Candidate) =>
    isNeutralStep
      ? tintOf(cd).hue === null || tintOf(cd).strength === 0
        ? toNeutralStrip(buildNeutral({ hue: null, strength: 0 }))
        : toNeutralStrip(buildNeutral(tintOf(cd)))
      : toStrip([...pins, { index: stopIndex, color: cd.color }]);
```

`toNeutralStrip`은 pin 강조가 없는 단순 변환이다 (뉴트럴엔 앵커가 없다):

```tsx
const toNeutralStrip = (scale: readonly Oklch[]) =>
  scale.map((c, i) => ({ key: STOP_KEYS[i], hex: oklchToHex(c), anchor: false }));
```

`tintOf`는 후보 → 틴트 복원 (후보 0=무채색, 1=은은, 2=뚜렷):

```tsx
  const tintOf = (cd: Candidate): NeutralTint => {
    const idx = candidates.indexOf(cd);
    if (idx === 0) return { hue: null, strength: 0 };
    const snapped = snapTint(accentHue);
    return { hue: snapped.hue, strength: idx === 1 ? TINT_STRENGTHS.soft : TINT_STRENGTHS.strong };
  };
```

5. **하단 상시 미리보기(`previewPins`, `:187-192` → `:373-378`에서 렌더)도 분기한다.**
뉴트럴 단계에서는 pin 기반 미리보기가 무의미하므로 확정된 액센트 스케일을 그대로 두고,
임시 선택한 뉴트럴 스트립을 그 아래 한 줄로 덧붙인다:

```tsx
  const previewPins = useMemo<Pin[]>(() => {
    if (isAccentStep && !done) return [{ index: 5, color: parsePrimary(accentHex) }];
    if (isNeutralStep) return pins;            // 액센트는 이미 확정 — 그대로 보여준다
    return picked ? [...pins, { index: stopIndex, color: picked.color }] : pins;
  }, [isAccentStep, isNeutralStep, done, accentHex, picked, pins, stopIndex]);

  const neutralPreview = isNeutralStep && picked ? toNeutralStrip(buildNeutral(tintOf(picked))) : null;
```

`:373-378`의 미리보기 아래에 `{neutralPreview && <ColorScaleStrip stops={neutralPreview} />}`를 둔다.

6. `confirm()`에 뉴트럴 분기 추가:

```tsx
    } else if (isNeutralStep && picked) {
      setNeutralTint(tintOf(picked));
      setChoices([...choices, { metaKey: "neutral", label: picked.label }]);
    } else if (picked) {
```

기존 두 분기의 `setChoices`도 `metaKey`로 바꾼다 — 앵커는 `{ metaKey: 5, label: accentHex }`,
액센트 stop은 `{ metaKey: stopIndex, label: picked.label }`.

7. `STEP_META` 조회를 스텝 종류로 분기:

```tsx
  const meta = step && STEP_META[
    step.kind === "neutral-tint" ? "neutral" : step.kind === "accent-anchor" ? 5 : step.stopIndex
  ];
```

8. 진행 표시(`:238-245`)는 클릭 불가능한 `<span>` 점이다. **버튼으로 바꾸지 말 것** —
아직 도달하지 않은 단계로 점프하면 앵커 없이 `candidatesFor`가 호출되어
`"anchor pin (index 5) is required"`로 터진다. `BUILDER_FLOW`로만 바꾸고 `key`를
인덱스로 준다 (스텝이 더 이상 고유한 숫자가 아니라 `key={s}`가 충돌한다):

```tsx
          {BUILDER_FLOW.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < stepIdx ? "bg-neutral-800" : i === stepIdx ? "bg-neutral-400" : "bg-neutral-200"
              }`}
            />
          ))}
```

9. 되돌아가기 함수의 이름은 `goToStep`이 아니라 **`redo`**다 (`:210`). `BUILDER_STEPS`
기준의 stop 필터를 `BUILDER_FLOW` 기준으로 바꾸고 뉴트럴을 함께 무효화한다:

```tsx
  const redo = (targetStep: number) => {
    const keptStops = BUILDER_FLOW.slice(0, targetStep).flatMap((s) =>
      s.kind === "accent-anchor" ? [5] : s.kind === "accent-stop" ? [s.stopIndex] : [],
    );
    setPins(pins.filter((p) => keptStops.includes(p.index)));
    setChoices(choices.slice(0, targetStep));
    if (targetStep < 5) setNeutralTint(null); // 뉴트럴 단계(인덱스 5) 이전으로 가면 무효
    setPicked(null);
    setStepIdx(targetStep);
  };
```

> `choices`를 `slice`로 자르는 것이 기존 `stopIndex` 필터를 대체한다 — 뉴트럴
> 선택에는 stop이 없어 stop 기반 필터로는 걸러지지 않기 때문이다.

10. `restart()`(`:218`)에도 `setNeutralTint(null)`을 추가한다.

- [ ] **Step 6: 브라우저 수동 확인**

Run: `cd web && npm run dev` 후 `#builder`에서 6단계 완주.
Expected: 6번째 단계에 뉴트럴 후보 3개(무채색 / 스냅된 어트랙터 은은·뚜렷)가 뜨고, 콘솔 에러 0. 진행 표시가 6칸.

- [ ] **Step 7: 커밋**

```bash
git add src/lab/palette/builder.ts tests/lab/builder.test.ts web/src/builder/BuilderPage.tsx
git commit -m "$(cat <<'EOF'
feat(builder): 6-step flow — accent 5-pick + neutral tint

BUILDER_STEPS는 stop 인덱스 배열이라 뉴트럴 단계를 표현할 수 없었다.
판별 유니온 BuilderStep과 BUILDER_FLOW를 추가한다 (BUILDER_STEPS는 유지).

뉴트럴 단계는 액센트 hue에서 스냅한 어트랙터로 후보 3개를 제시한다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 완료 화면 — 3종 스케일 + 다크 섹션 확장

**Files:**
- Modify: `web/src/builder/BuilderPage.tsx`

**Interfaces:**
- Consumes: Task 4의 `buildNeutral`, Task 5의 `SEMANTIC_ANCHORS`·`buildSemantic`, Task 6의 `cssSnippet(ScaleSet)`

- [ ] **Step 1: 완료 화면에서 세 종류 스케일을 파생**

`BuilderPage` 본문의 `finalStops` 근처에 추가:

```tsx
  const scaleSet = useMemo<ScaleSet | null>(() => {
    if (!done || !neutralTint) return null;
    return {
      accent: fillScale(pins).map(oklchToHex),
      neutral: buildNeutral(neutralTint).map(oklchToHex),
      semantic: Object.fromEntries(
        SEMANTIC_ANCHORS.map((a) => [a.id, buildSemantic(a).map(oklchToHex)]),
      ) as ScaleSet["semantic"],
    };
  }, [done, neutralTint, pins]);
```

- [ ] **Step 2: `DarkSection`이 `ScaleSet`을 받도록 확장**

`MockPanel`이 뉴트럴 배경을 받도록 prop을 하나 늘린다:

```tsx
function MockPanel({
  mode, hexes, neutral,
}: {
  mode: "light" | "dark";
  hexes: readonly string[];
  neutral: readonly string[];
}) {
```

그리고 컨테이너의 고정 배경을 뉴트럴 양 끝으로 교체:

```tsx
    style={{
      ...vars,
      background: mode === "light" ? neutral[0] : neutral[10],
    } as CSSProperties}
```

`DarkSection`의 시그니처를 `{ scales }: { scales: ScaleSet }`로 바꾸고 본문을 이렇게 고친다:

```tsx
  const copyCss = () => navigator.clipboard.writeText(cssSnippet(scales));
  const named: [string, readonly string[]][] = [
    ["액센트", scales.accent],
    ["뉴트럴", scales.neutral],
    ...SEMANTIC_ANCHORS.map((a) => [a.label, scales.semantic[a.id]] as [string, readonly string[]]),
  ];
```

목업 호출부:

```tsx
        <MockPanel mode="light" hexes={scales.accent} neutral={scales.neutral} />
        <MockPanel mode="dark" hexes={scales.accent} neutral={scales.neutral} />
```

배경 note를 교체한다 — 기존 "패널 배경은 고정값(#ffffff / #171717) — 실제 앱에선 뉴트럴 스케일이 이 자리"에서:

```
패널 배경이 이제 당신의 뉴트럴 50/950입니다 — 액센트와 뉴트럴이 같은 화면에서 어떻게 만나는지 보세요.
```

역할표는 스케일마다 반복하되, 앞의 둘만 펼치고 시맨틱 4종은 접는다 (전부 펼치면 36행이 된다):

```tsx
      {named.map(([label, hexes], i) => {
        const table = (
          <table className="w-full text-[11px]">
            {/* 기존 thead 그대로 */}
            <tbody>
              {SCALE_ROLES.map((r) => (
                <tr key={r.id} className="border-t border-neutral-100 align-top">
                  <td className={`py-1.5 pr-2 ${r.id === "solid" ? "font-medium text-neutral-800" : "text-neutral-600"}`}>
                    {r.label}
                  </td>
                  <td className="py-1.5 pr-2">
                    <RoleChip hex={hexes[r.lightIndex]} stop={STOP_KEYS[r.lightIndex]} ring={r.id === "solid"} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <RoleChip hex={hexes[r.darkIndex]} stop={STOP_KEYS[r.darkIndex]} ring={r.id === "solid"} />
                  </td>
                  <td className="py-1.5 leading-4 text-neutral-400">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
        return i < 2 ? (
          <div key={label} className="space-y-1">
            <div className="text-[11px] font-medium text-neutral-600">{label}</div>
            {table}
          </div>
        ) : (
          <details key={label}>
            <summary className="text-[11px] text-neutral-500 cursor-pointer py-1">{label}</summary>
            {table}
          </details>
        );
      })}
```

> note 열은 여섯 표에서 같은 문장을 반복한다. 그게 의도다 — 미러 규칙이 스케일
> 종류와 무관하게 하나라는 게 이 화면의 논지다.

- [ ] **Step 3: 시맨틱 섹션 추가**

`DarkSection` 위, hex 목록 아래에 시맨틱 4종 스트립과 note 한 줄:

```tsx
      <div className="space-y-2 border-t border-neutral-200 pt-4">
        <h2 className="text-sm font-medium">상태색 — 고르지 않는 색</h2>
        <p className="text-[11px] leading-4 text-neutral-400">
          빨강=위험·초록=성공은 신호등에서 온 문화적 약속이라 브랜드를 따르지
          않습니다. 코퍼스에서 파랑의 합의 폭은 8°뿐입니다. 대신 사다리 모양은
          당신의 액센트와 같은 곡선을 씁니다.
        </p>
        {SEMANTIC_ANCHORS.map((a) => (
          <div key={a.id} className="space-y-1">
            <div className="text-[11px] text-neutral-500">{a.label}</div>
            <ColorScaleStrip
              stops={scales.semantic[a.id].map((hex, i) => ({
                key: STOP_KEYS[i], hex, anchor: i === 5,
              }))}
            />
          </div>
        ))}
      </div>
```

- [ ] **Step 4: 호출부 교체**

`<DarkSection hexes={finalStops.map((s) => s.hex)} />` → `{scaleSet && <DarkSection scales={scaleSet} />}`

- [ ] **Step 5: 타입체크**

Run: `cd web && npx tsc -b --noEmit`
Expected: PASS

- [ ] **Step 6: Playwright 수동 검증**

`cd web && npm run dev` 후 `#builder`에서:

1. 6-pick 완주(액센트 `#3b82f6` → 나머지 균형/기본 → 뉴트럴 "쿨 그레이 (은은)") → 액센트 스트립 + 뉴트럴 스트립 + 시맨틱 4종 스트립 + 역할표 + 목업이 전부 렌더되는가.
2. 목업 패널 배경이 흰/검정이 아니라 뉴트럴 50/950인가.
3. copy CSS 클릭 → 클립보드에 `--accent-*`, `--neutral-*`, `--error-*`, `--success-*`, `--warning-*`, `--info-*` 프리미티브 66개와 `.dark` 30선언이 있는가. `--*-solid`가 `.dark`에 **없는가**.
4. 웜 앵커로 재실행(액센트 `#f97316`) → 뉴트럴 후보가 "웜 그레이"로 뜨고, 그 회색이 **갈색으로 보이지 않는가** (V2의 핵심 주장 눈 검증).
5. 콘솔 에러 0.

- [ ] **Step 7: 커밋**

```bash
git add web/src/builder/BuilderPage.tsx
git commit -m "$(cat <<'EOF'
feat(builder): completion screen renders the full color system

액센트·뉴트럴·시맨틱 4종 스트립과 스케일별 역할표를 렌더하고, copy CSS가
세 종류를 한 벌로 내보낸다.

목업 패널 배경을 고정값(#ffffff/#171717)에서 사용자의 뉴트럴 50/950으로
교체 — 액센트와 뉴트럴이 같은 화면에서 만나는 걸 볼 수 있게 됐다.
(다크 역할 스펙의 이월 항목 "뉴트럴 연동 목업 배경" 해소)

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## 최종 검증

- [ ] **전체 테스트**

Run: `pnpm test && (cd web && npx tsc -b --noEmit)`
Expected: 둘 다 PASS

- [ ] **계획 문서 갱신**

이 파일의 체크박스를 완료 표시하고, Task 8 Step 6의 수동 검증 결과(특히 4번 — 웜 앵커의 갈색 회피)를 문서 하단에 기록한 뒤 커밋한다.

- [ ] **스펙의 이월 항목 갱신**

`docs/superpowers/specs/2026-07-28-dark-accent-roles-design.md`의 "v0 범위 밖" 목록에서 **"뉴트럴 연동 목업 배경"**은 Task 8에서 해소됐다. 해소 표시와 해소 커밋을 적는다.

- [ ] **연구 트랙 문서에 결과 기록**

`docs/research/accent-scale-derivation-track.md`에 "뉴트럴·시맨틱 확장 (2026-08-09)" 절을 추가하고 V1–V4의 판정(뉴트럴 곡선 분리, 어트랙터 스냅, 강도 종속, 시맨틱 곡선 재사용)과 산출 스크립트 경로를 남긴다. IDENTITY의 "연구의 완결 조건은 디폴트 반영 + 근거의 가시화"를 만족시키는 단계다.
