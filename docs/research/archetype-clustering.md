# Archetype Clustering — 54 DESIGN.md 정량 분석

## 방법론

54개 실제 프로덕션 디자인 시스템(awesome-design-md)에서 7개 수치 변수를 추출하고, 상관관계 분석 + K-means 클러스터링으로 자연스러운 아키타입 그룹을 도출했다.

### 추출 변수

| 변수 | 출처 | 의미 |
|---|---|---|
| btn_radius | Section 4: Buttons | 주요 버튼의 border-radius (px) |
| card_radius | Section 4: Cards | 카드/컨테이너 radius (px) |
| heading_weight | Section 3: Typography | 가장 큰 헤딩(Display Hero)의 font-weight |
| body_line_height | Section 3: Typography | 본문 텍스트 line-height |
| heading_letter_spacing | Section 3: Typography | Display Hero의 letter-spacing (px) |
| shadow_intensity | Section 6: Elevation | 카드 섀도우 opacity 분류 (0=none, 1=whisper, 2=subtle, 3=medium, 4=dramatic) |
| btn_shape | Section 4: Buttons | 버튼 형태 분류 (0=sharp, 1=standard, 2=rounded, 3=pill) |

---

## Raw Data (54개 전체)

| Company | Btn R | Card R | H.Weight | Body LH | H.LS | Shadow | Shape |
|---------|-------|--------|----------|---------|------|--------|-------|
| Airbnb | 8 | 20 | 700 | 1.43 | -0.44 | subtle | rounded |
| Airtable | 12 | 20 | 400 | 1.35 | 0 | medium | rounded |
| Apple | 8 | 6 | 600 | 1.47 | -0.37 | medium | rounded |
| BMW | 0 | 0 | 300 | 1.15 | 0 | none | sharp |
| Cal.com | 8 | 10 | 600 | 1.10 | 0 | medium | rounded |
| Claude | 10 | 20 | 500 | 1.60 | 0 | subtle | rounded |
| Clay | 12 | 32 | 600 | 1.60 | -0.4 | medium | rounded |
| ClickHouse | 4 | 8 | 900 | 1.50 | 1.4 | subtle | sharp |
| Cohere | 22 | 22 | 400 | 1.40 | -1.44 | none | pill |
| Coinbase | 56 | 24 | 400 | 1.00 | 0 | none | pill |
| Composio | 4 | 4 | 400 | 1.50 | 0 | medium | sharp |
| Cursor | 8 | 9 | 400 | 1.35 | -0.72 | medium | rounded |
| ElevenLabs | 9999 | 24 | 300 | 1.60 | -0.96 | subtle | pill |
| Expo | 6 | 16 | 900 | 1.40 | -3.0 | subtle | rounded |
| Figma | 50 | 7 | 400 | 1.45 | -0.96 | subtle | pill |
| Framer | 40 | 11 | 500 | 1.30 | -5.5 | medium | pill |
| HashiCorp | 5 | 8 | 600 | 1.50 | 0 | whisper | rounded |
| IBM | 0 | 0 | 300 | 1.50 | 0.32 | subtle | sharp |
| Intercom | 4 | 12 | 400 | 1.50 | -0.48 | subtle | sharp |
| Kraken | 12 | 16 | 700 | 1.38 | -0.5 | subtle | rounded |
| Linear | 6 | 15 | 510 | 1.50 | -1.58 | medium | rounded |
| Lovable | 6 | 14 | 600 | 1.50 | -1.5 | subtle | rounded |
| MiniMax | 8 | 18 | 500 | 1.50 | 0 | medium | rounded |
| Mintlify | 9999 | 20 | 600 | 1.50 | -1.28 | whisper | pill |
| Miro | 8 | 18 | 400 | 1.45 | -1.68 | subtle | rounded |
| Mistral | 4 | 0 | 400 | 1.50 | -2.05 | medium | sharp |
| MongoDB | 100 | 32 | 400 | 1.50 | 0 | medium | pill |
| Notion | 4 | 14 | 700 | 1.50 | -2.13 | whisper | rounded |
| NVIDIA | 2 | 2 | 700 | 1.50 | 0 | subtle | sharp |
| Ollama | 9999 | 12 | 500 | 1.50 | 0 | none | pill |
| PostHog | 6 | 5 | 800 | 1.50 | -0.75 | subtle | rounded |
| Raycast | 6 | 14 | 600 | 1.60 | 0 | medium | rounded |
| Replicate | 9999 | 9999 | 700 | 1.50 | -1.8 | subtle | pill |
| Resend | 9999 | 20 | 400 | 1.50 | -0.96 | whisper | pill |
| Revolut | 9999 | 20 | 500 | 1.50 | -2.72 | none | pill |
| RunwayML | 5 | 8 | 400 | 1.30 | -1.2 | none | standard |
| Sanity | 9999 | 9 | 400 | 1.50 | -4.48 | whisper | pill |
| Sentry | 13 | 10 | 700 | 1.50 | 0 | subtle | rounded |
| SpaceX | 32 | 0 | 700 | 1.50 | 0.96 | none | pill |
| Spotify | 50 | 7 | 700 | 1.50 | 0 | medium | rounded |
| Stripe | 4 | 6 | 300 | 1.40 | -1.4 | subtle | standard |
| Supabase | 9999 | 12 | 400 | 1.50 | 0 | none | pill |
| Superhuman | 12 | 16 | 540 | 1.50 | 0 | subtle | rounded |
| Together.ai | 6 | 8 | 500 | 1.25 | -1.92 | subtle | standard |
| Uber | 999 | 10 | 700 | 1.25 | 0 | subtle | pill |
| Vercel | 6 | 10 | 600 | 1.56 | -2.4 | whisper | rounded |
| VoltAgent | 6 | 8 | 400 | 1.50 | -0.65 | subtle | rounded |
| Warp | 50 | 10 | 400 | 1.30 | -2.4 | none | pill |
| Webflow | 6 | 6 | 600 | 1.40 | 0 | subtle | standard |
| Wise | 9999 | 28 | 900 | 1.44 | 0 | whisper | pill |
| X.ai | 0 | 2 | 300 | 1.50 | 0 | none | sharp |
| Zapier | 6 | 6 | 500 | 1.20 | -0.9 | none | standard |
| Pinterest | 16 | 16 | 600 | 1.40 | -1.2 | none | rounded |
| OpenCode | 5 | 4 | 700 | 1.50 | 0 | none | standard |

