import type { ColorScales } from "../hooks/useGenerator";

export function ColorPreview({ scales }: { scales: ColorScales }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Color Scales</h2>
      <div className="space-y-3">
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
                    style={{ backgroundColor: vals.light }}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/70 text-white leading-tight">
                        {step}
                      </span>
                      <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-black/70 text-white leading-tight mt-0.5">
                        {vals.light}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
