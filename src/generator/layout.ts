import type { ArchetypePreset, LayoutSystem } from "../schema/types.js";
import type { SpacingCategoryTokens } from "./spacing-category.js";
import type { RadiusCategoryTokens, RadiusTokenValue } from "./radius-category.js";

/**
 * Build the LayoutSystem (spacing array, grid, border-radius, philosophy) for
 * the markdown template. Spacing entries derive from the spacing category
 * (proposal §3); border-radius entries derive from the radius category
 * (proposal §3). Grid still uses static defaults; whitespace philosophy still
 * comes from the archetype.
 */
export function generateLayout(
  archetype: ArchetypePreset,
  spacingTokens: SpacingCategoryTokens,
  radiusTokens: RadiusCategoryTokens,
): LayoutSystem {
  const whitespaceMap: Record<string, string> = {
    "professional": "Structured, purposeful spacing. Every margin serves information hierarchy. Dense enough to convey seriousness, open enough to breathe.",
    "bold-energetic": "Whitespace is not decoration — it is the frame that makes bold typographic moments land harder by contrast. Section breaks are generous and deliberate.",
    "warm-friendly": "Generous, atmospheric spacing throughout. Nothing feels crowded or urgent — the whitespace amplifies the sense of depth and considered presence.",
    "clean-minimal": "Airy, startup-product rhythm. Flat surfaces need generous spacing to breathe; the layout feels light and expansive rather than dense.",
    "playful-creative": "Generous, unhurried rhythm with room for expressive moments. Section breaks feel intentional and inviting, never crowded — whitespace gives every element space to express itself.",
  };

  // ── Spacing aliases (proposal §3) ───────────────────────────────────────────
  const aliasOrder: Array<keyof SpacingCategoryTokens["aliases"]> = [
    "xxs", "xs", "sm", "md", "lg", "xl", "xxl", "section",
  ];
  const spacing = aliasOrder.map((name) => ({
    name,
    value: `${spacingTokens.aliases[name]}px`,
  }));

  // ── Border radius tokens (proposal §3) ──────────────────────────────────────
  const formatRadius = (v: RadiusTokenValue): string =>
    typeof v === "number" ? `${v}px` : v;

  const r = radiusTokens.tokens;
  const borderRadius = [
    { name: "None",   value: formatRadius(r.none),   use: "Sharp-edged elements" },
    { name: "Subtle", value: formatRadius(r.subtle), use: "Small interactive elements" },
    { name: "Button", value: formatRadius(r.button), use: "Buttons, form actions" },
    { name: "Input",  value: formatRadius(r.input),  use: "Form inputs, selects" },
    { name: "Card",   value: formatRadius(r.card),   use: "Cards, containers" },
    { name: "Large",  value: formatRadius(r.large),  use: "Large containers, hero/feature" },
    { name: "Pill",   value: formatRadius(r.pill),   use: "Badges, tags, pill CTAs" },
    { name: "Circle", value: formatRadius(r.circle), use: "Avatars, icon buttons" },
  ];

  return {
    spacing,
    grid: {
      maxWidth: "1200px",
      columns: 12,
      gutter: `${spacingTokens.aliases.md}px`,
    },
    borderRadius,
    whitespacePhilosophy: whitespaceMap[archetype.preset],
  };
}