---

## 상관관계 분석

7개 변수 간의 Pearson 상관계수 (54개 전체):

```
              btn_r  card_r  h_wt  body_lh  h_ls  shadow  shape
    btn_r      1.00    0.31 -0.03     0.23 -0.19   -0.30   0.49
   card_r      0.31    1.00  0.14     0.07 -0.11    0.05   0.15
     h_wt     -0.03    0.14  1.00     0.13  0.13    0.10   0.10
  body_lh      0.23    0.07  0.13     1.00  0.06    0.21   0.01
     h_ls     -0.19   -0.11  0.13     0.06  1.00    0.02  -0.28
   shadow     -0.30    0.05  0.10     0.21  0.02    1.00  -0.13
    shape      0.49    0.15  0.10     0.01 -0.28   -0.13   1.00
```

### 발견

**분산 (정규화 0-1, 높을수록 제품 간 차이 큼):**
- btn_radius: 0.138 ← 가장 높음
- shadow: 0.133
- btn_shape: 0.112
- heading_weight: 0.070
- body_line_height: 0.042
- heading_letter_spacing: 0.032
- card_radius: 0.018

**해석:**
- `btn_radius`와 `shadow`가 제품 간 가장 큰 차이를 만듦
- `body_line_height`는 대부분 1.50에 수렴 → 아키타입 구분력 없음
- `heading_letter_spacing`도 수렴 → 구분력 약함
- `btn_radius`와 `shape`는 상관 0.49 → 같은 축 (pill = 큰 radius)
- `heading_weight`가 가장 독립적 (다른 변수와 평균 상관 0.107)

**핵심 분리 축 3개:**
1. **Shape** (btn_shape + btn_radius) — 제품의 시각적 성격을 가장 강하게 결정
2. **Shadow** — 같은 rounded 안에서도 depth 차이로 두 그룹 분리
3. **Heading weight** — 가벼움(300-400) vs 무거움(600-700)으로 톤 결정

---

## K-means 클러스터링 결과

### K=4 (최적)

| 클러스터 | 핵심 특성 | 회사 수 | Within-cluster distance |
|---|---|---|---|
| 1. Sharp + Light | 날카로운 모서리, 가벼운 weight | 10 | — |
| 2. Rounded + Heavy | 둥근 모서리, 무거운 weight, 약한 shadow | 14 | — |
| 3. Rounded + Medium + Depth | 둥근 모서리, 중간 weight, **강한 shadow** | 18 | — |
| 4. Pill + Light | 알약 버튼, 가벼운 weight, shadow 거의 없음 | 12 | — |

Total within-cluster distance: 14.29

### K=5 비교

K=5로 늘리면 Cluster 2에서 Expo, Framer가 분리되지만 (2개 회사), 의미 있는 독립 그룹이 아님. K=4가 자연스러움.

---

## 도출된 4개 아키타입

### Precise (10개사)

**대표:** Stripe, IBM, X.ai, Intercom

| 속성 | 중앙값 | 범위 |
|---|---|---|
| btn_radius | 4px | 0-6px |
| card_radius | 5px | 0-12px |
| heading_weight | 400 | 300-500 |
| body_line_height | 1.45 | 1.15-1.50 |
| heading_letter_spacing | -0.7px | -2.05 ~ 0.32 |
| shadow | subtle (2) | 0-3 |
| btn_shape | sharp | — |

