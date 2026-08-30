# 컬러 팔레트 제너레이터 (사이클 3) — 설계

`#builder`의 5단계 학습 플로우를 대체하지 않고, 그 옆에 **누구나 쓰는 도구**를
`/color-palette`로 새로 세운다. 엔진과 산출물은 그대로 쓴다.

- 선행: `docs/superpowers/specs/2026-08-10-palette-color-export-design.md` (사이클 2, 산출물)
- 선행: `docs/superpowers/specs/2026-08-09-palette-generator-color-system-design.md` (사이클 1, 색 시스템)
- 빌더 원안: `docs/superpowers/specs/2026-07-27-guided-palette-builder-design.md`
- 역할 레이어 원안: `docs/superpowers/specs/2026-07-28-dark-accent-roles-design.md`
- 프로젝트 기준점: `docs/IDENTITY.md`

## 목적

`#builder`는 학습을 위해 만든 화면이고 그 목적은 달성했다. 그러나 도구로서는 세 가지가
막힌다 — 사용자가 직접 지목한 마찰이다:

1. **화면에 요소가 너무 많다.** 한 단계에서 11-stop 스트립이 4개 떠 있다 (후보 카드
   3개가 각각 전체 스케일을 그리고 + 하단 상시 미리보기 1개).
2. **무엇이 바뀌었는지 알 수 없다.** 후보 간 실제 차이는 11개 중 1개 stop이다. 색 칩
   44개 중 3개가 다르고, 300·700 단계에서는 그 차이가 채도 배율 0.55 / 0.689 / 0.83 —
   14px 칩에서 거의 안 보인다.
3. **어떤 결과를 얻는지 예상하기 어렵다.** 색이 실제로 무엇을 하는지 보여주는 목업은
   완료 화면에만 있다. 고르는 내내 추상적인 색 띠만 본다.

셋은 한 뿌리다: **고르는 단위는 "이 stop의 성격"인데 보여주는 단위가 "전체 스케일"이라
차이가 표시 단위 안에서 희석된다.**

### 성공 기준

1. 액센트 색 하나만 입력하면 완전한 색 시스템(액센트 + 뉴트럴 + 상태색 4종 + 역할)이
   즉시 나오고, 4개 파일을 받을 수 있다. **추가 입력은 전부 선택이다.**
2. stop을 조정할 때 팔레트와 UI 목업이 **같은 화면에서 동시에** 반응한다 — 확정 전에
   결과를 본다.
3. 새로고침해도 상태가 유지되고, URL을 남에게 주면 같은 팔레트가 열린다.
4. 산출물의 모든 역할 조합에 대해 WCAG 2.2 AA 충족 여부가 화면에 표시되고, 사용자가
   바꿀 수 있는 스케일(액센트·뉴트럴)의 미달은 한 번의 클릭으로 고쳐진다.
5. 제품 엔진이 `src/lab/`(연구 코드) 밖에 산다.

### 비-목표

- `#builder`를 없애지 않는다. 학습 화면으로 남는다. **다만 무변경은 아니다** — `ScaleRole`이
  판별 유니온이 되므로(D5) `BuilderPage.tsx`의 `tip()`·`MockPanel`·`DarkSection` 역할표가
  `kind === "stop"`으로 좁히도록 바뀌고, 솔리드 버튼의 `text-white` 하드코딩이 `on-solid`으로
  교체된다. 화면이 하는 말과 학습 플로우는 그대로다.
- `/` 레거시 위저드를 건드리지 않는다 (BACKLOG 1.2는 열린 채).
- 비색 카테고리(타이포·간격·라운드·엘리베이션·컴포넌트)를 다루지 않는다 (BACKLOG 1.1).
- 산출물 4종의 내용·포맷은 on-solid 역할 추가 외에 바뀌지 않는다.

## 범위

**이 사이클:**
`src/color/` 신설(엔진 졸업) · `src/color/contrast.ts` 신설 · `on-solid` 역할 추가와
그에 따른 `ExportRole` 확장 · `/color-palette` 화면 · URL 직렬화 ·
`downloadFile` 공용화(부채 상환).

**이 사이클이 아닌 것:**
localStorage · 임의 stop 미세조정(50·300·700·950 외) · APCA · 자동 팔레트 제안 ·
비색 카테고리 · 위저드 정리 · Figma 별칭.

---

## 확정된 결정

### D1. 엔진을 `src/color/`로 졸업시킨다

`src/lab/palette/builder.ts:11`에 이렇게 적혀 있다:

