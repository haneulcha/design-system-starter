# 팔레트 색 산출물 (사이클 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `#builder`가 만든 색 시스템을 4개 파일(`palette.css` · `palette.theme.css` · `palette.figma.json` · `DESIGN.md`)로 내보낸다. 색만.

**Architecture:** `src/export/color/`를 신설한다. 이 모듈은 `src/lab/`을 import하지 않고, 역할표·stop 이름·스케일 순서를 **데이터로 받는다**(`ColorSystem`). 그래서 산출 코드에 역할표 사본이 존재할 수 없고 랩 격리 규칙이 깨지지 않는다. `web/`은 엔진 상수 셋을 어댑터에 넘기는 한 줄만 쓴다.

**Tech Stack:** TypeScript (Node16 ESM, 상대 import에 `.js` 확장자 필수), vitest, React 19 + Tailwind 4 (web), pnpm(루트) / npm(web).

**스펙:** `docs/superpowers/specs/2026-08-10-palette-color-export-design.md`

## Global Constraints

- **랩 격리:** `src/generator/`는 `src/lab/`을 import하지 않는다. **`src/export/`도 `src/lab/`을 import하지 않는다.** 역방향(lab → export)도 없다.
- **브라우저 안전:** `src/lab/`과 `src/export/` 아래는 정적 ESM만. `node:fs` 등 Node 전용 API 금지 (web이 번들한다).
- **ESM 확장자:** `src/`·`tests/` 안의 상대 import는 반드시 `.js`로 끝난다 (`./types.js`, `../../figma/types.js`). 루트는 TypeScript Node16.
- **FP 원칙:** 계산과 UI 문구(라벨·note)는 엔진에, `web/`은 렌더만 한다.
- **엔진에 실패 경로를 만들지 않는다.** 계약 위반 가드(throw)만 두고, 사용자 입력에서 도달 가능한 실패는 UI가 막는다.
- **CSS 변수 이름:** `--color-{scale}-{stop}` · `--color-{scale}-{role}`. 예외 없음.
- **테스트 실행:** 루트 `pnpm test` (vitest run). 단일 파일은 `pnpm vitest run tests/export/color/<name>.test.ts`.
- **web 타입체크:** `cd web && npx tsc -b --noEmit`. **web 테스트:** `cd web && npm test` (Task 8에서 생긴다).
- **커밋 메시지 말미:** `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

## File Structure

| 파일 | 책임 |
| --- | --- |
| `src/export/color/types.ts` | `ColorSystem`·`ExportScale`·`ExportRole` + 계약 가드 (Task 1) |
| `src/export/color/adapter.ts` | `toColorSystem` — 엔진 산출물 → `ColorSystem` (Task 2) |
| `src/export/color/vars.ts` | 변수 선언 목록. CSS 두 장이 공유 (Task 3) |
| `src/export/color/css.ts` | `generateColorCss` (Task 3) |
| `src/export/color/theme-css.ts` | `generateColorThemeCss` (Task 4) |
| `src/export/color/figma.ts` | `toColorFigma` (Task 5) |
| `src/export/color/design-md.ts` | `renderColorDesignMd` (Task 6) |
| `src/export/color/index.ts` | 재수출 (Task 6) |
| `src/lab/palette/roles.ts` | `SCALE_ORDER` 추가, `cssSnippet` 제거 (Task 2·3) |
| `web/src/builder/ExportPanel.tsx` | 다운로드 4버튼 + 복사 + 미리보기 (Task 7) |
| `web/vitest.config.ts`·`web/vitest.setup.ts` | 테스트 하네스 (Task 8) |
| `web/src/builder/BuilderPage.test.tsx` | 스모크 테스트 (Task 8) |
| `tests/export/color/fixture.ts` | 합성 `ColorSystem` 픽스처 (Task 1) |

---

## Task 1: `ColorSystem` 계약과 가드

산출 모듈 전체의 입력 타입. 아무것도 import하지 않는 파일이라 여기서 시작한다.

**Files:**
- Create: `src/export/color/types.ts`
- Create: `tests/export/color/fixture.ts`
- Test: `tests/export/color/types.test.ts`

**Interfaces:**
- Produces:
  - `interface ExportRole { id: string; label: string; lightIndex: number; darkIndex: number }`
  - `interface ExportScale { name: string; label: string; hexes: readonly string[] }`
  - `interface ColorSystem { stopKeys: readonly string[]; scales: readonly ExportScale[]; roles: readonly ExportRole[] }`
  - `function assertColorSystem(system: ColorSystem): void`
  - 픽스처: `fixtureSystem(): ColorSystem` (스케일 6 × stop 11 × 역할 6), `tinySystem(): ColorSystem` (스케일 2 × stop 3 × 역할 2)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/export/color/fixture.ts`:

```ts
// 합성 픽스처. 실제 엔진 값을 쓰지 않는 이유: 산출 코드는 엔진과 독립이어야 하고,
// 엔진 상수가 바뀌었다고 산출 테스트가 깨지면 그 독립성이 거짓말이 된다.
// 실제 엔진과의 연결은 adapter 테스트(Task 2)가 따로 덮는다.

import type { ColorSystem, ExportRole, ExportScale } from "../../../src/export/color/types.js";

export const FIXTURE_STOP_KEYS = [
  "50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950",
] as const;

/** tag 2자리 + stop 인덱스 2자리 → 겹치지 않고 눈으로 추적 가능한 hex. */
function hexes(tag: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `#${tag}${tag}${i.toString(16).padStart(2, "0")}`);
}

export const FIXTURE_ROLES: readonly ExportRole[] = [
  { id: "subtle-bg", label: "은은한 배경", lightIndex: 0, darkIndex: 10 },
  { id: "hover-bg", label: "호버 배경", lightIndex: 1, darkIndex: 9 },
  { id: "border", label: "테두리", lightIndex: 2, darkIndex: 8 },
  { id: "solid", label: "솔리드", lightIndex: 5, darkIndex: 5 },
  { id: "text", label: "텍스트", lightIndex: 6, darkIndex: 4 },
  { id: "text-strong", label: "진한 텍스트", lightIndex: 7, darkIndex: 3 },
];

const FIXTURE_SCALE_DEFS: readonly [string, string, string][] = [
  ["accent", "액센트", "a0"],
  ["neutral", "뉴트럴", "b0"],
  ["error", "오류 (빨강)", "c0"],
  ["warning", "경고 (앰버)", "d0"],
  ["success", "성공 (초록)", "e0"],
  ["info", "정보 (파랑)", "f0"],
];

export function fixtureSystem(): ColorSystem {
  const scales: ExportScale[] = FIXTURE_SCALE_DEFS.map(([name, label, tag]) => ({
    name,
    label,
    hexes: hexes(tag, FIXTURE_STOP_KEYS.length),
  }));
  return { stopKeys: [...FIXTURE_STOP_KEYS], scales, roles: FIXTURE_ROLES };
}

/** 가드 테스트용 최소 시스템 — 길이 계약을 짧게 검사한다. */
export function tinySystem(): ColorSystem {
  return {
    stopKeys: ["a", "b", "c"],
    scales: [
      { name: "one", label: "하나", hexes: ["#000000", "#111111", "#222222"] },
      { name: "two", label: "둘", hexes: ["#333333", "#444444", "#555555"] },
    ],
    roles: [
      { id: "low", label: "낮음", lightIndex: 0, darkIndex: 2 },
      { id: "mid", label: "중간", lightIndex: 1, darkIndex: 1 },
    ],
  };
}
```

`tests/export/color/types.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { assertColorSystem } from "../../../src/export/color/types.js";
import { fixtureSystem, tinySystem } from "./fixture.js";

