# Accent Scale Derivation — Research Track Design

_2026-07-21. 브랜드 컬러(hex 1개) → 액센트 스케일 유도 알고리즘을 연구하는 트랙의 설계 문서. 제품 편입은 이 트랙의 범위 밖이며, 연구 결과가 나온 뒤 별도 사이클에서 결정한다._

## 배경

- v2 파이프라인은 프리셋 아키타입 팔레트 기반(`src/schema/archetype-palettes.ts` → `src/generator/color-category.ts`)이다. 브랜드 컬러 → 스케일 유도는 v1 잔재(`src/generator/color.ts`의 `generateScales`, 고정 L/cMult 테이블)로만 남아 있고 v2에서는 쓰이지 않는다.
- 이 트랙은 유도 알고리즘 자체를 연구한다: 라이트니스 커브, 크로마 보정, 색공간 선택이 스케일 품질에 어떻게 기여하는지.
- 근거 데이터: `docs/research/accent-baseline.md` (58개 시스템 corpus — C_max median 0.213, primary hue L 범위 0.51–0.67, stop 수 median 5).

## 범위

**In scope:** 브랜드 hex 1개 → 액센트 스케일(9~12 stop) 유도. 라이트 모드만.

**Out of scope:** 뉴트럴 틴트, 상태색 보정, 다크모드 유도, 제품 파이프라인 편입. (각각 이 트랙의 발견 위에서 후속 트랙으로.)

**다운스트림 소비자 — 가이드드 팔레트 빌더 (후속 기능, 별도 스펙):** 이 연구의 최종 소비자는 Refactoring UI 방식의 human-in-the-loop 빌더다 — 유저가 accent(500)를 고르면 → 양끝(0, 900) → 중간(300, 700) 순으로 채워가며, 각 shade 자리에서 도구가 **후보 선택지들**을 제시해 유저가 자기 취향을 발견하게 돕는다. 따라서 서베이/벤치마크는 "정답 하나를 얼마나 잘 만드나"에 더해 **"각 shade 자리에서 그럴듯한 후보 공간(크로마 커브, hue 회전 방향 등 변주 축)을 어떻게 정의하나"** 관점을 함께 기록한다. 레퍼런스 팔레트 간 stop별 분산이 그 후보 공간의 근거 데이터가 된다.

## 성공 기준

1. **레퍼런스 재현력 (정량)** — 손수 튜닝된 유명 팔레트(Tailwind v4, Radix Colors)의 앵커 색을 입력했을 때 원본 스케일을 얼마나 가깝게 재현하는가. ΔE(OK) 측정.
2. **눈 평가 (정성)** — 비교 랩에서 여러 입력 색에 대해 알고리즘별 스케일을 나란히 보고 판단.
3. **코퍼스 분포 일치** — 유도된 스케일의 C_max, L 범위가 accent-baseline corpus 통계와 정합적인가.

콘트라스트 보장(WCAG/APCA 고정 타깃)은 성공 기준이 아니다 (rejected: 아래 §rejected 참고).

## 구조

연구 코드는 제품 코드와 경로로 분리하되 같은 레포에서 진행한다.

| 위치 | 내용 |
| --- | --- |
| `src/lab/accent-scale/` | 알고리즘 구현체. 순수 함수, 공통 인터페이스 `derive(hex, stops) → Oklch[]`. `src/generator/`에서 import 금지 (실험 코드임을 경로로 표현). |
| `scripts/analysis/accent-scale-bench.ts` | ΔE 정량 벤치마크 CLI (`pnpm accent-scale-bench`). markdown 리포트 emit. |
| `web/src/lab/LabPage.tsx` | `location.hash === "#lab"`일 때 `App.tsx`가 ResultPage 대신 렌더. `ColorScaleStrip`, `OklchPicker` 재활용. |
| `data/references/` | Tailwind/Radix 레퍼런스 팔레트 JSON (버전 명시, 고정 커밋). |
| `docs/research/` | 서베이 문서 + 트랙 문서 (플레이북 형식, rejected-options 로그 유지). |

web은 `@core` alias로 `src/`를 이미 참조하므로 랩 UI와 벤치마크 스크립트가 같은 알고리즘 모듈을 공유한다.

## 서베이 대상 알고리즘

| # | 알고리즘 | 소스 | 비고 |
| --- | --- | --- | --- |
| 1 | v1 현행 | `src/generator/color.ts` | 고정 L/cMult 테이블. 베이스라인 |
| 2 | Material HCT | `@material/material-color-utilities` (npm) | tonal palette, HCT 색공간 |
| 3 | Adobe Leonardo | `@adobe/leonardo-contrast-colors` (npm) | 콘트라스트 비율 기반 보간 |
| 4 | Radix 방식 | 공개 소스 기준 포팅 | custom color 알고리즘 |
| 5 | 나이브 컨트롤 | 자체 구현 | OKLCH endpoint(흰↔검) 단순 보간 — 하한 기준점 |

원칙: npm 패키지가 있으면 패키지 사용(재구현 오류 방지), 없는 것만 포팅.

