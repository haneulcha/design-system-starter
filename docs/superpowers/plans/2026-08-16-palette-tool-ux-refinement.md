# 팔레트 도구 UX 다듬기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/color-palette`를 실제로 써 보고 나온 마찰 셋을 고친다 — 앵커 미세조정 불가, 목업이 아무것도 안 알려줌, 누를 수 있다는 어포던스 약함.

**Architecture:** 전부 `web/` 안에서 끝난다. 엔진(`src/color/`)·산출(`src/export/`)·상태 계약(`paletteState`·`paletteUrl`)은 한 줄도 안 바뀐다. 세 태스크가 서로 독립이라 순서를 바꿔도 된다.

**Tech Stack:** React 19 · Vite 6 · Vitest 4 · Tailwind v4

**Spec:** `docs/superpowers/specs/2026-08-16-palette-tool-ux-refinement-design.md`

## Global Constraints

- web 테스트: `cd web && npx vitest run` · web 타입체크: `cd web && npx tsc -b`
- 루트도 깨지면 안 됨: `pnpm test` · `npx tsc --noEmit`
- **`web/` 안의 상대 import는 확장자를 붙이지 않는다** (`moduleResolution: "bundler"`). 루트 엔진만 `@core/` 별칭 + `.js`
- 주석은 한국어. "왜 이 값인가"를 남기고 "무엇을 하는가"는 코드가 말하게 한다
- 커밋 메시지는 영어 타입 접두사 + 한국어 본문, 마지막 줄에 `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
- **현재 루트 1015 / web 65 통과 중.** 기존 테스트를 깨뜨리지 않는다 — 단 Task 3은 예외가 하나 있다(Task 3에 명시)
- **`getAllByTestId("swatch")` 66개**와 `#builder` 스모크 테스트, `App.test.tsx` 라우팅 테스트는 어느 태스크에서도 깨지면 안 된다

---

## File Structure

| 파일 | 태스크 | 변경 |
| --- | --- | --- |
| `web/src/components/OklchPicker.tsx` | 1 | L·C·H 숫자 칸 추가 (`NumberField` 내부 컴포넌트) |
| `web/src/components/OklchPicker.test.tsx` | 1 | 신설 |
| `web/src/color-palette/PreviewPane.tsx` | 2 | `Mock` 재작성 |
| `web/src/color-palette/ColorPalettePage.test.tsx` | 2 | 목업 케이스 추가 |
| `web/src/color-palette/AdjustableScale.tsx` | 3 | depth + 커서 + 포커스 링, 캡션 구분 제거 |
| `web/src/color-palette/AdjustableScale.test.tsx` | 3 | 캡션 단언 → depth 단언으로 교체 |

---

## Task 1: 앵커에 OKLCH 숫자 칸

**Files:**
- Modify: `web/src/components/OklchPicker.tsx`
- Create: `web/src/components/OklchPicker.test.tsx`

