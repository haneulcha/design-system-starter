# /color-palette 화면 개편 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/color-palette`를 ①앵커 →②팔레트 →③받기 3단 스테이지로 재구성하고, 화면 크롬이 이 프로젝트의 비-색 카테고리 v1 토큰을 `--ds-*`로 생성해 먹게 한다.

**Architecture:** 순수 함수 `renderTokensCss()`가 `src/generator/*-category.ts`의 출력을 CSS 문자열로 렌더하고, vite 플러그인이 `buildStart`에서 그 결과를 `web/src/tokens.generated.css`에 기록한다. `global.css`가 그것을 `@import`한다. 화면은 `var(--ds-*)`와 `ds-type-*` 유틸리티만 소비하고, Tailwind `@theme` 기본 네임스페이스는 건드리지 않는다.

**Tech Stack:** React 19 · Vite 6 · Tailwind v4 (`@tailwindcss/vite`) · vitest 4 + jsdom + @testing-library/react

**설계 문서:** `docs/superpowers/specs/2026-08-24-color-palette-ui-refresh-design.md` — 결정의 근거는 전부 거기 있다. 이 계획은 그것을 실행 단계로 쪼갠 것뿐이다.

## Global Constraints

- **`@theme` 기본 네임스페이스 불가침.** `--text-*` · `--radius-*` · `--spacing-*` · `--shadow-*` · `--color-*` · `--font-*`를 정의하지 않는다. `global.css`는 전 화면 공유라 덮는 순간 inspector·`#lab`·`#builder`가 같이 바뀐다 (`text-2xs`만 34곳). 생성 토큰은 전부 `--ds-` 접두사.
- **엔진·산출·상태 계약 불변.** `src/color/` · `src/export/` · `web/src/color-palette/paletteState.ts` · `paletteUrl.ts`를 수정하지 않는다.
- **`OklchPicker` 내부 불변.** builder·lab·inspector·color-palette 4화면 공유. L·C·H 칸이 피커 안에 있는 배치(사이클 3.1 D1)도 그대로.
- **`components/Popover` 불변.** 같은 이유 + 상호작용 물리는 커스텀 유지 (스펙 D1 경계선).
- **`AdjustableScale`의 depth 어포던스 불변.** 0-블러 하드섀도 + `active:translate-y-[2px]` 착지, `border`/`shadow` 색 동조 규칙 (`AdjustableScale.tsx:60-84`)을 건드리지 않는다. elevation 토큰으로 갈아타지 않는다.
- **크롬 텍스트 하한 12px.** 단 `PreviewPane.tsx`의 `Mock` 컴포넌트 내부는 명시적 예외 — 사용자 팔레트로 그리는 축소 UI다.
- **깨지면 안 되는 기존 테스트:** `getAllByTestId("swatch").length === 66`, `Popover.test.tsx` 전체, `App.test.tsx` 라우팅, `BuilderPage.test.tsx`. 베이스라인은 11파일 107테스트 초록.
- **명령어:** 테스트 `cd web && pnpm test`, dev 서버 `cd web && pnpm dev --port 5199` → `http://localhost:5199/design-system-starter/color-palette`

---

## File Structure

```
web/src/tokens/tokensCss.ts        (신규) renderTokensCss(): string — 순수 함수
web/src/tokens/tokensCss.test.ts   (신규) emit 계약 테스트
web/vite.config.ts                 (수정) dsTokens() 플러그인 등록
web/src/global.css                 (수정) @import "./tokens.generated.css"
web/src/tokens.generated.css       (생성물, gitignore)
.gitignore                         (수정)

web/src/color-palette/
  ColorPalettePage.tsx    3단 스테이지 · 상태색 승격 · 반응형 · role=status
  AdjustableScale.tsx     캡션 타이포 · compact prop (depth 배선 불변)
  AccentInput.tsx         카드 래핑
  NeutralControl.tsx      aria-pressed · 그룹 라벨 · 타이포
  DownloadRow.tsx         받기 카드 · copy CSS 보조 버튼 + disabled 사유
  PreviewPane.tsx         카드 라벨(목업 바깥) · 뱃지 타이포
  CandidatePopover.tsx    "기본으로" 타이포
```

**스펙과의 경로 차이 하나:** 스펙 D2는 렌더러를 `web/scripts/tokens-css.ts`로 적었으나 `web/vitest.config.ts`의 `include`가 `src/**/*.test.{ts,tsx}`라 그 자리에 둔 테스트는 수집되지 않는다. `web/src/tokens/`로 옮겨 기존 include에 들어오게 한다. 어떤 앱 모듈도 import하지 않으므로 번들에는 안 들어간다.

---

## Task 1: 토큰 CSS 렌더러

순수 함수 하나. vite도 화면도 아직 안 건드린다 — 이 태스크가 끝나면 "스키마 → CSS 문자열"이 테스트로 고정된다.

**Files:**
- Create: `web/src/tokens/tokensCss.ts`
- Test: `web/src/tokens/tokensCss.test.ts`