> 실험 코드 — 제품 파이프라인에서 import 금지 (웹 #builder 라우트 전용).

이 사이클은 바로 그 파일을 제품의 본체로 만든다. 그대로 두면 주석이 거짓말이 되고,
같은 폴더의 진짜 연구 코드(`hct`·`leonardo`·`radix`·`naive`·`v1`·`bench`·`metric`)와
제품 엔진을 구분할 근거가 사라진다. 사이클 2가 D1에서 의도적으로 남긴 부채이며
BACKLOG 3.1에 기록돼 있다.

```
src/color/                  ← 신설: 산출물에 영향을 주는 것
  curve.ts       OURS_CURVE                       (ours.ts에서 분리)
  scale.ts       fillScale · clampToGamut · STOP_KEYS · SCALE_SIZE · Pin
  candidates.ts  candidatesFor · Candidate
  neutral.ts     buildNeutral · TINT_ATTRACTORS · snapTint · tintAttractor
  semantic.ts    buildSemantic · SEMANTIC_ANCHORS
  roles.ts       SCALE_ROLES · SCALE_ORDER · ScaleSet · scaleHasAnchor
  contrast.ts    신설 (D4)

src/lab/palette/            ← 비교·학습에만 쓰는 것
  ours.ts        oursAlgorithm (src/color/curve.ts를 import)
  guided.ts      신설: BUILDER_FLOW · BUILDER_STEPS · STEP_META
  hct · leonardo · radix · naive · v1 · bench · metric · lab-data · index · types
```

경계 규칙: **`src/color/`는 산출물에 영향을 주는 것, `src/lab/`은 비교·학습에만 쓰는 것.**

`STEP_META`(단계별 안내 카피)와 `BUILDER_FLOW`(500→50→950→300→700 순서)가 `src/lab/`으로
가는 것이 이 분리의 핵심이다. 그 순서는 Refactoring UI의 **학습 순서**이지 엔진의
제약이 아니다 — `fillScale`은 앵커 pin 하나만으로도 완전한 11-stop을 낸다. 코드 위치가
그 사실을 말하게 한다.

`src/export/color/`는 위치가 바뀌지 않는다. 구조적 타입으로만 엔진을 받으므로
(`adapter.ts`의 `ScaleSetLike`) import 방향이 원래 없다.

**로직 변경은 `curve.ts` 분리 하나뿐이다.** 나머지는 순수 이동이므로 기존 테스트가
**수정 없이** 통과해야 한다. `tests/lab/{builder,neutral,semantic,roles}.test.ts`는
`tests/color/`로 함께 이사한다.

**기각한 대안:** 이동 없이 `builder.ts`의 금지 주석만 고친다. 이번 사이클이 가벼워지지만
제품 엔진과 연구 장치가 같은 폴더에 계속 섞이고 BACKLOG 3.1이 그대로 남는다.

### D2. 라우트는 진짜 path `/color-palette`, 라우터 라이브러리는 안 넣는다

`web/src/App.tsx`가 지금 `window.location.hash`만 본다. `pathname` + `popstate`를 더한다.
화면 4개(`/`, `/color-palette`, `#lab`, `#builder`)에 라우터 의존성은 과하다.
Vite는 dev·preview 모두 기본이 SPA fallback이라 설정 변경이 없다.
`#lab`·`#builder`는 그대로 동작한다.

**정적 호스팅 시 주의:** 현재 레포에 배포 설정이 없다. 나중에 붙일 때
`/color-palette` → `index.html` rewrite가 필요하다.

### D3. 화면은 "즉시 결과 + 제자리 조정", 2단 레이아웃

필수 입력은 **액센트 하나**. 나머지는 이미 완성된 팔레트 위에서 선택적으로 조정한다.

왼쪽(입력·팔레트) / 오른쪽(목업, sticky). 조정 가능한 4자리(50·300·700·950)는
**누르기 전에 구분되게 표시한다** — "눌러보면 뭔가 나온다"는 발견에 기대지 않는다.
stop을 누르면 그 자리에 3옵션 팝오버가 열리고, 옵션에 **hover하는 순간** 팔레트와
목업이 그 색으로 다시 그려진다(확정 아님). 클릭해야 확정된다.

이것이 목적 2번을 푸는 지점이다. 300을 바꾸면 사이 구간(100·200·400)이 같이 움직이는데,
팔레트가 **제자리에서** 바뀌므로 그 움직임이 보인다. 스트립 4개를 눈으로 비교하지 않는다.

**기각한 대안 (a) 마법사 유지, 표시만 개선:** 5단계는 학습 순서다. 도구에서는 쓸 줄 아는
사람에게도 5단계를 강제한다. `#builder`가 이미 그 형태를 맡고 있다.
**기각한 대안 (b) 목업 우선(화면 대부분이 UI, 팔레트는 얇은 바):** 11-stop 전체를 다루는
도구로는 팔레트가 너무 작아진다.
**기각한 대안 (c) 팔레트만, 목업은 접기:** 가장 조용하지만 "결과 예측"이 한 번 더
클릭해야 나온다 — 목적 3번이 안 풀린다.

### D4. 대비는 WCAG 2.2 AA, 검사 대상은 **사용자가 바꿀 수 있는 것만**

기준: 본문 4.5:1. APCA는 더 정확하지만 아직 초안이고, 숫자의 의미를 설명 없이 전달할 수
없다 — 이 도구는 설명을 지지 않기로 했다(D9).

**검사하는 쌍** (라이트/다크 각각):

| 전경 | 배경 | 기준 |
| --- | --- | --- |
| `text` | 같은 스케일 `subtle-bg` | 4.5 |
| `text` | 페이지 배경 (뉴트럴 50 / 950) | 4.5 |
| `text-strong` | 같은 스케일 `subtle-bg` | 4.5 |
| `text-strong` | 페이지 배경 | 4.5 |
| `on-solid` | `solid` | 4.5 |

**`border`는 검사하지 않는다.** 측정값이 어떤 앵커에서도 1.15~1.36으로 3:1을 한 번도
넘지 않고, 넘게 만들면 테두리가 테두리가 아니게 된다. WCAG의 3:1은 *조작 가능한 UI
컴포넌트의 경계*에 붙는 요구지 장식적 카드 테두리에 붙는 것이 아니며, Radix도 border
스텝을 의도적으로 낮게 둔다. 넣으면 모든 팔레트에 영구적으로 못 고치는 실패가 떠서
뱃지 전체가 소음이 된다.

**이동 제안의 입력은 액센트·뉴트럴뿐이다.** 상태색은 계산해서 뱃지로 표시만 하고
이동 계산에 넣지 않는다. 근거는 아래 측정이다.

#### 측정 (2026-08-15, 앵커 7종 × 6스케일 × 라이트/다크)

라이트 테마 `text`(idx 6)가 AA를 못 맞추는 주된 원인은 액센트가 아니라 **상태색**이다.
상태색 앵커는 고정값이라 사용자가 무엇을 골라도 값이 변하지 않는다:

| 스케일 | 라이트 text 대비 | 라이트 text-strong 대비 | 앵커 의존성 |
| --- | --- | --- | --- |
| `warning` | **2.96** ✗ | **4.47** ✗ | 없음 (항상 동일) |
| `success` | **3.03** ✗ | **4.43** ✗ | 없음 (항상 동일) |
| `error` | 4.80 | 6.50 | 없음 |
| `info` | 4.66 | 6.28 | 없음 |
| `neutral` | 7.33 | 9.87 | 거의 없음 |
| `accent` (파랑 `#3b82f6`) | 4.62 | 6.19 | — |
| `accent` (노랑 `#eab308`) | **2.61** ✗ | **3.98** ✗ | — |

전역 이동으로 상태색까지 통과시키려면 **어떤 앵커에서든 항상 `text` 6→8,
`text-strong` 7→9**가 나온다 (앵커 6종 전부에서 필요 인덱스의 최댓값이 8로 동일).
즉 그것은 사용자별 조정이 아니라 `SCALE_ROLES` 기본값의 성격 변경이고, 파랑 액센트처럼
이미 통과하는 경우까지 상태색 사정 때문에 800번대로 끌어내려 어둡게 만든다.

다크 테마는 전 조합 통과한다(text 5.6~8.9). 문제는 라이트 전용이다.

**결론:** 도구는 사용자가 바꿀 수 없는 것 때문에 바꿀 수 있는 것을 망가뜨리지 않는다.
상태색 미달은 화면 뱃지 + DESIGN.md 명시로 정직하게 드러내고 값은 건드리지 않는다.

**기각한 대안 (a) 기본 역할표를 6→8 / 7→9로 변경:** 모든 산출물이 AA를 만족하지만 모든
팔레트의 텍스트가 어두워지고 Tailwind의 `text-*-600` 관례와 멀어진다.
**기각한 대안 (b) 스케일별 역할 이동:** 품질은 가장 좋으나 `ColorSystem.roles`가
스케일별로 쪼개져 `types.ts`·`vars.ts`·`design-md.ts`가 함께 바뀌고, DESIGN.md가 역할표
6개를 싣게 된다 (지금은 `{스케일}` 자리표시자로 한 번만 렌더 — `design-md.ts:17`).

#### 이동 규칙

`text`와 `text-strong` 각각 독립적으로, 라이트는 인덱스를 **늘리는** 방향, 다크는
**줄이는** 방향으로 액센트·뉴트럴이 **둘 다** 통과하는 최소 인덱스를 찾는다.
`text-strong`은 항상 `text`보다 진하게 유지한다(라이트에서 더 큰 인덱스). 사용자가
"적용"을 누르면 오버라이드된 역할 배열이 상태에 들어가고 그대로 `toColorSystem`에
넘어간다 — 산출 배관은 이미 역할표를 인자로 받으므로(`adapter.ts:24`) 변경이 없다.
되돌리기 가능하다.

이동은 전역이다(모든 스케일이 같은 역할표를 공유). 이동이 상태색에 미치는 영향은
"더 진해진다"뿐이라 해가 되지 않는다.

### D5. `on-solid` 역할을 추가하고, `ExportRole`을 판별 유니온으로 넓힌다

지금 역할표에 "솔리드 위 글자"가 없다. 목업과 미리보기가 `text-white`를 하드코딩하고
있고(`BuilderPage.tsx:130`, `ExportPanel.tsx:148`), 산출물을 받아간 사람은 버튼 글자색을
스스로 정해야 한다.

이 실패는 **stop을 옮겨서 풀 수 없다.** 스케일 자신의 50/950으로는 양쪽 다 실패하는
경우가 흔하다:

| 앵커 | 자기 50 | 자기 950 | 순수 흰색 | 순수 검정 |
| --- | --- | --- | --- | --- |
| 파랑 `#3b82f6` | 3.45 ✗ | 4.02 ✗ | 3.68 ✗ | **5.71** |
| 보라 `#8b5cf6` | 3.95 ✗ | 3.57 ✗ | 4.23 ✗ | **4.96** |
| 노랑 `#eab308` | 1.80 ✗ | **7.66** | 1.92 ✗ | **10.95** |
| 뉴트럴 | **4.58** | 4.16 ✗ | **4.78** | 4.39 ✗ |

`on-solid`은 **흑 또는 백 리터럴**이어야 하고, 어느 쪽인지는 **스케일마다 다르다**
(노랑 액센트 팔레트에서 뉴트럴은 흰 글자, 액센트는 검은 글자).

#### 선택 규칙 — 흰색 우선, 바닥 아래에서만 검정

순수하게 "대비가 높은 쪽"을 고르면 **파랑·빨강 솔리드 버튼의 글자가 전부 검정이 된다**
(파랑 흰색 3.68 미달 / 검정 5.71 통과). 그런데 Tailwind·Radix·Bootstrap이 모두 그 자리에
흰 글자를 쓴다. 흰색-on-파랑이 AA를 아슬하게 못 넘는 것은 WCAG 2.x의 알려진 성질이고
(APCA는 같은 조합에서 흰색을 낸다), 여기서 산술을 엄격히 따르면 기본 팔레트의 첫인상이
"검은 글자 파란 버튼"이 되어 사용자가 버그로 읽는다.

D4가 상태색에 대해 이미 고른 방식과 대칭을 맞춘다 — **값은 관례대로 두고 미달은 정직하게
드러낸다.**

```
흰색 대비가 3.0 이상이면 흰색.
아니면 흑백 중 대비가 높은 쪽.
```

`3.0`은 WCAG가 큰 글씨·UI 경계에 요구하는 최저선이다. 그 아래는 글자를 아무리 키워도
읽히지 않으므로 거기서는 관례보다 가독이 앞선다. 이 규칙의 실제 결과:

| 스케일 | 흰색 대비 | 선택 | 뱃지 |
| --- | --- | --- | --- |
| 액센트 파랑 `#3b82f6` | 3.68 | 흰색 | ⚠ 미달 표시 |
| 액센트 노랑 `#eab308` | 1.92 | **검정** (10.95) | 통과 |
| 액센트 보라 `#8b5cf6` | 4.23 | 흰색 | ⚠ 미달 표시 |
| 뉴트럴 | 4.78 | 흰색 | 통과 |
| `error` | 3.81 | 흰색 | ⚠ 미달 표시 |
| `warning` | 2.14 | **검정** (9.81) | 통과 |
| `success` | 2.28 | **검정** (9.23) | 통과 |
| `info` | 3.71 | 흰색 | ⚠ 미달 표시 |

**기각한 대안 (a) 대비가 높은 쪽을 무조건:** 모든 산출물이 AA를 만족하지만 기본 팔레트가
관례를 깨고 사용자가 그것을 버그로 읽는다.
**기각한 대안 (b) on-solid에만 APCA:** 관례와 산술이 동시에 맞지만 한 화면에 두 개의 대비
기준이 공존하고, 이월하기로 한 APCA를 뒷문으로 들인다.

#### 값을 누가 계산하는가

`src/export/`는 대비 수학을 자기 안에 감추지 않는다. 감추면 `types.ts:3-5`가 선언한
"엔진과 어긋날 사본이 산출 코드 안에 존재할 수 없다"가 깨지고, 화면 뱃지(엔진 계산)와
산출 파일(산출 코드 계산)이 경계값에서 갈라진다 — 미리보기는 흰 글자인데 `palette.css`는
검정인 상태가 가능해진다. 반대로 `src/export/`가 `src/color/`를 import하면 사이클 2의
격리가 반대 방향으로 깨진다.

**계산 함수는 주입받지 않는다.** `src/export/color/vars.ts`에 `defaultResolver` 구현
하나만 두고, `roleVars`(→ `palette.css`·`palette.theme.css`)와 `toColorFigma`(→
`palette.figma.json`)가 이 하나만 직접 호출한다. (`renderColorDesignMd`는 리터럴 색을
계산하지 않고 "스케일마다 흑/백 자동"이라는 고정 문구만 내므로 이 함수를 부르지
않는다 — 값 계산에서는 빠지지만 표현은 나머지 셋과 어긋나지 않는다.) 파라미터로
열어두면 호출자마다 다른 함수를 넘길 수 있게 되어 "산출물 사이에서 값이 갈라질 수
없다"는 약속이 구조적으로 깨진다(`vars.ts`가 이미 CSS 두 장의 변수 목록을 공유시키는
자리다 — D4/사이클 2). 엔진의 `onSolidColor`와 값이 어긋나지 않는지는 두 구현을 맞대는
테스트가 고정한다. 사본을 없앨 수 없다면(산출 코드는 엔진을 몰라야 하므로) 갈라지는
것만은 테스트가 막는다.