**Interfaces:**
- Consumes: `clampChromaToGamut`·`oklchToHex` (`web/src/lib/oklch`, 이미 import돼 있음), `CHROMA_MAX`(파일 안 상수, 현재 `0.4`)
- Produces: `OklchPicker`의 공개 props(`hex`·`onChange`)는 **바뀌지 않는다** — 소비처(`AccentInput`, `BuilderPage`)를 안 건드린다

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```tsx
// web/src/components/OklchPicker.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OklchPicker } from "./OklchPicker";

/** 제어 컴포넌트라 부모가 hex를 되먹여야 실제 사용과 같아진다. */
function Harness({ initial = "#3b82f6" }: { initial?: string }) {
  const [hex, setHex] = React.useState(initial);
  return (
    <>
      <OklchPicker hex={hex} onChange={setHex} />
      <output data-testid="hex">{hex}</output>
    </>
  );
}

describe("OklchPicker 숫자 칸", () => {
  it("L·C·H 세 칸을 그린다", () => {
    render(<Harness />);
    expect(screen.getByLabelText("L")).toBeTruthy();
    expect(screen.getByLabelText("C")).toBeTruthy();
    expect(screen.getByLabelText("H")).toBeTruthy();
  });

  // 미세조정이 이 태스크의 존재 이유다 — 스텝이 굵으면 의미가 없다.
  it("L 칸의 스텝이 0.001이다", () => {
    render(<Harness />);
    expect(screen.getByLabelText("L").getAttribute("step")).toBe("0.001");
  });

  it("L을 치면 hex가 따라온다", () => {
    render(<Harness />);
    const before = screen.getByTestId("hex").textContent;
    fireEvent.change(screen.getByLabelText("L"), { target: { value: "0.700" } });
    expect(screen.getByTestId("hex").textContent).not.toBe(before);
  });

  // gamut 밖 조합을 조용히 자르면 "왜 안 들어가지"가 된다 (스펙 D1).
  it("gamut 밖 채도를 치면 잘린 값이 칸에 되돌아온다", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("L"), { target: { value: "0.950" } });
    const c = screen.getByLabelText("C") as HTMLInputElement;
    fireEvent.change(c, { target: { value: "0.300" } });
    expect(Number(c.value)).toBeLessThan(0.3);
    expect(Number(c.value)).toBeGreaterThan(0);
  });

  // 중간 상태("0.", "")가 통과 못 하면 한 글자씩 못 친다 — AccentInput에서
  // 같은 버그를 이미 한 번 고쳤다.
  it("중간 입력 상태를 되돌리지 않는다", () => {
    render(<Harness />);
    const l = screen.getByLabelText("L") as HTMLInputElement;
    fireEvent.change(l, { target: { value: "0." } });
    expect(l.value).toBe("0.");
  });

  it("blur 시 무효 입력을 마지막 유효값으로 되돌린다", () => {
    render(<Harness />);
    const l = screen.getByLabelText("L") as HTMLInputElement;
    const valid = l.value;
    fireEvent.change(l, { target: { value: "" } });
    fireEvent.blur(l);
    expect(l.value).toBe(valid);
  });
});
```

`React`를 import해야 한다(`import React from "react"` 또는 `useState`를 named import).

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && npx vitest run src/components/OklchPicker.test.tsx --reporter=verbose`
Expected: FAIL — `getByLabelText("L")`이 못 찾는다. **실패 출력 전문을 보고서에 남긴다.**

- [ ] **Step 3: `NumberField`를 만든다**

`OklchPicker.tsx` 안에, `HueStrip` 아래에 둔다.

```tsx
// ─── 숫자 칸 ────────────────────────────────────────────────────────────────
//
// 피커 드래그는 1px이 L 0.007씩 튀어 미세조정이 안 된다. 화살표 키로 넛지하거나
// 직접 칠 수 있는 칸을 둔다 (스펙 D1).
//
// 초안(draft)을 로컬 상태로 두는 이유: 제어 입력에서 "유효할 때만 갱신"하면
// "0." 같은 중간 상태가 통과하지 못해 한 글자씩 칠 수 없다.

function NumberField({
  label, value, min, max, step, decimals, onCommit,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly decimals: number;
  readonly onCommit: (n: number) => void;
}) {
  const shown = value.toFixed(decimals);
  const [draft, setDraft] = useState(shown);
  const lastShown = useRef(shown);
  // 바깥(피커 드래그·hex 입력)에서 값이 바뀌면 초안을 따라가게 한다.
  useEffect(() => {
    if (shown !== lastShown.current) {
      lastShown.current = shown;
      setDraft(shown);
    }
  }, [shown]);

  return (
    <label className="flex items-center gap-1 text-[10px] text-neutral-500">
      <span className="w-3 font-mono">{label}</span>
      <input
        aria-label={label}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(n)) {
            onCommit(Math.min(max, Math.max(min, n)));
          }
        }}
        onBlur={() => setDraft(lastShown.current)}
        className="w-16 rounded border border-neutral-300 px-1 py-0.5 font-mono text-[11px]"
      />
    </label>
  );
}
```

- [ ] **Step 4: 피커에 붙인다**

`OklchPicker`의 반환값에 `HueStrip` 다음 줄로 더한다:

```tsx
      <div className="flex gap-2 pt-1">
        <NumberField
          label="L" value={lch.l} min={0} max={1} step={0.001} decimals={3}
          onCommit={(l) => commit({ ...lch, c: clampChromaToGamut(l, lch.c, lch.h), l })}
        />
        <NumberField
          label="C" value={lch.c} min={0} max={CHROMA_MAX} step={0.001} decimals={3}
          onCommit={(c) => commit({ ...lch, c: clampChromaToGamut(lch.l, c, lch.h) })}
        />
        <NumberField
          label="H" value={lch.h} min={0} max={360} step={0.5} decimals={1}
          onCommit={(h) => commit({ ...lch, c: clampChromaToGamut(lch.l, lch.c, h), h })}
        />
      </div>
