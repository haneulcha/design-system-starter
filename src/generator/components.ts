// src/generator/components.ts
//
// Legacy ComponentSpecs adapter. The rich source-of-truth is
// generateComponentCategory() in components-category.ts; this file converts
// its output into the legacy ComponentSpecs shape that template.ts /
// figma transformer / tokens.ts consume.
//
// Why an adapter (and not a direct rewrite of those consumers): the legacy
// shape has flat per-component fields (e.g. card.radius, card.contentPadding)
// rather than per-size matrices. Migrating template.ts to consume the rich
// per-size shape is a separate refactor; this adapter unblocks the rest of
// Phase I without touching downstream consumers.

import type { ComponentSpecs } from "../schema/types.js";
import type { ComponentCategoryTokens } from "./components-category.js";
import { generateComponentCategory } from "./components-category.js";
import type { ComponentInput } from "../schema/components.js";

/** Adapt rich ComponentCategoryTokens into the legacy ComponentSpecs shape.
 *  The legacy variants list strings are PRESERVED to avoid breaking
 *  template.ts / token rendering downstream. The new structural variants
 *  (primary/secondary/ghost/outline/text/icon) live on `componentTokens`. */
export function toLegacyComponentSpecs(t: ComponentCategoryTokens): ComponentSpecs {
  const inputMd = t.input.sizes.md;
  const cardMd = t.card.sizes.md;
  return {
    button: {
      sizes: {
        sm: t.button.sizes.sm,
        md: t.button.sizes.md,
        lg: t.button.sizes.lg,
      },
      variants: ["primary", "secondary", "ghost"],
    },
    input: {
      fieldHeight: inputMd.height,
      fieldPaddingX: inputMd.paddingX,
      fieldRadius: inputMd.radius,
      labelFieldGap: "spacing.xxs",
      fieldHelperGap: "spacing.xxs",
      labelFont: inputMd.labelFont,
      valueFont: inputMd.valueFont,
      helperFont: inputMd.helperFont,
      iconSize: "spacing.md",
      states: ["default", "focus", "error", "disabled"],
    },
    card: {
      radius: cardMd.radius,
      contentPadding: cardMd.contentPadding,
      contentGap: cardMd.contentGap,
      shadow: cardMd.elevatedShadow,
      headerFont: cardMd.headerFont,
      bodyFont: cardMd.bodyFont,
      footerGap: "spacing.xs",
      variants: ["default", "compact"],
    },
    badge: {
      sizes: {
        sm: t.badge.sizes.sm,
        md: t.badge.sizes.md,
      },
      variants: ["default", "success", "error", "warning", "info"],
    },
    divider: {
      lineHeight: "1px",
      labelPaddingX: "spacing.sm",
      labelFont: "typography.caption-md",
    },
  };
}

/** Backward-compat entry point. The optional argument is ignored — the legacy
 *  archetype-driven branch was removed in Phase I per
 *  docs/research/component-category-proposal.md §11. */
export function generateComponents(_archetypeOrInput?: unknown, input?: ComponentInput): ComponentSpecs {
  // Two call shapes are tolerated for the migration window:
  //   generateComponents()                  — archetype removed, default knobs
  //   generateComponents(undefined, input)  — pass new ComponentInput through
  return toLegacyComponentSpecs(generateComponentCategory(input));
}
