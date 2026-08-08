# 팔레트 생성기 — 색 시스템 전체로 확장 (사이클 1) · 설계 스펙

> 2026-08-09 승인. 가이드드 빌더 v1(`2026-07-27`) → 다크 역할 재배치(`2026-07-28`)를
> 잇는 세 번째 사이클. 지금까지 액센트 한 종류만 만들던 생성기를 **뉴트럴·시맨틱까지
> 만드는 색 시스템 생성기**로 확장한다.
>
> 계보 주의: 이 트랙은 Refactoring UI에서 출발한 생성기 계보 위에 있다. 레거시
> 위자드를 위해 만든 58종 코퍼스 자산(`neutral-baseline.md` 등)은 **기준선이 아니라
> 교차 검증용 참고**로만 쓴다. 레퍼런스는 액센트 곡선과 같은 출처(tailwind v4 +
> radix)를 쓴다.

## 목적과 성공 기준

- 생성기가 **완결된 색 시스템**을 만든다: 액센트 11-stop + 뉴트럴 11-stop +
  시맨틱 4종 × 11-stop, 각각의 역할 레이어와 다크 재배치까지.
- 교보재 한 문장: "브랜드 색 하나에서 팔레트 전체가 나온다 — 단 **뉴트럴은 액센트
  hue를 따라가지 않고 정해진 몇 자리로 스냅하고**, 시맨틱은 문화적으로 고정된
  자리를 지킨다."
- 성공 기준: (1) 6-pick 완주 시 세 종류 스케일이 전부 렌더된다, (2) copy CSS가
  세 스케일의 프리미티브+시맨틱+`.dark`를 한 벌로 내보낸다, (3) 엔진 계약 테스트
  전체 통과.

## 범위

**사이클 1 (이 스펙):** 엔진(뉴트럴 곡선·틴트 어트랙터·시맨틱 파생) + 역할 레이어
일반화 + 생성기 UI 확장. 산출은 화면 안 CSS 스니펫까지.

**사이클 2 (별도 스펙):** 생성기 → 4개 산출물(CSS/Tailwind/Figma/DESIGN.md)
파이프라인, 위자드 레거시화, 비색 카테고리 출처 결정. 이 스펙은 다루지 않는다.

## 검증 데이터 (2026-08-09)

설계의 모든 상수가 여기서 나온다. 산출 스크립트는 구현 시 `scripts/analysis/`에
정식 편입한다 (아래 "구현 시 정식화" 참조).

### V1 — 뉴트럴은 액센트 곡선을 공유하지 못한다

tailwind 뉴트럴 5종(`slate`/`gray`/`zinc`/`neutral`/`stone`) stop별 평균 L을
`OURS_CURVE`와 대조:

| stop | 뉴트럴 meanL (sd) | 액센트 L | ΔL |
| --- | ---: | ---: | ---: |
| 50 | 0.9848 (0.000) | 0.9772 | +0.008 |
| 100 | 0.9684 (0.001) | 0.9503 | +0.018 |
| 200 | 0.9244 (0.003) | 0.9052 | +0.019 |
| 300 | 0.8702 (0.001) | 0.8393 | +0.031 |
| 400 | 0.7066 (0.002) | 0.7533 | −0.047 |
| 500 | 0.5532 (0.002) | 0.6838 | **−0.131** |
| 600 | 0.4434 (0.003) | 0.6014 | **−0.158** |
| 700 | 0.3720 (0.001) | 0.5180 | **−0.146** |
| 800 | 0.2736 (0.004) | 0.4469 | **−0.173** |
| 900 | 0.2098 (0.004) | 0.3948 | **−0.185** |
| 950 | 0.1384 (0.008) | 0.2777 | **−0.139** |

두 가지가 읽힌다:

1. **밝은 쪽 4단(50–300)은 사실상 일치하고, 400부터 갈라진다.** 뉴트럴은
   300→400에서 ΔL 0.163을 한 번에 떨어뜨린다(액센트는 0.086). 밝은 쪽에 배경용
   단계를 몰아두고 나머지를 텍스트용으로 급강하시키는 구조 — RUI의 "인터페이스
   대부분이 그레이"와 맞물린다.
