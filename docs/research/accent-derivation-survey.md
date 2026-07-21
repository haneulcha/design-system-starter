# Accent Derivation Survey

_2026-07-21. 스펙: docs/superpowers/specs/2026-07-21-accent-scale-derivation-design.md.
이 트랙의 1급 산출물: 기존 제품들이 팔레트를 어떻게 설계했는지 공부한 기록.
각 대상의 설계 철학 + 메커니즘 + 우리에게 주는 시사점, 그리고
가이드드 빌더의 후보 생성기로 쓸 수 있는지 평가._

## Material HCT (tonal palette)
- **소스**: [material-foundation/material-color-utilities](https://github.com/material-foundation/material-color-utilities) (Apache-2.0). README + [`typescript/palettes/tonal_palette.ts`](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/palettes/tonal_palette.ts) (최근 수정 커밋 `998b611d8319d53d91409385160f64afa4726766`, 2025-05-26) + 철학 원문: [James O'Leary, "The science of color & design"](https://m3.material.io/blog/science-of-color-design) (Material Design 3 공식 블로그, WebFetch로 본문 확보).
- **설계 철학**: 블로그 원문 인용 — *"HSL isn't remotely accurate, and doesn't try to be: it was built to make computing colors fast on 1970s computers."* HSL의 "lightness" 50에서 실측 밝기가 33~96까지 벌어지는 문제를 지적한다. CIELAB(L\*a\*b\*)도 시도했으나 *"when we tried using it in design, L\*a\*b\* was too inconsistent perceptually"*라고 밝힘. 결론적으로 tone은 L\*a\*b\*에서, hue/chroma는 CAM16에서 가져와 접근성(콘트라스트)과 지각 균일성을 동시에 만족시키는 하이브리드 공간(HCT)을 새로 만들었다.
- **색공간**: HCT = CAM16의 Hue·Chroma + CIE L\*a\*b\*의 Tone(L\*). "지각적으로 정확하면서도 톤만으로 접근성 계산이 되는" 실용적 절충.
- **커브 형태**: `TonalPalette`는 hue·chroma를 고정하고 tone(0~100)만 바꿔 12+ 스텝을 뽑는 구조. `fromHueAndChroma`는 요청한 chroma가 sRGB gamut 안에서 실현 가능한 tone을 이진 탐색으로 찾는다(`KeyColor`, tone 50 부근에서 최대 chroma가 나오는 경향을 이용).
- **채도 처리**: chroma는 hue·tone에 따라 sRGB gamut 경계에 의해 자동으로 잘린다 — 즉 "요청한 chroma"와 "실제로 렌더링되는 chroma"가 tone 극단(0/100 근처)에서 달라질 수 있음을 라이브러리가 명시적으로 계산해서 알려준다. hue 회전은 없음(hue는 palette 생성 시점에 고정).
- **앵커 의미**: 입력 색(hex → HCT 변환)의 hue와 chroma를 그대로 palette의 고정값으로 쓴다. 입력의 tone(≈L)은 anchor 위치가 아니라 "이 색이 원래 어떤 tone이었는지"의 참고값일 뿐 — palette 자체는 tone 0~100 전 구간을 만들어내므로 입력 L을 스케일의 한 지점에 강제로 고정하지 않는다(오히려 v1보다 더 "입력 L 무시"에 가깝다. tone 사다리가 고정, chroma가 tone별로 달라짐).
- **스텝 의미 체계**: Material 3 dynamic color 시스템은 tonal palette 위에 별도 레이어(`MaterialDynamicColors`)로 role(surface, primary, onPrimary 등)을 배정한다. tonal palette 자체는 스텝-용도 배정이 없고, 순수하게 "hue·chroma 고정 + tone 자유"인 원재료 역할.
- **시사점**: (1) 색공간 선택 자체를 "왜"까지 검증한 사례 — 우리도 OKLCH를 쓰는 이유를 이런 식으로 명문화할 근거가 된다. (2) gamut clamping을 라이브러리가 이진 탐색으로 명시적으로 처리하는 방식은 우리 chroma 처리에 참고할 만하다. (3) tone 사다리 자체는 정성적 설계(디자이너가 고른 tone 세트)이지 데이터 피팅이 아니다 — v1의 고정 L 사다리와 철학적으로 유사한 접근.
- **후보 생성기 관점**: 노출 가능한 축은 (a) tone 스텝 구성(몇 개, 어느 tone에 배치할지), (b) chroma 상한(요청 chroma를 얼마나 낮출지 vs gamut 끝까지 밀어붙일지). hue 회전 축은 없음 — 이 알고리즘은 "hue 고정" 진영의 대표.
- **포팅/패키지 결정**: npm 패키지 `@material/material-color-utilities` 존재(현재 최신 0.4.0, 확인됨) → 포팅 대신 패키지 사용 권장(스펙의 npm-우선 원칙과 일치).

## Adobe Leonardo (contrast-colors)
- **소스**: [adobe/leonardo](https://github.com/adobe/leonardo) (Apache-2.0), `packages/contrast-colors` README (WebFetch로 확보) + Nate Baldwin(제작자)의 소개 글 [Medium: "Leonardo: an open source contrast-based color generator"](https://medium.com/@NateBaldwin/leonardo-an-open-source-contrast-based-color-generator-92d61b6521d2).
- **설계 철학**: Baldwin이 직접 밝힌 동기 — *"Wouldn't it be nice if we could just generate colors based on a desired contrast ratio?"* 기존 워크플로우(색을 먼저 고르고 나중에 콘트라스트를 검사)를 *"a tedious game of cat and mouse"*라 표현하며, 이를 뒤집어 콘트라스트 비율을 생성의 1급 입력으로 삼는다. 목표를 *"accessibility dynamic"*하게 만드는 것 — 정적 팔레트가 아니라 사용자별 콘트라스트 요구에 맞춰 색이 재계산되는 시스템.
- **색공간**: 기본은 CIE CAM02(Chroma.js 확장) 기반 보간이며, `colorspace` 파라미터로 LCH/LAB/CAM02/HSL/HSLuv/HSV/RGB 중 선택 가능. 스케일 정렬·보정에는 HSLuv 기반 lightness 보정 로직도 섞여 있음(README 명시).
- **커브 형태**: 라이트니스 사다리가 아니라 **콘트라스트 비율 배열**이 입력이다(`ratios: [1, 1.2, 1.8, ... 21]`). 각 목표 비율에 맞는 색을 배경색 대비로 역산해 스텝을 만든다.
- **채도 처리**: `colorKeys`로 지정한 실제 색(들)을 보간 앵커로 쓰고, 그 사이는 선택된 색공간에서 보간. `smooth` 옵션이 있으면 베지어로 곡선을 매끄럽게 만든다. hue 회전은 명시적 파라미터는 아니고, colorKeys를 여러 개 주면(예: 밝은 끝에 다른 hue의 키 색) 자연스럽게 hue가 섞여 들어가는 방식.
- **앵커 의미**: 입력 색은 "목표 콘트라스트를 만족하는 값들 중 하나"로 취급됨 — 정확히 그 hex가 스케일에 들어간다는 보장은 없다("입력보다 살짝 더 높은 비율이 나올 수 있다"고 README가 명시, RGB gamut 반올림 때문). 즉 앵커를 존중하되 "정확히 그 값"보다 "그 값 이상의 콘트라스트"를 우선시.
- **스텝 의미 체계**: 스텝 자체는 임의의 콘트라스트 비율 배열(디자이너가 정의) — Radix처럼 고정된 12-step 의미는 없다. 대신 "이 스텝은 최소 4.5:1을 보장한다" 같은 접근성 의미가 스텝 정의에 내재됨.
- **시사점**: 접근성을 사후 검증이 아니라 생성 파라미터로 삼는 철학은 우리 가이드드 빌더에서 "콘트라스트 프리뷰"를 실시간으로 붙일 근거가 된다(단, 스펙에서 콘트라스트 보장은 이번 트랙 성공 기준에서 제외했으므로 후속 트랙 후보로 기록).
- **후보 생성기 관점**: 노출 축 후보 — (a) 목표 콘트라스트 배열 자체(몇 단계, 어떤 값), (b) 보간 색공간(LCH/OKLCH/HSLuv 등 눈 평가 차이가 큼), (c) colorKeys 개수(1개=단순 보간, 2개 이상=hue 전환 포함).
- **포팅/패키지 결정**: npm 패키지 `@adobe/leonardo-contrast-colors` 존재(현재 최신 1.1.0, 확인됨) → 패키지 사용.

## Radix custom color (`generateRadixColors`)
- **소스**: [radix-ui/website](https://github.com/radix-ui/website) 저장소, 파일 `components/generate-radix-colors.tsx`. **정확한 커밋**: 이 파일을 마지막으로 수정한 커밋은 `88a9f14dbe36e7285d32df01e139b0ab2e1de574` (2026-06-15, "remove unused code"; `gh api repos/radix-ui/website/commits?path=...`로 확인). 저장소 HEAD(main)는 `bb424082fd33fadc244a6dd276d3ced55caa6234`, 이 커밋에서도 파일이 동일 경로에 존재함을 재확인(blob sha `d37526135fdcbbc22129f13618c4f2f7078fe579`). **라이선스**: 저장소 루트 `LICENSE` = MIT (Copyright (c) 2024 WorkOS) — 파일 헤더에 별도 고지 없음, 저장소 전체 라이선스가 적용됨. 알고리즘의 핵심 로직 절반은 같은 커밋의 `app/colors/custom/utils.ts`(`getScaleFromColor` 등)에 있으며 두 파일 모두 WebFetch/`gh api`로 원문을 직접 받아 확인했다. 공식 문서: [radix-ui.com/colors/docs](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale).
- **설계 철학**: 문서화된 "왜"는 별도 블로그 글로 없고, 코드 자체가 철학을 보여준다 — "이미 사람이 튜닝해둔 24개 Radix 스케일을 재사용하고, 입력 색은 그 중 가장 가까운 스케일(또는 두 스케일의 혼합)에 스냅한 뒤 입력의 실제 hue/chroma로 미세 보정한다." 즉 제로베이스 생성이 아니라 **기존 수작업 결과물을 보간 기반으로 재활용**하는 접근 — Tailwind처럼 손튜닝을 정면으로 인정하되, 그걸 알고리즘으로 감싸 "custom color 입력"에 대응한다.
- **색공간**: OKLCH (colorjs.io로 변환). 스케일 간 거리 비교는 `deltaEOK`(OKLab 기준 ΔE)로 계산.
- **커브 형태**: (1) 입력 색과 24개 Radix 스케일(gray류 6 + chromatic 18) 각각의 12 스텝을 OKLCH ΔE로 비교해 가장 가까운 스케일 A, B를 찾는다. (2) 삼각형 코사인법칙으로 A·B를 섞을 비율을 계산(각이 90°를 넘으면 안 섞고 A만 사용). (3) 섞은 스케일에서 입력과 가장 가까운 스텝을 골라 base로 삼고, `ratioC = source.chroma / base.chroma`로 전체 12스텝의 chroma를 비례 조정 + hue를 입력 hue로 통일. (4) lightness 사다리는 배경색(L)을 기준으로 `transposeProgressionStart` + Bezier easing(라이트 모드 `[0,2,0,2]`, 다크 모드 `[1,0,1,0]`)으로 "시작점 재배치"한다 — 고정 사다리가 아니라 배경 L에 따라 easing으로 늘어나거나 눌린다.
- **채도 처리**: `ratioC`로 전체 스케일의 chroma를 비례 스케일링하되 `Math.min(source.chroma * 1.5, ...)`로 상한을 둔다(입력보다 과도하게 채도가 튀지 않도록). step 9(solid)는 입력 색과의 ΔE가 25 미만이면(=배경과 거의 같은 흰/검) 대신 8번 스텝을 쓰는 예외 처리. step 11/12(텍스트)는 채도를 `min(max(step9.C, step7.C), 원래 C)`로 제한해 텍스트가 과채도로 튀지 않게 한다. hue는 스케일 전체를 입력 hue로 강제 통일(회전 없음, 고정).
- **앵커 의미**: 입력 색은 "스냅 대상"이지 그대로 스텝 9에 들어가지 않는다 — `getStep9Colors`가 입력과 배경의 ΔE가 25 미만이면 스텝 8을 대신 쓰고, 아니면 입력 색 자체를 스텝 9로 채택한다. 즉 **입력 L·H·C를 매우 존중**(스텝 9는 입력 그대로, 나머지는 입력에 맞춰 재보정)하면서도 lightness "사다리 형태"는 기존 스케일에서 빌려온다.
- **스텝 의미 체계**: [radix-ui.com/colors/docs](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) 공식 문서 기준 — **1-2 배경**(앱 배경, 카드 배경), **3-5 컴포넌트 배경**(3=기본, 4=hover, 5=눌림/선택), **6-8 보더**(6=비인터랙티브 subtle 보더, 7=인터랙티브 subtle 보더, 8=인터랙티브 강한 보더/포커스 링), **9-10 솔리드**(9=최고 채도, 배경·헤더·강조 보더용, 10=hover), **11-12 텍스트**(11=저대비 텍스트, 12=고대비 텍스트). 이 스텝-용도 배정은 우리 팔레트 slot 체계와 가장 직접적으로 비교할 대상.
- **시사점**: (1) "손튜닝 결과를 스냅+보정으로 재활용"은 새 알고리즘을 처음부터 만드는 것과 다른 제3의 길 — 우리 코퍼스(58개 시스템)를 스냅 타겟으로 쓰는 방식도 고려 가능. (2) easing 기반 lightness 재배치(배경 L에 따라 시작점을 옮기는 방식)는 v1의 고정 L 사다리보다 유연하다. (3) 12-step 의미 체계는 우리 slot 이름 재검토의 직접 참고 자료.
- **후보 생성기 관점**: 노출 축 후보 — (a) 스냅 대상 스케일 풀(24개 Radix 대신 우리 코퍼스로 교체 가능), (b) chroma ratio 상한(1.5배), (c) easing 곡선(라이트/다크 별도 Bezier 파라미터 4개).
- **포팅/패키지 결정**: npm 패키지 없음(웹사이트 전용 코드) → **포팅 필요**. 난이도 중간 — 로직 자체는 짧지만(두 파일 합쳐 ~300줄) `colorjs.io`(`deltaEOK`, `contrastAPCA`) 의존이 있어 동등한 culori 기반 구현으로 바꿔야 함. Task 8의 정확한 포팅 대상은 `components/generate-radix-colors.tsx` + `app/colors/custom/utils.ts`의 `getScaleFromColor`/`getStep9Colors`/`getButtonHoverColor`/`transposeProgressionStart` 함수들.

## Tailwind v4 (레퍼런스, 알고리즘 아님)
- **소스**: 알고리즘이 아니라 손튜닝 결과물. 실측: `web/node_modules/tailwindcss/theme.css` (설치 버전 4.2.2). 공식 설명: [Tailwind CSS v4.0 블로그](https://tailwindcss.com/blog/tailwindcss-v4) "Modernized P3 color palette" 섹션(WebFetch로 원문 확보).
- **설계 철학**: 공식 블로그 원문 인용 — *"We've upgraded the entire default color palette from rgb to oklch, taking advantage of the wider gamut to make the colors more vivid in places where we were previously limited by the sRGB color space."* 동시에 *"we've tried to keep the balance between all the colors the same as it was in v3"* — 즉 OKLCH 전환의 목적은 "새 팔레트 설계"가 아니라 "기존 v3 팔레트의 균형을 유지하면서 P3 gamut에서 더 선명하게" 재인코딩하는 것. 알고리즘적 재설계가 아니라 **색공간 업그레이드**에 가깝다.
- **색공간**: OKLCH. sRGB 대비 넓은 P3 gamut을 활용.
- **커브 형태**: 알고리즘 없음 — 색상군(hue family)별로 11개 스텝(50,100,200,...,900,950)의 L/C/H 값이 개별적으로 손튜닝되어 하드코딩됨. 실측 결과 chromatic 계열 17개(amber, blue, cyan, emerald, fuchsia, green, indigo, lime, orange, pink, purple, red, rose, sky, teal, violet, yellow) + neutral 계열 9개(gray, mauve, mist, neutral, olive, slate, stone, taupe, zinc), 계 26개 × 11 스텝. (참고: 브리프의 예상 "22 hue"와 실측이 다른데, 이는 버전 차이/그레이 포함 여부로 보이며 본 서베이는 실제 설치본 4.2.2 실측치를 기록한다.)
- **채도 처리**: 계열마다 스텝별 chroma가 손으로 다르게 튜닝되어 있음(예: red-50 C=0.013 → red-500 C=0.237 → red-950 C=0.092, 대칭이 아니라 중간에서 피크를 찍고 양끝에서 줄어드는 형태). hue도 스텝마다 미세하게 다름(red: 17.38°→25.331°→27.518°→26.042° — Refactoring UI가 말하는 "끝단에서 hue 회전" 기법과 결과적으로 유사한 패턴이 손튜닝에 이미 반영돼 있음).
- **앵커 의미**: 해당 없음(유도 알고리즘이 아니라 고정 테이블). "500" 근방이 관습적으로 브랜드/버튼 컬러로 쓰이는 앵커 역할을 함.
- **스텝 의미 체계**: 공식적으로 배정된 의미는 없음(유틸리티 클래스 자유 조합 철학). 커뮤니티 관습으로 500=기본, 600=hover, 700=active 정도가 흔히 쓰임.
- **시사점**: "손튜닝이지만 끝단에서 채도가 줄고 hue가 미세 회전"하는 패턴이 실측으로 확인됨 — 이는 Refactoring UI의 수동 기법과 Radix의 자동 chroma-ratio 처리 둘 다가 왜 그런 곡선을 만드는지에 대한 교차검증 데이터가 된다. 벤치마크 레퍼런스로 그대로 사용(정량 재현력 측정 대상).
- **후보 생성기 관점**: 알고리즘이 아니므로 파라미터 축은 없음 — 대신 "레퍼런스 팔레트"로서 ΔE 벤치마크의 타겟 데이터.
- **포팅/패키지 결정**: 해당 없음(참고 데이터로만 사용, `data/references/`에 고정 커밋/버전으로 스냅샷).

## v1 현행 (`src/generator/color.ts`)
- **소스**: `src/generator/color.ts:32-56` (`CHROMATIC_STEPS`, `buildChromaticScale`). 사내 코드, 별도 라이선스 없음.
- **설계 철학**: 문서화된 철학 없음 — v2(아키타입 팔레트) 이전의 v1 잔재. 고정된 L/cMult 표를 만든 사람의 의도는 코드에 남아있지 않아 사후 추정만 가능: "브랜드 hex 하나로 빠르게 그럴듯한 10단 스케일을 만든다"가 목적이었을 것으로 추정.
- **색공간**: OKLCH (culori).
- **커브 형태**: 스텝별 L이 고정 테이블(100=0.96 → 1000=0.14)로 하드코딩되어 있고, `brandAnchorL` config(기본 0.5, `DEFAULT_ANCHOR_L`=0.45)로 전체 사다리를 오프셋만큼 평행이동한다(`offset = anchorL - DEFAULT_ANCHOR_L`). **입력 색의 실제 L은 전혀 읽지 않는다** — 오직 hue와 chroma만 입력에서 가져온다.
- **채도 처리**: 스텝별 `cMult`(0.3~1.0, 700에서 피크) 배수를 입력 chroma에 곱한다. 곡선 형태는 중간(700)에서 최고, 양끝(100, 1000)에서 감소 — Tailwind 실측과 정성적으로 비슷한 모양이지만 계열별 튜닝 없이 모든 hue에 같은 배수 테이블을 적용한다는 차이가 있다. hue 회전 없음(hue는 스텝 전체에서 고정).
- **앵커 의미**: 입력 L은 무시되고, H·C만 존중된다. 앵커 위치(어느 스텝이 "입력 색 그대로"인지)라는 개념 자체가 없음 — 모든 스텝이 고정 L 사다리 + 배수로 재계산된 값이라 입력 hex와 정확히 일치하는 스텝이 보장되지 않는다.
- **스텝 의미 체계**: 없음(100~1000 숫자 스텝, 용도 미배정).
- **시사점**: 이 트랙이 풀어야 할 핵심 문제 정의 그 자체 — "입력 L을 무시"하는 것이 앵커 존중 실패로 이어지는지, 다른 알고리즘(Radix, Leonardo)이 입력을 어떻게 다루는지와 대조되는 베이스라인.
- **후보 생성기 관점**: 해당 없음 — 베이스라인/회귀 방지용.
- **포팅/패키지 결정**: 해당 없음(이미 사내 코드, 벤치마크의 baseline 알고리즘으로 그대로 사용).

## Refactoring UI 수동 방법론 (가이드드 빌더의 원형)
- **소스**: Adam Wathan & Steve Schoger, *Refactoring UI* (2018, 유료 서적, 전문 원문은 직접 fetch 불가 — 유료 콘텐츠). 공식 프리뷰: [refactoringui.com/previews/building-your-color-palette](https://refactoringui.com/previews/building-your-color-palette)(WebFetch로 확보, 발췌본). 교차검증한 2차 요약: [sglavoie.com 북 서머리](https://www.sglavoie.com/posts/2023/09/09/book-summary-refactoring-ui/), 커뮤니티 검색 결과(WebSearch, 여러 출처 합치)에서 "hue 20-30도 회전" 기법이 일관되게 인용됨. **주의**: 책 원문 전체를 직접 확인하지 못했으므로 아래 내용은 공식 프리뷰 발췌 + 다수 2차 요약의 일치를 근거로 한다(원문 구매 필요 시 재검증).
- **설계 철학**: "수학만으로는 완벽한 팔레트를 만들 수 없다"는 것이 핵심 주장 — 원문 인용: *"As tempting as it is, you can't rely purely on math to craft the perfect color palette."* 시스템적 방법은 출발점일 뿐, 최종 판단은 눈으로 한다: *"every color behaves a bit differently, so you'll have to rely on your eyes for this one."*
- **색공간**: HSL 기준 설명(2018년 책이라 OKLCH 이전) — hue/saturation/lightness를 손으로 직접 조정.
- **커브 형태**: 사다리를 채우는 게 아니라 **순서대로 사람이 판단해서 채워나가는 절차**: (1) 중간(버튼 배경으로 쓸만한) 색 하나를 base로 고른다. (2) 가장 밝은 값(배경용)과 가장 어두운 값(텍스트용) 두 끝을 정한다. (3) 9단계가 나누기 좋은 숫자라며, 700/300 → 800/600/400/200 순으로 "이웃과 이웃 사이의 절반"을 채워나간다(baseline이 500/900이 아니라 중간부터 확장하는 방식).
- **채도 처리**: 밝은 쪽으로 갈수록, 어두운 쪽으로 갈수록 hue를 인접한 밝은/어두운 hue 쪽으로 20~30° 회전시켜 채도감을 유지하는 요령(예: 보라색을 어둡게 하려면 파랑 쪽으로, 밝게 하려면 분홍 쪽으로 회전). 동시에 "50% lightness에서 멀어질수록 saturation을 올려야 안 바래 보인다"는 HSL 특성도 별도로 언급됨. 목적은 콘트라스트를 라이트니스만으로 억지로 맞추는 대신 hue 회전으로 "팝"하게 만드는 것.
- **앵커 의미**: 입력(base) 색을 매우 존중 — 그 자체가 스케일의 중심(500 근방)이 되고, 나머지는 그 색을 기준으로 사람이 판단하며 채워나간다. 알고리즘이 아니므로 "입력 L을 무시"하는 문제 자체가 없음.
- **스텝 의미 체계**: 명시적 스텝 번호 의미 배정은 없지만, "가장 밝은 값=배경용, 가장 어두운 값=텍스트용"이라는 용도 중심 사고가 이미 들어있음 — Radix의 1-2/11-12 배정과 철학적으로 같은 방향.
- **시사점**: 이 방법론 자체가 가이드드 빌더의 원형이다 — "중심 → 양끝 → 중간을 절반씩" 순서, 그리고 각 자리에서 "후보를 보여주고 고르게 하는" 상호작용 설계의 근거. 확정된 하나의 수식이 아니라 **판단 지점(decision point)들의 목록**이라는 게 다른 5개 알고리즘과 본질적으로 다른 점.
- **후보 생성기 관점**: 이 방법론 자체가 "후보 생성기가 필요한 각 지점"의 목록이다: (a) base color 선택 지점, (b) 밝은/어두운 끝 선택 지점(hue 회전 방향·각도가 후보 축), (c) 중간 채우기 지점(절반 지점 후보들). 알고리즘들은 이 판단들 중 일부를 자동화한 것으로 재해석 가능(아래 대응표).
- **포팅/패키지 결정**: 해당 없음(방법론이지 코드가 아님). 가이드드 빌더 UI/UX 설계의 참고 자료로 별도 트랙(빌더 스펙)에서 소비.

---

## 비교 표

| 대상 | 색공간 | 앵커 존중 | 스텝 의미 체계 | 노출 가능 파라미터 수(대략) |
| --- | --- | --- | --- | --- |
| Material HCT | HCT(CAM16 H·C + L\*a\*b\* Tone) | H·C만 존중, tone은 사다리 전체 재생성 | 없음(tonal palette는 role 배정 이전 원재료) | 2 (tone 스텝 구성, chroma 상한) |
| Adobe Leonardo | 선택 가능(LCH/LAB/CAM02/HSL/HSLuv/HSV/RGB, 기본 CAM02) | 콘트라스트 비율 존중(정확한 hex는 근사) | 없음(콘트라스트 배열은 자유 정의) | 3 (목표 비율 배열, 보간 색공간, colorKeys 수) |
| Radix custom color | OKLCH | H·C·L 모두 강하게 존중(스텝 9=입력 그대로) | 있음 — 1-2 배경/3-5 컴포넌트/6-8 보더/9-10 솔리드/11-12 텍스트 | 3 (스냅 대상 풀, chroma ratio 상한, easing 곡선) |
| Tailwind v4 | OKLCH (손튜닝) | 해당 없음(알고리즘 아님) | 없음(관습적 500=기본) | 0 (레퍼런스 데이터) |
| v1 현행 | OKLCH | H·C만 존중, L 완전 무시 | 없음 | 0 (베이스라인) |
| Refactoring UI (수동) | HSL (원문 기준) | 완전 존중(사람이 base로 삼음) | 암묵적(밝은 끝=배경, 어두운 끝=텍스트) | 해당 없음(방법론, 판단 지점 3개) |

## Refactoring UI 수동 단계 ↔ 알고리즘 대응표

| 수동 단계 | 하는 일 | 자동화한 알고리즘 | 대응 방식 |
| --- | --- | --- | --- |
| ① base color 선택 | 버튼 배경으로 쓸만한 중간 색 하나를 고른다 | 모든 알고리즘 | 입력 hex 자체가 base — 다만 Radix만 이 색을 스텝 9에 그대로 보존, 나머지는 재계산된 값으로 대체 |
| ② 밝은/어두운 끝 정하기 | 배경용 최밝, 텍스트용 최암 색을 판단 | Material HCT(tone 0/100 근방), v1(고정 L 100/1000), Tailwind(손튜닝 50/950) | 사람의 "이 정도면 배경/텍스트로 쓸만하다"는 판단을 고정 tone/L 값으로 미리 확정 — 어떤 입력이 와도 같은 tone을 쓴다는 점에서 사람의 매번-판단을 규칙으로 대체 |
| ③ 사이를 절반씩 채우기(700/300 → 800/600/400/200) | 이웃과 이웃의 중간을 시각적으로 판단 | Material HCT(tone 간격을 사전에 고정), Radix(easing 곡선으로 배경 L 기준 재배치) | 이진 분할적 사고를 "사전에 정한 tone 세트" 또는 "이징 함수"로 대체 — 매번 눈으로 절반을 찾는 대신 수식이 절반 지점을 계산 |
| ④ 끝단에서 hue 회전(20~30°)으로 채도감 유지 | 밝거나 어두운 값이 밋밋해 보이지 않게 hue를 이웃 hue 쪽으로 살짝 튼다 | **자동화한 알고리즘 없음** — Radix·HCT·Leonardo 모두 스케일 전체에서 hue를 고정한다(v1도 마찬가지) | 이 트랙에서 가장 뚜렷한 공백. Tailwind 실측 데이터(red 계열 hue가 17°→27°→26°로 스텝마다 미세하게 다름)는 손튜닝이 실제로 이 기법을 써왔다는 간접 증거 — 알고리즘화되지 않은 채 남아있는 "사람만 하는 일" |
| ⑤ 50%에서 멀어질수록 채도 올리기(HSL 특성 보정) | 극단으로 갈수록 색이 바래 보이는 것을 saturation으로 보정 | Material HCT(gamut 경계까지 chroma 유지), Radix(chroma ratio 비례 조정 + 상한) | HSL의 결함(lightness가 saturation을 죽이는 문제)을 OKLCH/HCT 같은 지각균일 색공간으로 아예 회피 — "채도를 올려서 보정"이 아니라 "애초에 안 죽는 색공간을 쓴다"는 다른 해법으로 대체됨 |

## 이 조사에서 배운 것

1. **"입력 L 무시"는 v1만의 문제가 아니라 스펙트럼의 한쪽 끝이다.** Material HCT도 tone 사다리를 고정하고 H·C만 입력에서 가져온다는 점에서 v1과 원리적으로 같은 편에 있다. 오직 Radix만 입력의 L을 스텝 9(또는 8)에 그대로 보존한다는 점에서 확실히 다르다. "앵커를 얼마나 존중할 것인가"는 이분법이 아니라 정도의 문제이며, 우리 가이드드 빌더는 이 축을 사용자에게 노출할 여지가 있다(예: "브랜드 색을 정확히 유지" vs "스케일 일관성을 우선").
2. **Refactoring UI의 hue-회전 기법은 6개 대상 중 유일하게 어떤 알고리즘도 자동화하지 못한 부분이다.** Radix·HCT·Leonardo·v1 모두 스케일 전체에서 hue를 고정한다. 그런데 Tailwind의 실측 데이터(red-50 h=17.38° → red-500 h=25.331° → red-950 h=26.042°)는 손튜닝 결과에 이 기법이 실제로 녹아 있음을 보여준다 — 즉 **가장 잘 튜닝된 레퍼런스 팔레트와 알고리즘들 사이에 아직 메워지지 않은 간극**이 있다는 뜻이고, 이는 이 트랙의 벤치마크에서 ΔE 차이로 드러날 가능성이 높은 지점이자, "우리 곡선"을 설계할 때 시도해볼 만한 차별점이다.
3. **콘트라스트-우선(Leonardo) vs 색공간-우선(HCT) vs 재활용-우선(Radix) vs 손튜닝(Tailwind)은 서로 다른 "1급 입력"을 선택한 결과다.** 무엇을 1급 입력으로 삼을지가 나머지 설계를 전부 결정한다 — 우리가 "우리 곡선"을 설계할 때도 가장 먼저 답해야 할 질문은 커브 수식이 아니라 "무엇을 존중할 것인가"(입력 L? 콘트라스트? 기존 코퍼스와의 정합성?)이다.
4. **스텝 의미 체계가 있는 것은 6개 중 Radix뿐이다.** 나머지는 전부 "숫자 스텝 + 관습적 쓰임"에 머문다. 우리 slot 체계를 재검토할 때 Radix의 1-2/3-5/6-8/9-10/11-12 배정이 가장 직접적인 비교 대상이며, 특히 "9=최고 채도, 10=9의 hover"라는 아이디어(하나의 스텝이 아니라 페어로 상태를 표현)는 우리 컴포넌트 카테고리(hover/pressed 상태)와 맞닿아 있다.
5. **후보 생성기 관점에서 변주 축이 가장 풍부한 것은 Radix(스냅 풀·chroma ratio·easing 3축)와 Leonardo(비율 배열·색공간·colorKeys 3축)다.** HCT와 v1은 축이 적어(2축, 0축) 가이드드 빌더의 "후보를 여러 개 보여주기"에는 상대적으로 빈약하다 — 벤치마크 이후 "우리 곡선"에 이식할 때 Radix/Leonardo 쪽 축을 우선 검토할 가치가 있다.
6. **책(Refactoring UI) 원문은 유료라 전체를 직접 확인하지 못했다.** 공식 프리뷰 페이지(발췌)와 다수의 독립적인 2차 요약(sglavoie, dev.to, howtoes.blog 등)이 hue-회전(20~30°)과 채도 보정 내용에서 일관되게 일치해 신뢰도는 높다고 판단했으나, 정확한 문구나 예시가 필요해지면 원서 구매 후 재검증이 필요하다.
