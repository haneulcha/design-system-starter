import type { ArchetypePreset, LayoutSystem } from "../schema/types.js";

export function generateLayout(archetype: ArchetypePreset): LayoutSystem {
  const whitespaceMap: Record<string, string> = {
    "clean-minimal": "Gallery-like emptiness. Massive vertical padding between sections communicates confidence. The whitespace IS the design.",
    "warm-friendly": "Generous, relaxed spacing throughout. Nothing feels crowded or urgent — the whitespace conveys warmth and approachability.",
    "bold-energetic": "Dramatic vertical spacing between sections creates visual impact. Content blocks are dense internally but separated by vast breathing room.",
    "professional": "Structured, purposeful spacing. Every margin serves information hierarchy. Dense enough to convey seriousness, open enough to breathe.",
    "playful-creative": "Playful rhythm with varied spacing. Sections alternate between tight groupings and generous gaps, creating visual energy and surprise.",
  };

  return {
    spacing: [
      { name: "3xs", value: "2px" },
      { name: "2xs", value: "4px" },
      { name: "xs", value: "8px" },
      { name: "sm", value: "12px" },
      { name: "md", value: "16px" },
      { name: "lg", value: "24px" },
      { name: "xl", value: "32px" },
      { name: "2xl", value: "48px" },
      { name: "3xl", value: "64px" },
      { name: "4xl", value: archetype.sectionSpacing },
    ],
    grid: {
      maxWidth: "1200px",
      columns: 12,
      gutter: archetype.componentSpacing,
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
