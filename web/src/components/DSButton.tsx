import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { getArchetype } from "@core/schema/archetypes.js";
import { resolveColor, resolveComponentColor, resolveShadow, buildFontFamily } from "../lib/tokens";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface DSButtonProps {
  variant?: ButtonVariant;
  disabled?: boolean;
  children: React.ReactNode;
  tokens: DesignTokens;
  system: DesignSystem;
}

function computeStyles(
  variant: ButtonVariant,
  disabled: boolean,
  tokens: DesignTokens,
  system: DesignSystem,
) {
  const archetype = getArchetype(system.mood);
  const fontFamily = buildFontFamily(system);
  const borderRadius = archetype.buttonRadius;
  const shadow = resolveShadow(archetype.shadowIntensity);

  const brandPrimary = resolveComponentColor(tokens, "button.primary.bg");
  const bgSubtle = resolveColor(tokens, "bg/subtle");
  const textPrimary = resolveColor(tokens, "text/primary");
  const textMuted = resolveColor(tokens, "text/muted");
  const borderDefault = resolveColor(tokens, "border/default");

  const base = {
    borderRadius,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 500,
    fontFamily,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };

  if (disabled) {
    return {
      ...base,
      backgroundColor: bgSubtle,
      color: textMuted,
      border: `1px solid ${borderDefault}`,
    };
  }

  switch (variant) {
    case "primary":
      return {
        ...base,
        backgroundColor: brandPrimary,
        color: "white",
        border: "none",
        boxShadow: shadow,
      };
    case "secondary":
      return {
        ...base,
        backgroundColor: `color-mix(in oklch, ${brandPrimary} 10%, transparent)`,
        color: brandPrimary,
        border: "none",
        boxShadow: shadow,
      };
    case "ghost":
      return {
        ...base,
        backgroundColor: "transparent",
        color: brandPrimary,
        border: `1.5px solid ${brandPrimary}`,
      };
  }
}

export function DSButton({
  variant = "primary",
  disabled = false,
  children,
  tokens,
  system,
}: DSButtonProps) {
  const styles = computeStyles(variant, disabled, tokens, system);

  return (
    <button style={styles} disabled={disabled}>
      {children}
    </button>
  );
}