### 서베이 문서 = 1급 산출물 (학습 목적)

이 트랙의 목적은 구현 자체가 아니라 **기존 제품들을 보고 공부하는 것**이다. 서베이 문서(`docs/research/accent-derivation-survey.md`)는 구현 준비 메모가 아니라 트랙의 핵심 산출물로 취급한다:

- **대상**: 위 알고리즘 5종 + 레퍼런스 팔레트 2종(Tailwind v4, Radix Colors — 알고리즘이 아니라 손튜닝 결과물이지만 "왜 그렇게 튜닝했나"가 학습 대상) + **Refactoring UI의 수동 방법론**(accent → 양끝 → 중간 채우기; 가이드드 빌더의 원형).
- **각 대상마다**: 설계 철학/의도(만든 사람들이 밝힌 이유), 메커니즘(색공간, 커브 형태, 채도 처리, 앵커 의미), 스텝 의미 체계(예: Radix 12-step은 각 스텝에 용도가 배정됨 — 배경/보더/솔리드/텍스트), 원문 소스 링크(공식 문서·블로그·소스코드), 우리 스타터에 주는 시사점, 후보 생성기 관점.
- **말미에**: 대상 간 비교 표 + "이 조사에서 배운 것" 종합 섹션. 벤치마크·눈 평가가 끝나면 그 발견도 이 문서(또는 트랙 문서)로 환류한다.

## 벤치마크 프로토콜

1. 레퍼런스 팔레트의 앵커 stop(Tailwind 500 등)을 각 알고리즘에 입력.
2. 레퍼런스와 같은 stop 위치의 스케일을 생성.
3. stop별 ΔE(OK)를 측정, 알고리즘별 mean/max를 hue family별로 집계.
4. 코퍼스 정합성: 유도 스케일의 C_max, L 범위 vs accent-baseline median 비교 표.
5. 산출물: `docs/research/accent-scale-bench-report.md` — 스크립트로 재생성 가능해야 한다.

## 비교 랩 UI (v1)

`#lab` 진입 시:

- hex 입력 1개 (OklchPicker 재활용)
- 알고리즘별 스케일 스트립 세로 나열 (ColorScaleStrip 재활용)
- 입력 색과 가장 가까운 hue의 Tailwind/Radix 레퍼런스 스트립 함께 표시 (눈 비교 기준)
- 각 스트립에서 hex 복사
- 랩에서는 각 알고리즘의 네이티브 stop 구성 그대로 표시 (강제 정렬하지 않음; stop 정렬은 벤치마크에서만 수행)

L/C 커브 차트 등 추가 시각화는 눈 평가 과정에서 필요해지면 붙인다 (YAGNI).

## 진행 순서

1. **서베이** — 알고리즘 조사 → `docs/research/accent-derivation-survey.md` (문서만, 코드 없음)
2. **벤치마크 하네스** — 레퍼런스 데이터 + ΔE 측정기 + v1 베이스라인 측정 (TDD)
3. **후보 알고리즘 연결** — 하나씩 추가하며 리포트 갱신
4. **랩 라우트** — 눈 평가 시작
5. **종합** — "우리 곡선" 설계 → 트랙 문서 (`accent-scale-derivation-track.md`) → 제품 편입은 별도 사이클

## 컨벤션

- 브랜치: `research/accent-scale-derivation` (main에서 새로)
- 커밋 프리픽스: `docs(color):` 연구 문서 / `feat(lab):` 랩 코드 / `test(lab):` 테스트
- TDD: 벤치마크 하네스부터 적용. 알고리즘 래퍼는 알려진 입력→출력 스냅샷 테스트, ΔE 수식은 단위 테스트
- FP + 로직/렌더 분리: 랩 UI의 스케일 계산은 lib으로 분리해 UI 없이 테스트

## Rejected options

- **팔레트 전체(뉴트럴+상태색+다크) 유도** — 문제를 작게 잡아 깊이 파는 쪽 선택. 액센트에서 검증된 커브가 후속 트랙의 기반. _revisit: 액센트 트랙 종합 후._
- **콘트라스트 보장을 성공 기준에 포함** — 레퍼런스 재현력·눈·코퍼스 정합 3개로 충분; 콘트라스트는 Leonardo 서베이에서 메커니즘으로는 다룸. _revisit: 제품 편입 시 접근성 요구가 생기면._
- **데이터 피팅 우선 (서베이 생략)** — 기존 알고리즘들의 설계 근거를 배우는 것 자체가 목적의 일부. _revisit: 서베이 후 커브 피팅은 어차피 종합 단계에서 수행._
- **v1 커브 경험적 개선만** — 빠르지만 체계적 근거가 약함. _revisit: 없음 (서베이가 이를 포함)._
- **독립 미니 앱 / 정적 HTML 리포트 랩** — web/ 랩 라우트가 기존 컴포넌트 재활용 + 추후 제품 편입에 유리. _revisit: 랩이 web 빌드를 오염시키기 시작하면._
