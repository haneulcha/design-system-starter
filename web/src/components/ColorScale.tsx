import type { ColorScales } from "@core/schema/types.js";
import { formatOklch } from "@core/generator/color.js";

function getStepKeys(scales: ColorScales): string[] {
  const first = Object.values(scales)[0];
  if (!first) return [];
  return Object.keys(first).sort((a, b) => Number(a) - Number(b));
}

export function ColorScale({ scales }: { scales: ColorScales }) {
  const steps = getStepKeys(scales);

  return (
    <div className="space-y-3">
      {/* Step header row */}
      <div className="flex gap-0.5">
        {steps.map((step) => (
          <div key={step} className="flex-1 text-center text-[10px] font-mono text-neutral-400">
            {step}
          </div>
        ))}
      </div>

      {/* Color rows */}
      {Object.entries(scales).map(([hue, scale]) => (
        <div key={hue}>
          <div className="text-xs font-medium text-neutral-500 mb-1 capitalize">{hue}</div>
          <div className="flex gap-0.5">
            {Object.entries(scale)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([step, vals]) => (
                <div
                  key={step}
                  className="flex-1 h-9 first:rounded-l last:rounded-r relative group"
                  style={{ backgroundColor: formatOklch(vals.light) }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/70 text-white leading-tight">
                      {step}
                    </span>
                    <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-black/70 text-white leading-tight mt-0.5">
                      {formatOklch(vals.light)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
