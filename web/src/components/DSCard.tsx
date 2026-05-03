import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { resolveColor, buildFontFamily } from "../lib/tokens";

interface DSCardProps {
  children: React.ReactNode;
  image?: { src: string; alt: string };
  tokens: DesignTokens;
  system: DesignSystem;
}

function computeStyles(tokens: DesignTokens, system: DesignSystem) {
  const fontFamily = buildFontFamily(system);
  const bgBase = resolveColor(tokens, "bg/canvas");
  const borderDefault = resolveColor(tokens, "bg/hairline");
  const shadow = tokens.elevation.raised ?? "none";

  return {
    container: {
      borderRadius: tokens.borderRadius.card,
      border: `1px solid ${borderDefault}`,
      backgroundColor: bgBase,
      boxShadow: shadow,
      overflow: "hidden" as const,
      fontFamily,
    },
    image: { width: "100%", height: 160, objectFit: "cover" as const, display: "block" as const },
    body: { padding: "16px 20px" },
  };
}

export function DSCard({ children, image, tokens, system }: DSCardProps) {
  const styles = computeStyles(tokens, system);
  return (
    <div style={styles.container}>
      {image && <img src={image.src} alt={image.alt} style={styles.image} />}
      <div style={styles.body}>{children}</div>
    </div>
  );
}
