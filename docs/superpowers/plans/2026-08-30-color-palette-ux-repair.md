# /color-palette UX 결함 수리 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/color-palette`가 320px에서 가로 스크롤 없이 열리고, 자기 크롬이 자기가 재는 대비 기준을 통과하며, 조용히 파괴되던 조정 결과를 되돌릴 수 있게 만든다.

**Architecture:** 이번 사이클은 기능을 늘리지 않는다. 셋으로 나뉜다 — (1) `main`을 그리드로 평탄화해 `<aside>`를 세 스테이지의 형제로 만들고 반응형 순서를 얻는다, (2) **엔진이 이미 주는데 화면이 버리고 있던 사람 말**(`SCALE_ROLES[].label`, `onSolidWarning`, 후보 겹침 사유)을 소비한다, (3) 판정 로직을 `web/src/color-palette/`의 **순수 함수 3개**(`contrastTriage` · `mockTargets` · `candidateMatch`)로 빼고 컴포넌트는 그리기만 한다.

**Tech Stack:** React 19 · TypeScript · Tailwind v4 · Vitest + @testing-library/react (jsdom) · chrome-devtools MCP(실측)

**스펙:** `docs/superpowers/specs/2026-08-30-color-palette-ux-repair-design.md`

## Global Constraints

이 절의 요구는 **모든 태스크에 암묵적으로 포함된다.**

- **엔진을 건드리지 않는다.** `src/color/` · `src/export/` · `web/src/color-palette/paletteState.ts` · `web/src/color-palette/paletteUrl.ts`는 이번 사이클 비-목표다 (CLAUDE.md 하드 규칙). 새 판정 로직은 전부 `web/src/color-palette/`의 새 순수 함수 파일로 간다.
- **`OklchPicker`에 허용된 변경은 셋뿐이다** — 타이포(3.3에서 이미 완료) · `flex-wrap`(Task 2) · ARIA와 라벨 문구(Task 3). 드래그 배선 · 상태 구조 · `clampChromaToGamut` · 마커 위치 계산 · `PAD_W`/`PAD_H`는 **불변**.
- **주석은 한국어로 *왜*를 쓴다.** *무엇*은 코드가 말한다.
- **스펙·주석이 코드를 인용할 때 `file.ts:NN`이 아니라 심볼명을 쓴다.**
- **로직과 렌더를 분리한다.** 계산은 순수 함수, 컴포넌트는 그리기만.
- **대비 하한 4.5:1** — 이 화면 크롬의 의미를 지닌 텍스트 전부. `Mock` 내부는 명시적 예외.
- **`--ds-*` 토큰 경계는 3.3 D1 그대로** — 레이아웃 레벨만 토큰, 컴포넌트 내부 미세 간격은 Tailwind 유틸리티.

**명령:**

```bash
cd web && pnpm test          # 웹 스위트
cd web && npx tsc -b         # 타입체크 (vitest는 타입체크를 안 한다)
pnpm test                    # 루트 엔진 스위트 (회귀 확인용)
cd web && pnpm dev --port 5199   # http://localhost:5199/design-system-starter/color-palette
```

**실측 규칙 (CLAUDE.md):** 뷰포트는 chrome-devtools `emulate`의 viewport override로만 만든다 — `resize_page`는 물리 디스플레이에 막힌다. 재기 전에 `window.innerWidth`/`innerHeight`를 확인한다. 축소된 전체 스크린샷의 *인상*을 확증으로 쓰지 않는다.

---

## File Structure

**새로 만드는 것 — 순수 함수 셋과 그 테스트**

| 파일 | 책임 |
| --- | --- |
| `web/src/color-palette/contrastTriage.ts` | 대비 실패를 "고칠 수 있는 것 / 없는 것"으로 가른다. D4의 핵심. |
| `web/src/color-palette/mockTargets.ts` | (스케일, 역할) → 목업 안의 어느 요소인가. D3의 핵심. |
| `web/src/color-palette/candidateMatch.ts` | 후보 hex가 현재 적용 중인 색인가 — 왕복 오차를 견디는 근사 일치. D7의 핵심. |
| `web/src/color-palette/shiftSummary.ts` | `RoleShift[]` → 사람이 읽는 한 줄. D5. |
| 각각의 `*.test.ts` | 위 넷의 단위 테스트 |

**고치는 것**

| 파일 | 무엇 |
| --- | --- |
| `ColorPalettePage.tsx` | 그리드 평탄화(D1) · pin 소멸 알림/복원(D6) · 강조 상태 소유(D3) |
| `PreviewPane.tsx` | 경고 위계 재편(D4) · 목업 강조 수신(D3) · 이동 요약(D5) · sr-only 요약 제거 |
| `AdjustableScale.tsx` | 캡션 대비(D2) |
| `NeutralControl.tsx` | `•` 표식·"자동으로" 대비(D2) |
| `DownloadRow.tsx` | 복사 피드백(D8) · 비활성 사유 대비(D2) |
| `CandidatePopover.tsx` | 현재 선택 표시(D7-1) · 겹침 사유(D7-2) · 패널 폭(D7) |
| `AccentInput.tsx` | 앵커 행 wrap(D1) |
| `components/OklchPicker.tsx` | L/C/H 행 wrap(D1) · ARIA와 라벨(D10) |
| `components/Popover.tsx` | 패널 max-width를 경계에 묶기(D7) |

**테스트가 깨질 자리 (착수 전 인지)**

| 테스트 | 어느 태스크가 깨나 |
| --- | --- |
| `getByText("고정값 미달 9건")` ×3 | Task 5 (D4가 문구·개수 기준을 바꾼다) |
| 뱃지 텍스트 단언 6곳 | Task 5 (`roleId` → `label`) |
| `getByRole("status")` 2곳 | Task 5 (sr-only 요약을 걷고 헤드라인에 live를 단다) |
| `.grid-cols-2` 상태색 | Task 2 (lg 전용이 된다) |
| `getAllByRole("radio")` 개수 다수 | **안 깨진다** — Task 9는 라디오를 추가하지 않는다 (D7의 "승격 안 함") |

---

### Task 1: 크롬 텍스트 대비 하한 (D2)

**Files:**
- Modify: `web/src/color-palette/AdjustableScale.tsx` · `NeutralControl.tsx` · `DownloadRow.tsx` · `PreviewPane.tsx` · `ColorPalettePage.tsx`
- Test: `web/src/color-palette/chromeContrast.test.tsx` (신규)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: 없음 (순수 스타일 변경)

**배경.** `text-neutral-400` = `oklch(0.708 0 0)` → 흰 배경 **2.58:1**. 목표 `text-neutral-500` = `oklch(0.556 0 0)` → **4.73:1**. 판정 기준은 "못 읽으면 사용자가 알 수 없게 되는 것이 있는가"이고, **아래는 명단이 아니라 착수 시점의 grep 결과**다. 구현자는 직접 훑고 의미를 지닌 것을 전부 올린다.

- [ ] **Step 1: 현재 상태를 grep으로 고정**

```bash
cd web/src && grep -rn "text-neutral-400" color-palette/ components/ | grep -v ".test."
```

기대: `AdjustableScale`(stop-caption), `ColorPalettePage`(상태색 라벨), `PreviewPane`(ContrastBadge 고정 쪽 · details summary), `NeutralControl`(`•` 표식 · "자동으로"), `DownloadRow`(copy 비활성 사유). 목록을 메모해 둔다.

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`web/src/color-palette/chromeContrast.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ColorPalettePage } from "./ColorPalettePage";

// 이 화면의 일은 대비를 재는 것이다. 자기 크롬이 그 기준에 미달하면 도구가
// 자기 주장을 배반한다 — neutral-400(2.58:1)이 아니라 neutral-500(4.73:1)이
// 크롬 텍스트의 하한이다. 목업(Mock) 내부는 예외: 거기 색은 사용자 팔레트이고
// 그 미달을 드러내는 것이 이 화면의 목적이다.
describe("크롬 텍스트 대비 (스펙 D2)", () => {
  it("목업 밖 크롬에 text-neutral-400이 남아 있지 않다", () => {
    const { container } = render(<ColorPalettePage />);
    const light = screen.getByTestId("mock-light");
    const dark = screen.getByTestId("mock-dark");
    const offenders = Array.from(container.querySelectorAll(".text-neutral-400"))
      .filter((el) => !light.contains(el) && !dark.contains(el))
      .map((el) => el.textContent?.slice(0, 24) ?? "(빈 요소)");
    expect(offenders).toEqual([]);
  });

  it("stop 캡션이 neutral-500이다", () => {
    render(<ColorPalettePage />);
    expect(screen.getAllByTestId("stop-caption")[0].className).toContain("text-neutral-500");
  });

  it("자동 스냅 점 표식이 neutral-500이다", () => {
    render(<ColorPalettePage />);
    // NeutralControl 헤더 주석이 "자동으로 붙은 자리는 점(•) 표식으로만 알린다"고
    // 선언한다 — 시각 채널이 이것 하나뿐이라 정확히 "의미를 지닌" 자리다.
    const dot = screen.getByText("•");
    expect(dot.className).toContain("text-neutral-500");
  });
});
```

