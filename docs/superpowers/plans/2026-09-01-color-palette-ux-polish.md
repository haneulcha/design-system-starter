# /color-palette UX 다듬기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/color-palette`에서 크롬 텍스트(시각 h2 셋 · "액센트" 라벨 · 색조/강도 라벨 2행)를 걷어 그 일을 간격 위계가 지게 하고, 피커 조작 중 accent-500을 짚고, 목업이 상태색 4종을 그리게 한다.

**Architecture:** 순수 UI 사이클이다. 판단(무엇을 강조할지, 어떤 역할이 어떤 요소를 가리키는지)은 순수 함수·부모 상태에 두고 컴포넌트는 그리기만 한다. 500 강조의 켜짐/꺼짐은 "끝 이벤트"가 아니라 **데드라인 타이머**로 판정한다 — 갱신만 있고 종료 이벤트가 없어 구조적으로 고착이 불가능하다.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind v4 (`@utility ds-type-*` / `--ds-*` 토큰), Vitest + @testing-library/react (jsdom), chrome-devtools MCP(실측).

## Global Constraints

- **스펙:** `docs/superpowers/specs/2026-09-01-color-palette-ux-polish-design.md`. 이 계획의 `D<n>`은 전부 그 문서의 것이다.
- **엔진 불변.** `src/color/` · `src/export/` · `web/src/color-palette/paletteState.ts` · `web/src/color-palette/paletteUrl.ts`를 **한 줄도 안 고친다** (CLAUDE.md 하드 규칙).
- **`OklchPicker` 내부 불변.** `web/src/components/OklchPicker.tsx`를 안 고친다. D3은 `AccentInput`이 피커를 감싸는 자리에서만 일한다.
- **불변 파일:** `layout.test.tsx` · `motion.test.tsx` · `CandidatePopover.tsx` · `DownloadRow.tsx` · `AdjustableScale`의 `BAR_STOPS`/`BAR_HEIGHTS`(`PreviewPane.tsx` 안).
- **주석은 한국어로 *왜*를 쓴다.** *무엇*은 코드가 말한다.
- **뒤집는 판단은 뒤집는다는 사실과 경계를 적고, 옛 판단이 선언된 자리(주석 포함)도 같이 고친다.**
- **간격 값 셋만 쓴다:** `--ds-space-sm`(12) = 입력과 그 결과 / `--ds-space-md`(16) = 이웃 블록 / `--ds-space-xl`(32) = 다른 덩어리.
- **테스트 명령:** `cd web && pnpm test` (전체), `cd web && pnpm test -- <파일>` (단일), `cd web && npx tsc -b` (타입체크 — vitest는 타입체크를 안 한다).
- **`pnpm install`을 `web/`에서 돌리지 않는다.** `web/`은 워크스페이스 멤버가 아니고 `npm ci`를 쓴다.
- 커밋 메시지 끝에: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

## 파일 구조

| 파일 | 책임 | 태스크 |
| --- | --- | --- |
| `web/src/color-palette/ColorPalettePage.tsx` | 페이지 골격·간격 위계·상태 소유(500 강조 데드라인 포함) | 1, 2, 4 |
| `web/src/color-palette/NeutralControl.tsx` | 색조·강도 칩 렌더 | 2 |
| `web/src/color-palette/AdjustableScale.tsx` | 11-stop 띠 렌더 — `emphasis`를 **받아 그리기만** | 3 |
| `web/src/color-palette/AccentInput.tsx` | 피커 래핑 + 세대(`sessionGen`) + 활동 신호 | 4 |
| `web/src/color-palette/mockTargets.ts` | 경고(scaleName·roleId) → 목업 요소 **순수 매핑** | 5 |
| `web/src/color-palette/PreviewPane.tsx` | 목업 렌더 · 대비 뱃지 | 5 |

테스트는 각 대응 `*.test.tsx`/`*.test.ts`에 붙인다. 새 파일은 만들지 않는다 — 이 사이클의 변경은 전부 기존 책임 안에 들어간다.

**태스크 순서 근거.** 1→2는 main 컬럼(세로를 **버는** 쪽), 3→4는 500 강조(렌더 먼저, 배선 나중), 5는 목업(안에서 순수 매핑 → 렌더). 6이 실측으로 닫는다.

매핑과 렌더가 한 태스크인 이유는 Task 5 머리말에 있다 — 둘을 가르면 중간 커밋의 스위트가 빨갛고, 되살릴 방법이 그 시점에 없다.

---

## Task 1: 스테이지 제목을 걷고 간격 위계를 세운다 (D1)

**Files:**
- Modify: `web/src/color-palette/ColorPalettePage.tsx`
- Test: `web/src/color-palette/ColorPalettePage.test.tsx` (`"3단 스테이지 골격"` describe)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: `main` 요소의 `style.rowGap === "var(--ds-space-sm)"`. `data-testid="palette-section"`(② 섹션), `data-testid="download-section"`(③ 섹션) — Task 6 실측이 쓴다.

- [ ] **Step 1: 기존 스위트를 새 단언으로 갈아끼운다 (실패하는 테스트)**

`ColorPalettePage.test.tsx`의 `describe("3단 스테이지 골격", ...)` 안에서 `it("h1 하나에 h2 셋이 ①②③ 순서로 있다", ...)` **하나만** 아래로 교체한다. 같은 describe의 `it("상태색이 details 없이 첫 화면에 있다", ...)`는 건드리지 않는다.

```tsx
  // 3.3 D3의 "번호 붙은 스테이지 제목"을 뒤집는다 — 걷는 것은 **시각 노출과
  // 번호**뿐이고 h2 셋의 존재·순서는 유지한다(스펙 D1). 이 화면은 나가는
  // 링크가 0인 막다른 골목이라(직전 스펙 비-목표) 구조 신호를 더 잃으면
  // 스크린리더에 평면만 남는다. 순서가 곧 사용 순서라는 3.3 D3의 주장은
  // 제목이 아니라 간격 위계(아래 테스트)가 계속 진다.
  it("h1은 생성기이고, h2 셋은 sr-only로 남는다", () => {
    render(<ColorPalettePage />);
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1.length).toBe(1);
    expect(h1[0].textContent).toBe("컬러 팔레트 생성기");

    const h2 = screen.getAllByRole("heading", { level: 2 });
    expect(h2.length).toBe(3);
    // 번호(①②③)는 시각에서 사라지므로 sr-only 문구에서도 뗀다 — 스크린리더
    // 사용자만 "①"을 듣는 비대칭을 만들지 않는다.
    expect(h2.map((h) => h.textContent)).toEqual([
      "앵커 정하기",
      "만들어진 팔레트",
      "받기",
    ]);
    for (const h of h2) expect(h.className).toContain("sr-only");
  });

  // "액센트"만 걷고 "뉴트럴"·"상태색"은 남긴다 — 첫 띠가 액센트라는 것은
  // 위(피커 카드)와 아래(뉴트럴 라벨)로 결정되지만, 뒤의 둘은 위치만으로
  // 안 갈린다(스펙 D1).
  //
  // > **정정 — 이 판단은 최종 리뷰에서 뒤집혔다.** 위치로 첫 띠를 판별한다는
  // > 근거는 화면에는 맞지만 스크린리더에는 위치가 없다. 현재 코드는 "액센트"
  // > 라벨을 `queryByText`가 못 찾게 지우지 않고 `sr-only`로 낮춰 DOM에는
  // > 남긴다 — 이 테스트 이름과 단언(`queryByText("액센트")).toBeNull()`)은
  // > 계획 당시 판단의 기록이고 HEAD의 실제 테스트가 아니다. 최종 형태는
  // > 스펙 "뒤집는 판단" 절과 `ColorPalettePage.test.tsx`의
  // > `"액센트 라벨은 sr-only이고 뉴트럴·상태색 라벨은 시각에 남는다"`를 본다.
  it("액센트 라벨은 없고 뉴트럴·상태색 라벨은 남는다", () => {
    render(<ColorPalettePage />);
    expect(screen.queryByText("액센트")).toBeNull();
    expect(screen.getByText("뉴트럴")).toBeTruthy();
    expect(screen.getByText("상태색")).toBeTruthy();
  });

  // 걷어낸 제목이 지던 "여기부터 다른 단계"를 간격이 진다. 값 셋만 쓴다:
  // 12 = 입력과 그 결과 / 16 = 이웃 블록 / 32 = 다른 덩어리 (스펙 D1).
  // main의 기본 rowGap을 **가장 좁은 값**으로 두고 넓히는 자리만 명시적으로
  // 올린다 — 넓은 기본값에 좁히는 예외를 다는 것보다 어긋날 자리가 적다.
  it("간격 위계가 12/16/32다 (스펙 D1)", () => {
    render(<ColorPalettePage />);
    const main = screen.getByRole("main") as HTMLElement;
    expect(main.style.rowGap).toBe("var(--ds-space-sm)");
    expect(main.style.columnGap).toBe("var(--ds-space-xl)");
    // h1 → 피커 카드는 "다른 덩어리"라 좁은 기본값을 덮는다.
    expect((screen.getAllByRole("heading", { level: 1 })[0] as HTMLElement).style.marginBottom)
      .toBe("var(--ds-space-md)");
    // ② 안: 액센트 띠 ↔ 뉴트럴 블록 = 다른 덩어리.
    expect((screen.getByTestId("palette-section") as HTMLElement).style.gap)
      .toBe("var(--ds-space-xl)");
    // ② → ③ 받기도 다른 덩어리 — main의 12에 20을 더해 32를 만든다.
    expect((screen.getByTestId("download-section") as HTMLElement).style.marginTop)
      .toBe("var(--ds-space-xs)");
  });
```