```

**세 축 모두 클램프를 거치는 이유:** L이나 H가 바뀌면 그 자리에서 가능한 최대 채도가 달라진다. 클램프하지 않으면 `oklchToHex`가 채널별로 잘라내면서 hue가 조용히 틀어진다(시맨틱 앵커에서 같은 문제를 이미 겪었다 — `src/color/semantic.ts` 주석 참조).

`clampChromaToGamut`은 이미 import돼 있다. `useState`·`useEffect`·`useRef`도 이미 import돼 있다.

- [ ] **Step 5: 파일 상단 주석을 갱신한다**

`UI:` 문단에 숫자 칸을 더한다 — 지금은 패드와 hue 스트립만 적혀 있다.

- [ ] **Step 6: 통과를 확인한다**

```bash
cd web && npx vitest run src/components/OklchPicker.test.tsx --reporter=verbose
cd web && npx vitest run && npx tsc -b
```
Expected: 신규 6건 PASS, 기존 65건 PASS. **`#builder`도 숫자 칸을 얻는다** — 의도된 것이니 `BuilderPage.test.tsx`가 깨지지 않는지만 확인한다.

- [ ] **Step 7: 브라우저에서 확인한다**

`cd web && npm run dev`로 띄우고 `/color-palette`에서 L 칸에 포커스를 준 뒤 **위/아래 화살표 키**를 눌러 팔레트가 미세하게 움직이는지 본다. 스크린샷을 찍어 보고서에 경로를 남긴다.

- [ ] **Step 8: 커밋**

```bash
git add web/src/components/OklchPicker.tsx web/src/components/OklchPicker.test.tsx
git commit -m "feat(web): 피커에 OKLCH 숫자 칸 — 앵커 미세조정

피커 드래그는 1px이 L 0.007씩 튀어 미세조정이 안 됐다. HSL이 아니라
OKLCH 세 축을 그대로 노출한다 — 필요한 건 익숙한 모델이 아니라 정밀도였고,
HSL을 들이면 엔진과 다른 두 번째 색 모델이 생긴다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 목업을 카드 하나에 여러 요소로

**Files:**
- Modify: `web/src/color-palette/PreviewPane.tsx` (`Mock` 함수만)
- Modify: `web/src/color-palette/ColorPalettePage.test.tsx` (케이스 추가)

**Interfaces:**
- Consumes: `stopIdx`(같은 파일), `onSolidColor`(`@core/color/contrast.js`), `ScaleSet`·`ScaleRole`
- Produces: `Mock`의 props(`theme`·`scales`·`roles`)는 **바뀌지 않는다**. `data-testid="mock-light"`/`"mock-dark"`도 그대로 — 기존 테스트가 쓴다

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`ColorPalettePage.test.tsx`에 더한다:

```tsx
// 막대가 여러 stop을 나란히 놓는 것이 이 목업의 존재 이유다 — 카드+버튼+배지는
// 액센트를 500 하나와 극단값 몇 개로만 써서 사다리를 안 보여준다 (스펙 D2).
it("목업에 액센트 stop이 다른 막대 5개가 있다", () => {
  render(<ColorPalettePage />);
  const bars = screen.getAllByTestId("mock-bar");
  expect(bars.length).toBe(10); // 라이트 5 + 다크 5
  const light = bars.slice(0, 5).map((b) => b.getAttribute("style"));
  expect(new Set(light).size).toBe(5); // 다섯이 서로 다른 색
});

