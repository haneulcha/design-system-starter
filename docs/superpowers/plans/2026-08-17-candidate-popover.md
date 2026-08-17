# 후보 선택 Popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 액센트 띠에서 조정 가능한 stop을 누르면 뜨는 후보 카드를, 누른 칸 아래에 앵커된 Popover로 바꾸고, 그 스와치의 hover 그림자 리프트를 없앤다.

**Architecture:** 공용 `Popover` 프리미티브를 `web/src/components/`에 새로 만든다(Radix/Base UI의 닫힘·포커스 계약을 손으로 구현, 의존성 추가 없음). 위치 계산은 순수 함수(`clampOffset`)로 분리해 DOM 없이 테스트한다. `<Popover>` 래퍼는 `AdjustableScale`이 렌더하고(트리거 버튼을 자기가 그리므로 ref와 ARIA의 주인이다), `ColorPalettePage`는 내용물(`<CandidatePopover/>`)만 넘긴다. 후보 계산 로직은 한 줄도 안 건드린다.

**Tech Stack:** React 19 · TypeScript · Tailwind v4 · Vitest 4 + @testing-library/react + jsdom

**설계 문서:** `docs/superpowers/specs/2026-08-17-candidate-popover-design.md` — 판단의 근거는 전부 거기 있다. 이 계획은 그 결정을 실행할 뿐이다.

## Global Constraints

- **작업 디렉터리는 `web/`이다.** 모든 테스트 명령은 `cd /Users/haneul/Projects/design-system-starter/web`에서 실행한다.
- **새 의존성을 추가하지 않는다.** `floating-ui`도 `@radix-ui/react-popover`도 설치하지 않는다. 참조만 한다.
- **`web/src/color-palette/ColorPalettePage.test.tsx`의 기존 테스트는 한 줄도 수정하지 않는다.** 새 테스트 1개를 **추가**만 한다. 기존 테스트가 깨지면 그것은 구현이 틀린 것이다.
- **후보 계산 로직 불변:** `CandidatePopover.tsx`의 `contextPins` · `dedupeByHex` · `previewScale`과 `paletteState.ts` · `paletteUrl.ts`는 건드리지 않는다.
- **주석은 한국어로, "무엇"이 아니라 "왜"를 적는다.** 기존 파일들의 주석 밀도와 어조를 따른다.
- **Tailwind 임의값 문법**(`shadow-[0_2px_0_0_var(--color-neutral-300)]`)이 이 코드베이스의 기존 방식이다.
- 커밋 메시지는 한국어 본문, `feat(color-palette):` / `refactor(components):` 류의 conventional prefix.

---

## File Structure

| 파일 | 책임 |
| --- | --- |
| `web/src/components/popoverPosition.ts` (신규) | 순수 기하. 패널을 경계 안으로 되미는 px 오프셋 계산. DOM 없음. |
| `web/src/components/popoverPosition.test.ts` (신규) | 위 함수의 단위 테스트. |
| `web/src/components/Popover.tsx` (신규) | 앵커 기준 absolute 패널 + 화살표 + 닫힘/포커스 계약. 트리거는 안 그린다. |
| `web/src/components/Popover.test.tsx` (신규) | **닫힘 계약의 유일한 방어선.** `fireEvent.pointerDown`을 쓰는 유일한 파일. |
| `web/src/color-palette/AdjustableScale.tsx` (수정) | hover 그림자 제거 · 칸 `relative` · 트리거 ref/ARIA · `<Popover>` 렌더. |
| `web/src/color-palette/AdjustableScale.test.tsx` (수정) | 테스트 2개 추가. |
| `web/src/color-palette/CandidatePopover.tsx` (수정) | 카드 크롬 제거 · 라디오 `onFocus` 프리뷰. 계산 로직 불변. |
| `web/src/color-palette/ColorPalettePage.tsx` (수정) | popover를 형제가 아니라 `AdjustableScale`에 prop으로 넘김. |
| `web/src/color-palette/ColorPalettePage.test.tsx` (추가만) | "다른 스와치로 옮겨가기" 테스트 1개. |

**작업 순서의 이유:** Task 1→2는 아래에서 위로 쌓는다(순수 함수 → 컴포넌트). Task 3은 독립적이라 언제 해도 되지만 배선보다 먼저 해두면 Task 5의 diff가 hover 제거와 섞이지 않는다. Task 4는 Popover 안으로 들어가기 전에 내용물을 미리 준비하는 단계라, 이 시점에도 화면은 (크롬 없는 카드로) 여전히 동작한다. Task 5가 실제 이동이다.

---

### Task 1: 위치 계산 순수 함수

**Files:**
- Create: `web/src/components/popoverPosition.ts`
- Test: `web/src/components/popoverPosition.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `export interface Bounds { readonly left: number; readonly right: number }` · `export function clampOffset(panel: Bounds, boundary: Bounds): number`

**왜 분리하는가:** jsdom은 모든 `getBoundingClientRect()`가 0을 준다. 이 계산을 `useLayoutEffect` 안에 두면 테스트에서 검증할 길이 자체가 없다. 순수 함수로 빼면 기하를 숫자로 직접 먹여 검증할 수 있고, 컴포넌트는 "재서 넘긴다"만 남는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`web/src/components/popoverPosition.test.ts`:

```ts
// web/src/components/popoverPosition.test.ts
//
// 실제 기하로 검증한다: 액센트 띠는 왼쪽 컬럼 608px 안에 있고(max-w-5xl 1024 −
// p-8 64 − 사이드 320 − gap-8 32), 칸 하나는 (608−20)/11 ≈ 53px, 패널은 ~170px다.
// stop 950 칸에 중앙 정렬하면 오른쪽으로 넘친다 — 그때 얼마나 되밀어야 하는지가
// 이 함수가 답해야 하는 질문이다.

import { describe, it, expect } from "vitest";
import { clampOffset } from "./popoverPosition";

const BOUNDARY = { left: 0, right: 608 };

