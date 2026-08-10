# 팔레트 색 산출물 (사이클 2) — 설계

빌더가 만든 색 시스템을 4개 파일로 내보낸다. **색만.**

- 선행: `docs/superpowers/specs/2026-08-09-palette-generator-color-system-design.md` (사이클 1)
- 역할 레이어 원안: `docs/superpowers/specs/2026-07-28-dark-accent-roles-design.md`
- 레거시 산출물 계약: `docs/superpowers/specs/2026-05-04-download-token-layering-design.md`

## 목적

사이클 1에서 `#builder`가 액센트 + 뉴트럴 + 시맨틱 4종을 만들게 됐지만, 결과물은
화면 안에만 있고 `copy CSS` 버튼 하나로만 밖으로 나온다. 이 사이클은 그 색 시스템을
실제로 쓸 수 있는 파일로 내보낸다.

**성공 기준**

1. 6단계를 완주한 사용자가 4개 파일을 받아 자기 프로젝트에 붙일 수 있다.
2. 산출된 CSS가 이 저장소의 `web/`에 그대로 들어가 동작한다 (자기 도그푸드).
3. 산출 코드가 `src/lab/`을 import하지 않는다 — 랩 격리 규칙이 안 깨진다.
4. 역할표가 시스템에 하나만 존재한다 — 산출 코드가 자기 사본을 갖지 않는다.

## 범위

**이 사이클:** `src/export/color/` 신설, 산출물 4종, 빌더 완료 화면의 다운로드 패널,
`web/` 스모크 테스트 1개.

**이 사이클이 아닌 것:** 저장·공유(URL/localStorage), 미세조정, 비색 카테고리,
레거시 위자드의 제거. 위자드는 화면으로도 코드로도 남는다 — 다만 이 산출 경로에는
관여하지 않는다.

## 확정된 결정

### D1. 산출 코드는 `src/export/color/`에 두고, 엔진은 랩에 남는다

`src/lab/palette/`의 엔진(builder·neutral·semantic·roles·ours)과 연구 장치
(hct·leonardo·radix·naive·v1·bench·metric·lab-data)를 이번에 분리하지 않는다.
`#lab` 비교 화면이 다섯 알고리즘을 나란히 쓰는 연구 도구로 계속 살아 있고,
분리는 그 자체로 큰 이동이라 산출물 작업과 섞으면 리뷰 단위가 굵어진다.

**기각한 대안:** 제품 부분만 `src/palette/`로 졸업. 이름은 정직해지지만 이번
사이클의 목표(산출물)와 무관한 이동이 한 번 더 생긴다. 다음 사이클로 미룬다.

**결과로 남는 부채:** `src/lab/`이 제품 경로가 됐는데 이름이 그대로다. 이 문서가
그 사실을 기록한다.

### D2. `ColorSystem`은 역할표까지 데이터로 받는다

산출 코드가 `SCALE_ROLES`를 import하면 `src/export/`가 `src/lab/`에 의존하게 된다.
대신 역할표를 **인자로 받는다.**

```ts
// src/export/color/types.ts
export interface ExportRole {
  readonly id: string;
  readonly label: string;
  readonly lightIndex: number;
  readonly darkIndex: number;
}

export interface ExportScale {
  readonly name: string;
  readonly hexes: readonly string[];
}

export interface ColorSystem {
  /** 스케일의 stop 이름. 길이가 모든 스케일의 길이를 정의한다. */
  readonly stopKeys: readonly string[];
  /** 출력 순서 그대로. 첫 항목이 문서·파일에서 먼저 나온다. */
  readonly scales: readonly ExportScale[];
  readonly roles: readonly ExportRole[];
}
```

이렇게 하면 산출 코드에 역할표 사본이 존재할 수 없다 — 엔진과 어긋날 방법이 없다.
`stopKeys`를 받으므로 11-stop이라는 사실도 산출 코드에 하드코딩되지 않는다.

`web/`이 어댑터를 쓴다: `ScaleSet` + `SCALE_ROLES` + `STOP_KEYS` → `ColorSystem`.

**기각한 대안:** 산출 코드가 `roles.ts`를 import. 한 줄 짧지만 랩 격리 규칙을 깬다.

