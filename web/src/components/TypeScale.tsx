import { useEffect } from "react";
import type { DesignSystem } from "@core/schema/types.js";
import { loadGoogleFont, primaryFontName, weightLabel } from "../lib/tokens";

const DISPLAY_KEYS = [
  "heading.xl", "heading.lg", "heading.md", "heading.sm", "heading.xs",
  "body.lg", "body.md", "body.sm",
  "caption.md", "caption.sm",
] as const;

export function TypeScale({ system }: { system: DesignSystem }) {
  const primaryFont = primaryFontName(system);

  useEffect(() => {
    if (primaryFont) loadGoogleFont(primaryFont);
  }, [primaryFont]);

  const profiles = system.typographyTokens.profiles;

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
          Type Scale — {primaryFont}
        </span>
      </div>
      <div className="divide-y divide-neutral-100">
        {DISPLAY_KEYS.filter((k) => profiles[k]).map((key) => {
          const t = profiles[key];
          return (
            <div key={key} className="px-5 py-3 flex items-baseline gap-4">
              <div className="shrink-0" style={{ width: 120 }}>
                <div className="text-neutral-400 uppercase tracking-wide" style={{ fontSize: 11 }}>
                  {key}
                </div>
                <div className="text-neutral-400 mt-0.5" style={{ fontSize: 10 }}>
                  {t.size}px / {weightLabel(t.weight)}
                </div>
              </div>
              <div
                className="truncate text-neutral-900"
                style={{
                  fontFamily: t.fontFamily,
                  fontSize: Math.min(t.size, 64),
                  fontWeight: t.weight,
                  letterSpacing: t.letterSpacing,
                  lineHeight: t.lineHeight,
                }}
              >
                The quick brown fox
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
