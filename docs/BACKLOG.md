# BACKLOG — 다음에 할 일

이월 항목이 스펙 다섯 곳의 "v0 범위 밖" 절에 흩어져 있고, 리뷰가 남긴 코드 부채는
어디에도 안 남는다(SDD 원장은 사이클이 끝나면 지운다). 이 문서가 그 둘의 단일 색인이다.

**원본은 각 스펙이다.** 여기 적힌 이월 항목의 근거와 기각 이유는 출처 스펙에 있고,
이 문서는 "무엇이 열려 있는가"만 답한다. 항목을 해소하면 **출처 스펙에 해소 표시를 하고**
여기서 지운다 — 두 곳에 살아 있게 두지 않는다.

최종 갱신: 2026-08-16 (사이클 3 / `feat/color-palette-generator`)

---

## 지금 열려 있는 것

| | 상태 |
| --- | --- |
| `feat/color-palette-generator` (사이클 3) | 코드 12개 태스크 완료, 리뷰 클린. Task 13(BACKLOG 갱신) 진행 중, PR 대기 |

---

## 1. 결정이 필요한 것 (다음 사이클의 후보)

작업량보다 **정하지 않은 것**이 병목인 항목들이다.

### 1.1 비색 카테고리의 출처 — 제일 큰 것

지금 팔레트 생성기의 산출물은 **색만** 담는다. 타이포·간격·라운드·엘리베이션·컴포넌트
토큰은 여전히 레거시 위자드에서만 나오고, 두 산출물을 합치는 방법은 정해진 바 없다.
그래서 생성기 산출물만으로는 디자인 시스템이 완성되지 않는다.

정해야 하는 것: 생성기가 비색 카테고리도 다루는가, preset을 고르게 하는가, 아니면
"색 전용 도구"로 확정하고 나머지를 별도 경로로 두는가.

출처: `specs/2026-08-09-palette-generator-color-system-design.md`,
`specs/2026-08-10-palette-color-export-design.md`

### 1.2 레거시 위자드를 어떻게 할 것인가

화면이 넷이다 — 루트 `/`가 위자드(`ResultPage`), `#builder`가 사이클 1의 가이드
빌더, `#lab`이 연구 비교 화면, `/color-palette`가 사이클 3의 새 도구. 위자드는
"참고용"으로 선언됐지만 제품 진입점은 여전히 위자드다. `#builder`와 `/color-palette`도
같은 문제(액센트+뉴트럴+시맨틱 산출)를 서로 다른 UX로 풀고 있어 셋 중 무엇을
남길지도 같이 걸려 있다. 제거·강등·유지 중 무엇인지 정해지지 않았다.

출처: `specs/2026-08-10-palette-color-export-design.md`

---

## 2. 기능 이월

### 색 시스템
- **어두운 쪽 뉴트럴 채도 독립 knob** — 지금은 강도 종속 lerp로 근사. 눈 평가가 쌓여
  불만이 생기면 독립 축으로 승격.
- **시맨틱 채도를 액센트에 맞추기** — 뮤트한 브랜드에 tailwind 채도 그대로의 시맨틱이
  튀는지. 현재는 앵커 고정.
- **hue 드리프트 knob (액센트)** — 액센트 트랙에서부터 이월 중.
- **V4 독립 검증** — 시맨틱이 액센트 곡선을 재사용해도 된다는 근거가 부분적으로
  순환이다(`OURS_CURVE`가 red/amber/green/blue를 포함한 17종의 평균). 시맨틱이
  마음에 안 들면 radix red/green 독립 검증부터.

출처: `specs/2026-08-09-palette-generator-color-system-design.md`

### 빌더 UX
- **미세조정 피커** — 5-pick 외 임의 stop 선택, 하이브리드 후보. `/color-palette`도
  조정 가능 stop이 4개(50·300·700·950) 고정이라 같은 이월이 이어진다.
- **컴포넌트 맥락 미리보기** — stop별 역할 매핑 이후.
- **다크 매핑 후보 선택지** — 관찰이 쌓인 뒤.
- **다크 전용 곡선 피팅** — radix-dark 레퍼런스 수집부터.

출처: `specs/2026-07-27-guided-palette-builder-design.md`,
`specs/2026-07-28-dark-accent-roles-design.md`,
`specs/2026-08-15-color-palette-generator-design.md` 알려진 한계 4

