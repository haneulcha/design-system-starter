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
