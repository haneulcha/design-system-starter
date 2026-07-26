# Accent Scale Bench Report

_`pnpm accent-scale-bench` 가 재생성하는 파일 — 손으로 수정하지 말 것._
_References: tailwind@4.3.3, radix@3.0.0. ΔE = Oklab 유클리드 거리._

## Summary — pooled (전체 mean/max ΔE, 낮을수록 재현력 좋음)

_모든 레퍼런스 출처(tailwind+radix 등)를 합산한 값. 아래 §Comparability caveats 참고 —_
_radix 알고리즘은 레퍼런스 팔레트 중 25/42가 자기 자신의 스냅 타겟이라 pooled 순위가 낙관적이다._

| algorithm | palettes | mean ΔE | max ΔE |
| --- | ---: | ---: | ---: |
| v1 | 42 | 0.1582 | 0.5985 |
| naive | 42 | 0.0955 | 0.3188 |
| hct | 42 | 0.1479 | 0.5659 |
| leonardo | 42 | 0.1661 | 0.5602 |
| radix | 42 | 0.0560 | 0.3036 |
| ours | 42 | 0.0462 | 0.1993 |

## Summary by source (mean ΔE)

_출처별로 분리한 mean ΔE — pooled 표가 감추는 알고리즘별 편향을 드러낸다._

| algorithm | tailwind | radix |
| --- | ---: | ---: |
| v1 | 0.0892 | 0.2052 |
| naive | 0.0803 | 0.1059 |
| hct | 0.0805 | 0.1937 |
| leonardo | 0.1005 | 0.2106 |
| radix | 0.1284 | 0.0067 |
| ours | 0.0236 | 0.0616 |

## Comparability caveats

- radix 레퍼런스는 radix.ts 자신의 스냅 타겟(24개 Radix 공식 스케일)에서 파생되었으므로, radix 알고리즘의 radix-출처 ΔE는 구조적으로 거의 0에 가깝다(자기참조) — 다른 알고리즘과 공정 비교 불가.
- radix 알고리즘은 요청된 anchorIndex를 count≠12일 때 존중하지 않는다 — 자신의 네이티브 12-step에서 위치 비례로 선형 재표집하므로, tailwind ΔE에는 앵커 위치 불일치가 일부 섞여 있다.
- hct/v1은 입력 L을 무시하는 고정 lightness 사다리를 쓰고, leonardo는 고정 1.06→19 contrast-ratio 사다리를 쓴다 — 모두 레퍼런스별로 튜닝되지 않은 어댑터 파라미터화 선택이며, 벤치마크 대상 알고리즘의 근본 한계이지 버그가 아니다.
- ours의 곡선 테이블(OURS_CURVE)은 tailwind 17개 팔레트의 평균에 적합시킨 것이다 — tailwind-출처 ΔE는 in-sample(홈그라운드)이므로 낙관적이며, 일반화 성능은 radix-출처 열로 판단할 것.

## By hue family (mean ΔE)

| algorithm | blue | cyan | green | magenta | orange | purple | red | yellow |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v1 | 0.1469 | 0.1563 | 0.1875 | 0.1628 | 0.1628 | 0.1329 | 0.1445 | 0.1695 |
| naive | 0.0849 | 0.0810 | 0.0867 | 0.1105 | 0.0976 | 0.1139 | 0.1024 | 0.0939 |
| hct | 0.1435 | 0.1653 | 0.1933 | 0.1377 | 0.1416 | 0.1102 | 0.1187 | 0.1562 |
| leonardo | 0.1633 | 0.1767 | 0.2052 | 0.1578 | 0.1621 | 0.1341 | 0.1409 | 0.1738 |
| radix | 0.0682 | 0.0509 | 0.0493 | 0.0484 | 0.0490 | 0.0633 | 0.0702 | 0.0430 |
| ours | 0.0364 | 0.0399 | 0.0474 | 0.0554 | 0.0464 | 0.0539 | 0.0471 | 0.0446 |

## Corpus fit (accent-baseline.md 중앙값 대비)

_L(low)/L(high) = 유도 스케일들의 앵커 ±2 스텝 구간 내 최소/최대 L 각각의, 팔레트 전체에 대한 중앙값._

| algorithm | median C_max | median L(low) | median L(high) |
| --- | ---: | ---: | ---: |
| _corpus (n=58)_ | 0.2131 | 0.5120 | 0.6690 |
| v1 | 0.1824 | 0.2136 | 0.5582 |
| naive | 0.1839 | 0.3525 | 0.7577 |
| hct | 0.1874 | 0.2933 | 0.5842 |
| leonardo | 0.1796 | 0.2890 | 0.5586 |
| radix | 0.1858 | 0.5621 | 0.8655 |
| ours | 0.1839 | 0.4637 | 0.7961 |