```ts
// src/export/color/types.ts
export type ExportRole =
  | {
      readonly kind: "stop";
      readonly id: string;
      readonly label: string;
      readonly lightIndex: number;
      readonly darkIndex: number;
    }
  | {
      readonly kind: "contrast";
      readonly id: string;
      readonly label: string;
      /** 이 역할과 대비되는 색을 고른다. 같은 스케일의 `kind: "stop"` 역할 id. */
      readonly against: string;
    };
```

엔진 쪽 `ScaleRole`(`src/color/roles.ts`)도 같은 `kind` 판별자를 갖도록 함께 넓힌다.
`ScaleRole`은 `note`(교보재 카피)를 하나 더 가질 뿐 나머지 필드가 같으므로 지금처럼
**구조적으로 `ExportRole`에 대입 가능한 상태를 유지한다** — `ExportPanel.tsx:42`가
`SCALE_ROLES`를 `toColorSystem`에 그대로 넘기는 것이 계속 성립해야 한다.

**의존 방향 주의:** `src/color/contrast.ts`는 `src/export/`를 import하지 **않는다.**
엔진은 자기 타입(`ScaleRole`)만 다루고, `ScaleRole → ExportRole` 변환은 지금처럼
구조적 대입으로 어댑터 경계에서 일어난다. 사이클 2가 세운 "산출 코드는 엔진을 모르고,
엔진도 산출 코드를 모른다"를 이 사이클에서 깨지 않는다.

