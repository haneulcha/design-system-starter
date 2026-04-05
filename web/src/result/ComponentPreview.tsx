import type { DesignSystem, DesignTokens } from "@core/schema/types.js";
import { getArchetype } from "@core/schema/archetypes.js";

function resolveColor(tokens: DesignTokens, semanticKey: string): string {
  const primitiveRef = tokens.semantic[semanticKey];
  if (!primitiveRef) return "#cccccc";
  const parts = primitiveRef.split("-");
  const step = parts[parts.length - 1];
  const hue = parts.slice(0, -1).join("-");
  return tokens.primitive.colors[hue]?.[step]?.light ?? "#cccccc";
}

function resolveComponentColor(tokens: DesignTokens, componentPath: string): string {
  const [comp, variant, prop] = componentPath.split(".");
  const semanticKey = tokens.component[comp]?.[variant]?.[prop];
  if (!semanticKey || semanticKey === "transparent") return semanticKey ?? "#cccccc";
  return resolveColor(tokens, semanticKey);
}

function resolveSpacing(tokens: DesignTokens, tokenName: string): number {
  // tokenName like "spacing.md" → look up tokens.spacing["md"]
  const key = tokenName.split(".").pop() ?? tokenName;
  return tokens.spacing[key] ?? 8;
}

function resolveRadius(tokens: DesignTokens, tokenName: string): number {
  const key = tokenName.split(".").pop() ?? tokenName;
  return tokens.borderRadius[key] ?? 4;
}