describe("clampOffset", () => {
  it("경계 안에 들어오면 되밀지 않는다", () => {
    expect(clampOffset({ left: 200, right: 370 }, BOUNDARY)).toBe(0);
  });

  it("오른쪽으로 넘치면 음수로 되민다", () => {
    // stop 950 칸 중앙 ≈ 581, 패널 170 → 496..666. 오른쪽으로 58 초과.
    expect(clampOffset({ left: 496, right: 666 }, BOUNDARY)).toBe(-58);
  });

  it("왼쪽으로 넘치면 양수로 되민다", () => {
    // stop 50 칸 중앙 ≈ 27, 패널 170 → -58..112.
    expect(clampOffset({ left: -58, right: 112 }, BOUNDARY)).toBe(58);
  });

  // 되밀 자리가 없다 — 밀면 반대쪽이 그만큼 더 나간다. 아무것도 안 하는 게 낫다.
  it("패널이 경계보다 넓으면 되밀지 않는다", () => {
    expect(clampOffset({ left: -20, right: 700 }, BOUNDARY)).toBe(0);
  });

  // jsdom은 모든 rect가 0이다. 이 경우 오프셋이 0이어야 컴포넌트 테스트가
  // 위치 계산 때문에 깨지지 않는다 — 계획 전체가 이 성질에 기대고 있다.
  it("rect가 전부 0이면(jsdom) 0을 낸다", () => {
    expect(clampOffset({ left: 0, right: 0 }, { left: 0, right: 0 })).toBe(0);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
cd /Users/haneul/Projects/design-system-starter/web
pnpm vitest run src/components/popoverPosition.test.ts
```

Expected: FAIL — `Failed to resolve import "./popoverPosition"`

- [ ] **Step 3: 최소 구현**

`web/src/components/popoverPosition.ts`:

```ts
// web/src/components/popoverPosition.ts
//
// 패널은 앵커 칸 중앙에 정렬된다(translateX(-50%)). 칸이 ~53px인데 패널은 ~170px라
// 양끝 stop에서 경계 밖으로 나간다. 넘치는 만큼만 되밀어 넣는다.
//
// 경계는 뷰포트가 아니라 띠 컨테이너다. 이 도구의 액센트 띠는 608px 컬럼 안에
// 있고 그 오른쪽엔 sticky 목업이 붙어 있다 — 뷰포트 기준으로 재면 clamp가 아예
// 발동하지 않은 채 패널이 목업을 덮는다. 그 목업이 후보를 hover하며 보는 대상이라
// 가리면 이 화면의 목적을 거스른다.

export interface Bounds {
  readonly left: number;
  readonly right: number;
}

/** 패널을 경계 안으로 되미는 x 오프셋(px). 되밀 필요·여지가 없으면 0. */
export function clampOffset(panel: Bounds, boundary: Bounds): number {
  // 패널이 경계보다 넓으면 어느 쪽으로 밀어도 반대쪽이 더 나간다.
  if (panel.right - panel.left >= boundary.right - boundary.left) return 0;
  if (panel.left < boundary.left) return boundary.left - panel.left;
  if (panel.right > boundary.right) return boundary.right - panel.right;
  return 0;
}
```

- [ ] **Step 4: 통과를 확인한다**

```bash
cd /Users/haneul/Projects/design-system-starter/web
pnpm vitest run src/components/popoverPosition.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
cd /Users/haneul/Projects/design-system-starter
git add web/src/components/popoverPosition.ts web/src/components/popoverPosition.test.ts
git commit -m "feat(components): popover 위치 clamp 순수 함수

경계는 뷰포트가 아니라 띠 컨테이너다 — 608px 컬럼 밖으로 나가면
sticky 목업을 덮는데, 뷰포트 기준으로는 clamp가 발동조차 안 한다.
jsdom의 0-rect에서 0을 내는 성질을 테스트로 고정한다."
```

---

### Task 2: Popover 컴포넌트

**Files:**
- Create: `web/src/components/Popover.tsx`
- Test: `web/src/components/Popover.test.tsx`

**Interfaces:**
- Consumes: `clampOffset`, `Bounds` (Task 1)
- Produces:
  ```ts
  export function Popover(props: {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly label: string;                              // 패널 aria-label
    readonly id: string;                                 // 트리거의 aria-controls 대상
    readonly triggerRef: React.RefObject<HTMLElement | null>;
    readonly boundaryRef: React.RefObject<HTMLElement | null>;
    readonly children: React.ReactNode;
  }): React.ReactElement | null
  ```

**호출자 계약:** Popover는 트리거를 렌더하지 않는다. 부모가 (a) 트리거 버튼을 직접 그리고 `triggerRef`를 붙이며, (b) `aria-expanded` · `aria-haspopup="dialog"` · `aria-controls={id}`를 트리거에 달고, (c) Popover를 **`position: relative`인 요소 안에** 놓는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`web/src/components/Popover.test.tsx`:

```tsx
// web/src/components/Popover.test.tsx
//
// 이 파일이 닫힘 계약의 유일한 방어선이다. jsdom의 fireEvent.click은 pointerdown을
// 발화하지 않으므로, 페이지 스위트는 바깥-닫기·트리거-제외 코드를 한 번도 실행하지
// 못한다 — 여기서 fireEvent.pointerDown으로 직접 때려야만 검증된다. 이 파일을
// 얇게 만들면 그 계약은 아무도 안 지키게 된다.

import { describe, it, expect, vi } from "vitest";
import { useRef, useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Popover } from "./Popover";

/** 실사용 형태 그대로의 하네스. 두 가지를 제품과 똑같이 맞춘 것이 핵심이다:
 *  트리거는 부모가 그리고, Popover는 **조건부로 마운트된다**. 닫힘이 open=false
 *  재렌더가 아니라 언마운트라는 것이 이 컴포넌트의 실제 사용 조건이라, 마운트해 둔
 *  채 prop만 토글하는 하네스로 검증하면 제품이 안 쓰는 경로를 초록으로 만든다. */
function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const boundaryRef = useRef<HTMLDivElement>(null);
  const close = () => { setOpen(false); onClose?.(); };
  return (
    <div ref={boundaryRef}>
      <div className="relative">
        <button ref={triggerRef} type="button" onClick={() => setOpen((v) => !v)}>
          열기
        </button>
        {open && (
          <Popover
            open
            onClose={close}
            label="후보"
            id="p1"
            triggerRef={triggerRef}
            boundaryRef={boundaryRef}
          >
            <button type="button">안쪽 버튼</button>
          </Popover>
        )}
      </div>
      <button type="button">바깥 버튼</button>
    </div>
  );
}

/** open prop 자체의 계약만 보는 하네스. 제품은 조건부 마운트라 이 경로를 안 쓰지만,
 *  prop이 존재하는 한 그 의미는 지켜져야 한다. */
function AlwaysMounted({ open }: { open: boolean }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const boundaryRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={boundaryRef}>
      <button ref={triggerRef} type="button">열기</button>
      <Popover
        open={open}
        onClose={() => {}}
        label="후보"
        id="p2"
        triggerRef={triggerRef}
        boundaryRef={boundaryRef}
      >
        <button type="button">안쪽</button>
      </Popover>
    </div>
  );
}

describe("Popover", () => {
  it("open=false면 아무것도 렌더하지 않는다", () => {
    render(<AlwaysMounted open={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("패널이 role=dialog이고 라벨을 갖는다", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "열기" }));
    expect(screen.getByRole("dialog", { name: "후보" })).toBeTruthy();
  });

  // D5: 첫 자식(라디오)이 아니라 패널 컨테이너 자신에 포커스한다. 네이티브 라디오
  // 그룹은 화살표 키가 곧 선택이라, 첫 라디오에 포커스가 있으면 "둘러보기"가 확정이
  // 된다. Radix Popover.Content의 실제 기본 동작이기도 하다.
  it("열리면 첫 자식이 아니라 패널 자신에 포커스가 간다", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "열기" }));
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
    expect(document.activeElement).not.toBe(screen.getByRole("button", { name: "안쪽 버튼" }));
  });

  // Esc는 document에서 잡는다 — 비모달이라 Tab이 패널 밖으로 나갈 수 있는데,
  // 패널 keydown으로 잡으면 나간 뒤 Esc가 죽는다.
  it("Esc가 닫고 트리거로 포커스를 되돌린다", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "열기" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("바깥 pointerdown이 닫는다", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "열기" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "바깥 버튼" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // 패널 안에서 눌러 밖에서 뗀 드래그가 닫으면 안 된다 — click이 아니라
  // pointerdown으로 감지하는 이유 자체가 이것이다.
  it("패널 안 pointerdown은 안 닫는다", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "열기" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "안쪽 버튼" }));
    expect(screen.queryByRole("dialog")).toBeTruthy();
  });

  // 트리거는 "바깥"이 아니다. 여기서 닫아버리면 곧이어 오는 click 토글이 다시
  // 열어 "닫힘 → 즉시 재열림"이 된다 — 누른 사람 눈에는 아무 일도 안 일어난다.
  it("트리거 위 pointerdown은 안 닫는다", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const trigger = screen.getByRole("button", { name: "열기" });
    fireEvent.click(trigger);
    fireEvent.pointerDown(trigger);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeTruthy();
  });

  // 트리거의 aria-expanded는 여기서 검증하지 않는다 — Popover는 그 속성에 관여하지
  // 않으므로(부모가 단다) 여기 테스트를 두면 하네스가 하네스를 검증하는 꼴이 되고,
  // Popover에 어떤 회귀가 생겨도 절대 빨개지지 않는다. 실제 방어는 AdjustableScale
  // 쪽 ARIA 테스트가 한다(Task 5).

  // Radix의 onCloseAutoFocus 기본값은 닫힘 사유를 가리지 않는다. 이 화면에서는
  // 후보를 고르면 그 라디오가 언마운트되므로, 복귀가 없으면 포커스가 body로
  // 떨어진다 — 키보드 사용자는 문서 처음부터 다시 Tab을 밟아야 한다.
  it("바깥 클릭으로 닫혀도 포커스가 트리거로 돌아온다", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "열기" });
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole("button", { name: "바깥 버튼" }));
    expect(document.activeElement).toBe(trigger);
  });

  // 포커스가 이미 패널 밖에 있으면 뺏지 않는다 — 비모달이라 Tab으로 나가는 것이
  // 정상 경로이고, 거기서 Esc를 눌렀다고 커서가 순간이동하면 안 된다.
  it("포커스가 패널 밖에 있었으면 트리거로 뺏어오지 않는다", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "열기" }));
    const outside = screen.getByRole("button", { name: "바깥 버튼" });
    outside.focus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(outside);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
