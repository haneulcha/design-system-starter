// src/generator/components.ts

import type { ArchetypePreset, ColorPalette, ComponentSpecs } from "../schema/types.js";

export function generateComponents(palette: ColorPalette, archetype: ArchetypePreset): ComponentSpecs {
  const primaryColor = palette.primary[0].hex;
  const primaryDark = palette.primary[1].hex;
  const surfaceMuted = palette.surface[2].hex;
  const surfaceSubtle = palette.surface[1].hex;
  const borderColor = palette.border[0].hex;
  const neutralDark = palette.neutral[2].hex;
  const surfaceBase = palette.surface[0].hex;

  const buttons = [
    {
      name: "primary",
      background: primaryColor,
      text: "#ffffff",
      padding: "10px 20px",
      radius: archetype.buttonRadius,
      shadow: "none",
      hoverBg: primaryDark,
      use: "Primary call-to-action",
    },
    {
      name: "secondary",
      background: surfaceMuted,
      text: neutralDark,
      padding: "10px 20px",
      radius: archetype.buttonRadius,
      shadow: "none",
      hoverBg: palette.surface[3].hex,
      use: "Secondary actions and less prominent CTAs",
    },
    {
      name: "ghost",
      background: "transparent",
      text: primaryColor,
      padding: "10px 20px",
      radius: archetype.buttonRadius,
      shadow: `0 0 0 1px ${borderColor}`,
      hoverBg: surfaceSubtle,
      use: "Tertiary actions and inline buttons",
    },
  ];

  const cards = {
    background: surfaceSubtle,
    border: `1px solid ${borderColor}`,
    radius: archetype.cardRadius,
    shadow: "0 1px 3px rgba(0,0,0,0.06)",
    padding: "24px",
    hoverEffect: "box-shadow 0.2s ease",
  };

  const inputs = {
    background: "#ffffff",
    border: `1px solid ${borderColor}`,
    radius: archetype.inputRadius,
    focusBorder: primaryColor,
    focusShadow: `0 0 0 3px ${primaryColor}33`,
    padding: "10px 14px",
    textColor: neutralDark,
    placeholderColor: palette.neutral[5].hex,
  };

  const navigation = {
    background: surfaceBase,
    position: "sticky",
    linkSize: "14px",
    linkWeight: archetype.fontWeights.ui,
    linkColor: neutralDark,
    activeIndicator: primaryColor,
  };

  return { buttons, cards, inputs, navigation };
}
