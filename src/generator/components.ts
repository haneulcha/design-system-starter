// src/generator/components.ts

import type { ArchetypePreset, ComponentSpecs } from "../schema/types.js";

/**
 * Build the component specs. All `spacing.*` references resolve through the
 * spacing category aliases (proposal §3): xxs/xs/sm/md/lg/xl/xxl/section.
 *
 * Note: this generator is still archetype-driven. Once the components category
 * gets its own inductive analysis, these references and their resolution will
 * be reworked end-to-end.
 */
export function generateComponents(_archetype: ArchetypePreset): ComponentSpecs {
  return {
    button: {
      sizes: {
        sm: { height: "spacing.xl",  paddingX: "spacing.sm", gap: "spacing.xxs", fontSize: "typography.caption", iconSize: "spacing.md", radius: "radius.button" },
        md: { height: "spacing.xxl", paddingX: "spacing.md", gap: "spacing.xs",  fontSize: "typography.button",  iconSize: "spacing.md", radius: "radius.button" },
        lg: { height: "spacing.xxl", paddingX: "spacing.lg", gap: "spacing.xs",  fontSize: "typography.body",    iconSize: "spacing.lg", radius: "radius.button" },
      },
      variants: ["primary", "secondary", "ghost"],
    },
    input: {
      fieldHeight: "spacing.xxl",
      fieldPaddingX: "spacing.sm",
      fieldRadius: "radius.input",
      labelFieldGap: "spacing.xxs",
      fieldHelperGap: "spacing.xxs",
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
      // 1px hairline. Not a spacing concern — kept as raw px until a dedicated
      // border-width token category exists.
      lineHeight: "1px",
      labelPaddingX: "spacing.sm",
      labelFont: "typography.caption",
    },
  };
}