**Interfaces:**
- Consumes: `@core/generator/spacing-category.js` `generateSpacingCategory()`, `@core/generator/radius-category.js` `generateRadiusCategory()`, `@core/generator/elevation-category.js` `generateElevationCategory()`, `@core/generator/typography-category.js` `generateTypographyCategory()`
- Produces: `renderTokensCss(): string` — Task 2가 이것만 쓴다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`web/src/tokens/tokensCss.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateElevationCategory } from "@core/generator/elevation-category.js";
import { renderTokensCss } from "./tokensCss";

describe("renderTokensCss", () => {
  const css = renderTokensCss();

  it("spacing alias를 px 변수로 낸다", () => {
    expect(css).toContain("--ds-space-md: 16px;");
    expect(css).toContain("--ds-space-lg: 24px;");
    expect(css).toContain("--ds-space-section: 96px;");
  });

  it("radius 이름 토큰을 낸다 — 숫자는 px, 특수값은 그대로", () => {
    expect(css).toContain("--ds-radius-card: 12px;");
    expect(css).toContain("--ds-radius-button: 8px;");
    expect(css).toContain("--ds-radius-none: 0px;");
    expect(css).toContain("--ds-radius-pill: 9999px;");
    expect(css).toContain("--ds-radius-circle: 50%;");
  });

  // 그림자 문자열을 여기 하드코딩하면 스키마가 바뀔 때 이 테스트가 같이 낡는다.
  // 엔진에게 물어서 비교해야 "화면이 스키마를 따라간다"는 성공 기준 2가 지켜진다.
  it("elevation은 shadow×subtle 프로필과 문자열이 같다", () => {
    const raised = generateElevationCategory({ style: "shadow", intensity: "subtle" })
      .levels.find((l) => l.name === "raised");
    expect(raised).toBeTruthy();
    expect(css).toContain(`--ds-shadow-raised: ${raised!.shadow};`);
    expect(css).toContain("--ds-shadow-none: none;");
  });

  it("타이포 프로필을 @utility로 낸다", () => {
    expect(css).toContain("@utility ds-type-heading-sm {");
    expect(css).toContain("@utility ds-type-heading-xxs {");
    expect(css).toContain("@utility ds-type-caption-sm {");
    expect(css).toContain("@utility ds-type-code-sm {");
    // 단일 variant 카테고리는 점 없는 이름 그대로
    expect(css).toContain("@utility ds-type-badge {");
  });

  it("heading.xxs 유틸리티가 스키마 값(16/600/1.4)을 담는다", () => {
    const block = css.slice(css.indexOf("@utility ds-type-heading-xxs {"));
    const body = block.slice(0, block.indexOf("}"));
    expect(body).toContain("font-size: 16px;");
    expect(body).toContain("font-weight: 600;");
    expect(body).toContain("line-height: 1.4;");
    expect(body).toContain("font-family: var(--ds-font-sans);");
  });

  it("폰트 체인 두 개를 변수로 낸다", () => {
    expect(css).toContain("--ds-font-sans:");
    expect(css).toContain("--ds-font-mono:");
    expect(css).toContain("Pretendard");
  });

  // Global Constraint의 기계적 방어선. 이게 초록인 한 다른 화면은 안전하다.
  it("Tailwind 기본 네임스페이스를 정의하지 않는다", () => {
    const offenders = css
      .split("\n")
      .filter((l) => /^\s*--(text|radius|spacing|shadow|color|font)-/.test(l));
    expect(offenders).toEqual([]);
  });

  // 원 스케일은 안 내보낸다 (스펙 D2) — 크롬이 스케일에서 임의로 집는 뒷문을 막는다.
  it("원 스케일을 내보내지 않는다", () => {
    expect(css).not.toContain("--ds-space-scale");
    expect(css).not.toContain("--ds-radius-scale");
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && pnpm vitest run src/tokens/tokensCss.test.ts`
Expected: FAIL — `Failed to resolve import "./tokensCss"`

- [ ] **Step 3: 렌더러를 구현한다**

`web/src/tokens/tokensCss.ts`:

```ts
// web/src/tokens/tokensCss.ts
//
// 도구 화면의 크롬이 먹을 CSS를 스키마 v1에서 생성한다. 이 파일은 앱이 import하지
// 않는다 — vite 플러그인(vite.config.ts)만 부르고, 결과는 tokens.generated.css로
// 나간다.
//
// 네임스페이스는 --ds-* 고정이다. Tailwind @theme의 기본 네임스페이스(--text-*
// 등)를 덮으면 global.css를 공유하는 inspector·#lab·#builder가 같이 바뀌어
// "이 화면만"이라는 범위가 거짓이 된다 (스펙 D2).

import { generateSpacingCategory } from "@core/generator/spacing-category.js";
import { generateRadiusCategory } from "@core/generator/radius-category.js";
import { generateElevationCategory } from "@core/generator/elevation-category.js";
import { generateTypographyCategory } from "@core/generator/typography-category.js";

/** 숫자는 px, 문자열("9999px"·"50%")은 그대로 — radius 토큰의 두 종류를 흡수한다. */
function len(v: number | string): string {
  return typeof v === "number" ? `${v}px` : v;
}

/** "heading.sm" → "heading-sm", "badge" → "badge". CSS 식별자에 점이 못 온다. */
function utilityName(profileKey: string): string {
  return profileKey.replace(/\./g, "-");
}

export function renderTokensCss(): string {
  const spacing = generateSpacingCategory({ density: "comfortable" });
  const radius = generateRadiusCategory({ style: "standard" });
  // ringColor를 안 넘긴다 — style="shadow"에서는 쓰이지 않고(elevation-category.ts:141-146),
  // ring 스타일로 knob을 돌리는 것은 이번 범위가 아니다 (스펙 D2).
  const elevation = generateElevationCategory({ style: "shadow", intensity: "subtle" });
  const type = generateTypographyCategory();

  const vars: string[] = [];

  vars.push("  /* spacing — alias만. 원 12-stop 스케일은 내보내지 않는다. */");
  for (const [name, px] of Object.entries(spacing.aliases)) {
    vars.push(`  --ds-space-${name}: ${px}px;`);
  }

  vars.push("", "  /* radius — 이름 토큰 8개. */");
  for (const [name, value] of Object.entries(radius.tokens)) {
    vars.push(`  --ds-radius-${name}: ${len(value)};`);
  }

  vars.push("", "  /* elevation — shadow × subtle, 5레벨. */");
  for (const level of elevation.levels) {
    vars.push(`  --ds-shadow-${level.name}: ${level.shadow};`);
  }

  vars.push("", "  /* font chains */");
  vars.push(`  --ds-font-sans: ${type.fontChains.sans};`);
  vars.push(`  --ds-font-mono: ${type.fontChains.mono};`);

  const utilities = Object.entries(type.profiles).map(([key, p]) => {
    const family = p.fontFamily === type.fontChains.mono ? "mono" : "sans";
    return [
      `@utility ds-type-${utilityName(key)} {`,
      `  font-family: var(--ds-font-${family});`,
      `  font-size: ${p.size}px;`,
      `  font-weight: ${p.weight};`,
      `  line-height: ${p.lineHeight};`,
      `  letter-spacing: ${p.letterSpacing};`,
      `}`,
    ].join("\n");
  });

  return [
    "/* 생성 파일 — 직접 고치지 말 것.",
    " * 출처: src/schema/{spacing,radius,elevation,typography}.ts (v1)",
    " * 생성기: web/src/tokens/tokensCss.ts, vite 플러그인 dsTokens가 호출한다.",
    " */",
    "",
    ":root {",
    ...vars,
    "}",
    "",
    ...utilities,
    "",
  ].join("\n");
}
```