### D3. CSS 변수 이름은 `--color-{scale}-{stop|role}`

Tailwind v4의 `@theme`이 `--color-*` 접두사에서만 색 유틸리티를 생성한다.
두 CSS 파일이 서로 다른 이름을 쓰면 안 되므로 평범한 CSS 쪽도 같은 이름으로 간다.

지금 `cssSnippet`이 내는 `--accent-500`에서 `--color-accent-500`으로 바뀐다.

**`cssSnippet`은 `roles.ts`에서 제거한다.** `generateColorCss`가 그 자리를 대신하고,
`tests/lab/roles.test.ts`의 `cssSnippet` 블록은 `tests/export/color/css.test.ts`로
옮긴다. `roles.ts`에는 `SCALE_ROLES`·`ScaleSet`·`scaleHasAnchor`만 남는다 —
역할표의 정의이지 렌더러가 아니게 된다.

### D4. CSS는 두 장

`@theme`은 Tailwind 전용 문법이라 Tailwind 없이는 유효한 CSS가 아니다.

| 파일 | 내용 | 대상 |
| --- | --- | --- |
| `palette.css` | `:root` + `.dark` | 프레임워크 무관 |
| `palette.theme.css` | `@theme` + `.dark` | Tailwind v4 |

같은 데이터의 두 렌더링이다. 변수 목록을 만드는 함수를 공유하고 감싸는 껍데기만
다르게 한다 — 두 파일이 갈라질 수 없어야 한다.

### D5. `@theme inline`을 쓰지 않는다

Tailwind v4에서 `@theme inline`은 테마 변수의 **값을 유틸리티에 직접 박아넣는다.**
그러면 `.dark`에서 `--color-accent-solid`를 덮어도 이미 인라인된 유틸리티는 안 바뀐다 —
다크 역할 재배치가 통째로 죽는다.

평범한 `@theme`을 쓴다. 변수가 `:root`로 나가고 유틸리티는 `var(--color-accent-solid)`를
참조하므로 `.dark` 재선언이 통한다.

> **구현 시 확인:** 이 동작은 Tailwind v4 문서 기준의 이해다. Task 1에서 실제로
> `palette.theme.css`를 `web/`에 넣고 `.dark`를 토글해 역할 색이 바뀌는지 눈으로
> 확인한 뒤 진행할 것. 안 바뀌면 이 결정을 다시 연다.

### D6. Figma는 컬렉션 2개, Primitives는 단일 모드

레거시는 `Color Primitives`에도 Light/Dark 두 모드를 둔다 — 프리미티브 자체를
뒤집는 전략이기 때문이다. 우리는 **프리미티브가 테마 간에 안 변한다.** 바뀌는 건
역할이 어느 프리미티브를 가리키느냐뿐이다.

| 컬렉션 | 변수 | 모드 |
| --- | ---: | --- |
| `Color Primitives` | 66 | `Default` 1개 |
| `Colors` | 36 | `Light` / `Dark` |

## 아키텍처

```
src/export/color/
  types.ts        ColorSystem·ExportScale·ExportRole + 계약 가드
  vars.ts         공유: ColorSystem → 변수 선언 목록
  css.ts          generateColorCss(system): string
  theme-css.ts    generateColorThemeCss(system): string
  figma.ts        toColorFigma(system): FigmaDesignSystem
  design-md.ts    renderColorDesignMd(system): string
  index.ts
```

의존 방향:

```
web/  ──→ lab/palette   (엔진)
web/  ──→ export/color  (산출)
export/color ──→ figma/types  (타입만)
export/color ──✗→ lab/         절대 없음
lab/  ──✗→ export/            절대 없음
```

`export/color`는 `src/figma/types.ts`의 타입만 참조한다. 그 파일은 순수 타입 선언이고
`src/lab/`을 모른다.

## 산출물 상세

빌더가 액센트 `#f97316`로 완주했다고 할 때:

### `palette.css`

```css
/* 팔레트 생성기 산출 — 색 시스템 */
:root {
  --color-accent-50: #fff5f1;
  /* … 66개 */

  --color-accent-subtle-bg: var(--color-accent-50);
  --color-accent-solid: var(--color-accent-500);
  /* … 36개 */
}

.dark {
  --color-accent-subtle-bg: var(--color-accent-950);
  /* … 30개. solid는 없다 — 안 바뀌므로 재선언하지 않는다 */
}
```

