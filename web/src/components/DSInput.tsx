import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { resolveColor, buildFontFamily } from "../lib/tokens";

type InputState = "default" | "focus" | "error" | "disabled";

interface DSInputProps {
  state?: InputState;
  value?: string;
  tokens: DesignTokens;
  system: DesignSystem;
}

function computeStyles(state: InputState, tokens: DesignTokens, system: DesignSystem) {
  const fontFamily = buildFontFamily(system);
  const borderRadius = tokens.borderRadius.input;

  const bgBase = resolveColor(tokens, "bg/canvas");
  const bgSubtle = resolveColor(tokens, "bg/soft");
  const textPrimary = resolveColor(tokens, "text/ink");
  const textMuted = resolveColor(tokens, "text/muted");
  const borderDefault = resolveColor(tokens, "bg/hairline");
  const brandPrimary = resolveColor(tokens, "accent/primary");
  const errorColor = resolveColor(tokens, "status/error-text");

  const base = {
    width: "100%", padding: "8px 12px", borderRadius, fontSize: 14,
    outline: "none", boxSizing: "border-box" as const, fontFamily,
  };

  switch (state) {
    case "focus":    return { ...base, border: `2px solid ${brandPrimary}`, backgroundColor: bgBase, color: textPrimary };
    case "error":    return { ...base, border: `1px solid ${errorColor}`, backgroundColor: bgBase, color: textPrimary };
    case "disabled": return { ...base, border: `1px solid ${borderDefault}`, backgroundColor: bgSubtle, color: textMuted, cursor: "not-allowed", opacity: 0.7 };
    default:         return { ...base, border: `1px solid ${borderDefault}`, backgroundColor: bgBase, color: textPrimary };
  }
}

export function DSInput({ state = "default", value = "Input value", tokens, system }: DSInputProps) {
  const styles = computeStyles(state, tokens, system);
  return <input readOnly disabled={state === "disabled"} value={value} style={styles} />;
}