- [ ] **Step 3: 테스트가 실패하는 것을 확인**

Run: `cd web && pnpm test chromeContrast`
Expected: FAIL — `offenders`가 비어 있지 않고, 캡션/점 단언도 실패.

- [ ] **Step 4: Step 1 목록의 `text-neutral-400`을 `text-neutral-500`으로 올린다**

Step 1 grep 결과를 하나씩 처리한다. 각 자리에서 "이 글자를 못 읽으면 알 수 없게 되는 것이 있는가"를 묻는다 — 이 화면에서는 여섯 자리 모두 예다.

`AdjustableScale`의 캡션 주석에 근거를 남긴다:

```tsx
// 캡션 색은 neutral-500이다 — 400은 흰 배경에서 2.58:1로, 이 화면이 재고 있는
// 바로 그 기준(4.5:1)에 미달한다. stop 번호를 못 읽으면 어느 자리인지 알 수
// 없으므로 장식이 아니다 (스펙 D2).
```

- [ ] **Step 5: 테스트 통과 확인 + 전체 스위트**

Run: `cd web && pnpm test && npx tsc -b`
Expected: PASS. 기존 테스트는 색 클래스에 매여 있지 않아 깨지지 않는다.

- [ ] **Step 6: 브라우저 실측**

`cd web && pnpm dev --port 5199` 후, chrome-devtools로 `emulate` viewport `1440x900x1`을 걸고 `window.innerWidth === 1440` 확인. 캔버스로 색을 RGB로 환산해 재측정한다 (`getComputedStyle().color`는 `oklch()` 문자열이라 직접 파싱하면 안 된다 — 3자리 숫자를 RGB로 오독한다):

```js
const cv = document.createElement("canvas"); cv.width = cv.height = 1;
const ctx = cv.getContext("2d", { willReadFrequently: true });
const toRGB = (css) => { ctx.fillStyle = "#000"; ctx.fillStyle = css; ctx.fillRect(0,0,1,1);
  return Array.from(ctx.getImageData(0,0,1,1).data); };
// 이후 WCAG 상대휘도로 비율 계산, 목업 밖 텍스트 전부가 >= 4.5인지 확인
```

Expected: 목업 밖 위반 0건.

- [ ] **Step 7: 커밋**

```bash
git add web/src/color-palette
git commit -m "fix(color-palette): 크롬 텍스트 대비 하한 4.5:1 (D2)

text-neutral-400은 흰 배경에서 2.58:1로, 이 화면이 재고 있는 바로 그 기준에
미달했다. stop 캡션 22개·상태색 라벨·대비 뱃지·자동 스냅 점 표식 등 의미를
지닌 자리를 neutral-500(4.73:1)으로 올린다. 목업 내부는 명시적 예외 —
거기 미달을 드러내는 것이 이 화면의 목적이다."
```

---

### Task 2: 페이지 그리드 평탄화와 반응형 (D1)

**Files:**
- Modify: `web/src/color-palette/ColorPalettePage.tsx` · `AccentInput.tsx` · `web/src/components/OklchPicker.tsx`
- Test: `web/src/color-palette/layout.test.tsx` (신규), `ColorPalettePage.test.tsx`(기존 상태색 테스트 수정)

**Interfaces:**
- Consumes: 없음
- Produces: `<main>`이 그리드이고 `<section>`(①②③)과 `<aside>`가 그 직계 자식. 이후 태스크는 이 구조를 전제한다.

**배경.** `order`로는 안 된다 — 같은 컨테이너의 형제끼리만 재정렬하는데 지금 `aside`와 세 `section`은 다른 컨테이너에 있다. 평탄화가 D1 비용의 전부다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`web/src/color-palette/layout.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ColorPalettePage } from "./ColorPalettePage";

describe("페이지 그리드 (스펙 D1)", () => {
  it("세 스테이지와 aside가 main의 직계 자식이다", () => {
    render(<ColorPalettePage />);
    const main = screen.getByRole("main");
    const aside = screen.getByRole("complementary");
    // 평탄화의 핵심 — 형제가 아니면 좁은 화면에서 프리뷰를 ②와 ③ 사이에
    // 놓을 수 없다 (order는 컨테이너 경계를 못 넘는다).
    expect(aside.parentElement).toBe(main);
    const sections = Array.from(main.children).filter((c) => c.tagName === "SECTION");
    expect(sections.length).toBe(3);
  });

  it("DOM 순서가 ① → ② → 프리뷰 → ③이다", () => {
    render(<ColorPalettePage />);
    const main = screen.getByRole("main");
    const kids = Array.from(main.children).filter(
      (c) => c.tagName === "SECTION" || c.tagName === "ASIDE",
    );
    // 좁은 화면에서는 이 순서가 그대로 읽는 순서다 — 결과(프리뷰)를 보기 전에
    // 파일(③)부터 받으라고 권하지 않는다.
    expect(kids.map((c) => c.tagName)).toEqual(["SECTION", "SECTION", "ASIDE", "SECTION"]);
  });

  it("main 랜드마크가 살아 있다", () => {
    render(<ColorPalettePage />);
    // display:contents로 풀면 접근성 트리에서 요소가 사라지는 사례가 보고된
    // 패턴이라, main을 그대로 그리드로 만든다.
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByRole("complementary")).toBeTruthy();
  });

  it("상태색 2×2 그리드가 lg 전용이다", () => {
    render(<ColorPalettePage />);
    const grid = screen.getByTestId("semantic-section").querySelector('[class*="grid-cols"]');
    // 2×2는 3.3 D3의 lg 세로 예산용 나사였다. 390px에서 그대로 두면 스톱당
    // ~7px가 되어 사이클 3 D7의 "얇게 노출"이 그 자리에서 죽는다.
    expect(grid?.className).toContain("lg:grid-cols-2");
    expect(grid?.className).not.toMatch(/(^|\s)grid-cols-2(\s|$)/);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd web && pnpm test layout`
Expected: FAIL — `aside.parentElement`가 `main`이 아니라 바깥 `div`.

- [ ] **Step 3: `ColorPalettePage`를 평탄화한다**

바깥 `div`(그리드)와 안쪽 `main`을 하나로 합친다. `h1`은 그리드 전체 폭을 차지한다.

```tsx
<main
  className="mx-auto grid max-w-[1200px] grid-cols-1 items-start
             lg:grid-cols-[1fr_380px]"
  style={{
    padding: "var(--ds-space-lg)",
    // row/column을 갈라 잡는다 — 하나로 32를 쓰면 스테이지 사이가 24에서 32로
    // 벌어져 3칸에서 +24px, 3.3이 남긴 세로 여유 12.64px를 그 자리에서 넘긴다.
    rowGap: "var(--ds-space-lg)",
    columnGap: "var(--ds-space-xl)",
  }}
>
  <h1 className="ds-type-heading-sm lg:col-span-2">컬러 팔레트</h1>

  <section className="lg:col-start-1" style={{ display: "grid", gap: "var(--ds-space-sm)" }}>
    {/* ① 앵커 */}
  </section>

  <section className="lg:col-start-1" style={{ display: "grid", gap: "var(--ds-space-md)" }}>
    {/* ② 팔레트 */}
  </section>

  {/* 좁은 화면에서는 자연 순서로 ②와 ③ 사이에 온다 — order 불필요.
      lg에서는 2열 첫 행으로 올라가 세 스테이지 옆에 sticky로 선다. */}
  <aside className="lg:col-start-2 lg:row-start-2 lg:row-span-3 lg:sticky lg:top-8">
    <PreviewPane … />
  </aside>

  <section className="lg:col-start-1" style={{ display: "grid", gap: "var(--ds-space-sm)" }}>
    {/* ③ 받기 */}
  </section>
</main>
```

상태색 그리드를 lg 전용으로:

```tsx
<div
  className="grid grid-cols-1 lg:grid-cols-2"
  style={{ columnGap: "var(--ds-space-md)", rowGap: "var(--ds-space-xxs)" }}
>
```

- [ ] **Step 4: 가로 하한을 만드는 두 행에 wrap을 허용한다**

`AccentInput`의 행:

```tsx
{/* wrap을 허용한다 — 이 행의 min-content(피커 256 + gap 24 + hex 112 = 392)가
    카드·페이지 패딩과 합쳐져 페이지 전체의 가로 하한 442px를 만들고 있었다. */}
<div className="flex flex-wrap items-start gap-6">
```

`OklchPicker`의 L/C/H 행 — **256px의 정체는 패드가 아니라 이 행**이다 (3 × (라벨 12 + gap 4 + 칸 64) + 2 × gap 8 = 256):

```tsx
{/* 3.3이 좁힌 "배치·상태 구조는 불변"에 flex-wrap 하나를 예외로 둔다 (스펙 D1).
    이 행의 min-content가 페이지 가로 하한을 만들어 성공 기준 1을 물리적으로
    불가능하게 하기 때문이다. 드래그 배선·클램프·마커 계산·패드 크기는 그대로다. */}
<div className="flex flex-wrap gap-2 pt-1">
```

- [ ] **Step 5: 기존 상태색 테스트를 새 규범에 맞춘다**

`ColorPalettePage.test.tsx`의 `"상태색 4벌이 2×2 그리드로 감싸여 있다"`에서 `.grid-cols-2` 조회를 `[class*="lg:grid-cols-2"]`로 바꾸고, 왜 lg 전용이 됐는지 주석을 남긴다.

- [ ] **Step 6: 테스트 통과 확인**

Run: `cd web && pnpm test && npx tsc -b`
Expected: PASS

- [ ] **Step 7: 브라우저 실측 — 네 뷰포트**

각 폭에서 `emulate` viewport를 걸고 **먼저 `window.innerWidth`를 확인**한 뒤 측정한다:

```js
({ innerW: innerWidth, scrollW: document.documentElement.scrollWidth,
   over: [...document.querySelectorAll("main *")]
     .filter(el => el.getBoundingClientRect().right > innerWidth + 1).length })
```

Expected: **320 · 360 · 390 · 768 전부에서 `scrollW === innerW`, `over === 0`.**
그리고 1440×900에서 DOM 순서가 시각적으로 2열을 유지하는지 확인.

- [ ] **Step 8: 커밋**

```bash
git add web/src/color-palette web/src/components/OklchPicker.tsx
git commit -m "fix(color-palette): 페이지 그리드 평탄화 — 320px까지 가로 스크롤 0 (D1)

aside가 main의 형제라 lg 미만에서 프리뷰가 ③ 받기보다 뒤로 갔다. main 자신을
그리드로 만들고 세 스테이지와 aside를 직계 자식으로 두면 좁은 화면 자연 순서가
① → ② → 프리뷰 → ③이 된다 (order는 컨테이너 경계를 못 넘어 이 평탄화 없이는
불가능하다).

가로 하한 442px의 원인은 패드가 아니라 L/C/H 행의 min-content 256px였다 —
그 행과 앵커 행에 flex-wrap을 허용한다. 3.3이 좁힌 OklchPicker 비-목표
'배치는 불변'의 두 번째 부분 개정이고, 예외는 flex-wrap 하나로 한정한다.

row-gap 24 / column-gap 32로 갈라 잡았다 — 합치면 스테이지 사이가 +24px가 되어
3.3이 남긴 세로 여유 12.64px를 넘긴다. 상태색 2×2는 lg 전용으로 좁혔다."
```

---

### Task 3: 피커의 보조기술 경로 (D10)

**Files:**
- Modify: `web/src/components/OklchPicker.tsx`
- Test: `web/src/components/OklchPicker.test.tsx`(기존에 추가)

**Interfaces:**
- Consumes: Task 2가 만든 wrap 배치 (충돌 없음, 같은 파일의 다른 자리)
- Produces: 없음

**배경.** L×C 패드와 hue 스트립은 `onPointerDown`만 단 `<div>`다 — `tabindex`도 `role`도 없어 스크린리더에는 **존재하지 않는 컨트롤**이다. 그런데 같은 값이 L/C/H 칸으로 이미 도달 가능하다. 결함은 "키보드로 못 쓴다"가 아니라 **"공식 경로가 어느 쪽인지 말하지 않는다"**이다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```tsx
it("패드와 hue 스트립이 보조기술에서 숨겨진다", () => {
  const { container } = render(<OklchPicker hex="#3b82f6" onChange={() => {}} />);
  const canvas = container.querySelector("canvas");
  // 포인터 편의 장치다 — 같은 값이 L/C/H 칸으로 도달 가능하고, 그쪽이 공식
  // 경로다. 숨기지 않으면 스크린리더에 이름 없는 그래픽이 둘 남는다.
  expect(canvas?.closest("[aria-hidden='true']")).toBeTruthy();
});

it("L·C·H 칸이 한 글자가 아닌 이름을 갖는다", () => {
  render(<OklchPicker hex="#3b82f6" onChange={() => {}} />);
  // 한 글자 라벨("L")로는 "이쪽이 공식 접근 경로"라는 선언을 지탱하지 못한다.
  expect(screen.getByLabelText("명도")).toBeTruthy();
  expect(screen.getByLabelText("채도")).toBeTruthy();
  expect(screen.getByLabelText("색상")).toBeTruthy();
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd web && pnpm test OklchPicker`
Expected: FAIL — `aria-hidden` 없음, `getByLabelText("명도")` 없음.

- [ ] **Step 3: 구현**

`LcPad`와 `HueStrip`의 최상위 `div`에 `aria-hidden`을 단다. `NumberField`는 **시각 라벨은 한 글자를 유지**하고(폭이 `w-3`이다) `aria-label`만 늘린다:

```tsx
function NumberField({ label, ariaLabel, … }) {
  return (
    <label className="flex items-center gap-1 ds-type-caption-sm text-neutral-500">
      {/* 시각 라벨은 한 글자를 유지한다 — 폭이 w-3이고 L·C·H는 이 도구 사용자에게
          통용되는 표기다. 보조기술에는 한 글자로 부족해 aria-label만 늘린다:
          패드를 aria-hidden으로 숨긴 이상 이 칸들이 유일한 접근 경로이고,
          "L"만으로는 그 역할을 못 한다 (스펙 D10). */}
      <span className="w-3 font-mono" aria-hidden>{label}</span>
      <input aria-label={ariaLabel} … />
    </label>
  );
}
```

호출부에 `ariaLabel={"명도"} / {"채도"} / {"색상"}`을 넘긴다.

- [ ] **Step 4: 통과 확인**

Run: `cd web && pnpm test && npx tsc -b`
Expected: PASS. `#builder`·`#lab`·`inspector`도 이 컴포넌트를 쓰므로 전체 스위트를 돌린다.

- [ ] **Step 5: 커밋**

```bash
git add web/src/components/OklchPicker.tsx web/src/components/OklchPicker.test.tsx
git commit -m "a11y(picker): 패드를 aria-hidden으로, L·C·H 칸을 공식 경로로 (D10)

L×C 패드와 hue 스트립은 role도 tabindex도 없는 div라 스크린리더에 존재하지
않는 컨트롤이었다. 같은 값이 L/C/H 칸으로 이미 도달 가능하므로, 패드를 포인터
편의 장치로 명시하고 칸 쪽을 공식 경로로 세운다. 한 글자 aria-label로는 그
선언을 지탱 못 해 명도·채도·색상으로 늘렸다 (시각 라벨은 폭 때문에 한 글자 유지).

진짜 키보드 슬라이더(role=slider + 화살표)는 드래그 핸들러를 건드려 3.3이 지킨
경계에 걸리므로 이월한다."
```

---

### Task 4: 복사 결과 통지 (D8)

**Files:**
- Modify: `web/src/color-palette/DownloadRow.tsx`
- Test: `web/src/color-palette/ColorPalettePage.test.tsx`(기존 "받기 카드" describe에 추가)

**Interfaces:**
- Consumes: 없음
- Produces: 없음

**배경.** `copyText`는 `Promise<boolean>`을 내는데 `DownloadRow`가 `void`로 버린다. 클립보드 거부와 성공이 구별되지 않는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

**`navigator.clipboard`를 반드시 원복한다** — 이 파일의 기존 테스트("클립보드를 못 쓰면 disabled에 사유가 붙는다")가 같은 전역을 만지고 원복하는 패턴을 이미 쓴다. 원복을 빠뜨리면 실행 순서에 따라 그 테스트가 깨진다.