프리미티브 66 = 스케일 6 × stop 11. 역할 36 = 스케일 6 × 역할 6.
`.dark` 30 = 스케일 6 × 이동하는 역할 5 (solid 제외).

**재선언하지 않은 것 = 안 바뀐 것.** 이 규칙이 파일을 읽는 사람에게 다크 전략을
설명한다.

### `palette.theme.css`

같은 변수 목록을 `@theme { … }`로 감싼다. `.dark` 블록은 `@theme` **밖에** 둔다.

Tailwind v4가 `bg-accent-500`·`text-accent-text`·`border-neutral-border`를 자동
생성한다.

### `palette.figma.json`

`FigmaDesignSystem` 형태. `textStyles`·`effectStyles`는 빈 배열
(색만 내보내므로).

`Colors` 컬렉션의 값은 **해석된 hex**다. 별칭이 아니다 —
`FigmaVariable.valuesByMode`가 `string | number`라 별칭을 표현할 타입이 없고,
레거시도 같은 방식이다. Figma 산출물에서는 "역할이 프리미티브를 가리킨다"는
관계가 사라지고 값만 남는다. (아래 "알려진 한계" 참조)

### `DESIGN.md`

```markdown
# 색 시스템

## 스케일
### 액센트
| stop | hex |
| --- | --- |
| 50 | #fff5f1 |
… 11행 × 6스케일

## 역할
| 역할 | 라이트 | 다크 |
| --- | --- | --- |
| 은은한 배경 | 50 | 950 |
| 솔리드 (버튼 배경) | 500 | 500 |
…
다크는 인덱스 미러(i → 10−i), 솔리드만 자리 고정.

## 쓰는 법
- 상태색은 브랜드 색이 아니다 — 브랜드에 맞춰 바꾸지 말 것.
- 배경과 텍스트는 뉴트럴, 강조만 액센트.
- 다크는 색을 새로 만들지 않는다 — 역할이 가리키는 stop만 바뀐다.
```

**근거와 여정은 넣지 않는다.** 유도 과정("왜 이 뉴트럴 hue인가")과 사용자의 6단계
선택 기록은 결정하는 순간에만 행동을 바꾼다. 확정된 팔레트를 넘겨받는 소비자에게는
행동을 바꾸지 않는 읽을거리다. 교보재는 빌더 화면에 남는다.

"쓰는 법"의 세 줄은 근거가 아니라 **사용 규칙**이다 — 안 적으면 소비자가 잘못
쓴다(상태색을 브랜드에 맞춰 바꾸거나, 다크용 색을 새로 만들거나).

## 레거시에서 따라가지 않는 것

"산출 로직은 레거시를 참고한다"의 예외를 명시한다. 아래는 **의도적으로 다르다.**

| | 레거시 | 이 산출물 | 이유 |
| --- | --- | --- | --- |
| 다크 전략 | 프리미티브를 뒤집고 시맨틱은 그대로 | 프리미티브 고정, 역할 매핑을 이동 | 다크 역할 스펙의 결론. 미러 규칙이 시스템에 하나 |
| Figma Primitives 모드 | Light/Dark 2개 | Default 1개 | 프리미티브가 테마 간에 안 변한다 |
| Tailwind | v3 preset | v4 `@theme` | 이 저장소가 v4를 쓴다. 레거시 산출물이 자기 스택보다 낡았다 |
| 색 모델 | 15개 이름 슬롯 + 9-stop | 6종 × 11-stop + 6역할 | 사이클 1의 결과물 |

레거시에서 **가져오는 것**: 2레이어 구조(프리미티브 → 시맨틱 `var()` 참조),
다운로드 버튼 UI 패턴(`web/src/result/DownloadPanel.tsx`), `FigmaDesignSystem`
타입, 파일 다운로드 헬퍼.

## UI

빌더 완료 화면의 `copy CSS` 버튼 자리에 다운로드 패널이 들어간다.

