// web/src/color-palette/AccentInput.tsx
import { OklchPicker } from "../components/OklchPicker";

export function AccentInput({
  hex, onChange,
}: { readonly hex: string; readonly onChange: (hex: string) => void }) {
  return (
    <div className="flex items-start gap-6">
      <OklchPicker hex={hex} onChange={onChange} />
      <label className="text-xs text-neutral-500">
        <span className="block mb-1">액센트 hex</span>
        <input
          aria-label="액센트 hex"
          value={hex}
          onChange={(e) => {
            const v = e.target.value;
            // 형식 위반은 거부하고 마지막 유효값을 유지한다 (기존 빌더와 같은 동작).
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toLowerCase());
          }}
          className="border border-neutral-300 rounded px-2 py-1 text-sm font-mono w-28"
        />
      </label>
    </div>
  );
}
