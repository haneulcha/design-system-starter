import type { ReactNode } from "react";

interface KnobRowProps {
  selected: boolean;
  isPreset?: boolean;
  isDefault?: boolean;
  onClick: () => void;
  label: string;
  tokens: ReactNode;
}

export function KnobRow({ selected, isPreset, isDefault, onClick, label, tokens }: KnobRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-left",
        selected
          ? "border-[1.5px] border-neutral-900 bg-neutral-50"
          : "border border-neutral-200 bg-white hover:border-neutral-400",
      ].join(" ")}
    >
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className={selected ? "text-neutral-900 font-medium text-[13px]" : "text-neutral-700 text-[13px]"}>
          {label}
        </span>
        {selected && isPreset && (
          <span className="text-[9px] text-neutral-400 uppercase tracking-wider">preset</span>
        )}
        {selected && isDefault && (
          <span className="text-[9px] text-neutral-400 uppercase tracking-wider">default</span>
        )}
      </div>
      <div className="font-mono text-[10px] text-neutral-500 tabular-nums shrink-0">{tokens}</div>
    </button>
  );
}
