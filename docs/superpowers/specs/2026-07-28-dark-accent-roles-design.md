# 다크 액센트 역할 재배치 — 설계 스펙

> 2026-07-28 승인. 빌더 v1(`2026-07-27-guided-palette-builder-design.md`)의 이월 항목
> "다크 모드 스케일"의 첫 사이클 — 접근안 A(순수 인덱스 재배치). 다크 색을 새로
> 만들지 않고, 사용자가 완성한 11-stop 안에서 역할만 재배치한다. 관찰이 쌓여
> 불만이 생기는 지점이 (b) 다크 곡선 피팅의 요구사항이 된다.

## 목적과 성공 기준

- 빌더에서 완성한 11-stop 액센트 스케일이 다크 테마에서 어떻게 쓰이는지를
  **고정 역할표 + 미니 목업**으로 보여주고, CSS 스니펫으로 가져가게 한다.
- 교보재 한 문장: "다크는 색을 새로 만드는 게 아니라 **같은 사다리를 반대쪽에서
  오르는 것**, 단 브랜드 색(솔리드)만 자리를 지킨다."
- 성공 기준: (1) 완료 화면에 라이트/다크 목업 + 6역할표가 렌더된다,
  (2) copy CSS가 목업을 그린 것과 동일한 변수 체계를 내보낸다,
  (3) 엔진 계약 테스트 전체 통과.

## 확정된 결정 (브레인스토밍 2026-07-28)