2. **sd가 0.001~0.008.** 다섯 램프의 L 진행이 사실상 동일하다. tailwind는 모든
   그레이에 같은 사다리를 쓴다 → **뉴트럴 L은 취향 축이 아니라 상수**다.

### V2 — 뉴트럴 hue는 이산 어트랙터로 스냅한다

| tailwind | hue@C_max | C_max | | radix | hue@C_max | C_max |
| --- | ---: | ---: | --- | --- | ---: | ---: |
| `slate` | 257.4° | 0.0460 | | `mauve` | 292.9° | 0.0193 |
| `gray` | 259.7° | 0.0340 | | `slate` | 277.7° | 0.0165 |
| `zinc` | 285.8° | 0.0170 | | `sage` | 167.6° | 0.0117 |
| `neutral` | — | 0 | | `olive` | 136.6° | 0.0119 |
| `stone` | 58.1° | 0.0130 | | `sand` | 106.7° | 0.0102 |
| | | | | `gray` | — | 0 |

- 두 독립 시스템이 같은 지대를 가리킨다: 무채색 · ~258 · ~278–293 · ~137–168 · ~58–107.
- 채도가 액센트의 **1/5 ~ 1/20** (액센트 C_max 코퍼스 중앙값 0.213).
- **웜 쪽이 결정적**: radix `sand`는 웜 액센트와 페어링되는 그레이인데 hue가 106.7°
  — 오렌지 액센트(30–50°)에서 60° 이상 밀려 있다. tailwind `stone`도 58.1°이고
  stop별로 34–74°를 오간다(웜 그레이는 hue가 불안정). 레거시 코퍼스에서도 같은
  방향이 관측된다(claude 액센트 39° → 뉴트럴 82°, mistral 59° → 92°,
  posthog 74° → 117°; 그리고 58종 중 **웜 틴트 뉴트럴은 0종**).
- 결론: `neutral.h = accent.h`는 **성립하지 않는다.** 순수 웜 그레이는 갈색이 된다.
  성립하는 것은 `neutral.h = 최근접_어트랙터(accent.h)`.

### V3 — 뉴트럴 채도는 강도 하나에 종속된다

C를 램프별 C_max로 정규화한 모양:

| stop | slate | gray | zinc | stone | mean | sd |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 50 | 0.065 | 0.059 | 0.000 | 0.077 | 0.050 | 0.030 |
| 200 | 0.283 | 0.176 | 0.235 | 0.231 | 0.231 | 0.038 |
| 300 | 0.478 | 0.294 | 0.353 | 0.385 | 0.377 | 0.067 |
| 500 | 1.000 | 0.794 | 0.941 | 1.000 | 0.934 | 0.084 |
| 700 | 0.957 | 1.000 | 0.765 | 0.769 | 0.873 | 0.107 |
| 800 | 0.891 | 0.971 | 0.353 | 0.538 | 0.688 | **0.253** |
| 900 | 0.913 | 1.000 | 0.353 | 0.462 | 0.682 | **0.279** |
| 950 | 0.913 | 0.824 | 0.294 | 0.308 | 0.585 | **0.286** |

밝은 쪽은 일치하고 어두운 쪽에서 갈리는데, 갈리는 방식이 **C_max와 상관**한다:

| ramp | C_max | 900의 정규화 C |
| --- | ---: | ---: |
| `slate` | 0.046 | 0.91 |
| `gray` | 0.034 | 1.00 |
| `zinc` | 0.017 | 0.35 |
| `stone` | 0.013 | 0.46 |

**틴트가 진한 램프일수록 어두운 쪽까지 채도를 끌고 간다.** 독립 축이 아니라 강도의
종속 변수 → knob을 하나 더 열 필요가 없다.

### V4 — 시맨틱은 액센트 곡선을 그대로 쓴다

