import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { resolveColor, resolveColorAlpha, buildFontFamily } from "../lib/tokens";

type BadgeVariant = "default" | "success" | "error" | "warning" | "info";

interface DSBadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  tokens: DesignTokens;
  system: DesignSystem;
}

function computeStyles(variant: BadgeVariant, tokens: DesignTokens, system: DesignSystem) {
  const fontFamily = buildFontFamily(system);
  const bgSubtle = resolveColor(tokens, "bg/subtle");
  const textPrimary = resolveColor(tokens, "text/primary");
  const borderDefault = resolveColor(tokens, "border/default");

  const base = {
    display: "inline-flex" as const, alignItems: "center" as const,
    padding: "3px 10px",
    borderRadius: tokens.borderRadius.pill,
    fontSize: 12, fontWeight: 500, fontFamily,
  };

  if (variant === "default") {
    return { ...base, backgroundColor: bgSubtle, color: textPrimary, border: `1px solid ${borderDefault}` };
  }

  const statusKey = `status/${variant}` as const;
  return {
    ...base,
    backgroundColor: resolveColorAlpha(tokens, statusKey, 0.09),
    color: resolveColor(tokens, statusKey),
    border: `1px solid ${resolveColorAlpha(tokens, statusKey, 0.25)}`,
  };
}

export function DSBadge({ variant = "default", children, tokens, system }: DSBadgeProps) {
  const styles = computeStyles(variant, tokens, system);
  return <span style={styles}>{children}</span>;
}