| 결정 | 내용 | 근거 |
| --- | --- | --- |
| 범위 | 빌더(#builder) 완료 화면 확장 | 제품 액센트는 아직 1-stop — 편입 없이 11-stop이 있는 곳에서 실험 |
| 역할 세트 | 미니멀 6역할 (RUI 감성) | 교보재로 이해하기 쉽고 확장 가능. YAGNI |
| 상호작용 | 고정표 v0 (선택지 없음) | 다크 눈 평가 데이터가 아직 없음 — 관찰부터. 우리 곡선 v0와 같은 전략 |
| 미리보기 | 역할표 + 미니 목업 (라이트/다크 나란히) | RUI "맥락에서 보라" + 이월했던 컴포넌트 미리보기가 역할 매핑과 함께 자연 편입 |
| 내보내기 | copy CSS 스니펫 추가 (hex 복사는 유지) | 역할표가 화면 안 지식으로 끝나지 않게. 2-레이어 철학 |
| 색 생성 | 접근안 A: 순수 인덱스 재배치 — 새 색 0개 | "당신의 11색이 두 테마를 감당한다"는 약속. 보정 계수는 근거(눈 평가) 없음 |

## 역할표와 매핑 규칙 (설계의 심장)

> **다크 매핑 규칙: 인덱스 미러 (i → 10−i). 단 솔리드(앵커)만 예외로 고정.**

제품 뉴트럴의 `DARK_NEUTRAL_INVERSION`(50↔900, 100↔800…)과 같은 미러 원리 —
시스템 전체가 한 규칙을 공유한다.

| 역할 (id) | 라이트 | 다크 | note 골자 |
| --- | --- | --- | --- |
| 은은한 배경 `subtle-bg` (배지·알림 바탕) | 50 | 950 | 밝은 tint ↔ 어두운 tint 극성 반전 — Tailwind `dark:bg-*-950` 관례 |
| 호버 배경 `hover-bg` | 100 | 900 | 배경보다 "한 단계 더" — 진해지는 방향이 다크에선 밝아지는 방향으로 뒤집힘 |
| 테두리 `border` | 200 | 800 | 배경과의 거리 유지가 핵심, 절대 밝기가 아니라 |
| **솔리드 `solid` (버튼 배경)** | **500** | **500 (동일)** | 브랜드 색은 테마를 가로질러 보존 — Radix도 다크에서 accent step 거의 유지. 흰 텍스트 대비도 그대로. 연구 트랙 R1(앵커 보존)과 일관 |
| 텍스트 `text` (링크) | 600 | 400 | Tailwind의 `text-blue-600` ↔ `dark:text-blue-400` 패턴 그대로 |
| 진한 텍스트 `text-strong` | 700 | 300 | 텍스트보다 한 단계 더 — 미러 규칙의 자연 귀결 |

## 아키텍처

```
src/lab/accent-scale/roles.ts       ← 엔진 (순수 함수, 신규)
  AccentRole                         // { id, label, lightIndex, darkIndex, note }
  ACCENT_ROLES                       // 정확히 6개, 위 표 그대로
  cssSnippet(hexes): string          // 11 hex → 2-레이어 CSS 커스텀 프로퍼티

web/src/builder/BuilderPage.tsx     ← 완료 화면에 다크 섹션 추가 (수정)
```

- 엔진은 기존 패턴 준수: UI 문구(라벨·note)는 엔진에(lab-data 방식), 랩 격리
  규칙(generator import 금지, 브라우저 안전 정적 ESM만).
- 신규 React 상태 없음 — 완성된 `pins` → `fillScale` → hex 11개에서 전부 파생 렌더.
- `fillScale` 결과를 hex로 바꾸는 건 UI가 이미 수행 — 엔진은 hex 배열만 받는다.

## 엔진 상세

```ts
export interface AccentRole {
  readonly id: string;          // "subtle-bg" | "hover-bg" | "border" | "solid" | "text" | "text-strong"
  readonly label: string;       // "은은한 배경" 등 한국어 라벨
  readonly lightIndex: number;  // 0..10
  readonly darkIndex: number;   // 미러 규칙: 10 − lightIndex, 솔리드만 5
  readonly note: string;        // 역할표의 교보재 note
}

export const ACCENT_ROLES: readonly AccentRole[];
export function cssSnippet(hexes: readonly string[]): string;
```

`cssSnippet` 출력 형태 (변수 이름은 이 스펙이 계약):

```css
:root {
  --accent-50: #eff6ff;
  /* … --accent-950 까지 프리미티브 11개 */
  --accent-subtle-bg: var(--accent-50);
  --accent-hover-bg: var(--accent-100);
  --accent-border: var(--accent-200);
  --accent-solid: var(--accent-500);
  --accent-text: var(--accent-600);
  --accent-text-strong: var(--accent-700);
}
.dark {
  --accent-subtle-bg: var(--accent-950);
  --accent-hover-bg: var(--accent-900);
  --accent-border: var(--accent-800);
  --accent-text: var(--accent-400);
  --accent-text-strong: var(--accent-300);
}
```

- **`.dark`에는 매핑이 실제로 바뀌는 역할만** — 솔리드는 뺀다. "다크에서 재선언
  안 한 것 = 안 바뀐 것"이 규칙을 코드로도 말한다.
- **제품 다운로드 토큰과 레이어 선택이 반대**인 것은 의도: 제품 다크는
  프리미티브를 오버라이드하고 시맨틱 고정, 여기는 프리미티브 11개가 두 테마
  동일하고 시맨틱이 재배치. 접근안 A의 정의 그 자체 — UI note로 한 줄 설명.

## UI 플로우 (완료 화면 다크 섹션)

기존 "11 hex 목록 + copy hex" 아래, "내가 고른 여정" 요약 위에 배치.

1. **미니 목업 — 라이트/다크 나란히.** 같은 마크업의 패널 2개, CSS 변수만 교체:
   - 패널 배경 고정값: 라이트 `#ffffff`, 다크 `#171717` (뉴트럴은 범위 밖 —
     "실제 앱에선 뉴트럴 스케일이 이 자리" note 한 줄).
   - 6역할 전원 등판: 은은한 배경+테두리의 알림 카드, 안에 진한 텍스트 제목 +
     텍스트(링크 색) 한 줄, 솔리드 버튼(흰 텍스트) + 호버 배경 ghost 버튼.
   - 각 요소 `title` 툴팁: "solid — 라이트 500 / 다크 500" 식 매핑 표시.
   - 컨테이너에 인라인 style로 `--accent-*` 시맨틱 변수 주입, 내용물은
     `var(--accent-solid)` 등만 참조 — **복사해 가는 CSS가 곧 이 목업을 그린 CSS**.
2. **역할표.** 역할 라벨 · 라이트 칩+stop 번호 · 다크 칩+stop 번호 · note.
   솔리드 행은 앵커 링과 같은 테두리로 강조 ("여기만 안 움직인다").
3. **copy CSS 버튼.** `cssSnippet(hexes)` → 클립보드. copy hex 버튼과 같은 스타일.
4. **레이어 note 한 줄.** "다크에서 색(프리미티브)은 그대로, 역할(시맨틱)만
   재배치 — 같은 사다리를 반대쪽에서 오른다" + 미러 규칙 요약.

## 테스트

엔진 계약 테스트 (`tests/lab/roles.test.ts`):

| 불변식 | 내용 |
| --- | --- |
| 역할표 형태 | 정확히 6개, id 유니크, label/note 비어있지 않음 (note 길이 > 10) |
| 미러 규칙 | 모든 역할 `darkIndex === 10 − lightIndex`, 단 solid는 5 → 5 |
| 인덱스 범위 | light/dark 모두 0..10 정수 |
| 스니펫 완전성 | 프리미티브 11개 + `:root` 시맨틱 6개, `.dark`에는 바뀌는 5개만 (`--accent-solid` 부재를 명시적으로 assert) |
| 스니펫 정합성 | 스니펫 안 모든 `var(--accent-*)` 참조가 같은 스니펫에서 선언됨 (dangling 금지) |
| 실전 왕복 | 실제 `fillScale`(앵커 1개) 결과 11 hex로 스니펫 생성이 끝까지 도는 통합 확인 |

UI는 관례대로 Playwright 수동 검증 — 5-pick 완주 → 다크 섹션 렌더(목업 2패널,
역할표 6행, 솔리드 행 강조), copy CSS 내용 눈검사, 콘솔 에러 0.

## 에러 처리

빌더 스펙 원칙("엔진에 실패 경로를 만들지 않는다")을 잇되 계약 위반 가드 하나만:
`cssSnippet`에 길이 11이 아닌 배열이 오면 throw (`fillScale`의 앵커 부재 throw와
같은 결의 프로그래머-에러 가드). UI는 완성된 스케일에서만 호출.

## v0 범위 밖 (명시적 이월)

- 다크 매핑 후보 선택지 (관찰 쌓인 뒤)
- 뉴트럴 연동 목업 배경 (지금은 고정 `#ffffff`/`#171717`)
- 제품(WizardState/다운로드 토큰) 편입
- (b) 다크 전용 곡선 피팅 — radix-dark 레퍼런스 수집부터

## 참고 문서

- 빌더 v1 스펙: `docs/superpowers/specs/2026-07-27-guided-palette-builder-design.md`
- 연구 트랙: `docs/research/accent-scale-derivation-track.md`
- 제품 다크 반전표: `src/schema/archetype-palettes.ts` `DARK_NEUTRAL_INVERSION`
- 상태색 다크 보정(비교용): `src/generator/color-category.ts` `adjustStatusForDark`