export function ComponentPreview({
  system,
  tokens,
}: {
  system: DesignSystem;
  tokens: DesignTokens;
}) {
  const archetype = getArchetype(system.mood);
  const btnRadiusPx = archetype.buttonRadius;
  const cardRadiusPx = archetype.cardRadius;
  const inputRadiusPx = archetype.inputRadius;
  const pillRadiusPx = archetype.pillRadius;

  // Colors
  const brandPrimary = resolveColor(tokens, "brand/primary");
  const bgSubtle = resolveColor(tokens, "bg/subtle");
  const bgBase = resolveColor(tokens, "bg/base");
  const textPrimary = resolveColor(tokens, "text/primary");
  const textMuted = resolveColor(tokens, "text/muted");
  const borderDefault = resolveColor(tokens, "border/default");

  // Component token colors
  const btnPrimaryBg = resolveComponentColor(tokens, "button.primary.bg") !== "#cccccc"
    ? resolveComponentColor(tokens, "button.primary.bg")
    : brandPrimary;

  const inputBorder = resolveColor(tokens, "border/default");
  const inputFocusBorder = resolveColor(tokens, "brand/primary");
  const inputErrorBorder = resolveColor(tokens, "status/error") !== "#cccccc"
    ? resolveColor(tokens, "status/error")
    : "#ef4444";

  const successColor = resolveColor(tokens, "status/success") !== "#cccccc"
    ? resolveColor(tokens, "status/success")
    : "#22c55e";
  const errorColor = resolveColor(tokens, "status/error") !== "#cccccc"
    ? resolveColor(tokens, "status/error")
    : "#ef4444";
  const warningColor = resolveColor(tokens, "status/warning") !== "#cccccc"
    ? resolveColor(tokens, "status/warning")
    : "#f59e0b";
  const infoColor = resolveColor(tokens, "status/info") !== "#cccccc"
    ? resolveColor(tokens, "status/info")
    : "#3b82f6";

  const fontFamily = system.typography.families.primary
    ? `'${system.typography.families.primary}', system-ui, sans-serif`
    : "system-ui, sans-serif";

  const sectionClass = "mb-8";
  const labelClass = "text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3";

  return (
    <div style={{ fontFamily }}>
      <h2 className="text-lg font-semibold text-neutral-900 mb-6">Components</h2>

      {/* Buttons */}
      <div className={sectionClass}>
        <div className={labelClass}>Buttons</div>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Primary */}
          <button
            style={{
              backgroundColor: btnPrimaryBg,
              color: "#ffffff",
              borderRadius: btnRadiusPx,
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              fontFamily,
            }}
          >
            Primary
          </button>

          {/* Secondary */}
          <button
            style={{
              backgroundColor: bgSubtle,
              color: textPrimary,
              borderRadius: btnRadiusPx,
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: 500,
              border: `1px solid ${borderDefault}`,
              cursor: "pointer",
              fontFamily,
            }}
          >
            Secondary
          </button>

          {/* Ghost */}
          <button
            style={{
              backgroundColor: "transparent",
              color: brandPrimary,
              borderRadius: btnRadiusPx,
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: 500,
              border: `1px solid ${borderDefault}`,
              cursor: "pointer",
              fontFamily,
            }}
          >
            Ghost
          </button>

          {/* Disabled */}
          <button
            disabled
            style={{
              backgroundColor: bgSubtle,
              color: textMuted,
              borderRadius: btnRadiusPx,
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: 500,
              border: `1px solid ${borderDefault}`,
              cursor: "not-allowed",
              opacity: 0.6,
              fontFamily,
            }}
          >
            Disabled
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div className={sectionClass}>
        <div className={labelClass}>Inputs</div>
        <div className="grid grid-cols-2 gap-3">
          {/* Default */}
          <div>
            <div style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontFamily }}>Default</div>
            <input
              readOnly
              value="Input value"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: inputRadiusPx,
                border: `1px solid ${inputBorder}`,
                fontSize: 14,
                backgroundColor: bgBase,
                color: textPrimary,
                outline: "none",
                boxSizing: "border-box",
                fontFamily,
              }}
            />
          </div>

          {/* Focus */}
          <div>
            <div style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontFamily }}>Focus</div>
            <input
              readOnly
              value="Focused input"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: inputRadiusPx,
                border: `2px solid ${inputFocusBorder}`,
                fontSize: 14,
                backgroundColor: bgBase,
                color: textPrimary,
                outline: "none",
                boxSizing: "border-box",
                fontFamily,
              }}
            />
          </div>

          {/* Error */}
          <div>
            <div style={{ fontSize: 11, color: inputErrorBorder, marginBottom: 4, fontFamily }}>Error</div>
            <input
              readOnly
              value="Invalid value"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: inputRadiusPx,
                border: `1px solid ${inputErrorBorder}`,
                fontSize: 14,
                backgroundColor: bgBase,
                color: textPrimary,
                outline: "none",
                boxSizing: "border-box",
                fontFamily,
              }}
            />
            <div style={{ fontSize: 11, color: inputErrorBorder, marginTop: 4, fontFamily }}>
              This field has an error
            </div>
          </div>

          {/* Disabled */}
          <div>
            <div style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontFamily }}>Disabled</div>
            <input
              readOnly
              disabled
              value="Disabled input"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: inputRadiusPx,
                border: `1px solid ${borderDefault}`,
                fontSize: 14,
                backgroundColor: bgSubtle,
                color: textMuted,
                outline: "none",
                boxSizing: "border-box",
                cursor: "not-allowed",
                opacity: 0.7,
                fontFamily,
              }}
            />
          </div>
        </div>
      </div>

      {/* Card */}
      <div className={sectionClass}>
        <div className={labelClass}>Card</div>
        <div
          style={{
            borderRadius: cardRadiusPx,
            border: `1px solid ${borderDefault}`,
            backgroundColor: bgBase,
            padding: "20px 24px",
            maxWidth: 360,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: textPrimary,
              marginBottom: 8,
              fontFamily,
            }}
          >
            Card Title
          </div>
          <div
            style={{
              fontSize: 14,
              color: textMuted,
              lineHeight: 1.6,
              fontFamily,
            }}
          >
            This is a sample card component showing how content sits within the design system's card container.
          </div>
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: `1px solid ${borderDefault}`,
              display: "flex",
              gap: 8,
            }}
          >
            <button
              style={{
                backgroundColor: btnPrimaryBg,
                color: "#ffffff",
                borderRadius: btnRadiusPx,
                padding: "6px 16px",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                fontFamily,
              }}
            >
              Action
            </button>
            <button
              style={{
                backgroundColor: "transparent",
                color: textMuted,
                borderRadius: btnRadiusPx,
                padding: "6px 16px",
                fontSize: 13,
                fontWeight: 500,
                border: `1px solid ${borderDefault}`,
                cursor: "pointer",
                fontFamily,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className={sectionClass}>
        <div className={labelClass}>Badges</div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Default", bg: bgSubtle, text: textPrimary, border: borderDefault },
            { label: "Success", bg: `${successColor}18`, text: successColor, border: `${successColor}40` },
            { label: "Error", bg: `${errorColor}18`, text: errorColor, border: `${errorColor}40` },
            { label: "Warning", bg: `${warningColor}18`, text: warningColor, border: `${warningColor}40` },
            { label: "Info", bg: `${infoColor}18`, text: infoColor, border: `${infoColor}40` },
          ].map(({ label, bg, text, border }) => (
            <span
              key={label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 10px",
                borderRadius: pillRadiusPx,
                backgroundColor: bg,
                color: text,
                border: `1px solid ${border}`,
                fontSize: 12,
                fontWeight: 500,
                fontFamily,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className={sectionClass}>
        <div className={labelClass}>Divider</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: borderDefault }} />
          <span
            style={{
              fontSize: 12,
              color: textMuted,
              fontWeight: 500,
              fontFamily,
              whiteSpace: "nowrap",
            }}
          >
            Section label
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: borderDefault }} />
        </div>
      </div>
    </div>
  );
}