tailwind red/amber/green/blue가 `OURS_CURVE`에서 벗어나는 정도:

| ramp | mean\|ΔL\| | max\|ΔL\| | cMult 편차 | Δh(50) | Δh(950) |
| --- | ---: | ---: | ---: | ---: | ---: |
| red | 0.021 | 0.049 | 0.066 | −8.0° | +0.7° |
| green | 0.018 | 0.039 | 0.078 | +6.2° | +3.4° |
| blue | 0.029 | 0.061 | 0.118 | −5.2° | +8.1° |
| amber | 0.035 | 0.085 | 0.063 | **+25.2°** | **−24.4°** |

새 곡선이 필요 없다. amber만 hue 드리프트가 큰데, 이는 액센트 트랙이 이미
정량화해둔 현상이다(웜톤은 어두운 stop에서 주황 쪽으로 −22~−28° 튼다).

앵커(tailwind 500)가 레거시 코퍼스의 hue 밴드와 **전부 일치**한다:

| | tailwind 500 (L / C / h) | 코퍼스 밴드 |
| --- | --- | --- |
| red | 0.637 / 0.237 / 25.3° | 11–34° ✓ |
| amber | 0.769 / 0.188 / 70.1° | 67–90° ✓ |
| green | 0.723 / 0.219 / 149.6° | 145–163° ✓ |
| blue | 0.623 / 0.214 / 259.8° | 254–262° ✓ |

> **레거시 상수 오류 기록:** `src/schema/color.ts`의 `SEMANTIC_PALETTE.info.hue = 230`은
> 코퍼스 밴드(254–262°) 밖이다. 두 독립 소스가 259.8°/258°를 가리키므로 생성기
> 계보에서는 tailwind 실측값을 쓴다. 레거시 값 정정은 사이클 2 범위.

## 확정된 결정

| 결정 | 내용 | 근거 |
| --- | --- | --- |
| 뉴트럴 L | 상수 테이블 `NEUTRAL_CURVE` | V1 — sd 0.001~0.008, 취향 축 아님 |
| 뉴트럴 hue | 액센트 hue → 최근접 어트랙터 스냅 | V2 — 연속 매핑은 웜에서 갈색 붕괴 |
| 뉴트럴 채도 | `strength × cShape(i, strength)` | V3 — 어두운 쪽 모양이 강도에 종속 |
| 뉴트럴 선택 | 자동 스냅 + 후보 3개 | 데이터가 답한 축은 디폴트로, RUI가 빈칸으로 남긴 축(틴트 여부·강도)만 개방 |
| 시맨틱 곡선 | `OURS_CURVE` 재사용 | V4 — mean\|ΔL\| 0.018~0.035 |
| 시맨틱 선택 | 없음 (자동, 표시만) | RUI는 시맨틱을 "그냥 주라"고 함. 취향 축 아님 |
| 역할 레이어 | 단일 `SCALE_ROLES`를 세 종류에 공통 적용 | 다크 규칙이 시스템에 하나만 남음 |
| 디렉터리 | `src/lab/accent-scale/` → `src/lab/palette/` (아래 경계 참조) | 액센트 전용 이름이 더 이상 내용과 안 맞음 |

### 개명 경계

`src/lab/accent-scale/`와 그 임포터만 옮긴다 — 총 27개 파일이 문자열
`accent-scale`을 포함하지만 대부분 파일 헤더 주석이다.

| 대상 | 조치 |
| --- | --- |
| `src/lab/accent-scale/**` (14파일) | `src/lab/palette/**`로 이동 + 헤더 주석 갱신 |
| `tests/lab/**` (7파일), `web/src/{lab,builder}/**` (2파일) | import 경로 갱신 |
| `scripts/analysis/accent-scale-{bench,refs}.ts`, `scripts/analysis/accent-scale/`, `package.json`의 동명 스크립트 | **개명하지 않는다** — 이들은 실제로 액센트 스케일 벤치/레퍼런스 추출이 맞다 |

## 아키텍처