`kind: "contrast"`는 값을 **산출 시점에 스케일별로** 계산한다. `vars.ts`의 `roleVars`가
이미 `모든 스케일 × 모든 역할`로 돌므로 루프 구조가 그대로고, **역할 배열은 평평한 채로
남는다.** `solid`이 테마 간 고정(`lightIndex === darkIndex === 5`)이므로 `on-solid`도
테마 간 고정이라 `darkRoleVars`에 재선언되지 않는다.

DESIGN.md 역할표에는 라이트/다크 stop 칸 대신 "스케일마다 흑/백 자동 선택" 한 줄로
적는다 — 역할표 한 번 렌더 구조가 유지된다.

`assertColorSystem`은 `kind`에 따라 갈라져 검사한다:

- `stop` — 인덱스 범위
- `contrast` — `against`가 실재하는 `stop` 역할 id인가, **그리고 그 역할이 테마 간 고정
  (`lightIndex === darkIndex`)인가.** 이 검사가 없으면 나중에 누가 `against: "subtle-bg"`
  같은 역할을 더했을 때 다크에서 틀린 값이 소리 없이 나간다 — `darkRoleVars`가 대비 역할을
  통째로 건너뛰는 것이 "참조 대상이 테마 간 고정"이라는 전제 위에 서 있기 때문이다.
