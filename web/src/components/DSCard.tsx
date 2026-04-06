import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { getArchetype } from "@core/schema/archetypes.js";
import { resolveColor, resolveShadow, buildFontFamily } from "../lib/tokens";

interface DSCardProps {
  children: React.ReactNode;
  tokens: DesignTokens;
  system: DesignSystem;
}

function computeStyles(tokens: DesignTokens, system: DesignSystem) {
  const archetype = getArchetype(system.mood);
  const fontFamily = buildFontFamily(system);

  const bgBase = resolveColor(tokens, "bg/base");
  const borderDefault = resolveColor(tokens, "border/default");
  const shadow = resolveShadow(archetype.shadowIntensity);

  return {
    container: {
      borderRadius: archetype.cardRadius,
      border: `1px solid ${borderDefault}`,
      backgroundColor: bgBase,
      boxShadow: shadow,
      padding: "16px 20px",
      fontFamily,
    },
  };
}

export function DSCard({ children, tokens, system }: DSCardProps) {
  const { container } = computeStyles(tokens, system);

  return <div style={container}>{children}</div>;
}