cd /Users/haneul/Projects/design-system-starter/web
pnpm vitest run src/components/Popover.test.tsx
```

Expected: FAIL — `Failed to resolve import "./Popover"`

- [ ] **Step 3: 구현**

`web/src/components/Popover.tsx`:

```tsx
// web/src/components/Popover.tsx
//
// 앵커 기준 absolute 팝오버. 도구 자신의 크롬이다 — 이 프로젝트가 생성해서
// 사용자에게 내보내는 디자인 시스템(elevation 카테고리 등)과 무관하다. 섞지 않는다.
//
// Radix / Base UI에서 가져온 계약만 손으로 구현한다(의존성 추가 없음):
//   · 패널 role="dialog" + aria-label, 열리면 패널 컨테이너 자신에 포커스
//   · Esc는 document에서 — 비모달이라 Tab이 패널 밖으로 나가는데, 패널 keydown으로
//     잡으면 나간 뒤 Esc가 죽는다
//   · 바깥 닫기는 click이 아니라 pointerdown — 패널 안에서 눌러 밖에서 뗀 드래그가
//     닫으면 안 된다
//   · 트리거는 "바깥"이 아니다 — 여기서 닫으면 곧이어 오는 click 토글이 다시 열어
//     "닫힘 → 즉시 재열림"이 된다
//   · 닫힘 사유와 무관하게 트리거로 포커스 복귀 (Radix onCloseAutoFocus 기본)
//
// Portal을 쓰지 않는다. 포털이 벌어주는 것(조상의 overflow·z-index 탈출)이 이
// 도구에는 없다 — 모달도 없고 잘라내는 조상도 없다.
//
// 호출자 계약: 트리거는 부모가 그린다(부모가 aria-expanded/haspopup/controls를
// 달고 triggerRef를 붙인다). 부모는 이 컴포넌트를 position:relative인 요소 안에
// 놓아야 한다.

import {
  useEffect, useLayoutEffect, useRef, useState,
  type ReactElement, type ReactNode, type RefObject,
} from "react";
import { clampOffset } from "./popoverPosition";

interface PopoverProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly label: string;
  readonly id: string;
  readonly triggerRef: RefObject<HTMLElement | null>;
  readonly boundaryRef: RefObject<HTMLElement | null>;
  readonly children: ReactNode;
}

