# Accent Scale Derivation Research Track — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브랜드 hex 1개 → 액센트 스케일 유도 알고리즘 5종(v1 현행, 나이브 컨트롤, Material HCT, Adobe Leonardo, Radix 포팅)을 공통 인터페이스로 구현하고, Tailwind/Radix 레퍼런스 재현력(ΔE) 벤치마크 + web `#lab` 비교 랩으로 평가 기반을 만든다.

**Architecture:** 알고리즘은 `src/lab/accent-scale/`의 순수 함수 모듈 (제품 `src/generator/`는 lab을 import하지 않음; lab→generator 방향도 쓰지 않고 필요한 테이블은 복제). 벤치마크 CLI는 `scripts/analysis/`, 레퍼런스 팔레트는 `data/references/` JSON으로 고정. web은 `@core` alias로 같은 모듈을 소비해 `#lab` 해시 라우트에서 눈 평가.

**Tech Stack:** TypeScript (Node16 ESM — src 내 상대 import는 `.js` 확장자 필수), culori, vitest, tsx (스크립트 실행), React 19 + Vite (web). 신규 devDeps: `tailwindcss`(데이터 소스), `@radix-ui/colors`, `@material/material-color-utilities`, `@adobe/leonardo-contrast-colors`.

**Spec:** `docs/superpowers/specs/2026-07-21-accent-scale-derivation-design.md`

## Global Constraints

- 브랜치: `research/accent-scale-derivation` (main에서 새로 생성; Task 1 Step 1에서 만든 뒤 모든 작업은 이 브랜치에서)
- 커밋 프리픽스: `docs(color):` 연구 문서 / `feat(lab):` 랩 코드·데이터 / `test(lab):` 테스트만
- 커밋 트레일러(모든 커밋): `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- `src/generator/`, `src/schema/` 등 제품 코드는 **수정 금지** (web의 `App.tsx` 해시 분기 + `vite.config.ts` alias 추가만 예외)
- src 내 상대 import는 `.js` 확장자 필수 (`"module": "Node16"`)
- FP 스타일: 순수 함수, 로직/렌더 분리 (UI 컴포넌트에 계산 로직 넣지 않기)
- 테스트는 `tests/**/*.test.ts` (root vitest가 수집; web 쪽엔 테스트 러너 없음 — 테스트 필요한 로직은 전부 `src/lab/`에)
- 스케일 방향 규약: 모든 `derive` 결과는 **밝은 색 → 어두운 색** 순서

## File Structure

```
src/lab/accent-scale/
  types.ts        # AccentAlgorithm 인터페이스, ScaleSpec
  metric.ts       # deltaEOk, hueFamily
  v1.ts           # v1 현행 어댑터 (CHROMATIC_STEPS 복제본 기반)
  naive.ts        # 나이브 OKLCH 보간 컨트롤
  hct.ts          # Material HCT 어댑터
  leonardo.ts     # Adobe Leonardo 어댑터
  radix.ts        # Radix custom-color 포팅
  bench.ts        # 벤치마크 계산 + 집계 + 리포트 렌더 (순수)
  index.ts        # ALGORITHMS 레지스트리, nativeScale, nearestReferences
scripts/analysis/
  accent-scale-refs.ts    # 레퍼런스 팔레트 추출 CLI → data/references/*.json
  accent-scale-bench.ts   # 벤치마크 CLI → docs/research/accent-scale-bench-report.md
  accent-scale/
    extract-references.ts # theme.css 파서 + radix 필터 (순수)
data/references/
  tailwind-v4.json / radix-light.json
