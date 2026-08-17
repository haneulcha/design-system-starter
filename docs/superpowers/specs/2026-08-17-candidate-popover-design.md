# 후보 선택 UI를 앵커된 Popover로 — 설계

**날짜:** 2026-08-17
**대상:** `web/src/color-palette` 액센트 띠와 후보 선택 UI
**선행 스펙:** `2026-08-16-palette-tool-ux-refinement-design.md` (D3 depth 어포던스)

---

## 문제

액센트 띠에서 조정 가능한 stop을 누르면 후보 3개가 뜬다. 지금 그것은 띠 **아래에 끼어드는
전체 폭 카드**다. 두 가지가 걸린다.

1. **카드가 레이아웃을 민다.** 후보를 열면 아래 내용(뉴트럴 섹션·다운로드 줄)이 통째로
   내려간다. 어느 stop을 눌렀는지도 카드가 말해주지 않는다 — 카드는 11칸 전체 폭이라
   50을 눌렀든 950을 눌렀든 같은 자리에 같은 크기로 뜬다.
2. **hover 리프트가 과하다.** 마우스가 띠를 가로지르면 칩 4개가 차례로 들썩인다.
   팔레트는 색을 나란히 놓고 **비교하는** 화면인데, 비교하려고 눈을 옮기는 동작 자체가
   움직임을 유발한다.

---

## 결정

### D1. 카드를 앵커된 Popover로 바꾼다

누른 스와치 **바로 아래에** 화살표를 달고 뜬다. 레이아웃을 밀지 않는다(absolute).
어느 stop을 조정 중인지가 위치로 드러나므로 별도 라벨이 필요 없다.

**Popover이지 Tooltip이 아니다.** 내용물이 라디오 3개 + "기본으로" 버튼, 즉 상호작용
요소다. ARIA에서 `role="tooltip"`은 비상호작용 설명 전용이고 Radix·Base UI 모두 상호작용
내용에는 Popover를 쓰라고 명시한다. 최초 요청은 "툴팁"이었으나 성격을 확인해 Popover로
정정했다.

### D2. Popover는 `web/src/shared/`에 공용 컴포넌트로 둔다

`web/src/components/`는 **생성된 디자인 시스템을 보여주는 `DS*` 프리뷰** 자리다.
Popover는 그 산출물이 아니라 **도구 자신의 크롬**이라 섞지 않는다 — 선행 스펙이 D3의
그림자에 대해 그은 것과 같은 선이다(`elevation` 카테고리는 사용자에게 나가는 토큰,
도구의 그림자는 무관).

새 디렉터리 `web/src/shared/`가 그 자리다. 색 팔레트 화면 전용이 아닌, 도구 UI 전반이
쓰는 프리미티브가 여기 쌓인다.

**Radix / Base UI에서 가져오는 계약:**

| 항목 | 구현 |
| --- | --- |
| 역할 | 패널 `role="dialog"` + `aria-label` |
| 트리거 | `aria-expanded` · `aria-haspopup="dialog"` · `aria-controls` |
| 열림 | 패널 안 첫 포커스 가능 요소로 포커스 이동 |
| Esc | 닫고 **트리거로 포커스 복귀** |
| 바깥 닫기 | `pointerdown`으로 감지 (click이 아니다 — 패널 안에서 눌러 밖에서 뗀 드래그가 닫지 않도록) |
| 트리거 예외 | 트리거 자신은 "바깥"이 아니다 — 아니면 토글 클릭이 "닫힘 → 즉시 다시 열림"이 된다 |
| 모달성 | 비모달. 포커스 트랩 없음 (Radix Popover `modal={false}` 기본과 같다) |

**기각한 대안 (a) Portal + `position: fixed`** (Radix의 실제 구현): 조상의 `overflow`나
`z-index` 문맥에 갇히지 않는 것이 이득인데, 이 도구에는 모달도 없고 상위에 `overflow`를
잘라내는 조상도 없다. 포털이 벌어주는 것이 없는 자리에서 스크롤·리사이즈 재계산과
jsdom 방어 코드만 늘어난다.

**기각한 대안 (b) floating-ui 도입**: 의존성 하나를 위해 얻는 것이 clamp 한 줄이다.

### D3. 위치는 앵커 기준 absolute + 좌우 clamp

스와치 칸을 `relative`로 감싸고 패널은 `absolute top-full left-1/2 -translate-x-1/2`.
칸이 36px이고 패널이 그보다 넓으므로 양끝 stop(50, 950)에서는 화면 밖으로 나간다 —
마운트 후 `useLayoutEffect`에서 패널 rect를 재고 뷰포트를 넘는 만큼 px 오프셋을 잡는다.
화살표는 오프셋과 무관하게 앵커 중앙을 가리킨다.

jsdom은 모든 rect가 0을 준다 → 오프셋이 0으로 남고 아무 일도 일어나지 않는다.
테스트가 이 계산 때문에 깨지지 않는다.

### D4. hover 리프트를 뺀다 — 선행 스펙 D3의 부분 철회

