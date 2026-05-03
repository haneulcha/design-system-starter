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
      {stops.map(({ key, hex, overridden }) => {
        const swatch = (
          <div
            className="h-9 rounded-sm border border-neutral-200"
            style={{ background: hex }}
          />
        );
        const caption = (
          <div className="text-[8px] font-mono text-center text-neutral-500 mt-0.5">
            {key}
            {overridden ? "●" : ""}
          </div>
        );
        if (!onPick) {
          return (
            <div key={key} title={`${key} · ${hex}`}>
              {swatch}
              {caption}
            </div>
          );
        }
        return (
          <label
            key={key}
            className="block cursor-pointer"
            title={`${key} · ${hex}`}
          >
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
