import type { ResponsiveSystem } from "../schema/types.js";

export function generateResponsive(): ResponsiveSystem {
  return {
    breakpoints: [
      { name: "Mobile", minWidth: "0px", maxWidth: "639px", changes: "Single column, stacked layout, condensed spacing" },
      { name: "Tablet", minWidth: "640px", maxWidth: "1023px", changes: "2-column grids, expanded padding, side navigation may appear" },
      { name: "Desktop", minWidth: "1024px", maxWidth: "1399px", changes: "Full layout, 3-column grids, horizontal navigation" },
      { name: "Large Desktop", minWidth: "1400px", maxWidth: "---", changes: "Centered content, generous margins, max content width" },
    ],
    touchTarget: "44px minimum height and width for all interactive elements",
    collapsingStrategy: [
      "Hero: display text scales down proportionally, maintains letter-spacing ratio",
      "Navigation: horizontal links collapse to hamburger menu at tablet breakpoint",
      "Feature cards: 3-column to 2-column to single column stacked",
      "Section spacing: desktop values multiplied by 0.6 on mobile",
      "Footer: multi-column grid collapses to single stacked column",
    ],
    imageBehavior: [
      "Maintain aspect ratio at all breakpoints",
      "Full-width on mobile, contained with max-width on desktop",
      "Lazy loading for images below the fold",
    ],
  };
}
