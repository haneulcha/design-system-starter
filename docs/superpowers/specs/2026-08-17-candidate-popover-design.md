# 후보 선택 UI를 앵커된 Popover로 — 설계

**날짜:** 2026-08-17
**대상:** `web/src/color-palette` 액센트 띠와 후보 선택 UI
**선행 스펙:** `2026-08-16-palette-tool-ux-refinement-design.md` (D3 depth 어포던스)
**개정:** 초안이 fable 리뷰에서 세 군데 사실 오류로 반려됨 — 아래 "초안에서 고친 것" 참조.

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

누른 스와치 칸 **바로 아래에** 화살표를 달고 뜬다. 레이아웃을 밀지 않는다(absolute).
어느 stop을 조정 중인지가 위치로 드러나므로 별도 라벨이 필요 없다 — **단 그건 눈에만
해당한다.** 스크린리더에는 위치가 없으므로 패널 `aria-label`에 stop 키를 넣는다
(`"700 후보"`).

**Popover이지 Tooltip이 아니다.** 내용물이 라디오 3개 + "기본으로" 버튼, 즉 상호작용
요소다. ARIA에서 `role="tooltip"`은 비상호작용 설명 전용이고 Radix·Base UI 모두 상호작용
내용에는 Popover를 쓰라고 명시한다. 최초 요청은 "툴팁"이었으나 성격을 확인해 Popover로
정정했다.

### D2. Popover는 `web/src/components/`에 둔다

`web/src/components/`가 이미 **여러 페이지가 공유하는 위젯 자리**다 — `OklchPicker`가
도구 크롬이면서 거기 있고 `builder` · `lab` · `inspector` · `color-palette` 네 곳이 쓴다.
`DS*` 프리뷰와 한 디렉터리에 섞여 있는 것은 사실이나, 그 선을 이번 사이클에 새로 그으려면
`OklchPicker` 이관과 import 4곳 수정이 딸려 온다. Popover 하나를 위해 파일 1개짜리 새
디렉터리를 만들고 반례를 남겨두는 것보다, 선반이 있는 곳에 얹는 쪽이 낫다.

**기각한 대안** `web/src/shared/` 신설: 초안의 근거("components/는 DS 프리뷰 전용")가
사실이 아니었다. 나중에 도구 크롬이 더 쌓여 분리가 값을 하게 되면 그때 `OklchPicker`와
함께 옮긴다 — 그건 이 사이클의 일이 아니다.

**Radix / Base UI에서 가져오는 계약:**

| 항목 | 구현 |
| --- | --- |
| 역할 | 패널 `role="dialog"` + `aria-label`(stop 키 포함) |
| 트리거 | `aria-expanded` · `aria-haspopup="dialog"` · `aria-controls` |
| 열림 | **패널 컨테이너 자신**(`tabIndex={-1}`)에 포커스 — 첫 자식이 아니다 (D5 참조) |
| 닫힘 | Esc · 바깥 `pointerdown` · 후보 확정 — **세 경로 모두** 포커스가 패널 안에 있었으면 트리거로 복귀 |
| 바깥 판정 | `pointerdown`으로 감지 (click이 아니다 — 패널 안에서 눌러 밖에서 뗀 드래그가 닫지 않도록) |
| 트리거 예외 | 트리거 자신은 "바깥"이 아니다 — 아니면 토글 클릭이 "닫힘 → 즉시 다시 열림"이 된다 |
| Esc 리스너 | `document` 레벨. 비모달이라 Tab이 패널 밖으로 나갈 수 있는데, 패널 keydown으로 잡으면 나간 뒤 Esc가 죽는다 |
| 모달성 | 비모달. 포커스 트랩 없음 (Radix Popover `modal={false}` 기본과 같다) |

닫힘 시 포커스 복귀는 **모든 경로**다. Radix의 `onCloseAutoFocus` 기본 동작이 그렇고
(바깥 클릭에서 복귀를 막으려면 오히려 `preventDefault`가 필요한 쪽이다), 실제로 라디오를
고르면 그 노드가 언마운트되므로 복귀가 없으면 포커스가 `body`로 떨어진다.

**기각한 대안 (a) Portal + `position: fixed`** (Radix의 실제 구현): 조상의 `overflow`나
`z-index` 문맥에 갇히지 않는 것이 이득인데, 이 도구에는 모달도 없고 상위에 `overflow`를
잘라내는 조상도 없다. 포털이 벌어주는 것이 없는 자리에서 스크롤·리사이즈 재계산과
jsdom 방어 코드만 늘어난다.