```tsx
describe("복사 피드백 (스펙 D8)", () => {
  const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  const stub = (writeText: () => Promise<void>) =>
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

  afterEach(() => {
    // 전역을 만졌으면 반드시 되돌린다 — 안 되돌리면 이 파일의 다른 테스트가
    // 실행 순서에 따라 깨진다.
    if (original) Object.defineProperty(navigator, "clipboard", original);
  });

  it("CSS 복사 성공이 통지된다", async () => {
    stub(() => Promise.resolve());
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: /CSS 복사/ }));
    expect(await screen.findByText("복사됨")).toBeTruthy();
  });

  it("CSS 복사 실패도 통지된다", async () => {
    // 성공만 처리하면 실패가 조용해져서 지금(void로 버리는 것)과 같아진다.
    stub(() => Promise.reject(new Error("denied")));
    render(<ColorPalettePage />);
    fireEvent.click(screen.getByRole("button", { name: /CSS 복사/ }));
    expect(await screen.findByText(/복사하지 못했습니다/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd web && pnpm test "받기 카드"`
Expected: FAIL — "복사됨"이 나타나지 않음.

- [ ] **Step 3: 구현**

```tsx
type CopyState = "idle" | "ok" | "fail";
const [copied, setCopied] = useState<CopyState>("idle");

// 결과를 버리지 않는다 — copyText는 권한 거부에서 false를 낸다. 성공만
// 표시하면 실패가 조용해져 지금(void로 버리는 것)과 다를 바 없다.
const onCopy = async () => {
  setCopied(await copyText(files.css) ? "ok" : "fail");
  window.setTimeout(() => setCopied("idle"), 2000);
};
```

버튼 라벨은 `copied === "ok" ? "복사됨" : "CSS 복사"`로 두고, 그 옆 `role="status"` 영역에 성공/실패 문구를 낸다. 실패 문구는 `복사하지 못했습니다 — 파일로 받으세요.`

**주의:** 기존 테스트가 `getByRole("button", { name: /CSS 복사/ })`로 잡으므로, 라벨이 바뀌는 2초 동안만 이름이 달라진다. 기존 단언은 초기 상태를 보므로 안전하다.

- [ ] **Step 4: 통과 확인**

Run: `cd web && pnpm test && npx tsc -b`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add web/src/color-palette
git commit -m "fix(color-palette): 복사 성공·실패를 통지한다 (D8)

copyText가 Promise<boolean>을 내는데 void로 버려서 클립보드 거부와 성공이
구별되지 않았다. 둘 다 라벨 전환과 role=status로 알린다 — 성공만 처리하면
실패가 조용해져 지금과 같아진다."
```

---

### Task 5: 경고 위계를 "고칠 수 있는가"로 (D4)

**Files:**
- Create: `web/src/color-palette/contrastTriage.ts` · `contrastTriage.test.ts`
- Modify: `web/src/color-palette/PreviewPane.tsx` · `ColorPalettePage.tsx`
- Modify: `web/src/color-palette/ColorPalettePage.test.tsx` (뱃지·요약 단언 갱신)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `triageChecks(checks: readonly ContrastCheck[], shifts: readonly RoleShift[]): { fixable: ContrastCheck[]; unfixable: ContrastCheck[] }`
  - `roleLabel(roleId: string): string` — `SCALE_ROLES`의 `label`을 찾아 준다. 못 찾으면 `roleId` 그대로.
  - `PreviewPane`이 `role="status"`를 **헤드라인에** 단다 (sr-only 요약은 사라진다).

**배경 — 위계가 틀린 축을 쓴다.** `ContrastCheck.adjustable`은 *"이 스케일을 사용자가 바꿀 수 있는가"*(accent·neutral만 true)이지 *"이 실패를 고칠 수 있는가"*가 아니다. `on-solid` 실패는 엔진의 `onSolidWarning`이 못 박는다 — **"흰/검 중 관례대로 고른 값이라 stop을 옮겨 고칠 수 없다"**. 그래서 기본 상태의 유일한 "조정 가능" 실패인 `액센트 on-solid`가 실은 못 고치는 것이고, `suggestRoleShifts`가 비는 것도 그 때문이며, `한 번에 고치기`가 안 뜨는 것도 그 때문이다.

- [ ] **Step 1: 순수 함수의 실패하는 테스트를 쓴다**

`web/src/color-palette/contrastTriage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { checkContrast, suggestRoleShifts } from "@core/color/contrast.js";
import { SCALE_ROLES } from "@core/color/roles.js";
import { deriveScales, defaultState } from "./paletteState";
import { roleLabel, triageChecks } from "./contrastTriage";

describe("triageChecks (스펙 D4)", () => {
  it("on-solid은 스케일이 조정 가능해도 '고칠 수 없는 것'이다", () => {
    const state = defaultState();
    const scales = deriveScales(state);
    const checks = checkContrast(scales, SCALE_ROLES).filter((c) => !c.passes);
    const { fixable, unfixable } = triageChecks(checks, suggestRoleShifts(scales, SCALE_ROLES));
    // 엔진의 onSolidWarning이 "stop을 옮겨 고칠 수 없다"고 못 박는다 —
    // adjustable(스케일 소유권)로 가르면 이게 맨 위로 올라와 대책 없이 남는다.
    expect(unfixable.some((c) => c.roleId === "on-solid" && c.scaleName === "accent")).toBe(true);
    expect(fixable.some((c) => c.roleId === "on-solid")).toBe(false);
  });

  it("기본 팔레트에서는 고칠 수 있는 것이 0건이다", () => {
    const scales = deriveScales(defaultState());
    const checks = checkContrast(scales, SCALE_ROLES).filter((c) => !c.passes);
    // suggestRoleShifts가 비어 있으므로 '한 번에 고치기'도 안 뜬다. 그 사실이
    // 헤드라인에 정직하게 반영돼야 한다 — "경고 10건"이 아니라 "고칠 수 있는 것 0".
    expect(triageChecks(checks, suggestRoleShifts(scales, SCALE_ROLES)).fixable).toEqual([]);
  });

  it("제안이 있는 text 실패는 '고칠 수 있는 것'이다", () => {
    const scales = deriveScales(defaultState("#f5d90a"));
    const checks = checkContrast(scales, SCALE_ROLES).filter((c) => !c.passes);
    const shifts = suggestRoleShifts(scales, SCALE_ROLES);
    expect(shifts.length).toBeGreaterThan(0);
    const { fixable } = triageChecks(checks, shifts);
    expect(fixable.length).toBeGreaterThan(0);
    expect(fixable.every((c) => c.adjustable)).toBe(true);
  });
});