export function Popover({
  open, onClose, label, id, triggerRef, boundaryRef, children,
}: PopoverProps): ReactElement | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  // 닫힐 때 포커스를 돌려줄지 판단하는 근거. activeElement를 닫힌 뒤에 읽으면
  // 늦는다 — 그때는 패널이 이미 사라져 포커스가 body로 떨어진 뒤다.
  const focusWasInside = useRef(false);

  // 리스너를 open이 바뀔 때만 갈아끼우기 위한 우회. 호출자가 인라인 화살표
  // 함수를 넘기면(실제로 그렇다) onClose 정체성이 매 렌더 바뀌어, hover 프리뷰로
  // 페이지가 재렌더될 때마다 document 리스너를 떼었다 붙이게 된다.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  // 복귀는 effect 본문이 아니라 cleanup에 있어야 한다. 이 컴포넌트의 실제
  // 닫힘은 open=false 재렌더가 아니라 **언마운트**다 — 호출자가
  // `{i === openIndex && <Popover open … />}`로 조건부 렌더하므로 open prop은
  // 살아 있는 동안 늘 true다. 본문에 두면 제품에서 한 번도 실행되지 않는다.
  //
  // 트리거 요소를 열릴 때 캡처해 두는 것도 같은 이유다: 호출자의 ref도
  // `ref={i === openIndex ? openTriggerRef : undefined}`라 조건부라서, 닫히는
  // 커밋의 mutation 단계에서 React가 `.current`를 null로 떼어버린다. passive
  // effect cleanup은 그 뒤에 돌므로 그때 ref를 읽으면 이미 늦다. 캡처한 DOM
  // 요소 자체는 여전히 문서에 살아 있다.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const trigger = triggerRef.current;
    return () => {
      if (focusWasInside.current) trigger?.focus();
      focusWasInside.current = false;
    };
  }, [open, triggerRef]);

  // 경계 밖으로 나간 만큼 되민다. jsdom은 rect가 전부 0이라 오프셋이 0으로 남고,
  // 그래서 이 계산이 컴포넌트 테스트를 깨뜨리지 않는다.
  useLayoutEffect(() => {
    if (!open) { setOffset(0); return; }
    const panel = panelRef.current?.getBoundingClientRect();
    const boundary = boundaryRef.current?.getBoundingClientRect();
    if (!panel || !boundary) return;
    setOffset(clampOffset(panel, boundary));
  }, [open, boundaryRef]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    const onPointerDown = (e: Event) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, triggerRef]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      onFocus={() => { focusWasInside.current = true; }}
      onBlur={(e) => {
        if (!panelRef.current?.contains(e.relatedTarget)) focusWasInside.current = false;
      }}
      // z-20은 명시적이다 — 옆 컬럼의 sticky 목업이 스태킹 컨텍스트를 만든다.
      // transform은 인라인으로만 준다: Tailwind의 -translate-x-1/2와 섞으면
      // 뒤에 오는 쪽이 이겨서 clamp 오프셋이 조용히 사라진다.
      className="absolute top-full left-1/2 z-20 mt-2 w-max rounded-lg
                 border border-neutral-300 bg-white p-2 shadow-lg focus:outline-none"
      style={{ transform: `translateX(calc(-50% + ${offset}px))` }}
    >
      {/* 화살표는 오프셋의 역부호만큼 되밀어, 패널이 clamp로 밀려도 언제나 앵커
          중앙을 가리킨다 — 어느 stop을 조정 중인지 알려주는 것이 이 화살표의
          유일한 일이라 여기서 어긋나면 없느니만 못하다. */}
      {/* transform 순서를 바꾸지 말 것: translate가 먼저 쓰이면(오른쪽이 먼저
          적용되므로 rotate가 나중) 회전된 축을 따라 밀려 화살표가 대각선으로
          어긋난다. 지금 순서라야 부모의 x축 기준으로 이동한다. */}
      <span
        aria-hidden
        className="absolute -top-1 left-1/2 h-2 w-2 border-l border-t
                   border-neutral-300 bg-white"
        style={{ transform: `translateX(calc(-50% - ${offset}px)) rotate(45deg)` }}
      />
      {children}
    </div>
  );
}
```

- [ ] **Step 4: 통과를 확인한다**

```bash
cd /Users/haneul/Projects/design-system-starter/web
pnpm vitest run src/components/Popover.test.tsx
```

Expected: PASS (9 tests)

- [ ] **Step 5: 전체 스위트가 여전히 통과하는지 본다**

```bash
cd /Users/haneul/Projects/design-system-starter/web
pnpm test
```

Expected: 전부 PASS. 이 시점에는 아직 아무도 `Popover`를 쓰지 않으므로 기존 테스트는 영향이 없어야 한다. 영향이 있다면 뭔가 잘못 건드린 것이다.

- [ ] **Step 6: 커밋**

```bash
cd /Users/haneul/Projects/design-system-starter
git add web/src/components/Popover.tsx web/src/components/Popover.test.tsx
git commit -m "feat(components): 앵커 기준 Popover 프리미티브

Radix/Base UI의 닫힘·포커스 계약만 손으로 구현한다 — 의존성은 안 늘린다.
바깥 닫기는 click이 아니라 pointerdown이고 트리거는 바깥이 아니다(토글이
재열림으로 새지 않도록). 열림 포커스는 첫 자식이 아니라 패널 자신이다 —
라디오 그룹에서 화살표 키가 곧 확정이 되는 함정을 피한다.

이 테스트 파일이 닫힘 계약의 유일한 방어선이다: jsdom의 fireEvent.click은
pointerdown을 안 쏘므로 페이지 스위트는 그 코드를 실행하지 못한다."
```

---

### Task 3: hover 리프트 제거

**Files:**
- Modify: `web/src/color-palette/AdjustableScale.tsx:1-6` (머리 주석), `:39-66` (그림자 주석과 클래스)
- Test: `web/src/color-palette/AdjustableScale.test.tsx` (테스트 1개 추가)

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (동작 변경 없음, 스타일만)

**왜:** 스펙 D4. 근거는 `AdjustableScale.tsx`가 스스로 적어놓은 물리 계약이다 — "press 이동(2px)은 기본 깊이(2px)와 같게 맞춘다, 그림자가 있던 자리에 정확히 내려앉도록". 그런데 마우스로 누르는 순간은 **항상 hover 중**이라 실제로는 4px 그림자에서 2px만 내려간다. 착지가 안 맞는다. hover 제거는 그 물리의 복원이다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`web/src/color-palette/AdjustableScale.test.tsx`의 `describe` 블록 **맨 끝**에 추가한다 (기존 4개는 그대로 둔다):

```tsx
  // D4: 팔레트는 색을 나란히 놓고 비교하는 표면이라 마우스가 띠 위를 자주
  // 가로지른다 — hover 리프트는 "지나가는 것"과 "고르려는 것"을 구별하지 못한다.
  // 더 결정적으로, 누르는 순간은 항상 hover 중이라 4px 그림자에서 2px만 내려가
  // "그림자 자리에 정확히 내려앉는다"는 이 파일의 물리 계약이 깨져 있었다.
  it("조정 가능한 stop에 hover 그림자가 없다 — 기본 깊이와 press는 남는다", () => {
    render(
      <AdjustableScale
        hexes={HEXES}
        adjustable={[0, 3, 7, 10]}
        pinned={[]}
        onPick={() => {}}
      />,
    );
    const s = screen.getAllByTestId("swatch")[3];
    expect(s.className).not.toContain("hover:shadow");
    expect(s.className).toContain("shadow-[0_2px");   // 기본 깊이는 남는다
    expect(s.className).toContain("active:shadow-none"); // press도 남는다
  });
