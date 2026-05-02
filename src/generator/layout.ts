import type { ArchetypePreset, LayoutSystem } from "../schema/types.js";
import type { SpacingCategoryTokens } from "./spacing-category.js";

/**
 * Build the LayoutSystem (spacing array, grid, border-radius, philosophy) for
 * the markdown template. Spacing entries are derived from the new spacing
 * category (proposal §3); border-radius and grid still consume archetype until
 * those categories complete their per-category inductive analyses.
 */
export function generateLayout(
  archetype: ArchetypePreset,
  spacingTokens: SpacingCategoryTokens,
): LayoutSystem {
  const whitespaceMap: Record<string, string> = {
    "professional": "Structured, purposeful spacing. Every margin serves information hierarchy. Dense enough to convey seriousness, open enough to breathe.",
    "bold-energetic": "Whitespace is not decoration — it is the frame that makes bold typographic moments land harder by contrast. Section breaks are generous and deliberate.",
    "warm-friendly": "Generous, atmospheric spacing throughout. Nothing feels crowded or urgent — the whitespace amplifies the sense of depth and considered presence.",
    "clean-minimal": "Airy, startup-product rhythm. Flat surfaces need generous spacing to breathe; the layout feels light and expansive rather than dense.",
    "playful-creative": "Generous, unhurried rhythm with room for expressive moments. Section breaks feel intentional and inviting, never crowded — whitespace gives every element space to express itself.",
  };

  // Emit the 8 named aliases in semantic order. Reserved scale stops are not
  // surfaced here — consumers needing them go through spacingTokens.scale.
  const aliasOrder: Array<keyof SpacingCategoryTokens["aliases"]> = [
    "xxs", "xs", "sm", "md", "lg", "xl", "xxl", "section",
  ];
  const spacing = aliasOrder.map((name) => ({
    name,
    value: `${spacingTokens.aliases[name]}px`,
  }));

  return {
    spacing,
    grid: {
      maxWidth: "1200px",
      columns: 12,
      // Grid gutter consumes the md alias — corpus mode for card-grid gutters.
      gutter: `${spacingTokens.aliases.md}px`,
    },
    borderRadius: [
      { name: "None", value: "0px", use: "Sharp-edged elements" },
      { name: "Subtle", value: "4px", use: "Small interactive elements" },
      { name: "Button", value: archetype.buttonRadius, use: "Buttons, form actions" },
      { name: "Input", value: archetype.inputRadius, use: "Form inputs, selects" },
      { name: "Card", value: archetype.cardRadius, use: "Cards, containers" },
      { name: "Large", value: "24px", use: "Large containers, sections" },
      { name: "Pill", value: archetype.pillRadius, use: "Badges, tags, pills" },
      { name: "Circle", value: "50%", use: "Avatars, icon buttons" },
    ],
    whitespacePhilosophy: whitespaceMap[archetype.mood],
  };
}