```
src/lab/palette/                (accent-scale/ 에서 개명)
  types.ts      (이동)  AccentAlgorithm · ScaleSpec
  builder.ts    (이동)  fillScale · candidatesFor · Pin · SCALE_SIZE · STOP_KEYS
  ours.ts       (이동)  OURS_CURVE — 액센트/시맨틱 공용
  neutral.ts    (신규)  NEUTRAL_CURVE · TINT_ATTRACTORS · snapTint · neutralCandidates · buildNeutral
  semantic.ts   (신규)  SEMANTIC_ANCHORS · buildSemantic
  roles.ts      (일반화) SCALE_ROLES · cssSnippet(스케일 3종)
  index.ts      (이동)  ALGORITHMS 레지스트리
  bench/hct/leonardo/naive/radix/metric/v1/lab-data  (이동, 내용 무변경)

web/src/builder/BuilderPage.tsx  6단계로 확장 + 완료 화면 3종 스케일
```

랩 격리 규칙 유지: `src/generator/`는 `src/lab/`을 import하지 않는다(역방향은 허용).
브라우저 안전 — 정적 ESM만, Node 전용 API 금지.
FP 원칙 유지: 계산과 UI 문구(라벨·note)는 엔진에, `web/`은 렌더만.

## 엔진 상세

### `neutral.ts`

```ts
/** stop 50..950. l = tailwind 뉴트럴 5종 평균 L, cShape = 틴트 4종 정규화 C 평균. */
export const NEUTRAL_CURVE: readonly { l: number; cShape: number }[];

export interface TintAttractor {
  readonly id: "achromatic" | "cool" | "purple" | "green" | "warm";
  readonly label: string;      // 한국어 라벨
  readonly hue: number | null; // null = 무채색
  readonly note: string;       // 교보재 note (출처 램프 이름 포함)
}

export const TINT_ATTRACTORS: readonly TintAttractor[];  // 정확히 5개

/** 액센트 hue → 최근접 유채색 어트랙터 (원형 거리 최소).
 *  무채색은 hue가 없어 거리 계산 대상이 아니므로 후보 4개 중에서만 고른다. */
export function snapTint(accentHue: number): TintAttractor;

/** 후보 3개: 무채색 / 자동 틴트(스냅된 hue, strength 0.017) /
 *  뚜렷한 틴트(같은 hue, strength 0.040).
 *  반환 타입은 builder.ts의 `Candidate`를 그대로 쓴다 (color · label · note) —
 *  UI가 액센트 후보 칩과 같은 컴포넌트로 렌더할 수 있어야 한다. */
export function neutralCandidates(accentHue: number): Candidate[];

/** 틴트 확정 → 11-stop. gamut 클램프 포함. */
export function buildNeutral(tint: { hue: number | null; strength: number }): Oklch[];
```

어트랙터 hue 값(V2 실측 종합): cool 258 · purple 286 · green 150 · warm 85.
`strength` 후보값: 0 / 0.017 / 0.040 (실측 범위 0.010–0.046 안).

**`cShape`는 테이블 두 개다.** V3의 mean 열은 진단용이고 실제로 싣는 상수가 아니다
— 어두운 쪽 sd 0.25~0.29를 평균 하나로 뭉개면 V3가 발견한 강도-종속이 사라진다.
대신:

```ts
const C_SHAPE_SOFT: readonly number[];   // zinc·stone 평균 (C_max 0.013~0.017)
const C_SHAPE_STRONG: readonly number[]; // slate·gray 평균 (C_max 0.034~0.046)

// strength를 두 레퍼런스 C_max 사이에서 정규화해 선형 보간
cShape(i, strength) = lerp(C_SHAPE_SOFT[i], C_SHAPE_STRONG[i], t(strength))
```

두 테이블 모두 `neutral-curve-stats.ts` 산출물이며, 테스트는 문서 표가 아니라
**스크립트 재실행 결과와 대조**한다(문서 표는 일부 stop만 싣고 있어 계약이 될 수 없다).

### `semantic.ts`

