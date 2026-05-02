# Type Font-Family Track (Session G)

_Source: `docs/research/type-styles-raw.csv` — `font` column. 38/58 systems exposed concrete font names; 87 distinct fonts total. Most fonts appear once (brand-specific custom families), so the corpus signal is structural ("what slots exist?") rather than nominal ("which font wins?")._

## Corpus Summary

- 58 systems · 38 with explicit font data · 87 distinct fonts
- Top fonts (count of systems): Inter (7), Geist Mono (3), Source Code Pro (3), Inter Variable (2), system-ui (2), IBM Plex Mono (2)
- Distribution shape: long tail. Brand-custom typefaces (CohereText, Saans, GT Walsheim, HashiCorp Sans, Mona Sans, Outfit, etc.) dominate the tail.
- Reading the corpus: **the question is "how many slots, what defaults?" not "which font."**

## Slot Architecture

3-slot structure with category-level override:

| slot | default category usage | corpus signal |
| --- | --- | --- |
| `sans` | heading, body, caption, button, card, nav, link, badge | every non-code category in every system |
| `mono` | code | code-bearing systems (~half of corpus) consistently use a separate mono family |
| `serif` | (override only) | rare in corpus; opt-in for editorial brands (Apple SF Pro Display Serif, Lamborghini, etc.) |

Categories default to `sans` except `code`, which uses `mono`. A user can override per category in the schema (e.g. `heading.fontFamily = "serif"`) to ship an editorial brand without expanding the slot count.

## Fallback Chains (Korean-aware)

Each chain follows a 4-tier strategy:
1. **Primary brand font** — Latin characters render here
2. **Korean web font** — CJK glyphs fall through to this layer
3. **OS-specific Korean** — when web fonts haven't loaded
4. **Generic web fallback** — last resort

```
sans:  Inter, Pretendard,
       "Apple SD Gothic Neo", "Noto Sans KR",
       system-ui, -apple-system, "Segoe UI", Roboto, sans-serif

mono:  "Geist Mono", "IBM Plex Mono",
       D2Coding, "Noto Sans Mono CJK KR",
       "SF Mono", Consolas, monospace

serif: Georgia,
       "Noto Serif KR", "Nanum Myeongjo",
       "Times New Roman", serif
```

### Why these defaults

- **`sans` primary = Inter (corpus mode, 7 systems direct + de facto modern UI standard)**. Pretendard is the Korean pairing — designed with Inter-matching metrics (x-height, advance width). Mixed Latin/Hangul text renders evenly without the typical "font hop" between languages.
- **`mono` primary = Geist Mono**. Recently standardized in the Vercel/Next.js ecosystem and gaining adoption; corpus shows 3 systems already using it. D2Coding is the Korean monospace pairing — widely deployed in Korean dev tooling.
- **`serif` primary = Georgia**. Universal availability across OSes, no font-loading required. Noto Serif KR is the Korean pairing; Nanum Myeongjo is the secondary Korean serif fallback for systems without Noto.

### Latin-first ordering

Inter precedes Pretendard in the `sans` chain (and similarly for mono/serif). Latin characters render in the primary brand font; Korean characters fall through because Inter doesn't carry Hangul glyphs. The browser picks per-glyph, so this gives the desired result: English in Inter, Korean in Pretendard, both with consistent metrics.

A "Korean-first" variant (Pretendard primary, Inter omitted) is **not** shipped as a starter default; users targeting Korean-only markets can override the chain.

## Per-Category Defaults

| category | family slot | rationale |
| --- | --- | --- |
| heading | sans | corpus universal |
| body | sans | corpus universal |
| caption | sans | corpus universal |
| code | mono | every code-using system in corpus has a separate mono family |
| button | sans | corpus universal (button labels match body family) |
| card | sans | follows heading/body convention |
| nav | sans | corpus universal |
| link | sans | inherits from body |
| badge | sans | uppercase tracking handles the differentiation, not family change |

## Notes

- **Variable fonts**: Inter Variable, Inter Framer Regular, etc. appear in corpus. The starter does not specify variable axis settings — those are font-loading concerns handled outside this track. The fallback chain works identically with static or variable Inter.
- **System-ui pattern**: 2 systems use `system-ui` directly. The starter's chain ends with `system-ui` as the OS-default fallback — this preserves that option for users who want native rendering.
- **No serif in v1 alias map**: serif slot exists but no category points to it by default. Brands wanting editorial typography override `heading.fontFamily = "serif"` in their schema.
- **Pretendard licensing**: SIL Open Font License (free for commercial use). No starter-level concern.

## Carry-forward to Session H

- Session H synthesis: each `(category, sizeVariant)` profile gains a `fontFamily` field (`"sans" | "mono" | "serif"`), defaulting to `sans` except code → mono.
- The three fallback chains live as constants in `src/schema/typography.ts` (parallel to color's `NEUTRAL_STOPS_STANDARD` etc.).
- Custom brand fonts get layered in front of the chain via a knob (e.g., `brandFontSans = "Mona Sans"` prepends to the sans chain).