```

- [ ] **Step 2: 실패를 확인한다**

```bash
cd /Users/haneul/Projects/design-system-starter/web
pnpm vitest run src/color-palette/AdjustableScale.test.tsx
```

Expected: FAIL — 5개 중 1개 실패, `expect(className).not.toContain("hover:shadow")`

- [ ] **Step 3: 구현 — 클래스 두 줄 삭제**

`AdjustableScale.tsx`의 `className` 삼항에서 `hover:shadow-*` 두 줄만 지운다. 결과는 이렇게 된다:

```tsx
                className={`block w-full h-9 rounded-sm border cursor-pointer
                  active:shadow-none active:translate-y-[2px]
                  transition-[box-shadow,transform]
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-neutral-900 focus-visible:ring-offset-1 ${
                  pinned.includes(i)
                    ? `border-neutral-700
                       shadow-[0_2px_0_0_var(--color-neutral-700)]`
                    : `border-neutral-300
                       shadow-[0_2px_0_0_var(--color-neutral-300)]`
                }`}
```

- [ ] **Step 4: 낡은 주석을 고친다**

파일 머리 주석(`:1-6`)에서 hover를 근거로 쓰는 문장을 바꾼다:

```tsx
// web/src/color-palette/AdjustableScale.tsx
//
// 11-stop 띠. 조정 가능한 자리는 누르기 전에 구분되게 표시한다 — "눌러보면 뭔가
// 나온다"는 발견에 기대지 않는다 (스펙 D3). 어포던스는 depth로 준다 — 캡션의
// 굵기·명도 같은 정적 표시는 "누를 수 있다"만 말하고 끝나지만, 그림자는 press에서
// 눌리면서 어포던스와 피드백을 한 언어로 잇는다.
```

그리고 그림자 주석 블록(`:39-53`)에서 hover 델타를 설명하는 문장들을 걷어낸다. 바뀐 블록:

```tsx
                // 그림자는 Tailwind 기본 shadow-sm/lg가 아니라 커스텀 값이다 —
                // 36px 칩에서 기본 스케일은 배율 1에서 거의 안 보였다(사용자 확인).
                // 광원은 북쪽 고정: 가로 오프셋 0. 대각선을 주면 "종이 조각"처럼
                // 읽히고, 세로만 주면 "눌리는 버튼"으로 읽힌다.
                // 블러는 0 — 블러가 있으면 이 칩 크기에서 대비가 흩어져 신호가 죽는다.
                // press 시 이동 거리(2px)는 기본 깊이(2px)와 같게 맞춘다 — 눌렀을 때
                // 칩이 그림자가 있던 자리에 정확히 내려앉도록. 두 값은 항상 같이
                // 움직여야 한다. hover 리프트를 뺀 이유가 바로 이 대응이다(스펙 D4):
                // 마우스로 누르는 순간은 항상 hover 중이라, hover가 깊이를 4px로
                // 올려놓으면 2px만 내려가 착지가 어긋났다.
                // 그림자 색은 그 상태의 테두리 색과 같다 — 한 칩에 서로 다른
                // 회색이 둘(테두리 하나, 그림자 하나) 있으면 어색해 보인다는
                // 지적이 있었다. pin 여부에 따라 테두리·그림자가 함께
                // neutral-300 ↔ neutral-700으로 움직여 위계도 더 분명해진다.
```

- [ ] **Step 5: 통과를 확인한다**

```bash
cd /Users/haneul/Projects/design-system-starter/web
pnpm vitest run src/color-palette/AdjustableScale.test.tsx
```

Expected: PASS (5 tests). 특히 기존 `"조정 가능한 stop만 그림자를 갖는다"`가 여전히 통과해야 한다 — 기본 2px 그림자를 남겼으므로 통과한다. 실패한다면 그림자를 너무 많이 지운 것이다.

- [ ] **Step 6: 커밋**

```bash
cd /Users/haneul/Projects/design-system-starter
git add web/src/color-palette/AdjustableScale.tsx web/src/color-palette/AdjustableScale.test.tsx
git commit -m "fix(color-palette): 조정 가능 스와치의 hover 리프트 제거

이 파일이 적어둔 물리 계약(press 이동 2px = 기본 깊이 2px, 그림자 자리에
정확히 내려앉는다)이 hover에서 이미 깨져 있었다 — 마우스로 누르는 순간은
항상 hover 중이라 4px에서 2px만 내려간다. 제거는 D3에 대한 반대가 아니라
D3가 세운 물리의 복원이다.

