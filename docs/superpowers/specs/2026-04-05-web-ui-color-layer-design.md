# Web UI Color Conversion Layer

## Goal
Web UI의 컬러 렌더링을 Oklch 기반으로 갱신하고, 변환 경계를 명확히 한다.

## Architecture
Primitive tokens는 Oklch를 유지한다. Web UI에 변환 유틸리티를 두고, `style={}` 직전에서 oklch CSS 문자열로 변환한다.

```
Primitive (Oklch)
    ↓
resolveOklch(tokens, key)              →  Oklch | null
    ↓
formatOklch(color)                     →  "oklch(0.36 0.18 250)"
formatOklchAlpha(color, 0.1)           →  "oklch(0.36 0.18 250 / 0.1)"
    ↓
style={{ backgroundColor: ... }}
```

hex가 필요한 곳(`<input type="color">`, elevation shadow)은 이미 `oklchToHex()`로 처리되어 있다.

## Changes

### 1. `src/generator/color.ts` — `formatOklchAlpha` 추가

```ts
export const formatOklchAlpha = (color: Oklch, alpha: number): string =>
  `oklch(${round(color.l, 4)} ${round(color.c, 4)} ${round(color.h, 2)} / ${round(alpha, 3)})`;
```

Badge의 hex alpha 패턴(`${color}18`)을 oklch 네이티브 alpha로 대체하기 위함.

### 2. `web/src/result/ComponentPreview.tsx` — 변환 레이어 적용

`resolveColor`를 2단계로 분리:

```ts
import { formatOklch, formatOklchAlpha } from "@core/generator/color.js";
import type { Oklch } from "@core/schema/types.js";

function resolveOklch(tokens: DesignTokens, semanticKey: string): Oklch | null {
  const ref = tokens.semantic[semanticKey];
  if (!ref) return null;
  const lastDash = ref.lastIndexOf("-");
  const hue = ref.slice(0, lastDash);
  const step = ref.slice(lastDash + 1);
  return tokens.primitive.colors[hue]?.[step]?.light ?? null;
}

function resolveColor(tokens: DesignTokens, key: string): string {
  const color = resolveOklch(tokens, key);
  return color ? formatOklch(color) : "oklch(0.8 0 0)";
}

function resolveColorAlpha(tokens: DesignTokens, key: string, alpha: number): string {
  const color = resolveOklch(tokens, key);
  return color ? formatOklchAlpha(color, alpha) : "oklch(0.8 0 0)";
}
```

Badge alpha 변환 (hex → oklch alpha):
- `${successColor}18` (0x18/0xFF ≈ 0.094) → `resolveColorAlpha(tokens, "status/success", 0.09)`
- `${successColor}40` (0x40/0xFF ≈ 0.251) → `resolveColorAlpha(tokens, "status/success", 0.25)`

White text `"#ffffff"` → `"oklch(1 0 0)"` 또는 `"white"` (CSS keyword).

`resolveComponentColor`도 동일하게 `formatOklch`를 거치도록 변경.

### 3. `web/src/result/ResultPage.tsx` — Color Character 셀렉터 제거

107-135줄의 Color Character 셀렉터(vivid/balanced/muted) 삭제. `ColorCharacter` import 제거.
`WizardState`에서 이미 제거되었으므로 dead code.

### 4. 변경하지 않는 파일

- `StepArchetype.tsx` — `brandColor`를 App.tsx에서 hex로 받으므로 `brandColor + "18"` 정상
- `StepColor.tsx` — 이미 `formatOklch` 적용 완료
- `ColorPreview.tsx` — 이미 `formatOklch` 적용 완료

## Fallback 정책

`resolveColor`의 fallback을 `"#cccccc"` (hex)에서 `"oklch(0.8 0 0)"` (oklch neutral gray)로 변경.
이유: 시스템 전체의 CSS 출력이 oklch이므로 fallback도 일관되게 oklch.

## Test Plan

- `npx vitest run` — 기존 테스트 전체 통과 확인
- `npm run dev` (web/) — 브라우저에서 컬러 스케일, 컴포넌트 프리뷰, 뱃지 렌더링 시각 확인
- `npx tsc --noEmit` — 타입 에러 없음
