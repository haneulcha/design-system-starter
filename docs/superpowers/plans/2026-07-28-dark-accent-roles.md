# 다크 액센트 역할 재배치 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 빌더 완료 화면에 다크 테마 역할 재배치(6역할 고정표 + 라이트/다크 미니 목업 + copy CSS)를 추가한다 — 새 색 0개, 기존 11-stop 안에서 역할만 재배치.

**Architecture:** 순수 엔진 `src/lab/accent-scale/roles.ts`(역할표 상수 + CSS 스니펫 생성)와 `web/src/builder/BuilderPage.tsx` 완료 화면의 렌더 전용 다크 섹션. 다크 매핑 규칙은 "인덱스 미러(i → 10−i), 솔리드(앵커)만 5로 고정" 하나다.

**Tech Stack:** TypeScript (Node16 ESM), vitest, React + Tailwind (web/), 기존 builder 엔진(`fillScale`, `STOP_KEYS`) 재사용.

**Spec:** `docs/superpowers/specs/2026-07-28-dark-accent-roles-design.md`

## Global Constraints

- 루트는 pnpm + TypeScript Node16 ESM — `src/`와 `tests/`의 상대 import는 `.js` 확장자 필수.
- `web/`은 npm — 검증은 `cd web && npx tsc --noEmit && npm run build`.
- 랩 격리: `src/generator/`는 `src/lab/`을 import하지 않는다(역방향 lab→generator는 허용, 기존 `parsePrimary` 패턴). 브라우저 안전: 정적 ESM만, Node 전용 API 금지.
- FP 원칙: 계산·UI 문구(라벨/note)는 엔진(`src/lab/accent-scale/roles.ts`)에, `web/`은 렌더만.
- CSS 변수 이름 계약: 프리미티브 `--accent-50`…`--accent-950`(STOP_KEYS 그대로), 시맨틱 `--accent-<role-id>`. `.dark` 블록에는 매핑이 바뀌는 역할만(솔리드 제외 5개).
- 역할 6개 고정: `subtle-bg`(0→10) / `hover-bg`(1→9) / `border`(2→8) / `solid`(5→5) / `text`(6→4) / `text-strong`(7→3). (lightIndex→darkIndex)
- 목업 패널 배경 고정값: 라이트 `#ffffff`, 다크 `#171717`.
- 커밋 트레일러: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: 역할 엔진 `roles.ts` (역할표 + cssSnippet)

**Files:**
- Create: `src/lab/accent-scale/roles.ts`
- Test: `tests/lab/roles.test.ts`

**Interfaces:**
- Consumes: `SCALE_SIZE`, `STOP_KEYS` (`src/lab/accent-scale/builder.ts`); 테스트에서 `fillScale`, `Pin`(builder), `parsePrimary`, `oklchToHex`(`src/generator/color.ts`).
- Produces: `AccentRole` 인터페이스, `ACCENT_ROLES: readonly AccentRole[]`(6개), `cssSnippet(hexes: readonly string[]): string` — Task 2가 이 세 이름을 그대로 import한다.

- [x] **Step 1: 실패하는 테스트 작성**

`tests/lab/roles.test.ts` 전체:

```ts
import { describe, it, expect } from "vitest";
import { ACCENT_ROLES, cssSnippet } from "../../src/lab/accent-scale/roles.js";
import {
  fillScale,
  STOP_KEYS,
  type Pin,
} from "../../src/lab/accent-scale/builder.js";
import { oklchToHex, parsePrimary } from "../../src/generator/color.js";

describe("ACCENT_ROLES", () => {
  it("has exactly 6 roles with unique ids", () => {
    expect(ACCENT_ROLES).toHaveLength(6);
    expect(new Set(ACCENT_ROLES.map((r) => r.id)).size).toBe(6);
  });

  it("labels and notes are educational (non-trivial length)", () => {
    for (const r of ACCENT_ROLES) {
      expect(r.label.length, r.id).toBeGreaterThan(0);
      expect(r.note.length, r.id).toBeGreaterThan(10);
    }
  });

  it("indexes are integers in 0..10", () => {
    for (const r of ACCENT_ROLES) {
      for (const idx of [r.lightIndex, r.darkIndex]) {
        expect(Number.isInteger(idx), r.id).toBe(true);
        expect(idx, r.id).toBeGreaterThanOrEqual(0);
        expect(idx, r.id).toBeLessThanOrEqual(10);
      }
    }
  });

  it("dark mapping mirrors the light index (i → 10−i), except solid stays at the anchor", () => {
    for (const r of ACCENT_ROLES) {
      if (r.id === "solid") {
        expect(r.lightIndex).toBe(5);
        expect(r.darkIndex).toBe(5);
      } else {
        expect(r.darkIndex, r.id).toBe(10 - r.lightIndex);
      }
    }
  });
});

describe("cssSnippet", () => {
  // 서로 다른 더미 hex 11개 — 프리미티브가 각자 자기 값에 매였는지 식별 가능
  const HEXES = STOP_KEYS.map(
    (_, i) => `#0000${i.toString(16).padStart(2, "0")}`,
  );

  it("throws unless given exactly 11 hexes", () => {
    expect(() => cssSnippet(HEXES.slice(0, 10))).toThrow(/11/);
    expect(() => cssSnippet([...HEXES, "#ffffff"])).toThrow(/11/);
  });

  it("declares all 11 primitives and 6 semantic roles in :root", () => {
    const css = cssSnippet(HEXES);
    STOP_KEYS.forEach((key, i) => {
      expect(css).toContain(`--accent-${key}: ${HEXES[i]};`);
    });
    for (const r of ACCENT_ROLES) {
      expect(css).toContain(
        `--accent-${r.id}: var(--accent-${STOP_KEYS[r.lightIndex]});`,
      );
    }
  });

  it(".dark re-declares only the roles whose mapping changes — solid is absent", () => {
    const css = cssSnippet(HEXES);
    const dark = css.slice(css.indexOf(".dark {"));
    for (const r of ACCENT_ROLES) {
      if (r.id === "solid") continue;
      expect(dark).toContain(
        `--accent-${r.id}: var(--accent-${STOP_KEYS[r.darkIndex]});`,
      );
    }
    expect(dark).not.toContain("--accent-solid");
    // 선언(콜론 동반)은 바뀌는 역할 수만큼만 — 현재 5개
    expect(dark.match(/--accent-[a-z-]+:/g)).toHaveLength(5);
  });

  it("every var() reference resolves to a declaration in the same snippet", () => {
    const css = cssSnippet(HEXES);
    const declared = new Set(
      [...css.matchAll(/(--accent-[\w-]+)(?=:)/g)].map((m) => m[1]),
    );
    const refs = [...css.matchAll(/var\((--accent-[\w-]+)\)/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const name of refs) {
      expect(declared.has(name), name).toBe(true);
    }
  });

  it("works end-to-end with a real fillScale result", () => {
    const pins: Pin[] = [{ index: 5, color: parsePrimary("#3b82f6") }];
    const hexes = fillScale(pins).map(oklchToHex);
    const css = cssSnippet(hexes);
    expect(css.startsWith(":root {")).toBe(true);
    expect(css).toContain(`--accent-500: ${hexes[5]};`);
    expect(css.trimEnd().endsWith("}")).toBe(true);
  });
});
```

- [x] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm vitest run tests/lab/roles.test.ts`
Expected: FAIL — `Cannot find module '../../src/lab/accent-scale/roles.js'` (혹은 동등한 모듈 없음 에러)

- [x] **Step 3: 엔진 구현**

`src/lab/accent-scale/roles.ts` 전체:

