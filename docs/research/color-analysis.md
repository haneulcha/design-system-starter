# Color Analysis — 10개 프로덕션 디자인 시스템 oklch 분석

## 방법론

Vercel, Stripe, IBM, Linear, Airbnb, Supabase, Resend, Notion, Spotify, Figma의 DESIGN.md에서 모든 hex 컬러를 추출하고 oklch 색공간으로 변환하여 chroma(채도) 특성을 분석했다.

oklch의 세 축:
- **L** (lightness): 0=검정, 1=흰색
- **C** (chroma): 0=무채색, 높을수록 선명
- **H** (hue): 색상각 (0-360)

---

## Brand Primary Color Chroma

각 시스템의 메인 브랜드 컬러가 가진 채도(chroma) 수준.

| Company | Color | Hex | L | C | H | 특성 |
|---|---|---|---|---|---|---|
| Stripe | Purple | #533afd | 0.521 | **0.268** | 277 | 가장 높은 채도 — 강렬하고 확신적 |
| IBM | Blue 60 | #0f62fe | 0.557 | **0.243** | 262 | 높은 채도 — 명확하고 기능적 |
| Airbnb | Rausch | #ff385c | 0.658 | **0.231** | 17 | 높은 채도 — 따뜻하고 에너지 |
| Resend | Orange | #ff5900 | 0.680 | 0.214 | 40 | 중상 — 대담 |
| Spotify | Green | #1ed760 | 0.770 | 0.212 | 149 | 중상 — 밝고 경쾌 |
| Linear | Violet | #7170ff | 0.623 | 0.207 | 279 | 중간 — 균형적 |
| Vercel | Dev Blue | #0a72ef | 0.575 | 0.206 | 258 | 중간 |
| Vercel | Ship Red | #ff5b4f | 0.688 | 0.201 | 28 | 중간 |
| Notion | Blue | #0075de | 0.568 | 0.182 | 254 | 중하 — 차분 |
| Linear | Indigo | #5e6ad2 | 0.567 | **0.159** | 275 | 가장 낮은 채도 — 절제된 세련미 |
| Supabase | Green | #3ecf8e | 0.762 | **0.154** | 159 | 낮은 채도 — 부드러운 톤 |

### 발견: 3개 채도 클러스터

```
Vivid (C > 0.22):    Stripe(0.268), IBM(0.243), Airbnb(0.231)
                      → 색이 "소리를 지른다". 즉각적 인지.

Balanced (0.18-0.22): Resend(0.214), Spotify(0.212), Linear Violet(0.207),
                      Vercel(0.206/0.201)
                      → 존재감 있지만 공격적이지 않음.

Muted (C < 0.18):    Notion(0.182), Linear Indigo(0.159), Supabase(0.154)
                      → 색이 "속삭인다". 세련미와 절제.
```

**핵심 인사이트: 채도 수준은 아키타입(구조)과 독립적이다.**
- Stripe는 Precise(sharp, light weight)이면서 Vivid
- Linear는 Expressive(rounded, medium depth)이면서 Muted
- 같은 아키타입 안에서도 채도가 다름 → 별도의 축으로 분리 가능

---

## Status Color Chroma

10개 시스템에서 success/error/warning/info 컬러의 chroma 분포.

### Success (Green)

| Company | Hex | C | H |
|---|---|---|---|
| Spotify | #1ed760 | **0.212** | 149 |
| Notion | #1aae39 | 0.196 | 145 |
| Stripe | #15be53 | 0.195 | 149 |
| Linear | #27a644 | 0.175 | 147 |
| IBM | #24a148 | 0.166 | 148 |
| Supabase | #3ecf8e | 0.154 | 159 |
| Linear Emerald | #10b981 | 0.149 | 163 |

**평균: 0.178, 범위: 0.149-0.212**

### Error (Red)

| Company | Hex | C | H |
|---|---|---|---|
| Resend | #ff2047 | **0.245** | 21 |
| Stripe | #ea2261 | 0.228 | 11 |
| IBM | #da1e28 | 0.217 | 26 |
| Airbnb | #c13515 | 0.182 | 34 |
| Spotify | #f3727f | **0.159** | 16 |

**평균: 0.206, 범위: 0.159-0.245**

에러 레드가 가장 높은 채도 범위를 가짐 — 위험 신호는 눈에 띄어야 하므로.