it("솔리드 버튼 글자색이 엔진의 onSolidColor와 같다", () => {
  render(<ColorPalettePage />);
  const scales = deriveScales(defaultState());
  const btn = screen.getAllByTestId("mock-solid-btn")[0];
  expect(btn.getAttribute("style")).toContain(onSolidColor(scales.accent[5]));
});
```

import를 더한다: `deriveScales`·`defaultState`(`./paletteState`), `onSolidColor`(`@core/color/contrast.js`).

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && npx vitest run src/color-palette/ColorPalettePage.test.tsx --reporter=verbose`
Expected: FAIL — `mock-bar`가 없다. **실패 출력 전문을 남긴다.**

- [ ] **Step 3: `Mock`을 재작성한다**

```tsx
/** 막대가 쓰는 stop. 사다리 가운데 구간이라 인접 stop이 구분되는지가 가장 잘
 *  드러난다. 높이는 팔레트와 무관한 고정값 — 높이가 색에 따라 달라지면 무엇을
 *  보는 것인지 흐려진다 (스펙 D2). */
const BAR_STOPS = [3, 4, 5, 6, 7] as const;
const BAR_HEIGHTS = [26, 42, 34, 48, 38] as const;

function Mock({
  theme, scales, roles,
}: { theme: "light" | "dark"; scales: ScaleSet; roles: readonly ScaleRole[] }) {
  const at = (hexes: readonly string[], id: string) => hexes[stopIdx(roles, id, theme)];
  const a = scales.accent;
  const n = scales.neutral;
  const err = scales.semantic.error;
  const solid = at(a, "solid");
  return (
    <div
      data-testid={`mock-${theme}`}
      className="rounded-lg p-3"
      // 페이지는 뉴트럴 hover-bg, 카드는 subtle-bg — 다크에서 카드가 페이지보다
      // 어두워지는 것은 역할표의 미러 규칙이 그렇게 말하기 때문이다.
      style={{ background: at(n, "hover-bg") }}
    >
      <div
        className="rounded-md border p-3 space-y-3"
        style={{ background: at(n, "subtle-bg"), borderColor: at(n, "border") }}
      >
        <div>
          <div className="text-[11px] font-semibold" style={{ color: at(n, "text-strong") }}>
            주간 활성 사용자
          </div>
          <div className="text-[10px]" style={{ color: at(n, "text") }}>
            지난 5주
          </div>
        </div>

        <div className="flex items-end gap-1.5" style={{ height: 48 }}>
          {BAR_STOPS.map((s, i) => (
            <div
              key={s}
              data-testid="mock-bar"
              className="flex-1 rounded-sm"
              style={{ background: a[s], height: BAR_HEIGHTS[i] }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span
            data-testid="mock-solid-btn"
            className="rounded px-2.5 py-1 text-[11px] font-medium"
            style={{ background: solid, color: onSolidColor(solid) }}
          >
            보고서 열기
          </span>
          <span
            className="rounded border px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: at(a, "subtle-bg"),
              borderColor: at(a, "border"),
              color: at(a, "text-strong"),
            }}
          >
            공유
          </span>
          <span
            className="ml-auto rounded px-1.5 py-0.5 text-[10px]"
            style={{ background: at(err, "subtle-bg"), color: at(err, "text-strong") }}
          >
            실패 2
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 통과를 확인한다**

```bash
cd web && npx vitest run && npx tsc -b
```
Expected: 전부 PASS. 기존 뱃지·고치기 테스트가 안 깨지는지 특히 확인한다(같은 파일을 건드렸다).

- [ ] **Step 5: 브라우저에서 확인한다 — 이 태스크는 눈으로 봐야 한다**

`/color-palette`에서 **세 앵커**를 보고 각각 스크린샷을 남긴다:
- `#3b82f6`(파랑) — 막대 다섯이 구분되는가?
- `#eab308`(노랑) — 밝은 쪽 gamut이 좁은 앵커에서도 구분되는가?
- `#8b5cf6`(보라)