**기각한 대안 (b) floating-ui 도입**: 의존성 하나를 위해 얻는 것이 clamp 한 줄이다.

### D3. 위치는 앵커 기준 absolute + **띠 컨테이너** 기준 clamp

스와치 칸(스와치 + 캡션)을 `relative`로 감싸고 패널은 `absolute top-full left-1/2
-translate-x-1/2 z-20`. `top-full`이라 캡션 **아래**에 뜬다 — 조정 중인 stop 번호를
패널이 가리지 않는다.

**clamp 기준은 뷰포트가 아니라 띠 컨테이너다.** 실측 기하:

```
max-w-5xl 1024 − p-8 좌우 64 = 960
grid-cols-[1fr_320px] gap-8 → 왼쪽 컬럼 608px
flex gap-0.5 × 10 = 20px  →  칸 하나 (608−20)/11 ≈ 53px
```

패널을 ~170px로 잡으면 stop 950 칸 중앙 정렬 시 오른쪽으로 ~58px 넘친다. 뷰포트
가장자리는 한참 멀어서 **뷰포트 clamp는 발동조차 하지 않고**, 패널이 `gap-8`을 넘어
sticky `PreviewPane`을 덮는다. 그 목업이 hover 프리뷰를 실시간으로 보는 대상이라,
가리면 이 도구의 루프를 정면으로 거스른다.

구현: 띠 컨테이너 ref를 Popover에 넘겨, `useLayoutEffect`에서 패널 rect와 컨테이너 rect를
비교해 넘치는 만큼 px 오프셋 state를 잡는다. **화살표는 그 오프셋의 역부호만큼 되밀어**
언제나 앵커 칸 중앙을 가리킨다.

`z-20`은 명시적이다 — `PreviewPane`의 `sticky`가 스태킹 컨텍스트를 만든다.

jsdom은 모든 rect가 0을 준다 → 오프셋이 0으로 남고 아무 일도 일어나지 않는다.
테스트가 이 계산 때문에 깨지지 않는다.

### D4. hover 리프트를 뺀다 — 선행 스펙 D3의 부분 철회

조정 가능한 스와치의 3단계(기본 2px → hover 4px → press 눌림)에서 **hover만 뺀다.**
기본 그림자와 press 눌림은 남는다.

**가장 강한 근거는 D3 자신의 물리 계약이 hover에서 이미 깨져 있다는 것이다.**
`AdjustableScale.tsx`의 주석은 "press 이동 거리(2px)는 기본 깊이(2px)와 같게 맞춘다 —
눌렀을 때 칩이 그림자가 있던 자리에 정확히 내려앉도록"이라고 적어놨다. 그런데 마우스로
누르는 순간은 **항상 hover 중**이라 실제로는 4px 그림자에서 2px만 내려간다. 착지가 안
맞는다. hover 제거는 D3에 대한 반대가 아니라 D3가 세운 물리의 복원이다.

**부차적 근거:** 팔레트는 색을 비교하는 표면이라 마우스가 띠 위를 자주 가로지른다. hover
리프트는 "지나가는 것"과 "고르려는 것"을 구별하지 못한다. hover가 주는 타깃 확인 신호는
사이클 3.1에서 추가한 `cursor-pointer`가 이미 담당한다 — hover가 **아무 정보도 없다는
말은 아니고**, 그 정보가 중복이라는 말이다.

**기각한 대안 (a) 움직임 없는 hover** (transition 제거, 또는 그림자 색만 진해짐):
들썩임은 없애면서 타깃 확인은 남긴다. 기각 이유는 위 물리 근거다 — 깊이가 hover에서
달라지는 한 press 착지가 계속 안 맞는다. 색만 바꾸는 안은 깊이를 안 건드리므로 물리는
지키지만, 36px 칩 4개에 상태를 하나 더 얹는 값이 `cursor-pointer` 위에 없다.

**기각한 대안 (b) 그림자 전부 제거**: 조정 가능한 4개를 구분할 신호가 사라진다.
선행 스펙 D3의 결론(어포던스는 depth로 준다)은 유지된다.

**딸려오는 일:** `AdjustableScale.tsx:39-53`의 주석 블록이 hover 델타를 근거로 쓰고 있어
통째로 낡는다. 이번 변경 범위에 주석 갱신을 포함한다.