- [ ] **Step 4: 테스트 통과를 확인한다**

Run: `cd web && pnpm vitest run src/tokens/tokensCss.test.ts`
Expected: PASS — 8 tests

- [ ] **Step 5: 전체 스위트가 여전히 초록인지 본다**

Run: `cd web && pnpm test`
Expected: 12파일 115테스트 초록 (기존 107 + 신규 8)

- [ ] **Step 6: 커밋**

```bash
git add web/src/tokens/
git commit -m "feat(web): 스키마 v1에서 --ds-* 토큰 CSS를 생성하는 렌더러

Tailwind @theme 기본 네임스페이스는 건드리지 않는다 — global.css가
전 화면 공유라 덮으면 inspector/#lab/#builder가 같이 바뀐다."
```

---

## Task 2: vite 플러그인 배선

렌더러를 파일로 떨어뜨리고 `global.css`가 먹게 한다. 이 태스크가 끝나면 브라우저에서 `var(--ds-radius-card)`가 실제로 해석된다.

**Files:**
- Modify: `web/vite.config.ts`
- Modify: `web/src/global.css`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: Task 1의 `renderTokensCss(): string`
- Produces: `web/src/tokens.generated.css` (런타임 생성물) — Task 3~6이 이 안의 `--ds-*`와 `ds-type-*`를 소비한다.

- [ ] **Step 1: `.gitignore`에 생성물을 추가한다**

`.gitignore` 끝에 한 줄:

```
web/src/tokens.generated.css
```

- [ ] **Step 2: vite 플러그인을 등록한다**

`web/vite.config.ts`를 아래로 교체한다. `__dirname`은 이미 이 파일이 쓰는 방식이라 그대로 따른다.

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "path";
import { renderTokensCss } from "./src/tokens/tokensCss";

// 도구 화면 크롬이 먹을 --ds-* 토큰을 스키마에서 생성한다. buildStart는 dev 서버
// 시작과 vite build 양쪽에서 돌아서 별도 실행 단계가 필요 없다 — web/에 tsx가 없고
// 루트(pnpm)와 web이 별도 패키지라 predev 스크립트는 두 패키지를 얽히게 만든다.
// 내용이 같으면 안 쓴다: 매 시작마다 mtime이 바뀌면 무의미한 HMR이 돈다.
function dsTokens() {
  return {
    name: "ds-tokens",
    buildStart() {
      const out = path.resolve(__dirname, "src/tokens.generated.css");
      const next = renderTokensCss();
      const prev = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : null;
      if (prev !== next) fs.writeFileSync(out, next);
    },
  };
}

export default defineConfig({
  // GitHub Pages 프로젝트 사이트는 리포 이름 서브패스에 올라간다. dev에도 똑같이
  // 걸어 두는 건 일부러다 — 라우팅이 손으로 짠 pathname 비교라(App.tsx) 루트에서만
  // 개발하면 base 관련 버그가 배포 후에야 드러난다. dev 주소도 /design-system-starter/.
  base: "/design-system-starter/",
  plugins: [dsTokens(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "../src"),
      "@data": path.resolve(__dirname, "../data"),
    },
  },
});
```

- [ ] **Step 3: `global.css`가 생성 파일을 import하게 한다**

`web/src/global.css`를 아래로 교체한다. `@import`는 다른 규칙보다 앞에 와야 하므로 `@theme` 위에 둔다.

```css
@import "tailwindcss";
@import "./tokens.generated.css";

@theme {
  --text-2xs: 0.625rem;
}
```

`--text-2xs`는 남긴다 — inspector·components 34곳이 `text-2xs`를 쓴다. 이 화면은 안 쓴다.

- [ ] **Step 4: dev 서버로 생성과 해석을 확인한다**

```bash
cd web && pnpm dev --port 5199
```

그리고 다른 터미널에서:

```bash
head -20 web/src/tokens.generated.css
grep -c "^@utility ds-type-" web/src/tokens.generated.css
```

Expected: `:root` 블록에 `--ds-space-md: 16px;` 등이 보이고, `@utility` 개수가 **22**.

- [ ] **Step 5: 브라우저에서 `@utility`가 실제로 살아나는지 확인한다**

이 단계를 건너뛰지 말 것 — `@utility`가 **import된** CSS 파일에서 처리되는지가 이 배선의 유일한 미검증 지점이다.

`web/src/color-palette/ColorPalettePage.tsx`의 `<h1>` className에 `ds-type-heading-sm`을 임시로 붙이고 `http://localhost:5199/design-system-starter/color-palette`를 연다. 제목이 24px/600으로 렌더되면 성공.

**실패하면(클래스가 무시되면):** `@utility`를 포기하고 `tokensCss.ts`의 `utilities` 생성부를 평범한 클래스 셀렉터(`.ds-type-heading-sm { … }`)로 바꾼다. 테스트의 `@utility ds-type-…` 기대 문자열도 `.ds-type-…`로 함께 고친다. 기능적 차이는 variant(`hover:`/`lg:`) 지원뿐이고 이 화면은 타이포에 variant를 쓰지 않는다.

확인 후 임시로 붙인 className은 되돌린다 (Task 4에서 정식으로 붙는다).

- [ ] **Step 6: 테스트가 여전히 초록인지 본다**

Run: `cd web && pnpm test`
Expected: 12파일 115테스트 초록. (vitest는 `global.css`를 소비하지 않으므로 생성 파일 유무와 무관하다.)

- [ ] **Step 7: 커밋**

```bash
git add web/vite.config.ts web/src/global.css .gitignore
git commit -m "feat(web): vite buildStart에서 --ds-* 토큰 CSS를 생성해 주입

생성물은 커밋하지 않는다. dev 중 src/schema 변경은 dev 서버 재시작이
필요하다 — 스키마는 카테고리 사이클에서나 바뀌므로 watcher는 안 붙인다."
```