**막대가 거의 같아 보이는 앵커가 있으면 그건 사실이지 버그가 아니다**(스펙 알려진 한계 1). 다만 다섯 개 **전부** 구분이 안 되는 앵커가 있으면 보고하라 — `BAR_STOPS`를 넓혀야 한다는 신호일 수 있다.

- [ ] **Step 6: 커밋**

```bash
git add web/src/color-palette/PreviewPane.tsx web/src/color-palette/ColorPalettePage.test.tsx
git commit -m "feat(web): 목업을 카드 하나에 여러 요소로 — 막대 그래프 추가

카드+버튼+배지는 디자인 토큰 데모의 정석이라 아무것도 안 알려줬다.
특히 사다리가 실제로 어떻게 보이는지를 — 액센트를 500 하나와 극단값
몇 개로만 썼다. 막대 그래프는 여러 stop을 한 화면에 나란히 놓는 거의
유일한 자연스러운 UI라, 사다리가 어디서 뭉치는지가 조작 중에 보인다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 어포던스를 depth로

**Files:**
- Modify: `web/src/color-palette/AdjustableScale.tsx`
- Modify: `web/src/color-palette/AdjustableScale.test.tsx`

**Interfaces:**
- `AdjustableScale`의 props는 **바뀌지 않는다**. `data-testid="swatch"`(66개)와 `data-testid="stop-caption"`도 그대로 둔다 — 캡션 요소 자체는 남고 **클래스 구분만** 없어진다

> **경고 — Task 1(사이클 3)의 규범이 여기엔 적용되지 않는다.** 이 태스크는 캡션의 굵기 구분을 **의도적으로 되돌린다**(depth가 그 일을 하므로 신호가 둘이면 캡션이 소음이 된다 — 스펙 D3). 따라서 `AdjustableScale.test.tsx`에서 캡션 클래스가 갈리는지 보는 단언이 **깨지는 것이 정상**이다. Step 3이 그 교체를 지시한다. **depth 추가를 되돌리지 말 것.**

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`AdjustableScale.test.tsx`의 **캡션 단언을 지우고** 이것으로 교체한다:

```tsx
// 어포던스는 depth로 준다 — 크기·표식은 정적 표시라 "누를 수 있다"만 말하고
// 끝나는데, 그림자는 hover에서 뜨고 press에서 눌리면서 상호작용 전체를 한
// 언어로 잇는다 (스펙 D3).
it("조정 가능한 stop만 그림자를 갖는다", () => {
  render(
    <AdjustableScale
      hexes={ELEVEN_HEXES}
      adjustable={[0, 3, 7, 10]}
      pinned={[]}
      onPick={() => {}}
    />,
  );
  const swatches = screen.getAllByTestId("swatch");
  const raised = swatches.filter((s) => s.className.includes("shadow"));
  expect(raised.length).toBe(4);
  for (const i of [0, 3, 7, 10]) {
    expect(swatches[i].className).toContain("shadow");
  }
});

it("조정 가능한 stop이 포인터 커서와 포커스 링을 갖는다", () => {
  render(
    <AdjustableScale
      hexes={ELEVEN_HEXES}
      adjustable={[0, 3, 7, 10]}
      pinned={[]}
      onPick={() => {}}
    />,
  );
  const s = screen.getAllByTestId("swatch")[3];
  expect(s.className).toContain("cursor-pointer");
  expect(s.className).toContain("focus-visible:ring");
});

// 신호가 둘이면 캡션이 소음이 된다 — depth가 그 일을 한다.
it("캡션은 더 이상 굵기로 가르지 않는다", () => {
  render(
    <AdjustableScale
      hexes={ELEVEN_HEXES}
      adjustable={[0, 3, 7, 10]}
      pinned={[]}
      onPick={() => {}}
    />,
  );
  const classes = new Set(
    screen.getAllByTestId("stop-caption").map((c) => c.className),
  );
  expect(classes.size).toBe(1);
});
```

`ELEVEN_HEXES`가 기존 파일에 없으면 11개짜리 배열을 만들어 쓴다.

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web && npx vitest run src/color-palette/AdjustableScale.test.tsx --reporter=verbose`
Expected: FAIL — 그림자·커서·포커스 클래스가 없고, 캡션 클래스가 2종이다. **실패 출력 전문을 남긴다.**

