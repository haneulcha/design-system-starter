# design-system-starter

"디자인을 시작하는 데 필요한 최소가 무엇인가"에 대한 답을 코드로 내포한 스타터.
knob 몇 개로 4개 산출물(DESIGN.md / design-tokens.css / tailwind.config.js / figma-system.json)을 얻는다.

**판단 기준은 `docs/IDENTITY.md`다.** 방향이 애매하면 거기 결정 규칙으로 돌아간다.
새 카테고리(spacing/radius/elevation 등) 작업 전에는 `docs/research/_category-analysis-playbook.md`를 읽는다.

## 구조

| | |
| --- | --- |
| `src/schema/` | 카테고리 v1 상수 — 이 프로젝트의 "답" |
| `src/generator/` · `src/color/` · `src/export/` | 엔진과 산출 |
| `web/` | 데모·도구 앱 (`/color-palette`, `#builder`, `#lab`) |
| `docs/superpowers/specs/` · `plans/` | 사이클별 설계·계획. 결정의 근거가 여기 있다 |
| `docs/architecture/token-architecture.md` | 토큰 레이어 구조 |

**`web/`은 pnpm 워크스페이스 멤버가 아니다** — 자체 `package-lock.json`을 쓰는 별도 npm 프로젝트다
(`pnpm-workspace.yaml`에 `packages:` 키가 없다). **설치는 루트가 `pnpm install`, `web/`이 `npm ci`**이고
CI도 그렇게 한다 — `web/`에서 `pnpm install`을 돌리면 락파일이 갈라진다. 이 경계를 넘는 스크립트
(루트 `predev`가 `web/`을 부르는 식)는 두 패키지를 얽히게 만든다.

## 명령

```bash
pnpm test                      # 루트 엔진 스위트
cd web && pnpm test            # 웹 스위트
cd web && npx tsc -b           # 웹 타입체크 (vitest는 타입체크를 안 한다)
cd web && pnpm dev --port 5199 # http://localhost:5199/design-system-starter/
```

`base`가 dev에도 걸려 있다 — 주소에 `/design-system-starter/`가 붙는 게 정상이다.

## 하드 규칙

- **주석은 한국어로 *왜*를 쓴다.** *무엇*은 코드가 말한다. 스키마 상수와 비관례적 선택에는
  계보(왜 이 값인가)가 있어야 한다.
- **판단을 바꾸면 근거를 기록한다** (IDENTITY 결정 규칙 2). 기존 스펙이 근거를 남기고 정한 것을
  뒤집을 때는 **뒤집는다는 사실 자체를 명시**하고, 무엇을 어디까지 뒤집는지 경계를 긋는다.
  옛 판단이 선언된 자리(코드 주석 포함)도 같이 고친다.
- **스펙·계획이 코드를 인용할 때 `file.ts:NN`이 아니라 심볼명을 쓴다.** 같은 브랜치가 그 줄을
  움직인다. 라인 번호를 단다면 그 내용을 실제로 열어 확인한 것만 단다 — 검증 안 한 인용은
  신뢰의 표지처럼 읽혀서 스펙 → 브리프 → 코드 주석으로 무손실 전파된다.
- **로직과 렌더를 분리하고 함수형으로 쓴다.** 계산은 순수 함수로 빼고 컴포넌트는 그리기만 한다.
- **UI 작업은 엔진을 건드리지 않는다** — `src/color/`, `src/export/`,
  `web/src/color-palette/paletteState.ts`, `paletteUrl.ts`는 별도 사이클의 영역이다.
- **폰트·본문 작업은 CJK 커버리지를 기본으로 포함한다** (한국어·글로벌 양쪽이 대상이다).

## 브라우저로 확인할 때

결과가 예상과 다르면 "기능이 깨졌다"로 넘어가기 전에 셋을 먼저 본다. 셋 다 최근 사이클에서
오진으로 이어졌다.

1. **같은 요소의 다른 클래스가 이기는지.** 새 클래스를 *덧붙여* 확인하면 같은 특이도에서
   소스 순서상 뒤엣것이 이긴다. 검증할 때는 경쟁 클래스를 떼고 **교체**한다.
2. **`@layer` 안을 보고 있는지.** Tailwind 유틸리티는 `@layer utilities` 안에 있어서
   `sheet.cssRules[].selectorText` 평면 순회는 *모든* 유틸리티에 대해 0건을 낸다.
3. **뷰포트가 의도한 크기인지.** chrome-devtools `resize_page`는 물리 디스플레이에 막힌다.
   진짜 크기는 `emulate`의 viewport override로만 얻는다 — 재기 전에 `window.innerHeight`를 확인한다.

축소된 전체 스크린샷의 *인상*을 확증으로 쓰지 않는다. 보고할 때 인상과 측정을 구분해 적는다.