- 둘 다 아닌 `kind` — 즉시 던진다. 암묵적 기본값을 두지 않는다.
- 모든 역할 — `id` 중복 금지 (스케일 이름 중복 가드는 이미 있다)

### D6. URL은 `replaceState`, pin은 hex로 저장

```
/color-palette?v=1&a=3b82f6&s0=f3f8ff&s3=9dc3ff&s7=1d59b9&s10=0f274e&n=cool-soft&t=8-4&ts=9-3
```

| 파라미터 | 뜻 |
| --- | --- |
| `v` | 포맷 버전 (현재 `1`) |
| `a` | 액센트 hex, `#` 없이. **이것만 있으면 나머지는 전부 기본값** |
| `s0` `s3` `s7` `s10` | 조정한 stop의 hex. 조정 안 했으면 생략 |
| `n` | 뉴트럴 틴트 `{어트랙터id}-{soft\|strong}` (예: `cool-soft`). 무채색은 강도가 없으므로 `achromatic` 단독 |
| `t` `ts` | 역할 이동 적용 시의 `text`·`text-strong` 인덱스, `{라이트}-{다크}` (예: `8-4`). 기본값이면 생략 |

`t`·`ts`가 라이트만이 아니라 라이트·다크 쌍인 이유: 측정상 다크는 이동이 필요 없었지만
(D4), `RoleShift`는 `theme`을 갖는 타입이고 앵커·후보 상수가 바뀌면 다크 이동이 나올 수
있다. 라이트만 저장하면 그때 URL이 상태를 잃는다.

**pin의 수명 — 액센트가 바뀌면 폐기한다.** `fillScale`은 인접 고정점 사이를 hue까지
보간하므로(`scale.ts`의 `hueLerp`), 파랑에서 고른 `s3` pin이 남은 채 액센트를 빨강으로
바꾸면 100·200·400이 파랑과 빨강이 섞인 색이 된다. 게다가 그 pin은 어떤 후보와도 일치하지
않아 화면에서 "선택 없음"으로 보이면서 값은 계속 적용된다 — 사용자가 원인을 알 수 없고,
그 상태 그대로 URL이 공유된다. `#builder`의 `redo()`가 이미 세운 원칙(앞 단계를 바꾸면 뒤
선택은 무효)을 그대로 계승한다. 액센트 hex가 바뀌는 순간 `s0`·`s3`·`s7`·`s10`을 전부 버린다.

**이동의 수명:** pin과 달리 **역할 이동은 유지된다.** 이동은 특정 액센트에서 파생된 색이
아니라 "이 시스템은 텍스트를 몇 번째 자리에 둔다"는 시스템 전체의 진술이기 때문이다.
적용된 이동은 명시적 값으로 상태에 남고, 이후 액센트를 바꿔도 유지된다
(자동 재계산하지 않는다). 새 액센트에서 미달이 다시 생기면 새 제안이 뜬다. 사용자가
"기본으로"를 눌러야 원래 역할표로 돌아간다 — 도구가 사용자가 확정한 값을 몰래 되돌리지
않는다.

`pushState`가 아니라 `replaceState`다 — 클릭마다 히스토리가 쌓이면 뒤로가기가 조정
하나하나를 되짚는다. 대가: 뒤로가기가 페이지를 떠난다. 조정 취소는 팝오버의
"기본으로"가 맡는다.

**pin을 옵션 번호(0·1·2)가 아니라 hex로 저장하는 이유:** 후보 상수(`candidates.ts`의
채도 배율 등)는 앞으로 바뀔 물건이다. 번호로 저장하면 공유 링크가 가리키는 색이 조용히
달라진다. hex는 변하지 않는다. 화면은 hex가 현재 후보 중 하나와 일치하면 그 후보를 선택
표시하고, 아니면 아무것도 선택되지 않은 상태로 둔다(사용자가 값을 잃지는 않는다).

### D7. 상태색은 화면에 보이되 고를 수 없다

산출물에 무조건 들어가므로 화면에 없으면 받아간 파일에 모르는 색이 들어있게 된다.
4스트립을 얇게 노출하되 조정 UI를 붙이지 않는다. 대비 뱃지는 붙는다(D4).

### D8. 목업은 라이트·다크를 **동시에** 보여준다

토글이 아니다. 대비 실패는 다크에서만 나는 경우가 흔한데, 토글이면 그것을 못 보고
지나간다. `MockPanel`(`BuilderPage.tsx:82`)을 재사용하되 뉴트럴 배경과 상태색 배지까지
포함해 6역할 + `on-solid`이 전부 등장하게 한다.

이로써 지금 완료 화면의 다크 시연 중복(`DarkSection`의 목업·역할표 + `ExportPanel`의
미리보기 토글, BACKLOG 4 "화면" 항목)이 새 화면에서는 처음부터 하나다.

### D9. 이 화면은 교보재를 지지 않는다

`docs/IDENTITY.md`의 역할 3번(학습 교보재)은 프로젝트 전체에 대한 선언이고, 그 역할은
코드 주석·스펙·`docs/research/`가 계속 진다. **도구 UI에는 적용하지 않는다** — 도구를
만드는 과정 자체가 학습이며, 산출물이 그 룰을 일차원적으로 상속할 필요는 없다.