```ts
// src/lab/accent-scale/roles.ts
//
// 다크 액센트 역할 재배치 — 접근안 A(순수 인덱스 재배치).
// 다크 색을 새로 만들지 않고, 완성된 11-stop 안에서 역할만 재배치한다.
// 규칙: 인덱스 미러(i → 10−i), 단 솔리드(앵커)만 예외로 자리 고정 —
// 제품 뉴트럴의 DARK_NEUTRAL_INVERSION과 같은 미러 원리.
// 스펙: docs/superpowers/specs/2026-07-28-dark-accent-roles-design.md

import { SCALE_SIZE, STOP_KEYS } from "./builder.js";

export interface AccentRole {
  readonly id:
    | "subtle-bg"
    | "hover-bg"
    | "border"
    | "solid"
    | "text"
    | "text-strong";
  readonly label: string;
  /** 라이트 테마에서 이 역할이 쓰는 stop 인덱스 (0..10). */
  readonly lightIndex: number;
  /** 다크 테마 인덱스 — 미러 규칙: 10 − lightIndex, 솔리드만 5. */
  readonly darkIndex: number;
  /** 왜 이렇게 매핑되는가 — 교보재 설명. */
  readonly note: string;
}

export const ACCENT_ROLES: readonly AccentRole[] = [
  {
    id: "subtle-bg",
    label: "은은한 배경",
    lightIndex: 0,
    darkIndex: 10,
    note: "배지·알림의 바탕. 밝은 tint ↔ 어두운 tint 극성 반전 — Tailwind dark:bg-*-950 관례.",
  },
  {
    id: "hover-bg",
    label: "호버 배경",
    lightIndex: 1,
    darkIndex: 9,
    note: "배경보다 “한 단계 더” — 진해지는 방향이 다크에선 밝아지는 방향으로 뒤집힌다.",
  },
  {
    id: "border",
    label: "테두리",
    lightIndex: 2,
    darkIndex: 8,
    note: "핵심은 배경과의 거리 유지 — 절대 밝기가 아니라.",
  },
  {
    id: "solid",
    label: "솔리드 (버튼 배경)",
    lightIndex: 5,
    darkIndex: 5,
    note: "브랜드 색은 테마를 가로질러 보존 — Radix도 다크에서 accent step을 거의 유지한다. 흰 텍스트 대비도 그대로.",
  },
  {
    id: "text",
    label: "텍스트 (링크)",
    lightIndex: 6,
    darkIndex: 4,
    note: "Tailwind의 text-blue-600 ↔ dark:text-blue-400 패턴 — 검은 배경에선 밝은 쪽이 읽힌다.",
  },
  {
    id: "text-strong",
    label: "진한 텍스트",
    lightIndex: 7,
    darkIndex: 3,
    note: "텍스트보다 한 단계 더 — 미러 규칙(i → 10−i)의 자연 귀결.",
  },
];

/** 완성된 11-stop hex → 2-레이어 CSS 커스텀 프로퍼티 스니펫.
 *  .dark에는 매핑이 실제로 바뀌는 역할만 — 재선언하지 않은 것 = 안 바뀐 것. */
export function cssSnippet(hexes: readonly string[]): string {
  if (hexes.length !== SCALE_SIZE) {
    throw new Error(
      `cssSnippet: expected ${SCALE_SIZE} hexes, got ${hexes.length}`,
    );
  }
  const lines: string[] = [":root {"];
  STOP_KEYS.forEach((key, i) => {
    lines.push(`  --accent-${key}: ${hexes[i]};`);
  });
  for (const role of ACCENT_ROLES) {
    lines.push(
      `  --accent-${role.id}: var(--accent-${STOP_KEYS[role.lightIndex]});`,
    );
  }
  lines.push("}", "", ".dark {");
  for (const role of ACCENT_ROLES) {
    if (role.darkIndex !== role.lightIndex) {
      lines.push(
        `  --accent-${role.id}: var(--accent-${STOP_KEYS[role.darkIndex]});`,
      );
    }
  }
  lines.push("}");
  return lines.join("\n") + "\n";
}
```

- [x] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/lab/roles.test.ts`
Expected: PASS (7 tests)

- [x] **Step 5: 전체 테스트 + 타입 체크**

Run: `pnpm test && npx tsc --noEmit`
Expected: 전체 PASS, 타입 에러 0

- [x] **Step 6: Commit**

```bash
git add src/lab/accent-scale/roles.ts tests/lab/roles.test.ts
git commit -m "feat(lab): dark accent role remap engine — mirror rule + css snippet

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 빌더 완료 화면 다크 섹션 UI

**Files:**
- Modify: `web/src/builder/BuilderPage.tsx`

**Interfaces:**
- Consumes: Task 1의 `ACCENT_ROLES`, `cssSnippet`, `type AccentRole` (`@core/lab/accent-scale/roles.js`); 기존 `STOP_KEYS`(builder), `finalStops`(완료 화면 로컬 변수 — `{ key, hex, anchor }[]`).
- Produces: 없음 (말단 UI). 렌더 전용 — 새 React 상태를 만들지 않는다.

