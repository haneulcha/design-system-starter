# Token Architecture — Design System Starter

> IBM Carbon, Vercel Geist, Stripe 3개 시스템 분석에서 도출된 수렴 아키텍처.

## Core Principle

**토큰이 시스템의 유일한 single source of truth.** 모든 값은 토큰에서 온다. 디자인에 필요한 값이 스케일에 없으면, 디자인을 스케일에 맞춘다.

---

## 3-Layer Architecture

### Layer 1: Primitive

원시 팔레트. 의미 없는 순수 값. hue별 10-step 스케일.

```
{hue}/{step}: { light: hex, dark: hex }

gray/100 ~ gray/1000    (neutral)
blue/100 ~ blue/1000    (brand — hue 자동 감지)
orange/100 ~ orange/1000 (accent — brand + 150°)
red/100 ~ red/1000      (error)
amber/100 ~ amber/1000  (warning)
green/100 ~ green/1000  (success)
```

**Step 규칙 (모든 hue에 일관 적용):**

| Steps | 역할 | 용도 |
|---|---|---|
| 100-300 | Component backgrounds | default(100) → hover(200) → active(300) |
| 400-600 | Borders | subtle(300) → default(400) → strong(600) |
| 700-800 | High contrast | brand primary(700), brand hover(800) |
| 900-1000 | Text/icons | secondary(900) → primary(1000) |

**Dark mode:** 스케일 반전. step 100 = 가장 어두운 값, step 1000 = 가장 밝은 값. Primitive가 mode를 소유하므로 상위 레이어는 mode 분기가 필요 없음.

### Layer 2: Semantic

역할 기반 별칭. 모든 값은 `"{hue}-{step}"` 형태의 primitive 참조.

```
bg/base         → gray-100       (배경)
bg/subtle       → gray-200       (카드, 패널)
bg/muted        → gray-300       (비활성 배경)
text/primary    → gray-1000      (주요 텍스트)
text/secondary  → gray-900       (보조 텍스트)
text/muted      → gray-700       (약한 텍스트)
text/disabled   → gray-500       (비활성 텍스트)
border/subtle   → gray-300
border/default  → gray-400
border/strong   → gray-600
brand/primary   → {brand}-700    (CTA, 링크)
brand/secondary → {brand}-800    (hover)
brand/subtle    → {brand}-200    (뱃지 배경)
brand/muted     → {brand}-100    (선택 상태 배경)
status/success       → green-700
status/success-subtle → green-200
status/error         → red-700
status/error-subtle  → red-200
status/warning       → amber-700
status/warning-subtle → amber-200
status/info          → blue-700
status/info-subtle   → blue-200
```

**Mode 분기 없음.** `bg/base → gray-100`은 light에서 near-white, dark에서 near-black으로 자동 전환.

### Layer 3: Component

컴포넌트 스코프. semantic만 참조. 상태별 세분화.

```
button/primary/bg          → brand/primary
button/primary/bgHover     → brand/secondary
button/primary/bgDisabled  → bg/muted
button/primary/text        → white
button/secondary/bg        → bg/subtle
button/ghost/text          → brand/primary
button/ghost/border        → border/default
input/border               → border/default
input/borderFocus          → brand/primary
input/borderError          → status/error
badge/success/bg           → status/success-subtle
badge/success/text         → status/success
...
```

---

## State Pattern (3개 시스템 수렴)

모든 interactive element에서 동일한 규칙:

| State | 패턴 | 예시 |
|---|---|---|
| **Default** | step 700 (brand) 또는 step 100 (gray) | `brand/primary` |
| **Hover** | 한 step 어둡게 | `brand/secondary` (step 800) |
| **Active** | hover와 동일 또는 한 step 더 | `brand/secondary` |
| **Disabled** | gray + opacity | `bg/muted` + `text/disabled` |
| **Focus** | 2px solid brand color | `brand/primary` outline |

---

## Spacing

8px base, 10단계:

```
3xs=2, 2xs=4, xs=8, sm=12, md=16, lg=24, xl=32, 2xl=48, 3xl=64, 4xl=80
```

컴포넌트는 토큰 이름으로만 참조 (`spacing.xl`, 절대 `32px` 아님).

---

## Typography

3 weight 제한: heading / UI / body.

```
clean-minimal:   600 / 500 / 400
warm-friendly:   500 / 500 / 400
bold-energetic:  700 / 600 / 400
professional:    300 / 400 / 300
playful-creative: 600 / 500 / 400
```

---

## Sources

| System | 기여 |
|---|---|
| **IBM Carbon** | 3-layer 구조, `--cds-*` semantic naming, 상태별 step 규칙 |
| **Vercel Geist** | Scale-based primitives (`--ds-gray-*`), shadow-as-border 혁신 |
| **Stripe** | Blue-tinted shadow, 계층적 naming (`--hds-color-*`), 300 weight 시그니처 |