따라서 화면에서 빠지는 것: 단계별 설명 문단(`STEP_META.description`), 후보의
`note` 카피, 역할 매핑의 `note` 열, "내가 고른 여정" 요약, 단계 표시 점.
엔진의 이 데이터는 **지우지 않는다** — `#builder`가 계속 쓴다. 새 화면이 안 읽을 뿐이다.

`#builder`는 학습 화면으로 그대로 남고, `/`(레거시 위저드)도 그대로 남는다.
BACKLOG 1.2는 새 도구가 실제로 선 뒤에 판단한다.

---

## 아키텍처

```
액센트 hex ──┐
             ├─→ src/color/scale.ts      fillScale(pins) ──→ 액센트 11-stop
조정 pin 4개 ─┘                                                      │
                                                                     ├─→ ScaleSet
액센트 hue ──→ src/color/neutral.ts      snapTint → buildNeutral ────┤
                                                                     │
(입력 없음) ──→ src/color/semantic.ts    buildSemantic × 4 ──────────┘
                                                                     │
                             src/color/roles.ts   SCALE_ROLES ───────┤
                                                        │            │
                             src/color/contrast.ts ─────┤            │
                              (검사 · 이동 제안 · on-solid)           │
                                                        ▼            ▼
                                      역할표(오버라이드 반영)   ScaleSet
                                                        └──────┬─────┘
                                                               ▼
                                    src/export/color/adapter.ts  toColorSystem()
                                                               ▼
                                              css · theme-css · figma · design-md
```

`web/src/color-palette/`는 렌더만 한다. 스케일 계산·후보 생성·대비 판정·이동 계산은
전부 `src/color/`의 순수 함수다 (FP 원칙: 판단은 엔진에, `web/`은 렌더만).

### `src/color/contrast.ts` 공개 표면

```ts
/** WCAG 2.2 상대 휘도 기반 대비비. 입력은 #rrggbb. */
export function contrastRatio(a: string, b: string): number;

/** 이 스케일의 solid 위에 올릴 글자색. 흑/백 중 대비가 높은 쪽. */
export function onSolidColor(solidHex: string): "#000000" | "#ffffff";

export interface ContrastCheck {
  readonly scaleName: string;
  readonly roleId: string;
  readonly theme: "light" | "dark";
  /** 무엇을 배경으로 쟀는가. "solid"는 on-solid 검사에서만 나온다. */
  readonly against: "subtle-bg" | "page" | "solid";
  readonly ratio: number;
  readonly required: number;
  readonly passes: boolean;
  /** 사용자가 이 스케일을 바꿀 수 있는가 — 뱃지만 띄울지 고치기를 권할지 가른다.
   *  액센트·뉴트럴은 true, 상태색은 false (D4). */
  readonly adjustable: boolean;
}

/** 검사 대상 전 조합. 화면 뱃지의 입력. border는 포함되지 않는다. */
export function checkContrast(
  scales: ScaleSet,
  roles: readonly ScaleRole[],
): ContrastCheck[];

export interface RoleShift {
  readonly roleId: "text" | "text-strong";
  readonly from: number;
  readonly to: number;
  readonly theme: "light" | "dark";
}

/** 액센트·뉴트럴만 통과시키는 최소 이동. 이동이 필요 없으면 빈 배열. */
export function suggestRoleShifts(
  scales: ScaleSet,
  roles: readonly ScaleRole[],
): RoleShift[];

/** 제안을 역할표에 적용한 새 배열. 원본은 안 바꾼다. */
export function applyRoleShifts(
  roles: readonly ScaleRole[],
  shifts: readonly RoleShift[],
): ScaleRole[];
```

---

## UI

### `/color-palette` 구성

```
┌──────────────────────────────┬───────────────────────────┐
│ 액센트  [피커] [#3b82f6    ] │  목업 · 라이트            │  ← sticky
│                              │  ┌─────────────────────┐  │
│ 액센트                        │  │ 카드 / 링크 / 버튼   │  │
│ ▢▢▣▢▢▣▢▢▣▢▢   ▣=조정 가능    │  │ 배지 (상태색)        │  │
│ 50 …        … 950            │  └─────────────────────┘  │
│    └ 클릭 → 3옵션 팝오버      │                           │
│                              │  목업 · 다크              │
│ 뉴트럴  [무][쿨*][퍼][그][웜] │  ┌─────────────────────┐  │
│         강도 [은은][뚜렷]     │  │ 같은 마크업          │  │
│ ▢▢▢▢▢▢▢▢▢▢▢                  │  └─────────────────────┘  │
│                              │                           │
│ 상태색 (고를 수 없음)         │  ⚠ warning 텍스트 2.96    │
│ ▢▢▢▢▢▢▢▢▢▢▢ 오류             │  ⚠ 액센트 텍스트 2.61     │
│ ▢▢▢▢▢▢▢▢▢▢▢ 경고             │    → [한 번에 고치기]     │
│ ▢▢▢▢▢▢▢▢▢▢▢ 성공             │                           │
│ ▢▢▢▢▢▢▢▢▢▢▢ 정보             │                           │
│                              │                           │
│ [palette.css] [theme] …      │                           │
└──────────────────────────────┴───────────────────────────┘
```

- `*` = 액센트에서 자동 스냅된 틴트. 표식으로 "여기 붙었다"를 알리되 다른 칩으로 덮을 수 있다.
- "한 번에 고치기"는 액센트·뉴트럴 미달이 있을 때만 뜬다. 상태색 뱃지는 항상 표시만.

### 새로 만드는 컴포넌트 (`web/src/color-palette/`)