> **왜 32가 아닌가.** `marginBottom: md(16)` + main `rowGap: sm(12)` = 28, `marginTop: xs(8)` + `rowGap: sm(12)` = 20. `rowGap`이 12로 고정이라 `xl`(32)을 더하면 44가 되어 토큰 밖 값을 만들지 않고는 정확히 32를 낼 수 없다. 두 자리 다 "다른 덩어리"이지만 각각 자체 경계(h1의 크기, 받기 카드의 테두리)가 있어 28·20으로도 그 뜻이 선다. **위 숫자를 그대로 쓴다** — Task 6 실측에서 폴드가 안 맞으면 그때 조정하고 테스트도 같이 고친다.

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && pnpm test -- ColorPalettePage.test.tsx`
Expected: FAIL — `h1` 텍스트가 `"컬러 팔레트"`, h2 텍스트가 `"① 앵커 정하기"`, `className`에 `sr-only` 없음, `main.style.rowGap`이 `"var(--ds-space-lg)"`, `getByTestId("palette-section")`이 없음.

- [ ] **Step 3: `ColorPalettePage.tsx`를 고친다**

`main`의 `style`:

```tsx
      style={{
        padding: "var(--ds-space-lg)",
        // 걷어낸 스테이지 제목이 지던 "여기부터 다른 단계"를 간격이 진다
        // (스펙 D1). 값은 셋뿐이다 — 12 = 입력과 그 결과 / 16 = 이웃 블록 /
        // 32 = 다른 덩어리. rowGap을 **가장 좁은 12**로 두고 넓히는 자리만
        // 명시적으로 올린다: 넓은 기본값에 좁히는 예외를 다는 것보다 어긋날
        // 자리가 적다. 12가 여기 서는 이유는 이 그리드의 유일한 "좁은" 경계가
        // ① 피커 카드 → ② 액센트 띠(입력과 그 결과)이기 때문이다.
        rowGap: "var(--ds-space-sm)",
        // columnGap 32는 직전 스펙 D1의 분리를 그대로 잇는다 — row와 하나로
        // 합치면 스테이지 사이가 벌어져 세로 예산을 그 자리에서 넘긴다.
        columnGap: "var(--ds-space-xl)",
      }}
```

`h1`:

```tsx
      {/* "컬러 팔레트"가 아니라 "생성기"다 — 이 화면은 팔레트가 아니라
          팔레트를 만드는 도구다. 값(heading.sm 24)은 3.3 D5 그대로 두되,
          그 근거 중 하나("16으로 내리면 스테이지 제목과 같아진다")는 시각
          스테이지 제목이 사라지며 소멸했다(스펙 D1). 남은 근거는 "페이지에
          하나뿐인 최상위 제목"뿐이다.
          marginBottom 16 + main rowGap 12 = 28 ≈ "다른 덩어리". 32에 4 모자란
          것은 rowGap이 12로 고정이라 xl(32)을 더하면 44가 되기 때문이다 —
          토큰 밖 값을 만들지 않고 16을 택했다. */}
      <h1
        className="ds-type-heading-sm lg:col-span-2"
        style={{ marginBottom: "var(--ds-space-md)" }}
      >
        컬러 팔레트 생성기
      </h1>
```

① 섹션 — h2를 `sr-only`로, `gap` 제거(자식이 하나뿐이라 gap이 할 일이 없다):

```tsx
      <section className="lg:col-start-1">
        <h2 className="sr-only">앵커 정하기</h2>
        <AccentInput hex={state.accentHex} onChange={onAccentChange} />
      </section>
```

② 섹션 — `data-testid`와 `gap: xl` 추가, h2를 `sr-only`로:

```tsx
      <section
        data-testid="palette-section"
        className="lg:col-start-1"
        style={{ display: "grid", gap: "var(--ds-space-xl)" }}
      >
        <h2 className="sr-only">만들어진 팔레트</h2>
```

> ⚠️ `gap: xl`은 `sr-only` h2와 첫 자식 사이에도 걸린다. `sr-only`는
> `position: absolute`라 grid 아이템에서 제외되어 **행을 안 먹는다** — 직전
> 스펙이 pin 라이브 리전에서 실측으로 확인한 것과 같은 성질이다(915 → 911).
> 이 주석을 코드에 남긴다.

② 안의 액센트 그룹 — `액센트` 라벨 `<div>`를 지운다. pin 배너·라이브 리전·`AdjustableScale`은 그대로 두고, 감싸는 `<div>`의 `gap`은 `--ds-space-xxs` 유지(배너와 띠는 같은 것에 대한 두 줄이다).

> **정정 — 이 지시는 최종 리뷰에서 뒤집혔다.** "지운다"는 계획 당시 판단이고
> 실행되지 않았다. 위치("바로 위가 피커 카드, 바로 아래가 뉴트럴 라벨")로
> 첫 띠를 가른다는 근거는 화면에는 맞지만 스크린리더에는 위치가 없다 — 그
> 근거로 DOM에서 완전히 지우면 이 화면에서 유일하게 이름 없는 띠가 하필
> 액센트가 된다. 최종 형태는 `<div>`를 지우지 않고 `sr-only`로 낮춘다.
> 자세한 내용은 스펙 "뒤집는 판단" 절과 `AdjustableScale.tsx`의 관련 주석을
> 본다.

② 안의 뉴트럴 그룹 — Task 2가 순서를 바꾸므로 여기서는 `뉴트럴` 라벨과 띠만 그대로 두고 `gap`을 `--ds-space-sm`으로 바꾼다(입력→결과 12).

③ 섹션:

```tsx
      {/* marginTop 8 + main rowGap 12 = 20. ②의 상태색 띠와 받기 카드 사이는
          "다른 덩어리"지만, 받기 카드는 자체 테두리가 있어 경계를 스스로
          만든다 — 32까지 벌리면 lg에서 카드가 폴드 아래로 밀린다(Task 6
          실측으로 확정). */}
      <section
        data-testid="download-section"
        className="lg:col-start-1"
        style={{ marginTop: "var(--ds-space-xs)" }}
      >
        <h2 className="sr-only">받기</h2>
        <DownloadRow scales={scales} roles={roles} />
      </section>
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `cd web && pnpm test -- ColorPalettePage.test.tsx layout.test.tsx`
Expected: PASS. `layout.test.tsx`는 `section` 셋과 `main`/`complementary`만 보므로 그대로 통과해야 한다 — **실패하면 골격을 잘못 건드린 것이다.**

- [ ] **Step 5: 타입체크**

Run: `cd web && npx tsc -b`
Expected: 오류 없음.

- [ ] **Step 6: 커밋**

