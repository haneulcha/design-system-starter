# 컬러 팔레트 제너레이터 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `#builder`의 5단계 학습 플로우 옆에, 액센트 색 하나만 입력하면 완전한 색 시스템이 즉시 나오고 팔레트 위에서 제자리 조정하는 도구 `/color-palette`를 세운다.

**Architecture:** 제품 엔진을 `src/lab/`(연구 코드)에서 `src/color/`로 졸업시키고, 대비 판정 모듈을 새로 만든다. 산출 계약(`ExportRole`)을 판별 유니온으로 넓혀 `on-solid` 역할을 추가한다. `web/src/color-palette/`는 렌더만 하고 계산은 전부 `src/color/`의 순수 함수가 한다.

**Tech Stack:** TypeScript (Node16 모듈 해상도, import에 `.js` 확장자 필수) · React 19 · Vite 6 · Vitest 3(루트) / Vitest 4(web) · culori · Tailwind v4

**Spec:** `docs/superpowers/specs/2026-08-15-color-palette-generator-design.md`

## Global Constraints

- **루트 테스트 실행:** `pnpm test` (= `vitest run`, `tests/**/*.test.ts`만 수집)
- **web 테스트 실행:** `cd web && npx vitest run` (`src/**/*.test.{ts,tsx}`, jsdom)
- **web 타입체크:** `cd web && npx tsc -b`
- **루트 `src/` import는 반드시 `.js` 확장자를 붙인다** (`moduleResolution: "Node16"`). 예: `import { fillScale } from "./scale.js";`
- **`web/`에서 루트 엔진을 쓸 때는 `@core/` 별칭 + `.js` 확장자.** 예: `import { fillScale } from "@core/color/scale.js";`
- **`tests/`에서는 상대 경로 + `.js`.** 예: `from "../../src/color/scale.js"`
- **대비 기준은 WCAG 2.2 AA 본문 4.5:1.** 큰 글씨 3:1은 이 사이클에서 판정하지 않는다.
- **`stopKeys`를 `/^[a-z][a-z0-9-]*$/`로 검증하지 말 것.** `"50"`이 거부돼 모든 산출이 깨진다.
- **주석은 한국어**, 기존 파일들의 밀도를 따른다 — "왜 이 값인가"를 남기고 "무엇을 하는가"는 코드가 말하게 한다.
- **커밋 메시지는 한국어 본문 + 영어 타입 접두사** (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`), 마지막 줄에 `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

## File Structure

**신설 — 제품 엔진 (`src/color/`)**

| 파일 | 책임 |
| --- | --- |
| `curve.ts` | `OURS_CURVE` 상수만. 액센트·시맨틱이 공유하는 곡선 모양 |
| `scale.ts` | `fillScale` · `clampToGamut` · `STOP_KEYS` · `SCALE_SIZE` · `Pin` |
| `candidates.ts` | `candidatesFor` · `Candidate` |
| `neutral.ts` | `buildNeutral` · `TINT_ATTRACTORS` · `snapTint` · `tintAttractor` · `neutralCandidates` |
| `semantic.ts` | `buildSemantic` · `SEMANTIC_ANCHORS` · `SEMANTIC_SECTION_NOTE` |
| `roles.ts` | `SCALE_ROLES` · `SCALE_ORDER` · `ScaleSet` · `scaleHasAnchor` |
| `contrast.ts` | 신설. 대비 계산 · `on-solid` 색 선택 · 역할 이동 제안 |

**변경 — 연구 코드 (`src/lab/palette/`)**

| 파일 | 변경 |
| --- | --- |
| `guided.ts` | 신설. `BUILDER_FLOW` · `BUILDER_STEPS` · `STEP_META`가 여기로 |
| `ours.ts` | `OURS_CURVE`를 `src/color/curve.js`에서 import |
| `builder.ts` `neutral.ts` `semantic.ts` `roles.ts` | 삭제 (내용은 `src/color/`로) |

**변경 — 산출 (`src/export/color/`)**

| 파일 | 변경 |
| --- | --- |
| `types.ts` | `ExportRole`을 판별 유니온으로. `assertColorSystem`이 `kind`별로 분기 |
| `vars.ts` | `kind: "contrast"` 역할을 스케일별로 계산 |
| `design-md.ts` | 역할표에 `contrast` 행 렌더 + 상태색 대비 경고 |
| `figma.ts` | `contrast` 역할을 두 모드 같은 값으로 |
| `adapter.ts` | `!hexes?.length` 가드 |

**신설 — 화면 (`web/src/color-palette/`)**

| 파일 | 책임 |
| --- | --- |
| `ColorPalettePage.tsx` | 상태 보유 · URL 동기화 · 조립 |
| `paletteState.ts` | 상태 타입 + 상태 → `ScaleSet` 유도 (순수) |
| `paletteUrl.ts` | 직렬화 · 파싱 (순수) |
| `AccentInput.tsx` | 피커 + hex 입력 |
| `AdjustableScale.tsx` | 11-stop + 조정 가능 표시 + 팝오버 트리거 |
| `CandidatePopover.tsx` | 3옵션 · hover 프리뷰 · "기본으로" |
| `NeutralControl.tsx` | 어트랙터 5칩 + 강도 2단 |
| `PreviewPane.tsx` | 라이트/다크 목업 + 대비 뱃지 + 고치기 |
| `DownloadRow.tsx` | 4파일 버튼 |

**신설 — 공용 (`web/src/lib/`)**

| 파일 | 책임 |
| --- | --- |
| `download.ts` | `downloadFile` · `copyText` (Firefox·비보안 컨텍스트 대응) |

---

## Task 1: 엔진을 `src/color/`로 졸업시킨다

로직을 바꾸지 않는 이동이다. **기존 테스트가 import 경로 외에 한 글자도 바뀌지 않은 채 통과해야 한다.** 바뀌면 이동 중 무언가 잘못된 것이다.

**Files:**
- Create: `src/color/curve.ts` `src/color/scale.ts` `src/color/candidates.ts` `src/color/neutral.ts` `src/color/semantic.ts` `src/color/roles.ts` `src/lab/palette/guided.ts`
- Delete: `src/lab/palette/builder.ts` `src/lab/palette/neutral.ts` `src/lab/palette/semantic.ts` `src/lab/palette/roles.ts`
- Modify: `src/lab/palette/ours.ts` · `web/src/builder/BuilderPage.tsx` · `web/src/builder/ExportPanel.tsx`
- Move: `tests/lab/{builder,neutral,semantic,roles}.test.ts` → `tests/color/{scale,neutral,semantic,roles}.test.ts`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: `src/color/scale.js`가 `fillScale(pins: readonly Pin[], hueRamp?: readonly number[]): Oklch[]` · `clampToGamut(c: Oklch): Oklch` · `SCALE_SIZE: 11` · `STOP_KEYS: readonly ["50",…,"950"]` · `interface Pin { index: number; color: Oklch }`. `src/color/candidates.js`가 `candidatesFor(stopIndex: number, pins: readonly Pin[]): Candidate[]` · `interface Candidate { color: Oklch; label: string; note: string }`. `src/color/curve.js`가 `OURS_CURVE: readonly { l: number; cMult: number }[]`. `src/color/neutral.js`·`semantic.js`·`roles.js`는 이동 전과 동일한 export 목록.

- [ ] **Step 1: `src/color/` 디렉터리와 `curve.ts`를 만든다**

`src/lab/palette/ours.ts`에서 `OURS_CURVE` 상수와 그 출처 주석을 잘라내 옮긴다.

```ts
// src/color/curve.ts
//
// 액센트·시맨틱 스케일이 공유하는 곡선 모양. stop 50..950 (11개, 앵커=인덱스 5).
// l = 평균 L, cMult = 평균 C_i/C_anchor.
//
// 출처: scripts/analysis/ours-curve-stats.ts (tailwind-v4.json 17종, 2026-07-26).
// 레퍼런스 갱신 시 재생성해 비교할 것.
//
// 이 파일이 src/lab/에서 나온 이유: 산출물의 모든 색이 이 표에서 파생된다.
// src/lab/palette/ours.ts(연구용 알고리즘 비교)는 이제 여기서 import한다.

export const OURS_CURVE: readonly { l: number; cMult: number }[] = [
  { l: 0.9772, cMult: 0.092 },
  { l: 0.9503, cMult: 0.221 },
  { l: 0.9052, cMult: 0.425 },
  { l: 0.8393, cMult: 0.689 },
  { l: 0.7533, cMult: 0.908 },
  { l: 0.6838, cMult: 1.0 },
  { l: 0.6014, cMult: 0.985 },
  { l: 0.518, cMult: 0.872 },
  { l: 0.4469, cMult: 0.732 },
  { l: 0.3948, cMult: 0.593 },
  { l: 0.2777, cMult: 0.42 },
];
```

`src/lab/palette/ours.ts`의 상단을 고친다:

```ts
import { OURS_CURVE } from "../../color/curve.js";
```

`ours.ts`에서 `export const OURS_CURVE` 정의를 지운다. 다른 곳이 `ours.js`에서 `OURS_CURVE`를 가져오고 있었다면 전부 `curve.js`로 바꾼다.

- [ ] **Step 2: `scale.ts`와 `candidates.ts`로 `builder.ts`를 쪼갠다**

`src/lab/palette/builder.ts`의 내용을 두 파일로 나눈다. **로직은 한 줄도 바꾸지 않는다.**

- `src/color/scale.ts` ← 파일 상단 주석, `Pin`, `SCALE_SIZE`, `STOP_KEYS`, `toRgb`, `displayable`, `clampToGamut`, `hueLerp`, `fillScale`. import는 `import { OURS_CURVE } from "./curve.js";`와 `import type { Oklch } from "../schema/types.js";`
- `src/color/candidates.ts` ← `Candidate`, `WARM_HUE_MIN`, `WARM_HUE_MAX`, `MID_LABELS`, `colorKey`, `candidatesFor`. import는 `import { fillScale, type Pin } from "./scale.js";`와 `import type { Oklch } from "../schema/types.js";`

`scale.ts` 상단 주석에서 **"실험 코드 — 제품 파이프라인에서 import 금지" 문장을 지우고** 다음으로 교체한다:

```ts
// src/color/scale.ts
//
// 팔레트 스케일 엔진. 고정점(Pin) N개 사이를 OURS_CURVE 모양으로 채운다.
// 앵커 pin 하나만으로도 완전한 11-stop이 나온다 — 5단계 선택은 학습 순서이지
// 엔진의 제약이 아니다 (그 순서는 src/lab/palette/guided.ts에 있다).
```

- [ ] **Step 3: `guided.ts`로 학습 플로우를 분리한다**

`builder.ts`에 남은 `BUILDER_STEPS`, `BuilderStep`, `BUILDER_FLOW`, `STEP_META`를 `src/lab/palette/guided.ts`로 옮긴다.

```ts
// src/lab/palette/guided.ts
//
// 가이드드 빌더(#builder)의 5-pick 학습 플로우. Refactoring UI가 권하는 선택
// 순서와 단계별 안내 카피다. 엔진(src/color/)이 아니라 여기 있는 이유:
// 이 순서는 학습 장치이지 스케일 생성의 제약이 아니다. /color-palette는
// 같은 엔진을 쓰면서 이 파일을 읽지 않는다.
// 스펙: docs/superpowers/specs/2026-07-27-guided-palette-builder-design.md

import type { Pin } from "../../color/scale.js";
```

(`Pin` import는 `BuilderStep` 정의에 필요 없으면 넣지 않는다 — 사용하지 않는 import는 `tsc`가 잡는다.)

`builder.ts`를 삭제한다.

- [ ] **Step 4: `neutral.ts` · `semantic.ts` · `roles.ts`를 옮긴다**

`git mv src/lab/palette/{neutral,semantic,roles}.ts src/color/` 후 각 파일의 import 경로를 고친다:

- `neutral.ts`: `from "./builder.js"` → `from "./scale.js"`, `Candidate` import는 `from "./candidates.js"`, `from "../../schema/types.js"` → `from "../schema/types.js"`
- `semantic.ts`: `from "./builder.js"` → `from "./scale.js"`, `from "../../schema/types.js"` → `from "../schema/types.js"`
- `roles.ts`: `from "./semantic.js"`는 그대로

각 파일 상단 주석의 스펙 경로는 그대로 둔다 (계보가 끊기면 안 된다).

- [ ] **Step 5: `src/lab/palette/index.ts`를 정리한다**

`ALGORITHMS` 레지스트리는 그대로 두고, `builder.js`를 가리키던 재수출이 있으면 지운다. `#lab` 화면이 쓰는 것만 남는다.

- [ ] **Step 6: `web/`의 import를 고친다**

`web/src/builder/BuilderPage.tsx`:

```ts
import { candidatesFor, type Candidate } from "@core/color/candidates.js";
import { fillScale, STOP_KEYS, type Pin } from "@core/color/scale.js";
import { BUILDER_FLOW, STEP_META, type BuilderStep } from "@core/lab/palette/guided.js";
import {
  neutralCandidates, buildNeutral, tintAttractor,
  type NeutralCandidate, type NeutralTint,
} from "@core/color/neutral.js";
import {
  SCALE_ORDER, SCALE_ROLES, scaleHasAnchor,
  type ScaleName, type ScaleRole, type ScaleSet,
} from "@core/color/roles.js";
import {
  SEMANTIC_ANCHORS, SEMANTIC_SECTION_NOTE, buildSemantic, type SemanticId,
} from "@core/color/semantic.js";
```

`web/src/builder/ExportPanel.tsx`:

```ts
import { SCALE_ORDER, SCALE_ROLES, type ScaleSet } from "@core/color/roles.js";
import { STOP_KEYS } from "@core/color/scale.js";
```

- [ ] **Step 7: 테스트를 옮긴다 — 내용은 import 경로만 바뀐다**

```bash
mkdir -p tests/color
git mv tests/lab/builder.test.ts tests/color/scale.test.ts
git mv tests/lab/neutral.test.ts tests/color/neutral.test.ts
git mv tests/lab/semantic.test.ts tests/color/semantic.test.ts
git mv tests/lab/roles.test.ts tests/color/roles.test.ts
```

각 파일에서 `../../src/lab/palette/builder.js` → `../../src/color/scale.js` 식으로 경로만 고친다. `candidatesFor`를 쓰는 케이스가 `tests/color/scale.test.ts`에 있으면 `../../src/color/candidates.js`에서 가져온다.

`tests/export/color/adapter.test.ts`의 import도 같은 방식으로 고친다.

`tests/lab/roles.test.ts`에 파일 중간에 있던 import 하나(BACKLOG 4 "테스트 다듬기")를 상단으로 올린다.

- [ ] **Step 8: 전체 테스트와 타입체크**

```bash
pnpm test
npx tsc --noEmit
cd web && npx tsc -b && npx vitest run
```

Expected: 루트 971 테스트 전부 PASS, web 3 테스트 PASS. **테스트 수가 줄거나 assertion을 고쳐야 했다면 이동이 잘못된 것이다 — 되돌리고 다시 한다.**

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "refactor: 제품 색 엔진을 src/color/로 졸업

builder.ts의 '실험 코드 — 제품 파이프라인에서 import 금지' 주석이
곧 거짓말이 될 참이었다. 산출물에 영향을 주는 것(src/color/)과
비교·학습에만 쓰는 것(src/lab/)의 경계를 파일 위치로 세운다.

5-pick 순서와 단계 카피(BUILDER_FLOW·STEP_META)는 src/lab/guided.ts로
간다 — 그건 학습 순서이지 엔진의 제약이 아니다.

로직 변경은 OURS_CURVE를 curve.ts로 분리한 것뿐이고, 기존 테스트는
import 경로 외에 바뀌지 않았다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `contrast.ts` — 대비 계산과 on-solid 색 선택

**Files:**
- Create: `src/color/contrast.ts` · `tests/color/contrast.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 함수, hex 문자열만 다룬다)
- Produces: `contrastRatio(a: string, b: string): number` · `onSolidColor(solidHex: string): "#000000" | "#ffffff"` · `AA_BODY: 4.5`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
// tests/color/contrast.test.ts
import { describe, it, expect } from "vitest";
import { contrastRatio, onSolidColor, AA_BODY } from "../../src/color/contrast.js";

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("returns 1 for identical colours", () => {
    expect(contrastRatio("#3b82f6", "#3b82f6")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#3b82f6", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#3b82f6"),
      10,
    );
  });

  // WCAG의 대표적 경계값 — #767676이 흰 배경에서 본문 AA를 겨우 통과하는 회색이다.
  it("puts #767676 on white just over the AA body threshold", () => {
    const r = contrastRatio("#767676", "#ffffff");
    expect(r).toBeGreaterThanOrEqual(AA_BODY);
    expect(r).toBeLessThan(4.6);
  });
});

describe("onSolidColor", () => {
  it("picks black on a light solid", () => {
    expect(onSolidColor("#eab308")).toBe("#000000");
  });

  it("picks white on a dark solid", () => {
    expect(onSolidColor("#1d59b9")).toBe("#ffffff");
  });

  // 파랑 500은 흰 글자가 3.68:1로 미달이고 검정이 5.71:1이다 — 직관과 다르므로 고정한다.
  it("picks black on tailwind blue-500 (white would fail AA)", () => {
    expect(onSolidColor("#3b82f6")).toBe("#000000");
    expect(contrastRatio("#000000", "#3b82f6")).toBeGreaterThanOrEqual(AA_BODY);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run tests/color/contrast.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/color/contrast.js"`

- [ ] **Step 3: 최소 구현**

```ts
// src/color/contrast.ts
//
// WCAG 2.2 대비 판정. APCA가 더 정확하지만 아직 초안이고, 이 도구는 숫자의 의미를
// 설명하지 않기로 했으므로(스펙 D9) 널리 통용되는 쪽을 쓴다.
// 스펙: docs/superpowers/specs/2026-08-15-color-palette-generator-design.md

/** 본문 크기 AA. 큰 글씨 3:1은 이 사이클에서 판정하지 않는다. */
export const AA_BODY = 4.5;

/** sRGB 채널 → 선형. WCAG 2.x의 상대 휘도 정의 그대로. */
const channel = (v: number): number =>
  v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

function relativeLuminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  if (!Number.isFinite(n)) {
    throw new Error(`relativeLuminance: not a #rrggbb colour: ${hex}`);
  }
  const r = channel(((n >> 16) & 0xff) / 255);
  const g = channel(((n >> 8) & 0xff) / 255);
  const b = channel((n & 0xff) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 두 색의 대비비 (1..21). 인자 순서는 결과에 영향을 주지 않는다. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** 솔리드 위에 올릴 글자색. 스케일 자신의 50/950으로는 양쪽 다 미달인 경우가
 *  흔해(파랑 3.45/4.02, 보라 3.95/3.57) 흑백 리터럴에서 고른다 — 스펙 D5. */
export function onSolidColor(solidHex: string): "#000000" | "#ffffff" {
  return contrastRatio("#000000", solidHex) >= contrastRatio("#ffffff", solidHex)
    ? "#000000"
    : "#ffffff";
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run tests/color/contrast.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/color/contrast.ts tests/color/contrast.test.ts
git commit -m "feat(color): WCAG 대비 계산과 on-solid 색 선택

솔리드 위 글자는 스케일 자신의 50/950으로 풀리지 않는다 — 파랑 앵커에서
50이 3.45, 950이 4.02로 양쪽 다 미달이다. 흑백 리터럴에서 고른다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `ExportRole`을 판별 유니온으로 넓히고 `on-solid` 역할을 추가한다

**Files:**
- Modify: `src/export/color/types.ts` · `src/export/color/vars.ts` · `src/export/color/figma.ts` · `src/export/color/design-md.ts` · `src/export/color/adapter.ts` · `src/color/roles.ts` · `tests/export/color/fixture.ts` · `web/src/builder/BuilderPage.tsx`
- Test: `tests/export/color/types.test.ts` · `tests/export/color/css.test.ts` · `tests/export/color/figma.test.ts` · `tests/export/color/design-md.test.ts`

**Interfaces:**
- Consumes: Task 2의 `onSolidColor(solidHex: string): "#000000" | "#ffffff"` — 단, **`src/export/`는 `src/color/`를 import하지 않는다.** 대신 `vars.ts`가 자체적으로 같은 계산을 하지 않도록, 흑백 선택 로직을 `types.ts`에 값으로 실어 보내지 않고 `vars.ts`가 `contrastRatio`를 다시 구현하지도 않는다 — **`ExportRole`의 `kind: "contrast"`를 만나면 `resolveContrast` 콜백에 위임한다**(아래 Step 3).
- Produces: `type ExportRole = { kind: "stop"; … } | { kind: "contrast"; … }` · `ContrastResolver = (againstHex: string) => string`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
// tests/export/color/types.test.ts 에 추가
import { assertColorSystem } from "../../../src/export/color/types.js";
import { fixtureSystem } from "./fixture.js";

describe("assertColorSystem — contrast 역할", () => {
  it("rejects a contrast role whose `against` names no stop role", () => {
    const system = fixtureSystem();
    const broken = {
      ...system,
      roles: [
        ...system.roles,
        { kind: "contrast" as const, id: "on-solid", label: "솔리드 위 글자", against: "nope" },
      ],
    };
    expect(() => assertColorSystem(broken)).toThrow(/against/);
  });

  it("rejects a contrast role pointing at another contrast role", () => {
    const system = fixtureSystem();
    const broken = {
      ...system,
      roles: [
        { kind: "contrast" as const, id: "a", label: "A", against: "b" },
        { kind: "contrast" as const, id: "b", label: "B", against: "a" },
      ],
    };
    expect(() => assertColorSystem(broken)).toThrow(/stop/);
  });

  it("rejects duplicate role ids", () => {
    const system = fixtureSystem();
    const broken = { ...system, roles: [...system.roles, system.roles[0]] };
    expect(() => assertColorSystem(broken)).toThrow(/duplicate role/);
  });
});
```

```ts
// tests/export/color/css.test.ts 에 추가
describe("on-solid", () => {
  it("emits a literal colour per scale, not a var() reference", () => {
    const css = generateColorCss(systemWithOnSolid());
    expect(css).toMatch(/--color-accent-on-solid: #(000000|ffffff);/);
  });

  it("does not redeclare on-solid in the dark block", () => {
    const css = generateColorCss(systemWithOnSolid());
    const dark = css.slice(css.indexOf(".dark {"));
    expect(dark).not.toContain("on-solid");
  });

  it("can pick different literals for different scales", () => {
    // 흰 solid(밝음)와 검은 solid(어두움)를 가진 두 스케일
    const system = {
      stopKeys: ["a", "b", "c"],
      scales: [
        { name: "light", label: "밝음", hexes: ["#ffffff", "#eeeeee", "#dddddd"] },
        { name: "dark", label: "어두움", hexes: ["#000000", "#111111", "#222222"] },
      ],
      roles: [
        { kind: "stop" as const, id: "solid", label: "솔리드", lightIndex: 0, darkIndex: 0 },
        { kind: "contrast" as const, id: "on-solid", label: "솔리드 위 글자", against: "solid" },
      ],
    };
    const css = generateColorCss(system);
    expect(css).toContain("--color-light-on-solid: #000000;");
    expect(css).toContain("--color-dark-on-solid: #ffffff;");
  });
});
```

`systemWithOnSolid()`를 `fixture.ts`에 더한다 (Step 2에서).

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run tests/export/color/`
Expected: FAIL — `kind` 프로퍼티가 타입에 없고 `on-solid`이 출력되지 않는다.

- [ ] **Step 3: `types.ts`를 넓힌다**

```ts
// src/export/color/types.ts
export interface StopRole {
  readonly kind: "stop";
  readonly id: string;
  readonly label: string;
  readonly lightIndex: number;
  readonly darkIndex: number;
}

/** 값이 stop 인덱스로 표현되지 않는 역할. 산출 시점에 스케일별로 계산된다.
 *  on-solid이 그렇다: 같은 팔레트 안에서도 뉴트럴은 흰 글자, 액센트는 검은 글자다
 *  (스펙 D5). 이 역할이 있어도 roles 배열은 평평하게 남는다. */
export interface ContrastRole {
  readonly kind: "contrast";
  readonly id: string;
  readonly label: string;
  /** 같은 스케일의 `kind: "stop"` 역할 id. 그 색과 대비되는 색을 고른다. */
  readonly against: string;
}

export type ExportRole = StopRole | ContrastRole;

/** 대비 역할의 값을 정하는 함수. 산출 코드가 대비 계산을 자기 안에 두지 않고
 *  주입받는 이유: src/export/가 src/color/를 import하면 사이클 2가 세운
 *  "산출 코드는 엔진을 모른다"가 깨진다. */
export type ContrastResolver = (againstHex: string) => string;
```

`assertColorSystem`에 다음을 더한다 — **`stopKeys`는 여전히 `CSS_IDENT`로 검사하지 않는다**:

```ts
  const roleIds = new Set<string>();
  const stopRoleIds = new Set(
    system.roles.filter((r): r is StopRole => r.kind === "stop").map((r) => r.id),
  );
  for (const role of system.roles) {
    if (!CSS_IDENT.test(role.id)) {
      throw new Error(`assertColorSystem: role id "${role.id}" is not a CSS identifier`);
    }
    if (roleIds.has(role.id)) {
      throw new Error(`assertColorSystem: duplicate role id "${role.id}"`);
    }
    roleIds.add(role.id);

    if (role.kind === "contrast") {
      if (!stopRoleIds.has(role.against)) {
        throw new Error(
          `assertColorSystem: role "${role.id}" against "${role.against}" is not a stop role`,
        );
      }
      continue;
    }

    const fields: readonly [string, number][] = [
      ["lightIndex", role.lightIndex],
      ["darkIndex", role.darkIndex],
    ];
    for (const [field, idx] of fields) {
      if (!Number.isInteger(idx) || idx < 0 || idx >= n) {
        throw new Error(
          `assertColorSystem: role "${role.id}" ${field} ${idx} is out of range 0..${n - 1}`,
        );
      }
    }
  }
```

- [ ] **Step 4: `vars.ts`가 대비 역할을 처리하게 한다**

```ts
// src/export/color/vars.ts
import type { ColorSystem, ContrastResolver, StopRole } from "./types.js";

/** 흑백 중 대비가 높은 쪽. 기본 resolver — 호출자가 주입하지 않으면 이걸 쓴다.
 *  WCAG 상대 휘도를 여기 한 번 더 쓰는 대신, 계산이 필요한 유일한 지점이라
 *  분기 없이 단순 비교로 끝낸다. */
const defaultResolver: ContrastResolver = (hex) => {
  const c = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const n = Number.parseInt(hex.slice(1), 16);
  const lum =
    0.2126 * c(((n >> 16) & 0xff) / 255) +
    0.7152 * c(((n >> 8) & 0xff) / 255) +
    0.0722 * c((n & 0xff) / 255);
  // 검정 대비 = (lum+.05)/.05, 흰색 대비 = 1.05/(lum+.05) — 교차점이 √1.05−0.05
  return lum + 0.05 >= Math.sqrt(1.05) ? "#000000" : "#ffffff";
};

function stopRole(system: ColorSystem, id: string): StopRole {
  const found = system.roles.find((r) => r.kind === "stop" && r.id === id);
  if (!found || found.kind !== "stop") {
    throw new Error(`vars: no stop role "${id}" (assertColorSystem should have caught this)`);
  }
  return found;
}

export function roleVars(
  system: ColorSystem,
  resolve: ContrastResolver = defaultResolver,
): VarDecl[] {
  const out: VarDecl[] = [];
  for (const scale of system.scales) {
    for (const role of system.roles) {
      if (role.kind === "contrast") {
        const target = stopRole(system, role.against);
        out.push({
          name: varName(scale.name, role.id),
          value: resolve(scale.hexes[target.lightIndex]),
        });
        continue;
      }
      out.push({
        name: varName(scale.name, role.id),
        value: `var(${varName(scale.name, system.stopKeys[role.lightIndex])})`,
      });
    }
  }
  return out;
}
```

`darkRoleVars`는 `role.kind === "contrast"`이면 `continue` 한다 — `against`가 가리키는 solid이 테마 간 고정이므로 값이 바뀌지 않는다.

```ts
export function darkRoleVars(system: ColorSystem): VarDecl[] {
  const out: VarDecl[] = [];
  for (const scale of system.scales) {
    for (const role of system.roles) {
      // 대비 역할은 자기가 참조하는 stop 역할이 테마 간 고정일 때만 존재한다
      // (지금은 on-solid × solid 하나뿐). 다크에 다시 쓸 것이 없다.
      if (role.kind === "contrast") continue;
      if (role.darkIndex === role.lightIndex) continue;
      out.push({
        name: varName(scale.name, role.id),
        value: `var(${varName(scale.name, system.stopKeys[role.darkIndex])})`,
      });
    }
  }
  return out;
}
```

- [ ] **Step 5: `figma.ts`와 `design-md.ts`를 맞춘다**

`figma.ts`의 역할 루프:

```ts
  for (const scale of system.scales) {
    for (const role of system.roles) {
      const [light, dark] =
        role.kind === "contrast"
          ? (() => {
              const t = system.roles.find(
                (r): r is StopRole => r.kind === "stop" && r.id === role.against,
              )!;
              const v = resolveContrast(scale.hexes[t.lightIndex]);
              return [v, v];
            })()
          : [scale.hexes[role.lightIndex], scale.hexes[role.darkIndex]];
      roles.push({
        name: `${scale.name}-${role.id}`,
        type: "COLOR",
        valuesByMode: { [LIGHT_MODE]: light, [DARK_MODE]: dark },
      });
    }
  }
```

`design-md.ts`의 역할표 행:

```ts
  for (const role of system.roles) {
    const varname = varName(SCALE_PLACEHOLDER, role.id);
    const cells =
      role.kind === "contrast"
        ? "스케일마다 흑/백 자동 | 좌동"
        : `${system.stopKeys[role.lightIndex]} | ${system.stopKeys[role.darkIndex]}`;
    lines.push(`| ${role.label} | ${varname} | ${cells} |`);
  }
```

- [ ] **Step 6: `SCALE_ROLES`에 `kind`와 `on-solid`을 더한다**

`src/color/roles.ts`의 `ScaleRole`도 같은 판별 유니온으로 넓힌다. `note`는 두 갈래 모두에 남는다 (`#builder`가 쓴다). 기존 6역할에 `kind: "stop"`을 붙이고, `solid` 바로 뒤에 넣는다:

```ts
  {
    kind: "contrast",
    id: "on-solid",
    label: "솔리드 위 글자",
    against: "solid",
    note: "솔리드 버튼 위에 얹는 글자. 스케일 자신의 50/950으로는 양쪽 다 미달인 경우가 흔해 흑/백에서 고른다 — 같은 팔레트에서도 뉴트럴은 흰 글자, 액센트는 검은 글자가 된다.",
  },
```

- [ ] **Step 7: `#builder`가 깨지지 않게 한다**

`BuilderPage.tsx`의 `DarkSection` 역할표와 `MockPanel`의 `vars`가 `lightIndex`/`darkIndex`를 직접 읽는다. `kind === "stop"`인 것만 쓰도록 좁힌다:

```ts
const STOP_ROLES = SCALE_ROLES.filter((r) => r.kind === "stop");
```

`MockPanel`의 솔리드 버튼 `className`에서 `text-white`를 지우고 `style`에 다음을 더한다:

```tsx
style={{ background: "var(--accent-solid)", color: onSolidColor(hexes[5]) }}
```

`ExportPanel.tsx`의 미리보기 솔리드 버튼도 같게 고친다 (`text-white` 제거, `color: "var(--color-accent-on-solid)"`).

- [ ] **Step 8: `fixture.ts`를 갱신하고 `adapter.ts` 부채를 갚는다**

`FIXTURE_ROLES`·`tinySystem()`의 모든 역할에 `kind: "stop"`을 붙인다. `systemWithOnSolid()`를 더한다:

```ts
export function systemWithOnSolid(): ColorSystem {
  const base = fixtureSystem();
  return {
    ...base,
    roles: [
      ...base.roles,
      { kind: "contrast", id: "on-solid", label: "솔리드 위 글자", against: "solid" },
    ],
  };
}
```

`adapter.ts`의 `if (!hexes)` → `if (!hexes?.length)`.

- [ ] **Step 9: 전체 테스트**

```bash
pnpm test && npx tsc --noEmit && cd web && npx tsc -b && npx vitest run
```

Expected: 전부 PASS. `#builder` 스모크 테스트가 여전히 통과해야 한다.

- [ ] **Step 10: 커밋**

```bash
git add -A
git commit -m "feat(export): on-solid 역할과 ExportRole 판별 유니온

솔리드 위 글자를 stop 인덱스로 표현할 수 없다 — 같은 팔레트에서도
뉴트럴은 흰 글자, 액센트는 검은 글자다. kind: 'contrast' 역할을 더해
산출 시점에 스케일별로 계산하되 roles 배열은 평평하게 유지한다.

대비 계산은 resolver로 주입받는다. src/export/가 src/color/를
import하면 사이클 2가 세운 격리가 깨진다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 대비 검사와 역할 이동 제안

**Files:**
- Modify: `src/color/contrast.ts` · `tests/color/contrast.test.ts`

**Interfaces:**
- Consumes: Task 1의 `ScaleSet`·`ScaleRole`(`src/color/roles.js`), Task 2의 `contrastRatio`·`AA_BODY`
- Produces: `checkContrast(scales, roles): ContrastCheck[]` · `suggestRoleShifts(scales, roles): RoleShift[]` · `applyRoleShifts(roles, shifts: readonly RoleOverride[]): ScaleRole[]` · `interface ContrastCheck` · `interface RoleOverride { roleId: "text" | "text-strong"; theme: "light" | "dark"; to: number }` · `interface RoleShift extends RoleOverride { from: number }`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
// tests/color/contrast.test.ts 에 추가
import { checkContrast, suggestRoleShifts, applyRoleShifts } from "../../src/color/contrast.js";
import { SCALE_ROLES, type ScaleSet } from "../../src/color/roles.js";
import { fillScale } from "../../src/color/scale.js";
import { buildNeutral, snapTint, TINT_STRENGTHS } from "../../src/color/neutral.js";
import { SEMANTIC_ANCHORS, buildSemantic } from "../../src/color/semantic.js";
import { oklchToHex, parsePrimary } from "../../src/generator/color.js";

function systemFor(hex: string): ScaleSet {
  const a = parsePrimary(hex);
  return {
    accent: fillScale([{ index: 5, color: a }]).map(oklchToHex),
    neutral: buildNeutral({
      hue: snapTint(a.h).hue,
      strength: TINT_STRENGTHS.soft,
    }).map(oklchToHex),
    semantic: Object.fromEntries(
      SEMANTIC_ANCHORS.map((s) => [s.id, buildSemantic(s).map(oklchToHex)]),
    ) as ScaleSet["semantic"],
  };
}

describe("checkContrast", () => {
  it("never checks the border role", () => {
    const checks = checkContrast(systemFor("#3b82f6"), SCALE_ROLES);
    expect(checks.some((c) => c.roleId === "border")).toBe(false);
  });

  it("marks accent and neutral adjustable, semantics not", () => {
    const checks = checkContrast(systemFor("#3b82f6"), SCALE_ROLES);
    expect(checks.find((c) => c.scaleName === "accent")!.adjustable).toBe(true);
    expect(checks.find((c) => c.scaleName === "neutral")!.adjustable).toBe(true);
    expect(checks.find((c) => c.scaleName === "warning")!.adjustable).toBe(false);
  });

  it("reports the known warning failure in light theme", () => {
    const checks = checkContrast(systemFor("#3b82f6"), SCALE_ROLES);
    const c = checks.find(
      (x) => x.scaleName === "warning" && x.roleId === "text" &&
             x.theme === "light" && x.against === "subtle-bg",
    )!;
    expect(c.passes).toBe(false);
    expect(c.ratio).toBeCloseTo(2.96, 1);
  });

  it("passes every dark-theme text check", () => {
    for (const hex of ["#3b82f6", "#eab308", "#22c55e"]) {
      const dark = checkContrast(systemFor(hex), SCALE_ROLES)
        .filter((c) => c.theme === "dark" && c.roleId.startsWith("text"));
      expect(dark.every((c) => c.passes), hex).toBe(true);
    }
  });
});

describe("suggestRoleShifts", () => {
  it("suggests nothing for a blue accent — semantics do not drive shifts", () => {
    expect(suggestRoleShifts(systemFor("#3b82f6"), SCALE_ROLES)).toEqual([]);
  });

  it("shifts light text for a yellow accent", () => {
    const shifts = suggestRoleShifts(systemFor("#eab308"), SCALE_ROLES);
    const text = shifts.find((s) => s.roleId === "text" && s.theme === "light")!;
    expect(text.from).toBe(6);
    expect(text.to).toBe(8);
  });

  it("suggests the minimum shift — one step less would still fail", () => {
    const scales = systemFor("#eab308");
    const shift = suggestRoleShifts(scales, SCALE_ROLES)
      .find((s) => s.roleId === "text" && s.theme === "light")!;
    const bg = scales.accent[0];
    expect(contrastRatio(scales.accent[shift.to], bg)).toBeGreaterThanOrEqual(AA_BODY);
    expect(contrastRatio(scales.accent[shift.to - 1], bg)).toBeLessThan(AA_BODY);
  });

  it("keeps text-strong darker than text after shifting", () => {
    const shifts = suggestRoleShifts(systemFor("#eab308"), SCALE_ROLES);
    const applied = applyRoleShifts(SCALE_ROLES, shifts);
    const idx = (id: string) => {
      const r = applied.find((x) => x.id === id)!;
      if (r.kind !== "stop") throw new Error("expected a stop role");
      return r.lightIndex;
    };
    expect(idx("text-strong")).toBeGreaterThan(idx("text"));
  });
});

describe("applyRoleShifts", () => {
  it("does not mutate the input roles", () => {
    const before = JSON.stringify(SCALE_ROLES);
    applyRoleShifts(SCALE_ROLES, suggestRoleShifts(systemFor("#eab308"), SCALE_ROLES));
    expect(JSON.stringify(SCALE_ROLES)).toBe(before);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run tests/color/contrast.test.ts`
Expected: FAIL — `checkContrast is not a function`

- [ ] **Step 3: 구현한다**

```ts
// src/color/contrast.ts 에 추가
import type { ScaleName, ScaleRole, ScaleSet } from "./roles.js";

export interface ContrastCheck {
  readonly scaleName: string;
  readonly roleId: string;
  readonly theme: "light" | "dark";
  /** 무엇을 배경으로 쟀는가. "solid"는 on-solid 검사에서만 나온다. */
  readonly against: "subtle-bg" | "page" | "solid";
  readonly ratio: number;
  readonly required: number;
  readonly passes: boolean;
  /** 사용자가 이 스케일을 바꿀 수 있는가 — 뱃지만 띄울지 고치기를 권할지 가른다. */
  readonly adjustable: boolean;
}

/** 어디로 옮길지. 상태·URL에 저장되는 것은 이쪽이다. */
export interface RoleOverride {
  readonly roleId: "text" | "text-strong";
  readonly theme: "light" | "dark";
  readonly to: number;
}

/** 제안. `from`은 화면에 "6 → 8"을 보여주기 위한 것이고 저장되지 않는다 —
 *  옛 링크가 옛 기본값을 실어 오면 안 되므로 URL에는 `to`만 싣는다. */
export interface RoleShift extends RoleOverride {
  readonly from: number;
}

/** 이동 제안의 입력이 되는 스케일. 상태색은 앵커가 고정이라 사용자가 바꿀 수 없고,
 *  그것 때문에 액센트까지 800번대로 끌어내리지 않는다 — 스펙 D4. */
const ADJUSTABLE: readonly string[] = ["accent", "neutral"];

const TEXT_ROLES: readonly ("text" | "text-strong")[] = ["text", "text-strong"];

function scaleEntries(scales: ScaleSet): [string, readonly string[]][] {
  return [
    ["accent", scales.accent],
    ["neutral", scales.neutral],
    ...Object.entries(scales.semantic),
  ];
}

function stopIndex(roles: readonly ScaleRole[], id: string, theme: "light" | "dark"): number {
  const r = roles.find((x) => x.id === id);
  if (!r || r.kind !== "stop") throw new Error(`stopIndex: no stop role "${id}"`);
  return theme === "light" ? r.lightIndex : r.darkIndex;
}

export function checkContrast(
  scales: ScaleSet,
  roles: readonly ScaleRole[],
): ContrastCheck[] {
  const out: ContrastCheck[] = [];
  for (const [name, hexes] of scaleEntries(scales)) {
    const adjustable = ADJUSTABLE.includes(name);
    for (const theme of ["light", "dark"] as const) {
      const subtleBg = hexes[stopIndex(roles, "subtle-bg", theme)];
      const page = theme === "light" ? scales.neutral[0] : scales.neutral[10];
      for (const roleId of TEXT_ROLES) {
        const fg = hexes[stopIndex(roles, roleId, theme)];
        for (const [against, bg] of [["subtle-bg", subtleBg], ["page", page]] as const) {
          const ratio = contrastRatio(fg, bg);
          out.push({
            scaleName: name, roleId, theme, against,
            ratio, required: AA_BODY, passes: ratio >= AA_BODY, adjustable,
          });
        }
      }
      // on-solid은 정의상 항상 통과한다(흑백 중 나은 쪽을 고르므로). 그래도 값을
      // 보고한다 — 노랑처럼 그 "나은 쪽"조차 아슬한 경우를 화면이 보여줘야 한다.
      if (theme === "light") {
        const solid = hexes[stopIndex(roles, "solid", "light")];
        const ratio = contrastRatio(onSolidColor(solid), solid);
        out.push({
          scaleName: name, roleId: "on-solid", theme: "light", against: "solid",
          ratio, required: AA_BODY, passes: ratio >= AA_BODY, adjustable,
        });
      }
    }
  }
  return out;
}

/** 이 인덱스가 조정 가능한 스케일 전부에서 AA를 통과하는가. */
function indexPasses(
  scales: ScaleSet,
  roles: readonly ScaleRole[],
  theme: "light" | "dark",
  index: number,
): boolean {
  const page = theme === "light" ? scales.neutral[0] : scales.neutral[10];
  const subtleIdx = stopIndex(roles, "subtle-bg", theme);
  return scaleEntries(scales)
    .filter(([name]) => ADJUSTABLE.includes(name))
    .every(([, hexes]) =>
      contrastRatio(hexes[index], hexes[subtleIdx]) >= AA_BODY &&
      contrastRatio(hexes[index], page) >= AA_BODY);
}

export function suggestRoleShifts(
  scales: ScaleSet,
  roles: readonly ScaleRole[],
): RoleShift[] {
  const out: RoleShift[] = [];
  for (const theme of ["light", "dark"] as const) {
    // 라이트는 진해지는 방향(인덱스 증가), 다크는 밝아지는 방향(감소).
    const step = theme === "light" ? 1 : -1;
    const last = theme === "light" ? 10 : 0;
    let floor: number | null = null; // text가 확정된 자리 — strong은 그보다 더 가야 한다
    for (const roleId of TEXT_ROLES) {
      const from = stopIndex(roles, roleId, theme);
      const start = floor === null ? from : floor + step;
      let found: number | null = null;
      for (let i = start; i >= 0 && i <= 10 && i * step <= last * step; i += step) {
        if (indexPasses(scales, roles, theme, i)) { found = i; break; }
      }
      if (found === null) continue;   // 어느 자리도 통과하지 못하면 제안하지 않는다
      floor = found;
      if (found !== from) out.push({ roleId, theme, from, to: found });
    }
  }
  return out;
}

export function applyRoleShifts(
  roles: readonly ScaleRole[],
  shifts: readonly RoleOverride[],
): ScaleRole[] {
  return roles.map((role) => {
    if (role.kind !== "stop") return role;
    const light = shifts.find((s) => s.roleId === role.id && s.theme === "light");
    const dark = shifts.find((s) => s.roleId === role.id && s.theme === "dark");
    if (!light && !dark) return role;
    return {
      ...role,
      lightIndex: light ? light.to : role.lightIndex,
      darkIndex: dark ? dark.to : role.darkIndex,
    };
  });
}
```

`start` 변수는 쓰이지 않으면 지운다 — `tsc --noEmit`이 잡는다.

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run tests/color/contrast.test.ts`
Expected: PASS (전체 16 tests)

측정치가 스펙과 다르면 **스펙이 아니라 구현을 의심한다** — 스펙의 숫자는 2026-08-15에 실제 엔진으로 잰 값이다.

- [ ] **Step 5: 커밋**

```bash
git add src/color/contrast.ts tests/color/contrast.test.ts
git commit -m "feat(color): 대비 검사와 최소 역할 이동 제안

이동 계산의 입력은 액센트·뉴트럴뿐이다. 라이트 텍스트 미달의 주범은
앵커가 고정된 상태색(warning 2.96 / success 3.03)인데, 그것 때문에
액센트까지 800번대로 끌어내리면 사용자가 바꿀 수 없는 것 때문에
바꿀 수 있는 것이 망가진다.

border는 검사하지 않는다 — 어떤 앵커에서도 1.19~1.36이고 3:1은
장식적 테두리에 붙는 요구가 아니다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `downloadFile` 공용화와 잔여 부채

**Files:**
- Create: `web/src/lib/download.ts` · `web/src/lib/download.test.ts`
- Modify: `web/src/builder/ExportPanel.tsx` · `web/src/result/DownloadPanel.tsx`

**Interfaces:**
- Produces: `downloadFile(filename: string, content: string, mime: string): void` · `copyText(text: string): Promise<boolean>` · `canCopy(): boolean`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
// web/src/lib/download.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadFile, canCopy } from "./download";

describe("downloadFile", () => {
  let created: string[];
  beforeEach(() => {
    created = [];
    URL.createObjectURL = vi.fn(() => { created.push("blob:x"); return "blob:x"; });
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it("attaches the anchor to the document before clicking", () => {
    let attachedAtClick = false;
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      attachedAtClick = document.body.contains(this);
    };
    downloadFile("a.css", "body{}", "text/css");
    HTMLAnchorElement.prototype.click = orig;
    // Firefox는 문서에 붙지 않은 앵커의 클릭을 무시한다.
    expect(attachedAtClick).toBe(true);
  });

  it("removes the anchor afterwards", () => {
    downloadFile("a.css", "body{}", "text/css");
    expect(document.querySelectorAll("a[download]").length).toBe(0);
  });

  it("does not revoke the object URL synchronously", () => {
    downloadFile("a.css", "body{}", "text/css");
    // 동기 해제는 Firefox에서 다운로드를 취소시킨다.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});

describe("canCopy", () => {
  it("is false when the clipboard API is absent (insecure context)", () => {
    const orig = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    expect(canCopy()).toBe(false);
    Object.defineProperty(navigator, "clipboard", { value: orig, configurable: true });
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && npx vitest run src/lib/download.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현한다**

```ts
// web/src/lib/download.ts
//
// 다운로드·복사의 단일 구현. 전에는 ExportPanel과 DownloadPanel에 같은 코드가
// 두 벌 있었고, 둘 다 Firefox에서 다운로드가 취소되는 문제를 갖고 있었다 —
// 앵커를 문서에 붙이지 않고 object URL을 동기 해제했다. 사본이 늘기 전에 하나로 모은다.

export function downloadFile(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Firefox는 문서에 붙지 않은 앵커의 프로그램적 클릭을 무시한다.
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 동기 해제하면 Firefox가 다운로드를 시작하기 전에 URL이 사라진다.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** 비보안 컨텍스트(LAN에서 `vite preview --host`)에서는 clipboard가 undefined다. */
export function canCopy(): boolean {
  return typeof navigator !== "undefined" && !!navigator.clipboard?.writeText;
}

export async function copyText(text: string): Promise<boolean> {
  if (!canCopy()) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: 두 소비처를 고친다**

`ExportPanel.tsx`와 `DownloadPanel.tsx`에서 각자의 `downloadFile` 정의를 지우고 `import { downloadFile, copyText, canCopy } from "../lib/download";`로 바꾼다. `ExportPanel`의 `copy CSS` 버튼은 `disabled={!canCopy()}`를 더하고 `onClick`을 `copyText(files.css)`로 바꾼다.

- [ ] **Step 5: 통과를 확인한다**

Run: `cd web && npx vitest run && npx tsc -b`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "fix(web): downloadFile 하나로 모으고 Firefox 취소 문제 해결

같은 코드가 ExportPanel과 DownloadPanel에 두 벌 있었다. 새 화면이
세 번째 사본을 만들기 전에 합치면서, 앵커를 문서에 붙이고 object URL
해제를 다음 틱으로 미룬다. clipboard 부재도 가드한다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: 상태 모델과 URL 직렬화

**Files:**
- Create: `web/src/color-palette/paletteState.ts` · `web/src/color-palette/paletteUrl.ts` · `web/src/color-palette/paletteUrl.test.ts`

**Interfaces:**
- Consumes: Task 1의 `fillScale`·`STOP_KEYS`·`Pin`, `buildNeutral`·`snapTint`·`TINT_ATTRACTORS`·`TINT_STRENGTHS`, `buildSemantic`·`SEMANTIC_ANCHORS`, `SCALE_ROLES`; Task 4의 `applyRoleShifts`·`RoleShift`
- Produces:
  - `interface PaletteState { accentHex: string; pins: Record<0|3|7|10, string | undefined>; tint: { attractorId: string; strength: "soft" | "strong" } | null; shifts: readonly RoleOverride[] }`
  - `ADJUSTABLE_STOPS: readonly [0, 3, 7, 10]`
  - `defaultState(accentHex?: string): PaletteState`
  - `deriveScales(state: PaletteState): ScaleSet`
  - `deriveRoles(state: PaletteState): ScaleRole[]`
  - `serialize(state: PaletteState): string` (선행 `?` 포함)
  - `parse(search: string): PaletteState`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
// web/src/color-palette/paletteUrl.test.ts
import { describe, it, expect } from "vitest";
import { serialize, parse } from "./paletteUrl";
import { defaultState, type PaletteState } from "./paletteState";

describe("serialize/parse round trip", () => {
  it("survives a full state", () => {
    const state: PaletteState = {
      accentHex: "#3b82f6",
      pins: { 0: "#f3f8ff", 3: "#9dc3ff", 7: undefined, 10: "#0f274e" },
      tint: { attractorId: "cool", strength: "strong" },
      // 저장되는 것은 RoleOverride다 — 제안의 `from`은 화면 표시용이라 URL에 없다.
      shifts: [{ roleId: "text", theme: "light", to: 8 }],
    };
    expect(parse(serialize(state))).toEqual(state);
  });

  it("omits defaults — accent-only state is a short URL", () => {
    const s = serialize(defaultState("#3b82f6"));
    expect(s).toBe("?v=1&a=3b82f6");
  });

  it("keeps achromatic tint without a strength suffix", () => {
    const state = { ...defaultState("#3b82f6"), tint: { attractorId: "achromatic", strength: "soft" as const } };
    expect(serialize(state)).toContain("n=achromatic");
    expect(parse(serialize(state)).tint!.attractorId).toBe("achromatic");
  });
});

describe("parse — 깨진 입력", () => {
  it("falls back to the default accent when the hex is malformed", () => {
    expect(parse("?v=1&a=zzz").accentHex).toBe(defaultState().accentHex);
  });

  it("ignores an unknown tint attractor", () => {
    expect(parse("?v=1&a=3b82f6&n=chartreuse-soft").tint).toBeNull();
  });

  it("ignores an out-of-range role shift", () => {
    expect(parse("?v=1&a=3b82f6&t=99-4").shifts).toEqual([]);
  });

  it("ignores an unknown format version", () => {
    expect(parse("?v=7&a=112233").accentHex).toBe(defaultState().accentHex);
  });

  it("never throws", () => {
    for (const s of ["", "?", "?v=1", "?a=", "?t=--", "?n=-", "?s0=nothex"]) {
      expect(() => parse(s), s).not.toThrow();
    }
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && npx vitest run src/color-palette/paletteUrl.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: `paletteState.ts`를 만든다**

```ts
// web/src/color-palette/paletteState.ts
//
// 화면 상태와 그로부터의 유도. 유도는 전부 src/color/의 순수 함수에 위임하고
// 여기서는 조립만 한다 — 판단은 엔진에, web/은 렌더만.

import { fillScale, type Pin } from "@core/color/scale.js";
import {
  buildNeutral, snapTint, TINT_ATTRACTORS, TINT_STRENGTHS, type NeutralTint,
} from "@core/color/neutral.js";
import { SEMANTIC_ANCHORS, buildSemantic } from "@core/color/semantic.js";
import { SCALE_ROLES, type ScaleRole, type ScaleSet } from "@core/color/roles.js";
import { applyRoleShifts, type RoleOverride } from "@core/color/contrast.js";
import { oklchToHex, parsePrimary } from "@core/generator/color.js";

/** 사용자가 조정할 수 있는 stop. RUI의 5-pick 중 앵커를 뺀 넷이다. */
export const ADJUSTABLE_STOPS = [0, 3, 7, 10] as const;
export type AdjustableStop = (typeof ADJUSTABLE_STOPS)[number];

export const DEFAULT_ACCENT = "#3b82f6";

export interface PaletteState {
  readonly accentHex: string;
  /** 조정한 stop의 hex. undefined = 곡선이 정한 기본값 그대로. */
  readonly pins: Readonly<Record<AdjustableStop, string | undefined>>;
  /** null = 액센트에서 자동 스냅. */
  readonly tint: { readonly attractorId: string; readonly strength: "soft" | "strong" } | null;
  /** 적용된 역할 이동. 제안(RoleShift)이 아니라 확정값(RoleOverride)을 담는다. */
  readonly shifts: readonly RoleOverride[];
}

export function defaultState(accentHex = DEFAULT_ACCENT): PaletteState {
  return { accentHex, pins: { 0: undefined, 3: undefined, 7: undefined, 10: undefined }, tint: null, shifts: [] };
}

function pinsOf(state: PaletteState): Pin[] {
  const anchor: Pin = { index: 5, color: parsePrimary(state.accentHex) };
  const rest = ADJUSTABLE_STOPS.flatMap((i) => {
    const hex = state.pins[i];
    return hex ? [{ index: i, color: parsePrimary(hex) }] : [];
  });
  return [anchor, ...rest];
}

/** 확정된 틴트. 사용자가 안 골랐으면 액센트 hue에서 스냅하고 강도는 은은. */
export function resolveTint(state: PaletteState): NeutralTint {
  if (!state.tint) {
    return { hue: snapTint(parsePrimary(state.accentHex).h).hue, strength: TINT_STRENGTHS.soft };
  }
  const attractor = TINT_ATTRACTORS.find((a) => a.id === state.tint!.attractorId);
  if (!attractor) {
    return { hue: snapTint(parsePrimary(state.accentHex).h).hue, strength: TINT_STRENGTHS.soft };
  }
  if (attractor.hue === null) return { hue: null, strength: 0 };
  return { hue: attractor.hue, strength: TINT_STRENGTHS[state.tint.strength] };
}

export function deriveScales(state: PaletteState): ScaleSet {
  return {
    accent: fillScale(pinsOf(state)).map(oklchToHex),
    neutral: buildNeutral(resolveTint(state)).map(oklchToHex),
    semantic: Object.fromEntries(
      SEMANTIC_ANCHORS.map((a) => [a.id, buildSemantic(a).map(oklchToHex)]),
    ) as ScaleSet["semantic"],
  };
}

export function deriveRoles(state: PaletteState): ScaleRole[] {
  return applyRoleShifts(SCALE_ROLES, state.shifts);
}
```

- [ ] **Step 4: `paletteUrl.ts`를 만든다**

```ts
// web/src/color-palette/paletteUrl.ts
//
// 상태 ↔ URL. pin을 옵션 번호가 아니라 hex로 저장하는 이유: 후보 상수는 앞으로
// 바뀔 물건이고, 번호로 저장하면 공유 링크가 가리키는 색이 조용히 달라진다.
//
// 파싱은 절대 던지지 않는다. URL은 사용자 입력이고, 남이 준 링크가 깨졌을 때
// 빈 화면을 주면 안 된다. 항목별로 기본값 폴백한다.

import { TINT_ATTRACTORS } from "@core/color/neutral.js";
import type { RoleOverride } from "@core/color/contrast.js";
import {
  ADJUSTABLE_STOPS, defaultState, type AdjustableStop, type PaletteState,
} from "./paletteState";

const VERSION = "1";
const HEX = /^[0-9a-f]{6}$/i;
const SHIFT_PARAM: Record<"text" | "text-strong", string> = { text: "t", "text-strong": "ts" };

const bare = (hex: string) => hex.replace(/^#/, "").toLowerCase();

export function serialize(state: PaletteState): string {
  const p = new URLSearchParams();
  p.set("v", VERSION);
  p.set("a", bare(state.accentHex));
  for (const i of ADJUSTABLE_STOPS) {
    const hex = state.pins[i];
    if (hex) p.set(`s${i}`, bare(hex));
  }
  if (state.tint) {
    const attractor = TINT_ATTRACTORS.find((a) => a.id === state.tint!.attractorId);
    // 무채색은 강도가 없다 — 붙이면 파싱할 때 무의미한 값이 하나 늘 뿐이다.
    p.set("n", attractor?.hue === null ? state.tint.attractorId : `${state.tint.attractorId}-${state.tint.strength}`);
  }
  for (const roleId of ["text", "text-strong"] as const) {
    const light = state.shifts.find((s) => s.roleId === roleId && s.theme === "light");
    const dark = state.shifts.find((s) => s.roleId === roleId && s.theme === "dark");
    if (!light && !dark) continue;
    p.set(SHIFT_PARAM[roleId], `${light?.to ?? ""}-${dark?.to ?? ""}`);
  }
  return `?${p.toString()}`;
}

const idx = (raw: string | null): number | null => {
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 10 ? n : null;
};

function parseShifts(p: URLSearchParams): RoleOverride[] {
  const out: RoleOverride[] = [];
  for (const roleId of ["text", "text-strong"] as const) {
    const raw = p.get(SHIFT_PARAM[roleId]);
    if (!raw) continue;
    const [l, d] = raw.split("-");
    const light = idx(l ?? null);
    const dark = idx(d ?? null);
    if (light !== null) out.push({ roleId, theme: "light", to: light });
    if (dark !== null) out.push({ roleId, theme: "dark", to: dark });
  }
  return out;
}

export function parse(search: string): PaletteState {
  const fallback = defaultState();
  let p: URLSearchParams;
  try {
    p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  } catch {
    return fallback;
  }
  if (p.get("v") !== VERSION) return fallback;

  const a = p.get("a");
  const accentHex = a && HEX.test(a) ? `#${a.toLowerCase()}` : fallback.accentHex;

  const pins = { ...fallback.pins } as Record<AdjustableStop, string | undefined>;
  for (const i of ADJUSTABLE_STOPS) {
    const raw = p.get(`s${i}`);
    if (raw && HEX.test(raw)) pins[i] = `#${raw.toLowerCase()}`;
  }

  let tint: PaletteState["tint"] = null;
  const n = p.get("n");
  if (n) {
    const [id, strength] = n.split("-");
    const attractor = TINT_ATTRACTORS.find((x) => x.id === id);
    if (attractor) {
      tint = {
        attractorId: id,
        strength: strength === "strong" ? "strong" : "soft",
      };
    }
  }

  return { accentHex, pins, tint, shifts: parseShifts(p) };
}
```

- [ ] **Step 5: 통과를 확인한다**

Run: `cd web && npx vitest run src/color-palette/ && npx tsc -b`
Expected: PASS (10 tests)

- [ ] **Step 6: 커밋**

```bash
git add web/src/color-palette
git commit -m "feat(web): 팔레트 상태 모델과 URL 직렬화

pin은 옵션 번호가 아니라 hex로 싣는다 — 후보 상수가 바뀌면 번호로 저장한
공유 링크가 가리키는 색이 조용히 달라진다.

파싱은 던지지 않는다. URL은 사용자 입력이고 남이 준 링크가 깨졌을 때
빈 화면을 주면 안 된다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `/color-palette` 라우트

**Files:**
- Modify: `web/src/App.tsx`
- Test: `web/src/App.test.tsx` (신설)

**Interfaces:**
- Consumes: Task 8이 만들 `ColorPalettePage` — **이 태스크에서는 자리표시자 컴포넌트를 인라인으로 두고 Task 8이 교체한다.**
- Produces: 경로 `/color-palette`에서 색 도구가, `/`에서 위저드가, `#lab`·`#builder`에서 기존 화면이 뜬다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```tsx
// web/src/App.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

function goTo(path: string) {
  window.history.pushState({}, "", path);
}

describe("App 라우팅", () => {
  beforeEach(() => goTo("/"));

  it("renders the colour tool at /color-palette", () => {
    goTo("/color-palette");
    render(<App />);
    expect(screen.getByRole("heading", { name: /팔레트/ })).toBeTruthy();
  });

  it("still renders the guided builder at #builder", () => {
    goTo("/#builder");
    render(<App />);
    expect(screen.getByText("Guided Palette Builder")).toBeTruthy();
  });

  it("responds to popstate", () => {
    goTo("/color-palette");
    const { container } = render(<App />);
    goTo("/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(container.textContent).not.toContain("Guided Palette Builder");
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && npx vitest run src/App.test.tsx`
Expected: FAIL — `/color-palette`에서 위저드가 뜬다

- [ ] **Step 3: `App.tsx`를 고친다**

```tsx
import { useEffect, useState } from "react";
import { ResultPage } from "./result/ResultPage";
import { DEFAULT_STATE, useGenerateResult, type WizardState } from "./hooks/useGenerator";
import { LabPage } from "./lab/LabPage";
import { BuilderPage } from "./builder/BuilderPage";
import { ColorPalettePage } from "./color-palette/ColorPalettePage";

/** 화면이 넷뿐이라 라우터 라이브러리를 넣지 않는다. path는 새 도구만 쓰고
 *  기존 연구 화면은 해시를 유지한다 — 북마크를 깨지 않기 위해. */
function useLocation() {
  const read = () => ({ path: window.location.pathname, hash: window.location.hash });
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const onChange = () => setLoc(read());
    window.addEventListener("popstate", onChange);
    window.addEventListener("hashchange", onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener("hashchange", onChange);
    };
  }, []);
  return loc;
}

export function App() {
  const { path, hash } = useLocation();
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  const result = useGenerateResult(state);

  if (path === "/color-palette") return <ColorPalettePage />;
  if (hash === "#lab") return <LabPage />;
  if (hash === "#builder") return <BuilderPage />;

  const update = (partial: Partial<WizardState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  return <ResultPage state={state} result={result} onChange={update} />;
}
```

- [ ] **Step 4: 최소 `ColorPalettePage`를 만든다 (Task 8이 채운다)**

```tsx
// web/src/color-palette/ColorPalettePage.tsx
export function ColorPalettePage() {
  return <h1>컬러 팔레트</h1>;
}
```

- [ ] **Step 5: 통과를 확인한다**

Run: `cd web && npx vitest run && npx tsc -b`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(web): /color-palette 라우트

화면이 넷뿐이라 라우터 라이브러리를 넣지 않는다. path는 새 도구만 쓰고
기존 연구 화면(#lab·#builder)은 해시를 유지해 북마크를 깨지 않는다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: 화면 뼈대 — 액센트 입력 · 팔레트 · 목업

**Files:**
- Create: `web/src/color-palette/AccentInput.tsx` · `AdjustableScale.tsx` · `PreviewPane.tsx`
- Modify: `web/src/color-palette/ColorPalettePage.tsx`
- Test: `web/src/color-palette/ColorPalettePage.test.tsx`

**Interfaces:**
- Consumes: Task 6의 `PaletteState`·`defaultState`·`deriveScales`·`deriveRoles`·`serialize`·`parse`·`ADJUSTABLE_STOPS`; Task 2의 `onSolidColor`; `STOP_KEYS`
- Produces:
  - `<AccentInput hex={string} onChange={(hex: string) => void} />`
  - `<AdjustableScale hexes={readonly string[]} adjustable={readonly number[]} pinned={readonly number[]} onPick={(stopIndex: number) => void} preview={readonly string[] | null} />`
  - `<PreviewPane scales={ScaleSet} roles={readonly ScaleRole[]} />`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```tsx
// web/src/color-palette/ColorPalettePage.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ColorPalettePage } from "./ColorPalettePage";

beforeEach(() => window.history.replaceState({}, "", "/color-palette"));

describe("ColorPalettePage", () => {
  it("renders a complete palette from the default accent alone", () => {
    render(<ColorPalettePage />);
    // 11 stop × (액센트 + 뉴트럴 + 상태색 4) = 66 스와치
    expect(screen.getAllByTestId("swatch").length).toBe(66);
  });

  it("shows both light and dark mockups at once", () => {
    render(<ColorPalettePage />);
    expect(screen.getByTestId("mock-light")).toBeTruthy();
    expect(screen.getByTestId("mock-dark")).toBeTruthy();
  });

  it("marks exactly four accent stops as adjustable", () => {
    render(<ColorPalettePage />);
    expect(screen.getAllByRole("button", { name: /조정/ }).length).toBe(4);
  });

  it("writes the accent into the URL", () => {
    render(<ColorPalettePage />);
    fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#eab308" } });
    expect(window.location.search).toContain("a=eab308");
  });

  it("restores state from the URL on mount", () => {
    window.history.replaceState({}, "", "/color-palette?v=1&a=eab308");
    render(<ColorPalettePage />);
    expect((screen.getByLabelText("액센트 hex") as HTMLInputElement).value).toBe("#eab308");
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && npx vitest run src/color-palette/ColorPalettePage.test.tsx`
Expected: FAIL — `swatch` 테스트 id가 없다

- [ ] **Step 3: `AdjustableScale.tsx`**

```tsx
// web/src/color-palette/AdjustableScale.tsx
//
// 11-stop 띠. 조정 가능한 자리는 누르기 전에 구분되게 표시한다 — "눌러보면 뭔가
// 나온다"는 발견에 기대지 않는다 (스펙 D3).

import { STOP_KEYS } from "@core/color/scale.js";

interface Props {
  readonly hexes: readonly string[];
  readonly adjustable: readonly number[];
  readonly pinned: readonly number[];
  readonly onPick?: (stopIndex: number) => void;
  /** 후보 hover 중이면 그 스케일을 대신 그린다. 확정 아님. */
  readonly preview?: readonly string[] | null;
}

export function AdjustableScale({ hexes, adjustable, pinned, onPick, preview }: Props) {
  const shown = preview ?? hexes;
  return (
    <div className="flex gap-0.5">
      {shown.map((hex, i) => {
        const canAdjust = adjustable.includes(i);
        const label = `${STOP_KEYS[i]} ${hex}${canAdjust ? " — 조정" : ""}`;
        return (
          <div key={STOP_KEYS[i]} className="flex-1">
            {canAdjust && onPick ? (
              <button
                type="button"
                aria-label={label}
                data-testid="swatch"
                onClick={() => onPick(i)}
                className={`block w-full h-9 rounded-sm border ${
                  pinned.includes(i) ? "border-neutral-900" : "border-neutral-300"
                } hover:ring-2 hover:ring-neutral-900 hover:ring-offset-1`}
                style={{ background: hex }}
              />
            ) : (
              <div
                aria-label={label}
                data-testid="swatch"
                className="w-full h-9 rounded-sm border border-neutral-200"
                style={{ background: hex }}
              />
            )}
            <div className="mt-1 text-center text-[9px] font-mono text-neutral-400">
              {STOP_KEYS[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: `AccentInput.tsx`**

```tsx
// web/src/color-palette/AccentInput.tsx
import { OklchPicker } from "../components/OklchPicker";

export function AccentInput({
  hex, onChange,
}: { readonly hex: string; readonly onChange: (hex: string) => void }) {
  return (
    <div className="flex items-start gap-6">
      <OklchPicker hex={hex} onChange={onChange} />
      <label className="text-xs text-neutral-500">
        <span className="block mb-1">액센트 hex</span>
        <input
          aria-label="액센트 hex"
          value={hex}
          onChange={(e) => {
            const v = e.target.value;
            // 형식 위반은 거부하고 마지막 유효값을 유지한다 (기존 빌더와 같은 동작).
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toLowerCase());
          }}
          className="border border-neutral-300 rounded px-2 py-1 text-sm font-mono w-28"
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 5: `PreviewPane.tsx`**

`BuilderPage`의 `MockPanel`을 가져오되 뉴트럴 배경과 상태색 배지를 포함하고 `on-solid`을 쓴다. 라이트·다크를 **동시에** 그린다.

```tsx
// web/src/color-palette/PreviewPane.tsx
//
// 라이트·다크를 토글이 아니라 동시에 보여준다 — 대비 실패는 다크에서만 나는
// 경우가 흔한데 토글이면 그것을 못 보고 지나간다 (스펙 D8).

import type { CSSProperties } from "react";
import { onSolidColor } from "@core/color/contrast.js";
import type { ScaleRole, ScaleSet } from "@core/color/roles.js";

function stopIdx(roles: readonly ScaleRole[], id: string, theme: "light" | "dark"): number {
  const r = roles.find((x) => x.id === id);
  if (!r || r.kind !== "stop") throw new Error(`PreviewPane: no stop role "${id}"`);
  return theme === "light" ? r.lightIndex : r.darkIndex;
}

function Mock({
  theme, scales, roles,
}: { theme: "light" | "dark"; scales: ScaleSet; roles: readonly ScaleRole[] }) {
  const at = (hexes: readonly string[], id: string) => hexes[stopIdx(roles, id, theme)];
  const a = scales.accent;
  const err = scales.semantic.error;
  const vars = {
    background: theme === "light" ? scales.neutral[0] : scales.neutral[10],
  } as CSSProperties;
  return (
    <div data-testid={`mock-${theme}`} className="rounded-lg p-4 space-y-3" style={vars}>
      <div
        className="rounded-md p-3 space-y-1 border"
        style={{ background: at(a, "subtle-bg"), borderColor: at(a, "border") }}
      >
        <div className="text-[11px] font-semibold" style={{ color: at(a, "text-strong") }}>
          알림 카드 제목
        </div>
        <div className="text-[11px]" style={{ color: at(a, "text") }}>
          링크 텍스트가 이 색으로 보입니다
        </div>
      </div>
      <div className="flex gap-2">
        <span
          className="rounded px-2.5 py-1 text-[11px] font-medium"
          style={{
            background: at(a, "solid"),
            color: onSolidColor(at(a, "solid")),
          }}
        >
          솔리드 버튼
        </span>
        <span
          className="rounded px-2.5 py-1 text-[11px] font-medium"
          style={{ background: at(err, "subtle-bg"), color: at(err, "text-strong") }}
        >
          오류 배지
        </span>
      </div>
    </div>
  );
}

export function PreviewPane({
  scales, roles,
}: { readonly scales: ScaleSet; readonly roles: readonly ScaleRole[] }) {
  return (
    <div className="space-y-3">
      <Mock theme="light" scales={scales} roles={roles} />
      <Mock theme="dark" scales={scales} roles={roles} />
    </div>
  );
}
```

- [ ] **Step 6: `ColorPalettePage.tsx`를 조립한다**

```tsx
// web/src/color-palette/ColorPalettePage.tsx
import { useEffect, useMemo, useState } from "react";
import { STOP_KEYS } from "@core/color/scale.js";
import { SEMANTIC_ANCHORS } from "@core/color/semantic.js";
import {
  ADJUSTABLE_STOPS, defaultState, deriveRoles, deriveScales, type PaletteState,
} from "./paletteState";
import { parse, serialize } from "./paletteUrl";
import { AccentInput } from "./AccentInput";
import { AdjustableScale } from "./AdjustableScale";
import { PreviewPane } from "./PreviewPane";

export function ColorPalettePage() {
  const [state, setState] = useState<PaletteState>(() => parse(window.location.search));

  // replaceState다 — 클릭마다 히스토리가 쌓이면 뒤로가기가 조정 하나하나를 되짚는다.
  useEffect(() => {
    window.history.replaceState({}, "", `${window.location.pathname}${serialize(state)}`);
  }, [state]);

  const scales = useMemo(() => deriveScales(state), [state]);
  const roles = useMemo(() => deriveRoles(state), [state]);
  const pinned = ADJUSTABLE_STOPS.filter((i) => state.pins[i] !== undefined);

  return (
    <div className="max-w-5xl mx-auto p-8 grid grid-cols-[1fr_320px] gap-8 items-start">
      <div className="space-y-6">
        <h1 className="text-lg font-semibold">컬러 팔레트</h1>
        <AccentInput
          hex={state.accentHex}
          onChange={(accentHex) => setState((s) => ({ ...s, accentHex }))}
        />
        <section className="space-y-1">
          <h2 className="text-xs font-medium text-neutral-500">액센트</h2>
          <AdjustableScale
            hexes={scales.accent}
            adjustable={[...ADJUSTABLE_STOPS]}
            pinned={pinned}
            onPick={() => {}}
          />
        </section>
        <section className="space-y-1">
          <h2 className="text-xs font-medium text-neutral-500">뉴트럴</h2>
          <AdjustableScale hexes={scales.neutral} adjustable={[]} pinned={[]} />
        </section>
        <section className="space-y-2">
          <h2 className="text-xs font-medium text-neutral-500">상태색</h2>
          {SEMANTIC_ANCHORS.map((a) => (
            <div key={a.id}>
              <div className="text-[10px] text-neutral-400">{a.label}</div>
              <AdjustableScale hexes={scales.semantic[a.id]} adjustable={[]} pinned={[]} />
            </div>
          ))}
        </section>
      </div>
      <div className="sticky top-8">
        <PreviewPane scales={scales} roles={roles} />
      </div>
    </div>
  );
}
```

`STOP_KEYS` import가 쓰이지 않으면 지운다.

- [ ] **Step 7: 통과를 확인한다**

Run: `cd web && npx vitest run && npx tsc -b`
Expected: PASS

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "feat(web): 팔레트 화면 뼈대 — 즉시 결과 + 상시 목업

액센트 하나만으로 6스케일이 전부 나온다. 목업은 라이트·다크를 동시에
그린다 — 대비 실패는 다크에서만 나는 경우가 흔하다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 후보 팝오버 — 제자리 조정

**Files:**
- Create: `web/src/color-palette/CandidatePopover.tsx`
- Modify: `web/src/color-palette/ColorPalettePage.tsx` · `ColorPalettePage.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `candidatesFor(stopIndex, pins)`·`Candidate`; Task 8의 `AdjustableScale`의 `preview` prop
- Produces: `<CandidatePopover stopIndex={number} state={PaletteState} onHover={(hex: string | null) => void} onChoose={(hex: string | null) => void} onClose={() => void} />` — `onChoose(null)`은 "기본으로"

- [ ] **Step 1: 실패하는 테스트를 더한다**

```tsx
// ColorPalettePage.test.tsx 에 추가
it("opens three candidates when an adjustable stop is clicked", () => {
  render(<ColorPalettePage />);
  fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[0]);
  expect(screen.getAllByRole("radio").length).toBe(3);
});

it("changes the palette in place when a candidate is chosen", () => {
  render(<ColorPalettePage />);
  const before = screen.getAllByTestId("swatch")[0].getAttribute("style");
  fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[0]);
  fireEvent.click(screen.getAllByRole("radio")[2]);
  expect(screen.getAllByTestId("swatch")[0].getAttribute("style")).not.toBe(before);
});

it("records the chosen stop in the URL", () => {
  render(<ColorPalettePage />);
  fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[0]);
  fireEvent.click(screen.getAllByRole("radio")[2]);
  expect(window.location.search).toContain("s0=");
});

it("reverts to the curve default", () => {
  render(<ColorPalettePage />);
  fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[0]);
  fireEvent.click(screen.getAllByRole("radio")[2]);
  fireEvent.click(screen.getAllByRole("button", { name: /조정/ })[0]);
  fireEvent.click(screen.getByRole("button", { name: "기본으로" }));
  expect(window.location.search).not.toContain("s0=");
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && npx vitest run src/color-palette/ColorPalettePage.test.tsx`
Expected: FAIL — radio가 없다

- [ ] **Step 3: `CandidatePopover.tsx`를 만든다**

```tsx
// web/src/color-palette/CandidatePopover.tsx
//
// 후보 3개. hover하면 팔레트와 목업이 그 색으로 다시 그려지고(확정 아님),
// 클릭해야 확정된다 — 고르기 전에 결과를 본다 (스펙 D3).
// 후보의 note(교보재 카피)는 이 화면에서 읽지 않는다 (스펙 D9).

import { candidatesFor } from "@core/color/candidates.js";
import { fillScale, type Pin } from "@core/color/scale.js";
import { oklchToHex, parsePrimary } from "@core/generator/color.js";
import { ADJUSTABLE_STOPS, type PaletteState } from "./paletteState";

interface Props {
  readonly stopIndex: number;
  readonly state: PaletteState;
  readonly onHover: (hex: string | null) => void;
  readonly onChoose: (hex: string | null) => void;
  readonly onClose: () => void;
}

/** 이 stop을 뺀 나머지 확정 pin — 후보는 그 문맥 위에서 계산된다. */
function contextPins(state: PaletteState, stopIndex: number): Pin[] {
  const anchor: Pin = { index: 5, color: parsePrimary(state.accentHex) };
  const rest = ADJUSTABLE_STOPS.flatMap((i) => {
    const hex = state.pins[i];
    return i !== stopIndex && hex ? [{ index: i, color: parsePrimary(hex) }] : [];
  });
  return [anchor, ...rest];
}

export function CandidatePopover({ stopIndex, state, onHover, onChoose, onClose }: Props) {
  const pins = contextPins(state, stopIndex);
  const candidates = candidatesFor(stopIndex, pins);
  const current = state.pins[stopIndex as 0 | 3 | 7 | 10];

  return (
    <div
      className="mt-2 rounded-lg border border-neutral-300 bg-white p-2 shadow-lg"
      onMouseLeave={() => onHover(null)}
    >
      {candidates.map((cd) => {
        const hex = oklchToHex(cd.color);
        return (
          <label
            key={cd.label}
            className="flex items-center gap-2 rounded p-1.5 cursor-pointer hover:bg-neutral-50"
            onMouseEnter={() => onHover(hex)}
          >
            <input
              type="radio"
              name={`cand-${stopIndex}`}
              checked={current === hex}
              onChange={() => { onChoose(hex); onClose(); }}
            />
            <span
              className="inline-block w-5 h-5 rounded-sm border border-neutral-200"
              style={{ background: hex }}
            />
            <span className="text-xs">{cd.label}</span>
          </label>
        );
      })}
      <button
        type="button"
        className="mt-1 w-full rounded px-2 py-1 text-[11px] text-neutral-500 hover:bg-neutral-50"
        onClick={() => { onChoose(null); onClose(); }}
      >
        기본으로
      </button>
    </div>
  );
}

/** hover 중인 후보를 끼운 미리보기 스케일. 확정 상태를 건드리지 않는다. */
export function previewScale(
  state: PaletteState,
  stopIndex: number,
  hex: string,
): string[] {
  return fillScale([
    ...contextPins(state, stopIndex),
    { index: stopIndex, color: parsePrimary(hex) },
  ]).map(oklchToHex);
}
```

- [ ] **Step 4: `ColorPalettePage.tsx`에 연결한다**

`useState`로 `open: number | null`과 `hover: string | null`을 더하고, 액센트 섹션을 다음으로 바꾼다:

```tsx
        <section className="space-y-1">
          <h2 className="text-xs font-medium text-neutral-500">액센트</h2>
          <AdjustableScale
            hexes={scales.accent}
            adjustable={[...ADJUSTABLE_STOPS]}
            pinned={pinned}
            onPick={(i) => { setOpen(open === i ? null : i); setHover(null); }}
            preview={open !== null && hover ? previewScale(state, open, hover) : null}
          />
          {open !== null && (
            <CandidatePopover
              stopIndex={open}
              state={state}
              onHover={setHover}
              onChoose={(hex) =>
                setState((s) => ({ ...s, pins: { ...s.pins, [open]: hex ?? undefined } }))
              }
              onClose={() => { setOpen(null); setHover(null); }}
            />
          )}
        </section>
```

`PreviewPane`에도 hover 프리뷰가 반영되도록, `scales`를 다음으로 감싼다:

```tsx
  const shownScales = useMemo(
    () =>
      open !== null && hover
        ? { ...scales, accent: previewScale(state, open, hover) }
        : scales,
    [scales, open, hover, state],
  );
```

`PreviewPane`에 `shownScales`를 넘긴다.

- [ ] **Step 5: 통과를 확인한다**

Run: `cd web && npx vitest run && npx tsc -b`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(web): 후보 팝오버 — 제자리 조정과 hover 프리뷰

고르는 단위와 보여주는 단위를 맞춘다. 팔레트가 제자리에서 바뀌므로
300을 건드릴 때 사이 구간(100·200·400)이 같이 움직이는 것이 보인다 —
스트립 넷을 눈으로 비교하던 문제가 여기서 사라진다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: 뉴트럴 틴트 선택

**Files:**
- Create: `web/src/color-palette/NeutralControl.tsx`
- Modify: `web/src/color-palette/ColorPalettePage.tsx` · `ColorPalettePage.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `TINT_ATTRACTORS`·`snapTint`; Task 6의 `PaletteState.tint`
- Produces: `<NeutralControl state={PaletteState} onChange={(tint: PaletteState["tint"]) => void} />`

- [ ] **Step 1: 실패하는 테스트를 더한다**

```tsx
it("offers all five tint attractors and marks the snapped one", () => {
  render(<ColorPalettePage />);
  expect(screen.getAllByRole("button", { name: /그레이|무채색/ }).length).toBe(5);
  expect(screen.getByTestId("snapped-tint").textContent).toContain("쿨");
});

it("records a chosen tint in the URL", () => {
  render(<ColorPalettePage />);
  fireEvent.click(screen.getByRole("button", { name: /웜 그레이/ }));
  expect(window.location.search).toContain("n=warm");
});

it("drops the strength for the achromatic tint", () => {
  render(<ColorPalettePage />);
  fireEvent.click(screen.getByRole("button", { name: /무채색/ }));
  expect(window.location.search).toContain("n=achromatic");
  expect(window.location.search).not.toContain("achromatic-");
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && npx vitest run src/color-palette/ColorPalettePage.test.tsx`
Expected: FAIL

- [ ] **Step 3: `NeutralControl.tsx`를 만든다**

```tsx
// web/src/color-palette/NeutralControl.tsx
//
// 틴트 어트랙터 5개 + 강도 2단. 기본은 액센트 hue에서 스냅된 자리이고,
// 사용자가 다른 칩으로 덮을 수 있다. 어느 칩이 자동으로 붙은 자리인지는
// 표식으로 알린다 — 판단(스냅)은 엔진이 하고 여긴 렌더만 한다.

import { TINT_ATTRACTORS, snapTint } from "@core/color/neutral.js";
import { parsePrimary } from "@core/generator/color.js";
import type { PaletteState } from "./paletteState";

interface Props {
  readonly state: PaletteState;
  readonly onChange: (tint: PaletteState["tint"]) => void;
}

export function NeutralControl({ state, onChange }: Props) {
  const snapped = snapTint(parsePrimary(state.accentHex).h);
  const activeId = state.tint?.attractorId ?? snapped.id;
  const strength = state.tint?.strength ?? "soft";
  const achromatic = activeId === "achromatic";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {TINT_ATTRACTORS.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-label={a.label}
            onClick={() => onChange({ attractorId: a.id, strength })}
            className={`rounded px-2 py-1 text-[11px] border ${
              activeId === a.id
                ? "border-neutral-900 font-medium"
                : "border-neutral-200 hover:border-neutral-400"
            }`}
          >
            {a.label}
            {a.id === snapped.id && <span className="ml-1 text-neutral-400">•</span>}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span data-testid="snapped-tint" className="text-[10px] text-neutral-400">
          • = 당신의 액센트에서 자동으로 붙은 자리 ({snapped.label})
        </span>
      </div>
      {!achromatic && (
        <div className="flex gap-1.5">
          {(["soft", "strong"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ attractorId: activeId, strength: s })}
              className={`rounded px-2 py-0.5 text-[11px] border ${
                strength === s ? "border-neutral-900 font-medium" : "border-neutral-200"
              }`}
            >
              {s === "soft" ? "은은" : "뚜렷"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 페이지의 뉴트럴 섹션에 넣는다**

```tsx
        <section className="space-y-2">
          <h2 className="text-xs font-medium text-neutral-500">뉴트럴</h2>
          <AdjustableScale hexes={scales.neutral} adjustable={[]} pinned={[]} />
          <NeutralControl
            state={state}
            onChange={(tint) => setState((s) => ({ ...s, tint }))}
          />
        </section>
```

- [ ] **Step 5: 통과를 확인한다**

Run: `cd web && npx vitest run && npx tsc -b`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(web): 뉴트럴 틴트 직접 선택

자동 스냅을 기본으로 두되 5개 어트랙터를 직접 고를 수 있게 연다.
어느 자리가 자동으로 붙은 곳인지는 표식으로 알린다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: 대비 뱃지와 "한 번에 고치기"

**Files:**
- Modify: `web/src/color-palette/PreviewPane.tsx` · `ColorPalettePage.tsx` · `ColorPalettePage.test.tsx`

**Interfaces:**
- Consumes: Task 4의 `checkContrast`·`suggestRoleShifts`·`ContrastCheck`·`RoleShift`·`RoleOverride`
- Produces: `PreviewPane`이 `checks: readonly ContrastCheck[]`·`shifts: readonly RoleShift[]`·`hasApplied: boolean`·`onApplyShifts: () => void`·`onResetShifts: () => void`를 더 받는다

- [ ] **Step 1: 실패하는 테스트를 더한다**

```tsx
it("shows the known warning failure as a badge", () => {
  render(<ColorPalettePage />);
  expect(screen.getByText(/경고.*2\.9/)).toBeTruthy();
});

it("offers no fix for a blue accent", () => {
  window.history.replaceState({}, "", "/color-palette?v=1&a=3b82f6");
  render(<ColorPalettePage />);
  expect(screen.queryByRole("button", { name: "한 번에 고치기" })).toBeNull();
});

it("offers and applies a fix for a yellow accent", () => {
  window.history.replaceState({}, "", "/color-palette?v=1&a=eab308");
  render(<ColorPalettePage />);
  fireEvent.click(screen.getByRole("button", { name: "한 번에 고치기" }));
  expect(window.location.search).toMatch(/t=8-/);
});

it("keeps the applied shift after the accent changes", () => {
  window.history.replaceState({}, "", "/color-palette?v=1&a=eab308");
  render(<ColorPalettePage />);
  fireEvent.click(screen.getByRole("button", { name: "한 번에 고치기" }));
  fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#3b82f6" } });
  expect(window.location.search).toMatch(/t=8-/);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && npx vitest run src/color-palette/ColorPalettePage.test.tsx`
Expected: FAIL

- [ ] **Step 3: `PreviewPane`에 뱃지를 더한다**

`PreviewPane`의 props에 `checks`·`shifts`·`onApplyShifts`·`onResetShifts`를 더하고, 두 목업 아래에 다음을 그린다:

```tsx
      {failing.length > 0 && (
        <div className="space-y-1 rounded-md border border-neutral-200 p-2">
          {failing.map((c) => (
            <div key={`${c.scaleName}-${c.roleId}-${c.theme}-${c.against}`} className="text-[10px] text-neutral-500">
              <span className="text-amber-600">⚠</span>{" "}
              {LABELS[c.scaleName] ?? c.scaleName} {c.roleId} ({c.theme === "light" ? "라이트" : "다크"}){" "}
              <span className="font-mono">{c.ratio.toFixed(2)}</span> / {c.required}
            </div>
          ))}
          {shifts.length > 0 && (
            <button
              type="button"
              onClick={onApplyShifts}
              className="mt-1 w-full rounded border border-neutral-800 px-2 py-1 text-[11px]"
            >
              한 번에 고치기
            </button>
          )}
          {shifts.length === 0 && hasApplied && (
            <button
              type="button"
              onClick={onResetShifts}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-[11px] text-neutral-500"
            >
              역할 기본값으로
            </button>
          )}
        </div>
      )}
```

`failing = checks.filter((c) => !c.passes)`. `LABELS`는 `SCALE_ORDER`에서 만든다:

```tsx
const LABELS: Record<string, string> = Object.fromEntries(
  SCALE_ORDER.map((d) => [d.name, d.label]),
);
```

- [ ] **Step 4: 페이지에서 계산해 넘긴다**

```tsx
  const checks = useMemo(() => checkContrast(shownScales, roles), [shownScales, roles]);
  const shifts = useMemo(() => suggestRoleShifts(shownScales, roles), [shownScales, roles]);
```

`hasApplied`는 `state.shifts.length > 0`. 두 핸들러는 이렇게 쓴다 — **제안(`RoleShift`)에서 `from`을 떼어 확정값(`RoleOverride`)만 저장한다**:

```tsx
  const onApplyShifts = () =>
    setState((s) => ({
      ...s,
      shifts: shifts.map(({ roleId, theme, to }) => ({ roleId, theme, to })),
    }));
  const onResetShifts = () => setState((s) => ({ ...s, shifts: [] }));
```

**이동의 수명:** 액센트가 바뀌어도 `state.shifts`는 유지된다. 새 액센트에서 미달이 다시 생기면 `suggestRoleShifts`가 새 제안을 내고 버튼이 다시 뜬다 — 도구가 사용자가 확정한 값을 몰래 되돌리지 않는다 (스펙 D6).

- [ ] **Step 5: 통과를 확인한다**

Run: `cd web && npx vitest run && npx tsc -b`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(web): 대비 뱃지와 한 번에 고치기

상태색 미달은 알리기만 하고, 사용자가 바꿀 수 있는 액센트·뉴트럴만
이동을 제안한다. 적용된 이동은 액센트를 바꿔도 유지된다 — 도구가
사용자가 확정한 값을 몰래 되돌리지 않는다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: 다운로드와 엔진↔파일 고리 닫기

**Files:**
- Create: `web/src/color-palette/DownloadRow.tsx`
- Modify: `web/src/color-palette/ColorPalettePage.tsx` · `ColorPalettePage.test.tsx`

**Interfaces:**
- Consumes: Task 3의 산출 함수들(`@core/export/color/index.js`), Task 5의 `downloadFile`·`copyText`·`canCopy`, Task 6의 `deriveScales`·`deriveRoles`
- Produces: `<DownloadRow scales={ScaleSet} roles={readonly ScaleRole[]} />`

- [ ] **Step 1: 실패하는 테스트를 더한다**

```tsx
it("puts the real palette into the downloaded file", () => {
  const blobs: string[] = [];
  const orig = URL.createObjectURL;
  URL.createObjectURL = ((blob: Blob) => {
    // jsdom의 Blob은 text()가 Promise라 동기로 못 읽는다 — 생성 인자를 가로챈다.
    blobs.push((blob as unknown as { __text?: string }).__text ?? "");
    return "blob:x";
  }) as typeof URL.createObjectURL;

  render(<ColorPalettePage />);
  fireEvent.click(screen.getByRole("button", { name: "palette.css" }));
  URL.createObjectURL = orig;

  expect(blobs[0]).toContain("--color-accent-500");
  expect(blobs[0]).toContain("--color-accent-on-solid");
});
```

**주의:** jsdom의 `Blob`은 동기 `text()`가 없다. `web/vitest.setup.ts`에 다음을 더해 Blob 내용을 노출한다:

```ts
// 다운로드 경로 테스트가 Blob 내용을 동기로 확인할 수 있게 한다.
// 프로덕션 코드는 이 프로퍼티를 읽지 않는다 — 테스트 전용 관측 지점이다.
const RealBlob = globalThis.Blob;
globalThis.Blob = class extends RealBlob {
  __text: string;
  constructor(parts: BlobPart[] = [], options?: BlobPropertyBag) {
    super(parts, options);
    this.__text = parts.map(String).join("");
  }
} as unknown as typeof Blob;
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && npx vitest run src/color-palette/ColorPalettePage.test.tsx`
Expected: FAIL — 버튼이 없다

- [ ] **Step 3: `DownloadRow.tsx`를 만든다**

```tsx
// web/src/color-palette/DownloadRow.tsx
import { useMemo } from "react";
import {
  generateColorCss, generateColorThemeCss, renderColorDesignMd, toColorFigma, toColorSystem,
} from "@core/export/color/index.js";
import { SCALE_ORDER, type ScaleRole, type ScaleSet } from "@core/color/roles.js";
import { STOP_KEYS } from "@core/color/scale.js";
import { canCopy, copyText, downloadFile } from "../lib/download";

const btn =
  "px-3 py-1.5 rounded-md border border-neutral-200 bg-white text-[11px] font-medium " +
  "text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors";

export function DownloadRow({
  scales, roles,
}: { readonly scales: ScaleSet; readonly roles: readonly ScaleRole[] }) {
  const files = useMemo(() => {
    const system = toColorSystem(scales, SCALE_ORDER, roles, STOP_KEYS);
    return {
      css: generateColorCss(system),
      themeCss: generateColorThemeCss(system),
      figma: JSON.stringify(toColorFigma(system), null, 2),
      designMd: renderColorDesignMd(system),
    };
  }, [scales, roles]);

  const items: [string, string, string][] = [
    ["palette.css", files.css, "text/css"],
    ["palette.theme.css", files.themeCss, "text/css"],
    ["palette.figma.json", files.figma, "application/json"],
    ["DESIGN.md", files.designMd, "text/markdown"],
  ];

  return (
    <div className="flex flex-wrap gap-2 border-t border-neutral-200 pt-4">
      {items.map(([name, content, mime]) => (
        <button key={name} type="button" className={btn}
          onClick={() => downloadFile(name, content, mime)}>
          {name}
        </button>
      ))}
      <button type="button" disabled={!canCopy()}
        className="px-3 py-1.5 text-[11px] text-neutral-400 hover:text-neutral-700 disabled:opacity-40"
        onClick={() => void copyText(files.css)}>
        copy CSS
      </button>
    </div>
  );
}
```

- [ ] **Step 4: 페이지 하단에 붙인다**

`ColorPalettePage`의 왼쪽 열 맨 아래에 `<DownloadRow scales={scales} roles={roles} />`를 넣는다. **`shownScales`가 아니라 `scales`다** — hover 프리뷰는 확정 상태가 아니므로 다운로드에 들어가면 안 된다.

- [ ] **Step 5: 통과를 확인한다**

```bash
cd web && npx vitest run && npx tsc -b
cd .. && pnpm test && npx tsc --noEmit
```

Expected: 전부 PASS

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(web): 팔레트 다운로드와 엔진↔파일 고리 테스트

URL.createObjectURL을 가로채 Blob 내용에 --color-accent-500과
--color-accent-on-solid이 들어있는지 확인한다. 엔진 테스트와 사용자가
실제로 받는 파일 사이를 자동으로 잇는 것이 지금까지 없었다.

hover 프리뷰는 다운로드에 들어가지 않는다 — 확정 상태가 아니다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: BACKLOG 갱신

**Files:**
- Modify: `docs/BACKLOG.md` · `docs/superpowers/specs/2026-08-10-palette-color-export-design.md`

- [ ] **Step 1: 해소된 항목을 옮긴다**

`docs/BACKLOG.md`에서 지운다:
- 3.1 `src/lab/`이 제품 경로다 (Task 1이 해소)
- 3.2 `web/` 커버리지가 얇다 — 다운로드 경로 테스트 (Task 12가 해소)
- 1.3 저장·공유 (Task 6이 URL로 해소, localStorage는 이월로 남긴다)
- 4의 `downloadFile` Firefox · `navigator.clipboard` · `adapter.ts`의 `!hexes` · `role.id` 중복 가드 · 화면의 다크 시연 중복
- 뉴트럴 어트랙터 직접 선택 (Task 10이 해소)

"해소 기록" 표에 행을 더한다. `2026-08-10-palette-color-export-design.md`의 D1에 해소 표시를 단다 (원본은 각 스펙이라는 규칙).

**BACKLOG에 새로 더할 것:**
- 상태색 텍스트가 라이트 테마에서 AA 미달인 채 산출된다 (스펙의 알려진 한계 1)
- 역할 이동이 전역이다 (한계 2)
- `/color-palette`가 정적 호스팅에서 rewrite를 요구한다 (한계 5)

- [ ] **Step 2: 커밋**

```bash
git add docs/
git commit -m "docs: 사이클 3 해소 항목 반영

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review 결과

**스펙 커버리지**

| 스펙 | 태스크 |
| --- | --- |
| D1 엔진 졸업 | Task 1 |
| D2 라우트 | Task 7 |
| D3 즉시 결과 + 제자리 조정 | Task 8·9 |
| D4 대비 기준·검사 대상·이동 규칙 | Task 2·4·11 |
| D5 on-solid + ExportRole 유니온 | Task 3 |
| D6 URL | Task 6·11 |
| D7 상태색 노출 | Task 8 |
| D8 라이트·다크 동시 | Task 8 |
| D9 교보재 미노출 | Task 8·9 (note를 읽지 않는다) |
| 부채 상환 | Task 3(adapter·assert)·5(download·clipboard) |
| 테스트 전 항목 | Task 2·4·5·6·8·9·10·11·12 |

**미해결로 남기는 것 (의도적):** 스펙의 "알려진 한계" 6항목은 전부 Task 13에서 BACKLOG로 넘긴다.