### D5. 열림 시 포커스는 패널 컨테이너에

첫 라디오로 포커스를 옮기면 안 된다. **네이티브 라디오 그룹에서 화살표 키는 이동이자
선택**이고, 이 화면의 라디오는 `onChange`에서 곧바로 확정 + 닫힘이다
(`CandidatePopover.tsx:71`). 즉 키보드 사용자가 후보를 둘러보려고 화살표를 누르는 순간
확정되고 팝오버가 닫힌다 — "고르기 전에 결과를 본다"(`CandidatePopover.tsx:4`)가
키보드에서만 성립하지 않는다.

패널 컨테이너(`tabIndex={-1}`)에 포커스한다. 이것이 Radix `Popover.Content`의 실제
기본 동작이기도 하다. 그러면:

| 키 | 결과 |
| --- | --- |
| 열림 | 패널에 포커스. 확정 없음 |
| Tab | 라디오 그룹 진입. **진입은 선택을 바꾸지 않는다** — `onFocus`로 hover와 같은 프리뷰를 띄운다 |
| ↓ / → | 네이티브대로 이동 = 선택 = 확정 + 닫힘 |
| Esc | 닫힘, 트리거로 포커스 복귀 |

`onFocus → onHover(hex)`가 hover 프리뷰의 키보드 대응물이다. 화살표 키에서 확정이
즉시 일어나는 것은 **남는 한계로 적어둔다**(아래 4번) — 없애려면 라디오를 버튼으로
바꿔야 하고 그건 페이지 테스트 8곳의 `getAllByRole("radio")`를 건드린다.

---

## 구조

```
web/src/components/Popover.tsx        (신규) 앵커 기준 absolute 패널 + 화살표 + 닫기 계약
web/src/components/Popover.test.tsx   (신규)

web/src/color-palette/
  AdjustableScale.tsx    hover 그림자 제거 · 주석 갱신 · 칸 relative
                         · 트리거 ARIA/ref · <Popover> 래퍼 렌더
  CandidatePopover.tsx   카드 크롬 제거, 내용물만 · 라디오에 onFocus 프리뷰
  ColorPalettePage.tsx   popover를 띠 바깥이 아니라 AdjustableScale에 넘김
```

**`<Popover>` 래퍼는 `AdjustableScale`이 렌더한다. 페이지는 내용물만 넘긴다.**
Popover는 `triggerRef`(바깥 판정 제외 + 포커스 복귀 대상)를 필요로 하는데, 트리거 버튼은
`AdjustableScale`이 map 안에서 그린다 — 페이지에는 그 DOM에 닿을 길이 없다. 같은 이유로
트리거의 `aria-expanded` · `aria-haspopup` · `aria-controls`와 패널 `id` 생성도 전부
`AdjustableScale` 책임이다.

`AdjustableScale`이 받는 것:

```
openIndex: number | null
popoverContent: ReactNode      // 페이지가 만든 <CandidatePopover/>
onClose: () => void
```

상태(`open` / `hover`)와 후보 계산은 지금 그대로 `ColorPalettePage`와 `CandidatePopover`에
남는다 — 옮기는 것은 **어디에 그리는가**뿐이다.

**Popover의 인터페이스:**

```
open: boolean
onClose: () => void
label: string                   // 패널 aria-label — stop 키 포함
id: string                      // 트리거의 aria-controls 대상
triggerRef: RefObject<HTMLElement>
boundaryRef: RefObject<HTMLElement>   // clamp 기준 (띠 컨테이너)
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
(조정 불가라 popover가 없다) · `#builder` · `OklchPicker`의 위치.

---

## 테스트

**Popover (신규) — 닫힘 계약의 유일한 방어선이다.** 아래 "왜 유일한지" 참조.
`fireEvent.pointerDown`을 쓴다.

- 열리면 패널 컨테이너에 포커스가 간다 (첫 라디오가 **아니다**)
- Esc가 닫고 트리거로 포커스가 돌아온다
- 바깥 `pointerdown`이 닫는다 / 패널 안 `pointerdown`은 안 닫는다 / **트리거 위
  `pointerdown`은 안 닫는다**(토글이 재열림으로 새지 않도록)
- 패널이 `role="dialog"`이고 트리거의 `aria-expanded`가 열림 상태를 따라간다

**AdjustableScale**
- 기존 4개 유지
- 추가: 조정 가능한 스와치에 hover 그림자 클래스가 없다 (기본 그림자는 그대로 있다)
- 추가: 열린 stop의 칸 **안에** 패널이 있다 (앵커 관계가 DOM으로 고정됨)

