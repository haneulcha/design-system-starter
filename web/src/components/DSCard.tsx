import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import type { CardSurface } from "@core/schema/components.js";
import { resolveColor, buildFontFamily } from "../lib/tokens";

interface DSCardProps {
  children: React.ReactNode;
  image?: { src: string; alt: string };
  tokens: DesignTokens;
  system: DesignSystem;
}

function surfaceStyles(
  surface: CardSurface,
  tokens: DesignTokens,
): { backgroundColor: string; border: string; boxShadow: string } {
  const bgBase = resolveColor(tokens, "bg/canvas");
  const bgSoft = resolveColor(tokens, "bg/soft");
  const borderDefault = resolveColor(tokens, "bg/hairline");
  const raised = tokens.elevation.raised ?? "none";

  switch (surface) {
    case "outlined":
      return { backgroundColor: bgBase, border: `1px solid ${borderDefault}`, boxShadow: "none" };
    case "elevated":
      return { backgroundColor: bgBase, border: "none", boxShadow: raised };
    case "filled":
      return { backgroundColor: bgSoft, border: "none", boxShadow: "none" };
  }
}

function computeStyles(
  tokens: DesignTokens,
  system: DesignSystem,
  surface: CardSurface,
) {
  const fontFamily = buildFontFamily(system);
  const surf = surfaceStyles(surface, tokens);

  return {
    container: {
      borderRadius: tokens.borderRadius.card,
      overflow: "hidden" as const,
      fontFamily,
      ...surf,
    },
    image: { width: "100%", height: 160, objectFit: "cover" as const, display: "block" as const },
    body: { padding: "16px 20px" },
  };
}

export function DSCard({ children, image, tokens, system }: DSCardProps) {
  const styles = computeStyles(tokens, system, system.componentTokens.knobs.cardSurface);
  return (
    <div style={styles.container}>
      {image && <img src={image.src} alt={image.alt} style={styles.image} />}
      <div style={styles.body}>{children}</div>
    </div>
  );
}