web/src/lab/LabPage.tsx   # #lab 라우트 UI
tests/lab/*.test.ts, tests/analysis/accent-scale-refs.test.ts
docs/research/accent-derivation-survey.md
docs/research/accent-scale-bench-report.md  # 생성물 (스크립트가 재생성)
```

---

### Task 1: 브랜치 생성 + 알고리즘 서베이 문서

**Files:**
- Create: `docs/research/accent-derivation-survey.md`

**Interfaces:**
- Produces: 서베이 문서. 특히 **Radix 알고리즘의 정확한 소스 파일 URL + 커밋 해시 + 라이선스**를 기록 — Task 8이 이를 소비한다.

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout main && git pull --ff-only 2>/dev/null; git checkout -b research/accent-scale-derivation
```

- [ ] **Step 2: 각 알고리즘 조사 (WebFetch/WebSearch 사용)**

조사 소스 (시작점; 링크가 이동했으면 검색으로 현재 위치 확인):
1. **Material HCT** — https://github.com/material-foundation/material-color-utilities (README + `typescript/palettes/tonal_palette.ts`). HCT 색공간이 무엇인지(CAM16 hue/chroma + L* tone), tonal palette가 tone만 바꾸는 방식, chroma가 gamut에 따라 잘리는 동작.
2. **Adobe Leonardo** — https://github.com/adobe/leonardo (`packages/contrast-colors` README). 콘트라스트 비율 기반 보간, colorKeys/ratios/smooth 파라미터, 어떤 색공간에서 보간하는지.
3. **Radix custom color** — https://github.com/radix-ui/website 리포에서 `generateRadixColors` 파일을 찾는다 (예상 경로 `components/generateRadixColors.ts`; GitHub 코드 검색 "generateRadixColors" 사용). **정확한 파일 경로, 최신 커밋 해시, 라이선스(MIT 여부)를 문서에 기록.** 알고리즘 요지: 입력 색을 기존 radix 스케일에 스냅 후 보정하는지, 어떤 색공간/이징을 쓰는지.
4. **Tailwind v4** — 알고리즘이 아니라 손튜닝 레퍼런스임을 명시. `node_modules/tailwindcss/theme.css`의 oklch 값 구조(22 hue × 11 stop) 확인.
5. **v1 현행** — `src/generator/color.ts:32-43` CHROMATIC_STEPS 테이블 요약 (고정 L 사다리 + cMult 곡선, 입력 L 무시).

- [ ] **Step 3: 서베이 문서 작성**

`docs/research/accent-derivation-survey.md`. 알고리즘마다 동일한 섹션 구조:

```markdown
# Accent Derivation Survey

_2026-07-XX. 스펙: docs/superpowers/specs/2026-07-21-accent-scale-derivation-design.md.
각 알고리즘의 메커니즘 요약 + 가이드드 빌더의 후보 생성기로 쓸 수 있는지 평가._

## <알고리즘 이름>
- **소스**: <URL, 버전/커밋, 라이선스>
- **색공간**: <OKLCH / HCT / ...>
- **커브 형태**: <L을 어떻게 배치하는가 — 고정 사다리 / 콘트라스트 비율 / tone>
- **채도 처리**: <스케일 끝단에서 C를 어떻게 줄이는가>
- **앵커 의미**: <입력 색이 스케일 어디에 놓이는가; 입력 L을 존중하는가>
- **후보 생성기 관점**: <이 알고리즘에서 "선택지 축"으로 노출할 만한 파라미터>
- **포팅/패키지 결정**: <npm 패키지 사용 / 포팅 필요 + 예상 난이도>
```

말미에 비교 표 1개 (알고리즘 × {색공간, 앵커 존중, 파라미터 수}).

- [ ] **Step 4: 커밋**

```bash
git add docs/research/accent-derivation-survey.md
git commit -m "docs(color): accent derivation algorithm survey

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 의존성 + 레퍼런스 팔레트 데이터 추출

**Files:**
- Modify: `package.json` (devDependencies 4개 + scripts 2개 추가)
- Create: `scripts/analysis/accent-scale/extract-references.ts`
- Create: `scripts/analysis/accent-scale-refs.ts`
- Create: `data/references/tailwind-v4.json`, `data/references/radix-light.json` (스크립트 실행 산출물)
- Test: `tests/analysis/accent-scale-refs.test.ts`

**Interfaces:**
- Produces: `ReferenceSet` JSON 형식 (아래) — Task 5/8/9가 소비.

```ts
// data/references/*.json 공통 형식
interface ReferenceSet {
  source: string;        // "tailwind" | "radix"
  version: string;       // 설치된 패키지 버전
  anchorIndex: number;   // tailwind: 5 (500), radix: 8 (step 9)
  stopKeys: string[];    // tailwind: ["50","100",...,"950"], radix: ["1"..."12"]
  palettes: Record<string, string[]>;  // hue 이름 → hex 배열 (밝은→어두운)
}
```

- [ ] **Step 1: devDeps 설치**

```bash
pnpm add -D tailwindcss @radix-ui/colors @material/material-color-utilities @adobe/leonardo-contrast-colors
```

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/analysis/accent-scale-refs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  parseTailwindTheme,
  radixLightScales,
} from "../../scripts/analysis/accent-scale/extract-references.ts";

const SAMPLE_THEME = `
:root {
  --color-red-50: oklch(0.971 0.013 17.38);
  --color-red-500: oklch(0.637 0.237 25.331);
  --color-red-950: oklch(0.258 0.092 26.042);
  --color-black: #000;
  --spacing: 0.25rem;
}
`;

describe("parseTailwindTheme", () => {
  it("collects hue → stop → hex, ignoring non-scale vars", () => {
    const palettes = parseTailwindTheme(SAMPLE_THEME, ["50", "500", "950"]);
    expect(Object.keys(palettes)).toEqual(["red"]);
    expect(palettes.red).toHaveLength(3);
    // oklch(0.971 0.013 17.38) → 밝은 빨강 계열 hex
    expect(palettes.red[0]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("drops hues missing any requested stop", () => {
    const palettes = parseTailwindTheme(SAMPLE_THEME, ["50", "100"]);
    expect(palettes).toEqual({});
  });
});

describe("radixLightScales", () => {
  it("keeps only 12-step light scales (no Dark/A/P3, no gray family)", () => {
    const scales = radixLightScales();
    expect(scales.blue).toHaveLength(12);
    expect(scales).not.toHaveProperty("blueDark");
    expect(scales).not.toHaveProperty("blueA");
    expect(scales).not.toHaveProperty("slate");
    // 모두 hex 문자열
    expect(scales.blue.every((s: string) => /^#[0-9a-f]{6}$/i.test(s))).toBe(true);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm vitest run tests/analysis/accent-scale-refs.test.ts`
Expected: FAIL — `Cannot find module .../extract-references.ts`

- [ ] **Step 4: 구현**

`scripts/analysis/accent-scale/extract-references.ts`:

```ts
// scripts/analysis/accent-scale/extract-references.ts
//
// 레퍼런스 팔레트 추출 (순수 함수부).
// - Tailwind v4: node_modules/tailwindcss/theme.css 의 --color-<hue>-<stop> oklch 변수 파싱
// - Radix: @radix-ui/colors 의 light 스케일만 필터
// 산출 형식은 data/references/*.json 의 ReferenceSet (plan Task 2 참조).

import { formatHex, parse } from "culori";
import * as radix from "@radix-ui/colors";

const VAR_RE = /--color-([a-z]+)-(\d+):\s*(oklch\([^)]+\))/g;

/** theme.css 텍스트에서 hue → hex[] (stopKeys 순서) 추출.
 *  요청한 stop이 하나라도 없는 hue는 제외. */
