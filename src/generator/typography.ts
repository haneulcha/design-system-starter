import type { ArchetypePreset, TypographySystem, TypeStyle } from "../schema/types.js";

export function generateTypography(
  archetype: ArchetypePreset,
  fontChoice: string
): TypographySystem {
  const { heading, body, ui } = archetype.fontWeights;
  const monoFont = archetype.monoFont;

  // Parse headingLetterSpacing base value (e.g. "-2.4px" -> -2.4)
  const headingLsBase = parseFloat(archetype.headingLetterSpacing);
  const bodyLineHeight = archetype.bodyLineHeight;
  const headingLineHeight = parseFloat(archetype.headingLineHeight);

  // Letter spacing scaling factors per size
  // Display Hero 48px -> 100%, 40px -> 67%, 32px -> 42%, 26px -> 25%, 24px -> 20%, body -> "normal"
  const scaledLs = (factor: number): string => {
    const val = headingLsBase * factor;
    return `${val.toFixed(2)}px`;
  };

  // Line height for headings — increases slightly as size decreases
  const headingLh = (offset: number): string => {
    return (headingLineHeight + offset).toFixed(2);
  };

  const hierarchy: TypeStyle[] = [
    // ── Display / Heading styles ──────────────────────────────────────
    {
      role: "Display Hero",
      font: fontChoice,
      size: "48px",
      weight: heading,
      lineHeight: headingLh(0),
      letterSpacing: scaledLs(1.0),
      notes: "Largest display text; hero sections and splash pages",
    },
    {
      role: "Section Heading",
      font: fontChoice,
      size: "40px",
      weight: heading,
      lineHeight: headingLh(0.02),
      letterSpacing: scaledLs(0.67),
      notes: "Major section titles and page headings",
    },
    {
      role: "Sub-heading Large",
      font: fontChoice,
      size: "32px",
      weight: heading,
      lineHeight: headingLh(0.04),
      letterSpacing: scaledLs(0.42),
      notes: "Large sub-headings; content block titles",
    },
    {
      role: "Sub-heading",
      font: fontChoice,
      size: "26px",
      weight: heading,
      lineHeight: headingLh(0.06),
      letterSpacing: scaledLs(0.25),
      notes: "Standard sub-headings; card and panel titles",
    },
    {
      role: "Card Title",
      font: fontChoice,
      size: "24px",
      weight: heading,
      lineHeight: headingLh(0.08),
      letterSpacing: scaledLs(0.20),
      notes: "Card and widget headings",
    },
    // ── Body styles ───────────────────────────────────────────────────
    {
      role: "Body Large",
      font: fontChoice,
      size: "20px",
      weight: body,
      lineHeight: bodyLineHeight,
      letterSpacing: "normal",
      notes: "Lead paragraph and intro copy",
    },
    {
      role: "Body",
      font: fontChoice,
      size: "16px",
      weight: body,
      lineHeight: bodyLineHeight,
      letterSpacing: "normal",
      notes: "Default body copy",
    },
    {
      role: "Body Small",
      font: fontChoice,
      size: "14px",
      weight: body,
      lineHeight: bodyLineHeight,
      letterSpacing: "normal",
      notes: "Smaller body text; secondary content",
    },
    // ── UI element styles ─────────────────────────────────────────────
    {
      role: "Button",
      font: fontChoice,
      size: "14px",
      weight: ui,
      lineHeight: "1.00",
      letterSpacing: "normal",
      notes: "Button labels and CTAs",
    },
    {
      role: "Link",
      font: fontChoice,
      size: "14px",
      weight: ui,
      lineHeight: bodyLineHeight,
      letterSpacing: "normal",
      notes: "Inline links; underline decoration expected",
    },
    {
      role: "Caption",
      font: fontChoice,
      size: "12px",
      weight: body,
      lineHeight: "1.40",
      letterSpacing: "normal",
      notes: "Image captions, timestamps, and supporting metadata",
    },
    {
      role: "Label",
      font: fontChoice,
      size: "11px",
      weight: ui,
      lineHeight: "1.20",
      letterSpacing: "0.04em",
      notes: "Form labels, tags, and badges",
    },
    // ── Mono styles ───────────────────────────────────────────────────
    {
      role: "Mono Body",
      font: monoFont,
      size: "14px",
      weight: 400,
      lineHeight: "1.60",
      letterSpacing: "normal",
      notes: "Code blocks and inline code",
    },
    {
      role: "Mono Caption",
      font: monoFont,
      size: "12px",
      weight: 500,
      lineHeight: "1.33",
      letterSpacing: "normal",
      notes: "Small code snippets and technical labels",
    },
  ];

  const principles: string[] = [
    `Heading weight ${heading} is the primary signal of hierarchy — never drop below this for any heading level.`,
    `Letter spacing scales proportionally from ${archetype.headingLetterSpacing} at 48px down to near-normal at 24px, creating a natural optical compression at display sizes.`,
    `Body line-height is fixed at ${bodyLineHeight} across all body and link styles to ensure consistent readability without adjustment.`,
    `Mono styles always use ${monoFont} at weights 400/500 with generous line-height (1.60/1.33) to maximise code legibility.`,
  ];

  return {
    families: {
      primary: fontChoice,
      primaryFallback: archetype.defaultFontFallback,
      mono: monoFont,
      monoFallback: archetype.monoFontFallback,
    },
    hierarchy,
    principles,
  };
}
