// src/generator/components.ts

import type { ArchetypePreset, ComponentSpecs } from "../schema/types.js";

export function generateComponents(archetype: ArchetypePreset): ComponentSpecs {
  return {
    button: {
      sizes: {
        sm: { height: "spacing.xl", paddingX: "spacing.sm", gap: "spacing.2xs", fontSize: "typography.caption", iconSize: "spacing.md", radius: "radius.button" },
        md: { height: "spacing.2xl", paddingX: "spacing.md", gap: "spacing.xs", fontSize: "typography.button", iconSize: "spacing.md", radius: "radius.button" },
        lg: { height: "spacing.3xl", paddingX: "spacing.lg", gap: "spacing.xs", fontSize: "typography.body", iconSize: "spacing.lg", radius: "radius.button" },
      },
      variants: ["primary", "secondary", "ghost"],
    },
    input: {
      fieldHeight: "spacing.2xl",
      fieldPaddingX: "spacing.sm",
      fieldRadius: "radius.input",
      labelFieldGap: "spacing.2xs",
      fieldHelperGap: "spacing.2xs",
      labelFont: "typography.label",
      valueFont: "typography.body",
      helperFont: "typography.caption",
      iconSize: "spacing.md",
      states: ["default", "focus", "error", "disabled"],
    },
    card: {
      radius: "radius.card",
      contentPadding: "spacing.lg",
      contentGap: "spacing.sm",
      shadow: "elevation.raised",
      headerFont: "typography.card-title",
      bodyFont: "typography.body",
      footerGap: "spacing.xs",
      variants: ["default", "compact"],
    },
    badge: {
      sizes: {
        sm: { height: "spacing.lg", paddingX: "spacing.xs", radius: "radius.pill", font: "typography.label" },
        md: { height: "spacing.xl", paddingX: "spacing.sm", radius: "radius.pill", font: "typography.caption" },
      },
      variants: ["default", "success", "error", "warning", "info"],
    },
    divider: {
      lineHeight: "spacing.3xs",
      labelPaddingX: "spacing.sm",
      labelFont: "typography.caption",
    },
  };
}