export function parseTailwindTheme(
  css: string,
  stopKeys: readonly string[],
): Record<string, string[]> {
  const byHue = new Map<string, Map<string, string>>();
  for (const m of css.matchAll(VAR_RE)) {
    const [, hue, stop, oklch] = m;
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
```

`scripts/analysis/accent-scale-refs.ts` (CLI 엔트리):

```ts
// scripts/analysis/accent-scale-refs.ts
//
// pnpm accent-scale-refs → data/references/{tailwind-v4,radix-light}.json 재생성.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import {
  parseTailwindTheme,
  radixLightScales,
} from "./accent-scale/extract-references.ts";

const require = createRequire(import.meta.url);

const TW_STOPS = ["50","100","200","300","400","500","600","700","800","900","950"];

function pkgVersion(name: string): string {
  return (require(`${name}/package.json`) as { version: string }).version;
}

mkdirSync("data/references", { recursive: true });

const themeCss = readFileSync(
  require.resolve("tailwindcss/theme.css"),
  "utf8",
);
writeFileSync(
  "data/references/tailwind-v4.json",
  JSON.stringify(
    {
      source: "tailwind",
      version: pkgVersion("tailwindcss"),
      anchorIndex: 5,
      stopKeys: TW_STOPS,
      palettes: parseTailwindTheme(themeCss, TW_STOPS),
    },
    null,
    2,
  ) + "\n",
);

writeFileSync(
  "data/references/radix-light.json",
  JSON.stringify(
    {
      source: "radix",
      version: pkgVersion("@radix-ui/colors"),
      anchorIndex: 8,
      stopKeys: ["1","2","3","4","5","6","7","8","9","10","11","12"],
      palettes: radixLightScales(),
    },
    null,
    2,
  ) + "\n",
);

console.log("wrote data/references/tailwind-v4.json, radix-light.json");
```

`package.json` scripts에 추가:

```json
"accent-scale-refs": "tsx scripts/analysis/accent-scale-refs.ts",
```

주의: `require.resolve("tailwindcss/theme.css")`가 v4 exports map에 막히면 `import.meta.resolve` 또는 `node_modules/tailwindcss/theme.css` 직접 경로로 대체.

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm vitest run tests/analysis/accent-scale-refs.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: 추출 실행 + 산출물 검증**

```bash
pnpm accent-scale-refs
node -e "const t=require('./data/references/tailwind-v4.json'); const r=require('./data/references/radix-light.json'); console.log(Object.keys(t.palettes).length, 'tw hues /', Object.keys(r.palettes).length, 'radix hues');"
```

Expected: tailwind hue 수 ≈ 22 (17~22 허용 — 버전에 따라 다름), radix hue 수 ≈ 20+. 0이면 파서/필터 버그.

- [ ] **Step 7: 커밋**

```bash
git add package.json pnpm-lock.yaml scripts/analysis/accent-scale-refs.ts scripts/analysis/accent-scale tests/analysis/accent-scale-refs.test.ts data/references
git commit -m "feat(lab): reference palette extraction (tailwind v4 + radix light)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 메트릭 모듈 (ΔE + hue family)

**Files:**
- Create: `src/lab/accent-scale/metric.ts`
- Test: `tests/lab/metric.test.ts`

**Interfaces:**
- Produces: `deltaEOk(a: string, b: string): number` (hex 2개 → Oklab 유클리드 거리), `hueFamily(h: number): HueFamily` — Task 5/8/9가 소비.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/lab/metric.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { deltaEOk, hueFamily } from "../../src/lab/accent-scale/metric.js";

describe("deltaEOk", () => {
  it("is 0 for identical colors", () => {
    expect(deltaEOk("#3b82f6", "#3b82f6")).toBe(0);
  });
  it("is ~1 for white vs black (Oklab L 1→0)", () => {
    expect(deltaEOk("#ffffff", "#000000")).toBeCloseTo(1, 1);
  });
  it("is small for near-identical colors", () => {
    expect(deltaEOk("#3b82f6", "#3b83f7")).toBeLessThan(0.01);
  });
});

describe("hueFamily", () => {
  // 경계는 accent-baseline.md 의 family 구간을 따른다
  it.each([
    [0, "red"], [355, "red"], [30, "orange"], [60, "yellow"],
    [100, "green"], [180, "cyan"], [255, "blue"], [280, "purple"], [330, "magenta"],
  ])("classifies h=%d as %s", (h, family) => {
    expect(hueFamily(h as number)).toBe(family);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tests/lab/metric.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 구현**

`src/lab/accent-scale/metric.ts`:

```ts
// src/lab/accent-scale/metric.ts
//
// 벤치마크 메트릭. ΔE(OK) = Oklab 유클리드 거리 (0 = 동일, ~1 = 흰↔검).
// hue family 경계는 docs/research/accent-baseline.md 와 동일.

import { converter } from "culori";

const toOklab = converter("oklab");

export function deltaEOk(hexA: string, hexB: string): number {
  const a = toOklab(hexA);
  const b = toOklab(hexB);
  if (!a || !b) throw new Error(`unparseable color: ${hexA} / ${hexB}`);
  const dl = (a.l ?? 0) - (b.l ?? 0);
  const da = ((a.a as number) ?? 0) - ((b.a as number) ?? 0);
  const db = ((a.b as number) ?? 0) - ((b.b as number) ?? 0);
  return Math.sqrt(dl * dl + da * da + db * db);
}

export type HueFamily =
  | "red" | "orange" | "yellow" | "green"
  | "cyan" | "blue" | "purple" | "magenta";

const FAMILY_BOUNDS: readonly [HueFamily, number, number][] = [
  ["orange", 20, 50],
  ["yellow", 50, 80],
  ["green", 80, 160],
  ["cyan", 160, 200],
  ["blue", 200, 260],
  ["purple", 260, 310],
  ["magenta", 310, 350],
];

/** OKLCH hue(deg) → family. 350–360 / 0–20 은 red. */
export function hueFamily(h: number): HueFamily {
  const hh = ((h % 360) + 360) % 360;
  for (const [family, lo, hi] of FAMILY_BOUNDS) {
    if (hh >= lo && hh < hi) return family;
  }
  return "red";
}
```

주의: culori.d.ts의 `Color` 인터페이스에 `a`/`b` 필드가 없으므로 `[key: string]: unknown` 인덱스를 통해 접근 — 캐스팅이 지저분하면 `src/culori.d.ts`의 `Color`에 `a?: number; b?: number;`를 추가해도 된다 (타입 선언 파일이라 제품 로직 수정에 해당하지 않음).

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/lab/metric.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lab/accent-scale/metric.ts tests/lab/metric.test.ts src/culori.d.ts
git commit -m "feat(lab): deltaE(OK) metric + hue family classifier

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 알고리즘 인터페이스 + v1 어댑터 + 나이브 컨트롤

**Files:**
- Create: `src/lab/accent-scale/types.ts`, `src/lab/accent-scale/v1.ts`, `src/lab/accent-scale/naive.ts`
- Test: `tests/lab/algorithms.test.ts`

**Interfaces:**
- Produces (모든 후속 태스크가 소비):

```ts
export interface ScaleSpec { count: number; anchorIndex: number; }
export interface AccentAlgorithm {
  id: string;             // "v1" | "naive" | "hct" | "leonardo" | "radix"
  label: string;          // 랩 UI 표시용
  nativeSpec: ScaleSpec;  // 랩에서 보여줄 기본 stop 구성
  derive(anchorHex: string, spec: ScaleSpec): Oklch[];  // 밝은→어두운
}
```

- `v1Algorithm: AccentAlgorithm`, `naiveAlgorithm: AccentAlgorithm`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/lab/algorithms.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { v1Algorithm } from "../../src/lab/accent-scale/v1.js";
import { naiveAlgorithm } from "../../src/lab/accent-scale/naive.js";
import type { AccentAlgorithm } from "../../src/lab/accent-scale/types.js";

const SPEC = { count: 11, anchorIndex: 5 };
const ANCHOR = "#3b82f6"; // tailwind blue-500 근방

function checkContract(algo: AccentAlgorithm) {
  const scale = algo.derive(ANCHOR, SPEC);
  it(`${algo.id}: returns spec.count colors`, () => {
    expect(scale).toHaveLength(SPEC.count);
  });
  it(`${algo.id}: lightness strictly decreases (밝은→어두운)`, () => {
    for (let i = 1; i < scale.length; i++) {
      expect(scale[i].l).toBeLessThan(scale[i - 1].l);
    }
  });
  it(`${algo.id}: preserves anchor hue within 15deg`, () => {
    for (const c of scale) {
      if (c.c < 0.02) continue; // 무채색 끝단은 hue 무의미
      let d = Math.abs(c.h - 259.2) % 360; // #3b82f6 ≈ oklch h 259.2
      if (d > 180) d = 360 - d;
      expect(d).toBeLessThan(15);
    }
  });
}

describe("v1Algorithm", () => checkContract(v1Algorithm));
describe("naiveAlgorithm", () => {
  checkContract(naiveAlgorithm);
  it("returns the anchor color exactly at anchorIndex", () => {
    const scale = naiveAlgorithm.derive(ANCHOR, SPEC);
    const anchor = scale[SPEC.anchorIndex];
    expect(anchor.l).toBeCloseTo(0.6, 1); // #3b82f6 L≈0.62
    expect(anchor.c).toBeGreaterThan(0.15);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tests/lab/algorithms.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 구현**

`src/lab/accent-scale/types.ts`:

```ts
// src/lab/accent-scale/types.ts
//
// 유도 알고리즘 공통 인터페이스. 실험 코드 — 제품 파이프라인에서 import 금지.

import type { Oklch } from "../../schema/types.js";

export interface ScaleSpec {
  /** 생성할 stop 수 */
  count: number;
  /** 입력(앵커) 색이 놓이는 위치 (0-based, 밝은→어두운) */
  anchorIndex: number;
}

export interface AccentAlgorithm {
  id: string;
  label: string;
  /** 랩 UI가 기본으로 보여줄 stop 구성 */
  nativeSpec: ScaleSpec;
  /** 밝은→어두운 순서의 Oklch 배열 반환 */
  derive(anchorHex: string, spec: ScaleSpec): Oklch[];
}
```

`src/lab/accent-scale/v1.ts`:

```ts
// src/lab/accent-scale/v1.ts
//
// v1 현행 유도의 어댑터. 곡선 테이블은 src/generator/color.ts CHROMATIC_STEPS
// 의 복제본 — 연구 격리를 위해 제품 파일을 export 변경 없이 그대로 둔다.
// v1 특성: 입력 색의 C/H만 쓰고 L은 고정 사다리 (입력 L 무시).

import { parsePrimary } from "../../generator/color.js";
import type { Oklch } from "../../schema/types.js";
import type { AccentAlgorithm, ScaleSpec } from "./types.js";

// src/generator/color.ts:32-43 복제 (2026-07-21 기준)
const V1_CURVE: readonly { l: number; cMult: number }[] = [
  { l: 0.96, cMult: 0.3 },
  { l: 0.91, cMult: 0.45 },
  { l: 0.84, cMult: 0.6 },
  { l: 0.74, cMult: 0.75 },
  { l: 0.64, cMult: 0.9 },
  { l: 0.55, cMult: 0.97 },
  { l: 0.45, cMult: 1.0 },
  { l: 0.35, cMult: 0.95 },
  { l: 0.23, cMult: 0.65 },
  { l: 0.14, cMult: 0.5 },
];

/** 0..1 위치 p에서 V1_CURVE를 구간 선형 보간 */
function sampleCurve(p: number): { l: number; cMult: number } {
  const x = p * (V1_CURVE.length - 1);
  const i = Math.min(Math.floor(x), V1_CURVE.length - 2);
  const t = x - i;
  const a = V1_CURVE[i];
  const b = V1_CURVE[i + 1];
  return { l: a.l + (b.l - a.l) * t, cMult: a.cMult + (b.cMult - a.cMult) * t };
}

export const v1Algorithm: AccentAlgorithm = {
  id: "v1",
  label: "v1 현행 (고정 L 사다리)",
  nativeSpec: { count: 10, anchorIndex: 6 },
  derive(anchorHex: string, spec: ScaleSpec): Oklch[] {
    const anchor = parsePrimary(anchorHex);
    return Array.from({ length: spec.count }, (_, i) => {
      const { l, cMult } = sampleCurve(i / (spec.count - 1));
      return { l, c: anchor.c * cMult, h: anchor.h };
    });
  },
};
```

`src/lab/accent-scale/naive.ts`:

```ts
// src/lab/accent-scale/naive.ts
//
// 나이브 컨트롤: OKLCH에서 흰 근방 → 앵커 → 검정 근방을 L/C 선형 보간.
// "알고리즘 없음"의 하한 기준점. 앵커는 anchorIndex에 정확히 놓인다.

import { parsePrimary } from "../../generator/color.js";
import type { Oklch } from "../../schema/types.js";
import type { AccentAlgorithm, ScaleSpec } from "./types.js";

const LIGHT_END = { l: 0.98, c: 0.005 };
const DARK_END = { l: 0.1, c: 0.005 };

export const naiveAlgorithm: AccentAlgorithm = {
  id: "naive",
  label: "나이브 보간 (컨트롤)",
  nativeSpec: { count: 11, anchorIndex: 5 },
  derive(anchorHex: string, spec: ScaleSpec): Oklch[] {
    const anchor = parsePrimary(anchorHex);
    return Array.from({ length: spec.count }, (_, i) => {
      if (i === spec.anchorIndex) return { ...anchor };
      if (i < spec.anchorIndex) {
        const t = i / spec.anchorIndex; // 0=밝은 끝, 1=앵커
        return {
          l: LIGHT_END.l + (anchor.l - LIGHT_END.l) * t,
          c: LIGHT_END.c + (anchor.c - LIGHT_END.c) * t,
          h: anchor.h,
        };
      }
      const t = (i - spec.anchorIndex) / (spec.count - 1 - spec.anchorIndex);
      return {
        l: anchor.l + (DARK_END.l - anchor.l) * t,
        c: anchor.c + (DARK_END.c - anchor.c) * t,
        h: anchor.h,
      };
    });
  },
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/lab/algorithms.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lab/accent-scale/types.ts src/lab/accent-scale/v1.ts src/lab/accent-scale/naive.ts tests/lab/algorithms.test.ts
git commit -m "feat(lab): algorithm interface + v1 adapter + naive control

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 벤치마크 하네스 + 리포트 CLI

**Files:**
- Create: `src/lab/accent-scale/bench.ts`
- Create: `scripts/analysis/accent-scale-bench.ts`
- Modify: `package.json` (script 1개)
- Create: `docs/research/accent-scale-bench-report.md` (실행 산출물)
- Test: `tests/lab/bench.test.ts`

**Interfaces:**
- Consumes: Task 2의 `ReferenceSet` JSON, Task 3 `deltaEOk`/`hueFamily`, Task 4 `AccentAlgorithm`
- Produces: `benchAll(algos, refSets): PaletteResult[]`, `summarize(results)`, `corpusStats(algo, refSets)`, `renderReport(...)` — Task 6/7/8은 레지스트리에 알고리즘만 추가하면 이 하네스가 그대로 돈다.

```ts
export interface PaletteResult {
  algorithmId: string;
  source: string;       // "tailwind" | "radix"
  palette: string;      // "blue" 등
  family: HueFamily;    // 앵커 색 기준
  perStop: number[];    // stop별 ΔE(OK)
  mean: number;
  max: number;
}
```

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/lab/bench.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  benchPalette,
  summarize,
  corpusStats,
  renderReport,
} from "../../src/lab/accent-scale/bench.js";
import { naiveAlgorithm } from "../../src/lab/accent-scale/naive.js";
import type { ReferenceSet } from "../../src/lab/accent-scale/bench.js";

// 2-stop 초소형 레퍼런스 (파랑 계열): 검증 가능한 크기
const TINY_REF: ReferenceSet = {
  source: "tiny",
  version: "0",
  anchorIndex: 1,
  stopKeys: ["a", "b"],
  palettes: { blue: ["#dbeafe", "#3b82f6"] },
};

describe("benchPalette", () => {
  it("anchor stop has ~0 ΔE for naive (앵커를 그대로 반환하므로)", () => {
    const r = benchPalette(naiveAlgorithm, TINY_REF, "blue");
    expect(r.perStop).toHaveLength(2);
    // hex→oklch→hex 왕복 라운딩이 있어 정확히 0은 아님
    expect(r.perStop[1]).toBeLessThan(0.01);
    expect(r.family).toBe("blue");
    expect(r.mean).toBeCloseTo((r.perStop[0] + r.perStop[1]) / 2, 10);
    expect(r.max).toBeCloseTo(Math.max(r.perStop[0], r.perStop[1]), 10);
  });
});

describe("summarize", () => {
  it("aggregates mean/max per algorithm and per family", () => {
    const rows = [
      { algorithmId: "x", source: "s", palette: "p1", family: "blue" as const, perStop: [], mean: 0.1, max: 0.2 },
      { algorithmId: "x", source: "s", palette: "p2", family: "red" as const, perStop: [], mean: 0.3, max: 0.4 },
    ];
    const s = summarize(rows);
    expect(s.byAlgorithm.x.mean).toBeCloseTo(0.2, 5);
    expect(s.byAlgorithm.x.max).toBeCloseTo(0.4, 5);
    expect(s.byAlgorithmFamily.x.blue.mean).toBeCloseTo(0.1, 5);
  });
});

describe("corpusStats", () => {
  it("reports median C_max and anchor-window L range", () => {
    const s = corpusStats(naiveAlgorithm, [TINY_REF]);
    expect(s.medianCMax).toBeGreaterThan(0);
    expect(s.medianLLow).toBeLessThanOrEqual(s.medianLHigh);
  });
});

describe("renderReport", () => {
  it("emits a markdown doc with per-algorithm summary table", () => {
    const rows = [benchPalette(naiveAlgorithm, TINY_REF, "blue")];
    const md = renderReport(rows, [naiveAlgorithm], [TINY_REF]);
    expect(md).toContain("# Accent Scale Bench Report");
    expect(md).toContain("| naive |");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tests/lab/bench.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 구현**

`src/lab/accent-scale/bench.ts`:

```ts
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
```

`scripts/analysis/accent-scale-bench.ts`:

```ts
// scripts/analysis/accent-scale-bench.ts
//
// pnpm accent-scale-bench → docs/research/accent-scale-bench-report.md 재생성.

import { readFileSync, writeFileSync } from "node:fs";
import {
  benchAll,
  renderReport,
  type ReferenceSet,
} from "../../src/lab/accent-scale/bench.js";
import { ALGORITHMS } from "../../src/lab/accent-scale/index.js";

const refSets: ReferenceSet[] = [
  JSON.parse(readFileSync("data/references/tailwind-v4.json", "utf8")),
  JSON.parse(readFileSync("data/references/radix-light.json", "utf8")),
];

const results = benchAll(ALGORITHMS, refSets);
const md = renderReport(results, ALGORITHMS, refSets);
writeFileSync("docs/research/accent-scale-bench-report.md", md);
console.log(
  `wrote docs/research/accent-scale-bench-report.md (${results.length} palette runs, ${ALGORITHMS.length} algorithms)`,
);
```

`src/lab/accent-scale/index.ts` (레지스트리 — Task 6/7/8이 여기에 추가):

```ts
// src/lab/accent-scale/index.ts
//
// 알고리즘 레지스트리. 벤치 CLI와 web 랩이 공유하는 단일 목록.

import type { AccentAlgorithm } from "./types.js";
import { v1Algorithm } from "./v1.js";
import { naiveAlgorithm } from "./naive.js";

export const ALGORITHMS: readonly AccentAlgorithm[] = [
  v1Algorithm,
  naiveAlgorithm,
];

export type { AccentAlgorithm, ScaleSpec } from "./types.js";
```

`package.json` scripts에 추가:

```json
"accent-scale-bench": "tsx scripts/analysis/accent-scale-bench.ts",
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/lab/bench.test.ts`
Expected: PASS

- [ ] **Step 5: 벤치 실행 + 리포트 확인**

```bash
pnpm accent-scale-bench
head -20 docs/research/accent-scale-bench-report.md
```

Expected: v1/naive 두 행의 Summary 표. mean ΔE는 0.02~0.15 범위가 정상적 (0이거나 0.5+면 정렬/방향 버그 의심 — 특히 스케일 방향이 밝은→어두운인지 확인).

- [ ] **Step 6: 커밋**

```bash
git add src/lab/accent-scale/bench.ts src/lab/accent-scale/index.ts scripts/analysis/accent-scale-bench.ts package.json tests/lab/bench.test.ts docs/research/accent-scale-bench-report.md
git commit -m "feat(lab): accent scale bench harness + report CLI

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Material HCT 어댑터

**Files:**
- Create: `src/lab/accent-scale/hct.ts`
- Modify: `src/lab/accent-scale/index.ts` (레지스트리에 추가)
- Test: `tests/lab/algorithms.test.ts` (추가)

**Interfaces:**
- Consumes: Task 4 `AccentAlgorithm`
- Produces: `hctAlgorithm: AccentAlgorithm` (id `"hct"`)

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/lab/algorithms.test.ts`에 추가:

```ts
import { hctAlgorithm } from "../../src/lab/accent-scale/hct.js";
// ...
describe("hctAlgorithm", () => checkContract(hctAlgorithm));
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tests/lab/algorithms.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 구현**

`src/lab/accent-scale/hct.ts`:

```ts
// src/lab/accent-scale/hct.ts
//
// Material HCT: 앵커의 HCT hue/chroma를 고정하고 tone(≈L*)만 사다리로 배치.
// tone 사다리는 98→8 균등 분할 — Material 표준 톤셋 대신 임의 count 대응.
// 특성: 입력 색의 밝기(tone)를 앵커 위치에 존중하지 않음 (v1과 같은 고정 사다리 계열).

import { argbFromHex, hexFromArgb, Hct, TonalPalette } from "@material/material-color-utilities";
import { converter } from "culori";
import type { Oklch } from "../../schema/types.js";
import type { AccentAlgorithm, ScaleSpec } from "./types.js";

const toOklch = converter("oklch");

const TONE_TOP = 98;
const TONE_BOTTOM = 8;

export const hctAlgorithm: AccentAlgorithm = {
  id: "hct",
  label: "Material HCT (tonal palette)",
  nativeSpec: { count: 11, anchorIndex: 5 },
  derive(anchorHex: string, spec: ScaleSpec): Oklch[] {
    const hct = Hct.fromInt(argbFromHex(anchorHex));
    const palette = TonalPalette.fromHueAndChroma(hct.hue, hct.chroma);
    return Array.from({ length: spec.count }, (_, i) => {
      const tone = TONE_TOP - ((TONE_TOP - TONE_BOTTOM) * i) / (spec.count - 1);
      const hex = hexFromArgb(palette.tone(Math.round(tone)));
      const o = toOklch(hex)!;
      return { l: o.l ?? 0, c: o.c ?? 0, h: o.h ?? 0 };
    });
  },
};
```

주의: 패키지 API가 다르면 `node_modules/@material/material-color-utilities/` 의 `.d.ts`를 열어 실제 export명(`argbFromHex`/`hexFromArgb`는 `utils/string_utils` 계열)에 맞춘다. 동작이 문서와 다르면 서베이 문서에 그 발견을 추가.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/lab/algorithms.test.ts`
Expected: PASS (hue 보존 테스트에서 HCT↔OKLCH hue 차이로 실패하면 허용 오차를 15°→25°로 완화하고 그 이유를 테스트 주석에 남긴다 — CAM16 hue와 OKLCH hue는 동일하지 않다)

- [ ] **Step 5: 레지스트리 추가 + 벤치 재실행**

`src/lab/accent-scale/index.ts`의 `ALGORITHMS`에 `hctAlgorithm` 추가 (import 포함):

```ts
import { hctAlgorithm } from "./hct.js";
export const ALGORITHMS: readonly AccentAlgorithm[] = [
  v1Algorithm,
  naiveAlgorithm,
  hctAlgorithm,
];
```

```bash
pnpm accent-scale-bench && pnpm vitest run tests/lab
```

Expected: 리포트에 hct 행 추가, 전체 테스트 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/lab/accent-scale/hct.ts src/lab/accent-scale/index.ts tests/lab/algorithms.test.ts docs/research/accent-scale-bench-report.md
git commit -m "feat(lab): Material HCT adapter

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Adobe Leonardo 어댑터

**Files:**
- Create: `src/lab/accent-scale/leonardo.ts`
- Modify: `src/lab/accent-scale/index.ts`
- Test: `tests/lab/algorithms.test.ts` (추가)

**Interfaces:**
- Consumes: Task 4 `AccentAlgorithm`
- Produces: `leonardoAlgorithm: AccentAlgorithm` (id `"leonardo"`)

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/lab/algorithms.test.ts`에 추가:

```ts
import { leonardoAlgorithm } from "../../src/lab/accent-scale/leonardo.js";
// ...
describe("leonardoAlgorithm", () => checkContract(leonardoAlgorithm));
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tests/lab/algorithms.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 구현**

`src/lab/accent-scale/leonardo.ts`:

```ts
// src/lab/accent-scale/leonardo.ts
//
// Adobe Leonardo: 흰 배경 대비 콘트라스트 비율 사다리로 스케일 생성.
// 비율 사다리는 1.06→19 기하 급수 — WCAG 비율은 지각적으로 기하 분포이므로.
// 특성: L 배치가 콘트라스트 타깃에서 역산됨 (고정 사다리 계열과 대비되는 접근).

import { BackgroundColor, Color, Theme } from "@adobe/leonardo-contrast-colors";
import { converter } from "culori";
import type { Oklch } from "../../schema/types.js";
import type { AccentAlgorithm, ScaleSpec } from "./types.js";

const toOklch = converter("oklch");

const RATIO_MIN = 1.06;
const RATIO_MAX = 19;

function ratioLadder(count: number): number[] {
  return Array.from({ length: count }, (_, i) =>
    Number((RATIO_MIN * Math.pow(RATIO_MAX / RATIO_MIN, i / (count - 1))).toFixed(2)),
  );
}

export const leonardoAlgorithm: AccentAlgorithm = {
  id: "leonardo",
  label: "Adobe Leonardo (contrast ladder)",
  nativeSpec: { count: 11, anchorIndex: 5 },
  derive(anchorHex: string, spec: ScaleSpec): Oklch[] {
    const accent = new Color({
      name: "accent",
      colorKeys: [anchorHex],
      ratios: ratioLadder(spec.count),
    });
    const background = new BackgroundColor({
      name: "background",
      colorKeys: ["#ffffff"],
      ratios: [],
    });
    const theme = new Theme({ colors: [accent], backgroundColor: background, lightness: 100 });
    // contrastColors[0]은 background, [1]이 accent — values는 ratio 오름차순(밝은→어두운)
    const values = theme.contrastColors[1].values as { value: string }[];
    return values.map(({ value }) => {
      const o = toOklch(value)!;
      return { l: o.l ?? 0, c: o.c ?? 0, h: o.h ?? 0 };
    });
  },
};
```

주의: Leonardo API 형태가 다르면 `node_modules/@adobe/leonardo-contrast-colors/README.md`(오프라인 존재)를 열어 `Theme` 출력 구조(`contrastColors` vs `contrastColorValues`)에 맞춘다. `contrastColorValues`를 쓰면 hex 배열이 바로 나온다. 스케일 방향(밝은→어두운)만 반드시 보장할 것.

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/lab/algorithms.test.ts`
Expected: PASS (L strict 감소가 Leonardo의 라운딩으로 동률이 나오면 테스트의 해당 검사만 `toBeLessThanOrEqual`+전체 감소 확인으로 완화하고 주석으로 이유를 남긴다)

- [ ] **Step 5: 레지스트리 추가 + 벤치 재실행**

`index.ts` `ALGORITHMS`에 `leonardoAlgorithm` 추가 후:

```bash
pnpm accent-scale-bench && pnpm vitest run tests/lab
```

Expected: 리포트에 leonardo 행 추가, 전체 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/lab/accent-scale/leonardo.ts src/lab/accent-scale/index.ts tests/lab/algorithms.test.ts docs/research/accent-scale-bench-report.md
git commit -m "feat(lab): Adobe Leonardo adapter

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Radix custom-color 포팅

**Files:**
- Create: `src/lab/accent-scale/radix.ts`
- Modify: `src/lab/accent-scale/index.ts`
- Test: `tests/lab/radix.test.ts`

**Interfaces:**
- Consumes: Task 1 서베이 문서에 기록된 **generateRadixColors 소스 URL/커밋/라이선스**, Task 2의 `data/references/radix-light.json`
- Produces: `radixAlgorithm: AccentAlgorithm` (id `"radix"`, `nativeSpec: { count: 12, anchorIndex: 8 }`)

- [ ] **Step 1: 소스 확보**

서베이 문서에 기록된 URL에서 `generateRadixColors` 소스를 가져온다 (WebFetch로 raw 파일). 의존성(bezier-easing, colorjs.io 등)이 무겁면: 핵심 로직(스케일 스냅 + 앵커 보정 + 이징 커브)만 culori 기반으로 포팅하고, 생략한 부분(P3 gamut 처리, gray 스케일, 다크모드)을 파일 헤더 주석에 명시. 원본 라이선스/출처 주석 필수.

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/lab/radix.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { radixAlgorithm } from "../../src/lab/accent-scale/radix.js";
import { oklchToHex } from "../../src/generator/color.js";
import { deltaEOk } from "../../src/lab/accent-scale/metric.js";
import type { ReferenceSet } from "../../src/lab/accent-scale/bench.js";

const radixRef: ReferenceSet = JSON.parse(
  readFileSync("data/references/radix-light.json", "utf8"),
);

describe("radixAlgorithm", () => {
  it("round-trips radix blue: step-9 anchor reproduces the original scale", () => {
    const blue = radixRef.palettes.blue;
    const derived = radixAlgorithm.derive(blue[8], { count: 12, anchorIndex: 8 });
    const perStop = derived.map((c, i) => deltaEOk(oklchToHex(c), blue[i]));
    const mean = perStop.reduce((a, b) => a + b, 0) / perStop.length;
    // 원본 알고리즘에 원본 앵커를 넣으면 거의 원본이 나와야 한다.
    // (포팅 검증 게이트 — 실패하면 포팅이 잘못된 것)
    expect(mean).toBeLessThan(0.05);
    expect(Math.max(...perStop)).toBeLessThan(0.12);
  });

  it("returns 12 steps light→dark", () => {
    const scale = radixAlgorithm.derive("#0090ff", { count: 12, anchorIndex: 8 });
    expect(scale).toHaveLength(12);
    expect(scale[0].l).toBeGreaterThan(scale[11].l);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm vitest run tests/lab/radix.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: 포팅 구현**

`src/lab/accent-scale/radix.ts` — 원본 구조를 따르되 이 어댑터 계약으로 감싼다:

```ts
// src/lab/accent-scale/radix.ts
//
// Radix custom-color 알고리즘 포팅.
// 원본: <서베이에 기록한 URL + 커밋 해시> (MIT)
// 생략: <P3/gray/다크 등 생략한 부분 명시>
// count !== 12 인 spec 요청 시: 12-step 결과를 위치 비례로 선형 재표집.

import type { Oklch } from "../../schema/types.js";
import type { AccentAlgorithm, ScaleSpec } from "./types.js";

// ... (원본 포팅: 함수 시그니처는 원본을 따르고, 이 파일 안에 자립적으로)

function resample(scale12: Oklch[], count: number): Oklch[] {
  if (count === 12) return scale12;
  return Array.from({ length: count }, (_, i) => {
    const x = (i / (count - 1)) * 11;
    const j = Math.min(Math.floor(x), 10);
    const t = x - j;
    const a = scale12[j];
    const b = scale12[j + 1];
    return {
      l: a.l + (b.l - a.l) * t,
      c: a.c + (b.c - a.c) * t,
      h: a.h + (b.h - a.h) * t,
    };
  });
}

export const radixAlgorithm: AccentAlgorithm = {
  id: "radix",
  label: "Radix custom color (ported)",
  nativeSpec: { count: 12, anchorIndex: 8 },
  derive(anchorHex: string, spec: ScaleSpec): Oklch[] {
    const scale12 = deriveRadix12(anchorHex); // 포팅한 원본 로직
    return resample(scale12, spec.count);
  },
};
```

(`deriveRadix12`가 포팅 본체 — 원본 소스에 따라 작성. round-trip 테스트가 포팅 정확도의 게이트다.)

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm vitest run tests/lab/radix.test.ts`
Expected: PASS. round-trip이 0.05를 넘으면 포팅 누락(이징 커브, 스냅 로직)을 원본과 대조 — 통과할 때까지 임계값을 올리지 말 것.

- [ ] **Step 6: 레지스트리 추가 + 벤치 재실행 + 커밋**

`index.ts`에 `radixAlgorithm` 추가 후:

```bash
pnpm accent-scale-bench && pnpm vitest run
git add src/lab/accent-scale/radix.ts src/lab/accent-scale/index.ts tests/lab/radix.test.ts docs/research/accent-scale-bench-report.md
git commit -m "feat(lab): Radix custom-color port

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: 비교 랩 라우트 (web `#lab`) + 최종 검증

**Files:**
- Create: `src/lab/accent-scale/lab-data.ts` (순수 로직)
- Create: `web/src/lab/LabPage.tsx`
- Modify: `web/src/App.tsx` (해시 분기), `web/vite.config.ts` (+`@data` alias), `web/tsconfig.json` 계열 (기존 `@core` paths 항목 옆에 `@data/*` 추가 — 실제 파일은 `@core`가 선언된 곳을 grep해서 같은 방식으로)
- Test: `tests/lab/lab-data.test.ts`

**Interfaces:**
- Consumes: `ALGORITHMS` (Task 5~8), `ReferenceSet` JSON (Task 2)
- Produces: `nativeScale(algo, hex): { key: string; hex: string }[]`, `nearestReferences(hex, refSets): { source: string; palette: string; stops: { key: string; hex: string }[] }[]`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/lab/lab-data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { nativeScale, nearestReferences } from "../../src/lab/accent-scale/lab-data.js";
import { naiveAlgorithm } from "../../src/lab/accent-scale/naive.js";
import type { ReferenceSet } from "../../src/lab/accent-scale/bench.js";

const REFS: ReferenceSet[] = [
  {
    source: "tiny", version: "0", anchorIndex: 1, stopKeys: ["a", "b"],
    palettes: {
      blue: ["#dbeafe", "#3b82f6"],   // h≈259
      red: ["#fee2e2", "#ef4444"],    // h≈25
    },
  },
];

describe("nativeScale", () => {
  it("returns nativeSpec.count stops with stable keys and hex values", () => {
    const stops = nativeScale(naiveAlgorithm, "#3b82f6");
    expect(stops).toHaveLength(naiveAlgorithm.nativeSpec.count);
    expect(stops.every((s) => /^#[0-9a-f]{6}$/.test(s.hex))).toBe(true);
    expect(new Set(stops.map((s) => s.key)).size).toBe(stops.length);
  });
});

describe("nearestReferences", () => {
  it("picks the closest-hue palette per source", () => {
    const near = nearestReferences("#2563eb", REFS); // 파랑 입력
    expect(near).toHaveLength(1);
    expect(near[0].palette).toBe("blue");
    expect(near[0].stops).toHaveLength(2);
  });
  it("picks red for a pinkish-red input (#e11d48, h≈17°)", () => {
    const near = nearestReferences("#e11d48", REFS);
    expect(near[0].palette).toBe("red");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tests/lab/lab-data.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 구현 (순수 로직)**

`src/lab/accent-scale/lab-data.ts`:

```ts
// src/lab/accent-scale/lab-data.ts
//
// 랩 UI용 순수 데이터 변환. 렌더 로직 없음 (FP/분리 원칙).

import { converter } from "culori";
import { oklchToHex, parsePrimary } from "../../generator/color.js";
import type { ReferenceSet } from "./bench.js";
import type { AccentAlgorithm } from "./types.js";

const toOklch = converter("oklch");

export interface LabStop {
  key: string;
  hex: string;
}

/** 알고리즘의 native stop 구성으로 유도해 표시용 stop 배열 생성 */
export function nativeScale(algo: AccentAlgorithm, hex: string): LabStop[] {
  const scale = algo.derive(hex, algo.nativeSpec);
  return scale.map((c, i) => ({ key: String(i + 1), hex: oklchToHex(c) }));
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export interface NearestReference {
  source: string;
  palette: string;
  stops: LabStop[];
}

/** 입력 색과 앵커 hue가 가장 가까운 팔레트를 소스(tailwind/radix)별 1개씩 */
export function nearestReferences(
  hex: string,
  refSets: readonly ReferenceSet[],
): NearestReference[] {
  const inputH = parsePrimary(hex).h;
  return refSets.map((ref) => {
    let best: { name: string; d: number } | null = null;
    for (const [name, hexes] of Object.entries(ref.palettes)) {
      const anchorH = toOklch(hexes[ref.anchorIndex])?.h ?? 0;
      const d = hueDistance(inputH, anchorH);
      if (!best || d < best.d) best = { name, d };
    }
    const hexes = ref.palettes[best!.name];
    return {
      source: ref.source,
      palette: best!.name,
      stops: hexes.map((h, i) => ({ key: ref.stopKeys[i], hex: h })),
    };
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/lab/lab-data.test.ts`
Expected: PASS

- [ ] **Step 5: web alias + 해시 라우트 + LabPage**

`web/vite.config.ts`의 alias에 추가:

```ts
"@data": path.resolve(__dirname, "../data"),
```

web tsconfig: `grep -r "@core" web/*.json` 으로 paths가 선언된 파일을 찾아 같은 형식으로 `"@data/*": ["../data/*"]` 추가. `resolveJsonModule`이 꺼져 있으면 켠다.

`web/src/App.tsx` 교체:

```tsx
import { useEffect, useState } from "react";
import { ResultPage } from "./result/ResultPage";
import { DEFAULT_STATE, useGenerateResult, type WizardState } from "./hooks/useGenerator";
import { LabPage } from "./lab/LabPage";

export function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  const result = useGenerateResult(state);

  if (hash === "#lab") return <LabPage />;

  const update = (partial: Partial<WizardState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  return <ResultPage state={state} result={result} onChange={update} />;
}
```

`web/src/lab/LabPage.tsx`:

```tsx
// web/src/lab/LabPage.tsx
//
// #lab — 액센트 스케일 유도 알고리즘 비교 랩 (연구용, 제품 UI 아님).
// 스케일 계산은 전부 @core/lab/accent-scale (순수)에서; 이 파일은 렌더만.

import { useState } from "react";
import { ALGORITHMS } from "@core/lab/accent-scale/index.js";
import {
  nativeScale,
  nearestReferences,
  type LabStop,
} from "@core/lab/accent-scale/lab-data.js";
import type { ReferenceSet } from "@core/lab/accent-scale/bench.js";
import tailwindRef from "@data/references/tailwind-v4.json";
import radixRef from "@data/references/radix-light.json";
import { ColorScaleStrip } from "../components/ColorScaleStrip";
import { OklchPicker } from "../components/OklchPicker";

// JSON 모듈의 추론 타입(리터럴 키)과 ReferenceSet(Record)이 달라 unknown 경유 캐스팅
const REF_SETS = [tailwindRef, radixRef] as unknown as ReferenceSet[];

function StripRow({ title, stops }: { title: string; stops: LabStop[] }) {
  const copyAll = () =>
    navigator.clipboard.writeText(stops.map((s) => s.hex).join(", "));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-medium text-neutral-600">{title}</span>
        <button
          type="button"
          onClick={copyAll}
          className="text-[10px] text-neutral-400 hover:text-neutral-700"
        >
          copy hex
        </button>
      </div>
      <ColorScaleStrip stops={stops} />
    </div>
  );
}

export function LabPage() {
  const [hex, setHex] = useState("#3b82f6");
  const references = nearestReferences(hex, REF_SETS);

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <header>
        <h1 className="text-lg font-semibold">Accent Scale Lab</h1>
        <p className="text-xs text-neutral-500">
          브랜드 컬러 → 액센트 스케일 유도 알고리즘 비교 (연구용 · #lab)
        </p>
      </header>

      <div className="flex items-start gap-4">
        <OklchPicker hex={hex} onChange={setHex} />
        <input
          value={hex}
          onChange={(e) => {
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setHex(e.target.value);
          }}
          className="border border-neutral-300 rounded px-2 py-1 text-sm font-mono w-24"
        />
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
          Algorithms
        </h2>
        {ALGORITHMS.map((algo) => (
          <StripRow key={algo.id} title={algo.label} stops={nativeScale(algo, hex)} />
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
          Nearest references (눈 비교 기준)
        </h2>
        {references.map((r) => (
          <StripRow
            key={r.source}
            title={`${r.source} · ${r.palette}`}
            stops={r.stops}
          />
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 6: 수동 검증**

```bash
pnpm --dir web dev
```

브라우저에서 `http://localhost:5173/#lab` 열기: 알고리즘 스트립 5개 + 레퍼런스 스트립 2개, hex 변경 시 전부 갱신, copy hex 동작, 해시 제거 시 기존 ResultPage 정상. (해시 변경은 새로고침 없이 반영되는지 확인.)

- [ ] **Step 7: 최종 검증 (전체)**

```bash
pnpm vitest run          # 전체 테스트 PASS
pnpm build               # root tsc — src/lab 포함 타입 통과
pnpm --dir web build     # web tsc -b + vite build 통과
pnpm accent-scale-bench  # 리포트 재생성이 idempotent (git diff 없음)
git status
```

Expected: 전부 통과, 리포트 diff 없음.

- [ ] **Step 8: 커밋**

```bash
git add src/lab/accent-scale/lab-data.ts tests/lab/lab-data.test.ts web/src/App.tsx web/src/lab/LabPage.tsx web/vite.config.ts web/tsconfig*.json
git commit -m "feat(lab): #lab comparison route for accent scale algorithms

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Out of plan (스펙의 후속 단계)

- **눈 평가 + 종합** — 랩에서 여러 입력 색으로 평가하고 벤치 리포트와 종합해 "우리 곡선"을 설계, `docs/research/accent-scale-derivation-track.md` 작성. 이건 분석가(유저)와의 대화형 세션이라 이 계획에 넣지 않는다.
- **가이드드 팔레트 빌더** — 별도 스펙/계획 사이클 (스펙 §다운스트림 소비자 참조).