| 파일 | 책임 |
| --- | --- |
| `ColorPalettePage.tsx` | 상태 보유, URL 동기화, 조립 |
| `AccentInput.tsx` | 피커 + hex 입력 |
| `AdjustableScale.tsx` | 11-stop + 조정 가능 표시 + 팝오버 트리거 |
| `CandidatePopover.tsx` | 3옵션, hover 프리뷰, "기본으로" |
| `NeutralControl.tsx` | 어트랙터 5칩 + 강도 2단 |
| `PreviewPane.tsx` | 라이트/다크 목업 + 대비 뱃지 + 고치기 버튼 |
| `paletteUrl.ts` | 직렬화·파싱 (순수, 테스트 대상) |

기존 `ColorScaleStrip`·`OklchPicker`는 재사용한다.

---

## 산출물 변경

`on-solid` 하나가 추가되는 것 외에 포맷은 그대로다.

```css
/* palette.css — 추가되는 줄 (스케일마다) */
:root {
  --color-accent-on-solid: #000000;
  --color-neutral-on-solid: #ffffff;
  /* … */
}
/* .dark에는 재선언되지 않는다 — solid이 테마 간 고정이므로 */
```

DESIGN.md 역할표에 한 행이 추가되고, 상태색 미달이 있으면 "쓰는 법"에 한 줄이 붙는다:

```
- `--color-warning-text`는 라이트 테마에서 AA에 미달한다 — 같은 스케일의 은은한 배경 위에서
  2.96이라 본문(4.5:1)은 물론 큰 글씨(3:1)로도 부족하다. `--color-warning-text-strong`도
  4.47로 본문 기준을 못 넘는다. 라이트에서 AA가 필요하면 `--color-warning-800`을 직접 쓸 것.
```

문구를 이렇게 쓰는 이유: 앞선 초안은 "큰 글씨에만 쓰라"고 권했는데 2.96은 큰 글씨 기준
3:1**도** 미달이다. 미달을 드러내겠다는 결정의 실행 문구가 없는 허용을 주면 안 된다.
경고 문자열은 화면(엔진 `checkContrast` 결과)에서 만들어 `renderColorDesignMd`에 데이터로
넘긴다 — 산출 코드가 대비를 계산하지 않는다는 규칙(D5)이 여기에도 그대로 적용된다.

---

## 테스트

### `tests/color/` (엔진)

**이동 검증** — `builder`·`neutral`·`semantic`·`roles` 테스트가 **import 경로와 import
대상 외에는 수정 없이** 통과. `builder.ts`가 `scale.ts` + `candidates.ts`로 쪼개지고
`BUILDER_FLOW`·`STEP_META`가 `guided.ts`로 가므로 import 문은 반드시 바뀐다. 그 외의
한 줄이라도 고쳐야 했다면 이동 중 무언가 잘못된 것이다.

`roles.test.ts`는 예외다 — D5가 `SCALE_ROLES`에 일곱 번째 역할을 더하므로 개수·인덱스
단언이 함께 갱신된다. 그건 이동이 아니라 D5의 결과다.

**신규 `contrast.test.ts`**
- `contrastRatio` 알려진 값 고정: 흑/백 21:1, 동일 색 1:1, `#767676`/`#ffffff` ≈ 4.54
- `onSolidColor`가 밝은 solid에는 검정, 어두운 solid에는 흰색
- `checkContrast` 결과에 `border` 역할이 **없다**
- `suggestRoleShifts`가 파랑 앵커에서 빈 배열, 노랑 앵커에서 `text` 이동을 낸다
- 제안된 이동이 **최소**다 — 한 칸 덜 움직이면 통과하지 않는다
- 제안 계산이 상태색에 영향받지 않는다 — 상태색만 미달인 경우 빈 배열
- `applyRoleShifts`가 원본 배열을 변형하지 않는다

### `tests/export/color/`

- `kind: "contrast"` 역할이 `palette.css`·`palette.theme.css`·`palette.figma.json`·
  `DESIGN.md`에 모두 나타난다
- `on-solid`이 `.dark` 블록에 **재선언되지 않는다**
- 같은 시스템 안에서 스케일마다 `on-solid` 값이 다를 수 있다 (노랑 앵커: 뉴트럴 흰색 /
  액센트 검정)
- 흰색 3.0 경계에서 규칙이 갈리는지 — 흰색 대비 3.0 바로 위는 흰색, 바로 아래는 흑백 중
  나은 쪽
- 산출 코드의 기본 resolver와 엔진의 `onSolidColor`가 같은 값을 낸다 (사본이 갈라지지 않게
  두 구현을 맞대어 고정)
- `assertColorSystem`이 `against`가 없는 역할 id를 가리키면 던진다
- `kind` 없는 역할 객체는 **타입 에러이자 런타임 거부**다 — 암묵적 기본값을 두지
  않는다. 판별자 없는 판별 유니온은 조용히 잘못된 분기를 타고, 이 타입의 생산자는
  전부 레포 안에 있어 한 번에 고칠 수 있다. 기존 픽스처·`SCALE_ROLES`가 함께 갱신된다.

### `web/`

- `paletteUrl` 왕복: 직렬화 → 파싱 → 같은 상태
- 깨진 파라미터(`a=zzz`, `n=없는틴트`, `t=99`)가 던지지 않고 기본값으로 폴백
- 액센트만 있는 URL로 완전한 팔레트가 그려진다
- **다운로드 경로**: `URL.createObjectURL`에 spy를 걸어 Blob 내용에
  `--color-accent-500`과 `--color-accent-on-solid`가 들어있는지 확인.
  BACKLOG 3.2가 "가장 값어치 있는 다음 하나"로 지목한 테스트이며, 엔진과 사용자가 실제로
  받는 파일 사이의 고리를 닫는다.

---

## 에러 처리

