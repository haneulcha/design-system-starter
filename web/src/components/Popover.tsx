// web/src/components/Popover.tsx
//
// 앵커 기준 absolute 팝오버. 이 Popover의 그림자·물리는 커스텀 유지다 — 상호작용
// 설계라 elevation 카테고리로 갈아타지 않는다 (2026-08-24 스펙 D1 경계선). 크롬
// 전반은 --ds-*를 먹는다.
//
// 2026-08-30 리뷰 정정: 이 자리 주석이 한동안 "builder·lab·inspector·
// color-palette 4화면이 이 파일을 공유한다"고 적어 왔는데 사실이 아니다(이번
// 변경 이전부터 틀려 있었다) — 이 파일을 import하는 곳은 AdjustableScale
// 하나뿐이고, 그건 ColorPalettePage에서만 쓰인다. 폭발 반경은 /color-palette
// 뿐이다.
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

// 패널 상한을 경계 폭보다 이만큼 좁게 준다. clampOffset은 패널 폭이 경계 폭과
// "같거나 크면"(>=) 포기하므로 0보다는 커야 하고, 브라우저의 subpixel 반올림
// (max-width: 271.6px가 실제로 272px로 렌더되는 식)에도 `<` 부등호가 안전하게
// 유지될 정도의 여유가 필요하다 — 실측 여백(320px 화면, 띠 272px)에 견줘
// 시각적으로도 자연스러운 값.
const BOUNDARY_MARGIN = 8;

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
  // 경계(띠) 폭 상한. 고정 px을 주지 않는 이유: 겹침 사유 문구(D7-2)가 붙으면
  // 패널이 넓어질 수 있는데, clampOffset은 "패널이 경계보다 넓으면" clamp를
  // 포기한다(그 함수 헤더 주석 참조) — 포기하면 패널이 sticky 목업을 덮는다.
  // 그걸 막으려고 애초에 경계를 재는 것이니, 상한도 그 경계 폭에 묶는다.
  //
  // 2026-08-30 리뷰 수정(C-2): 상한을 경계 폭과 "같게" 줬던 첫 구현이 회귀였다.
  // clampOffset은 `panel.width >= boundary.width`면 포기하는데, max-width를
  // 경계 폭과 정확히 같게 주면 내용이 넘칠 때 패널이 그 상한까지 꽉 차 폭이
  // 경계와 같아져(>=) 매번 포기 분기를 탄다. 320px 실측(emulate viewport,
  // innerWidth 320 확인): stop 50 패널이 경계 밖으로 100.5px 나갔다. 여백
  // BOUNDARY_MARGIN만큼 상한을 경계보다 확실히 좁게 준다 — subpixel 반올림에도
  // `<` 가 깨지지 않을 정도의 여유다.
  const [maxWidth, setMaxWidth] = useState<number | null>(null);

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

  // 상한 계산과 오프셋 계산을 두 단계로 나눈다(리뷰 C-2). 한 이펙트에서 같이
  // 하면 오프셋이 "상한 적용 전" 패널 rect(사유 문구로 넓어진 자연 폭)로
  // 계산된다 — 그 시점엔 아직 style.maxWidth가 안 붙어 있어서다. maxWidth
  // state가 반영돼 패널이 실제로 좁아진 뒤에야 오프셋을 다시 재야 한다.
  //
  // 1단계: 상한. 패널 폭과 무관하게 경계만 본다. jsdom은 rect가 전부 0이라
  // null(무제한)로 남고, 그래서 이 계산이 컴포넌트 테스트를 깨뜨리지 않는다.
  // 알려진 한계(M-8, offset과 동일): 열 때 한 번만 잰다 — 열려 있는 동안
  // 창 크기가 바뀌어도 재계산하지 않는다. 이 도구는 뷰포트 리사이즈 중에
  // 팝오버를 열어 둔 채로 쓰는 시나리오가 없어 지금은 감수한다.
  useLayoutEffect(() => {
    if (!open) { setMaxWidth(null); return; }
    const boundary = boundaryRef.current?.getBoundingClientRect();
    if (!boundary) return;
    const boundaryWidth = boundary.right - boundary.left;
    setMaxWidth(boundaryWidth > BOUNDARY_MARGIN ? boundaryWidth - BOUNDARY_MARGIN : null);
  }, [open, boundaryRef]);

  // 2단계: 오프셋. deps에 maxWidth를 넣어 상한이 커밋되고 패널이 그 폭으로
  // 다시 그려진 뒤 이 이펙트가 한 번 더 돌게 한다 — panelRef가 그때서야
  // 좁아진 실제 rect를 돌려준다.
  useLayoutEffect(() => {
    if (!open) { setOffset(0); return; }
    const panel = panelRef.current?.getBoundingClientRect();
    const boundary = boundaryRef.current?.getBoundingClientRect();
    if (!panel || !boundary) return;
    setOffset(clampOffset(panel, boundary));
  }, [open, boundaryRef, maxWidth]);

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
      style={{
        transform: `translateX(calc(-50% + ${offset}px))`,
        // 고정 px이 아니라 실측 경계 폭이 상한이다 — clampOffset은 패널이
        // 경계보다 넓으면 clamp를 포기하므로(위 주석), 상한이 없으면 사유
        // 문구로 패널이 넓어질 때 그 포기 경로를 그대로 밟는다.
        ...(maxWidth !== null ? { maxWidth } : {}),
      }}
    >
      {/* 화살표는 오프셋의 역부호만큼 되밀어, 패널이 clamp로 밀려도 언제나 앵커
          중앙을 가리킨다 — 어느 stop을 조정 중인지 알려주는 것이 이 화살표의
          유일한 일이라 여기서 어긋나면 없느니만 못하다. */}
      {/* transform 순서를 바꾸지 말 것: rotate를 먼저 쓰면 그 뒤에 오는
          translate가 이미 회전된 축을 따라 적용돼 화살표가 대각선으로
          어긋난다. translateX가 먼저(왼쪽) 와야 부모의 원래 x축 기준으로
          이동한다. */}
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
