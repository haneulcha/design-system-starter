import { useEffect } from "react";
import type { DesignSystem } from "@core/schema/types.js";
import { loadGoogleFont, parsePx, weightLabel } from "../lib/tokens";

export function TypeScale({ system }: { system: DesignSystem }) {
  const primaryFont = system.typography.families.primary;

  useEffect(() => {
    if (primaryFont) loadGoogleFont(primaryFont);
  }, [primaryFont]);

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
          Type Scale — {primaryFont}
        </span>
      </div>
      <div className="divide-y divide-neutral-100">
        {system.typography.hierarchy.map((entry) => {
          const px = parsePx(entry.size);
          return (
            <div key={entry.role} className="px-5 py-3 flex items-baseline gap-4">
              <div className="shrink-0" style={{ width: 120 }}>
                <div
                  className="text-neutral-400 uppercase tracking-wide"
                  style={{ fontSize: 11 }}
                >
                  {entry.role}
                </div>
                <div className="text-neutral-400 mt-0.5" style={{ fontSize: 10 }}>
                  {px}px / {weightLabel(entry.weight)}
                </div>
              </div>
              <div
                className="truncate text-neutral-900"
                style={{
                  fontFamily: `'${entry.font}', system-ui, sans-serif`,
                  fontSize: Math.min(px, 64),
                  fontWeight: entry.weight,
                  letterSpacing: entry.letterSpacing,
                  lineHeight: entry.lineHeight,
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