- 버튼 4개: `palette.css` · `palette.theme.css` · `palette.figma.json` · `DESIGN.md`
- 복사 버튼은 남긴다 — 파일을 받지 않고 빠르게 확인하는 경로. 복사 대상은
  `palette.css`(평범한 CSS 쪽)다. 지금은 `cssSnippet`을 복사하는데, 그 함수가
  `generateColorCss`로 대체되므로 복사 내용도 새 변수 이름을 따른다.
- `scaleSet`이 `null`인 동안(6단계 미완료) 패널을 렌더하지 않는다. 비활성 버튼을
  보여주지 않는다.

`DownloadPanel.tsx`의 버튼 클래스와 `downloadFile()` 헬퍼를 그대로 참고한다.
공용 컴포넌트로 추출하지는 않는다 — 두 화면이 각자 진화할 여지를 남긴다.

## 테스트

### 엔진 (`tests/export/color/`)

산출 함수 4종은 전부 순수 함수다.

- **공통**: 스케일 6종이 다 나오는가. `stopKeys` 길이와 스케일 길이가 어긋나면 throw.
- **CSS**: 프리미티브 66 / 역할 36 / `.dark` 30. dangling `var()` 0개.
  `.dark`에 `solid` 없음. 두 CSS 파일의 변수 선언 목록이 **동일**한가
  (D4의 "갈라질 수 없어야 한다"를 테스트로 고정).
- **theme CSS**: `.dark` 블록이 `@theme` 밖에 있는가. `@theme inline`이 아닌가.
- **Figma**: 컬렉션 2개. `Color Primitives`는 모드 1개 66변수,
  `Colors`는 모드 2개 36변수. Light/Dark 값이 각각 lightIndex/darkIndex의
  프리미티브 hex와 일치하는가. `textStyles`·`effectStyles`가 빈 배열인가.
- **DESIGN.md**: 66개 hex가 전부 있는가. 역할 6행이 있는가.
  **유도 근거·여정 문구가 없는가** (설계 결정을 테스트로 고정).

### `web/` 스모크 테스트 1개

지난 사이클 최종 리뷰의 판정("이번 병합엔 받아들일 만하지만 다음엔 아니다")을
이번에 갚는다. 고정 액센트로 6단계를 완주하고 완료 화면에 스트립 6개와 다운로드
버튼 4개가 뜨는 것을 확인한다.

지난 사이클에서 사람 눈으로 찾은 "뉴트럴 스트립 누락"이 이 테스트였으면 잡혔다 —
그게 이 테스트가 갚는 빚이다.

## 에러 처리

`ColorSystem` 계약 가드 3개. 전부 프로그래머 오류용이고 사용자 입력에서 도달할 수
없다 (UI가 `scaleSet === null`이면 패널을 렌더하지 않는다).

1. 모든 스케일의 `hexes.length === stopKeys.length`. 아니면 어느 스케일인지 이름을
   담아 throw.
2. 모든 역할의 `lightIndex`·`darkIndex`가 `0 ≤ i < stopKeys.length`.
3. 스케일 이름이 유일. 중복이면 CSS 변수가 조용히 덮어써진다.

## 알려진 한계

- **Figma 산출물은 역할↔프리미티브 관계를 잃는다.** 값만 해석돼 들어간다.
  `FigmaVariable`에 별칭 타입이 없기 때문이고, 레거시도 같다. 별칭을 지원하려면
  `src/figma/types.ts`를 확장해야 하는데 이 사이클의 범위가 아니다.
  결과: Figma에서 프리미티브를 고쳐도 역할 변수가 안 따라온다.
- **`src/lab/`이 제품 경로다.** D1이 의도적으로 남긴 부채. 이름과 내용이 어긋난다.
- **비색 토큰이 없다.** 이 산출물만으로는 디자인 시스템이 완성되지 않는다.
  타이포·간격·라운드는 여전히 레거시 위자드에서만 나온다. 두 산출물을 합치는
  방법은 정해진 바 없다.
- **`palette.theme.css`는 Tailwind v4 전용.** v3 사용자는 `palette.css`를 받아
  직접 preset을 써야 한다.

## v0 범위 밖

저장·공유(URL/localStorage), 미세조정 화면, 비색 카테고리 편입, 레거시 위자드 제거,
Figma 별칭 지원, 엔진의 랩 졸업, 산출물 합치기.