### 대비·역할 — `/color-palette` 신설로 새로 열림
- **상태색 텍스트가 라이트 테마에서 AA 미달인 채 산출된다** (`text` — warning 2.96 /
  success 3.03, `text-strong`도 근접 미달 — warning 4.47 / success 4.43). 값은 고정
  앵커라 사용자가 바꿀 수 없고, D4가 "바꿀 수 없는 것 때문에 바꿀 수 있는 것을
  망가뜨리지 않는다"는 원칙으로 값을 그대로 두고 뱃지·DESIGN.md로만 드러내기로
  했다. 근본 해결은 스케일별 역할 이동(기각안 b)이거나 시맨틱 앵커 재검토.
  **사용자 판단 대기** — 실제 화면을 보고 결정.
- **파랑·빨강 계열 솔리드 버튼의 흰 글자가 AA 미달인 채 산출된다** (파랑 3.68 /
  빨강 3.81). D5가 Tailwind·Radix·Bootstrap의 흰 글자 관례를 지키기로 하고 뱃지로
  미달을 드러낸다. 근본 해결은 APCA이거나 solid 역할을 500이 아니라 더 어두운
  stop으로 옮기는 것 — 후자는 사용자가 고른 브랜드 색을 버튼에서 밀어내므로
  검토하지 않았다. **사용자 판단 대기.**
- **기본 파랑(`#3b82f6`) 첫 화면에 대비 뱃지가 10건 뜬다.** 각각은 정당하다
  (on-solid 관례 3건 + 상태색 고정 앵커 6건 + info의 on-solid 1건) — 양이 아니라
  합쳐진 첫인상이 문제인지는 실제 화면을 보고 판단하기로 이월됐다(Task 11 리뷰어
  실측).
- **조정 가능한 스와치의 정적 구분이 육안으로는 미세하다** (`AdjustableScale.tsx`
  — pinned 아닌 조정 가능 자리는 `border-neutral-300`, 조정 불가 자리는
  `border-neutral-200`). hover ring(`hover:ring-2`)이 상호작용해야만 뚜렷해져,
  스펙 D3 "누르기 전에 구분"을 문자로는 만족하지만 약하다. 실제 화면을 보고
  색 대비를 더 벌릴지 판단하기로 이월(Task 8 minor).
- **역할 이동이 전역이다.** 액센트 때문에 이동하면 상태색도 같이 이동한다(더
  진해질 뿐이라 해롭지 않지만 의도한 것보다 넓게 적용된다). 사용자가 채도 높은
  50을 pin하면 어느 인덱스도 통과하지 못할 수 있는데, 그때 `suggestRoleShifts`는
  빈 배열을 반환해 "이동 불필요"와 API 수준에서 구분되지 않는다(화면은 미달
  뱃지로 구분). 근본 해결(스케일별 역할 오버라이드)은 `ColorSystem.roles`가
  스케일별로 쪼개져 `types.ts`·`vars.ts`·`design-md.ts`가 함께 바뀐다.
- **APCA 대비 · 큰 글씨 기준(3:1) 분리 판정** — 위 세 항목의 근본 해결 후보로
  반복 등장하지만 아직 초안 규격이라 이월.
- **액센트를 바꾸면 조정한 pin이 사라지고 되돌릴 수 없다** (D6 — pin의 수명은
  액센트에 종속). 되돌리기가 stop 단위라 실수로 액센트를 바꾸면 조정을 복구할
  방법이 없다 — 전체 실행취소 스택은 없다.
- **`/color-palette` 딥링크가 404 상태로 응답한다.** GitHub Pages에 rewrite가
  없어 `404.html`을 index 복사본으로 두는 폴백을 썼다(2026-08-17). 앱은 정상
  부팅하지만 상태코드는 404로 남는다 — 크롤러·모니터링에는 실패로 보인다.
  rewrite를 지원하는 호스트(Cloudflare Pages 등)로 옮기면 사라지는 문제고,
  그 경우 서브패스도 없어져 `web/src/lib/basePath.ts`의 base 처리가 무의미해진다.
- **localStorage 지속** — 새로고침하면 URL에 없는 조정(방문 이력)은 날아간다.
  URL만으로 충분한지 관찰 후 결정.

출처: `specs/2026-08-15-color-palette-generator-design.md` 알려진 한계 1·2·3·5·7,
v1 범위 밖