### Warning (Amber/Yellow)

| Company | Hex | C | H |
|---|---|---|---|
| IBM | #f1c21b | 0.166 | 90 |
| Spotify | #ffa42b | 0.163 | 67 |
| Resend | #ffc53d | 0.157 | 84 |
| Stripe | #9b6829 | **0.102** | 68 |

**평균: 0.147, 범위: 0.102-0.166**

Warning은 가장 낮은 채도 — yellow/amber 계열은 oklch에서 자연적으로 chroma가 낮다 (perceptual 특성).

### Info (Blue)

| Company | Hex | C | H |
|---|---|---|---|
| IBM | #0f62fe | **0.243** | 262 |
| Resend | #0075ff | 0.223 | 258 |
| Notion | #0075de | 0.182 | 254 |
| Spotify | #539df5 | **0.150** | 254 |

**평균: 0.199, 범위: 0.150-0.243**

### Status Chroma 요약

| Status | 평균 C | 해석 |
|---|---|---|
| Error (red) | **0.206** | 가장 높음 — 위험은 눈에 띄어야 |
| Info (blue) | 0.199 | 높음 — 정보도 명확해야 |
| Success (green) | 0.178 | 중간 — 긍정은 과하지 않게 |
| Warning (amber) | **0.147** | 가장 낮음 — yellow의 perceptual 특성 |

---

## Neutral Chroma (Gray에 얼마나 색이 섞이나)

| Company | 가장 밝은 gray | 중간 gray | 가장 어두운 gray | 특성 |
|---|---|---|---|---|
| IBM | C=0.000 | C=0.000 | C=0.000 | **순수 무채색** |
| Vercel | C=0.000 | C=0.000 | C=0.000 | **순수 무채색** |
| Airbnb | C=0.000 | — | C=0.000 | **순수 무채색** |
| Spotify | C=0.000 | — | C=0.000 | **순수 무채색** |
| Supabase | C=0.000 | — | C=0.000 | **순수 무채색** |
| Linear | C=0.001 | C=0.015 | C=0.003 | **cool tint** (H≈250) |
| Notion | C=0.002 | C=0.008 | C=0.004 | **warm tint** (H≈68) |

**대부분의 시스템(7/10)은 순수 무채색 gray를 사용.** 색이 섞인 gray는 Linear(cool blue tint)와 Notion(warm yellow tint)뿐.

---

## 채도 vs 아키타입 교차 분석

| Company | 아키타입 클러스터 | Brand Chroma | 수준 |
|---|---|---|---|
| Stripe | Precise | 0.268 | Vivid |
| IBM | Precise | 0.243 | Vivid |
| Vercel | Confident | 0.206 | Balanced |
| Notion | Confident | 0.182 | Muted |
| Airbnb | Confident | 0.231 | Vivid |
| Linear | Expressive | 0.159 | Muted |
| Spotify | Expressive | 0.212 | Balanced |
| Supabase | Modern | 0.154 | Muted |
| Resend | Modern | 0.214 | Balanced |

**같은 아키타입 안에서도 채도가 Vivid부터 Muted까지 분포.** 이것은 채도가 아키타입과 독립적인 축임을 확인한다.

---

## 설계 시사점

### 채도를 별도 입력으로 분리할 수 있다

아키타입(구조)과 독립적으로, 사용자에게 "컬러 캐릭터"를 선택하게 할 수 있다:

```
Vivid    (peak C ≈ 0.24):  Stripe, IBM, Airbnb 패턴
Balanced (peak C ≈ 0.20):  Vercel, Spotify, Resend 패턴
Muted    (peak C ≈ 0.16):  Linear, Supabase, Notion 패턴
```

이 선택이 영향을 미치는 것:
- Brand 컬러의 스케일 chroma 커브
- Status 컬러의 chroma 수준 (비례 스케일링)
- Accent 컬러의 채도
- Gray에 색이 섞이는 정도 (Muted → undertone 강화 가능)

### chroma 커브(cMult)는 안정적

Tailwind 분석에서 도출한 커브와 실제 시스템의 패턴이 유사하다. 중간 단계(300-700)의 chroma 비율은 시스템 간 일관적이며, 차이는 주로 **peak chroma 절대값**에서 발생한다.

즉, cMult 커브는 고정하고 baseChroma만 조절하면 된다.