```ts
export interface SemanticAnchor {
  readonly id: "error" | "success" | "warning" | "info";
  readonly label: string;
  readonly anchor: Oklch;              // tailwind 500 실측
  readonly hueRamp: readonly number[]; // stop별 Δh (11개), 앵커 기준
  readonly note: string;
}

export const SEMANTIC_ANCHORS: readonly SemanticAnchor[];  // 정확히 4개

/** 앵커 + OURS_CURVE + hueRamp → 11-stop. 사용자 입력 없음. */
export function buildSemantic(anchor: SemanticAnchor): Oklch[];
```

`hueRamp`는 규칙을 발명하지 않고 **레퍼런스 실측을 그대로 싣는다** (V4 표의 Δh).
amber의 +25.2 → −24.4가 여기 들어간다.

### `roles.ts` 일반화

기존 `ACCENT_ROLES`를 `SCALE_ROLES`로 개명하고(값·미러 규칙 무변경), `cssSnippet`을
스케일 3종을 받도록 확장한다.

```ts
export interface ScaleSet {
  readonly accent: readonly string[];                       // 11 hex
  readonly neutral: readonly string[];                      // 11 hex
  readonly semantic: Readonly<Record<SemanticId, readonly string[]>>;  // 4 × 11 hex
}

export function cssSnippet(scales: ScaleSet): string;
```

출력 형태 (변수 이름은 이 스펙이 계약):

```css
:root {
  --accent-50: …;   /* … --accent-950 */
  --neutral-50: …;  /* … --neutral-950 */
  --error-50: …;    /* … error/success/warning/info 각 11개 */

  --accent-subtle-bg: var(--accent-50);
  /* … 6역할 × 6스케일 */
}
.dark {
  /* 매핑이 실제로 바뀌는 역할만 (솔리드 제외) × 6스케일 */
}
```

프리미티브 66개 + `:root` 시맨틱 36개 + `.dark` 30개.

## UI 플로우

기존 5-pick 뒤에 뉴트럴 단계를 붙여 **6-pick**:

```
500 → 50 → 950 → 300 → 700 → 뉴트럴 틴트
```