- [ ] **Step 3: 컴포넌트를 고친다**

버튼 갈래의 `className`을 교체한다:

```tsx
                className={`block w-full h-9 rounded-sm border cursor-pointer
                  shadow-sm hover:shadow-md active:shadow-none active:translate-y-px
                  transition-shadow
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-neutral-900 focus-visible:ring-offset-1 ${
                  pinned.includes(i) ? "border-neutral-900" : "border-neutral-300"
                }`}
```

(Tailwind 클래스에 줄바꿈이 들어가도 무방하다. 한 줄로 붙여도 된다.)

캡션의 분기를 없앤다:

```tsx
              <div
                data-testid="stop-caption"
                className="mt-1 text-center text-[9px] font-mono text-neutral-400"
              >
```

파일 상단 주석과 캡션 위 주석을 새 근거로 고친다 — 지금은 "색이 아니라 캡션의 굵기·명도로 표시한다"고 적혀 있는데 그게 아니게 된다. **depth를 고른 이유**(정적 표시가 아니라 press까지 잇는다)를 남긴다.

- [ ] **Step 4: 통과를 확인한다**

```bash
cd web && npx vitest run && npx tsc -b
```
Expected: 전부 PASS. **66 스와치와 `#builder` 테스트가 안 깨지는지 확인한다.**

- [ ] **Step 5: 브라우저에서 확인한다**

`/color-palette`에서:
- 조정 가능한 4개가 **hover 없이도** 떠 보이는가
- 마우스를 올리면 더 뜨는가, 누르는 동안 가라앉는가
- **밝은 stop(50)에서도 그림자가 읽히는가** — 흰 배경 위 옅은 색이라 대비가 낮을 수 있다(스펙 알려진 한계 3). 안 읽히면 보고하라
- Tab 키로 이동할 때 포커스 링이 보이는가

스크린샷 경로를 보고서에 남긴다.

- [ ] **Step 6: 커밋**

```bash
git add web/src/color-palette/AdjustableScale.tsx web/src/color-palette/AdjustableScale.test.tsx
git commit -m "fix(web): 조정 가능한 stop의 어포던스를 depth로

캡션 굵기 구분은 정적 표시라 '누를 수 있다'만 말하고 끝났다. 어포던스가
약했던 진짜 이유는 상태가 hover 링 하나뿐이라 눌리는 느낌이 없었던 것이다.
그림자는 hover에서 뜨고 press에서 눌리면서 상호작용 전체를 한 언어로 잇는다.

cursor-pointer와 포커스 링이 아예 없던 것도 함께 고친다 — button은 기본이
화살표 커서라 누를 수 있다는 표준 신호가 없었다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review 결과

**스펙 커버리지**

| 스펙 | 태스크 |
| --- | --- |
| D1 OKLCH 숫자 칸 (앵커, 피커 안에) | Task 1 |
| D1 gamut 밖은 잘린 값을 되돌려 보임 | Task 1 Step 1·4 |
| D2 카드 하나 · 제목/부제목/막대/버튼/상태 | Task 2 |
| D2 막대 300–700, 높이 고정 | Task 2 Step 3 |
| D3 depth (기본/hover/press) | Task 3 |
| D3 캡션 구분 제거 | Task 3 Step 1·3 |
| D3 커서·포커스 링 (버그) | Task 3 |
| 테스트 전 항목 | Task 1·2·3의 Step 1 |

**의도적으로 안 하는 것:** 스펙의 "알려진 한계" 3항목은 그대로 남는다 — 막대의 고정 stop, 숫자 칸이 앵커에만 붙는 것, 밝은 stop에서 그림자가 약할 수 있는 것. 셋 다 브라우저 확인 단계에서 실제로 문제인지 보고 판단한다.