조정 가능한 스와치의 3단계(기본 2px → hover 4px → press 눌림)에서 **hover만 뺀다.**
기본 그림자와 press 눌림은 남는다.

**선행 스펙이 3단계를 고른 근거는** "그림자는 hover에서 뜨고 press에서 눌리면서 상호작용
전체를 한 언어로 잇는다"였다. 그 근거 중 **어포던스를 지는 것은 기본 그림자**이고(누르기
전에 이미 4개가 구분된다), **누르는 느낌을 지는 것은 press**다. hover는 그 둘 사이에서
정보를 더하지 않으면서 움직임만 만든다 — 그리고 이 화면에서 마우스는 색을 비교하려고
띠 위를 지나간다. 지나가는 것과 고르려는 것을 구별하지 못하는 신호다.

기본 그림자와 press를 남기므로 선행 D3의 **결론(어포던스는 depth로 준다)은 유지**되고,
중간 상태 하나만 빠진다.

---

## 구조

```
web/src/shared/Popover.tsx        (신규) 앵커 기준 absolute 패널 + 화살표 + 닫기 계약
web/src/shared/Popover.test.tsx   (신규)

web/src/color-palette/
  AdjustableScale.tsx    hover 그림자 제거 · 칸 relative · 열린 칸에 popover 렌더
  CandidatePopover.tsx   카드 크롬 제거, 내용물만 Popover 안으로
  ColorPalettePage.tsx   popover를 띠 바깥이 아니라 AdjustableScale에 넘김
```

**렌더 책임이 페이지에서 스케일 컴포넌트로 내려간다.** 지금은 `ColorPalettePage`가
`<AdjustableScale/>` 다음 형제로 `<CandidatePopover/>`를 그린다. 앵커에 붙이려면 popover가
해당 칸의 DOM 안에 있어야 하므로, `AdjustableScale`이 `openIndex: number | null`과
`popover: ReactNode`를 받아 그 칸 안에 꽂는다.

상태(`open`/`hover`)와 후보 계산은 지금 그대로 `ColorPalettePage`와 `CandidatePopover`에
남는다 — 옮기는 것은 **어디에 그리는가**뿐이다.

**Popover의 인터페이스:**

```
open: boolean
onClose: () => void        // Esc · 바깥 pointerdown
label: string              // 패널 aria-label
triggerRef: RefObject       // 바깥 판정 제외 + Esc 시 포커스 복귀 대상
children: ReactNode
```

트리거 자체는 Popover가 렌더하지 않는다 — 스와치는 `AdjustableScale`이 이미 그리고 있고,
그 마크업(색·그림자·캡션)이 이 화면의 본체다. Radix의 `Popover.Trigger`처럼 트리거를
가져가면 스와치 스타일이 두 파일로 쪼개진다.

---

## 범위

**이 사이클:** 위 4개 파일과 테스트.

**이 사이클이 아닌 것:** 엔진 · 산출물 · 상태/URL 계약 · 후보 계산 로직
(`contextPins` / `dedupeByHex` / `previewScale`은 한 줄도 안 건드린다) · 뉴트럴·상태색 띠
(조정 불가라 popover가 없다) · `#builder`.

---

## 테스트

**Popover (신규)**
- 열리면 패널 안 첫 포커스 가능 요소로 포커스가 간다
- Esc가 닫고 트리거로 포커스가 돌아온다
- 바깥 `pointerdown`이 닫는다 / 패널 안 `pointerdown`은 안 닫는다 / 트리거 위
  `pointerdown`은 안 닫는다(토글이 재열림으로 새지 않도록)
- 패널이 `role="dialog"`이고 트리거의 `aria-expanded`가 열림 상태를 따라간다

**AdjustableScale**
- 기존 4개 유지
- 추가: 조정 가능한 스와치에 hover 그림자 클래스가 없다 (기본 그림자는 그대로 있다)

**깨지면 안 되는 것:** `ColorPalettePage.test.tsx` **전부** — 한 줄도 고치지 않는 것이
목표다. 후보는 `getAllByRole("radio")`로 찾으므로 DOM 위치가 칸 안으로 옮겨가도 잡힌다.
`getAllByTestId("swatch")` 66개, `#builder` 스모크, `App.test.tsx` 라우팅도 같다.

---

## 알려진 한계

1. **clamp가 뷰포트 기준이다.** 띠를 감싼 컨테이너가 아니라 화면 가장자리를 본다.
   현재 레이아웃에서 띠는 페이지 폭을 거의 다 쓰므로 차이가 없지만, 나중에 띠가 좁은
   컬럼 안으로 들어가면 패널이 컬럼 밖으로 삐져나올 수 있다.
2. **스크롤·리사이즈 재계산을 하지 않는다.** absolute라 앵커와 함께 움직이므로 위치는
   안 틀어지고, 열려 있는 동안 창 폭이 바뀌는 경우에만 clamp가 낡는다.
3. **비모달이라 Tab이 패널 밖으로 나간다.** 나가도 닫히지 않는다 — 후보를 보면서 다른
   컨트롤을 만질 수 있는 편이 이 화면에서는 낫다고 봤다.
