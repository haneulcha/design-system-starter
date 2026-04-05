import { useColorScales } from "../hooks/useGenerator";
import type { ColorCharacter } from "../hooks/useGenerator";

export function StepColor({
  value,
  onChange,
  character,
  onCharacterChange,
}: {
  value: string;
  onChange: (v: string) => void;
  character: ColorCharacter;
  onCharacterChange: (c: ColorCharacter) => void;
}) {
  const scales = useColorScales(value, character);

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">
        Pick your primary color
      </h2>
      <p className="text-neutral-500 mb-8">
        Your brand scale and neutral gray. Status colors will appear in the next step.
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

      <div className="flex gap-3 mb-10">
        {(["vivid", "balanced", "muted"] as const).map((char) => (
          <button
            key={char}
            onClick={() => onCharacterChange(char)}
            className={`flex-1 p-3 rounded-lg border text-left transition-all ${
              character === char
                ? "border-neutral-900 ring-1 ring-neutral-900"
                : "border-neutral-200 hover:border-neutral-400"
            }`}
          >
            <div className="text-sm font-medium capitalize">{char}</div>
            <div className="text-xs text-neutral-500 mt-1">
              {char === "vivid" && "Bold, assertive colors"}
              {char === "balanced" && "Present but not aggressive"}
              {char === "muted" && "Subtle, sophisticated"}
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {Object.entries(scales).filter(([hue]) => {
          return hue === "gray" || !["red", "green", "amber", "blue"].includes(hue);
        }).map(([hue, scale]) => (
          <div key={hue}>
            <div className="text-xs font-medium text-neutral-500 mb-1 capitalize">
              {hue}
            </div>
            <div className="flex gap-0.5">
              {Object.entries(scale)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([step, vals]) => (
                  <div
                    key={step}
                    className="flex-1 h-8 first:rounded-l last:rounded-r relative group"
                    style={{ backgroundColor: vals.light }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/70 text-white">
                        {step}
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