describe("assertColorSystem", () => {
  it("accepts a well-formed system", () => {
    expect(() => assertColorSystem(fixtureSystem())).not.toThrow();
    expect(() => assertColorSystem(tinySystem())).not.toThrow();
  });

  it("rejects an empty stopKeys list", () => {
    const s = tinySystem();
    expect(() => assertColorSystem({ ...s, stopKeys: [] })).toThrow(/stopKeys/);
  });

  it("rejects a scale whose hex count differs from stopKeys, naming the scale", () => {
    const s = tinySystem();
    const scales = [s.scales[0], { ...s.scales[1], hexes: ["#000000"] }];
    expect(() => assertColorSystem({ ...s, scales })).toThrow(/"two"/);
  });

  it("rejects duplicate scale names — they would silently overwrite CSS variables", () => {
    const s = tinySystem();
    const scales = [s.scales[0], { ...s.scales[1], name: "one" }];
    expect(() => assertColorSystem({ ...s, scales })).toThrow(/duplicate/);
  });

  it("rejects a role index outside the stop range, naming the role and the field", () => {
    const s = tinySystem();
    const roles = [{ ...s.roles[0], darkIndex: 3 }];
    expect(() => assertColorSystem({ ...s, roles })).toThrow(/darkIndex/);
  });

  it("rejects a non-integer role index", () => {
    const s = tinySystem();
    const roles = [{ ...s.roles[0], lightIndex: 1.5 }];
    expect(() => assertColorSystem({ ...s, roles })).toThrow(/lightIndex/);
  });

  it("rejects names that are not CSS identifiers — otherwise the CSS breaks silently", () => {
    const s = tinySystem();
    expect(() =>
      assertColorSystem({ ...s, scales: [{ ...s.scales[0], name: "My Scale" }, s.scales[1]] }),
    ).toThrow(/identifier/);
    expect(() =>
      assertColorSystem({ ...s, roles: [{ ...s.roles[0], id: "Solid" }] }),
    ).toThrow(/identifier/);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm vitest run tests/export/color/types.test.ts`
Expected: FAIL — `Failed to resolve import "../../../src/export/color/types.js"`

- [ ] **Step 3: `types.ts` 구현**

`src/export/color/types.ts`:

```ts
// src/export/color/types.ts
//
// 색 산출물의 입력 계약. 이 파일은 아무것도 import하지 않는다 —
// 역할표도 stop 이름도 데이터로 받으므로 엔진(src/lab/palette/)과 어긋날 사본이
// 산출 코드 안에 존재할 수 없다.
// 스펙: docs/superpowers/specs/2026-08-10-palette-color-export-design.md

export interface ExportRole {
  /** CSS 변수·Figma 변수에 쓰는 식별자. 예: "solid", "subtle-bg". */
  readonly id: string;
  /** 사람이 읽는 이름. DESIGN.md 역할표에 쓴다. */
  readonly label: string;
  /** 라이트 테마에서 이 역할이 가리키는 stop 인덱스. */
  readonly lightIndex: number;
  /** 다크 테마 인덱스. lightIndex와 같으면 테마 간에 안 바뀌는 역할이다. */
  readonly darkIndex: number;
}

export interface ExportScale {
  /** CSS·Figma에서 쓰는 식별자. 예: "accent", "error". */
  readonly name: string;
  /** 사람이 읽는 이름. 예: "액센트". DESIGN.md 제목에 쓴다. */
  readonly label: string;
  /** stopKeys와 같은 길이, 같은 순서. */
  readonly hexes: readonly string[];
}

export interface ColorSystem {
  /** stop 이름. 길이가 모든 스케일의 길이를 정의한다. */
  readonly stopKeys: readonly string[];
  /** 출력 순서 그대로. 첫 항목이 파일·문서에서 먼저 나온다. */
  readonly scales: readonly ExportScale[];
  readonly roles: readonly ExportRole[];
}

/** CSS 커스텀 프로퍼티 이름의 일부로 안전한가. */
const CSS_IDENT = /^[a-z][a-z0-9-]*$/;

/** 계약 위반 가드. 사용자 입력에서 도달할 수 없다 — UI가 미완성 상태를 막는다.
 *  조용히 깨진 CSS를 내보내느니 즉시 터진다. */
export function assertColorSystem(system: ColorSystem): void {
  const n = system.stopKeys.length;
  if (n === 0) {
    throw new Error("assertColorSystem: stopKeys must not be empty");
  }

  const seen = new Set<string>();
  for (const scale of system.scales) {
    if (!CSS_IDENT.test(scale.name)) {
      throw new Error(
        `assertColorSystem: scale name "${scale.name}" is not a CSS identifier`,
      );
    }
    if (seen.has(scale.name)) {
      throw new Error(`assertColorSystem: duplicate scale name "${scale.name}"`);
    }
    seen.add(scale.name);
    if (scale.hexes.length !== n) {
      throw new Error(
        `assertColorSystem: scale "${scale.name}" has ${scale.hexes.length} hexes, expected ${n}`,
      );
    }
  }

  for (const role of system.roles) {
    if (!CSS_IDENT.test(role.id)) {
      throw new Error(`assertColorSystem: role id "${role.id}" is not a CSS identifier`);
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
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/export/color/types.test.ts`
Expected: PASS (7 케이스)

- [ ] **Step 5: 커밋**

```bash
git add src/export/color/types.ts tests/export/color/
git commit -m "$(cat <<'EOF'
feat(export): ColorSystem contract for colour export

산출 모듈의 입력 계약. 이 파일은 아무것도 import하지 않는다 — 역할표도 stop
이름도 데이터로 받으므로 산출 코드 안에 엔진과 어긋날 사본이 존재할 수 없다.

가드 4개: stop 길이 일치, 스케일 이름 유일, 역할 인덱스 범위, CSS 식별자
안전성. 마지막 것이 없으면 이름에 공백이 섞였을 때 CSS가 조용히 깨진다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 어댑터 + `SCALE_ORDER`

엔진 산출물(`ScaleSet`)을 `ColorSystem`으로 옮기는 유일한 지점. **스펙 D2a가 이걸 `web/`이 아니라 여기 두라고 하는 이유는, 여기가 유일한 드리프트 가능 지점이고 `web/`에는 테스트가 없기 때문이다.**

**Files:**
- Create: `src/export/color/adapter.ts`
- Modify: `src/lab/palette/roles.ts` (`SCALE_ORDER` 추가)
- Test: `tests/export/color/adapter.test.ts`
- Test: `tests/lab/roles.test.ts` (`SCALE_ORDER` 케이스 추가)

**Interfaces:**
- Consumes: Task 1의 `ColorSystem`·`ExportRole`·`assertColorSystem`
- Produces:
  - `function toColorSystem(scales, order, roles, stopKeys): ColorSystem`
  - `src/lab/palette/roles.ts`: `interface ScaleDescriptor { name: ScaleName; label: string }`, `SCALE_ORDER: readonly ScaleDescriptor[]` (6개)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/export/color/adapter.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { toColorSystem } from "../../../src/export/color/adapter.js";
import { SCALE_ORDER, SCALE_ROLES } from "../../../src/lab/palette/roles.js";
import { STOP_KEYS, fillScale, type Pin } from "../../../src/lab/palette/builder.js";
import { buildNeutral, TINT_STRENGTHS } from "../../../src/lab/palette/neutral.js";
import { SEMANTIC_ANCHORS, buildSemantic } from "../../../src/lab/palette/semantic.js";
import { oklchToHex, parsePrimary } from "../../../src/generator/color.js";

/** 실제 엔진 산출물. 어댑터 테스트만 엔진에 붙는다 — 나머지 산출 테스트는 픽스처를 쓴다. */
function realScales() {
  const pins: Pin[] = [{ index: 5, color: parsePrimary("#3b82f6") }];
  const semantic = Object.fromEntries(
    SEMANTIC_ANCHORS.map((a) => [a.id, buildSemantic(a).map(oklchToHex)]),
  );
  return {
    accent: fillScale(pins).map(oklchToHex),
    neutral: buildNeutral({ hue: 258, strength: TINT_STRENGTHS.soft }).map(oklchToHex),
    semantic,
  };
}

describe("toColorSystem", () => {
  it("emits scales in SCALE_ORDER, not in Record key order", () => {
    const system = toColorSystem(realScales(), SCALE_ORDER, SCALE_ROLES, STOP_KEYS);
    expect(system.scales.map((s) => s.name)).toEqual(SCALE_ORDER.map((d) => d.name));
    expect(system.scales[0].name).toBe("accent");
    expect(system.scales[1].name).toBe("neutral");
  });

  it("is stable when the semantic Record's key order is reversed", () => {
    const scales = realScales();
    const reversed = Object.fromEntries(Object.entries(scales.semantic).reverse());
    const a = toColorSystem(scales, SCALE_ORDER, SCALE_ROLES, STOP_KEYS);
    const b = toColorSystem({ ...scales, semantic: reversed }, SCALE_ORDER, SCALE_ROLES, STOP_KEYS);
    expect(b.scales.map((s) => s.name)).toEqual(a.scales.map((s) => s.name));
    expect(b.scales.map((s) => s.hexes)).toEqual(a.scales.map((s) => s.hexes));
  });

  it("carries the display label from the order descriptor", () => {
    const system = toColorSystem(realScales(), SCALE_ORDER, SCALE_ROLES, STOP_KEYS);
    expect(system.scales[0].label).toBe("액센트");
    expect(system.scales[1].label).toBe("뉴트럴");
    const err = system.scales.find((s) => s.name === "error")!;
    expect(err.label).toBe(SEMANTIC_ANCHORS.find((a) => a.id === "error")!.label);
  });

  it("passes role indices through verbatim — this is the drift point the design guards", () => {
    const system = toColorSystem(realScales(), SCALE_ORDER, SCALE_ROLES, STOP_KEYS);
    expect(system.roles).toHaveLength(SCALE_ROLES.length);
    SCALE_ROLES.forEach((role, i) => {
      expect(system.roles[i].id).toBe(role.id);
      expect(system.roles[i].lightIndex).toBe(role.lightIndex);
      expect(system.roles[i].darkIndex).toBe(role.darkIndex);
    });
  });

  it("produces the real system's shape: 6 scales of 11 stops", () => {
    const system = toColorSystem(realScales(), SCALE_ORDER, SCALE_ROLES, STOP_KEYS);
    expect(system.scales).toHaveLength(6);
    for (const s of system.scales) expect(s.hexes).toHaveLength(11);
  });

  it("throws when the order names a scale the ScaleSet does not have", () => {
    const order = [...SCALE_ORDER, { name: "nope", label: "없음" }];
    expect(() => toColorSystem(realScales(), order, SCALE_ROLES, STOP_KEYS)).toThrow(/nope/);
  });

  it("runs the ColorSystem guards — a short scale is rejected", () => {
    const scales = realScales();
    expect(() =>
      toColorSystem({ ...scales, neutral: scales.neutral.slice(0, 5) }, SCALE_ORDER, SCALE_ROLES, STOP_KEYS),
    ).toThrow(/neutral/);
  });
});
```

`tests/lab/roles.test.ts` 끝에 append:

```ts
import { SCALE_ORDER } from "../../src/lab/palette/roles.js";
import { SEMANTIC_ANCHORS as ANCHORS } from "../../src/lab/palette/semantic.js";

describe("SCALE_ORDER", () => {
  it("is accent → neutral → the four semantic roles, in SEMANTIC_ANCHORS order", () => {
    expect(SCALE_ORDER.map((d) => d.name)).toEqual([
      "accent",
      "neutral",
      ...ANCHORS.map((a) => a.id),
    ]);
  });

  it("carries a non-empty Korean label for every scale", () => {
    for (const d of SCALE_ORDER) {
      expect(d.label.length, d.name).toBeGreaterThan(0);
    }
  });

  it("reuses the semantic anchors' own labels rather than restating them", () => {
    for (const a of ANCHORS) {
      expect(SCALE_ORDER.find((d) => d.name === a.id)!.label).toBe(a.label);
    }
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run tests/export/color/adapter.test.ts tests/lab/roles.test.ts`
Expected: FAIL — `adapter.js` 해석 실패, `SCALE_ORDER` is not exported

- [ ] **Step 3: `SCALE_ORDER`를 `roles.ts`에 추가**

`src/lab/palette/roles.ts`의 import 줄을 값 import로 바꾼다:

```ts
import { SEMANTIC_ANCHORS, type SemanticId } from "./semantic.js";
```

(현재는 `import type { SemanticId } from "./semantic.js";`다. `semantic.ts`는 `builder.ts`만 import하므로 순환이 생기지 않는다.)

`ScaleName` 선언 **다음에** 추가:

```ts
export interface ScaleDescriptor {
  readonly name: ScaleName;
  /** 산출물과 화면에서 사람에게 보이는 이름. UI 문구는 엔진에 둔다. */
  readonly label: string;
}

/** 산출물에서의 스케일 순서와 표시 이름.
 *  ScaleSet.semantic은 Record라 키 순서에 기대면 출력이 불안정하다 —
 *  순서를 데이터로 고정한다. 시맨틱 라벨은 SEMANTIC_ANCHORS의 것을 그대로 쓴다. */
export const SCALE_ORDER: readonly ScaleDescriptor[] = [
  { name: "accent", label: "액센트" },
  { name: "neutral", label: "뉴트럴" },
  ...SEMANTIC_ANCHORS.map((a) => ({ name: a.id, label: a.label })),
];
```

- [ ] **Step 4: `adapter.ts` 구현**

`src/export/color/adapter.ts`:

```ts
// src/export/color/adapter.ts
//
// 엔진 산출물 → ColorSystem. 구조적 타입으로만 받으므로 src/lab/을 import하지 않는다.
// 이 변환이 산출 경로의 유일한 드리프트 가능 지점이라 엔진 쪽이 아니라 여기 두고
// 테스트로 덮는다 (스펙 D2a).

import type { ColorSystem, ExportRole, ExportScale } from "./types.js";
import { assertColorSystem } from "./types.js";

/** src/lab/palette/roles.ts의 ScaleSet과 구조적으로 같은 모양. */
export interface ScaleSetLike {
  readonly accent: readonly string[];
  readonly neutral: readonly string[];
  readonly semantic: Readonly<Record<string, readonly string[]>>;
}

/** src/lab/palette/roles.ts의 ScaleDescriptor와 구조적으로 같은 모양. */
export interface ScaleDescriptorLike {
  readonly name: string;
  readonly label: string;
}

/** 순서와 표시 이름은 `order`가 정한다 — Record의 키 순서에 기대지 않는다. */
export function toColorSystem(
  scales: ScaleSetLike,
  order: readonly ScaleDescriptorLike[],
  roles: readonly ExportRole[],
  stopKeys: readonly string[],
): ColorSystem {
  const exportScales: ExportScale[] = order.map((d) => {
    const hexes =
      d.name === "accent"
        ? scales.accent
        : d.name === "neutral"
          ? scales.neutral
          : scales.semantic[d.name];
    if (!hexes) {
      throw new Error(`toColorSystem: no hexes for scale "${d.name}"`);
    }
    return { name: d.name, label: d.label, hexes };
  });

  const system: ColorSystem = { stopKeys, scales: exportScales, roles };
  assertColorSystem(system);
  return system;
}
```

- [ ] **Step 5: 테스트 통과 + 전체 스위트**

Run: `pnpm test`
Expected: PASS 전체

- [ ] **Step 6: 커밋**

```bash
git add src/export/color/adapter.ts src/lab/palette/roles.ts tests/
git commit -m "$(cat <<'EOF'
feat(export): ScaleSet → ColorSystem adapter + SCALE_ORDER

어댑터를 web/이 아니라 export/에 둔다. 이게 산출 경로의 유일한 드리프트 가능
지점인데(darkIndex를 잘못 옮겨도 아무것도 안 잡는다) web/에는 테스트가 없다.

ScaleSet.semantic이 Record라 키 순서에 기대면 출력 순서가 불안정하다.
엔진의 SCALE_ORDER가 순서와 표시 이름을 함께 정하고 어댑터는 그걸 따른다.
시맨틱 라벨은 SEMANTIC_ANCHORS의 것을 재사용 — 문구가 두 곳에 생기지 않는다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 변수 목록 + `palette.css` (그리고 `cssSnippet` 대체)

**Files:**
- Create: `src/export/color/vars.ts`, `src/export/color/css.ts`
- Modify: `src/lab/palette/roles.ts` (`cssSnippet` 제거)
- Modify: `tests/lab/roles.test.ts` (`cssSnippet` describe 제거)
- Modify: `web/src/builder/BuilderPage.tsx` (copyCss 호출부)
- Test: `tests/export/color/css.test.ts`

**Interfaces:**
- Consumes: Task 1의 `ColorSystem`·`assertColorSystem`, 픽스처
- Produces:
  - `interface VarDecl { name: string; value: string }`
  - `varName(scaleName: string, key: string): string`
  - `primitiveVars(system): VarDecl[]` · `roleVars(system): VarDecl[]` · `darkRoleVars(system): VarDecl[]`
  - `renderBlock(selector: string, decls: readonly VarDecl[]): string`
  - `interface CssSelectors { light: string; dark: string }`
  - `generateColorCss(system, selectors?): string` — 기본 `{ light: ":root", dark: ".dark" }`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/export/color/css.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateColorCss } from "../../../src/export/color/css.js";
import { primitiveVars, roleVars, darkRoleVars } from "../../../src/export/color/vars.js";
import { fixtureSystem, tinySystem } from "./fixture.js";

const decls = (css: string) => [...css.matchAll(/^\s*(--[\w-]+):\s*(.+);$/gm)].map((m) => [m[1], m[2]]);

describe("변수 목록", () => {
  it("emits one primitive per scale × stop", () => {
    const s = fixtureSystem();
    expect(primitiveVars(s)).toHaveLength(s.scales.length * s.stopKeys.length);
    expect(primitiveVars(s)[0]).toEqual({ name: "--color-accent-50", value: "#a0a000" });
  });

  it("emits one role alias per scale × role, pointing at the light stop", () => {
    const s = fixtureSystem();
    expect(roleVars(s)).toHaveLength(s.scales.length * s.roles.length);
    expect(roleVars(s)[0]).toEqual({
      name: "--color-accent-subtle-bg",
      value: "var(--color-accent-50)",
    });
  });

  it("emits dark declarations only for roles that actually move", () => {
    const s = fixtureSystem();
    const moving = s.roles.filter((r) => r.lightIndex !== r.darkIndex);
    expect(moving).toHaveLength(5);
    expect(darkRoleVars(s)).toHaveLength(s.scales.length * moving.length);
    expect(darkRoleVars(s).some((d) => d.name.endsWith("-solid"))).toBe(false);
  });
});

describe("generateColorCss", () => {
  it("emits 66 primitives + 36 roles in :root and 30 in .dark for the real shape", () => {
    // 블록 오프너(".dark {")로 자른다 — 헤더 주석에 ".dark에"라는 산문이 있어서
    // ".dark"로 자르면 헤더가 먼저 잡히고 두 슬라이스가 통째로 어긋난다.
    const css = generateColorCss(fixtureSystem());
    const root = css.slice(css.indexOf(":root {"), css.indexOf(".dark {"));
    const dark = css.slice(css.indexOf(".dark {"));
    expect(decls(root)).toHaveLength(66 + 36);
    expect(decls(dark)).toHaveLength(30);
  });

  it("has no dangling var() reference", () => {
    const css = generateColorCss(fixtureSystem());
    const declared = new Set(decls(css).map(([name]) => name));
    for (const m of css.matchAll(/var\((--[\w-]+)\)/g)) {
      expect(declared, m[1]).toContain(m[1]);
    }
  });

  it("never re-declares solid in .dark — the anchor is preserved across themes", () => {
    const css = generateColorCss(fixtureSystem());
    const dark = css.slice(css.indexOf(".dark {"));
    for (const scale of fixtureSystem().scales) {
      expect(dark).not.toContain(`--color-${scale.name}-solid:`);
    }
  });

  it("prefixes every variable with --color- so Tailwind v4 can generate utilities", () => {
    const css = generateColorCss(fixtureSystem());
    for (const [name] of decls(css)) expect(name.startsWith("--color-")).toBe(true);
  });

  it("uses the given selectors, so a scoped preview needs no string surgery", () => {
    const css = generateColorCss(tinySystem(), {
      light: ".palette-preview",
      dark: ".palette-preview.dark",
    });
    expect(css).toContain(".palette-preview {");
    expect(css).toContain(".palette-preview.dark {");
    expect(css).not.toContain(":root");
  });

  it("runs the contract guards", () => {
    const s = tinySystem();
    expect(() => generateColorCss({ ...s, scales: [{ ...s.scales[0], hexes: [] }] })).toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run tests/export/color/css.test.ts`
Expected: FAIL — 모듈 해석 실패

- [ ] **Step 3: `vars.ts` 구현**

`src/export/color/vars.ts`:

```ts
// src/export/color/vars.ts
//
// 변수 선언 목록. palette.css와 palette.theme.css가 이 함수들을 공유하므로
// 두 파일의 선언이 갈라질 수 없다 (스펙 D4).

import type { ColorSystem } from "./types.js";

export interface VarDecl {
  readonly name: string;
  readonly value: string;
}

/** Tailwind v4는 --color- 접두사에서만 색 유틸리티를 생성한다 (스펙 D3). */
export function varName(scaleName: string, key: string): string {
  return `--color-${scaleName}-${key}`;
}

export function primitiveVars(system: ColorSystem): VarDecl[] {
  const out: VarDecl[] = [];
  for (const scale of system.scales) {
    system.stopKeys.forEach((key, i) => {
      out.push({ name: varName(scale.name, key), value: scale.hexes[i] });
    });
  }
  return out;
}

export function roleVars(system: ColorSystem): VarDecl[] {
  const out: VarDecl[] = [];
  for (const scale of system.scales) {
    for (const role of system.roles) {
      out.push({
        name: varName(scale.name, role.id),
        value: `var(${varName(scale.name, system.stopKeys[role.lightIndex])})`,
      });
    }
  }
  return out;
}

/** 다크에서 실제로 자리가 바뀌는 역할만. 재선언하지 않은 것 = 안 바뀌는 것. */
export function darkRoleVars(system: ColorSystem): VarDecl[] {
  const out: VarDecl[] = [];
  for (const scale of system.scales) {
    for (const role of system.roles) {
      if (role.darkIndex === role.lightIndex) continue;
      out.push({
        name: varName(scale.name, role.id),
        value: `var(${varName(scale.name, system.stopKeys[role.darkIndex])})`,
      });
    }
  }
  return out;
}

export function renderBlock(selector: string, decls: readonly VarDecl[]): string {
  return [`${selector} {`, ...decls.map((d) => `  ${d.name}: ${d.value};`), "}"].join("\n");
}
```

- [ ] **Step 4: `css.ts` 구현**

`src/export/color/css.ts`:

```ts
// src/export/color/css.ts
//
// 프레임워크 무관 CSS. 2레이어: 프리미티브를 먼저 선언하고 역할이 var()로 참조한다.
// 다크는 프리미티브를 덮지 않는다 — 역할이 가리키는 stop만 바꾼다 (레거시와 반대).

import type { ColorSystem } from "./types.js";
import { assertColorSystem } from "./types.js";
import { primitiveVars, roleVars, darkRoleVars, renderBlock } from "./vars.js";

export interface CssSelectors {
  readonly light: string;
  readonly dark: string;
}

const DEFAULT_SELECTORS: CssSelectors = { light: ":root", dark: ".dark" };

const HEADER = [
  "/* 팔레트 생성기 산출 — 색 시스템 */",
  "/* 프리미티브는 테마와 무관하게 고정. 다크는 역할이 가리키는 stop만 바꾼다. */",
  "/* .dark에 재선언되지 않은 역할 = 테마를 가로질러 안 바뀌는 역할. */",
].join("\n");

export function generateColorCss(
  system: ColorSystem,
  selectors: CssSelectors = DEFAULT_SELECTORS,
): string {
  assertColorSystem(system);
  const light = [...primitiveVars(system), ...roleVars(system)];
  return [
    HEADER,
    "",
    renderBlock(selectors.light, light),
    "",
    renderBlock(selectors.dark, darkRoleVars(system)),
    "",
  ].join("\n");
}
```

- [ ] **Step 5: `cssSnippet` 제거와 호출부 이전**

1. `src/lab/palette/roles.ts`에서 `cssSnippet` 함수 전체를 삭제한다. **`import { SCALE_SIZE, STOP_KEYS } from "./builder.js";` 줄도 통째로 삭제한다** — 확인해보면 이 둘은 `cssSnippet` 안에서만 쓰인다(`roles.ts:107`·`109`·`116`·`121`·`128`). `SCALE_ROLES`·`scaleHasAnchor`·`SCALE_ORDER`와 타입 `ScaleRole`·`ScaleName`·`ScaleSet`·`ScaleDescriptor`는 **남긴다** — `web/src/builder/BuilderPage.tsx`가 타입을 import한다.

2. `tests/lab/roles.test.ts`에서 `describe("cssSnippet", …)` 블록과 `sampleScales()` 헬퍼, 그리고 그 둘만 쓰던 import를 삭제한다. `SCALE_ROLES`·`SCALE_ORDER` describe는 남는다.

3. `web/src/builder/BuilderPage.tsx`의 `DarkSection`에서 copyCss를 교체한다:

```tsx
// import 교체: cssSnippet 제거, 아래 두 줄 추가
import { generateColorCss, toColorSystem } from "@core/export/color/index.js";
import { SCALE_ORDER } from "@core/lab/palette/roles.js";

// DarkSection 본문
const copyCss = () =>
  navigator.clipboard.writeText(
    generateColorCss(toColorSystem(scales, SCALE_ORDER, SCALE_ROLES, STOP_KEYS)),
  );
```

`index.ts`가 아직 없으므로 이 단계에서는 개별 모듈에서 import한다:

```tsx
import { generateColorCss } from "@core/export/color/css.js";
import { toColorSystem } from "@core/export/color/adapter.js";
```

(Task 6에서 `index.ts`가 생기면 한 줄로 합친다.)

4. `DarkSection`의 `named` 배열이 `"액센트"`·`"뉴트럴"`을 하드코딩하고 있다. `SCALE_ORDER`로 교체한다 — UI 문구는 엔진에 둔다는 제약의 실행이다:

```tsx
const byName: Record<string, readonly string[]> = {
  accent: scales.accent,
  neutral: scales.neutral,
  ...scales.semantic,
};
const named: [ScaleName, string, readonly string[]][] = SCALE_ORDER.map(
  (d) => [d.name, d.label, byName[d.name]] as [ScaleName, string, readonly string[]],
);
```

- [ ] **Step 6: 테스트 + 타입체크**

Run: `pnpm test && (cd web && npx tsc -b --noEmit)`
Expected: 둘 다 PASS

- [ ] **Step 7: 커밋**

```bash
git add src/export/color/ src/lab/palette/roles.ts tests/ web/src/builder/BuilderPage.tsx
git commit -m "$(cat <<'EOF'
feat(export): palette.css + retire cssSnippet

vars.ts가 변수 목록을 만들고 css.ts가 감싼다. palette.theme.css(Task 4)도
같은 함수를 쓰므로 두 파일의 선언이 갈라질 수 없다.

selectors 인자를 둔 이유: 미리보기가 스코프를 바꿔야 하는데, 생성된 CSS에
문자열 치환을 하면 깨지기 쉽다.

변수 이름이 --accent-500에서 --color-accent-500으로 바뀐다 — Tailwind v4가
그 접두사에서만 유틸리티를 만든다.

roles.ts는 역할표의 정의만 남기고 렌더러가 아니게 된다. DarkSection이
하드코딩하던 "액센트"·"뉴트럴"도 SCALE_ORDER에서 읽는다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `palette.theme.css` + Tailwind 실컴파일 테스트

스펙 D5의 주장(`@theme` O, `@theme inline` X)을 **테스트로 고정한다.** 설치된 `tailwindcss`의 `compile()`을 그대로 쓴다.

**Files:**
- Create: `src/export/color/theme-css.ts`
- Test: `tests/export/color/theme-css.test.ts`

**Interfaces:**
- Consumes: Task 3의 `primitiveVars`·`roleVars`·`darkRoleVars`·`renderBlock`
- Produces: `generateColorThemeCss(system: ColorSystem): string`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/export/color/theme-css.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { compile } from "tailwindcss";
import { generateColorThemeCss } from "../../../src/export/color/theme-css.js";
import { generateColorCss } from "../../../src/export/color/css.js";
import { fixtureSystem } from "./fixture.js";

const decls = (css: string) => [...css.matchAll(/^\s*(--[\w-]+):\s*(.+);$/gm)].map((m) => `${m[1]}: ${m[2]}`);

describe("generateColorThemeCss", () => {
  it("wraps the light layer in @theme, not @theme inline", () => {
    const css = generateColorThemeCss(fixtureSystem());
    expect(css).toContain("@theme {");
    expect(css).not.toContain("@theme inline");
  });

  it("puts .dark outside the @theme block", () => {
    const css = generateColorThemeCss(fixtureSystem());
    const themeEnd = css.indexOf("}", css.indexOf("@theme {"));
    expect(css.indexOf(".dark {")).toBeGreaterThan(themeEnd);
  });

  it("declares exactly the same variables as palette.css", () => {
    const system = fixtureSystem();
    expect(decls(generateColorThemeCss(system))).toEqual(decls(generateColorCss(system)));
  });
});

describe("Tailwind v4가 실제로 이 파일을 어떻게 컴파일하는가", () => {
  async function build(css: string, candidates: string[]) {
    const compiler = await compile(`${css}\n@tailwind utilities;\n`, { base: "/" });
    return compiler.build(candidates);
  }

  it("emits the used theme variables into :root", async () => {
    // Tailwind 4는 쓰이지 않는 @theme 변수를 털어낸다 — candidates가 비면
    // --color-accent-solid는 출력에 없다. 유틸리티를 하나 요구해야 나온다.
    const out = await build(generateColorThemeCss(fixtureSystem()), ["bg-accent-solid"]);
    expect(out).toContain("--color-accent-solid: var(--color-accent-500);");
  });

  it("compiles bg-accent-solid to a var() reference, not an inlined value", async () => {
    // 이게 D5의 핵심. @theme inline이면 var(--color-accent-500)로 치환돼
    // .dark에서 --color-accent-solid를 덮어도 죽은 선언이 된다.
    const out = await build(generateColorThemeCss(fixtureSystem()), ["bg-accent-solid"]);
    expect(out).toContain("background-color: var(--color-accent-solid)");
  });

  it("keeps the .dark re-declaration in the compiled output", async () => {
    const out = await build(generateColorThemeCss(fixtureSystem()), ["bg-accent-subtle-bg"]);
    // 여기선 헤더 주석이 이미 사라졌지만(Tailwind가 /*! 배너 말고는 다 턴다)
    // css.test.ts와 같은 앵커를 쓴다.
    const dark = out.slice(out.indexOf(".dark {"));
    expect(dark).toContain("--color-accent-subtle-bg: var(--color-accent-950);");
  });

  it("generates utilities for stop names too", async () => {
    const out = await build(generateColorThemeCss(fixtureSystem()), ["text-neutral-500"]);
    expect(out).toContain("color: var(--color-neutral-500)");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run tests/export/color/theme-css.test.ts`
Expected: FAIL — `theme-css.js` 해석 실패

- [ ] **Step 3: `theme-css.ts` 구현**

`src/export/color/theme-css.ts`:

```ts
// src/export/color/theme-css.ts
//
// Tailwind v4 테마. @theme(inline 아님)이라 유틸리티가 var(--color-…)를 참조하고
// 실제로 쓰인 변수가 :root로 나간다 — 그래서 .dark 재선언이 먹는다.
// (Tailwind 4는 쓰이지 않는 @theme 변수를 출력에서 털어낸다.)
// inline을 쓰면 값이 유틸리티에 치환돼 다크 역할 재배치가 통째로 죽는다 (스펙 D5).
// palette.css와 같은 변수 목록 함수를 쓰므로 두 파일이 갈라질 수 없다.

import type { ColorSystem } from "./types.js";
import { assertColorSystem } from "./types.js";
import { primitiveVars, roleVars, darkRoleVars, renderBlock } from "./vars.js";

const HEADER = [
  "/* 팔레트 생성기 산출 — Tailwind v4 테마 */",
  "/* @import \"tailwindcss\" 다음에 이 파일을 import하면 */",
  "/* bg-accent-solid · text-accent-text 같은 유틸리티가 생성된다. */",
  "/* 다크를 켜려면 루트에 .dark 클래스를 붙인다. */",
].join("\n");

export function generateColorThemeCss(system: ColorSystem): string {
  assertColorSystem(system);
  const light = [...primitiveVars(system), ...roleVars(system)];
  return [
    HEADER,
    "",
    renderBlock("@theme", light),
    "",
    renderBlock(".dark", darkRoleVars(system)),
    "",
  ].join("\n");
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/export/color/theme-css.test.ts`
Expected: PASS

컴파일 테스트가 실패하면 **멈추고 보고할 것** — 스펙 D5의 전제가 틀린 것이고, `palette.theme.css` 설계 자체를 다시 열어야 한다.

- [ ] **Step 5: 커밋**

```bash
git add src/export/color/theme-css.ts tests/export/color/theme-css.test.ts
git commit -m "$(cat <<'EOF'
feat(export): palette.theme.css for Tailwind v4

@theme(inline 아님)으로 감싼다. 설치된 tailwindcss의 compile()로 실제 컴파일해
세 가지를 테스트로 고정했다: 변수가 :root로 나가는가, bg-accent-solid가
var(--color-accent-solid)로 컴파일되는가(값 인라인이 아닌가), .dark 재선언이
출력에 살아남는가.

inline을 쓰면 값이 유틸리티에 치환돼 다크 역할 재배치가 죽는다. 눈으로 확인할
문제가 아니라 회귀를 잡아야 하는 문제라 테스트로 뒀다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `palette.figma.json`

**Files:**
- Create: `src/export/color/figma.ts`
- Test: `tests/export/color/figma.test.ts`

**Interfaces:**
- Consumes: Task 1의 `ColorSystem`; `src/figma/types.ts`의 `FigmaDesignSystem`·`FigmaVariable`·`FigmaVariableCollection` (타입만)
- Produces: `toColorFigma(system: ColorSystem): FigmaDesignSystem`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/export/color/figma.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { toColorFigma } from "../../../src/export/color/figma.js";
import { fixtureSystem } from "./fixture.js";

describe("toColorFigma", () => {
  it("emits exactly two collections and no text/effect styles", () => {
    const f = toColorFigma(fixtureSystem());
    expect(f.variableCollections.map((c) => c.name)).toEqual(["Color Primitives", "Colors"]);
    expect(f.textStyles).toEqual([]);
    expect(f.effectStyles).toEqual([]);
  });

  it("gives Color Primitives a single mode — primitives do not change with the theme", () => {
    const [primitives] = toColorFigma(fixtureSystem()).variableCollections;
    expect(primitives.modes).toHaveLength(1);
    expect(primitives.modes[0].name).toBe("Default");
    expect(primitives.variables).toHaveLength(66);
  });

  it("gives Colors two modes with one variable per scale × role", () => {
    const [, colors] = toColorFigma(fixtureSystem()).variableCollections;
    expect(colors.modes.map((m) => m.name)).toEqual(["Light", "Dark"]);
    expect(colors.variables).toHaveLength(36);
  });

  it("resolves each role to the hex at its light/dark index", () => {
    const system = fixtureSystem();
    const [, colors] = toColorFigma(system).variableCollections;
    const accent = system.scales[0];
    const solid = system.roles.find((r) => r.id === "solid")!;
    const v = colors.variables.find((x) => x.name === "accent-solid")!;
    const [light, dark] = colors.modes.map((m) => m.modeId);
    expect(v.valuesByMode[light]).toBe(accent.hexes[solid.lightIndex]);
    expect(v.valuesByMode[dark]).toBe(accent.hexes[solid.darkIndex]);
  });

  it("names variables {scale}-{key} without slashes — slashes create Figma folders", () => {
    const f = toColorFigma(fixtureSystem());
    for (const c of f.variableCollections) {
      for (const v of c.variables) {
        expect(v.name).not.toContain("/");
        expect(v.type).toBe("COLOR");
      }
    }
    expect(f.variableCollections[0].variables[0].name).toBe("accent-50");
  });

  it("keeps every scale's stops in stopKeys order", () => {
    const system = fixtureSystem();
    const [primitives] = toColorFigma(system).variableCollections;
    const accentNames = primitives.variables
      .filter((v) => v.name.startsWith("accent-"))
      .map((v) => v.name);
    expect(accentNames).toEqual(system.stopKeys.map((k) => `accent-${k}`));
  });

  it("runs the contract guards", () => {
    const s = fixtureSystem();
    expect(() => toColorFigma({ ...s, stopKeys: [] })).toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run tests/export/color/figma.test.ts`
Expected: FAIL — 모듈 해석 실패

- [ ] **Step 3: `figma.ts` 구현**

`src/export/color/figma.ts`:

```ts
// src/export/color/figma.ts
//
// Figma 변수 컬렉션 2개. 레거시(src/figma/transformer.ts)와 다른 점:
// Color Primitives가 단일 모드다. 우리는 프리미티브가 테마 간에 안 변하고
// 역할이 가리키는 자리만 바뀌므로, 프리미티브에 Light/Dark를 둘 이유가 없다.
//
// 값은 해석된 hex다. FigmaVariable.valuesByMode가 string | number라 별칭을
// 표현할 타입이 없다 — 역할↔프리미티브 관계는 이 산출물에서 사라진다 (알려진 한계).

import type {
  FigmaDesignSystem,
  FigmaVariable,
  FigmaVariableCollection,
} from "../../figma/types.js";
import type { ColorSystem } from "./types.js";
import { assertColorSystem } from "./types.js";

const DEFAULT_MODE = "mode-default";
const LIGHT_MODE = "mode-light";
const DARK_MODE = "mode-dark";

export function toColorFigma(system: ColorSystem): FigmaDesignSystem {
  assertColorSystem(system);

  const primitives: FigmaVariable[] = [];
  for (const scale of system.scales) {
    system.stopKeys.forEach((key, i) => {
      primitives.push({
        name: `${scale.name}-${key}`,
        type: "COLOR",
        valuesByMode: { [DEFAULT_MODE]: scale.hexes[i] },
      });
    });
  }

  const roles: FigmaVariable[] = [];
  for (const scale of system.scales) {
    for (const role of system.roles) {
      roles.push({
        name: `${scale.name}-${role.id}`,
        type: "COLOR",
        valuesByMode: {
          [LIGHT_MODE]: scale.hexes[role.lightIndex],
          [DARK_MODE]: scale.hexes[role.darkIndex],
        },
      });
    }
  }

  const variableCollections: FigmaVariableCollection[] = [
    {
      name: "Color Primitives",
      modes: [{ name: "Default", modeId: DEFAULT_MODE }],
      variables: primitives,
    },
    {
      name: "Colors",
      modes: [
        { name: "Light", modeId: LIGHT_MODE },
        { name: "Dark", modeId: DARK_MODE },
      ],
      variables: roles,
    },
  ];

  return { variableCollections, textStyles: [], effectStyles: [] };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/export/color/figma.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/export/color/figma.ts tests/export/color/figma.test.ts
git commit -m "$(cat <<'EOF'
feat(export): palette.figma.json — two colour collections

Color Primitives는 단일 모드다. 레거시는 여기에도 Light/Dark를 두는데,
그건 프리미티브 자체를 뒤집는 전략이기 때문이다. 우리는 프리미티브가 테마 간에
안 변하므로 모드가 하나면 충분하다.

값은 해석된 hex다 — FigmaVariable에 별칭 타입이 없어 역할↔프리미티브 관계는
이 산출물에서 사라진다. 레거시도 같고, 알려진 한계로 스펙에 적혀 있다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `DESIGN.md` + `index.ts`

**Files:**
- Create: `src/export/color/design-md.ts`, `src/export/color/index.ts`
- Modify: `web/src/builder/BuilderPage.tsx` (import 정리)
- Test: `tests/export/color/design-md.test.ts`

**Interfaces:**
- Consumes: Task 1의 `ColorSystem`
- Produces:
  - `renderColorDesignMd(system: ColorSystem): string`
  - `src/export/color/index.ts`가 `toColorSystem`·`generateColorCss`·`generateColorThemeCss`·`toColorFigma`·`renderColorDesignMd`와 모든 타입을 재수출

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/export/color/design-md.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderColorDesignMd } from "../../../src/export/color/design-md.js";
import { fixtureSystem } from "./fixture.js";

describe("renderColorDesignMd", () => {
  it("has a section per scale titled with the display label, not the identifier", () => {
    const md = renderColorDesignMd(fixtureSystem());
    for (const scale of fixtureSystem().scales) {
      expect(md).toContain(`### ${scale.label}`);
    }
    expect(md).toContain("### 액센트");
    expect(md).not.toContain("### accent");
  });

  it("lists every hex — 6 scales × 11 stops", () => {
    const system = fixtureSystem();
    const md = renderColorDesignMd(system);
    const all = system.scales.flatMap((s) => s.hexes);
    expect(all).toHaveLength(66);
    for (const hex of all) expect(md).toContain(hex);
  });

  it("has one role-table row per role, with the light and dark stop names", () => {
    const system = fixtureSystem();
    const md = renderColorDesignMd(system);
    for (const role of system.roles) {
      const light = system.stopKeys[role.lightIndex];
      const dark = system.stopKeys[role.darkIndex];
      expect(md).toContain(`| ${role.label} | ${light} | ${dark} |`);
    }
  });

  it("carries the usage rules a consumer needs to not misuse the palette", () => {
    const md = renderColorDesignMd(fixtureSystem());
    expect(md).toContain("상태색은 브랜드 색이 아니다");
    expect(md).toContain(".dark");
  });

  it("carries no derivation rationale and no builder journey", () => {
    // 설계 결정을 테스트로 고정한다 (스펙 "근거와 여정은 넣지 않는다").
    // 교보재는 결정하는 순간에만 행동을 바꾼다 — 확정된 팔레트를 받는 소비자에겐
    // 행동을 바꾸지 않는 읽을거리다.
    const md = renderColorDesignMd(fixtureSystem());
    for (const banned of ["어트랙터", "갈색", "내가 고른", "여정", "코퍼스", "tailwind stone"]) {
      expect(md, banned).not.toContain(banned);
    }
  });

  it("describes the mirror rule without hardcoding an 11-stop scale", () => {
    const md = renderColorDesignMd(fixtureSystem());
    expect(md).not.toContain("10−i");
    expect(md).not.toContain("10-i");
  });

  it("runs the contract guards", () => {
    const s = fixtureSystem();
    expect(() => renderColorDesignMd({ ...s, stopKeys: [] })).toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm vitest run tests/export/color/design-md.test.ts`
Expected: FAIL — 모듈 해석 실패

- [ ] **Step 3: `design-md.ts` 구현**

`src/export/color/design-md.ts`:

```ts
// src/export/color/design-md.ts
//
// 핸드오프 문서. 값과 사용 규칙만 담는다.
// 유도 근거("왜 이 뉴트럴 hue인가")와 빌더에서의 선택 기록은 넣지 않는다 —
// 그건 고르는 순간에만 행동을 바꾸고, 확정된 팔레트를 받는 소비자에겐
// 행동을 바꾸지 않는 읽을거리다. 교보재는 빌더 화면에 남는다.
//
// "쓰는 법"의 항목들은 근거가 아니라 사용 규칙이다 — 안 적으면 소비자가
// 상태색을 브랜드에 맞춰 바꾸거나 다크용 색을 새로 만든다.

import type { ColorSystem } from "./types.js";
import { assertColorSystem } from "./types.js";

const USAGE_RULES: readonly string[] = [
  "상태색은 브랜드 색이 아니다 — 브랜드에 맞춰 바꾸지 말 것.",
  "배경과 텍스트는 뉴트럴, 강조만 액센트.",
  "다크는 색을 새로 만들지 않는다 — 역할이 가리키는 stop만 바뀐다.",
  "다크를 켜려면 루트에 `.dark` 클래스를 붙인다. 시스템 설정을 자동으로 따르지 않는다.",
];

export function renderColorDesignMd(system: ColorSystem): string {
  assertColorSystem(system);
  const lines: string[] = ["# 색 시스템", ""];

  lines.push("## 스케일", "");
  for (const scale of system.scales) {
    lines.push(`### ${scale.label}`, "", "| stop | hex |", "| --- | --- |");
    system.stopKeys.forEach((key, i) => {
      lines.push(`| ${key} | ${scale.hexes[i]} |`);
    });
    lines.push("");
  }

  lines.push("## 역할", "", "| 역할 | 라이트 | 다크 |", "| --- | --- | --- |");
  for (const role of system.roles) {
    lines.push(
      `| ${role.label} | ${system.stopKeys[role.lightIndex]} | ${system.stopKeys[role.darkIndex]} |`,
    );
  }
  lines.push(
    "",
    "다크는 사다리의 반대쪽 자리를 쓴다. 라이트와 다크가 같은 역할은 테마를 가로질러 고정이다.",
    "",
  );

  lines.push("## 쓰는 법", "");
  for (const rule of USAGE_RULES) lines.push(`- ${rule}`);
  lines.push("");

  return lines.join("\n");
}
```

- [ ] **Step 4: `index.ts` 작성**

`src/export/color/index.ts`:

```ts
// src/export/color/index.ts
//
// 색 산출물의 공개 표면. web/이 여기서만 import한다.

export type { ColorSystem, ExportRole, ExportScale } from "./types.js";
export { assertColorSystem } from "./types.js";
export type { ScaleSetLike, ScaleDescriptorLike } from "./adapter.js";
export { toColorSystem } from "./adapter.js";
export type { CssSelectors } from "./css.js";
export { generateColorCss } from "./css.js";
export { generateColorThemeCss } from "./theme-css.js";
export { toColorFigma } from "./figma.js";
export { renderColorDesignMd } from "./design-md.js";
```

- [ ] **Step 5: `BuilderPage`의 import를 `index.js`로 합치기**

Task 3에서 두 줄로 나눠 넣었던 import를 한 줄로 바꾼다:

```tsx
import { generateColorCss, toColorSystem } from "@core/export/color/index.js";
```

- [ ] **Step 6: 테스트 + 타입체크**

Run: `pnpm test && (cd web && npx tsc -b --noEmit)`
Expected: 둘 다 PASS

- [ ] **Step 7: 커밋**

```bash
git add src/export/color/ tests/export/color/design-md.test.ts web/src/builder/BuilderPage.tsx
git commit -m "$(cat <<'EOF'
feat(export): colour-only DESIGN.md + public surface

값(스케일 표·역할표)과 사용 규칙만 담는다. 유도 근거와 빌더 여정은 넣지 않는다 —
그건 고르는 순간에만 행동을 바꾸고, 확정된 팔레트를 받는 소비자에겐 행동을 바꾸지
않는 읽을거리다. 그 결정을 테스트로 고정했다(금지 문구 검사).

미러 규칙을 "10−i"로 쓰지 않는다. stopKeys가 데이터라 스케일 길이를 문서가
가정하면 안 된다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 다운로드 패널 + 격리된 미리보기

**Files:**
- Create: `web/src/builder/ExportPanel.tsx`
- Modify: `web/src/builder/BuilderPage.tsx` (`DarkSection`의 copy 버튼 제거, `ExportPanel` 배선)

**Interfaces:**
- Consumes: Task 6의 `@core/export/color/index.js` 전체; `@core/lab/palette/roles.js`의 `SCALE_ORDER`·`SCALE_ROLES`·`ScaleSet`; `@core/lab/palette/builder.js`의 `STOP_KEYS`
- Produces: `ExportPanel({ scales }: { scales: ScaleSet })`

- [ ] **Step 1: `ExportPanel.tsx` 작성**

```tsx
// web/src/builder/ExportPanel.tsx
//
// 산출물 다운로드 + 격리된 미리보기.
// 미리보기가 @theme이 아니라 palette.css를 쓰는 이유: @theme은 빌드 타임
// 지시문이라 런타임에 <style>로 주입해도 유틸리티가 생성되지 않는다.
// 대신 스코프된 변수를 직접 참조한다 — 덕분에 전역 오염도 구조적으로 불가능하다.

import { useMemo, useState } from "react";
import {
  generateColorCss,
  generateColorThemeCss,
  renderColorDesignMd,
  toColorFigma,
  toColorSystem,
} from "@core/export/color/index.js";
import { SCALE_ORDER, SCALE_ROLES, type ScaleSet } from "@core/lab/palette/roles.js";
import { STOP_KEYS } from "@core/lab/palette/builder.js";

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const buttonClass =
  "px-3 py-1.5 rounded-md border border-neutral-200 bg-white text-[11px] font-medium " +
  "text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors";

const PREVIEW_SELECTORS = {
  light: ".palette-preview",
  dark: ".palette-preview.dark",
};

export function ExportPanel({ scales }: { scales: ScaleSet }) {
  const [dark, setDark] = useState(false);

  const system = useMemo(
    () => toColorSystem(scales, SCALE_ORDER, SCALE_ROLES, STOP_KEYS),
    [scales],
  );
  const files = useMemo(
    () => ({
      css: generateColorCss(system),
      themeCss: generateColorThemeCss(system),
      figma: JSON.stringify(toColorFigma(system), null, 2),
      designMd: renderColorDesignMd(system),
    }),
    [system],
  );
  const previewCss = useMemo(
    () => generateColorCss(system, PREVIEW_SELECTORS),
    [system],
  );

  return (
    <div className="space-y-3 border-t border-neutral-200 pt-4">
      <h2 className="text-sm font-medium">받아 가기 — 색만</h2>
      <p className="text-[11px] leading-4 text-neutral-400">
        타이포·간격·라운드는 여기 없습니다. 이 네 파일은 색 시스템만 담습니다.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={() => downloadFile("palette.css", files.css, "text/css")}
        >
          palette.css
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => downloadFile("palette.theme.css", files.themeCss, "text/css")}
        >
          palette.theme.css
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => downloadFile("palette.figma.json", files.figma, "application/json")}
        >
          palette.figma.json
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => downloadFile("DESIGN.md", files.designMd, "text/markdown")}
        >
          DESIGN.md
        </button>
        <button
          type="button"
          className="px-3 py-1.5 text-[11px] text-neutral-400 hover:text-neutral-700"
          onClick={() => navigator.clipboard.writeText(files.css)}
        >
          copy CSS
        </button>
      </div>

      <p className="text-[11px] leading-4 text-neutral-400">
        <span className="font-medium text-neutral-500">palette.css</span>는 어디서나
        쓰는 변수,{" "}
        <span className="font-medium text-neutral-500">palette.theme.css</span>는
        Tailwind v4에서 <code>bg-accent-solid</code> 같은 유틸리티까지 만들어 줍니다.
      </p>

      <div className="space-y-2 border-t border-neutral-100 pt-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[11px] font-medium text-neutral-600">
            받아 간 변수로 그린 미리보기
          </h3>
          <button
            type="button"
            className="text-[10px] text-neutral-400 hover:text-neutral-700"
            onClick={() => setDark((d) => !d)}
          >
            {dark ? "라이트로" : "다크로"}
          </button>
        </div>
        <style>{previewCss}</style>
        <div
          className={`palette-preview rounded-lg p-4 space-y-3${dark ? " dark" : ""}`}
          style={{ background: "var(--color-neutral-subtle-bg)" }}
        >
          <div
            className="rounded-md p-3 space-y-2"
            style={{
              background: "var(--color-accent-subtle-bg)",
              border: "1px solid var(--color-accent-border)",
            }}
          >
            <div
              className="text-[11px] font-medium"
              style={{ color: "var(--color-accent-text-strong)" }}
            >
              알림 카드 제목
            </div>
            <div className="text-[11px]" style={{ color: "var(--color-accent-text)" }}>
              링크 텍스트가 이 색으로 보입니다
            </div>
          </div>
          <div className="flex gap-2">
            <span
              className="rounded px-2 py-1 text-[11px] font-medium text-white"
              style={{ background: "var(--color-accent-solid)" }}
            >
              솔리드 버튼
            </span>
            <span
              className="rounded px-2 py-1 text-[11px] font-medium"
              style={{
                background: "var(--color-error-subtle-bg)",
                color: "var(--color-error-text-strong)",
              }}
            >
              오류 배지
            </span>
          </div>
        </div>
        <p className="text-[11px] leading-4 text-neutral-400">
          이 블록 안에서만 변수가 유효합니다 — 나머지 화면은 안 바뀝니다. 토글해 보면
          색이 새로 만들어지는 게 아니라 역할이 가리키는 자리만 옮겨가는 걸 볼 수 있습니다.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `BuilderPage`에 배선**

1. import 추가: `import { ExportPanel } from "./ExportPanel";`
2. `DarkSection`에서 `copyCss` 함수와 `copy CSS` 버튼을 **제거**한다 (이제 `ExportPanel`에 있다). Task 3·6에서 넣었던 `generateColorCss`·`toColorSystem` import도 `DarkSection`이 더 이상 쓰지 않으면 제거한다. 헤더의 `<h2>`는 남긴다.
3. 완료 화면에서 `<DarkSection>` **다음에** 패널을 렌더한다:

```tsx
{scaleSet && <DarkSection scales={scaleSet} />}
{scaleSet && <ExportPanel scales={scaleSet} />}
```

- [ ] **Step 3: 타입체크**

Run: `cd web && npx tsc -b --noEmit`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add web/src/builder/ExportPanel.tsx web/src/builder/BuilderPage.tsx
git commit -m "$(cat <<'EOF'
feat(builder): download panel + scoped preview

파일 4개 다운로드 + copy CSS. 미리보기는 @theme이 아니라 palette.css를
.palette-preview 스코프로 주입하고 조각들이 var(--color-*)를 직접 참조한다 —
@theme은 빌드 타임 지시문이라 런타임 주입으로는 유틸리티가 생성되지 않는다.

그 덕에 전역 오염이 구조적으로 불가능하다. 앱 전역에 넣으면 사용자의 뉴트럴이
Tailwind 기본 --color-neutral-*을 덮어 툴 자신의 UI가 다시 칠해진다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `web/` 테스트 하네스 + 스모크 테스트

지난 사이클 최종 리뷰의 판정("이번 병합엔 받아들일 만하지만 다음엔 아니다")을 갚는다.

**Files:**
- Create: `web/vitest.config.ts`, `web/vitest.setup.ts`
- Create: `web/src/builder/BuilderPage.test.tsx`
- Modify: `web/package.json` (test 스크립트 + devDependencies)

**Interfaces:**
- Produces: `cd web && npm test`

- [ ] **Step 1: 의존성 설치**

```bash
cd web && npm install -D vitest jsdom @testing-library/react
```

- [ ] **Step 2: `web/package.json`에 스크립트 추가**

`"scripts"`에 `"preview"` 다음 줄로:

```json
    "test": "vitest run"
```

- [ ] **Step 3: vitest 설정**

`web/vitest.config.ts`:

```ts
// web/vitest.config.ts
//
// vite.config.ts를 재사용하지 않고 필요한 것만 다시 쓴다 — tailwind 플러그인은
// 테스트에서 할 일이 없고, 있으면 CSS 파이프라인이 끼어들 여지만 생긴다.

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "../src"),
      "@data": path.resolve(__dirname, "../data"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

`web/vitest.setup.ts`:

```ts
// web/vitest.setup.ts
//
// jsdom은 canvas 2D 컨텍스트를 구현하지 않는다. OklchPicker는 getContext가
// null이면 그냥 반환하도록 짜여 있어 동작에는 문제가 없지만, 스텁이 없으면
// jsdom이 "Not implemented" 오류를 테스트 출력에 찍는다. 출력은 깨끗해야 한다.

HTMLCanvasElement.prototype.getContext =
  (() => null) as unknown as HTMLCanvasElement["getContext"];
```

- [ ] **Step 4: 실패하는 스모크 테스트 작성**

`web/src/builder/BuilderPage.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BuilderPage } from "./BuilderPage";

/** 6단계를 완주한다. 1단계는 기본 액센트를 그대로 확정하고,
 *  2~6단계는 매번 두 번째 후보를 고른다. */
function completeSixSteps() {
  const confirm = () => fireEvent.click(screen.getByRole("button", { name: /이 색으로 확정/ }));
  confirm();
  for (let step = 0; step < 5; step++) {
    const radios = screen.getAllByRole("radio");
    expect(radios.length, `step ${step + 2}`).toBeGreaterThanOrEqual(2);
    fireEvent.click(radios[1]);
    confirm();
  }
}

describe("BuilderPage 6단계 완주", () => {
  it("renders all six scales and the four downloads on the completion screen", () => {
    render(<BuilderPage />);
    completeSixSteps();

    // 스케일 6종이 화면에 있는가 — 액센트/뉴트럴은 섹션 제목으로, 시맨틱은 라벨로.
    expect(screen.getByText("완성된 스케일")).toBeTruthy();
    expect(screen.getByText("뉴트럴 — 배경 회색")).toBeTruthy();
    for (const label of ["오류 (빨강)", "경고 (앰버)", "성공 (초록)", "정보 (파랑)"]) {
      expect(screen.getAllByText(label).length, label).toBeGreaterThan(0);
    }

    // 산출물 4종
    for (const name of ["palette.css", "palette.theme.css", "palette.figma.json", "DESIGN.md"]) {
      expect(screen.getByRole("button", { name }), name).toBeTruthy();
    }
  });

  it("keeps the preview scoped — the injected CSS never targets :root", () => {
    render(<BuilderPage />);
    completeSixSteps();
    const styles = [...document.querySelectorAll("style")].map((s) => s.textContent ?? "");
    const injected = styles.find((s) => s.includes("--color-accent-500"));
    expect(injected, "미리보기 CSS가 주입되지 않았다").toBeTruthy();
    expect(injected!).toContain(".palette-preview");
    expect(injected!).not.toContain(":root");
  });

  it("toggles the preview between light and dark", () => {
    render(<BuilderPage />);
    completeSixSteps();
    const toggle = screen.getByRole("button", { name: "다크로" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "라이트로" })).toBeTruthy();
    expect(document.querySelector(".palette-preview.dark")).toBeTruthy();
  });
});
```

- [ ] **Step 5: 테스트 실패 확인**

Run: `cd web && npm test`
Expected: **PASS 3/3**, 출력에 경고·오류 없음.

> 이 태스크에는 RED 단계가 없다 — Task 7이 이미 구현을 만들었고, 이 테스트는
> 그걸 **검증하러** 온다. 통과하지 않으면 Task 7의 구현에 실제 결함이 있는 것이고,
> 그게 이 테스트를 쓰는 이유다. 실패하면 **테스트를 약화시키지 말고** 무엇이
> 렌더되지 않았는지 보고할 것. 렌더 단계에서 예외가 난다면 jsdom 환경 문제이므로
> 역시 멈추고 보고할 것.

- [ ] **Step 6: 출력이 깨끗한지 확인**

Run: `cd web && npm test 2>&1 | tail -20`
Expected: 실패 0, `Not implemented` 같은 jsdom 경고 0. 경고가 보이면 `vitest.setup.ts`의
스텁이 안 걸린 것이다 — `setupFiles` 경로를 확인할 것.

- [ ] **Step 7: 커밋**

```bash
git add web/vitest.config.ts web/vitest.setup.ts web/src/builder/BuilderPage.test.tsx web/package.json web/package-lock.json
git commit -m "$(cat <<'EOF'
test(web): first DOM test harness + builder smoke test

지난 사이클 최종 리뷰가 "이번 병합엔 받아들일 만하지만 다음엔 아니다"라고
판정한 빚을 갚는다. web/에 자동 테스트가 하나도 없었다.

web/에 자체 vitest를 둔다. 루트는 pnpm, web/은 npm이라 node_modules가 갈라져
있어서 루트 vitest에 workspace로 물리면 React·별칭 해석이 얽힌다.

jsdom이 canvas 2D를 구현하지 않아 OklchPicker가 "Not implemented"를 출력한다.
동작에는 영향이 없지만 출력은 깨끗해야 하므로 setup에서 스텁을 둔다.

지난 사이클에서 사람 눈으로 찾은 "뉴트럴 스트립 누락"이 이 테스트였으면 잡혔다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: 최종 검증 + 문서 마감

**Files:**
- Modify: `docs/superpowers/plans/2026-08-10-palette-color-export.md` (이 파일 — 체크박스와 결과 기록)
- Modify: `docs/superpowers/specs/2026-08-09-palette-generator-color-system-design.md` (이월 항목 해소 표시)
- Modify: `README.md` 또는 `docs/` 색 산출물 언급 (아래 Step 3 참조)

- [ ] **Step 1: 전체 검증**

```bash
pnpm test && (cd web && npx tsc -b --noEmit) && (cd web && npm test)
```

Expected: 셋 다 PASS

- [ ] **Step 2: 실제 산출물 눈 검증**

`cd web && npm run dev` 후 `#builder`에서 6단계를 완주하고:

1. 다운로드 버튼 4개를 눌러 파일이 실제로 받아지는가.
2. `palette.css`를 열어 `:root` 102선언 / `.dark` 30선언인가. `--*-solid`가 `.dark`에 **없는가**.
3. `palette.theme.css`가 `@theme {`으로 열리고 `@theme inline`이 **아닌가**.
4. `palette.figma.json`의 `variableCollections`가 2개이고 `Color Primitives`의 `modes`가 1개인가.
5. `DESIGN.md`에 스케일 6개 섹션·역할 6행·쓰는 법 4줄이 있고 **유도 근거가 없는가**.
6. 미리보기 블록의 다크 토글이 실제로 색을 바꾸는가. **토글해도 주변 UI는 안 바뀌는가** (D7의 격리).
7. 콘솔 에러 0.

결과를 이 파일 하단에 기록한다.

- [ ] **Step 3: 산출물을 문서에 올리기**

`README.md`의 기존 **`## Using the outputs`** 절에 색 산출물 4종을 한 문단으로 덧붙인다 — 무엇이 나오고, `palette.css`와 `palette.theme.css`가 어떻게 다르고, 비색 토큰은 여기 없다는 것. 그 절의 기존 문장 형식(레거시 위자드 산출물 설명)을 따를 것.

- [ ] **Step 4: 사이클 1 스펙의 이월 항목 갱신**

`docs/superpowers/specs/2026-08-09-palette-generator-color-system-design.md:391`의 항목:

```
- 4개 산출물 파이프라인 · 위자드 레거시화 · 비색 카테고리 출처 — **사이클 2**.
```

셋 중 **산출물 파이프라인만** 이 사이클로 해소됐다. 줄을 통째로 긋지 말고 둘로 쪼갠다:

```
- ~~4개 산출물 파이프라인~~ — 해소: `2026-08-10-palette-color-export-design.md` (2026-08-10).
- 위자드 레거시화 · 비색 카테고리 출처 — 이월.
```

(그 문서에는 아직 취소선 용례가 없다. 형제 문서 `2026-07-28-dark-accent-roles-design.md`가
쓰는 방식이므로 그걸 따른다.)

- [ ] **Step 5: 커밋**

```bash
git add -A docs README.md
git commit -m "$(cat <<'EOF'
docs: close out the colour export plan

계획 체크박스와 눈 검증 결과를 기록하고, 사이클 1 스펙의 이월 항목
"산출물 파이프라인"에 해소 표시를 남긴다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## 자기 검토 메모 (계획 작성자가 남김)

계획을 쓰며 스펙에서 발견해 **스펙을 고친** 것들 — 구현자는 최신 스펙을 보면 된다:

1. `@theme`을 런타임에 `<style>`로 주입해도 Tailwind 유틸리티는 생성되지 않는다(빌드 타임 지시문). 미리보기 설계를 `palette.css` + 스코프 변수로 바꿨고, Tailwind v4 동작은 Task 4의 컴파일 테스트가 대신 증명한다.
2. `ExportScale`에 `label`이 없어 DESIGN.md가 `accent`를 제목으로 쓸 뻔했다.
3. `ScaleSet.semantic`이 Record라 키 순서에 기대면 출력이 불안정하다 → 엔진의 `SCALE_ORDER`.

구현 중 새로 발견하는 것이 있으면 같은 방식으로 스펙을 고치고 계획을 따라 갱신할 것.
