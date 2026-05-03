import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { resolveColor, buildFontFamily } from "../lib/tokens";

type BadgeVariant = "default" | "success" | "error" | "warning" | "info";

interface DSBadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  tokens: DesignTokens;
  system: DesignSystem;
}

function computeStyles(variant: BadgeVariant, tokens: DesignTokens, system: DesignSystem) {
  const fontFamily = buildFontFamily(system);
  const bgSubtle = resolveColor(tokens, "bg/soft");
  const textPrimary = resolveColor(tokens, "text/ink");
  const borderDefault = resolveColor(tokens, "bg/hairline");

  const base = {
    display: "inline-flex" as const, alignItems: "center" as const,
    padding: "3px 10px",
    borderRadius: tokens.borderRadius.pill,
    fontSize: 12, fontWeight: 500, fontFamily,
  };

  if (variant === "default") {
    return { ...base, backgroundColor: bgSubtle, color: textPrimary, border: `1px solid ${borderDefault}` };
  }

  const bgKey = `status/${variant}-bg` as const;
  const textKey = `status/${variant}-text` as const;
  const bg = resolveColor(tokens, bgKey);
  return {
    ...base,
    backgroundColor: bg,
    color: resolveColor(tokens, textKey),
    border: `1px solid ${bg}`,
  };
}

export function DSBadge({ variant = "default", children, tokens, system }: DSBadgeProps) {
  const styles = computeStyles(variant, tokens, system);
  return <span style={styles}>{children}</span>;
}