**디자인 특성:**
- 날카로운 모서리가 정밀함과 신뢰를 전달
- 가벼운 heading weight (300-400)가 "소리 지르지 않는 자신감" 표현
- Stripe의 weight 300 headline은 이 클러스터의 극단적 표현
- Shadow는 있지만 주장하지 않음
- IBM의 0px radius는 극단이지만, 4px의 Stripe/Intercom이 더 실용적인 대표

### Confident (14개사)

**대표:** Vercel, Notion, Airbnb, PostHog, Sentry

| 속성 | 중앙값 | 범위 |
|---|---|---|
| btn_radius | 6px | 2-32px |
| card_radius | 9px | 0-20px |
| heading_weight | 700 | 600-900 |
| body_line_height | 1.50 | 1.38-1.56 |
| heading_letter_spacing | -0.2px | -3.0 ~ 1.4 |
| shadow | subtle (2) | 0-2 |
| btn_shape | rounded | — |

**디자인 특성:**
- 무거운 heading weight (600-700)가 확신과 권위를 전달
- Rounded 버튼이지만 과하지 않은 radius (6px)
- Shadow가 약함 — 구조는 spacing과 typography로 만듦
- Vercel의 aggressive letter-spacing (-2.4px)이 이 그룹에서 가장 극단적
- "우리 제품은 좋다"를 디자인으로 말하는 그룹

### Expressive (18개사)

**대표:** Linear, Apple, Claude, Cursor, Spotify, Raycast

| 속성 | 중앙값 | 범위 |
|---|---|---|
| btn_radius | 8px | 6-999px |
| card_radius | 14px | 6-32px |
| heading_weight | 505 | 400-700 |
| body_line_height | 1.50 | 1.10-1.60 |
| heading_letter_spacing | -0.2px | -5.5 ~ 0 |
| shadow | **medium (3)** | 2-3 |
| btn_shape | rounded | — |

**디자인 특성:**
- **가장 큰 차이점: shadow intensity가 medium** — 다른 클러스터보다 깊은 depth
- Card radius가 크고 (14px), shadow가 강해서 "물리적 존재감" 부여
- Heading weight는 중간 — 극단을 피하고 표현의 폭을 넓힘
- Confident와 같은 rounded지만, depth가 다름 → 더 감각적이고 표현적
- 이 클러스터가 가장 크다 (18개) — 현대 SaaS/테크 기업의 주류

### Modern (12개사)

**대표:** Supabase, Resend, Coinbase, Revolut, Mintlify

| 속성 | 중앙값 | 범위 |
|---|---|---|
| btn_radius | 9999px | 22-9999px |
| card_radius | 20px | 9-9999px |
| heading_weight | 400 | 300-900 |
| body_line_height | 1.50 | 1.00-1.60 |
| heading_letter_spacing | -1.1px | -4.48 ~ 0 |
| shadow | **whisper (0.5)** | 0-2 |
| btn_shape | pill | — |

**디자인 특성:**
- Pill 버튼이 유일한 공통점 — 이 하나가 전체 성격을 결정
- Shadow가 거의 없음 — 플랫하고 가벼움
- Heading weight 분산이 가장 큼 (300-900) — pill 외에는 제약이 약함
- 빠르게 성장하는 스타트업/핀테크에서 선호
- "현대적"이라는 인상을 pill 하나로 달성

---

## Confident vs Expressive: 같은 Rounded인데 뭐가 다른가?

이 두 클러스터의 분리가 가장 흥미로운 발견이다.

| | Confident | Expressive |
|---|---|---|
| **Shadow** | subtle (2) | **medium (3)** |
| **Heading weight** | **700** (무거움) | 505 (중간) |
| **Card radius** | 9px | **14px** (더 큼) |
| **대표 제품** | Vercel, Notion, Airbnb | Linear, Apple, Claude |

**Confident**는 타이포그래피의 무게로 존재감을 만든다. Shadow가 약해도 weight 700이 충분한 시각적 위계를 제공한다. "구조가 곧 디자인"인 접근.

**Expressive**는 shadow와 radius로 공간감을 만든다. Weight가 중간이어서 여유롭고, 대신 depth가 깊어서 요소들이 "떠 있는" 느낌. "분위기가 곧 디자인"인 접근.

---

## 수렴하지 않는 변수들

- **body_line_height**: 1.50에 강하게 수렴. 아키타입 구분에 기여하지 않음.
- **heading_letter_spacing**: 분산이 낮고 패턴이 불명확. normal(0)과 negative(-1~-2)가 혼재하지만 클러스터와 무관.

이 두 변수는 아키타입에서 고정값으로 처리해도 무방하다.