---

## Task 3: 타이포 승격 — 크롬 하한 12px

크롬의 손값 폰트 크기를 전부 `ds-type-*`로 바꾼다. 레이아웃은 아직 안 건드린다 — 이 태스크는 "글자 크기"라는 한 가지 관심사만 다룬다.

**Files:**
- Modify: `web/src/color-palette/AdjustableScale.tsx:101`
- Modify: `web/src/color-palette/NeutralControl.tsx:31,49,63`
- Modify: `web/src/color-palette/DownloadRow.tsx:12,48`
- Modify: `web/src/color-palette/PreviewPane.tsx:114,153,170,179`
- Modify: `web/src/color-palette/ColorPalettePage.tsx:99`
- Modify: `web/src/color-palette/CandidatePopover.tsx:88`
- Test: `web/src/color-palette/ColorPalettePage.test.tsx` (추가)

**Interfaces:**
- Consumes: Task 2가 주입한 `ds-type-caption-sm` · `ds-type-code-sm` · `ds-type-body-sm` 유틸리티
- Produces: 없음 (화면 클래스만 바뀐다)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`ColorPalettePage.test.tsx` 끝에 새 describe를 붙인다:

```ts
describe("크롬 타이포 — 하한 12px", () => {
  // 목업(Mock)은 명시적 예외다. 사용자 팔레트로 그리는 축소 UI라 하한을 적용하면
  // 380px 카드가 부풀어 "커지면 정작 색이 안 보인다"(3.1 D2)를 거스른다.
  it("목업 바깥 크롬에 10~11px 손값이 없다", () => {
    const { container } = render(<ColorPalettePage />);
    const mocks = [screen.getByTestId("mock-light"), screen.getByTestId("mock-dark")];
    const offenders = Array.from(container.querySelectorAll("[class]")).filter((el) => {
      if (mocks.some((m) => m.contains(el))) return false;
      return /text-\[(9|10|11)px\]/.test(el.className);
    });
    expect(offenders.map((el) => el.className)).toEqual([]);
  });

  it("stop 캡션이 code.sm을 쓴다", () => {
    render(<ColorPalettePage />);
    const caption = screen.getAllByTestId("stop-caption")[0];
    expect(caption.className).toContain("ds-type-code-sm");
  });

  it("대비 뱃지가 caption.sm을 쓴다", () => {
    render(<ColorPalettePage />);
    const badges = screen.getAllByTestId("contrast-badge");
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0].className).toContain("ds-type-caption-sm");
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && pnpm vitest run src/color-palette/ColorPalettePage.test.tsx -t "하한 12px"`
Expected: FAIL — offenders 배열이 비지 않고, 캡션 className에 `ds-type-code-sm`이 없다.

- [ ] **Step 3: 승격 명단을 전수 치환한다**

각 자리를 아래대로 바꾼다. **크기 클래스만 바꾸고 색·정렬·간격 클래스는 그대로 둔다.**

| 파일:행 | 지금 | 바꿀 것 |
| --- | --- | --- |
| `AdjustableScale.tsx:101` | `text-[9px] font-mono` | `ds-type-code-sm` (`font-mono` 제거 — 유틸리티가 family를 갖는다) |
| `PreviewPane.tsx:114` | `text-[10px]` | `ds-type-caption-sm` |
| `PreviewPane.tsx:153` | `text-[10px]` | `ds-type-caption-sm` |
| `PreviewPane.tsx:170` | `text-[11px]` | `ds-type-caption-sm` |
| `PreviewPane.tsx:179` | `text-[11px]` | `ds-type-caption-sm` |
| `ColorPalettePage.tsx:99` | `text-[10px]` | `ds-type-caption-sm` |
| `NeutralControl.tsx:31` | `text-[11px]` | `ds-type-caption-sm` |
| `NeutralControl.tsx:49` | `text-[11px]` | `ds-type-caption-sm` |
| `NeutralControl.tsx:63` | `text-[11px]` | `ds-type-caption-sm` |
| `DownloadRow.tsx:12` (btn 상수) | `text-[11px] font-medium` | `ds-type-body-sm` (`font-medium` 제거 — body.sm은 400이고 4개 버튼은 위계 동등이다) |
| `DownloadRow.tsx:48` | `text-[11px]` | `ds-type-caption-sm` |
| `CandidatePopover.tsx:88` | `text-[11px]` | `ds-type-caption-sm` |

**손대지 않는 것:** `PreviewPane.tsx:57,60,79,85,95` — 전부 `Mock` 내부다.

- [ ] **Step 4: 테스트 통과를 확인한다**

Run: `cd web && pnpm test`
Expected: 12파일 118테스트 초록 (신규 3 추가)

- [ ] **Step 5: 브라우저로 눈 확인**

`http://localhost:5199/design-system-starter/color-palette` — 사다리 캡션·대비 뱃지·다운로드 버튼이 커졌고, 목업 안 글자는 그대로인지 본다.

- [ ] **Step 6: 커밋**

```bash
git add web/src/color-palette/
git commit -m "feat(color-palette): 크롬 타이포를 ds-type-* 유틸리티로, 하한 12px

목업 내부는 명시적 예외 — 사용자 팔레트로 그리는 축소 UI라 하한을
적용하면 380px 카드가 부풀어 3.1 D2를 거스른다."
```

---

## Task 4: 3단 스테이지 + 상태색 승격 + 반응형

화면 골격. 가장 큰 태스크이므로 테스트를 먼저 촘촘히 건다.

**Files:**
- Modify: `web/src/color-palette/ColorPalettePage.tsx`
- Modify: `web/src/color-palette/AdjustableScale.tsx` (`compact` prop 추가)
- Test: `web/src/color-palette/ColorPalettePage.test.tsx`, `web/src/color-palette/AdjustableScale.test.tsx`

**Interfaces:**
- Consumes: Task 2의 `--ds-space-*` · `--ds-radius-*`
- Produces: `AdjustableScale`에 `readonly compact?: boolean` — 기본 `false`. `true`면 스와치 높이가 `h-9`(36px) 대신 `h-6`(24px). Task 5·6은 이 prop을 쓰지 않는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`AdjustableScale.test.tsx`에 추가:

```ts
it("compact면 스와치 높이가 h-6, 기본은 h-9", () => {
  const hexes = Array.from({ length: 11 }, () => "#888888");
  const { rerender } = render(
    <AdjustableScale hexes={hexes} adjustable={[]} pinned={[]} />,
  );
  expect(screen.getAllByTestId("swatch")[0].className).toContain("h-9");

  rerender(<AdjustableScale hexes={hexes} adjustable={[]} pinned={[]} compact />);
  expect(screen.getAllByTestId("swatch")[0].className).toContain("h-6");
});
```

`ColorPalettePage.test.tsx`에 추가:

```ts
describe("3단 스테이지 골격", () => {
  it("h1 하나에 h2 셋이 ①②③ 순서로 있다", () => {
    render(<ColorPalettePage />);
    expect(screen.getAllByRole("heading", { level: 1 }).length).toBe(1);
    const h2 = screen.getAllByRole("heading", { level: 2 });
    expect(h2.length).toBe(3);
    expect(h2.map((h) => h.textContent)).toEqual([
      expect.stringContaining("앵커"),
      expect.stringContaining("팔레트"),
      expect.stringContaining("받기"),
    ]);
  });

  // 사이클 3 D7로의 회귀 — 접힌 details는 "얇게 노출"이 아니라 "노출 안 함"이었다.
  it("상태색이 details 없이 첫 화면에 있다", () => {
    const { container } = render(<ColorPalettePage />);
    expect(container.querySelector("details")).toBeNull();
    expect(screen.getAllByTestId("swatch").length).toBe(66);
  });

  it("상태색 띠만 compact다 — 액센트·뉴트럴은 아니다", () => {
    render(<ColorPalettePage />);
    const swatches = screen.getAllByTestId("swatch");
    // 0-10 액센트, 11-21 뉴트럴, 22-65 상태색 4벌
    expect(swatches[0].className).toContain("h-9");
    expect(swatches[11].className).toContain("h-9");
    expect(swatches[22].className).toContain("h-6");
    expect(swatches[65].className).toContain("h-6");
  });

  it("사이드바가 aside이고 프리뷰를 담는다", () => {
    render(<ColorPalettePage />);
    const aside = screen.getByRole("complementary");
    expect(aside.contains(screen.getByTestId("mock-light"))).toBe(true);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && pnpm vitest run src/color-palette/ -t "compact"` 그리고 `-t "3단 스테이지"`
Expected: 둘 다 FAIL

- [ ] **Step 3: `AdjustableScale`에 `compact`를 붙인다**

`Props`에 추가:

```ts
  /** 상태색처럼 조정 불가한 띠를 얇게 그린다. 조정 UI가 없어 히트 타깃이
   *  필요 없고, 사이클 3 D7의 "얇게 노출"이 원래 이 뜻이다 (스펙 D3). */
  readonly compact?: boolean;
```

시그니처에 `compact = false`를 받고, 두 갈래(button/div)의 높이 클래스 `h-9`를 `${compact ? "h-6" : "h-9"}`로 바꾼다. **그 외 클래스 — 특히 `shadow-[0_2px_0_0_…]`·`active:translate-y-[2px]`·`border` 계열 — 는 한 글자도 건드리지 않는다** (Global Constraint).

- [ ] **Step 4: `ColorPalettePage`를 3단 스테이지로 재구성한다**

`return` 전체를 교체한다. 로직(useState·useMemo·핸들러)은 그대로 둔다.

```tsx
  return (
    <div
      className="mx-auto grid max-w-[1200px] grid-cols-1 items-start
                 lg:grid-cols-[1fr_380px]"
      style={{ padding: "var(--ds-space-xl)", gap: "var(--ds-space-xl)" }}
    >
      <main style={{ display: "grid", gap: "var(--ds-space-lg)" }}>
        <h1 className="ds-type-heading-sm">컬러 팔레트</h1>

        <section style={{ display: "grid", gap: "var(--ds-space-sm)" }}>
          <h2 className="ds-type-heading-xxs">① 앵커 정하기</h2>
          <AccentInput
            hex={state.accentHex}
            onChange={(accentHex) => setState((s) => withAccent(s, accentHex))}
          />
        </section>

        <section style={{ display: "grid", gap: "var(--ds-space-md)" }}>
          <h2 className="ds-type-heading-xxs">② 만들어진 팔레트</h2>

          <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
            <div className="ds-type-caption-sm text-neutral-500">액센트</div>
            <AdjustableScale
              hexes={scales.accent}
              adjustable={[...ADJUSTABLE_STOPS]}
              pinned={pinned}
              onPick={(i) => { setOpen(open === i ? null : i); setHover(null); }}
              preview={open !== null && hover ? previewScale(state, open, hover) : null}
              openIndex={open}
              onClosePopover={() => { setOpen(null); setHover(null); }}
              popoverContent={
                open !== null ? (
                  <CandidatePopover
                    stopIndex={open}
                    state={state}
                    onHover={setHover}
                    onChoose={(hex) =>
                      setState((s) => ({ ...s, pins: { ...s.pins, [open]: hex ?? undefined } }))
                    }
                    onClose={() => { setOpen(null); setHover(null); }}
                  />
                ) : undefined
              }
            />
          </div>

          <div style={{ display: "grid", gap: "var(--ds-space-xs)" }}>
            <div className="ds-type-caption-sm text-neutral-500">뉴트럴</div>
            <AdjustableScale hexes={scales.neutral} adjustable={[]} pinned={[]} />
            <NeutralControl
              state={state}
              onChange={(tint) => setState((s) => ({ ...s, tint }))}
            />
          </div>

          {/* 상태색은 접지 않는다 — 산출물에 무조건 들어가므로 화면에 없으면
              받아간 파일에 모르는 색이 들어있게 된다 (사이클 3 D7). 라벨을 왼쪽
              열로 빼고 띠를 compact로 낮춰 세로를 아낀다 (스펙 D3). */}
          <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
            <div className="ds-type-caption-sm text-neutral-500">상태색</div>
            {SEMANTIC_ANCHORS.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-[56px_1fr] items-center"
                style={{ gap: "var(--ds-space-xs)" }}
              >
                <div className="ds-type-caption-sm text-neutral-400">{a.label}</div>
                <AdjustableScale
                  hexes={scales.semantic[a.id]}
                  adjustable={[]}
                  pinned={[]}
                  showCaptions={false}
                  compact
                />
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: "grid", gap: "var(--ds-space-sm)" }}>
          <h2 className="ds-type-heading-xxs">③ 받기</h2>
          <DownloadRow scales={scales} roles={roles} />
        </section>
      </main>

      <aside className="lg:sticky lg:top-8">
        <PreviewPane
          scales={shownScales}
          roles={roles}
          checks={checks}
          shifts={shifts}
          hasApplied={hasApplied}
          onApplyShifts={onApplyShifts}
          onResetShifts={onResetShifts}
        />
      </aside>
    </div>
  );
```

