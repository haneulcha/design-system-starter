import type { DesignTokens, DesignSystem } from "@core/schema/types.js";
import { resolveColor, buildFontFamily } from "../lib/tokens";

interface DSDividerProps {
  label?: string;
  tokens: DesignTokens;
  system: DesignSystem;
}

function computeStyles(tokens: DesignTokens, system: DesignSystem) {
  const fontFamily = buildFontFamily(system);
  const borderDefault = resolveColor(tokens, "border/default");
  const textMuted = resolveColor(tokens, "text/muted");

  return {
    line: { flex: 1, height: 1, backgroundColor: borderDefault },
    label: {
      fontSize: 12,
      color: textMuted,
      fontWeight: 500,
      fontFamily,
      whiteSpace: "nowrap" as const,
    },
  };
}

export function DSDivider({ label, tokens, system }: DSDividerProps) {
  const styles = computeStyles(tokens, system);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={styles.line} />
      {label && <span style={styles.label}>{label}</span>}
      {label && <div style={styles.line} />}
    </div>
  );
}
