# Accent Scale Bench Report

_`pnpm accent-scale-bench` 가 재생성하는 파일 — 손으로 수정하지 말 것._
_References: tailwind@4.3.3, radix@3.0.0. ΔE = Oklab 유클리드 거리._

## Summary (전체 mean/max ΔE, 낮을수록 재현력 좋음)

| algorithm | palettes | mean ΔE | max ΔE |
| --- | ---: | ---: | ---: |
| v1 | 42 | 0.1582 | 0.5985 |
| naive | 42 | 0.0955 | 0.3188 |
| hct | 42 | 0.1479 | 0.5659 |
| leonardo | 42 | 0.1661 | 0.5602 |

## By hue family (mean ΔE)

| algorithm | blue | cyan | green | magenta | orange | purple | red | yellow |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v1 | 0.1469 | 0.1563 | 0.1875 | 0.1628 | 0.1628 | 0.1329 | 0.1445 | 0.1695 |
| naive | 0.0849 | 0.0810 | 0.0867 | 0.1105 | 0.0976 | 0.1139 | 0.1024 | 0.0939 |
| hct | 0.1435 | 0.1653 | 0.1933 | 0.1377 | 0.1416 | 0.1102 | 0.1187 | 0.1562 |
| leonardo | 0.1633 | 0.1767 | 0.2052 | 0.1578 | 0.1621 | 0.1341 | 0.1409 | 0.1738 |

## Corpus fit (accent-baseline.md 중앙값 대비)

| algorithm | median C_max | median L(low) | median L(high) |
| --- | ---: | ---: | ---: |
| _corpus (n=58)_ | 0.2131 | 0.5120 | 0.6690 |
| v1 | 0.1824 | 0.2136 | 0.5582 |
| naive | 0.1839 | 0.3525 | 0.7577 |
| hct | 0.1874 | 0.2933 | 0.5842 |
| leonardo | 0.1796 | 0.2890 | 0.5586 |
