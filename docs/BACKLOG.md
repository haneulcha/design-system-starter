# BACKLOG — 다음에 할 일

이월 항목이 스펙 다섯 곳의 "v0 범위 밖" 절에 흩어져 있고, 리뷰가 남긴 코드 부채는
어디에도 안 남는다(SDD 원장은 사이클이 끝나면 지운다). 이 문서가 그 둘의 단일 색인이다.

**원본은 각 스펙이다.** 여기 적힌 이월 항목의 근거와 기각 이유는 출처 스펙에 있고,
이 문서는 "무엇이 열려 있는가"만 답한다. 항목을 해소하면 **출처 스펙에 해소 표시를 하고**
여기서 지운다 — 두 곳에 살아 있게 두지 않는다.

최종 갱신: 2026-08-10 (사이클 2 / PR #18)

---

## 지금 열려 있는 것

| | 상태 |
| --- | --- |
| PR #18 `feat/palette-color-export` | 리뷰 완료, 병합 대기 |

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

현재 위치: 루트 `/`가 위자드, `#builder`가 생성기. 위자드는 "참고용"으로 선언됐지만
제품 진입점은 여전히 위자드다. 제거·강등·유지 중 무엇인지 정해지지 않았다.

출처: `specs/2026-08-10-palette-color-export-design.md`

### 1.3 저장·공유

새로고침하면 6단계가 날아간다. URL/localStorage 직렬화, 공유 링크, 다시 불러와 수정.
액센트 트랙부터 계속 이월돼 온 항목이다.

출처: `specs/2026-07-27-guided-palette-builder-design.md`

---

## 2. 기능 이월

### 색 시스템
- **어두운 쪽 뉴트럴 채도 독립 knob** — 지금은 강도 종속 lerp로 근사. 눈 평가가 쌓여
  불만이 생기면 독립 축으로 승격.
- **시맨틱 채도를 액센트에 맞추기** — 뮤트한 브랜드에 tailwind 채도 그대로의 시맨틱이
  튀는지. 현재는 앵커 고정.
- **뉴트럴 어트랙터 직접 선택** — 지금은 액센트에서 자동 스냅. "브랜드는 파랑인데
  그레이는 웜으로" 요구가 실제로 생기면 개방.
- **hue 드리프트 knob (액센트)** — 액센트 트랙에서부터 이월 중.
- **V4 독립 검증** — 시맨틱이 액센트 곡선을 재사용해도 된다는 근거가 부분적으로
  순환이다(`OURS_CURVE`가 red/amber/green/blue를 포함한 17종의 평균). 시맨틱이
  마음에 안 들면 radix red/green 독립 검증부터.

출처: `specs/2026-08-09-palette-generator-color-system-design.md`

### 빌더 UX
- **미세조정 피커** — 5-pick 외 임의 stop 선택, 하이브리드 후보.
- **컴포넌트 맥락 미리보기** — stop별 역할 매핑 이후.
- **다크 매핑 후보 선택지** — 관찰이 쌓인 뒤.
- **다크 전용 곡선 피팅** — radix-dark 레퍼런스 수집부터.

출처: `specs/2026-07-27-guided-palette-builder-design.md`,
`specs/2026-07-28-dark-accent-roles-design.md`

### 산출물
- **Figma 별칭 지원** — 지금은 역할 변수가 해석된 hex를 들고 있어 역할↔프리미티브
  관계가 사라진다. `FigmaVariable.valuesByMode`에 별칭 타입이 없어서고, 지원하려면
  `src/figma/types.ts`를 확장해야 한다.
- **산출물 합치기** — 생성기 산출물과 레거시 위자드 산출물이 같은 변수 이름
  (`--color-accent-*`·`--color-neutral-*`)을 서로 다른 값으로 선언한다. 둘을 같이 쓰는
  방법이 정해진 바 없다. → 1.1과 묶여 있다.
- **"내 팔레트로 이 앱 보기"** — 생성된 팔레트를 앱 전역에 입히는 기능. 사이클 2에서
  기각한 대안(툴 UI가 같이 바뀌어 회귀와 구분이 안 됨)이지만 별도 기능으로는 매력적.

출처: `specs/2026-08-10-palette-color-export-design.md`

---

## 3. 구조 부채

### 3.1 `src/lab/`이 제품 경로다
팔레트 엔진(`builder`·`neutral`·`semantic`·`roles`·`ours`)은 제품 기능의 본체인데
연구 코드와 같은 디렉터리에 있다. 같은 폴더의 `hct`·`leonardo`·`radix`·`naive`·`v1`·
`bench`·`metric`은 진짜 연구 코드이고 `#lab` 비교 화면이 계속 쓴다.

졸업시킬 때 `SCALE_ORDER`가 자연스러운 seam이다 — `web/`과 `src/export/`가 순서 때문에
둘 다 의존하는 유일한 엔진 상수이고 이미 역할표 옆에 있다.

출처: `specs/2026-08-10-palette-color-export-design.md` D1 (의도적으로 남긴 부채)

### 3.2 `web/` 커버리지가 얇다
테스트 파일 하나(3케이스)뿐이다. 하네스는 갖춰졌으니 다음 테스트는 싸다.
가장 값어치 있는 다음 하나: **다운로드 경로**. `URL.createObjectURL`에 spy를 걸어
Blob 내용에 `--color-accent-500`이 들어있는지 확인하면, 엔진 테스트와 사용자가 실제로
받는 파일 사이의 고리가 닫힌다. 지금은 그 고리를 자동으로 잇는 것이 없다.

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

### 브라우저 호환
- **`downloadFile`이 object URL을 동기 해제하고 앵커를 문서에 붙이지 않는다.**
  Firefox에서 다운로드가 취소될 수 있다. `web/src/builder/ExportPanel.tsx`와
  `web/src/result/DownloadPanel.tsx`에 **같은 코드가 있다** — 하나만 고치면 더 나쁘다.
- **`navigator.clipboard`가 무방비다.** 비보안 컨텍스트(LAN에서 `vite preview --host`)에서
  undefined라 클릭이 잡히지 않는 TypeError를 던진다. `ExportPanel.tsx`.

### 타입·구조
- `src/export/color/adapter.ts`의 `if (!hexes)`가 빈 배열을 안 잡는다 —
  `assertColorSystem`이 뒤에서 잡지만 같은 문제를 두 메시지로 보고한다. `!hexes?.length`.
- `assertColorSystem`에 `role.id` 중복 가드가 없다(스케일 이름 중복 가드는 있다).
- `src/export/color/index.ts`를 루트 테스트가 전혀 건드리지 않는다 — 재수출 하나가
  빠져도 `pnpm test`는 초록이다(`web/`의 `tsc -b`가 잡긴 한다).
- `web/vitest.config.ts`·`vitest.setup.ts`가 `tsconfig.json`의 `include` 밖이라
  타입체크를 안 받는다. `vite.config.ts`도 마찬가지라 새 문제는 아니다.
- `BuilderPage.tsx`의 `redo()`가 뉴트럴 단계 인덱스 5를 하드코딩한다. `BUILDER_FLOW`에서
  유도하면 흐름을 재배열해도 안전하다.
- `BuilderPage.tsx`에 `stopIndex = -1` 센티널이 판별 유니온과 나란히 살아 있다.
  현재는 모든 소비처가 `kind` 검사로 막혀 있지만, 안전이 값이 아니라 다른 곳의 검사에
  달려 있다.

### 화면
- **완료 화면에 다크 시연이 둘이다.** `DarkSection`의 라이트/다크 목업 + 역할표와
  `ExportPanel`의 미리보기 토글이 같은 주장을 한다. 각각은 정당했지만 함께 보면 중복.
- `DarkSection` 헤더의 `justify-between`이 복사 버튼이 빠지면서 자식 하나만 남아
  무의미해졌다.

### 테스트 다듬기
- `tests/export/color/types.test.ts`의 index-range 테스트가 제목은 "role and the field"인데
  정규식은 필드만 검사한다.
- `tests/export/color/design-md.test.ts`의 `toHaveLength(66)`이 픽스처 사실을 재진술한다.
- `tests/export/color/theme-css.test.ts`가 같은 candidates로 `compile()` 왕복을 두 번 한다.
- `tests/lab/roles.test.ts`의 import 하나가 파일 중간에 있다.

---

## 5. 해소 기록

| 항목 | 해소 | 출처 스펙 |
| --- | --- | --- |
| 뉴트럴 연동 목업 배경 | 2026-08-09, `ac5db5b` | `2026-07-28-dark-accent-roles-design.md` |
| 제품 편입 (뉴트럴·시맨틱) | 2026-08-09, PR #17 | `2026-07-21-accent-scale-derivation-design.md` |
| 4개 산출물 파이프라인 | 2026-08-10, PR #18 | `2026-08-09-palette-generator-color-system-design.md` |
| `web/` 자동 커버리지 0 | 2026-08-10, PR #18 | 사이클 1 최종 리뷰 판정 |