간격은 Tailwind 클래스가 아니라 인라인 `var(--ds-space-*)`로 준다 — `@theme` 기본 네임스페이스를 안 덮기로 했으므로 `gap-4` 류는 Tailwind 기본값이고 도그푸딩이 아니다.

- [ ] **Step 5: 테스트 통과를 확인한다**

Run: `cd web && pnpm test`
Expected: 초록. `swatch` 66개가 유지되는지 특히 확인.

- [ ] **Step 6: 브라우저에서 반응형을 본다**

1440px에서 2컬럼, 1023px 이하에서 단일 컬럼 + 프리뷰가 아래로 가는지 확인한다.

- [ ] **Step 7: 커밋**

```bash
git add web/src/color-palette/
git commit -m "feat(color-palette): 3단 스테이지 골격, 상태색 승격, lg 반응형

상태색을 details에서 꺼낸 것은 재개봉이 아니라 사이클 3 D7로의 회귀다 —
접힌 details는 '얇게 노출'이 아니라 '노출 안 함'이었다."
```

---

## Task 5: 스테이지 ① 카드 + ③ 받기 카드

표면. D1 경계선 안에서 토큰을 처음 실제로 쓰는 자리다.

**Files:**
- Modify: `web/src/color-palette/AccentInput.tsx`
- Modify: `web/src/color-palette/DownloadRow.tsx`
- Test: `web/src/color-palette/ColorPalettePage.test.tsx`

