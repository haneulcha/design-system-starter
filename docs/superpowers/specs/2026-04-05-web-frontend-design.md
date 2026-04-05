# Web Frontend — Design Spec

## Overview

Design system starter의 웹 프론트엔드. 3-step 위저드로 입력을 받고, 실시간 프리뷰와 수정이 가능한 결과 페이지에서 파일을 다운로드한다.

## Decisions

| 항목 | 결정 |
|---|---|
| 배포 형태 | Static SPA (GitHub Pages / Netlify) |
| 프레임워크 | React + Vite |
| 사용 흐름 | 3-step 위저드 → 결과 페이지 (프리뷰 + 수정 + 다운로드) |
| 프리뷰 | 각 스텝마다 progressive preview |
| Generator | `../src/generator`를 직접 import (브라우저 호환) |

---

## Structure

```
design-system-starter/
├── src/                    # generator core (변경 없음)
│   ├── schema/
│   ├── generator/
│   └── figma/
└── web/                    # React + Vite SPA
    ├── index.html
    ├── vite.config.ts
    ├── package.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── steps/
        │   ├── StepColor.tsx
        │   ├── StepArchetype.tsx
        │   └── StepFont.tsx
        ├── result/
        │   ├── ResultPage.tsx
        │   ├── ColorPreview.tsx
        │   ├── TypePreview.tsx
        │   ├── ComponentPreview.tsx
        │   └── DownloadPanel.tsx
        ├── hooks/
        │   └── useGenerator.ts
        └── styles/
            └── global.css
```

---

## Wizard (3 Steps)

### Step 1: Primary Color
- Color picker (native `<input type="color">`) + hex text input
- Default: `#5e6ad2`
- **Preview**: 선택 즉시 6개 hue × 10-step 컬러 스케일 표시
  - `generateScales(hex, "neutral")` 호출
  - 각 hue를 가로 스트립으로 렌더 (100→1000, light mode)

### Step 2: Archetype
- 4개 카드: Precise, Confident, Expressive, Modern
- 각 카드에: 대표 제품명, 한 줄 설명, 버튼 모양 미니 프리뷰 (실제 radius 적용)
- **Preview**: 선택한 아키타입 + Step 1 컬러 → 버튼 3종 + 카드 + 인풋 미니 컴포넌트 표시
  - 아키타입에서 radius, shadow, weight 값을 적용한 실제 렌더

### Step 3: Font
- 아키타입별 `suggestedFonts` 4개 라디오 + "Custom" 텍스트 입력
- Google Fonts CDN으로 동적 로드
- **Preview**: 선택한 폰트로 14개 타이포그래피 스펙 specimen 렌더
  - Display Hero ~ Mono Caption 실제 크기/weight/letter-spacing

### Navigation
- 상단 progress bar (3 dots/steps)
- Back/Next 버튼
- Step 3에서 "Generate" 버튼 → 결과 페이지

---

## Result Page

### Layout
- **Left sidebar (320px)**: Controls + Download
- **Right main**: Preview (scrollable)
- **Mobile**: sidebar collapses to top, preview stacks below

### Controls (sidebar)
- Color picker (pre-filled from wizard)
- Archetype selector (4 radio cards, compact)
- Font selector (dropdown + custom)
- Brand name text input (여기서만 입력, 다운로드 파일명에 반영)
- 아무 값 변경 → 오른쪽 preview 즉시 갱신

### Preview (main)
세 섹션:

**1. Color Scales**
- 6개 hue × 10 steps 스워치 그리드
- 각 스워치: hover 시 hex 표시
- Foundations 페이지와 동일한 레이아웃

**2. Components**
- 실제 토큰 값이 CSS로 적용된 라이브 컴포넌트:
  - Button: 3 variants (Primary/Secondary/Ghost) × md size
  - Input: 4 states (Default/Focus/Error/Disabled)
  - Card: default variant (with placeholder image area)
  - Badge: 5 color variants (default/success/error/warning/info)
  - Divider: with label variant
- 모든 색상/radius/shadow/spacing이 생성된 토큰에서 CSS custom properties로 주입

**3. Typography**
- 14개 type style specimen
- 각 줄: role name + "The quick brown fox" + size/weight info

### Download (sidebar 하단)
4개 버튼:
- **DESIGN.md** — `renderDesignMd(system)` 결과를 Blob으로 다운로드
- **design-tokens.json** — `buildDesignTokens()` 결과
- **tokens/ (zip)** — primitive.ts + semantic.ts + component.ts + index.ts를 zip
- **figma-system.json** — `transformToFigma(tokens)` 결과

ZIP 생성: JSZip 라이브러리 (브라우저용, 가벼움)

---

## Data Flow

```
UserInputs (color, archetype, font)
    ↓
useGenerator hook (React state)
    ↓ calls on every input change:
    ├── generateScales(color, undertone) → ColorScales
    ├── generateComponents(archetype) → ComponentSpecs  
    ├── generateTypography(archetype, font) → TypographySystem
    ├── generate(inputs) → { system, designMd, tokens, tokenFiles }
    └── transformToFigma(tokens) → FigmaDesignSystem
    ↓
Preview components read from generated data
Download buttons serialize to files
```

`useGenerator` hook은 `useMemo`로 입력이 바뀔 때만 재계산. `generate()` 는 순수 함수이므로 부작용 없음.

---

## Styling

- **CSS**: Tailwind CSS (Vite plugin)
- **Theme**: 생성된 디자인 시스템의 토큰을 CSS custom properties로 주입하여 결과 페이지 자체가 생성된 시스템을 사용
  ```css
  :root {
    --preview-brand-700: var(generated);
    --preview-gray-100: var(generated);
    ...
  }
  ```
- **UI chrome** (위저드 프레임, 사이드바): 중립적인 gray로 — 생성된 디자인과 구분

---

## Dependencies

```json
{
  "dependencies": {
    "react": "^19",
    "react-dom": "^19",
    "culori": "^4.0.0",
    "jszip": "^3.10.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4",
    "vite": "^6",
    "tailwindcss": "^4",
    "typescript": "^5.7"
  }
}
```

`culori`는 generator core의 의존성이므로 공유.

---

## Vite Config

```ts
// web/vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "../src"),
    },
  },
});
```

`@core/generator`, `@core/schema` 로 import.

---

## Scope Out (v1에서 제외)

- Dark mode toggle (preview는 light만)
- 다크모드 프리뷰 전환
- 공유 URL (query string으로 설정 공유)
- 서버 사이드 생성
- 사용자 계정/저장