### 산출물
- **Figma 별칭 지원** — 지금은 역할 변수가 해석된 hex를 들고 있어 역할↔프리미티브
  관계가 사라진다(`on-solid`도 마찬가지). `FigmaVariable.valuesByMode`에 별칭 타입이
  없어서고, 지원하려면 `src/figma/types.ts`를 확장해야 한다.
- **산출물 합치기** — 생성기 산출물과 레거시 위자드 산출물이 같은 변수 이름
  (`--color-accent-*`·`--color-neutral-*`)을 서로 다른 값으로 선언한다. 둘을 같이 쓰는
  방법이 정해진 바 없다. → 1.1과 묶여 있다.
- **"내 팔레트로 이 앱 보기"** — 생성된 팔레트를 앱 전역에 입히는 기능. 사이클 2에서
  기각한 대안(툴 UI가 같이 바뀌어 회귀와 구분이 안 됨)이지만 별도 기능으로는 매력적.

출처: `specs/2026-08-10-palette-color-export-design.md`,
`specs/2026-08-15-color-palette-generator-design.md` 알려진 한계 6

---

## 3. 구조 부채

`src/lab/`이 제품 경로였던 문제(3.1)와 `web/` 자동 커버리지 0이었던 문제(3.2)는
사이클 3에서 해소됐다 — 아래 "5. 해소 기록" 참고.

---

## 4. 코드 부채 (리뷰가 남긴 것)

병합을 막지 않는다고 판정된 항목들. **손대는 김에** 처리하면 되는 것들이다.

### 함정 — 고치기 전에 읽을 것
- **`stopKeys`를 `CSS_IDENT`로 검증하지 말 것.** `src/export/color/types.ts`의
  `assertColorSystem`이 스케일 이름과 역할 id는 `/^[a-z][a-z0-9-]*$/`로 검사하지만
  `stopKeys` 항목은 검사하지 않는다. "가드가 빠졌네" 하고 같은 정규식을 적용하면
  `"50"`이 거부돼 모든 산출이 깨진다. 필요한 검사는 "공백·슬래시 없음"이다.
- **`BuilderPage.test.tsx`의 셀렉터 정규식**은 `css.ts`의 `HEADER` 주석에 줄 앞 `{`가
  없다는 전제에 기대고 있다. 헤더에 `--color-{스케일}-역할` 같은 문장을 넣으면 그 줄이
  가짜 셀렉터로 잡혀 테스트가 헛되이 실패한다.

### 화면
- **`#builder` 완료 화면에 다크 시연이 둘이다.** `DarkSection`의 라이트/다크 목업 +
  역할표와 `ExportPanel`의 미리보기 토글이 같은 주장을 한다. 각각은 정당했지만
  함께 보면 중복이다. `/color-palette`는 처음부터 하나(라이트·다크 목업 한 쌍,
  D8)로 설계돼 이 문제를 반복하지 않는다 — 그러나 `#builder` 쪽 코드 자체는
  손대지 않았다.
