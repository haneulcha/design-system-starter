import type { ColorScales } from "@core/schema/types.js";
import { ColorScale } from "../components/ColorScale";

export function StepColor({
  value,
  onChange,
  scales,
}: {
  value: string;
  onChange: (v: string) => void;
  scales: ColorScales | null;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">
        Pick your primary color
      </h2>
      <p className="text-neutral-500 mb-8">
        Everything else is derived from this single color.
      </p>

      <div className="flex items-center gap-4 mb-8">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 rounded cursor-pointer border-0 p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
            else if (v.length <= 7) onChange(v);
          }}
          className="font-mono text-sm px-3 py-2 border border-neutral-300 rounded w-28"
          placeholder="#5e6ad2"
        />
      </div>

      {scales && <ColorScale scales={scales} />}
    </div>
  );
}