| 상황 | 동작 |
| --- | --- |
| URL 파라미터가 깨졌거나 모르는 값 | **던지지 않고** 해당 항목만 기본값으로 폴백. URL은 사용자 입력이고 남이 준 링크가 깨졌을 때 빈 화면을 주면 안 된다 |
| 액센트 hex가 형식 위반 | 입력 필드에서 거부, 마지막 유효값 유지 (기존 `BuilderPage` 동작과 동일) |
| 후보가 gamut 클램프로 서로 겹침 | 숨기지 않고 그대로 보인다. 선택지가 좁다는 것 자체가 사실이다 (엔진의 기존 동작) |
| `assertColorSystem` 위반 | **던진다.** 내부 계약 위반이며 사용자 입력에서 도달할 수 없다 |
| `navigator.clipboard` 부재 (비보안 컨텍스트) | 가드하고 버튼을 비활성화 (BACKLOG 4 부채 상환) |

---

## 함께 갚는 부채

BACKLOG 4에 이미 기록된 것 중 이 작업이 건드리는 것만:

- **`downloadFile`이 `ExportPanel.tsx`와 `DownloadPanel.tsx`에 같은 코드로 두 벌 있다.**
  새 화면이 세 번째 사본을 만들면 안 되므로 공용 유틸로 빼면서 Firefox 이슈(앵커를
  문서에 안 붙이고 object URL을 동기 해제)를 함께 고친다. 하나만 고치면 더 나쁘다.
- `navigator.clipboard` 무방비 → 가드.
- `adapter.ts`의 `if (!hexes)`가 빈 배열을 안 잡는다 → `!hexes?.length`.
- `assertColorSystem`에 `role.id` 중복 가드 추가 (스케일 이름 중복 가드는 이미 있다).

**함정 — 고치기 전에 읽을 것** (BACKLOG 4에서 옮겨온 경고):
`stopKeys`를 `CSS_IDENT`(`/^[a-z][a-z0-9-]*$/`)로 검증하지 말 것. `"50"`이 거부돼 모든
산출이 깨진다.

---

## 알려진 한계

1. **상태색 텍스트가 라이트 테마에서 AA 미달인 채로 나간다.** D4의 결정이며 뱃지와
   DESIGN.md로 드러내지만 값은 고치지 않는다. 근본 해결은 스케일별 역할 이동
   (D4 기각안 b)이거나 시맨틱 앵커 재검토다.
2. **역할 이동이 전역이다.** 액센트 때문에 이동하면 상태색도 같이 이동한다(더 진해질
   뿐이라 해롭지 않지만, 사용자가 의도한 것보다 넓게 적용된다).
   또한 사용자가 채도 높은 50을 pin하면 **어느 인덱스도 통과하지 못할 수 있다.** 그때
   `suggestRoleShifts`는 빈 배열을 반환하는데, 이는 "이동 불필요"와 같은 값이다. 화면은
   미달 뱃지로 구분되지만(제안 버튼이 없고 뱃지만 남는다) API 수준에서는 구분되지 않는다.
3. **파랑·빨강 계열 솔리드 버튼의 흰 글자가 AA 미달인 채로 나간다** (파랑 3.68, 빨강 3.81).
   관례를 지키기로 한 D5의 결정이며 뱃지로 드러낸다. 근본 해결은 APCA이거나, 솔리드 역할을
   500이 아니라 더 어두운 stop으로 옮기는 것이다 — 후자는 사용자가 고른 브랜드 색을
   버튼에서 밀어내므로 이 사이클에서는 검토하지 않았다.
4. **조정 가능한 stop은 4개 고정이다** (50·300·700·950). 임의 stop 미세조정은 이월.
5. **액센트를 바꾸면 조정한 pin이 사라진다** (D6). 액센트만 살짝 바꿔보는 탐색에서 조정을
   다시 해야 한다. ~~되돌리기 스택이 없어 실수로 바꾸면 복구할 수 없다.~~

   > **2026-08-30 부분 개정** — 뒤 문장은 이제 거짓이다.
   > `2026-08-30-color-palette-ux-repair-design.md`의 D6이 **사라졌다는 알림과 명시적
   > 복원 버튼**을 붙였다. **폐기 자체는 그대로다** — 이 항목의 앞 문장(액센트를 바꾸면
   > pin이 사라진다)과 D6의 근거는 여전히 유효하다. 바뀐 것은 "복구할 수 없다" 하나다.
   >
   > **남는 경계:** 되돌리기 버퍼는 `ColorPalettePage`의 ref에만 살고(상태 계약 불변이
   > 그 사이클의 비-목표였다) **새로고침하면 사라진다.** 즉 "복구할 수 없다"가
   > "이 세션 안에서만 복구할 수 있다"로 좁아진 것이지 없어진 게 아니다. 근본 해법
   > (pin을 절대 hex 대신 선택 정체성으로 저장)은 여전히 이월 상태다.
6. **Figma 별칭은 여전히 없다.** `on-solid`도 해석된 hex로 나간다.
7. **`/color-palette`가 정적 호스팅에서 rewrite를 요구한다.** 현재 배포 설정이 없어
   문제가 드러나지 않는다.
8. **되돌리기가 stop 단위다.** 전체 실행 취소 스택은 없다.

---

## v1 범위 밖 (다음 사이클 후보)

- localStorage 지속 (URL만으로 충분한지 관찰 후)
- 임의 stop 미세조정 · 하이브리드 후보
- APCA 대비 · 큰 글씨 기준(3:1) 분리 판정
- 스케일별 역할 오버라이드
- 시맨틱 채도를 액센트에 맞추기 (BACKLOG 2)
- 레거시 위저드 정리 (BACKLOG 1.2) · 비색 카테고리 (BACKLOG 1.1)
- "내 팔레트로 이 앱 보기"