```bash
git add web/src/color-palette/ColorPalettePage.tsx web/src/color-palette/ColorPalettePage.test.tsx
git commit -m "$(cat <<'EOF'
feat(color-palette): 스테이지 제목을 걷고 간격 위계가 순서를 진다 (D1)

3.3 D3의 "번호 붙은 스테이지 제목"을 뒤집는다 — 걷는 것은 시각 노출과
번호뿐이고 h2 셋의 존재·순서는 sr-only로 유지한다. 이 화면은 나가는
링크가 0인 막다른 골목이라 구조 신호를 더 잃으면 안 된다.

그 자리를 값 셋짜리 간격 위계가 진다: 12 = 입력과 그 결과 /
16 = 이웃 블록 / 32 = 다른 덩어리. main rowGap을 가장 좁은 12로 두고
넓히는 자리만 명시적으로 올린다.

h1은 "컬러 팔레트 생성기"로. 3.3 D5가 h1=24를 정할 때 쓴 근거 하나
("16으로 내리면 스테이지 제목과 같아진다")는 소멸했고, 값은 유지한다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 뉴트럴도 `입력 → 결과` 순서로, 라벨은 칩과 나란히 (D2)

**Files:**
- Modify: `web/src/color-palette/NeutralControl.tsx`
- Modify: `web/src/color-palette/ColorPalettePage.tsx` (뉴트럴 그룹의 자식 순서 + `data-testid`)
- Test: `web/src/color-palette/ColorPalettePage.test.tsx`

**Interfaces:**
- Consumes: Task 1의 ② 섹션 구조
- Produces: `data-testid="neutral-section"` — 뉴트럴 컨트롤과 띠를 함께 감싸는 `<div>`. `NeutralControl`의 props(`state`, `onChange`)와 `role="group"` 이름("뉴트럴 색조", "강도")은 **불변**이다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`ColorPalettePage.test.tsx`의 `describe("뉴트럴 …")` 계열 근처(기존 `it("뉴트럴 색조/강도가 aria-pressed와 그룹 라벨을 갖는다", ...)` 바로 아래)에 더한다.

```tsx
  // 액센트는 피커(위) → 띠(아래)인데 뉴트럴만 반대였다 — 같은 화면에서 같은
  // 관계가 두 방향으로 그려졌다. 둘 다 "입력 → 결과"로 맞춘다(스펙 D2).
  it("뉴트럴 컨트롤이 뉴트럴 띠보다 앞에 온다 (스펙 D2)", () => {
    render(<ColorPalettePage />);
    const block = screen.getByTestId("neutral-section");
    const control = block.querySelector('[role="group"][aria-label="뉴트럴 색조"]')!;
    const strip = block.querySelector('[data-testid="swatch"]')!;
    expect(control).toBeTruthy();
    expect(strip).toBeTruthy();
    // DOCUMENT_POSITION_FOLLOWING = strip이 control 뒤에 온다.
    expect(control.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });

  // 라벨은 각각 두 글자인데 칩 위에 한 줄씩 앉아 세로 2행을 먹고 있었다.
  // 같은 행으로 내리면 그 2행이 통째로 사라진다(스펙 D2).
  it("색조·강도 라벨이 칩과 같은 행에 있다 (스펙 D2)", () => {
    render(<ColorPalettePage />);
    for (const [label, groupName] of [["색조", "뉴트럴 색조"], ["강도", "강도"]] as const) {
      const group = screen.getByRole("group", { name: groupName });
      const row = group.parentElement!;
      expect(row.className).toContain("flex");
      expect(row.textContent).toContain(label);
    }
  });
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && pnpm test -- ColorPalettePage.test.tsx`
Expected: FAIL — `getByTestId("neutral-section")`이 없고, 라벨의 부모가 `grid`다.

- [ ] **Step 3: `NeutralControl.tsx`를 고친다**

`return` 전체를 아래로 교체한다. `snapped` · `activeId` · `strength` · `achromatic` 계산과 파일 헤더 주석은 그대로 둔다.

```tsx
  return (
    // 라벨을 칩 위가 아니라 **같은 행**에 둔다(스펙 D2) — "색조"·"강도"는 각각
    // 두 글자인데 칩 위에 한 줄씩 앉아 세로 2행을 먹고 있었다. 라벨은 제자리에
    // 남고 칩만 flex-wrap으로 접히므로 좁은 화면에서도 라벨이 칩과 갈리지 않는다.
    <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
      <div className="flex items-center gap-2">
        {/* 라벨 색은 neutral-500이다 — 400은 흰 배경에서 2.58:1로 미달이다.
           어느 축을 고르는지 못 읽으면 칩이 무슨 뜻인지 알 수 없으므로 장식이
           아니다 (직전 스펙 D2). shrink-0이 없으면 칩이 밀 때 라벨이 줄바꿈된다. */}
        <div className="ds-type-caption-sm text-neutral-500 shrink-0">색조</div>
        {/* role="group"만 쓰고 radiogroup을 쓰지 않는 이유: APG 라디오 패턴은
           roving tabindex + 화살표 이동=선택을 요구하는데, 그 함정(방향키 한 번이
           곧 확정이라 "고르기 전에 결과를 본다"가 깨지는 것)은 이 화면이
           CandidatePopover에서 이미 밟았다(사이클 3.2 알려진 한계 3). */}
        <div role="group" aria-label="뉴트럴 색조" className="flex flex-wrap gap-1.5">
          {TINT_ATTRACTORS.map((a) => (
            <button
              key={a.id}
              type="button"
              // aria-label이 visible text(점 표식 포함)를 덮어써서 스크린리더에는
              // 시각적 "•" 채널이 없다 — 자동 스냅 여부를 라벨 문구에 직접 반영한다.
              aria-label={a.id === snapped.id ? `${a.label} (자동)` : a.label}
              aria-pressed={activeId === a.id}
              onClick={() => onChange({ attractorId: a.id, strength })}
              className={`rounded px-2 py-1 ds-type-caption-sm border ${
                activeId === a.id
                  ? "border-neutral-900 font-medium"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              {a.label}
              {a.id === snapped.id && (
                // 점 표식 색도 neutral-500이다 — 어느 칩이 자동으로 붙은 것인지
                // 못 읽으면 알 수 없으므로 장식이 아니다.
                <span className="ml-1 text-neutral-500">•</span>
              )}
            </button>
          ))}
        </div>
      </div>
      {/* 무채색에는 강도가 없다 — 행이 통째로 사라지고 아래가 당겨진다.
         이 화면에서 조건부로 사라지는 유일한 컨트롤이다(스펙 알려진 한계 4). */}
      {!achromatic && (
        <div className="flex items-center gap-2">
          <div className="ds-type-caption-sm text-neutral-500 shrink-0">강도</div>
          <div role="group" aria-label="강도" className="flex items-center gap-1.5">
            {(["soft", "strong"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={strength === s}
                onClick={() => onChange({ attractorId: activeId, strength: s })}
                className={`rounded px-2 py-0.5 ds-type-caption-sm border ${
                  strength === s ? "border-neutral-900 font-medium" : "border-neutral-200"
                }`}
              >
                {s === "soft" ? "은은" : "뚜렷"}
              </button>
            ))}
          </div>
          {/* 칩이든 강도든 한 번 누르면 어트랙터가 확정된다(state.tint !== null) —
             액센트를 나중에 바꿔도 자동 스냅으로 돌아가지 못하는 함정이 되지
             않도록 되돌릴 길을 둔다. "자동으로"는 선택지가 아니라 되돌리기라
             강도 그룹 **밖**에 둔다. 링크 색 neutral-500도 대비 하한이다. */}
          {state.tint && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="ds-type-caption-sm text-neutral-500 hover:text-neutral-700 underline"
            >
              자동으로
            </button>
          )}
        </div>
      )}
      {/* 무채색이면 강도 행이 없으므로 "자동으로"도 갈 곳이 없다 — 되돌릴 길이
         사라지면 함정이 된다. 그래서 이 경우에만 따로 한 줄 세운다. */}
      {achromatic && state.tint && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ds-type-caption-sm text-neutral-500 hover:text-neutral-700 underline justify-self-start"
        >
          자동으로
        </button>
      )}
    </div>
  );
```

> ⚠️ **회귀 주의.** 원본은 `자동으로`를 `!achromatic` 조건 **밖**에 두어 무채색에서도 보였다. 위 구조는 `강도` 행 안으로 들여왔으므로 무채색 분기를 따로 세우지 않으면 **되돌릴 길이 사라진다.** 그래서 마지막 블록이 있다.

- [ ] **Step 4: `ColorPalettePage.tsx`의 뉴트럴 그룹 순서를 뒤집는다**

기존 뉴트럴 `<div>`를 아래로 교체한다.

```tsx
        {/* 액센트와 같은 "입력 → 결과" 방향이다(스펙 D2) — 컨트롤이 위, 띠가
            아래. 그 사이 12는 ① 피커 카드 → 액센트 띠와 **같은 뜻**의 12다.
            같은 관계에 같은 값을 쓰는 것이 D1 간격 위계의 요점이다. */}
        <div
          data-testid="neutral-section"
          style={{ display: "grid", gap: "var(--ds-space-sm)" }}
        >
          <NeutralControl
            state={state}
            onChange={(tint) => setState((s) => ({ ...s, tint }))}
          />
          <div style={{ display: "grid", gap: "var(--ds-space-xxs)" }}>
            <div className="ds-type-caption-sm text-neutral-500">뉴트럴</div>
            <AdjustableScale hexes={scales.neutral} adjustable={[]} pinned={[]} />
          </div>
        </div>
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `cd web && pnpm test -- ColorPalettePage.test.tsx`
Expected: PASS — 새 둘과 기존 `"뉴트럴 색조/강도가 aria-pressed와 그룹 라벨을 갖는다"` · `"강도만 눌러도 어트랙터 선택이 확정된다"`가 모두 통과.

- [ ] **Step 6: 타입체크 후 커밋**

```bash
cd web && npx tsc -b && cd ..
git add web/src/color-palette/NeutralControl.tsx web/src/color-palette/ColorPalettePage.tsx web/src/color-palette/ColorPalettePage.test.tsx
git commit -m "$(cat <<'EOF'
feat(color-palette): 뉴트럴도 입력→결과 순서로, 라벨은 칩과 나란히 (D2)

액센트는 피커(위)→띠(아래)인데 뉴트럴만 반대여서, 같은 화면에서 같은
관계가 두 방향으로 그려지고 있었다. 컨트롤을 띠 위로 올려 둘을 맞춘다 —
그 사이 12는 피커→액센트 띠와 같은 뜻의 12다.

"색조"·"강도" 라벨을 칩과 같은 행으로 내려 세로 2행을 걷는다. 라벨은
제자리에 남고 칩만 wrap하므로 좁은 화면에서도 갈리지 않는다.

"자동으로"를 강도 행 안으로 들여오면서 무채색 분기를 따로 세웠다 —
무채색에는 강도 행이 없어 되돌릴 길이 통째로 사라질 뻔했다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `AdjustableScale`이 `emphasis`를 받아 그린다 (D3 렌더)

**Files:**
- Modify: `web/src/color-palette/AdjustableScale.tsx`
- Test: `web/src/color-palette/AdjustableScale.test.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: `AdjustableScale`의 새 prop `emphasis?: number | null` (기본 `null`). 강조된 스와치에 `data-emphasized="true"`가 붙는다. Task 4가 이 prop에 값을 넣는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`AdjustableScale.test.tsx` 끝에 더한다.

```tsx
  // accent[5]는 paletteState의 pinsOf가 anchor로 넣는 자리라 **문자 그대로
  // 피커 위의 hex**다. 강조는 "지금 네가 정하는 자리가 여기다"라는 사실
  // 지목이다(스펙 D3). 판단(언제 켜는가)은 부모에 있고 여긴 그리기만 한다.
  it("emphasis가 준 인덱스에만 표식이 붙는다", () => {
    render(<AdjustableScale hexes={HEXES} adjustable={[]} pinned={[]} emphasis={5} />);
    const swatches = screen.getAllByTestId("swatch");
    expect(swatches[5].getAttribute("data-emphasized")).toBe("true");
    for (const i of [0, 4, 6, 10]) {
      expect(swatches[i].getAttribute("data-emphasized")).toBeNull();
    }
  });

  it("emphasis가 null이면 아무 표식도 없다", () => {
    render(<AdjustableScale hexes={HEXES} adjustable={[]} pinned={[]} />);
    for (const s of screen.getAllByTestId("swatch")) {
      expect(s.getAttribute("data-emphasized")).toBeNull();
    }
  });

  // 기각한 대안의 회귀 가드 — "나머지를 흐린다(opacity)"는 드래그하는 내내
  // 램프 10칩을 실제와 다른 색으로 보이게 한다. 이 화면은 사다리의 간격을
  // 눈으로 재는 도구이므로, 재려고 드래그하는 순간에 사다리가 거짓말을 하면
  // 안 된다(스펙 D3의 기각 근거). 나중에 선의로 흐림을 더하면 여기서 걸린다.
  it("강조가 다른 칩의 불투명도를 안 건드린다 (스펙 D3 기각 대안)", () => {
    render(<AdjustableScale hexes={HEXES} adjustable={[]} pinned={[]} emphasis={5} />);
    for (const s of screen.getAllByTestId("swatch")) {
      expect((s as HTMLElement).style.opacity).toBe("");
      expect(s.className).not.toMatch(/opacity-/);
    }
  });
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && pnpm test -- AdjustableScale.test.tsx`
Expected: FAIL — `emphasis` prop이 타입에 없고 `data-emphasized`도 안 붙는다.

- [ ] **Step 3: `AdjustableScale.tsx`를 고친다**

`Props` 인터페이스 끝에 더한다:

```tsx
  /** 지금 짚을 stop 하나. 피커를 조작하는 동안 accent-500을 가리키는 데 쓴다
   *  (스펙 D3). **언제 켜고 끄는지는 이 컴포넌트가 안 정한다** — 부모가 준
   *  값을 그릴 뿐이다(CLAUDE.md 로직/렌더 분리). null = 강조 없음. */
  readonly emphasis?: number | null;
```

`import` 아래(컴포넌트 밖)에 상수를 둔다:

```tsx
// 링은 흰 페이지 배경 위에 그려지므로 neutral-900 단색으로 충분하다 —
// PreviewPane의 흰/검 이중 링(HIGHLIGHT_RING)은 배경이 사용자 팔레트라서
// 필요했던 장치이고, 여기엔 그 조건이 없다.
// outline을 쓰는 이유는 레이아웃을 안 밀기 때문이다(border는 칩 크기를 바꾸고
// box-shadow는 이 컴포넌트가 이미 depth 어포던스로 쓰고 있어 신호가 겹친다).
// 리프트 2px는 스와치의 press 이동(2px)과 같은 값이다 — 이 띠에서 "2px 뜬다"가
// 이미 뜻하는 것("만질 수 있다")과 어긋나지 않는다.
// transform은 변위라 prefers-reduced-motion에서도 살아 있고 트윈만 꺼진다
// (직전 스펙 D9, motion.test.tsx의 가드).
const EMPHASIS_STYLE = {
  outline: "2px solid var(--color-neutral-900)",
  outlineOffset: "2px",
  transform: "translateY(-2px)",
} as const;
```

시그니처 구조분해에 `emphasis = null,`을 더하고, 루프 안에 판정을 둔다:

```tsx
        const canAdjust = adjustable.includes(i);
        const emphasized = i === emphasis;
        const label = `${STOP_KEYS[i]} ${hex}${canAdjust ? " — 조정" : ""}`;
```

두 분기(`button`·`div`) 모두에 같은 두 줄을 얹는다 — 500은 조정 불가라 `div` 분기로 가지만, 강조 대상이 앞으로도 그 자리라는 보장은 없다:

```tsx
                data-emphasized={emphasized ? "true" : undefined}
                style={{ background: hex, ...(emphasized ? EMPHASIS_STYLE : undefined) }}
```

`div` 분기는 `transition`이 없으므로 클래스에 `transition-transform`을 더한다:

```tsx
                className={`w-full ${compact ? "h-5" : "h-9"} rounded-sm border border-neutral-200 transition-transform`}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `cd web && pnpm test -- AdjustableScale.test.tsx`
Expected: PASS — 새 셋과 기존 전부.

- [ ] **Step 5: 타입체크 후 커밋**

```bash
cd web && npx tsc -b && cd ..
git add web/src/color-palette/AdjustableScale.tsx web/src/color-palette/AdjustableScale.test.tsx
git commit -m "$(cat <<'EOF'
feat(color-palette): AdjustableScale에 emphasis prop — 그리기만 한다 (D3)

강조된 stop에 outline 링 + 2px 리프트를 얹는다. 언제 켜는지는 부모가
정한다(다음 커밋) — 이 컴포넌트는 받은 값을 그릴 뿐이다.

"나머지를 흐린다(opacity)"는 기각했고 그 회귀 가드를 테스트로 남겼다:
드래그하는 내내 램프 10칩이 실제와 다른 색으로 보이면, 사다리 간격을
눈으로 재려고 드래그하는 바로 그 순간에 사다리가 거짓말을 한다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 피커 활동이 500 강조를 켠다 — 끝을 감지하지 않는다 (D3 배선)

**Files:**
- Modify: `web/src/color-palette/AccentInput.tsx`
- Modify: `web/src/color-palette/ColorPalettePage.tsx`
- Test: `web/src/color-palette/ColorPalettePage.test.tsx`

**Interfaces:**
- Consumes: Task 3의 `AdjustableScale` prop `emphasis?: number | null`
- Produces: `AccentInput`의 새 prop `onPickingActivity: () => void` (필수). 페이지 상수 `PICK_EMPHASIS_MS = 600`, 강조 대상 인덱스 `ANCHOR_STOP = 5`.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`ColorPalettePage.test.tsx` 끝에 새 describe를 더한다.

```tsx
// 직전 사이클이 같은 종류의 판정에서 두 라운드를 썼다(최종 리뷰 I-1 라운드
// 2·3): "지금 드래그 중인가"를 pointerdown~pointerup으로 근사했더니
// pointercancel 한 번에 영원히 참으로 고착되고, 키보드 넛지는 포인터 이벤트가
// 아니라 아예 안 잡혔다. 그 교훈을 되풀이하지 않는다 — 판정 축이 데드라인이라
// **끄는 이벤트가 없고**, 그래서 못 받아서 고착될 이벤트도 없다(스펙 D3).
describe("피커 조작 중 accent-500 강조 (스펙 D3)", () => {
  const anchorSwatch = () =>
    screen.getByTestId("palette-section").querySelectorAll('[data-testid="swatch"]')[5];

  afterEach(() => {
    vi.useRealTimers();
  });

  it("기본 상태에서는 강조가 없다", () => {
    render(<ColorPalettePage />);
    expect(anchorSwatch().getAttribute("data-emphasized")).toBeNull();
  });

  it("피커 pointerdown이 강조를 켠다", () => {
    vi.useFakeTimers();
    render(<ColorPalettePage />);
    act(() => {
      fireEvent.pointerDown(screen.getByTestId("accent-picker"));
    });
    expect(anchorSwatch().getAttribute("data-emphasized")).toBe("true");
  });

  // 핵심 단언 — pointerup/pointercancel/lostpointercapture를 **하나도 안 보내도**
  // 풀린다. 끝을 감지하지 않는다는 것이 방어 코드가 아니라 판정 축의 성질임을
  // 고정한다.
  it("끝 이벤트를 하나도 안 받아도 600ms 뒤 풀린다 (고착 불가)", () => {
    vi.useFakeTimers();
    render(<ColorPalettePage />);
    act(() => {
      fireEvent.pointerDown(screen.getByTestId("accent-picker"));
    });
    expect(anchorSwatch().getAttribute("data-emphasized")).toBe("true");
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(anchorSwatch().getAttribute("data-emphasized")).toBeNull();
  });

  // 데드라인은 활동마다 **갱신**된다 — 드래그가 길어도 중간에 안 꺼진다.
  it("활동이 이어지면 만료가 미뤄진다", () => {
    vi.useFakeTimers();
    render(<ColorPalettePage />);
    act(() => {
      fireEvent.pointerDown(screen.getByTestId("accent-picker"));
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(anchorSwatch().getAttribute("data-emphasized")).toBe("true");
    act(() => {
      fireEvent.pointerDown(screen.getByTestId("accent-picker"));
    });
    act(() => {
      vi.advanceTimersByTime(400); // 첫 활동 기준으로는 800ms — 갱신 안 되면 꺼진다
    });
    expect(anchorSwatch().getAttribute("data-emphasized")).toBe("true");
  });

  // hex 칸은 "피커 위"가 아니다 — 완결된 값 하나를 통째로 정하는 별개 행동이고,
  // AccentInput의 sessionGen이 이미 같은 축으로 둘을 가른다(스펙 D3).
  it("hex 칸 커밋은 강조를 안 켠다", () => {
    vi.useFakeTimers();
    render(<ColorPalettePage />);
    act(() => {
      fireEvent.change(screen.getByLabelText("액센트 hex"), { target: { value: "#00a3a3" } });
    });
    expect(anchorSwatch().getAttribute("data-emphasized")).toBeNull();
  });
});
```

> `afterEach`·`vi`·`act`는 `ColorPalettePage.test.tsx` 1–2행에서 이미 import돼 있다. 새 import는 필요 없다.

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && pnpm test -- ColorPalettePage.test.tsx`
Expected: FAIL — `data-emphasized`가 절대 안 붙는다.

- [ ] **Step 3: `AccentInput.tsx`에 활동 신호를 붙인다**

props 타입에 더한다:

```tsx
  /** 피커 서브트리에서 조작이 일어났다는 신호. **끝은 안 알린다** — 부모가
   *  데드라인으로 판정하므로 시작만 세면 되고, 그래서 pointerup/pointercancel
   *  같은 "끝 이벤트"를 못 받아 고착되는 실패 모드 자체가 없다(스펙 D3).
   *  세대(sessionGen)와 축이 같지만 목적이 다르다: 세대는 "같은 조정인가"를,
   *  이건 "방금 조작이 있었나"를 답한다. */
  readonly onPickingActivity: () => void;
```

구조분해에 `onPickingActivity`를 더하고, `sessionGen` 선언 아래에 ref를 둔다:

```tsx
  // 아래 리스너 등록 effect는 deps가 []다(마운트 시 한 번) — 그 클로저가 prop을
  // 직접 읽으면 첫 렌더 값에 영원히 고정된다. ref에 매 렌더 최신값을 넣어
  // 리스너가 그것을 읽게 한다. 부모가 useCallback으로 안정화해도 되지만,
  // 이 effect가 []에 의존하는 사실이 부모 구현에 조용히 매이지 않게 여기서 끊는다.
  const activityRef = useRef(onPickingActivity);
  activityRef.current = onPickingActivity;
```

기존 리스너 셋에서 활동을 함께 알린다 — **핸들러를 새로 만들지 않고 기존 것에 한 줄씩 얹는다**:

```tsx
    const onPointerDown = () => { sessionGen.current += 1; activityRef.current(); };
```

```tsx
    const onPointerCancel = () => { sessionGen.current += 1; activityRef.current(); };
```

```tsx
    const onFocusIn = (e: FocusEvent) => {
      // L↔C↔H NumberField 사이의 이동도 "피커를 조작 중"이다 — 세대는 안 열지만
      // 활동은 알린다. 세대(같은 조정인가)와 활동(방금 조작이 있었나)은 다른
      // 질문이라 여기서 갈린다.
      activityRef.current();
      if (e.relatedTarget instanceof Node && wrap.contains(e.relatedTarget)) return;
      sessionGen.current += 1;
    };
```

`OklchPicker`의 `onChange`에도 얹는다 — 드래그 중 `pointermove`와 키보드 넛지가 여기로 온다:

```tsx
          <OklchPicker
            hex={hex}
            onChange={(h) => {
              // 드래그 중 pointermove와 NumberField의 ArrowUp 넛지가 둘 다 여기로
              // 온다 — 포인터 이벤트가 아닌 경로까지 활동으로 세는 자리다(직전
              // 스펙 최종 리뷰 N-2가 놓쳤던 바로 그 경로).
              onPickingActivity();
              onChange(h, sessionGen.current);
            }}
          />
```

**hex 입력창의 `onChange`에는 얹지 않는다.**

- [ ] **Step 4: `ColorPalettePage.tsx`에 데드라인 상태를 둔다**

`import` 아래(컴포넌트 밖)에 상수를 둔다:

```tsx
// 강조가 살아 있는 시간. 이 화면의 다른 두 타이머보다 훨씬 짧다 —
// DownloadRow 복사 피드백 2000, PreviewPane 적용 강조 3000. 그 둘은 **완료된
// 행동**을 알리지만 이건 **진행 중인 제스처**를 따라가므로 길면 조작과 어긋난다.
// 부수효과 하나가 바람직하다: 손을 뗀 뒤에도 이만큼 링이 남아 "500이 어디
// 앉았는지" 확인할 틈이 생긴다(스펙 D3).
const PICK_EMPHASIS_MS = 600;
// paletteState의 pinsOf가 anchor로 넣는 자리 — accent[5]는 문자 그대로 피커
// 위의 hex다. 강조가 사실 지목인 근거가 이 상수다.
const ANCHOR_STOP = 5;
```

컴포넌트 안, `sessionAtDrop` 선언 아래:

```tsx
  // "지금 피커를 조작 중인가"를 **끝 이벤트로 판정하지 않는다**(스펙 D3).
  // 활동이 올 때마다 타이머를 새로 걸어 만료 시각을 뒤로 민다 — 갱신만 있고
  // 종료 신호가 없으므로, pointerup·pointercancel·lostpointercapture 중
  // 무엇이 오든 혹은 하나도 안 오든 결과가 같다. 직전 사이클이 두 라운드를
  // 쓴 고착(I-1 라운드 2·3)이 구조적으로 불가능해진다.
  const [picking, setPicking] = useState(false);
  const pickTimerRef = useRef<number | null>(null);

  const onPickingActivity = () => {
    setPicking(true);
    if (pickTimerRef.current !== null) window.clearTimeout(pickTimerRef.current);
    pickTimerRef.current = window.setTimeout(() => {
      setPicking(false);
      pickTimerRef.current = null;
    }, PICK_EMPHASIS_MS);
  };

  // 언마운트 시 남은 타이머를 걷는다 — 사라진 컴포넌트에 setState하지 않는다.
  useEffect(() => () => {
    if (pickTimerRef.current !== null) window.clearTimeout(pickTimerRef.current);
  }, []);
```

`AccentInput` 호출에 prop을 더한다:

```tsx
        <AccentInput
          hex={state.accentHex}
          onChange={onAccentChange}
          onPickingActivity={onPickingActivity}
        />
```

액센트 `AdjustableScale`에 `emphasis`를 넘긴다:

```tsx
            emphasis={picking ? ANCHOR_STOP : null}
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `cd web && pnpm test -- ColorPalettePage.test.tsx`
Expected: PASS — 새 describe 다섯 전부, 그리고 기존 pin 배너 만료 스위트(같은 `sessionGen` 배선을 공유한다)도 그대로.

- [ ] **Step 6: 전체 스위트 + 타입체크**

Run: `cd web && pnpm test && npx tsc -b`
Expected: 전부 PASS, 타입 오류 없음.

- [ ] **Step 7: 커밋**

```bash
git add web/src/color-palette/AccentInput.tsx web/src/color-palette/ColorPalettePage.tsx web/src/color-palette/ColorPalettePage.test.tsx
git commit -m "$(cat <<'EOF'
feat(color-palette): 피커 조작 중 accent-500을 짚는다 — 끝을 감지하지 않는다 (D3)

accent[5]는 pinsOf가 anchor로 넣는 자리라 문자 그대로 피커 위의 hex다.
강조는 "지금 네가 정하는 자리가 여기다"라는 사실 지목이다.

판정 축이 데드라인이다. 피커 서브트리의 활동(pointerdown / pointercancel /
focusin / onChange 커밋)이 만료 시각을 뒤로 밀고, 600ms 무활동이면 꺼진다.
끄는 이벤트가 없으니 못 받아서 고착될 이벤트도 없다 — 직전 사이클이
pointercancel 고착과 키보드 넛지 누락으로 두 라운드를 쓴 자리(I-1 라운드
2·3)를 구조로 닫는다. 그 성질을 "끝 이벤트를 하나도 안 받아도 풀린다"
테스트로 고정했다.

hex 칸 커밋은 활동에 안 넣는다 — 피커 위가 아니라 완결된 값 하나를
통째로 정하는 별개 행동이고, sessionGen이 이미 같은 축으로 둘을 가른다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 목업을 채우고 배선을 다시 그린다 — 3.1 D2 은퇴 (D4·D5)

**Files:**
- Modify: `web/src/color-palette/mockTargets.ts`
- Modify: `web/src/color-palette/PreviewPane.tsx`
- Test: `web/src/color-palette/mockTargets.test.ts`
- Test: `web/src/color-palette/ColorPalettePage.test.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: `MockTarget` 유니온에 `"warning-badge"` · `"success-badge"` · `"info-badge"` 추가. `mockTargetFor("error", "solid" | "on-solid") === "error-badge"`, `mockTargetFor("error", "text-strong") === null`. 두 Mock 안에 각 타깃이 하나씩. `card-text`를 쓰는 요소가 **둘**(제목과 지표 수치)이 된다.

> **매핑과 요소는 한 태스크다.** 순수 함수를 먼저 고정하고 렌더를 나중에 하는 편이 TDD로는 깔끔하지만, `mockTargetFor`만 바꾸면 `shiftHighlightTargets`(SCALE_ORDER 전부에 묻는다)를 거쳐 기존 `ColorPalettePage.test.tsx` 단언이 그 자리에서 깨진다 — 요소가 없는 한 되살릴 방법이 없다. 칩이 읽는 역할과 매핑은 **어차피 함께 움직여야 하는 쌍**이므로 한 태스크로 묶고, 안에서 순수 함수 → 렌더 순으로 진행한다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`mockTargets.test.ts`에서 **기존 두 `it`을 교체**한다 — `"목업에 없는 스케일은 null이다"`와 `"error에 없는 text·on-solid은 null이다"`. 나머지 `it`은 그대로 둔다.

```tsx
  // 3.1 D2("상태 한 조각… 작게 하나면 충분하다")를 상시 규칙에서 은퇴시킨다
  // (스펙의 "뒤집는 판단 1"). 근거는 미학이 아니라 배선이다: checkContrast는
  // 6개 스케일 전부에 검사를 만드는데 여기가 warning·success·info에 전부
  // null을 내서, **가리킬 데가 구조적으로 없는 경고가 상시 존재**했다.
  it("상태색 4종의 text-strong이 각자의 칩을 가리킨다", () => {
    expect(mockTargetFor("warning", "text-strong")).toBe("warning-badge");
    expect(mockTargetFor("success", "text-strong")).toBe("success-badge");
    expect(mockTargetFor("info", "text-strong")).toBe("info-badge");
  });

  // 실패 칩만 solid + on-solid로 그린다(스펙 D5) — 겉모습(진한 배경·밝은 글자)은
  // 요청한 swap 그대로이고, subtle-bg↔text-strong을 글자 그대로 맞바꾸는 쪽은
  // 배지 문구가 bgLabel에서 나와 "은은한 배경 위 진한 글자"로 읽혀 화면과
  // 방향이 반대가 된다(bgLabel은 src/color/라 엔진 불변에 막혀 못 고친다).
  it("error는 solid·on-solid이 실패 칩이다", () => {
    expect(mockTargetFor("error", "solid")).toBe("error-badge");
    expect(mockTargetFor("error", "on-solid")).toBe("error-badge");
  });

  // 잃는 것을 명시한다(스펙 알려진 한계 1). 칩 하나는 배경·글자 쌍을 하나만
  // 쓴다 — 실패 칩이 solid 쌍을 쓰므로 text-strong은 그 칩이 안 읽는 역할이
  // 됐다. 안 쓰는 역할을 매핑하면 mockTargets가 처음부터 막으려던 것
  // (실제로 안 쓰인 stop의 실패에 엉뚱한 요소가 켜지는 것)이 재생산된다.
  it("error text-strong·text는 이제 null이다 — 칩이 그 역할을 안 쓴다", () => {
    expect(mockTargetFor("error", "text-strong")).toBeNull();
    expect(mockTargetFor("error", "text")).toBeNull();
  });

  // text와 text-strong은 TEXT_ROLES 짝이지만 서로 다른 stop이고, 상태 칩은
  // text-strong stop만 쓴다 — accent에서 text를 뺀 것과 같은 이유다(리뷰
  // 반증: #00a3a3에서 text만 실패·text-strong은 통과인데 공유 버튼이 켜짐).
  it("상태색 text(링크)는 칩이 아니다 — null", () => {
    expect(mockTargetFor("warning", "text")).toBeNull();
    expect(mockTargetFor("success", "text")).toBeNull();
    expect(mockTargetFor("info", "text")).toBeNull();
  });

  // 목업이 안 그리는 역할은 여전히 null이다 — 은퇴시킨 것은 "목업을 넓히지
  // 않는다"는 상시 규칙이지, "가리킬 데가 있는 것만 배선한다"는 원칙이 아니다.
  it("상태색이 안 쓰는 역할은 null이다", () => {
    expect(mockTargetFor("warning", "solid")).toBeNull();
    expect(mockTargetFor("success", "on-solid")).toBeNull();
    expect(mockTargetFor("info", "hover-bg")).toBeNull();
  });
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && pnpm test -- mockTargets.test.ts`
Expected: FAIL — `warning-badge` 등이 `MockTarget`에 없어 타입이 깨지고, `mockTargetFor("error", "text-strong")`이 `"error-badge"`를 낸다.

- [ ] **Step 3: `mockTargets.ts`를 고친다**

파일 헤더 주석에서 **거짓이 된 문단**을 고친다. 아래 문장이 지금 대상이다:

- `"- error: subtle-bg + text-strong 배지 하나("실패 2"). error의 solid·text는 목업에 없다."`
- `"warning·success·info는 목업에 아예 없다 — 목업을 넓혀 커버리지를 올리지 않는다(3.1 D2 재개봉 금지). 그런 조합은 null."`

그 두 항목을 아래로 교체한다:

```ts
//   - error: **solid + on-solid** 배지 하나("실패 2"). 진한 배경·밝은 글자다.
//     subtle-bg·text-strong은 이 칩이 안 읽으므로 null이다 — 옛 매핑을 뒤집는다
//     (2026-09-01 스펙 D5).
//   - warning·success·info: subtle-bg 배경 + text-strong 글자 칩 각각 하나
//     ("지연 1" / "완료 12" / "동기화").
//
// **3.1 D2("상태 한 조각… 작게 하나면 충분하다")는 상시 규칙에서 은퇴했다**
// (2026-09-01 스펙의 "뒤집는 판단 1"). 이 파일의 옛 주석은 그 규칙을 근거로
// warning·success·info를 영구 null로 선언했는데, 그 결과 checkContrast가
// 만드는 그 스케일들의 검사는 **가리킬 데가 구조적으로 없었다** — 3.1 D2와
// 직전 스펙 D3의 배선 기준("가리킬 데가 있는가")이 서로를 막고 있던 셈이다.
// 은퇴시키되 새 상시 규칙을 그 자리에 세우지 않는다: 목업은 aside 세로 여유
// 실측과 이 파일의 배선 원칙 둘로 충분히 다스려진다.
//
// 잃은 것도 적는다 — error/text-strong은 이제 가리킬 데가 없다. 칩 하나는
// 배경·글자 쌍을 하나만 쓰기 때문이고, 회피 가능한 실수가 아니라 구조다.
```

`MockTarget` 유니온에 셋을 더한다:

```ts
  | "error-badge"
  | "warning-badge"
  | "success-badge"
  | "info-badge";
```

`mockTargetFor`의 `error` 분기를 교체하고 셋을 더한다:

```ts
  // 실패 칩은 solid + on-solid다 — 바로 옆 "보고서 열기"(accent solid +
  // on-solid)와 같은 장치를 쓴다. on-solid은 라이트만 검사되므로(checkContrast)
  // 다크 목업의 이 칩은 어떤 뱃지도 안 가리킨다 — "보고서 열기"가 이미 같은
  // 상태라 새 비대칭이 아니다.
  if (scaleName === "error") {
    if (roleId === "solid" || roleId === "on-solid") return "error-badge";
    return null;
  }
  // 나머지 셋은 subtle-bg 배경 + text-strong 글자다. subtle-bg는 배선해도
  // 뱃지로는 안 뜬다(checkContrast가 text·text-strong·on-solid 셋만 검사를
  // 만든다) — 그래도 "이 칩이 그 역할을 읽는다"는 사실은 같으므로 매핑한다.
  if (scaleName === "warning" || scaleName === "success" || scaleName === "info") {
    if (roleId === "text-strong" || roleId === "subtle-bg") return `${scaleName}-badge`;
    return null;
  }
  return null;
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `cd web && pnpm test -- mockTargets.test.ts`
Expected: PASS.

- [ ] **Step 5: `shiftHighlightTargets`의 파급을 고친다 (테스트만 — 요소는 Step 8이 그린다)**

`shiftSummary.ts`의 `targetsForTheme`은 `SCALE_ORDER` 전부에 `mockTargetFor`를 묻는다. 그래서 `text-strong`이 이동하면 이제 **error-badge 대신 warning/success/info 배지**가 켜진다 — 그리고 그게 사실이다: 상태 칩 셋은 `at(sc, "text-strong")`으로 그려 실제로 색이 따라 움직이고, 실패 칩(solid+on-solid)은 안 움직인다.

`ColorPalettePage.test.tsx`의 `it("이동한 역할들의 목업 요소를 해당 테마에서만 잠깐 짚는다", ...)`에서 두 배열을 고친다:

```tsx
    for (const target of [
      "card-text", "card-subtext", "share-btn",
      // error-badge는 빠진다 — 실패 칩이 solid+on-solid로 바뀌어 text-strong
      // 이동에 안 움직인다(스펙 D5, 알려진 한계 1). 대신 text-strong을 실제로
      // 읽는 상태 칩 셋이 들어온다.
      "warning-badge", "success-badge", "info-badge",
    ] as const) {
```

`dark` 루프의 배열도 같은 값으로 바꾼다.

> 이 Step은 **아직 실패한다**(`querySelector`가 `undefined`를 낸다) — Step 8이 요소를 그리면 통과한다. 여기서 커밋하지 않는다.

- [ ] **Step 6: `PreviewPane` 렌더의 실패하는 테스트를 쓴다**

아래 `describe`를 `ColorPalettePage.test.tsx` 끝에 더한다.

3.1 D2("상태 한 조각… 작게 하나면 충분하다")가 warning·success·info를
영구 null로 못박고 있었고, 그 결과 checkContrast가 만드는 그 검사들은
가리킬 데가 구조적으로 없었다 — 3.1 D2와 직전 스펙 D3의 배선 기준이
서로를 막고 있었다. 은퇴시키되 새 상시 규칙을 세우지 않는다.

실패 칩은 solid + on-solid로 간다. 요청한 swap과 겉모습은 같고,
subtle-bg↔text-strong을 맞바꾸는 쪽은 배지 문구가 bgLabel에서 나와
화면과 방향이 반대로 읽힌다(bgLabel은 엔진이라 못 고친다).

잃는 것을 적는다: error/text-strong은 이제 가리킬 데가 없다. 칩 하나는
배경·글자 쌍을 하나만 쓴다. 순증 +3(잃는 것 1, 얻는 것 4).

이 커밋만으로는 전체 스위트가 실패한다 — 요소는 다음 커밋이 그린다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

```tsx
describe("목업 (스펙 D4·D5)", () => {
  it("상태색 4종이 라이트·다크 목업에 각각 하나씩 있다", () => {
    render(<ColorPalettePage />);
    for (const theme of ["light", "dark"] as const) {
      const mock = screen.getByTestId(`mock-${theme}`);
      for (const t of ["error-badge", "warning-badge", "success-badge", "info-badge"]) {
        expect(mock.querySelectorAll(`[data-mock-target="${t}"]`).length).toBe(1);
      }
    }
  });

  // 실패 칩만 solid + on-solid다(스펙 D5) — 배경이 solid stop이고 글자가
  // onSolidColor(solid)임을 실제 스타일로 고정한다. 나머지 셋과 다른 장치를
  // 쓴다는 사실이 조용히 뒤집히지 않게 한다.
  it("실패 칩은 solid 배경에 on-solid 글자다", () => {
    render(<ColorPalettePage />);
    const scales = deriveScales(defaultState(DEFAULT_ACCENT));
    const solid = scales.semantic.error[5]; // roles.ts: solid는 light·dark 모두 index 5
    const chip = screen
      .getByTestId("mock-light")
      .querySelector('[data-mock-target="error-badge"]') as HTMLElement;
    expect(chip.style.background).toBe(solid);
    expect(chip.style.color).toBe(onSolidColor(solid));
  });

  // 카드 제목과 지표 수치가 같은 역할(neutral text-strong)을 쓴다 — 뱃지 하나가
  // 둘을 함께 밝히는 것이 정확하다("이 역할은 여기 두 곳에 쓰인다", 스펙 D4).
  it("card-text를 쓰는 요소가 둘이다 — 제목과 지표 수치", () => {
    render(<ColorPalettePage />);
    expect(
      screen.getByTestId("mock-light").querySelectorAll('[data-mock-target="card-text"]').length,
    ).toBe(2);
  });

  // 11px/10px는 "만든 색이 실제로 어떻게 보이는가"를 거의 못 답한다.
  // 목업 안 텍스트는 크롬이 아니라 색칠 대상인 샘플 UI라 3.3 D4의 크롬 12px
  // 하한이 적용 안 되던 자리였다(스펙 D4).
  it("카드 제목·서브텍스트가 ds-type 토큰을 쓴다", () => {
    render(<ColorPalettePage />);
    const mock = screen.getByTestId("mock-light");
    expect(mock.querySelector('[data-mock-target="card-text"]')!.className)
      .toContain("ds-type-heading-xxs");
    expect(mock.querySelector('[data-mock-target="card-subtext"]')!.className)
      .toContain("ds-type-caption-sm");
  });

  // 막대는 안 건드린다 — BAR_STOPS의 비대칭 구간 함정(PreviewPane 주석)을
  // 이번에 열지 않는다.
  it("막대 다섯은 그대로다", () => {
    render(<ColorPalettePage />);
    expect(screen.getAllByTestId("mock-bar").length).toBe(10); // 라이트 5 + 다크 5
  });
});
```

> `deriveScales` · `defaultState` · `DEFAULT_ACCENT` · `onSolidColor`는 `ColorPalettePage.test.tsx` 3–5행에서 이미 import돼 있다.

- [ ] **Step 7: 실패를 확인한다**

Run: `cd web && pnpm test -- ColorPalettePage.test.tsx`
Expected: FAIL — `warning-badge` 등이 DOM에 없고, `card-text`가 하나뿐이고, 클래스가 `text-[11px]`다.

- [ ] **Step 8: `PreviewPane.tsx`에 상태 칩 표를 둔다**

`EMPTY_HIGHLIGHT` 선언 아래(컴포넌트 밖)에 더한다:

```tsx
// 목업이 그리는 상태 칩. 3.1 D2("상태 한 조각… 작게 하나면 충분하다")를 상시
// 규칙에서 은퇴시킨 결과다(2026-09-01 스펙의 "뒤집는 판단 1") — 근거는 미학이
// 아니라 배선이다: checkContrast가 6개 스케일 전부에 검사를 만드는데
// mockTargetFor가 warning·success·info에 전부 null을 내서, 가리킬 데가
// 구조적으로 없는 경고가 상시 존재했다.
//
// 실패만 solid다 — 요청한 "텍스트·배경 swap"의 겉모습(진한 배경·밝은 글자)을
// subtle-bg↔text-strong 맞바꾸기가 아니라 solid + on-solid로 낸다. 맞바꾸는
// 쪽은 대비비가 대칭이라 숫자는 맞지만 배지 문구가 bgLabel에서 나와
// "은은한 배경 위 진한 글자"로 읽혀 화면과 방향이 반대가 된다 — bgLabel은
// src/color/라 엔진 불변에 막혀 못 고친다(스펙 D5).
//
// 이 표와 mockTargets.ts의 매핑은 **함께 움직여야 한다** — 칩이 읽는 역할을
// 바꾸면 그쪽 매핑도 같이 바꾼다. 안 그러면 실제로 안 쓰인 stop의 실패에
// 엉뚱한 요소가 켜진다(mockTargets.ts의 리뷰 반증 사례).
const STATUS_CHIPS = [
  { id: "error", target: "error-badge", label: "실패 2", solid: true },
  { id: "warning", target: "warning-badge", label: "지연 1", solid: false },
  { id: "success", target: "success-badge", label: "완료 12", solid: false },
  { id: "info", target: "info-badge", label: "동기화", solid: false },
] as const satisfies readonly {
  id: keyof ScaleSet["semantic"];
  target: MockTarget;
  label: string;
  solid: boolean;
}[];
```

`import`에 `MockTarget`이 타입으로 이미 들어와 있다(`import type { MockTarget } from "./mockTargets";`) — 그대로 쓴다.

- [ ] **Step 9: `Mock` 본문을 고친다**

`const err = scales.semantic.error;` 줄을 지운다 — 칩 표가 스케일을 직접 찾으므로 필요 없다.

카드 안 제목·서브텍스트 블록을 교체한다:

```tsx
        <div>
          <div
            data-mock-target="card-text"
            data-highlighted={isActive("card-text") ? "true" : undefined}
            // 11px에서 올렸다 — 목업 안 텍스트는 크롬이 아니라 **색칠 대상인
            // 샘플 UI**라 3.3 D4의 크롬 12px 하한이 적용 안 되던 자리였고,
            // 그래서 "만든 색이 실제로 어떻게 보이는가"를 거의 못 답했다(스펙 D4).
            className="ds-type-heading-xxs"
            style={{ color: at(n, "text-strong"), ...highlightStyle(isActive("card-text")) }}
            onMouseEnter={() => onHover("card-text")}
            onMouseLeave={() => onHover(null)}
          >
            주간 활성 사용자
          </div>
          <div
            data-mock-target="card-subtext"
            data-highlighted={isActive("card-subtext") ? "true" : undefined}
            className="ds-type-caption-sm"
            style={{ color: at(n, "text"), ...highlightStyle(isActive("card-subtext")) }}
            onMouseEnter={() => onHover("card-subtext")}
            onMouseLeave={() => onHover(null)}
          >
            지난 5주
          </div>
        </div>

        {/* 지표 줄 — 막대 위에 선다(스펙 D4). 수치는 제목과 **같은 역할**
            (neutral text-strong)이라 data-mock-target도 card-text를 공유한다:
            뱃지 하나가 둘을 함께 밝히는 것이 정확하다("이 역할은 여기 두 곳에
            쓰인다").
            증감은 success text-strong 색을 쓰지만 **배선은 안 한다** — 같은
            역할의 강조 대상을 칩과 둘로 나누면 success 뱃지 하나가 서로 떨어진
            두 곳을 켜서 "어디를 보라는 건가"가 흐려진다. 색만 빌리고 가리킴은
            칩 하나로 모은다. */}
        <div className="flex items-baseline gap-2">
          <div
            data-mock-target="card-text"
            data-highlighted={isActive("card-text") ? "true" : undefined}
            className="ds-type-heading-xs"
            style={{ color: at(n, "text-strong"), ...highlightStyle(isActive("card-text")) }}
            onMouseEnter={() => onHover("card-text")}
            onMouseLeave={() => onHover(null)}
          >
            12,480
          </div>
          <div
            data-testid="mock-delta"
            className="ds-type-caption-sm"
            style={{ color: at(scales.semantic.success, "text-strong") }}
          >
            +8.2%
          </div>
        </div>
```

버튼 행에서 `실패 2` 배지를 **떼어내고**(`ml-auto` 배지 전체 삭제), 그 아래에 칩 행을 새로 둔다:

```tsx
        {/* 상태 칩 넷. 380px 사이드바 안쪽(~330px)에서 한 줄에 안 들어가면
            두 줄로 접힌다 — 접히는 것이 정상이다(칩을 줄이거나 글자를 깎지
            않는다). 산출물에 무조건 들어가는 색이므로 화면에 없으면 받아간
            파일에 모르는 색이 들어있게 된다(사이클 3 D7). */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_CHIPS.map((c) => {
            const sc = scales.semantic[c.id];
            const solidHex = at(sc, "solid");
            return (
              <span
                key={c.id}
                data-mock-target={c.target}
                data-highlighted={isActive(c.target) ? "true" : undefined}
                className="rounded px-1.5 py-0.5 ds-type-caption-xs"
                style={{
                  background: c.solid ? solidHex : at(sc, "subtle-bg"),
                  color: c.solid ? onSolidColor(solidHex) : at(sc, "text-strong"),
                  ...highlightStyle(isActive(c.target)),
                }}
                onMouseEnter={() => onHover(c.target)}
                onMouseLeave={() => onHover(null)}
              >
                {c.label}
              </span>
            );
          })}
        </div>
```

버튼 행의 `보고서 열기` · `공유`는 그대로 두고, `실패 2`가 빠졌으므로 감싸는 `div`의 `className`에서 의미를 잃은 부분만 정리한다(`flex items-center gap-2` 유지).

`BAR_STOPS` · `BAR_HEIGHTS` · 막대 렌더 블록은 **한 글자도 안 고친다.**

- [ ] **Step 10: 테스트가 통과하는지 확인한다**

Run: `cd web && pnpm test -- ColorPalettePage.test.tsx mockTargets.test.ts`
Expected: PASS — 새 describe 다섯, Step 5에서 고친 `"이동한 역할들의 목업 요소를…"`, 그리고 기존 목업 hover 스위트 전부.

**실패하면 먼저 볼 것:** `"상태색 4종이 …각각 하나씩"`이 `success-badge` 2를 세면 지표 줄의 증감에 `data-mock-target`을 붙인 것이다 — 증감은 색만 빌리고 배선은 안 한다(Step 9).

- [ ] **Step 11: 전체 스위트 + 타입체크**

Run: `cd web && pnpm test && npx tsc -b`
Expected: 전부 PASS, 타입 오류 없음.

- [ ] **Step 12: 커밋**

```bash
git add web/src/color-palette/mockTargets.ts web/src/color-palette/mockTargets.test.ts \
        web/src/color-palette/PreviewPane.tsx web/src/color-palette/ColorPalettePage.test.tsx
git commit -m "$(cat <<'EOF'
feat(color-palette): 목업을 채우고 배선을 다시 그린다 — 3.1 D2 은퇴 (D4·D5)

목업 안 텍스트는 크롬이 아니라 색칠 대상인 샘플 UI라 3.3 D4의 크롬 12px
하한이 적용 안 되던 자리였고, 그래서 11/10px로 남아 "만든 색이 실제로
어떻게 보이는가"를 거의 못 답했다. ds-type 토큰으로 올린다.

막대 위에 지표 줄(수치 + 증감)을 세운다. 수치는 제목과 같은 역할이라
data-mock-target도 card-text를 공유한다 — 뱃지 하나가 둘을 밝히는 것이
"이 역할은 여기 두 곳에 쓰인다"로 정확하다.

상태 칩이 하나에서 넷으로. 실패만 solid + on-solid이고 나머지 셋은
subtle-bg + text-strong이다. 막대(BAR_STOPS)는 안 건드렸다 — 비대칭
구간 함정을 이번에 열지 않는다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 브라우저 실측으로 닫고 스펙의 예측을 실측으로 교체한다

**Files:**
- Modify: `docs/superpowers/specs/2026-09-01-color-palette-ux-polish-design.md` ("세로 예산 — 예측과 검증 계획" 절)
- Modify: `web/src/color-palette/ColorPalettePage.tsx` (실측 결과가 요구하면 Task 1의 `marginTop`/`marginBottom` 값 조정)

**Interfaces:**
- Consumes: Task 1–5 전부
- Produces: 없음 (마감)

- [ ] **Step 1: dev 서버를 띄운다**

```bash
cd web && pnpm dev --port 5199
```

주소는 `http://localhost:5199/design-system-starter/color-palette`다 — `base`가 dev에도 걸려 있어 `/design-system-starter/`가 붙는 게 정상이다.

- [ ] **Step 2: 1440×900을 **실제로** 만든다**

chrome-devtools MCP `emulate`의 viewport 오버라이드를 쓴다. `resize_page`는 물리 디스플레이에 막혀 원하는 크기가 안 나온다(CLAUDE.md).

`evaluate_script`로 **재기 전에** 확인한다:

```js
() => ({ w: window.innerWidth, h: window.innerHeight })
```

Expected: `{ w: 1440, h: 900 }`. 다르면 측정하지 말고 `emulate`를 다시 건다.

- [ ] **Step 3: 기준선을 잰다**

```js
() => {
  const r = (el) => el ? Math.round(el.getBoundingClientRect().bottom * 100) / 100 : null;
  return {
    innerW: window.innerWidth, innerH: window.innerHeight,
    downloadBottom: r(document.querySelector('[data-testid="download-section"]')),
    asideBottom: r(document.querySelector('aside')),
    scrollHeight: document.documentElement.scrollHeight,
  };
}
```

직전 사이클 기준선은 `downloadBottom 887.36 / asideBottom 589.38 / scrollHeight 911`이다. 예측은 `downloadBottom ≈ 750`, `asideBottom ≈ 710`.

- [ ] **Step 4: pin 소멸 배너 상태도 잰다**

배너를 띄우려면: 액센트 띠의 조정 가능한 스와치(50·300·700·950) 하나를 눌러 후보를 pin한 뒤, hex 칸에서 액센트를 다른 값으로 바꾼다. 그러면 pin이 버려지며 배너가 뜬다.

같은 스크립트를 다시 돌려 `downloadBottom`을 잰다. **직전 사이클의 알려진 한계 7은 이 상태에서 914.16(−14.16)이었다.** 900 이하가 나오면 그 한계가 해소된 것이다.

- [ ] **Step 5: 좁은 화면을 확인한다**

`emulate` viewport `390x844x1`로 바꾸고 `innerWidth`를 선확인한 뒤:

- 상태 칩 넷이 접히되 잘리지 않는가
- 색조 칩 다섯이 접히되 "색조" 라벨이 칩과 갈라지지 않는가
- 가로 스크롤이 없는가: `document.documentElement.scrollWidth <= window.innerWidth`

- [ ] **Step 6: 500 강조를 실제로 확인한다**

피커 패드에서 드래그하고, 손을 뗀 뒤 링이 ~600ms 남았다가 꺼지는지 본다. **너무 길거나 짧으면 `PICK_EMPHASIS_MS`를 조정하고 Task 4의 테스트 상수도 함께 고친다.**

`emulate`로 `prefers-reduced-motion: reduce`를 걸 수 있으면 링의 **변위는 살고 트윈만 꺼지는지** 확인한다 — 직전 스펙 D9의 경계다.

- [ ] **Step 7: 스펙의 "세로 예산" 절을 실측으로 교체한다**

`docs/superpowers/specs/2026-09-01-color-palette-ux-polish-design.md`의 `## 세로 예산 — 예측과 검증 계획` 절에서:

1. 제목을 `## 세로 예산 — 실측 (2026-09-01)`으로 바꾼다.
2. 예상 Δ 표 둘을 **실측 표**로 교체한다. 측정 조건(1440×900 `emulate` 오버라이드, `innerWidth/innerHeight` 선확인)을 명시한다.
3. `"위는 전부 **예측**이다"` 문단을 지우고, 예측과 실측이 어긋난 자리가 있으면 **얼마나 어긋났는지** 적는다.
4. 알려진 한계 7 해소 여부를 Step 4 실측으로 확정한다. 900을 넘으면 해소되지 않은 것이니 스펙의 그 주장을 정정하고 알려진 한계로 남긴다 — **못 지킨 주장을 지운 척하지 않는다.**

- [ ] **Step 8: 전체 스위트 · 타입체크 · 루트 스위트**

```bash
cd web && pnpm test && npx tsc -b && cd .. && pnpm test
```

Expected: 전부 PASS. 루트 스위트는 이번 사이클이 엔진을 안 건드렸으므로 그대로 통과해야 한다 — **실패하면 엔진 불변을 어긴 것이다.**

- [ ] **Step 9: 커밋**

```bash
git add docs/superpowers/specs/2026-09-01-color-palette-ux-polish-design.md web/src/color-palette/ColorPalettePage.tsx
git commit -m "$(cat <<'EOF'
docs(spec): 세로 예산 절을 예측에서 실측으로 교체

1440×900 emulate 오버라이드(innerWidth/innerHeight 선확인)로 재측정하고
390px 좁은 화면의 wrap도 확인했다. 알려진 한계 7(pin 소멸 배너 상태에서
예산 초과) 해소 여부를 실측으로 확정한다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## 자체 검토 기록

**스펙 커버리지.** D1 → Task 1. D2 → Task 2. D3 → Task 3(렌더) + Task 4(배선). D4·D5 → Task 5(매핑 + 요소). 뒤집는 판단 1(3.1 D2 은퇴) → Task 5의 주석 교체. 뒤집는 판단 2(3.3 D3) → Task 1의 테스트 교체. 뒤집는 판단 3(3.3 D5 근거 소멸) → Task 1 Step 3의 h1 주석. 세로 예산 → Task 6.

**계획을 쓰며 찾은 것 둘 — 스펙에 없던 파급이다.**

1. **`shiftHighlightTargets`가 `mockTargetFor`를 `SCALE_ORDER` 전부에 묻는다.** 그래서 D5의 매핑 변경이 `"한 번에 고치기"` 직후 강조에도 파급한다 — `text-strong` 이동 시 `error-badge` 대신 `warning`/`success`/`info` 배지가 켜진다. **그리고 그게 사실이다**(상태 칩 셋은 `text-strong`을 읽고 실패 칩은 안 읽는다). Task 5 Step 5로 다뤘고 스펙에도 한 줄 더한다.
2. **`NeutralControl`의 `자동으로` 버튼이 무채색에서 사라질 뻔했다.** 원본은 강도 그룹 밖에 있어 무채색에서도 보였는데, 라벨 인라인화로 강도 행 안에 들이면 `!achromatic` 조건에 딸려 사라진다 — 되돌릴 길이 없어지는 함정이다. Task 2 Step 3의 마지막 블록과 ⚠️로 다뤘다.

**타입 일관성.** `emphasis?: number | null`(Task 3 정의 → Task 4 사용), `onPickingActivity: () => void`(Task 4 양쪽), `MockTarget` 유니온 셋(Task 5 안에서 정의 → 사용), `data-testid` 넷(`palette-section`·`download-section`·`neutral-section`·`accent-picker`) — 정의 태스크와 사용 태스크가 일치한다. `accent-picker`는 기존 `AccentInput`에 이미 있다.