- 뉴트럴 단계: `neutralCandidates(accent.h)`의 3후보를 기존 후보 칩과 같은 형태로
  제시. 자동 스냅된 어트랙터 이름을 note에 노출("당신의 액센트는 파랑 계열 —
  tailwind `slate`·radix `slate`가 쓰는 자리로 붙였습니다").
- 시맨틱은 픽 없음. 완료 화면에 4종 스케일과 "왜 브랜드 색을 안 따르는가"
  note 한 줄(문화적 고정 + 밴드 폭 red 23°·blue 8°)과 함께 등장.
- 완료 화면: 스케일 3종 hex 목록 + 역할표 + 라이트/다크 목업 + copy CSS.
  기존 다크 섹션(`DarkSection`)이 스케일 3종을 받도록 확장된다.

## 테스트

엔진 계약 테스트 (`tests/lab/neutral.test.ts`, `semantic.test.ts`, 기존
`roles.test.ts` 확장):

| 불변식 | 내용 |
| --- | --- |
| 뉴트럴 곡선 형태 | 11개, L 단조 감소, 값이 V1 표와 일치 |
| cShape 두 테이블 | 각 11개, `C_SHAPE_SOFT` ≤ `C_SHAPE_STRONG`가 어두운 쪽(800~950)에서 성립 (강도-종속의 방향을 고정) |
| 어트랙터 세트 | 정확히 5개, id 유니크, hue 0..360 또는 null, note 길이 > 10, 무채색은 정확히 1개 |
| 스냅 전수 | 0~359° 전 범위에서 `snapTint`가 **유채색** 어트랙터 4개 중 원형 거리 최소를 고름 (무채색은 절대 반환 안 됨) |
| 웜 스냅 | 액센트 hue 30~50°(오렌지)가 warm(85°)으로 붙는다 — 갈색 회피 회귀 테스트 |
| 뉴트럴 채도 | 전 stop C ≤ 0.05, 무채색 후보는 전 stop C = 0 |
| 시맨틱 앵커 | 4개, 각 hue가 코퍼스 밴드 안(red 11–34, amber 67–90, green 145–163, blue 254–262) |
| 시맨틱 스케일 | L 단조 감소, 앵커 자리(index 5)는 verbatim |
| 스니펫 완전성 | 프리미티브 66 + `:root` 36 + `.dark` 30, `--*-solid`가 `.dark`에 부재 |
| 스니펫 정합성 | 모든 `var(--*)` 참조가 같은 스니펫에서 선언됨 (dangling 금지) |
| 실전 왕복 | 6-pick 결과로 `cssSnippet`이 끝까지 도는 통합 확인 |

UI는 관례대로 Playwright 수동 검증 — 6-pick 완주 → 3종 스케일 렌더, copy CSS
눈검사, 콘솔 에러 0.

## 구현 시 정식화

검증에 쓴 스크래치 스크립트를 `scripts/analysis/neutral-curve-stats.ts`로 정식
편입한다 — `NEUTRAL_CURVE`·`C_SHAPE_*` 재생성용. 레퍼런스 갱신 시 다시 돌려
비교할 것.

> **2026-08-09 판단 변경 기록:** 초안은 `accent-scale/extract-references.ts`의
> 제외 목록을 풀어 `data/references/*-neutral.json`을 별도 생성하는 안이었다.
> 계획 작성 중 철회 — 액센트 JSON은 소비자(`bench.ts`·`radix.ts`)가 있어
> 중간 산출물이 정당하지만, 뉴트럴 JSON은 통계 스크립트 하나 말고는 아무도
> 읽지 않는다. `theme.css`를 직접 읽는 쪽이 계보가 짧고 갱신 지점이 하나다.
> 뉴트럴 레퍼런스를 여러 곳이 읽게 되면 그때 JSON으로 승격한다.

`ours.ts`의 선례를 따라 각 테이블 상단에 산출 스크립트와 산출 일자를 주석으로 남긴다.

## 에러 처리

빌더 스펙 원칙("엔진에 실패 경로를 만들지 않는다")을 잇고, 계약 위반 가드만 둔다:

- `cssSnippet`: 세 스케일 중 하나라도 길이 11이 아니면 throw.
- `buildNeutral`: `strength < 0` 또는 hue 범위 밖이면 throw.
- `snapTint`: 전 범위에서 반드시 어트랙터를 반환 (실패 경로 없음).

## v0 범위 밖 (명시적 이월)

- **어두운 쪽 뉴트럴 채도 독립 knob** — V3에서 sd 0.25~0.29로 갈리는 걸 강도 종속
  lerp로 근사했다. 눈 평가가 쌓여 불만이 생기면 독립 축으로 승격.
- **시맨틱 채도를 액센트에 맞추기** — 뮤트한 브랜드에 tailwind 채도 그대로의
  시맨틱이 튀는지. 현재는 앵커 고정.
- **뉴트럴 어트랙터 직접 선택** — 지금은 액센트에서 자동 스냅. "내 브랜드는
  파랑이지만 그레이는 웜으로" 요구가 실제로 생기면 개방.
- **hue 드리프트 knob (액센트)** — 액센트 트랙에서 이월된 채로 유지.
- 4개 산출물 파이프라인 · 위자드 레거시화 · 비색 카테고리 출처 — **사이클 2**.

## 참고 문서

- 빌더 v1 스펙: `docs/superpowers/specs/2026-07-27-guided-palette-builder-design.md`
- 다크 역할 스펙: `docs/superpowers/specs/2026-07-28-dark-accent-roles-design.md`
- 연구 트랙: `docs/research/accent-scale-derivation-track.md`
- 교차 검증용 레거시 코퍼스: `docs/research/neutral-baseline.md`,
  `docs/research/status-hue-principles.md`
- 정체성 기준: `docs/IDENTITY.md` (결정 규칙 3 — knob은 취향 축에만)
