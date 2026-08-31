// web/src/color-palette/AccentInput.tsx
//
// hex 텍스트 입력은 로컬 드래프트로 둔다 — 부모 상태(hex prop)는 유효한 값만
// 받는 게 맞지만, 입력창 자체가 그 값에 그대로 매인 제어 컴포넌트면 "#3" 같은
// 중간 상태에서 React가 매 keystroke마다 값을 이전 유효값으로 되돌려 전체
// 선택 후 붙여넣기밖에 못 하게 된다. 이 도구의 유일한 필수 입력이라 심각하다.

import { useEffect, useRef, useState } from "react";
import { OklchPicker } from "../components/OklchPicker";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function AccentInput({
  hex, onChange,
}: {
  readonly hex: string;
  // session: "같은 조정 제스처인가"를 부모(ColorPalettePage)가 판정할 수 있게
  // 넘기는 세대 번호 — 아래 sessionGen 설명 참고. OklchPicker 자체는 안
  // 건드린다: 이 컴포넌트(AccentInput)가 OklchPicker의 단일 hex 콜백을
  // 감싸면서 세대를 붙여 내보낸다.
  readonly onChange: (hex: string, session: number) => void;
}) {
  const [draft, setDraft] = useState(hex);

  // 부모가 액센트를 바꾸면(후보 선택, URL 복원 등) 드래프트도 따라간다 —
  // 입력 중이 아닐 때만 의미 있는 동기화라 타이핑 중엔 사용자가 친 값이 이긴다.
  useEffect(() => setDraft(hex), [hex]);

  // 최종 리뷰 라운드 2(N-1·N-2)의 근사 교체: "포인터가 지금 눌려 있는가"로
  // 드래그를 흉내 냈더니 pointercancel처럼 짝이 안 맞는 이벤트에서 영원히
  // 참으로 고착되고(N-1), 키보드 넛지(NumberField의 ArrowUp)는 애초에
  // 포인터 이벤트가 아니라서 아예 안 잡혔다(N-2, D10이 NumberField를 공식
  // 접근 경로로 승격한 것과 정면 충돌). 판정 축을 "지금 이 순간의 상태"에서
  // "이 커밋이 어느 조정 세대에 속하는가"로 바꾼다 — **끝을 감지할 필요가
  // 없어진다**(시작만 세면 되므로 pointerup/pointercancel/lostpointercapture
  // 중 무엇이 오든, 혹은 아예 안 오든 상관없다). 세대는 셋 중 하나에서만
  // 새로 열린다:
  //   1. 피커 서브트리 안에서 새 pointerdown(새 드래그 시작) 또는
  //      pointercancel(아래 F-1 참고 — 이것도 "시작"으로 센다)
  //   2. 피커 서브트리 밖에서 안으로 들어오는 focusin(아래 F-2 참고 —
  //      L↔C↔H 사이의 이동은 새 세대가 아니다)
  //   3. hex 입력창 자체의 커밋(항상 자기 자신만의 새 세대 — 아래 참고)
  // 그 사이의 모든 커밋(pointermove 연속, 같은 세션 안에서의 ArrowUp
  // 반복)은 세대가 안 바뀌므로 "같은 조정"으로 묶인다.
  const sessionGen = useRef(0);
  const pickerWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = pickerWrapRef.current;
    if (!wrap) return;
    // window가 아니라 이 wrapper에 붙이는 이유: 페이지의 다른 pointerdown
    // (스와치 클릭, 팝오버 라디오 등)까지 세대를 밀면 안 된다 — 피커
    // 서브트리로 정확히 좁힌다. 캡처가 아니라 버블 단계라 실제 target(예:
    // HueStrip div)에서 이 wrapper로 버블링되며 도착하는데, wrapper가
    // React 루트보다 target에 더 가까운 조상이라 React의 위임 핸들러
    // (HueStrip의 onPointerDown, 그 안에서 첫 pick()을 동기 호출)보다
    // **먼저** 실행된다 — 그래서 새 드래그의 첫 pick()이 onChange를 부를
    // 때 이미 새 세대가 반영돼 있다(직접 실행 순서 확인).
    const onPointerDown = () => { sessionGen.current += 1; };
    wrap.addEventListener("pointerdown", onPointerDown);
    // 리뷰 라운드 3, F-1: pointercancel도 "시작" 취급으로 새 세대를 연다.
    // 근인은 OklchPicker(HueStrip·LcPad)의 draggingRef가 pointerup에서만
    // 내려가고 pointercancel을 안 듣는 것이다 — pointercancel 뒤에도
    // draggingRef가 참으로 남아, 버튼을 뗀 채 마우스만 움직여도
    // pointermove가 계속 pick()을 불러 onChange가 나온다(브라우저 실측
    // 확인). 그 draggingRef 자체를 고치려면 OklchPicker의 드래그 배선을
    // 건드려야 해서 이번 사이클 경계(4번째 부분 개정) 밖이다 — 대신 여기서
    // "pointercancel도 새 세대"로 방어한다: draggingRef가 고착돼 계속
    // 커밋이 나와도, 그 커밋들의 세대가 pointercancel 시점에 이미 바뀌어
    // 있어 다음 번 onAccentChange에서 곧바로(had가 거짓이면) 만료된다.
    // 증가는 단조라 이 방어 자체가 "끝을 놓쳐 고착"되는 실패 모드를 만들지
    // 않는다 — pointercancel을 또 놓쳐도(예: lostpointercapture만 오는
    // 브라우저) 다음 pointerdown이나 hex 칸 커밋이 여전히 세대를 연다.
    const onPointerCancel = () => { sessionGen.current += 1; };
    wrap.addEventListener("pointercancel", onPointerCancel);
    // focusin은 버블링하는 focus 이벤트다(plain "focus"는 안 한다) — 이
    // 서브트리 밖에서 안으로 들어올 때만 새 세대를 연다. blur/focusout처럼
    // "끝"을 별도로 안 듣는 이유는 pointerdown과 같다: 시작만 세면 끝을
    // 놓쳐서 영원히 고착되는 실패 모드 자체가 생기지 않는다.
    //
    // 리뷰 라운드 3, F-2: relatedTarget이 이 wrapper 안이면(=L↔C↔H
    // NumberField 사이의 Tab 이동) 세대를 안 연다. 처음엔 서브트리 안 어떤
    // focusin이든 새 세대를 열었는데, 그러면 "명도에서 드랍 → Tab으로
    // 채도 이동 → 넛지 한 번"에서 채도 넛지가 곧바로 새 세대 취급돼
    // 배너가 사라진다 — 파란 채널 1/255 같은 눈에 안 띄는 변화로 복원
    // 수단이 영구히 사라지는 결과였다(N-2와 같은 계열). D10이 NumberField
    // 셋을 공식 접근 경로로 묶은 이상, 그 셋 사이의 이동은 "같은 조정
    // 도구 안에서의 이동"이지 새 조정의 시작이 아니다 — 마우스가
    // HueStrip↔LcPad 사이를 오가도 같은 드래그면 세대가 안 바뀌는 것과
    // 대칭이다. 그래서 relatedTarget(포커스가 어디서 왔는지)이 이
    // wrapper 안이면 건너뛴다: 서브트리 밖(예: hex 칸, 스와치, 페이지의
    // 다른 곳)에서 들어올 때만 새 세대다.
    const onFocusIn = (e: FocusEvent) => {
      if (e.relatedTarget instanceof Node && wrap.contains(e.relatedTarget)) return;
      sessionGen.current += 1;
    };
    wrap.addEventListener("focusin", onFocusIn);
    return () => {
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointercancel", onPointerCancel);
      wrap.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return (
    <div
      className="border border-neutral-200"
      style={{
        borderRadius: "var(--ds-radius-card)",
        padding: "var(--ds-space-sm)",
      }}
    >
      {/* wrap을 허용한다 — 이 행의 min-content(피커 256 + gap 24 + hex 112 = 392)가
          카드·페이지 패딩과 합쳐져 페이지 전체의 가로 하한 442px를 만들고 있었다. */}
      <div className="flex flex-wrap items-start gap-6">
        <div ref={pickerWrapRef} data-testid="accent-picker">
          <OklchPicker hex={hex} onChange={(h) => onChange(h, sessionGen.current)} />
        </div>
        {/* D4 표: hex는 code.sm(12px mono) — 바로 왼쪽 OklchPicker의 L·C·H와
           같은 급이다. 라벨은 caption.sm. w-28(112px)에 12px mono "#3b82f6"은
           여유 있게 들어간다(브라우저 확인). */}
        <label className="ds-type-caption-sm text-neutral-500">
          <span className="block mb-1">액센트 hex</span>
          <input
            aria-label="액센트 hex"
            value={draft}
            onChange={(e) => {
              const v = e.target.value;
              setDraft(v);
              // 형식을 갖췄을 때만 부모에 커밋한다 — 드래프트는 화면에서 자유롭게
              // 타이핑을 반영하되, 확정된 팔레트 상태는 여전히 유효한 hex만 본다.
              if (HEX_RE.test(v)) {
                // hex 칸 커밋은 매번 새 세대다 — 드래그·넛지 같은 "연속
                // 탐색"이 아니라 완결된 값 하나를 통째로 정하는 행동이라,
                // 직전이 무슨 세대였든(심지어 방금 이 칸에서 낸 세대여도)
                // 매번 새로 판다. 그래야 드랍 직후 이 칸으로 액센트를
                // 두 번 연달아 바꿔도(리뷰 시퀀스 ②) 첫 변경에서 곧바로
                // 버퍼가 만료된다.
                sessionGen.current += 1;
                onChange(v.toLowerCase(), sessionGen.current);
              }
            }}
            onBlur={() => {
              // blur 시 형식이 안 맞으면 마지막 유효값으로 되돌린다.
              if (!HEX_RE.test(draft)) setDraft(hex);
            }}
            className="border border-neutral-300 rounded px-2 py-1 ds-type-code-sm w-28"
          />
        </label>
      </div>
    </div>
  );
}