- [x] **Step 1: import 추가**

`web/src/builder/BuilderPage.tsx` 상단, 기존 builder import 블록 아래에 추가:

```tsx
import type { CSSProperties } from "react";
import {
  ACCENT_ROLES,
  cssSnippet,
  type AccentRole,
} from "@core/lab/accent-scale/roles.js";
```

(기존 `import { useMemo, useState } from "react";`는 그대로 둔다 — `CSSProperties`는 별도 type import.)

- [x] **Step 2: 렌더 헬퍼 3개 추가**

`toStrip` 함수 정의 아래에 추가:

```tsx
/** 역할표의 색 칩 + stop 번호. ring = 솔리드(앵커 고정) 강조. */
function RoleChip({ hex, stop, ring }: { hex: string; stop: string; ring: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-block w-3.5 h-3.5 rounded-sm border border-neutral-200 ${
          ring ? "ring-1 ring-offset-1 ring-neutral-900" : ""
        }`}
        style={{ background: hex }}
      />
      <span className="font-mono text-neutral-500">{stop}</span>
    </span>
  );
}

/** 6역할이 전부 등장하는 미니 목업 — 라이트/다크 같은 마크업, CSS 변수만 교체.
 *  컨테이너가 --accent-* 시맨틱 변수를 주입하고 내용물은 var()만 참조 —
 *  copy CSS로 가져가는 스니펫이 곧 이 목업을 그린 CSS다. */
function MockPanel({ mode, hexes }: { mode: "light" | "dark"; hexes: readonly string[] }) {
  const role = (id: AccentRole["id"]) => ACCENT_ROLES.find((r) => r.id === id)!;
  const tip = (id: AccentRole["id"]) => {
    const r = role(id);
    return `${r.id} — 라이트 ${STOP_KEYS[r.lightIndex]} / 다크 ${STOP_KEYS[r.darkIndex]}`;
  };
  const vars = Object.fromEntries(
    ACCENT_ROLES.map((r) => [
      `--accent-${r.id}`,
      hexes[mode === "light" ? r.lightIndex : r.darkIndex],
    ]),
  );
  return (
    <div
      className="flex-1 rounded border border-neutral-200 p-4 space-y-3"
      style={{ ...vars, background: mode === "light" ? "#ffffff" : "#171717" } as CSSProperties}
    >
      <div
        title={`${tip("subtle-bg")} · ${tip("border")}`}
        className="rounded border p-3 space-y-1"
        style={{ background: "var(--accent-subtle-bg)", borderColor: "var(--accent-border)" }}
      >
        <div
          title={tip("text-strong")}
          className="text-xs font-semibold"
          style={{ color: "var(--accent-text-strong)" }}
        >
          알림 카드 제목
        </div>
        <div title={tip("text")} className="text-[11px]" style={{ color: "var(--accent-text)" }}>
          링크 텍스트가 이 색으로 보입니다
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          title={tip("solid")}
          className="text-xs rounded px-3 py-1.5 text-white"
          style={{ background: "var(--accent-solid)" }}
        >
          솔리드 버튼
        </button>
        <button
          type="button"
          title={tip("hover-bg")}
          className="text-xs rounded px-3 py-1.5"
          style={{ background: "var(--accent-hover-bg)", color: "var(--accent-text-strong)" }}
        >
          호버 배경
        </button>
      </div>
    </div>
  );
}