**Interfaces:**
- Consumes: `--ds-radius-card` · `--ds-shadow-raised` · `--ds-space-md`
- Produces: 없음

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
describe("받기 카드", () => {
  it("받기 블록이 카드 표면 토큰을 쓴다", () => {
    render(<ColorPalettePage />);
    const card = screen.getByTestId("download-card");
    expect(card.style.borderRadius).toBe("var(--ds-radius-card)");
    expect(card.style.boxShadow).toBe("var(--ds-shadow-raised)");
  });

  it("copy CSS가 테두리 있는 보조 버튼이다", () => {
    render(<ColorPalettePage />);
    const copy = screen.getByRole("button", { name: /CSS 복사/ });
    expect(copy.className).toContain("border");
    expect(copy.className).toContain("ds-type-caption-sm");
  });

  // 현행은 opacity 40%로 죽어만 있고 이유가 없다 (DownloadRow.tsx:47-48).
  it("클립보드를 못 쓰면 disabled에 사유가 붙는다", () => {
    const original = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    render(<ColorPalettePage />);
    const copy = screen.getByRole("button", { name: /CSS 복사/ }) as HTMLButtonElement;
    expect(copy.disabled).toBe(true);
    expect(screen.getByText(/클립보드를 쓸 수 없는 환경/)).toBeTruthy();
    Object.defineProperty(navigator, "clipboard", { value: original, configurable: true });
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && pnpm vitest run src/color-palette/ColorPalettePage.test.tsx -t "받기 카드"`
Expected: FAIL — `download-card` testid 없음

- [ ] **Step 3: `AccentInput`을 카드로 감싼다**

`return`의 최상위 `<div className="flex items-start gap-6">`를 카드로 감싼다. **내부 배치(피커 왼쪽, hex 오른쪽)는 그대로 둔다 — 시각적 묶음만이다 (스펙 D6).**

```tsx
  return (
    <div
      className="border border-neutral-200"
      style={{
        borderRadius: "var(--ds-radius-card)",
        padding: "var(--ds-space-md)",
      }}
    >
      <div className="flex items-start gap-6">
        {/* 기존 내용 그대로 */}
      </div>
    </div>
  );
```

- [ ] **Step 4: `DownloadRow`를 받기 카드로 바꾼다**

`btn` 상수와 `return`을 교체한다. `files`/`items` useMemo는 그대로.

```tsx
const btn =
  "ds-type-body-sm px-3 py-2 rounded-md border border-neutral-200 bg-white " +
  "text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors";
```

```tsx
  const copyable = canCopy();
  return (
    <div
      data-testid="download-card"
      className="border border-neutral-200 bg-white"
      style={{
        borderRadius: "var(--ds-radius-card)",
        boxShadow: "var(--ds-shadow-raised)",
        padding: "var(--ds-space-md)",
        display: "grid",
        gap: "var(--ds-space-xs)",
      }}
    >
      <div className="flex flex-wrap" style={{ gap: "var(--ds-space-xs)" }}>
        {items.map(([name, content, mime]) => (
          <button key={name} type="button" className={btn}
            onClick={() => downloadFile(name, content, mime)}>
            {name}
          </button>
        ))}
        <button
          type="button"
          disabled={!copyable}
          className="ds-type-caption-sm rounded-md border border-neutral-200 px-3 py-2
                     text-neutral-600 hover:border-neutral-300 disabled:opacity-40"
          onClick={() => void copyText(files.css)}
        >
          CSS 복사
        </button>
      </div>
      {!copyable && (
        <div className="ds-type-caption-sm text-neutral-400">
          클립보드를 쓸 수 없는 환경입니다 — 파일로 받으세요.
        </div>
      )}
    </div>
  );
```

`border-t border-neutral-200 pt-4`는 제거한다 — 카드가 경계를 대신한다.

- [ ] **Step 5: 테스트 통과를 확인한다**

Run: `cd web && pnpm test`
Expected: 초록

- [ ] **Step 6: 커밋**

```bash
git add web/src/color-palette/
git commit -m "feat(color-palette): 앵커/받기 카드 표면에 --ds-* 토큰 적용

받기 카드가 페이지에서 유일하게 그림자로 뜬다 — 1차 작업의 종착지가
가장 무거운 표면인 것이 3단 스테이지 위계와 같은 말을 한다."
```

---

## Task 6: 접근성 묶음

**Files:**
- Modify: `web/src/color-palette/NeutralControl.tsx`
- Modify: `web/src/color-palette/PreviewPane.tsx`
- Modify: `web/src/color-palette/ColorPalettePage.tsx`
- Test: `web/src/color-palette/ColorPalettePage.test.tsx`

**Interfaces:**
- Consumes: `ColorPalettePage`의 `checks`(=`shownScales` 기준)와 `scales`(확정 팔레트). 요약은 **확정 팔레트**로 따로 계산한다.
- Produces: 없음

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
describe("접근성", () => {
  it("뉴트럴 색조/강도가 aria-pressed와 그룹 라벨을 갖는다", () => {
    render(<ColorPalettePage />);
    const tintGroup = screen.getByRole("group", { name: "뉴트럴 색조" });
    const pressed = Array.from(tintGroup.querySelectorAll("[aria-pressed]"))
      .filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed.length).toBe(1);
    expect(screen.getByRole("group", { name: "강도" })).toBeTruthy();
  });

  // 뱃지는 hover 프리뷰까지 반영해 스와치를 스칠 때마다 바뀐다. 그대로 live면
  // 스크린리더 스팸이 되므로, 요약은 확정 팔레트(scales) 기준으로 따로 낸다 —
  // "hover는 미리보기일 뿐 확정이 아니다"라는 이 화면의 계약을 통지에도 적용한다.
  it("대비 요약이 status이고 hover 프리뷰에 흔들리지 않는다", () => {
    render(<ColorPalettePage />);
    const status = screen.getByRole("status");
    const before = status.textContent;
    expect(before).toMatch(/대비 미달/);

    fireEvent.click(screen.getAllByTestId("swatch")[3]);
    const candidate = screen.getAllByTestId("candidate")[0];
    fireEvent.mouseEnter(candidate);
    expect(screen.getByRole("status").textContent).toBe(before);
  });

  it("프리뷰 라이트/다크 라벨이 목업 바깥에 있다", () => {
    render(<ColorPalettePage />);
    const light = screen.getByText("라이트");
    expect(screen.getByTestId("mock-light").contains(light)).toBe(false);
  });
});
```

`CandidatePopover`에는 지금 `candidate` testid가 없다. 후보 `<label>`(`CandidatePopover.tsx:63-66`)에 `data-testid="candidate"` 한 줄만 추가한다 — hover 프리뷰를 붙잡을 손잡이가 필요하고, `onMouseEnter`가 이미 그 요소에 있다. 다른 변경은 없다.

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && pnpm vitest run src/color-palette/ColorPalettePage.test.tsx -t "접근성"`
Expected: FAIL

- [ ] **Step 3: `NeutralControl`에 그룹과 `aria-pressed`를 붙인다**

두 묶음을 `role="group"` + `aria-label`로 감싸고, 각 버튼에 `aria-pressed`를 준다. 시각 라벨도 같이 붙인다.

```tsx
      <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
        <div className="ds-type-caption-sm text-neutral-500">색조</div>
        <div role="group" aria-label="뉴트럴 색조" className="flex flex-wrap gap-1.5">
          {TINT_ATTRACTORS.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-label={a.label}
              aria-pressed={activeId === a.id}
              onClick={() => onChange({ attractorId: a.id, strength })}
              className={/* 기존 클래스 그대로 */}
            >
              {/* 기존 내용 그대로 */}
            </button>
          ))}
        </div>
      </div>
```

강도 묶음도 같은 형태로 — 라벨 "강도", `role="group" aria-label="강도"`, 각 버튼에 `aria-pressed={strength === s}`. "자동으로" 링크는 강도 그룹 **밖**에 둔다 (선택지가 아니라 되돌리기다).

**radiogroup을 쓰지 않는 이유**를 주석으로 남긴다: APG 라디오 패턴은 roving tabindex + 화살표 이동=선택을 요구하는데, 그 함정은 이 화면이 `CandidatePopover`에서 이미 밟았다 (사이클 3.2 알려진 한계 3).

- [ ] **Step 4: `PreviewPane`에 카드 라벨과 status 요약을 붙인다**

`Mock`을 부르는 자리를 라벨과 함께 감싼다. **라벨은 목업 바깥이다** — 안에 넣으면 중립 크롬 텍스트가 사용자 팔레트 배경 위에 앉아 대비를 보장할 수 없다.

```tsx
      <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
        <div className="ds-type-caption-sm text-neutral-500">라이트</div>
        <Mock theme="light" scales={scales} roles={roles} />
      </div>
      <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
        <div className="ds-type-caption-sm text-neutral-500">다크</div>
        <Mock theme="dark" scales={scales} roles={roles} />
      </div>
```

`PreviewPane`에 `summaryChecks` prop을 추가한다 (`readonly summaryChecks: readonly ContrastCheck[]`) — 확정 팔레트 기준 목록이다. 그것으로 시각적으로 숨긴 요약을 낸다:

```tsx
      <div role="status" aria-live="polite" className="sr-only">
        {(() => {
          const f = summaryChecks.filter((c) => !c.passes);
          return `대비 미달 ${f.length}건, 조정 가능 ${f.filter((c) => c.adjustable).length}건`;
        })()}
      </div>
```

`sr-only` 유틸리티는 Tailwind 기본 제공이므로 추가 정의가 필요 없다.

- [ ] **Step 5: `ColorPalettePage`가 확정 기준 체크를 넘긴다**

`checks` 옆에 하나 더 만든다:

```tsx
  // 뱃지는 hover 프리뷰(shownScales)를 보고, 스크린리더 요약은 확정 팔레트(scales)를
  // 본다 — hover는 미리보기일 뿐 확정이 아니라는 이 화면의 계약이 통지에도 적용된다.
  const summaryChecks = useMemo(() => checkContrast(scales, roles), [scales, roles]);
```

`<PreviewPane … summaryChecks={summaryChecks} />`로 넘긴다.

- [ ] **Step 6: 테스트 통과를 확인한다**

Run: `cd web && pnpm test`
Expected: 초록

- [ ] **Step 7: 커밋**

```bash
git add web/src/color-palette/
git commit -m "feat(color-palette): aria-pressed 선택 상태, 확정 기준 status 요약, 프리뷰 라벨

요약을 뱃지 목록이 아니라 확정 팔레트 기준으로 분리한 이유: 뱃지는 hover
프리뷰까지 반영해 스와치를 스칠 때마다 바뀌므로 그대로 live면 스팸이 된다."
```

---

## Task 7: 실측 · 세로 예산 · stop 50 확인

유일하게 단위 테스트가 아니라 브라우저 실측이 산출물인 태스크다. 스펙의 성공 기준 1과 D9가 여기서 판정된다.

**Files:**
- Modify: (실측 결과에 따라) `web/src/color-palette/ColorPalettePage.tsx` 또는 `AdjustableScale.tsx`
- Create: `.superpowers/sdd/2026-08-24-color-palette-ui-refresh/screenshots/` (스크린샷 기록)

**Interfaces:** 없음

- [ ] **Step 1: 1440×900에서 ③이 폴드 안인지 실측한다**

dev 서버를 켜고 브라우저를 1440×900으로 맞춘 뒤 `/color-palette`를 연다. 받기 카드 전체가 스크롤 없이 보이는지 확인하고 전체 스크린샷을 남긴다.

- [ ] **Step 2: 안 들어가면 나사를 순서대로 조인다**

스펙 D3이 정한 순서를 지킨다 — **제목 크기는 건드리지 않는다** (D4의 기각한 대안).

1. 상태색 띠 `compact` 높이 `h-6` → `h-5`
2. 앵커·받기 카드 패딩 `--ds-space-md` → `--ds-space-sm`
3. 상단 패딩 `--ds-space-xl` → `--ds-space-lg`

하나 조일 때마다 다시 재고, 들어가는 즉시 멈춘다.

- [ ] **Step 3: 셋을 다 조여도 안 들어가면 기록하고 멈춘다**

스펙 알려진 한계 1대로 별도 사이클의 문제다. **성공 기준 1과 4(상태색 노출) 중 무엇을 낮출지는 임의로 정하지 말고 사람에게 묻는다.**

- [ ] **Step 4: stop 50의 경계를 확대 확인한다**

액센트 사다리의 stop 50을 200% 이상으로 확대해 스크린샷을 찍는다. 확인할 것은 **그림자가 아니라 칩↔페이지 경계**다 — 거의 흰 칩이 흰 페이지에서 `border-neutral-300` 1px로만 분리되므로 2px 그림자 바가 depth가 아니라 "칩의 아래 테두리"로 오독되는지.

- [ ] **Step 5: 오독되면 경계 쪽만 처방한다**

`border-neutral-300` → `border-neutral-400` 정도로 stop 50 근방의 칩 경계만 강화한다. **그림자 색은 건드리지 않는다** — "그림자 색 = 테두리 색" 규칙(`AdjustableScale.tsx:70-73`)이 깨진다. 오독되지 않으면 아무것도 안 고치고 스크린샷만 기록으로 남긴다.

- [ ] **Step 6: 전체 회귀를 돌린다**

```bash
cd web && pnpm test
cd .. && pnpm test
```

Expected: web 초록, 루트 스위트도 초록 (루트는 이번 사이클에서 안 건드렸으므로 변화 없어야 정상)

- [ ] **Step 7: 커밋**

```bash
git add web/src/color-palette/ .superpowers/sdd/
git commit -m "fix(color-palette): 세로 예산 실측 반영 + stop 50 경계 확인

실측 결과와 스크린샷은 .superpowers/sdd/에 기록."
```

> `.superpowers/`는 gitignore되어 있다. 스크린샷을 남기려면 `docs/research/figures/`로 옮기거나 커밋에서 빼고 로컬 기록으로만 둔다 — 어느 쪽인지 실행 시 확인할 것.

---

## Self-Review

**스펙 커버리지:**

| 스펙 | 태스크 |
| --- | --- |
| D1 도그푸딩 경계선 | Task 1(토큰), Task 5(카드 표면). 스와치·Popover 불변은 Global Constraint |
| D2 토큰 파이프라인 | Task 1, 2 |
| D3 3단 스테이지 · sticky 없음 · 세로 예산 | Task 4, 7 |
| D4 타이포 5종 · 하한 12px · 목업 예외 | Task 3 |
| D5 380px · 1200px · lg 단일 컬럼 | Task 4 |
| D6 스테이지 ① 카드 (시각적 묶음만) | Task 5 |
| D7 받기 카드 · copy CSS 보조 버튼 | Task 5 |
| D8 접근성 4항 | Task 6 (heading 구조는 Task 4) |
| D9 stop 50 경계 | Task 7 |
| 성공 기준 1 (스크롤 없음) | Task 7 |
| 성공 기준 2 (스키마 → 화면) | Task 1의 elevation 테스트가 엔진에 물어서 비교 |
| 성공 기준 3 (12px 하한) | Task 3 |
| 성공 기준 4 (상태색 노출) | Task 4 |
| 성공 기준 5 (보조기술 노출) | Task 6 |

**타입 일관성:** `renderTokensCss()` (Task 1 정의 → Task 2 소비), `compact?: boolean` (Task 4 정의 → Task 4 내부 소비), `summaryChecks` (Task 6 내부 정의·소비). 이름 불일치 없음.

**미검증 지점 하나:** `@utility`가 import된 CSS 파일에서 처리되는지는 Task 2 Step 5에서 브라우저로 확인하고, 실패 시 평범한 클래스 셀렉터로 내리는 경로를 같은 스텝에 적어 뒀다.