describe("roleLabel", () => {
  it("엔진의 사람 말을 쓴다", () => {
    // roles.ts가 "UI 문구는 엔진에 둔다"고 적어뒀는데 뱃지가 roleId를 생으로
    // 찍고 있었다. 바로 옆 scaleName은 이미 라벨을 쓴다.
    expect(roleLabel("on-solid")).toBe("솔리드 위 글자");
    expect(roleLabel("text-strong")).toBe("진한 텍스트");
  });
  it("모르는 id는 그대로 돌려준다", () => {
    expect(roleLabel("nope")).toBe("nope");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd web && pnpm test contrastTriage`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 순수 함수를 구현한다**

`web/src/color-palette/contrastTriage.ts`:

```ts
// 대비 실패를 "고칠 수 있는 것 / 없는 것"으로 가른다.
//
// 왜 ContrastCheck.adjustable을 그대로 쓰지 않는가: 그 플래그는 "이 스케일을
// 사용자가 바꿀 수 있는가"(accent·neutral)이지 "이 실패를 고칠 수 있는가"가
// 아니다. on-solid은 스케일이 accent여도 못 고친다 — 엔진의 onSolidWarning이
// "흰/검 중 관례대로 고른 값이라 stop을 옮겨 고칠 수 없다"고 적었다. 그 둘을
// 같은 축으로 취급해서 기본 상태의 헤드라인이 대책 없는 경고 하나를 맨 위에
// 올려두고 있었다 (스펙 D4).
//
// 판정: suggestRoleShifts가 이 role·theme에 대한 이동을 제안했는가. 제안 함수는
// TEXT_ROLES(text·text-strong)와 조정 가능한 스케일에만 제안을 내므로,
// on-solid은 구조적으로 절대 매칭되지 않는다.
import type { ContrastCheck, RoleShift } from "@core/color/contrast.js";
import { SCALE_ROLES } from "@core/color/roles.js";

export interface Triage {
  readonly fixable: ContrastCheck[];
  readonly unfixable: ContrastCheck[];
}

export function triageChecks(
  checks: readonly ContrastCheck[],
  shifts: readonly RoleShift[],
): Triage {
  const canFix = (c: ContrastCheck) =>
    c.adjustable && shifts.some((s) => s.roleId === c.roleId && s.theme === c.theme);
  return {
    fixable: checks.filter(canFix),
    unfixable: checks.filter((c) => !canFix(c)),
  };
}

/** 역할의 사람이 읽는 이름. roles.ts가 "UI 문구는 엔진에 둔다"고 적어뒀고,
 *  뱃지의 scaleName은 이미 그렇게 하고 있다 — roleId만 생으로 남아 있었다. */
export function roleLabel(roleId: string): string {
  return SCALE_ROLES.find((r) => r.id === roleId)?.label ?? roleId;
}
```

- [ ] **Step 4: 순수 함수 테스트 통과 확인**

Run: `cd web && pnpm test contrastTriage`
Expected: PASS

- [ ] **Step 5: `PreviewPane`을 새 위계로 다시 짠다**

- `adjustableFailing`/`fixedFailing` → `triageChecks(failing, shifts)`의 `fixable`/`unfixable`.
- `ContrastBadge`가 `c.roleId` 자리에 `roleLabel(c.roleId)`를 쓴다.
- **헤드라인**: `고칠 수 있는 대비 미달 N건` — 개수는 **확정 팔레트(`summaryChecks`) 기준**이다. hover 중에 숫자가 흔들리면 "hover는 미리보기일 뿐"이라는 이 화면의 계약이 깨진다.
- 헤드라인에 `role="status" aria-live="polite"`를 달고 **기존 `sr-only` 요약 블록을 제거한다** (3.3 D8-2 개정 — 안 걷으면 스크린리더가 같은 말을 두 번 듣는다).
- **고칠 수 없는 것의 개수는 접혀도 항상 보인다**: `<summary>`에 `고칠 수 없는 미달 N건 — 상태색은 고정 앵커, 솔리드 위 글자는 관례값이라 이 화면에서 못 바꿉니다`.

```tsx
{/* 개수는 접힌 상태에서도 남는다 — 사이클 3 D7("산출물에 무조건 들어가므로
    화면에 없으면 받아간 파일에 모르는 것이 들어있게 된다")이 여기에도 걸린다.
    접는 것은 목록이지 사실이 아니다. */}
```

- [ ] **Step 6: 깨진 기존 테스트를 갱신한다**

`ColorPalettePage.test.tsx`에서:
- `getByText("고정값 미달 9건")` ×3 → 새 문구·개수로. 개수는 실행해서 확인한 값을 쓴다 (기본 팔레트에서 10건 전부가 `unfixable`이 된다 — `on-solid`이 이쪽으로 옮겨오므로 9 → 10).
- 뱃지 텍스트 단언에서 `on-solid` → `솔리드 위 글자`, `text-strong` → `진한 텍스트`.
- `getByRole("status")` 테스트 둘: 이제 헤드라인이 status다. "hover에 흔들리지 않는다"는 단언은 **그대로 유지**한다 — 헤드라인이 확정 팔레트 기준이므로 여전히 참이어야 한다.

- [ ] **Step 7: 전체 통과 확인**

Run: `cd web && pnpm test && npx tsc -b`
Expected: PASS

- [ ] **Step 8: 커밋**

```bash
git add web/src/color-palette
git commit -m "fix(color-palette): 경고 위계를 '고칠 수 있는가'로 가른다 (D4)

ContrastCheck.adjustable은 '이 스케일을 사용자가 바꿀 수 있는가'이지 '이 실패를
고칠 수 있는가'가 아니다. on-solid은 스케일이 accent여도 못 고치는데(엔진의
onSolidWarning이 그렇게 적었다) 화면이 그걸 조정 가능으로 분류해 기본 상태의
맨 위에 대책 없이 올려두고 있었다. suggestRoleShifts의 제안 유무로 가른다.

뱃지가 roleId를 생으로 찍던 자리에 SCALE_ROLES의 label을 쓴다 — roles.ts가
'UI 문구는 엔진에 둔다'고 적었고 바로 옆 scaleName은 이미 그렇게 하고 있었다.

sr-only 요약을 걷고 헤드라인에 aria-live를 단다 (3.3 D8-2 개정) — 둘 다 두면
스크린리더가 같은 말을 두 번 듣는다. 고칠 수 없는 것의 개수는 접혀도 항상
보인다 (사이클 3 D7)."
```

---

### Task 6: 경고 ↔ 목업 양방향 강조 (D3)

**Files:**
- Create: `web/src/color-palette/mockTargets.ts` · `mockTargets.test.ts`
- Modify: `web/src/color-palette/PreviewPane.tsx`

**Interfaces:**
- Consumes: Task 5의 `triageChecks` (강조는 `fixable`에만 붙는다)
- Produces:
  - `type MockTarget = "solid-btn" | "share-btn" | "bars" | "card-text" | "card-subtext" | "error-badge"`
  - `mockTargetFor(scaleName: string, roleId: string): MockTarget | null`
  - `Mock`이 `highlight?: MockTarget | null` prop을 받는다

**배경.** `on-solid`이 뭔지는 이미 화면에 있다 — 라이트 목업의 `보고서 열기` 버튼이 그 solid + on-solid 쌍이다. 연결선만 없다. **어휘를 설명하는 대신 가리켜서 가르친다.**

**대상은 `fixable`뿐이다.** 목업이 그리는 것은 뉴트럴·액센트와 error 배지 하나뿐이라, 기본 팔레트에서는 10건 중 1건만 대응한다. 그러나 노란 액센트 실측에서는 조정 가능 실패 4건이 전부 액센트 `text`/`text-strong`이고 `공유` 버튼에 대응한다 — **고칠 수 있는 경고일수록 대응 요소가 있다.** 대응 요소가 없는 것에는 Task 5의 사유 한 줄이 답한다. **목업을 넓히지 않는다** (3.1 D2 재개봉).

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`web/src/color-palette/mockTargets.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mockTargetFor } from "./mockTargets";

describe("mockTargetFor (스펙 D3)", () => {
  it("액센트 solid·on-solid은 보고서 열기 버튼이다", () => {
    expect(mockTargetFor("accent", "on-solid")).toBe("solid-btn");
    expect(mockTargetFor("accent", "solid")).toBe("solid-btn");
  });
  it("액센트 text-strong·subtle-bg·border는 공유 버튼이다", () => {
    // Mock의 "공유"가 subtle-bg 배경 + border + text-strong 글자로 그려진다.
    expect(mockTargetFor("accent", "text-strong")).toBe("share-btn");
    expect(mockTargetFor("accent", "border")).toBe("share-btn");
  });
  it("뉴트럴 text·text-strong은 카드 안 두 줄이다", () => {
    expect(mockTargetFor("neutral", "text-strong")).toBe("card-text");
    expect(mockTargetFor("neutral", "text")).toBe("card-subtext");
  });
  it("목업에 없는 스케일은 null이다", () => {
    // warning·success·info는 목업에 아예 없다. 목업을 넓혀 커버리지를 올리는
    // 것은 3.1 D2("작게 하나면 충분하다")의 재개봉이라 하지 않는다 —
    // 대응 요소가 없다는 사실은 D4의 사유 한 줄이 대신 말한다.
    expect(mockTargetFor("warning", "text")).toBeNull();
    expect(mockTargetFor("success", "text-strong")).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인 → Step 3: 구현**

Run: `cd web && pnpm test mockTargets` → FAIL (모듈 없음)

`mockTargets.ts`는 `Mock`이 **실제로 그리는 것**만 매핑한다. 새 매핑을 추가하기 전에 `Mock`을 열어 그 요소가 정말 있는지 확인한다.

- [ ] **Step 4: `Mock`에 `data-mock-target` 속성과 강조 스타일을 단다**

`Mock`은 `highlight` prop을 받아 해당 요소에 아웃라인만 얹는다. **팔레트 색을 쓰지 않는다** — 사용자 팔레트 위에 얹히므로 대비를 보장할 수 없다. 크롬 중립색(`outline`)으로 그린다.

- [ ] **Step 5: `PreviewPane`에서 배선한다**

`fixable` 뱃지에 `onMouseEnter`/`onFocus`/`onMouseLeave`/`onBlur`를 달아 `hoveredTarget` 상태를 올린다. 역방향(목업 → 뱃지)도 같은 상태를 공유한다. **`unfixable` 뱃지에는 달지 않는다** — 대응 요소가 없어 아무 일도 안 일어나면 고장으로 읽힌다.

- [ ] **Step 6: 통합 테스트를 추가한다**

기본 팔레트는 `fixable`이 0건이라 강조할 대상이 없다. **노란 액센트로 상태를 만든다** — `#f5d90a`에서 조정 가능 실패 4건(액센트 `text`·`text-strong`)이 나오고 그것들이 `공유` 버튼에 대응한다.

```tsx
it("고칠 수 있는 경고에 hover하면 목업 요소가 강조된다", () => {
  render(<ColorPalettePage />);
  // hex 입력으로 노란 액센트를 만든다 — 기본 파랑은 fixable이 0건이라
  // 강조할 대상 자체가 없다 (D3의 대상은 고칠 수 있는 경고뿐이다).
  fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#f5d90a" } });

  const badges = screen.getAllByTestId("contrast-badge");
  const fixable = badges.find((b) => /텍스트/.test(b.textContent ?? ""));
  expect(fixable).toBeTruthy();

  fireEvent.mouseEnter(fixable!);
  const share = screen.getByTestId("mock-light").querySelector('[data-mock-target="share-btn"]');
  expect(share?.getAttribute("data-highlighted")).toBe("true");

  fireEvent.mouseLeave(fixable!);
  expect(share?.getAttribute("data-highlighted")).toBeNull();
});

it("고칠 수 없는 경고에는 강조가 붙지 않는다", () => {
  render(<ColorPalettePage />);
  // 대응 요소가 없는 경고에 hover해서 아무 일도 안 일어나면 고장으로 읽힌다 —
  // 아예 배선하지 않는다. 사유는 D4의 한 줄이 대신 말한다.
  const details = screen.getByText(/고칠 수 없는 미달/).closest("details")!;
  const inside = details.querySelectorAll('[data-testid="contrast-badge"]');
  inside.forEach((b) => expect(b.getAttribute("data-highlights")).toBeNull());
});
```

- [ ] **Step 7: 통과 확인 + 커밋**

Run: `cd web && pnpm test && npx tsc -b`

```bash
git commit -m "feat(color-palette): 고칠 수 있는 경고를 목업 요소에 연결한다 (D3)

on-solid이 무엇인지는 이미 화면에 있다 — 라이트 목업의 '보고서 열기'가 바로 그
solid + on-solid 쌍이다. 어휘를 설명하는 대신 가리켜서 가르친다. 세로 비용 0.

대상은 고칠 수 있는 경고뿐이다. 목업은 뉴트럴·액센트와 error 배지 하나만 그려서
warning·success·info에는 대응 요소가 없고, 목업을 넓히는 것은 3.1 D2의
재개봉이다. 대응 없는 경고에는 D4의 사유 한 줄이 답한다."
```

---

### Task 7: `한 번에 고치기`가 무엇을 바꿨는지 보인다 (D5)

**Files:**
- Create: `web/src/color-palette/shiftSummary.ts` · `shiftSummary.test.ts`
- Modify: `web/src/color-palette/PreviewPane.tsx` · `ColorPalettePage.tsx`

**Interfaces:**
- Consumes: Task 6의 `MockTarget` 강조 장치
- Produces: `summarizeShifts(shifts: readonly RoleShift[]): string` — 예: `텍스트 (링크)를 600 → 700으로, 진한 텍스트를 700 → 800으로 옮겼습니다`

**배경.** `한 번에 고치기`는 역할 → stop 매핑을 조용히 다시 쓴다. 이 도구의 산출물은 디자인 시스템 명세이고, 그걸 말없이 바꾸는 것은 감당할 수 없는 침묵이다. **`RoleShift.from`은 저장되지 않으므로**(엔진 주석: "옛 링크가 옛 기본값을 실어 오면 안 된다") 이 문구는 적용 **직후에만** 만들 수 있다 — 새로고침하면 사라지는 것이 맞다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```ts
import { STOP_KEYS } from "@core/color/scale.js";
import { summarizeShifts } from "./shiftSummary";

it("인덱스가 아니라 stop 이름으로 말한다", () => {
  // RoleShift의 from/to는 인덱스(6→7)다. 사람에게는 STOP_KEYS를 거쳐 600→700으로
  // 보여야 한다 — 화면 어디에도 인덱스는 안 보이기 때문이다.
  const s = summarizeShifts([{ roleId: "text", theme: "light", from: 6, to: 7 }]);
  expect(s).toContain("600");
  expect(s).toContain("700");
  expect(s).not.toContain("6 →");
});

it("역할 이름은 엔진 라벨을 쓴다", () => {
  const s = summarizeShifts([{ roleId: "text-strong", theme: "light", from: 7, to: 8 }]);
  expect(s).toContain("진한 텍스트");
});

it("빈 배열은 빈 문자열이다", () => {
  expect(summarizeShifts([])).toBe("");
});
```

- [ ] **Step 2: 실패 확인 → Step 3: 구현**

Run: `cd web && pnpm test shiftSummary` → FAIL

`roleLabel`(Task 5)과 `STOP_KEYS`를 조합한다. 라이트/다크가 같은 역할에 다 있으면 한 번만 말한다.

- [ ] **Step 4: `PreviewPane`에 배선**

`onApplyShifts` 직후 요약을 상태로 들고 한 줄로 낸다. `aria-live`로 통지하고, Task 6의 강조 장치로 이동한 역할의 목업 요소를 잠깐 짚는다.

- [ ] **Step 5: 통과 확인 + 커밋**

```bash
git commit -m "feat(color-palette): 한 번에 고치기가 무엇을 바꿨는지 말한다 (D5)

역할 → stop 매핑을 조용히 다시 쓰고 있었다. 산출물이 디자인 시스템 명세인
도구가 그것을 말없이 바꾸는 것은 감당할 수 없는 침묵이다.

RoleShift.from은 URL에 저장되지 않으므로(엔진 주석: 옛 링크가 옛 기본값을
실어 오면 안 된다) 이 요약은 적용 직후에만 존재한다 — 새로고침 후 사라지는
것이 맞다. 알려진 한계 6으로 기록돼 있다."
```

---

### Task 8: 최소 모션과 `prefers-reduced-motion` (D9)

**Files:**
- Modify: `web/src/global.css` 또는 해당 컴포넌트들
- Test: `web/src/color-palette/motion.test.tsx` (신규)

**Interfaces:**
- Consumes: Task 6·7의 강조 전이
- Produces: 없음

**배경 — 이 레포 최초의 `prefers-reduced-motion`이다**(전 화면 grep 0건). 도입하면서 경계를 못 박는다.

- [ ] **Step 1: 경계를 테스트로 고정한다**

```tsx
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// ⚠️ 이것은 동작 테스트가 아니다 — 의도적으로 소스 텍스트를 단언한다.
// jsdom은 @media (prefers-reduced-motion)을 평가하지 않아 진짜 동작 검증이
// 불가능하고, 실제 동작 확인은 Step 4의 브라우저 실측이 맡는다.
//
// 이 테스트의 일은 하나뿐이다: **기록된 판단의 회귀 가드.** 스펙 D9가
// "끄는 것은 트윈이지 변위가 아니다"를 못 박았는데, 나중에 누가 선의로
// `transform: none`을 추가하면 3.1 D3 / 3.2 D4가 세운 press 착지 어포던스
// ("이동 2px = 깊이 2px, 칩이 그림자가 있던 자리에 정확히 내려앉는다")가
// 조용히 죽는다. 그 회귀를 잡는 것이 이 단언의 존재 이유다.
// (2026-08-30 사람 판단으로 유지 결정 — 취약한 테스트라는 지적은 맞지만
//  가드로서의 값이 그 비용보다 크다고 봤다.)
describe("reduced-motion 경계 (스펙 D9)", () => {
  const cssPath = fileURLToPath(new URL("../global.css", import.meta.url));

  it("reduced-motion 블록이 존재한다", () => {
    expect(readFileSync(cssPath, "utf8")).toMatch(/prefers-reduced-motion/);
  });

  it("변위를 끄지 않는다", () => {
    const block = readFileSync(cssPath, "utf8")
      .split("prefers-reduced-motion")[1] ?? "";
    expect(block).not.toMatch(/transform:\s*none/);
    expect(block).not.toMatch(/transition:\s*none/);
  });
});
```

- [ ] **Step 2: 실패 확인 → Step 3: 구현**

`global.css`에 블록을 추가하고 **주석으로 경계를 남긴다**:

```css
/* 이 레포 최초의 reduced-motion 블록이다. 끄는 것은 **트윈이지 변위가 아니다** —
   AdjustableScale의 press 착지는 transform으로 어포던스를 만들고, 그것을 끄면
   3.1 D3 / 3.2 D4가 세운 "칩이 그림자가 있던 자리에 정확히 내려앉는다"가
   사라진다. 최종 상태는 그대로 두고 전이 시간만 없앤다 (스펙 D9). */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 4: 통과 확인 + 브라우저 확인**

chrome-devtools `emulate`로 reduced-motion을 켜고, 스와치를 눌렀을 때 **여전히 2px 내려앉는지** 확인한다 (전이만 없고 변위는 남아야 한다).

- [ ] **Step 5: 커밋**

```bash
git commit -m "feat(web): prefers-reduced-motion 도입 — 트윈만 끈다 (D9)

이 레포 최초의 reduced-motion 블록이다. 3.3 비-목표 '모션 추가'의 부분 개정:
장식 모션은 여전히 안 넣고 상태를 전달하는 것(D3 강조, D5 이동)만 연다.

경계를 못 박았다 — 끄는 것은 트윈이지 변위가 아니다. transform을 통째로 끄면
3.1 D3 / 3.2 D4가 세운 press 착지 어포던스가 사라진다."
```

---

### Task 9: 후보 팝오버 — 현재 선택과 겹침 사유 (D7)

**Files:**
- Create: `web/src/color-palette/candidateMatch.ts` · `candidateMatch.test.ts`
- Modify: `web/src/color-palette/CandidatePopover.tsx` · `web/src/components/Popover.tsx`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `isCurrent(candidateHex: string, currentHex: string): boolean` — 채널당 허용치를 둔 근사 일치
  - `dedupeByHex`가 `{ items, collapsed }`를 돌려준다 (`collapsed` = 지워진 개수)

**배경 둘.**

1. **`checked`가 0개다.** `checked={current === hex}`이고 `current`는 `state.pins[stopIndex]`라, pin이 없으면 `undefined`다. 실측: stop 700에서 0/3.
   **"곡선 기본값을 새 첫 후보로 승격"은 하지 않는다 — 전제가 틀렸다.** 곡선 기본값은 24조합(액센트 6 × stop 4) 중 **22에서 이미 후보 중 하나**이고, stop 950에는 이미 `"기본"`이라는 이름의 후보가 있다. 승격하면 같은 색 라디오가 둘이 되거나 `dedupeByHex`가 하나를 지운다.
   **처방은 `checked` 기준을 `pin ?? 곡선 기본값`으로 바꾸는 것.** 단 **정확 비교로는 안 된다** — 남은 2조합이 웜톤 stop 950(`#f5d90a`, `#f97316`)이고 어긋남이 **hex 마지막 자리 1**이다(`#2f2800` vs `#2f2900`). 950의 `"기본"` 후보가 `ref`를 그대로 쓰지 않고 고정 L(0.278)에서 색을 다시 만들어 생기는 왕복 오차다. 정확 일치로 구현하면 그 둘에서 **체크 0개가 그대로 남는다.**
2. **겹침 사유를 버리고 있다.** 엔진이 note에 붙여준다 — *"이 앵커에서는 클램프로 후보 폭이 좁아 다른 후보와 겹칩니다"*. 다만 엔진의 겹침 판정은 oklch 키, 화면의 `dedupeByHex`는 hex다. **문구는 `dedupeByHex` 쪽에서 만든다** — 거기가 몇 개를 지웠는지 아는 유일한 자리다.

- [ ] **Step 1: 근사 일치의 실패하는 테스트를 쓴다**

```ts
import { describe, expect, it } from "vitest";
import { isCurrent } from "./candidateMatch";

describe("isCurrent (스펙 D7-1)", () => {
  it("같은 색은 참이다", () => {
    expect(isCurrent("#2f2900", "#2f2900")).toBe(true);
  });

  it("왕복 오차(채널당 1)를 견딘다", () => {
    // 웜톤 stop 950의 "기본" 후보는 ref를 그대로 쓰지 않고 고정 L(0.278)에서
    // 색을 다시 만들어, 곡선 기본값과 hex 마지막 자리가 1 어긋난다
    // (#2f2800 vs #2f2900 — 실측 24조합 중 2건). 정확 비교로 구현하면
    // 이 둘에서 체크 0개가 그대로 남아 고치려던 버그가 살아남는다.
    expect(isCurrent("#2f2900", "#2f2800")).toBe(true);
  });

  it("인접 후보끼리는 구별한다", () => {
    // 허용치는 왕복 오차보다 크고 인접 후보 간 거리보다 작아야 한다.
    // stop 950의 "기본"(#2f2900)과 "더 깊게"(#201b00)는 확실히 달라야 한다.
    expect(isCurrent("#2f2900", "#201b00")).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인 → Step 3: 구현**

Run: `cd web && pnpm test candidateMatch` → FAIL

```ts
/** 채널당 허용 오차. 왕복 오차(실측 최대 1)보다 크고, 인접 후보 간 거리
 *  (실측 최소 15 이상)보다 훨씬 작다 — 이 창 안에 다른 후보가 들어올 수 없다. */
const TOLERANCE = 2;
```

- [ ] **Step 4: `CandidatePopover`에 배선한다**

- 곡선 기본값 = 이 stop을 뺀 문맥 pin으로 `fillScale`한 결과의 `stopIndex` 자리. `previewScale`이 이미 같은 계산을 하므로 그 구조를 재사용한다.
- `checked={isCurrent(cd.hex, current ?? curveDefaultHex)}`
- `dedupeByHex`가 `collapsed`를 함께 돌려주고, `collapsed > 0`이면 목록 아래에 한 줄:
  `이 앵커에서는 클램프로 후보 폭이 좁아 선택지가 겹칩니다`

  **주석에 개정을 남긴다** — 이 문장이 기존 선언을 뒤집는다:

```tsx
// 2026-08-30 판단 변경: 이 자리 주석은 "'고를 게 없다'는 사실 자체가 정보라
// 별도 문구는 붙이지 않는다(사이클 3 D9)"였다. 사이클 3 D9의 부분 개정으로
// 경계선을 다시 그었다 — "왜 이 색이 좋은가"(학습)는 계속 안 싣고,
// "왜 고를 게 없나"(조작 사실)는 싣는다. 실제로 stop 300에서 라디오 1개만
// 남는 화면은 정보가 아니라 고장으로 읽혔다. 후보의 note(교보재 카피)는
// 여전히 안 싣는다 — 그건 #builder의 몫이다.
```

- [ ] **Step 5: 패널 폭을 경계에 묶는다**

`clampOffset`은 **패널이 경계보다 넓으면 clamp를 포기한다** — 그러면 패널이 sticky 목업을 덮는데 그걸 막는 것이 그 함수의 존재 이유다. 사유 문구로 패널이 넓어지므로 `Popover`의 `w-max`에 **경계 폭 기반 상한**을 건다 (고정 px 금지 — 320px 화면에서 띠는 ~272px이다).

- [ ] **Step 6: 테스트를 추가·확인한다**

```tsx
it("pin이 없어도 현재 적용 중인 후보가 체크된다", () => {
  render(<ColorPalettePage />);
  fireEvent.click(screen.getAllByTestId("swatch")[2]); // stop 700
  const checked = screen.getAllByRole("radio").filter((r) => (r as HTMLInputElement).checked);
  expect(checked.length).toBe(1);
});
```

**기존 `getAllByRole("radio")` 개수 단언은 깨지지 않는다** — 라디오를 추가하지 않기 때문이다.

- [ ] **Step 7: 통과 확인 + 커밋**

Run: `cd web && pnpm test && npx tsc -b`

```bash
git commit -m "fix(color-palette): 후보 팝오버가 현재 색과 겹침 사유를 말한다 (D7)

열 때 체크된 라디오가 0개였다 — checked가 pin만 보는데 pin이 없으면
undefined다. 곡선 기본값은 24조합 중 22에서 이미 후보 중 하나이므로(950엔
'기본'이라는 후보가 이미 있다) 새 옵션으로 승격하지 않고 checked 기준을
'pin ?? 곡선 기본값'으로 바꾼다.

정확 비교로는 안 된다 — 나머지 2조합(웜톤 950)이 왕복 오차로 hex가 1 어긋나
그대로면 체크 0개가 살아남는다. 채널당 허용치 2를 둔 근사 일치로 판정한다.

후보가 겹쳐 하나만 남을 때 사유를 표시한다. 사이클 3 D9의 부분 개정 —
'왜 이 색이 좋은가'(학습)는 계속 안 싣고 '왜 고를 게 없나'(조작 사실)만
싣는다. 후보 note는 여전히 #builder의 몫이다."
```

---

### Task 10: pin 소멸 알림과 복원 (D6)

**Files:**
- Modify: `web/src/color-palette/ColorPalettePage.tsx`
- Test: `web/src/color-palette/ColorPalettePage.test.tsx`

**Interfaces:**
- Consumes: Task 9의 `isCurrent` (복원 후 팝오버 상태 처리)
- Produces: 없음

**배경.** stop 700 pin(`?…&s7=…`) 상태에서 H를 259.8 → 262(hue 스트립 드래그 **1픽셀** 수준)로 바꾸면 pin이 사라진다. `replaceState`라 뒤로가기로도 못 살린다. hue 스트립은 `pointermove`마다 커밋하므로 **드래그 첫 픽셀**에 날아간다.

**폐기 자체는 유지한다** — `paletteState`의 근거(hue 보간으로 중간이 섞이고, 그 pin은 어떤 후보와도 일치하지 않으면서 값은 계속 적용된다)가 여전히 유효하다. **복원만 부분 개정**이고, 자동이 아니라 **사용자가 명시적으로 누른 경우에만**이다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```tsx
it("액센트 변경으로 pin이 사라지면 알리고 되돌릴 수 있다", () => {
  render(<ColorPalettePage />);
  fireEvent.click(screen.getAllByTestId("swatch")[2]);
  fireEvent.click(screen.getAllByRole("radio")[2]);          // stop 700 pin
  const pinned = screen.getAllByTestId("swatch")[2].getAttribute("aria-label");

  fireEvent.change(screen.getByLabelText("색상"), { target: { value: "262" } });

  // 드래그 첫 픽셀에 조용히 사라지던 자리다. replaceState라 뒤로가기로도
  // 못 살리므로 화면이 유일한 복구 경로다.
  expect(screen.getByText(/되돌렸습니다/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "복원" }));
  expect(screen.getAllByTestId("swatch")[2].getAttribute("aria-label")).toBe(pinned);
});

it("pin이 없었으면 알림이 안 뜬다", () => {
  render(<ColorPalettePage />);
  fireEvent.change(screen.getByLabelText("색상"), { target: { value: "262" } });
  // 전이(있다 → 없다)에서만 뜬다. pointermove마다 뜨면 드래그 내내 깜빡인다.
  expect(screen.queryByText(/되돌렸습니다/)).toBeNull();
});
```

- [ ] **Step 2: 실패 확인 → Step 3: 구현**

`ColorPalettePage`에서 `withAccent`를 부르는 자리를 감싼다:

```tsx
// 되돌리기 버퍼는 페이지 로컬이다 — PaletteState·paletteUrl에 넣을 수 없다
// (이번 사이클 비-목표: 상태 계약 불변). 그래서 새로고침하면 사라진다.
// 근본 해법(pin을 절대 hex 대신 선택 정체성으로 저장)은 다음 사이클이다.
const droppedPins = useRef<PaletteState["pins"] | null>(null);

const onAccentChange = (accentHex: string) =>
  setState((s) => {
    const had = ADJUSTABLE_STOPS.some((i) => s.pins[i] !== undefined);
    // 전이에서만 기록한다 — hue 스트립은 pointermove마다 커밋하므로,
    // 매 커밋마다 기록하면 드래그 두 번째 픽셀에서 버퍼가 빈 pins로 덮인다.
    if (had) droppedPins.current = s.pins;
    return withAccent(s, accentHex);
  });
```

알림은 **② 팔레트의 액센트 띠 바로 위, 한 줄 상한**. `main` 컬럼이라 세로 예산에 걸린다.

- [ ] **Step 4: D7과의 충돌을 처리한다**

복원된 pin은 새 액센트의 후보 어디에도 없다 → 그 stop의 팝오버를 열면 체크가 0개가 되어 Task 9가 고친 결함이 이 경로에서만 되살아난다. `isCurrent`의 근사 일치로도 못 메운다(색이 실제로 다르다).

**처방:** 복원된 pin이 어떤 후보와도 일치하지 않으면 목록 위에 한 줄 — `복원된 색 — 지금 앵커의 후보에는 없습니다`. 조작 사실이므로 D9 경계선을 통과한다.

- [ ] **Step 5: 통과 확인 + 커밋**

```bash
git commit -m "fix(color-palette): pin 소멸을 알리고 되돌릴 수 있게 한다 (D6)

hue 2°(드래그 첫 픽셀 수준)에 조정한 pin 넷이 조용히 사라지고, replaceState라
뒤로가기로도 못 살렸다. 폐기 자체는 유지한다 — paletteState의 근거(hue 보간으로
중간이 섞이고, 그 pin은 어떤 후보와도 일치하지 않으면서 값은 계속 적용된다)가
여전히 유효하다.

사이클 3 D6의 부분 개정: 자동 복원은 없고 사용자가 명시적으로 누른 경우에만
되돌린다. 그 시점에는 원안이 걱정한 '사용자가 원인을 알 수 없다'가 해소돼 있다.

버퍼는 페이지 로컬 ref다 — 상태 계약을 못 건드려 새로고침하면 사라진다
(알려진 한계 3). 근본 해법은 다음 사이클."
```

---

### Task 11: lg 세로 예산 재실측과 마무리

**Files:**
- Modify: 실측 결과에 따라
- Modify: `docs/superpowers/specs/2026-08-30-color-palette-ux-repair-design.md` (실측 기록 추가)

**Interfaces:**
- Consumes: Task 1~10 전부

**배경.** 3.3은 `download-card bottom` **887.36px / 900**, 여유 **12.64px**로 끝냈다 — 사람이 승인한 네 번째 나사까지 써서. Task 10의 알림이 `main` 컬럼에 들어가고 Task 5가 헤드라인을 더하므로, 3.3이 밟은 함정("라벨 추가는 aside 쪽이라 예산에 안 걸린다"가 틀렸던 자리)과 **같은 자리**다.

- [ ] **Step 1: 성공 기준 셋을 실측한다**

dev 서버를 띄우고 `emulate` viewport `1440x900x1`, **`innerWidth`/`innerHeight` 확인 후**:

```js
({ innerH: innerHeight,
   cardBottom: document.querySelector('[data-testid=download-card]').getBoundingClientRect().bottom,
   mainBottom: document.querySelector('main').getBoundingClientRect().bottom })
```

Expected: `cardBottom < 900` (성공 기준 3).

그리고 320 · 360 · 390 · 768에서 `scrollWidth === innerWidth` 재확인 (성공 기준 1).

- [ ] **Step 2: 넘쳤으면 — 나사를 임의로 만들지 않는다**

3.3 D3이 세운 규칙이다: 세로 예산을 못 맞추면 **멈추고 사람에게 묻는다.** 넷째 나사를 임의로 만들지 않는다. 초과분과 그 정체(어느 태스크가 몇 px을 더했는지)를 측정해 보고한다.

- [ ] **Step 3: 실측을 스펙에 기록한다**

3.3이 Task 7 실측을 스펙에 남긴 형식을 따른다 — 시작점, 각 항목이 더한 px, 최종값, 그리고 어림과 실측이 어긋났으면 그 정체.

- [ ] **Step 4: 전체 회귀**

```bash
cd web && pnpm test && npx tsc -b
cd .. && pnpm test
```

- [ ] **Step 5: 커밋**

```bash
git commit -m "docs(color-palette): lg 세로 예산 재실측 기록

3.3이 12.64px 여유로 끝낸 자리에 D4 헤드라인과 D6 알림이 들어갔다.
어림이 아니라 실측으로 확인한 값을 스펙에 남긴다."
```

---

## Self-Review

**1. 스펙 커버리지**

| 스펙 결정 | 태스크 |
| --- | --- |
| D1 그리드 평탄화·반응형 | Task 2 |
| D2 대비 하한 | Task 1 |
| D3 경고↔목업 강조 | Task 6 |
| D4 경고 위계 | Task 5 |
| D5 이동 요약 | Task 7 |
| D6 pin 알림·복원 | Task 10 |
| D7 후보 팝오버 | Task 9 |
| D8 복사 피드백 | Task 4 |
| D9 모션·reduced-motion | Task 8 |
| D10 피커 ARIA | Task 3 |
| 성공 기준 1(320px) | Task 2 Step 7, Task 11 Step 1 |
| 성공 기준 2(4.5:1) | Task 1 Step 6 |
| 성공 기준 3(lg 900px) | Task 11 Step 1 |
| 성공 기준 4~6 | Task 5 · 10 · 9 |
| 사이클 3 D9 선언 자리 개정 | Task 9 Step 4 (`dedupeByHex` 주석) |

**2. 플레이스홀더 스캔** — Task 6 Step 6과 Task 11 Step 2·3은 의도적으로 결과 의존이다. 전자는 "노란 액센트 상태를 만든다"까지 지정했고, 후자는 **넘쳤을 때 사람에게 묻는다**는 3.3의 규칙 자체가 내용이다. 그 외 코드 스텝에는 실제 코드가 들어 있다.

**3. 타입 일관성** — `triageChecks`/`roleLabel`(Task 5) → Task 6·7이 소비. `mockTargetFor`/`MockTarget`(Task 6) → Task 7이 소비. `isCurrent`(Task 9) → Task 10이 소비. 이름이 태스크 간에 어긋나지 않는다.

**4. 순서 의존** — Task 1~4는 서로 독립이라 순서를 바꿔도 된다. Task 5 → 6 → 7 → 8은 사슬이다. Task 9 → 10도 사슬이다. Task 11은 마지막.