기본 깊이와 press 눌림은 남는다 — 어포던스를 지는 것은 그 둘이다."
```

---

### Task 4: 후보 내용물 준비 (카드 크롬 제거 + 키보드 프리뷰)

**Files:**
- Modify: `web/src/color-palette/CandidatePopover.tsx:49-90`

**Interfaces:**
- Consumes: 없음
- Produces: `CandidatePopover`의 props 시그니처는 **그대로다** — `{ stopIndex, state, onHover, onChoose, onClose }`. 바뀌는 것은 렌더 결과뿐이다.

**왜 지금:** Popover 안으로 옮기기 전에 내용물을 먼저 정리한다. 이 시점에도 화면은 (크롬 없는 카드가 띠 아래 인라인으로) 정상 동작하고 모든 테스트가 통과한다 — 리뷰어가 이 커밋 하나만 보고도 판단할 수 있다.

**주의:** `contextPins` · `dedupeByHex` · `previewScale`은 한 글자도 건드리지 않는다.

- [ ] **Step 1: 카드 크롬을 걷어낸다**

`CandidatePopover.tsx`의 반환문에서 바깥 `<div>`의 클래스를 지운다. `onMouseLeave`는 남긴다 — 후보에서 마우스가 빠지면 프리뷰를 거두는 계약이 여전히 필요하고, 이제 그 경계는 Popover 패널이 아니라 이 목록이다.

```tsx
  return (
    // 카드 크롬(테두리·그림자·여백)은 이제 Popover 패널이 진다. 여기는 목록만
    // 남는다 — 크롬이 둘이면 테두리가 겹쳐 보인다.
    <div onMouseLeave={() => onHover(null)}>
```

- [ ] **Step 2: 라디오에 키보드 프리뷰를 단다**

`<input type="radio">`에 `onFocus`를 추가한다. hover 프리뷰의 키보드 대응물이다:

```tsx
            <input
              type="radio"
              name={`cand-${stopIndex}`}
              checked={current === hex}
              // hover의 키보드 대응물. Tab으로 라디오 그룹에 들어오는 것은 선택을
              // 바꾸지 않으므로, 여기서 프리뷰를 띄워야 "고르기 전에 결과를 본다"가
              // 키보드에서도 성립한다. (화살표 키는 네이티브 규칙대로 이동 즉시
              // 선택 = 확정이다 — 그건 남는 한계로, 스펙 "알려진 한계" 3번.)
              onFocus={() => onHover(hex)}
              onChange={() => { onChoose(hex); onClose(); }}
            />
```

- [ ] **Step 3: 머리 주석을 갱신한다**

```tsx
// web/src/color-palette/CandidatePopover.tsx
//
// 후보 3개. hover(또는 키보드 포커스)하면 팔레트와 목업이 그 색으로 다시
// 그려지고(확정 아님), 클릭해야 확정된다 — 고르기 전에 결과를 본다 (스펙 D3).
// 후보의 note(교보재 카피)는 이 화면에서 읽지 않는다 (스펙 D9).
// 이 컴포넌트는 목록만 그린다 — 뜨는 껍데기는 components/Popover가 진다.
```

- [ ] **Step 4: 전체 스위트를 돌린다**

```bash
cd /Users/haneul/Projects/design-system-starter/web
pnpm test
```

Expected: 전부 PASS. `onFocus` 추가는 기존 테스트를 건드리지 않는다 — `fireEvent.click`도 `fireEvent.mouseEnter`도 focus 이벤트를 발화하지 않는다. 크롬 클래스 제거도 마찬가지로 어떤 테스트도 보고 있지 않다.

- [ ] **Step 5: 커밋**

```bash
cd /Users/haneul/Projects/design-system-starter
git add web/src/color-palette/CandidatePopover.tsx
git commit -m "refactor(color-palette): 후보 목록에서 카드 크롬 분리

껍데기는 Popover가 지고 여기는 목록만 남는다 — 크롬이 둘이면 테두리가
겹친다. 라디오 onFocus로 hover 프리뷰의 키보드 대응물을 붙인다: Tab
진입은 선택을 바꾸지 않으므로 '고르기 전에 결과를 본다'가 키보드에서도
성립한다."
```

---

### Task 5: 배선 — 칸 안으로 옮긴다

**Files:**
- Modify: `web/src/color-palette/AdjustableScale.tsx` (props · 칸 `relative` · 트리거 ARIA/ref · `<Popover>` 렌더)
- Modify: `web/src/color-palette/ColorPalettePage.tsx:58-78`
- Test: `web/src/color-palette/AdjustableScale.test.tsx` (1개 추가) · `web/src/color-palette/ColorPalettePage.test.tsx` (1개 **추가만**)

**Interfaces:**
- Consumes: `Popover` (Task 2), 크롬 없는 `CandidatePopover` (Task 4)
- Produces: `AdjustableScale`의 새 선택적 props
  ```ts
  readonly openIndex?: number | null;      // 열린 stop. 없으면 popover 없음
  readonly popoverContent?: ReactNode;     // 부모가 만든 <CandidatePopover/>
  readonly onClosePopover?: () => void;
  ```
  기존 props(`hexes` · `adjustable` · `pinned` · `onPick` · `preview` · `showCaptions`)는 그대로다. 뉴트럴·상태색 띠는 새 props를 안 넘기므로 지금과 똑같이 동작한다.

**왜 페이지가 아니라 여기서 렌더하는가:** Popover는 `triggerRef`(바깥 판정 제외 + 포커스 복귀 대상)를 필요로 하는데, 트리거 버튼은 이 컴포넌트가 `map` 안에서 그린다 — 페이지에는 그 DOM에 닿을 길이 없다. 트리거의 `aria-expanded` · `aria-haspopup` · `aria-controls`와 패널 `id` 생성도 같은 이유로 여기 책임이다.

- [ ] **Step 1: 실패하는 테스트를 쓴다 (AdjustableScale)**

`AdjustableScale.test.tsx` 끝에 추가:

```tsx
  // 앵커 관계를 DOM으로 고정한다 — 패널이 열린 stop의 칸 안에 있어야 위치가
  // 그 칸을 따라간다. 형제로 나가면 absolute의 기준이 사라진다.
  it("패널을 열린 stop의 칸 안에 렌더한다", () => {
    render(
      <AdjustableScale
        hexes={HEXES}
        adjustable={[0, 3, 7, 10]}
        pinned={[]}
        onPick={() => {}}
        openIndex={7}
        onClosePopover={() => {}}
        popoverContent={<span>후보 목록</span>}
      />,
    );
    const panel = screen.getByRole("dialog");
    const swatch = screen.getAllByTestId("swatch")[7];
    // 같은 칸(스와치의 부모) 안에 둘 다 있다
    expect(swatch.parentElement?.contains(panel)).toBe(true);
    expect(screen.getByText("후보 목록")).toBeTruthy();
  });

  // 스크린리더에는 "패널이 그 칸 아래 떴다"는 위치 정보가 없다 — 라벨이
  // 어느 stop인지 말해줘야 한다.
  it("패널 라벨과 트리거 ARIA가 stop을 가리킨다", () => {
    render(
      <AdjustableScale
        hexes={HEXES}
        adjustable={[0, 3, 7, 10]}
        pinned={[]}
        onPick={() => {}}
        openIndex={7}
        onClosePopover={() => {}}
        popoverContent={<span>후보 목록</span>}
      />,
    );
    expect(screen.getByRole("dialog", { name: "700 후보" })).toBeTruthy();
    const trigger = screen.getAllByTestId("swatch")[7];
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    // 닫힌 stop은 열려 있지 않다고 말한다
    expect(screen.getAllByTestId("swatch")[3].getAttribute("aria-expanded")).toBe("false");
  });

  // 포커스 복귀가 실제로 도는 유일한 구성이다. Popover.test의 하네스는 Popover를
  // 직접 마운트/언마운트하지만, 제품에는 조건부 ref(`ref={i === openIndex ? … :
  // undefined}`)가 하나 더 얹힌다 — 닫히는 커밋에서 React가 그 ref를 먼저 떼므로,
  // 복귀 코드가 트리거를 "열릴 때 캡처"하지 않으면 여기서만 조용히 실패한다.
  it("패널이 사라지면 포커스가 그 stop의 스와치로 돌아온다", () => {
    const props = {
      hexes: HEXES,
      adjustable: [0, 3, 7, 10],
      pinned: [],
      onPick: () => {},
      onClosePopover: () => {},
      popoverContent: <span>후보 목록</span>,
    };
    const { rerender } = render(<AdjustableScale {...props} openIndex={7} />);
    // 열리면 패널에 포커스가 가 있다 — 복귀의 전제 조건이다.
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
    rerender(<AdjustableScale {...props} openIndex={null} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getAllByTestId("swatch")[7]);
  });
```

- [ ] **Step 2: 실패를 확인한다**

```bash
cd /Users/haneul/Projects/design-system-starter/web
pnpm vitest run src/color-palette/AdjustableScale.test.tsx
```

Expected: FAIL — `Unable to find an accessible element with the role "dialog"` (props가 아직 없어 무시된다)

- [ ] **Step 3: AdjustableScale을 고친다**

import와 시그니처:

```tsx
import { useId, useRef, type ReactNode } from "react";
import { STOP_KEYS } from "@core/color/scale.js";
import { Popover } from "../components/Popover";

interface Props {
  readonly hexes: readonly string[];
  readonly adjustable: readonly number[];
  readonly pinned: readonly number[];
  readonly onPick?: (stopIndex: number) => void;
  /** 후보 hover 중이면 그 스케일을 대신 그린다. 확정 아님. */
  readonly preview?: readonly string[] | null;
  /** 캡션(stop 번호) 줄을 그릴지. 기본 true — 상태색처럼 4벌이 접힌 채 쌓이는
   *  자리에서 세로를 아끼는 용도로만 끈다. */
  readonly showCaptions?: boolean;
  /** 지금 열려 있는 stop. 후보 패널은 그 칸 안에 뜬다. */
  readonly openIndex?: number | null;
  /** 패널 내용물. 부모가 만든다 — 후보 계산은 여전히 부모 쪽 일이다. */
  readonly popoverContent?: ReactNode;
  readonly onClosePopover?: () => void;
}

export function AdjustableScale({
  hexes, adjustable, pinned, onPick, preview, showCaptions = true,
  openIndex = null, popoverContent, onClosePopover,
}: Props) {
  const shown = preview ?? hexes;
  // clamp 기준이자 바깥 판정의 바깥쪽 — 띠 자신이 경계다(스펙 D3).
  const stripRef = useRef<HTMLDivElement>(null);
  // 열린 칸의 트리거 하나만 들면 된다. 인덱스별 Map을 만들면 ref 객체 정체성이
  // 매 렌더 바뀌어 Popover의 이펙트가 헛돈다.
  const openTriggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
```

반환문 전체를 아래로 교체한다. Task 3에서 이미 hover 그림자를 뺀 상태여야 한다 — 아래 `className`에 `hover:shadow`가 없는 것이 그 결과다. 바뀐 곳은 띠 `ref`, 칸의 `relative`, 트리거 `ref`/ARIA 3종, 그리고 맨 끝 `<Popover>` 블록뿐이다:

```tsx
  return (
    // 띠 자신이 clamp의 경계다 — 이 밖으로 나가면 옆의 sticky 목업을 덮는다(스펙 D3).
    <div ref={stripRef} className="flex gap-0.5">
      {shown.map((hex, i) => {
        const canAdjust = adjustable.includes(i);
        const label = `${STOP_KEYS[i]} ${hex}${canAdjust ? " — 조정" : ""}`;
        return (
          // relative는 패널의 absolute 기준이다. 열린 칸에만 필요하지만 11칸에
          // 균일하게 주는 편이 조건부보다 읽기 쉽고 해가 없다.
          <div key={STOP_KEYS[i]} className="flex-1 relative">
            {canAdjust && onPick ? (
              <button
                type="button"
                ref={i === openIndex ? openTriggerRef : undefined}
                aria-label={label}
                aria-haspopup="dialog"
                aria-expanded={i === openIndex}
                aria-controls={i === openIndex ? panelId : undefined}
                data-testid="swatch"
                onClick={() => onPick(i)}
                // 그림자는 Tailwind 기본 shadow-sm/lg가 아니라 커스텀 값이다 —
                // 36px 칩에서 기본 스케일은 배율 1에서 거의 안 보였다(사용자 확인).
                // 광원은 북쪽 고정: 가로 오프셋 0. 대각선을 주면 "종이 조각"처럼
                // 읽히고, 세로만 주면 "눌리는 버튼"으로 읽힌다.
                // 블러는 0 — 블러가 있으면 이 칩 크기에서 대비가 흩어져 신호가 죽는다.
                // press 시 이동 거리(2px)는 기본 깊이(2px)와 같게 맞춘다 — 눌렀을 때
                // 칩이 그림자가 있던 자리에 정확히 내려앉도록. 두 값은 항상 같이
                // 움직여야 한다. hover 리프트를 뺀 이유가 바로 이 대응이다(스펙 D4):
                // 마우스로 누르는 순간은 항상 hover 중이라, hover가 깊이를 4px로
                // 올려놓으면 2px만 내려가 착지가 어긋났다.
                // 그림자 색은 그 상태의 테두리 색과 같다 — 한 칩에 서로 다른
                // 회색이 둘(테두리 하나, 그림자 하나) 있으면 어색해 보인다는
                // 지적이 있었다. pin 여부에 따라 테두리·그림자가 함께
                // neutral-300 ↔ neutral-700으로 움직여 위계도 더 분명해진다.
                className={`block w-full h-9 rounded-sm border cursor-pointer
                  active:shadow-none active:translate-y-[2px]
                  transition-[box-shadow,transform]
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-neutral-900 focus-visible:ring-offset-1 ${
                  pinned.includes(i)
                    ? `border-neutral-700
                       shadow-[0_2px_0_0_var(--color-neutral-700)]`
                    : `border-neutral-300
                       shadow-[0_2px_0_0_var(--color-neutral-300)]`
                }`}
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
            {/* 조정 가능 여부는 칩(1px 테두리 차이)도 캡션의 굵기·명도도 아니라
                스와치 자체의 depth(그림자)로 드러낸다 — 신호가 둘이면 캡션이
                소음이 된다. 캡션은 stop 번호만 남긴다(스펙 D3, D9). */}
            {showCaptions && (
              <div
                data-testid="stop-caption"
                className="mt-1 text-center text-[9px] font-mono text-neutral-400"
              >
                {STOP_KEYS[i]}
              </div>
            )}
            {/* 패널은 이 칸 안에 산다 — 형제로 내보내면 absolute의 기준이 사라져
                어느 stop을 조정 중인지가 위치로 안 읽힌다. 라벨에 stop 키를 넣는
                이유도 같다: 스크린리더에는 위치가 없다. */}
            {i === openIndex && popoverContent && (
              <Popover
                open
                onClose={onClosePopover ?? (() => {})}
                label={`${STOP_KEYS[i]} 후보`}
                id={panelId}
                triggerRef={openTriggerRef}
                boundaryRef={stripRef}
              >
                {popoverContent}
              </Popover>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

`aria-expanded`는 조정 가능한 버튼에만 붙는다 — 조정 불가 스와치는 `<div>`라 애초에 이 분기에 없다.

- [ ] **Step 4: 통과를 확인한다**

```bash
cd /Users/haneul/Projects/design-system-starter/web
pnpm vitest run src/color-palette/AdjustableScale.test.tsx
```

Expected: PASS (8 tests)

- [ ] **Step 5: 페이지를 고친다**

`ColorPalettePage.tsx`의 액센트 `<section>`을 이렇게 바꾼다. `<CandidatePopover/>`가 형제에서 prop으로 옮겨갈 뿐, 상태와 콜백은 전부 그대로다:

```tsx
        <section className="space-y-1">
          <h2 className="text-xs font-medium text-neutral-500">액센트</h2>
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
        </section>
```

`<section>` 아래에 있던 `{open !== null && (<CandidatePopover … />)}` 블록은 삭제한다.

- [ ] **Step 6: 페이지 테스트에 1개 추가한다 (기존은 수정 금지)**

`ColorPalettePage.test.tsx`의 `describe` 끝에 추가:

```tsx
  // 열린 채 다른 스와치를 누르면 실브라우저에서는 pointerdown(바깥 닫기) →
  // click(토글 열기)의 2-이벤트 시퀀스가 된다. 트리거를 "바깥"에서 빼두지 않으면
  // 같은 칸을 누를 때 "닫힘 → 즉시 재열림"이 되고, 다른 칸을 누를 때는 순서가
  // 어긋나 패널이 안 열린다. 페이지 스위트에서 pointerDown을 쓰는 유일한 곳이다.
  it("열린 채 다른 스와치를 누르면 그 stop의 패널로 옮겨간다", () => {
    render(<ColorPalettePage />);
    const stops = screen.getAllByRole("button", { name: /조정/ });
    fireEvent.click(stops[0]);                 // stop 0 — 후보 2개
    expect(screen.getAllByRole("radio").length).toBe(2);
    fireEvent.pointerDown(stops[2]);           // stop 7 — 바깥 판정으로 먼저 닫힘
    fireEvent.click(stops[2]);                 // 이어서 토글이 연다
    expect(screen.getAllByRole("radio").length).toBe(3);  // stop 7은 후보 3개
  });
```

- [ ] **Step 7: 전체 스위트를 돌린다**

```bash
cd /Users/haneul/Projects/design-system-starter/web
pnpm test
```

Expected: 전부 PASS. **기존 `ColorPalettePage.test.tsx`가 하나라도 실패하면 구현이 틀린 것이다 — 테스트를 고치지 말고 구현을 고친다.** 특히 확인할 것:
- `"renders a complete palette…"` — 스와치 66개 (패널 안에는 `data-testid="swatch"`가 없다)
- `"reverts to the curve default"` — 팝오버를 두 번 여는 유일한 테스트
- `"marks exactly four accent stops as adjustable"` — `aria-label`을 안 건드렸으므로 통과해야 한다

- [ ] **Step 8: 타입 체크와 빌드**

```bash
cd /Users/haneul/Projects/design-system-starter/web
pnpm build
```

Expected: 성공. `tsc -b`가 새 props와 ref 타입을 검증한다.

- [ ] **Step 9: 실제 화면에서 확인한다**

```bash
cd /Users/haneul/Projects/design-system-starter/web
pnpm dev
```

`/color-palette`(또는 앱의 해당 라우트)를 열고 눈으로 본다:
1. 액센트 띠 위로 마우스를 훑어도 칩이 들썩이지 않는다. 커서는 여전히 손가락이다.
2. stop 50을 누르면 그 칸 아래에 화살표 달린 패널이 뜬다 — **아래 내용이 안 밀린다.**
3. stop 950을 누르면 패널이 왼쪽으로 되밀려 **오른쪽 목업을 덮지 않는다.** 화살표는 여전히 950 칸을 가리킨다.
4. 후보에 마우스를 올리면 띠와 목업이 그 색으로 다시 그려진다. 뗐다 놓으면 원래대로.
5. 패널 밖을 클릭하면 닫힌다. Esc로도 닫히고, 닫히면 포커스가 눌렀던 스와치로 돌아온다(계속 Tab을 눌러 확인).
6. 같은 스와치를 다시 누르면 닫힌다 — 닫혔다 다시 열리지 않는다.

- [ ] **Step 10: 커밋**

```bash
cd /Users/haneul/Projects/design-system-starter
git add web/src/color-palette/AdjustableScale.tsx web/src/color-palette/AdjustableScale.test.tsx \
        web/src/color-palette/ColorPalettePage.tsx web/src/color-palette/ColorPalettePage.test.tsx
git commit -m "feat(color-palette): 후보 카드를 앵커된 Popover로

띠 아래 전체 폭 카드가 레이아웃을 밀고, 어느 stop을 눌렀는지도 말해주지
않았다. 이제 누른 칸 아래에 화살표를 달고 뜬다.

Popover 래퍼는 AdjustableScale이 렌더한다 — 트리거 버튼을 자기가 그리므로
triggerRef와 aria-expanded/haspopup/controls의 주인이다. 페이지는 내용물만
넘긴다. 상태와 후보 계산은 그대로 페이지·CandidatePopover에 남는다.

기존 페이지 테스트는 한 줄도 안 고쳤다. 다른 스와치로 옮겨가는 경로만
새로 덮는다 — 실브라우저의 pointerdown→click 2-이벤트 시퀀스."
```

---

## 완료 조건

- [ ] `cd web && pnpm test` 전부 통과
- [ ] `cd web && pnpm build` 성공
- [ ] `ColorPalettePage.test.tsx`의 기존 테스트가 **수정 없이** 통과 (`git diff`로 추가분만 있는지 확인)
- [ ] Task 5 Step 9의 눈 확인 6개 항목 통과
- [ ] 새 의존성 없음 (`git diff web/package.json`이 비어 있음)
