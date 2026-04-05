import { useEffect } from "react";
import type { DesignSystem } from "@core/schema/types.js";

function loadGoogleFont(family: string) {
  const id = `gf-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

function parsePx(size: string): number {
  return parseInt(size, 10);
}

function weightLabel(weight: number): string {
  const map: Record<number, string> = {
    100: "Thin",
    200: "Extra Light",
    300: "Light",
    400: "Regular",
    500: "Medium",
    600: "Semi Bold",
    700: "Bold",
    800: "Extra Bold",
    900: "Black",
  };
  return map[weight] ?? String(weight);
}

export function TypePreview({ system }: { system: DesignSystem }) {
  const primaryFont = system.typography.families.primary;

  useEffect(() => {
    if (primaryFont) loadGoogleFont(primaryFont);
  }, [primaryFont]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Typography</h2>
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
    </div>
  );
}
