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

  // clampOffset 자체는 잘 덮여 있지만, 그 값을 패널·화살표 두 transform에 나눠
  // 싣는 부호 배선은 어디서도 안 본다 — 부호가 하나라도 뒤집혀도 jsdom은 rect가
  // 전부 0이라 clamp가 발동하지 않으므로 다른 테스트는 전부 초록인 채로 남는다.
  // getBoundingClientRect를 role=dialog(패널)와 그 외(경계)로 갈라 스텁해
  // clamp가 실제로 발동하는 상황을 흉내낸다.
  //
  // 2026-08-30 리뷰 수정(R-1): 이 스텁이 원래 **정적**이었다 — role=dialog에는
  // 항상 같은 좌표를 돌려줘 이미 적용된 translateX(offset)를 반영하지 않았다.
  // 그래서 오프셋을 "대체"하는 회귀(2패스가 이미 보정된 패널을 다시 재서
  // delta=0을 내고 그 0을 총 오프셋으로 덮어써 1패스의 보정을 지우는 버그)가
  // 나도 이 테스트는 계속 초록이었다 — 두 패스가 매번 같은(오프셋 미반영)
  // rect에서 같은 delta를 내니 대체와 누적을 구별 못 했다. 실제 브라우저의
  // getBoundingClientRect는 transform을 반영하므로, 스텁도 role=dialog
  // 엘리먼트의 현재 style.transform에서 적용된 offset을 읽어 자연 좌표에
  // 더해 돌려주도록 고쳤다 — 이래야 2패스가 "이미 보정된" 실제 위치를 재고,
  // 대체 버전이었다면 여기서 다시 빨개진다.
  function stubDialogRect(naturalLeft: number, naturalRight: number, boundaryRight: number) {
    const rect = (left: number, right: number): DOMRect => ({
      left, right, top: 0, bottom: 0, width: right - left, height: 0,
      x: left, y: 0, toJSON() { return {}; },
    });
    return function (this: Element) {
      if (this.getAttribute("role") === "dialog") {
        const match = /-50%\s*\+\s*(-?[\d.]+)px/.exec((this as HTMLElement).style.transform);
        const appliedOffset = match ? Number(match[1]) : 0;
        return rect(naturalLeft + appliedOffset, naturalRight + appliedOffset);
      }
      return rect(0, boundaryRight);
    };
  }

  it("패널이 경계 밖으로 나가면 패널과 화살표가 반대 부호로 되밀린다", () => {
    const original = Element.prototype.getBoundingClientRect;
    // 패널이 경계(0~200) 왼쪽으로 40px 삐져나간 자연 위치 — clampOffset은
    // boundary.left(0) - panel.left(-40) = 40을 돌려준다.
    Element.prototype.getBoundingClientRect = stubDialogRect(-40, 60, 200);
    try {
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: "열기" }));
      const panel = screen.getByRole("dialog") as HTMLElement;
      const arrow = panel.querySelector("[aria-hidden]") as HTMLElement;
      // 패널은 +offset으로 밀리고(경계 안으로), 화살표는 -offset으로 반대
      // 방향으로 되밀려 앵커 중앙을 계속 가리킨다. 부호가 하나라도 뒤집히면
      // 이 문자열이 달라진다.
      expect(panel.style.transform).toBe("translateX(calc(-50% + 40px))");
      expect(arrow.style.transform).toBe("translateX(calc(-50% - 40px)) rotate(45deg)");
    } finally {
      Element.prototype.getBoundingClientRect = original;
    }
  });

  // 리뷰 R-1 재현: 1280px stop 950 실측에서 패널이 경계 오른쪽으로 넘쳐
  // (자연 위치 180~280, 경계 0~200) 1패스가 -80으로 정확히 보정했는데, 2패스가
  // "대체"였을 때 그 보정이 0으로 리셋되며 패널이 다시 경계 밖(80px, sticky
  // 목업 위)으로 튀어나갔다. maxWidth 이펙트가 반드시 한 번 더(2패스) 돌게
  // boundary 폭을 BOUNDARY_MARGIN(8)보다 넉넉히 준다.
  it("1패스가 이미 경계 안으로 보정했으면 2패스가 그 보정을 지우지 않는다", () => {
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = stubDialogRect(180, 280, 200);
    try {
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: "열기" }));
      const panel = screen.getByRole("dialog") as HTMLElement;
      // 대체 버전이었다면 2패스가 delta=0을 총 오프셋으로 덮어써 이 값이
      // "translateX(calc(-50% + 0px))"이 됐을 것이다.
      expect(panel.style.transform).toBe("translateX(calc(-50% + -80px))");
    } finally {
      Element.prototype.getBoundingClientRect = original;
    }
  });
});
