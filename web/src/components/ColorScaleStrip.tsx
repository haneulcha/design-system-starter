// web/src/components/ColorScaleStrip.tsx
//
// Horizontal swatch strip for any ordered color scale (e.g. the 9-stop neutral
// base scale). Read-only by default; pass `onPick` to make each stop editable
// via the native color picker.

export interface ColorScaleStop {
  /** Stable key, also rendered as the small caption beneath the swatch. */
  key: string;
  hex: string;
  overridden?: boolean;
  /** Highlighted with a distinct ring — e.g. the stop that equals the picked
   *  anchor color verbatim in the lab's algorithm comparison. */
  anchor?: boolean;
}

interface ColorScaleStripProps {
  stops: readonly ColorScaleStop[];
  onPick?: (key: string, hex: string) => void;
}

export function ColorScaleStrip({ stops, onPick }: ColorScaleStripProps) {
  return (
    <div
      className="grid gap-0.5"
      style={{ gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))` }}
    >
      {stops.map(({ key, hex, overridden, anchor }) => {
        const swatch = (
          <div
            className={
              anchor
                ? "h-9 rounded-sm ring-1 ring-offset-1 ring-neutral-900"
                : "h-9 rounded-sm border border-neutral-200"
            }
            style={{ background: hex }}
          />
        );
        const caption = (
          <div className="text-[8px] font-mono text-center text-neutral-500 mt-0.5">
            {key}
            {overridden ? "●" : ""}
          </div>
        );
        const title = `${key} · ${hex}${anchor ? " · 선택한 색 그대로" : ""}`;
        if (!onPick) {
          return (
            <div key={key} title={title}>
              {swatch}
              {caption}
            </div>
          );
        }
        return (
          <label key={key} className="block cursor-pointer" title={title}>
            <input
              type="color"
              value={hex}
              onChange={(e) => onPick(key, e.target.value)}
              className="sr-only"
            />
            {swatch}
            {caption}
          </label>
        );
      })}
    </div>
  );
}