**ColorPalettePage** — 기존 테스트는 한 줄도 안 고친다. 추가 1개:
- 열린 채 **다른** 스와치를 누르면 그 stop의 패널로 옮겨간다
  (실브라우저에서 pointerdown 닫힘 → click 토글 열림의 2-이벤트 시퀀스가 되는 경로.
  지금 어느 테스트에도 없다.)

**"기존 페이지 테스트가 안 깨진다"가 왜 성립하는지 — 그리고 그게 왜 위안이 아닌지.**
성립한다(34개 대조 완료). 그런데 이유가 "새 동작이 무해해서"가 아니라 **`fireEvent.click`이
jsdom에서 `pointerdown`을 발화하지 않아서**다. 즉 바깥-닫기와 트리거-제외 코드는 페이지
스위트에서 **한 번도 실행되지 않는다** — 스펙을 어기고 click 기반으로 구현해도 통과한다.
그래서 닫힘 계약의 회귀 방어는 전적으로 `Popover.test.tsx` 몫이고, 그 파일은 얇아지면
안 된다.

**깨지면 안 되는 것:** `getAllByTestId("swatch")` 66개, `#builder` 스모크,
`App.test.tsx` 라우팅.

---

## 알려진 한계

1. **clamp가 스크롤·리사이즈에 재계산되지 않는다.** absolute라 앵커와 함께 움직이므로
   위치는 안 틀어지고, 열려 있는 동안 창 폭이 바뀌는 경우에만 clamp가 낡는다.
2. **비모달이라 Tab이 패널 밖으로 나간다.** 나가도 닫히지 않는다 — 후보를 보면서 다른
   컨트롤을 만질 수 있는 편이 이 화면에서는 낫다고 봤다.
3. **키보드 프리뷰는 Tab 진입에만 붙는다.** 화살표 키는 네이티브 라디오 그룹 규칙대로
   이동 즉시 선택 = 확정 + 닫힘이다. 없애려면 라디오를 버튼(`aria-pressed`)으로 바꿔야
   하고, 그건 페이지 테스트 8곳의 `getAllByRole("radio")`를 건드린다. 확정은 되돌릴 수
   있고(`기본으로`) URL에 남으므로 함정의 대가가 작다고 보고 이번엔 남긴다.
4. **패널 폭이 칸보다 3배 넓다.** 53px 칸 아래 ~170px 패널이라 좌우 이웃 칸을 덮는다.
   화살표가 앵커를 가리키므로 어느 stop인지는 읽히지만, 덮인 이웃 색은 패널을 닫아야
   다시 보인다.

---

## 초안에서 고친 것 (fable 리뷰)

1. **`triggerRef` 배선이 불가능했다.** 초안은 페이지가 popover 노드를 만들어 넘기게
   해놓고 Popover에 `triggerRef`를 요구했다 — 페이지는 트리거 DOM에 닿을 수 없다.
   `<Popover>` 래퍼를 `AdjustableScale`로 내리고 페이지는 내용물만 넘기는 것으로 정정.
2. **clamp 전제가 틀린 기하 위에 있었다.** "칸 36px"은 `h-9` **높이**를 폭으로 착각한
   것이고(실제 ~53px), "띠가 페이지 폭을 거의 다 쓴다"도 틀렸다(608px 컬럼). 뷰포트
   clamp로는 stop 950에서 `PreviewPane`을 덮는 것을 못 막는다 → 컨테이너 기준으로 정정.
3. **포커스 복귀를 Esc에만 걸어놨다.** Radix는 닫힘 사유와 무관하게 복귀시킨다.
   라디오 확정 시 포커스가 `body`로 떨어지는 버그가 됐을 것 → 세 경로 모두로 정정.
4. **`components/`가 DS 프리뷰 전용이라는 근거가 사실이 아니었다** (`OklchPicker`가
   반례) → `shared/` 신설을 접고 `components/`에 두는 것으로 정정.
5. **D4 논증이 물렀다.** "hover가 정보를 더하지 않는다"는 과장이었고(타깃 확인 정보는
   준다), "움직임 없는 hover" 대안이 기각 목록에 없었다. 대신 코드 주석에 이미 있던
   press 착지 물리 근거를 주논거로 세웠다.
6. **키보드에서 "고르기 전에 본다"가 성립하지 않았다** → D5 신설.