/** 완료 화면 다크 섹션 — 역할 재배치 교보재. 계산은 roles.ts, 여긴 렌더만. */
function DarkSection({ hexes }: { hexes: readonly string[] }) {
  const copyCss = () => navigator.clipboard.writeText(cssSnippet(hexes));
  return (
    <div className="space-y-3 border-t border-neutral-200 pt-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">다크 테마 — 역할 재배치</h2>
        <button
          type="button"
          onClick={copyCss}
          className="text-[10px] text-neutral-400 hover:text-neutral-700"
        >
          copy CSS
        </button>
      </div>
      <p className="text-[11px] leading-4 text-neutral-400">
        다크에서 색(프리미티브)은 그대로, 역할(시맨틱)만 재배치 — 같은 사다리를
        반대쪽에서 오른다. 규칙: 인덱스 미러(i → 10−i), 솔리드(앵커)만 자리 고정.
      </p>
      <div className="flex gap-3">
        <MockPanel mode="light" hexes={hexes} />
        <MockPanel mode="dark" hexes={hexes} />
      </div>
      <p className="text-[11px] leading-4 text-neutral-400">
        패널 배경은 고정값(#ffffff / #171717) — 실제 앱에선 뉴트럴 스케일이 이 자리.
      </p>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-left text-neutral-500">
            <th className="font-medium py-1 pr-2">역할</th>
            <th className="font-medium py-1 pr-2">라이트</th>
            <th className="font-medium py-1 pr-2">다크</th>
            <th className="font-medium py-1">왜?</th>
          </tr>
        </thead>
        <tbody>
          {ACCENT_ROLES.map((r) => (
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
    </div>
  );
}
```

- [x] **Step 3: 완료 화면에 섹션 배치**

완료 화면 JSX에서 hex 목록(`<div className="text-[11px] leading-5 font-mono text-neutral-500">…</div>`)과 "내가 고른 여정" `<div>` **사이**에 한 줄 삽입:

```tsx
          <DarkSection hexes={finalStops.map((s) => s.hex)} />
```

수정 후 완료 화면 구조 (순서 확인용):

```tsx
      {done && finalStops && (
        <section className="space-y-4">
          {/* 완성된 스케일 헤더 + copy hex (기존) */}
          {/* <ColorScaleStrip stops={finalStops} /> (기존) */}
          {/* hex 목록 div (기존) */}
          <DarkSection hexes={finalStops.map((s) => s.hex)} />
          {/* 내가 고른 여정 div (기존) */}
          {/* 처음부터 다시 버튼 (기존) */}
        </section>
      )}
```

- [x] **Step 4: 타입 체크 + 빌드**

Run: `cd web && npx tsc --noEmit && npm run build`
Expected: 에러 0, 빌드 성공.
(주의: `style={{ ...vars, … } as CSSProperties}` 캐스팅이 없으면 커스텀 프로퍼티 키(`--accent-*`)에서 타입 에러 — 위 코드에 이미 포함됨.)

- [x] **Step 5: 루트 회귀 확인**

Run: `pnpm test`
Expected: 전체 PASS (web 변경은 루트 테스트와 무관하지만 회귀 없음 확인).

- [x] **Step 6: Commit**

```bash
git add web/src/builder/BuilderPage.tsx
git commit -m "feat(web): builder dark section — role remap table + light/dark mock + copy CSS

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## 수동 검증 (구현 완료 후, 컨트롤러 수행)

Playwright로 `http://localhost:5199/#builder`:

- [x] 1. 5-pick 완주 (#3b82f6) → 완료 화면에 다크 섹션 렌더: 목업 2패널(라이트 흰 배경 / 다크 `#171717`), 역할표 6행, 솔리드 행 칩에 링.
- [x] 2. 목업 다크 패널에서 텍스트가 라이트보다 밝은 stop(400/300)으로 보이는지, 솔리드 버튼은 양쪽 동일색인지.
- [x] 3. copy CSS 클릭 → 클립보드 내용이 `:root` 11+6 선언 + `.dark` 5 선언인지 눈검사.
- [x] 4. 콘솔 에러 0.

**결과 (2026-08-06, 500=#3b82f6 / 50·300·700=균형 / 950=기본):**

- 다크 섹션 정상 렌더 — 역할표 6행이 `50→950 / 100→900 / 200→800 / 500→500 / 600→400 / 700→300`,
  솔리드 행만 양쪽 칩에 링.
- 목업: 다크 패널에서 제목 300 / 링크 400으로 밝아지고, 솔리드 버튼은 양쪽 `#3b82f6` 동일.
- copy CSS 클립보드 = `:root` 11 프리미티브 + 6 시맨틱, `.dark` 5 선언(`--accent-solid` 부재).
- 콘솔 에러는 `favicon.ico` 404 하나뿐 — 앱 무관, 기존부터 있던 것.