- **`on-solid` 역할의 `note`가 화면 어디에도 안 나온다.** `DarkSection`(`#builder`)의
  역할표는 `STOP_ROLES`(`kind: "stop"`만)를 순회하는데 `on-solid`은 `kind:
  "contrast"`라 걸러진다. 공들여 쓴 교보재 문장("스케일 자신의 50/950으로는 양쪽
  다 미달인 경우가 흔해 흑/백에서 고른다…")이 지금은 죽은 콘텐츠다.
- `DarkSection` 헤더의 `justify-between`이 복사 버튼이 빠지면서 자식 하나만 남아
  무의미해졌다.
- `BuilderPage.tsx`의 `redo()`가 뉴트럴 단계 인덱스 5를 하드코딩한다. `BUILDER_FLOW`에서
  유도하면 흐름을 재배열해도 안전하다.
- `BuilderPage.tsx`에 `stopIndex = -1` 센티널이 판별 유니온과 나란히 살아 있다.
  현재는 모든 소비처가 `kind` 검사로 막혀 있지만, 안전이 값이 아니라 다른 곳의 검사에
  달려 있다.
- **`ExportPanel`·`DownloadRow`가 `copyText`의 성공/실패 반환값을 버린다.** 비보안
  컨텍스트에서 버튼은 비활성화되지만(BACKLOG 4 상환분), 활성 상태에서 복사가 실제로
  실패해도 사용자 피드백이 없다.
- `NeutralControl`의 "왜 무채색엔 강도가 없는가"가 로컬 주석에 없다(엔진 `neutral.ts`엔
  있다) — 코드만 보면 조건 분기의 이유가 안 보인다.
- `PreviewPane`이 배경색만 `scales.neutral[0]`/`[10]`으로 하드코딩 — 같은 값이
  `SCALE_ROLES`의 `subtle-bg`에 있는데 거기만 역할표를 우회한다.
- `PreviewPane`이 prop 7개(목업+뱃지+액션)를 받는 119줄 컴포넌트가 됐다 — 뱃지
  로직이 더 늘면 분리 고려.
- `CandidatePopover`의 `contextPins`와 `paletteState`의 `pinsOf`가 `i !== stopIndex`
  한 줄만 다른 중복 — `pinsOf`가 비공개라 강제된 중복.
- `CandidatePopover`의 `stopIndex`를 `number`로 받고 캐스트로 좁힌다 — Props를
  `AdjustableStop`으로 좁히면 캐스트가 불필요하다.
- `AccentInput`이 hex를 소문자화하는데 주석은 "기존 빌더와 같은 동작"이라 과장
  (빌더는 원본 케이스를 유지한다).

### 라우팅
- `App.tsx`의 `useLocation`이 `useState(read)`로 초기값을 읽고 `useEffect`에서
  `popstate`/`hashchange` 리스너를 등록한다 — 그 사이의 짧은 창에서 일어난
  내비게이션은 놓칠 수 있다. 기존 패턴을 계승한 구조라 실질 위험은 낮다.
- `/color-palette` 라우팅이 `path === "/color-palette"` 정확 비교라 **끝 슬래시
  (`/color-palette/`)는 매치되지 않는다.** 지금은 링크가 전부 슬래시 없이 쓰여
  안 드러나지만, 나중에 어느 링크가 슬래시를 붙이면 조용히 위자드로 떨어진다.

### 타입·구조
- `src/export/color/index.ts`를 루트 테스트가 전혀 건드리지 않는다 — 재수출 하나가
  빠져도 `pnpm test`는 초록이다(`web/`의 `tsc -b`가 잡긴 한다).
- `web/vitest.config.ts`·`vitest.setup.ts`가 `web/tsconfig.json`의 `include` 밖이라
  타입체크를 안 받는다(`vite.config.ts`도 마찬가지라 새 문제는 아니다). **루트 `tests/`도
  루트 `tsconfig.json`의 `exclude`에 있어 같은 문제다** — `tests/color/contrast.test.ts`의
  `as ScaleSet["semantic"]` 같은 캐스트가 타입체크를 한 번도 안 받고 통과한다.
- `assertColorSystem`의 `defaultResolver`(`vars.ts`)가 잘못된 hex에 조용히 색을
  반환한다(엔진 `onSolidColor`는 throw). 현재 입력은 항상 `oklchToHex` 산출이라
  도달 불가능하지만 비일관이다.
- `onSolidColor` JSDoc의 "파랑 3.45/4.02, 보라 3.95/3.57" 수치가 파일 안에서
  검증되지 않는 서술 수치(다른 앵커 데이터 참조).
- `src/export/color/adapter.ts:3` 최상단 주석이 "`src/lab/`을 import하지 않는다"로
  옛 경로를 가리킨다 — 엔진이 `src/color/`로 졸업한 지금은 어색하다. 같은 파일의
  JSDoc 둘은 이미 갱신됐다. 한 단어 수정.
- `src/color/scale.ts` 헤더에 스펙 경로 줄이 없다 — `neutral`·`semantic`·`roles`와
  문서 밀도가 어긋난다.
- `suggestRoleShifts`(`src/color/contrast.ts:150-171`)의 `text-strong` 탐색이 명도
  곡선의 단조성(인덱스가 커질수록 대비가 단조 증가)을 전제한다 — 첫 통과 지점에서
  루프를 멈춘다. 이 전제가 주석에 없다.
- `web/src/color-palette/contrastWarnings.ts`의 `bgLabel`에 `against === "solid"`
  분기가 죽은 코드다 — `on-solid` 검사는 항상 `onSolidWarning`으로 라우팅돼 이
  분기에 닿지 않는다.
- 대비 비율 `4.495681`이 `toFixed(2)`로 "4.50"으로 표시돼 기준 4.5 미달인데 숫자만
  보면 통과처럼 보인다 — 기존 엔진 표시 방식을 그대로 물려받았다.

### 테스트 다듬기
- `tests/export/color/types.test.ts`의 index-range 테스트가 제목은 "role and the field"인데
  정규식은 필드만 검사한다.
- `tests/export/color/design-md.test.ts`의 `toHaveLength(66)`이 픽스처 사실을 재진술한다.
- `tests/export/color/theme-css.test.ts`가 같은 candidates(`["bg-accent-solid"]`)로
  `compile()` 왕복을 두 번 한다.
- `web/`의 `download.test.ts`·`App.test.tsx` 실행 시 jsdom의 "Not implemented:
  navigation to another Document" 경고가 반복된다 — 출력이 깨끗하지 않다. React
  `act(...)` 경고도 섞여 나온다. 여러 태스크(다운로드, 뉴트럴 틴트)에서 각각
  나왔지만 원인은 jsdom의 `<a>` 클릭 내비게이션 미구현 하나다.
- `web/lib/download.test.ts`의 revoke 테스트가 "결국 실행된다"의 절반(동기
  미해제)만 검증한다 — 실제 지연 해제까지는 안 잡는다.
- `tests/color/contrast.test.ts`의 "never throws" 파싱 테스트가 브리프의 7개 형식
  케이스뿐 — 퍼징이 아니다.
- `tests/color/contrast.test.ts`의 "suggests the minimum shift" 테스트가 배경으로
  accent `subtle-bg`(`scales.accent[0]`) 하나만 쓴다 — neutral·page 배경 조건은
  커버되지 않는다(Task 4 리뷰의 독립 검증에서는 둘 다 to-1에서 실패하는 것까지
  확인했다).
- `/color-palette`의 접힘(dedup) 테스트가 남은 후보 개수만 단언하고 hex/label은
  고정하지 않는다 — dedup이 과하게 작동해도 개수가 맞으면 통과할 여지가 있다.

---

## 5. 해소 기록

| 항목 | 해소 | 출처 스펙 |
| --- | --- | --- |
| 뉴트럴 연동 목업 배경 | 2026-08-09, `ac5db5b` | `2026-07-28-dark-accent-roles-design.md` |
| 제품 편입 (뉴트럴·시맨틱) | 2026-08-09, PR #17 | `2026-07-21-accent-scale-derivation-design.md` |
| 4개 산출물 파이프라인 | 2026-08-10, PR #18 | `2026-08-09-palette-generator-color-system-design.md` |
| `web/` 자동 커버리지 0 | 2026-08-10, PR #18 | 사이클 1 최종 리뷰 판정 |
| 3.1 `src/lab/`이 제품 경로다 — 엔진을 `src/color/`로 졸업 | 2026-08-16, `3355dbd` | `2026-08-10-palette-color-export-design.md` D1 |
| 3.2 `web/` 커버리지가 얇다 — 다운로드 경로 테스트 | 2026-08-16, `4bcaf40`/`72a0b4d` | 사이클 2 최종 리뷰 판정 |
| 저장·공유 — URL 직렬화(`replaceState`, pin은 hex) | 2026-08-16, `c3cd953` | `2026-07-27-guided-palette-builder-design.md` (localStorage는 이월) |
| `downloadFile` Firefox 취소 문제 + 사본 통합 | 2026-08-16, `c9ba80d` | 사이클 2 최종 리뷰 판정 |
| `navigator.clipboard` 무방비 | 2026-08-16, `c9ba80d` | 사이클 2 최종 리뷰 판정 |
| `adapter.ts`의 `if (!hexes)`가 빈 배열을 안 잡음 | 2026-08-16, `ce9c293` | 사이클 2 최종 리뷰 판정 |
| `assertColorSystem`에 `role.id` 중복 가드 없음 | 2026-08-16, `ce9c293` | 사이클 2 최종 리뷰 판정 |
| `tests/lab/roles.test.ts`의 파일 중간 import | 2026-08-16, `3355dbd` (파일 이동 중 정리) | 사이클 2 최종 리뷰 판정 |
| 뉴트럴 어트랙터 직접 선택 | 2026-08-16, `5cafae6`/`5af5189` | `2026-08-09-palette-generator-color-system-design.md` |
