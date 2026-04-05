import type { ArchetypePreset, ColorScales, ElevationSystem } from "../schema/types.js";
import { oklchToHex } from "../generator/color.js";

export function generateElevation(archetype: ArchetypePreset, scales: ColorScales): ElevationSystem {
  const borderColor = scales.gray?.["300"]?.light;
  const border = borderColor ? oklchToHex(borderColor) : "#d4d4d4";
  const opMap = {
    whisper: { a: "0.04", b: "0.04", c: "0.06", d: "0.08" },
    subtle:  { a: "0.06", b: "0.06", c: "0.10", d: "0.15" },
    medium:  { a: "0.08", b: "0.08", c: "0.12", d: "0.20" },
    dramatic:{ a: "0.10", b: "0.12", c: "0.20", d: "0.35" },
  };
  const o = opMap[archetype.shadowIntensity];

  const philMap: Record<string, string> = {
    whisper: "Shadows are almost imperceptible — structure comes from spacing and ring borders, not elevation.",
    subtle: "Soft, warm shadows that suggest depth without demanding attention. Elevation is felt, not seen.",
    medium: "Balanced shadow system providing clear depth hierarchy. Cool-tinted shadows reinforce precision.",
    dramatic: "Bold, confident shadows giving elements real physical presence. Elevation is a primary design tool.",
  };

  return {
    levels: [
      { name: "Flat", level: 0, shadow: "none", use: "Page background, inline text" },
      { name: "Ring", level: 1, shadow: `${border} 0px 0px 0px 1px`, use: "Borders, card outlines, dividers" },
      { name: "Raised", level: 2, shadow: `rgba(0,0,0,${o.a}) 0px 1px 2px, rgba(0,0,0,${o.a}) 0px 1px 3px`, use: "Cards, buttons on hover" },
      { name: "Floating", level: 3, shadow: `rgba(0,0,0,${o.b}) 0px 4px 8px, rgba(0,0,0,${o.a}) 0px 2px 4px`, use: "Dropdowns, popovers, tooltips" },
      { name: "Overlay", level: 4, shadow: `rgba(0,0,0,${o.d}) 0px 8px 24px, rgba(0,0,0,${o.c}) 0px 4px 8px`, use: "Modals, dialogs, command palettes" },
    ],
    philosophy: philMap[archetype.shadowIntensity],
  };
}
