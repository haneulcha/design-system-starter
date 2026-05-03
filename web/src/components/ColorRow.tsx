// web/src/components/ColorRow.tsx
//
// One row of color metadata: swatch + title + subtitle, with optional
// interaction. Domain-agnostic — the parent decides what title/subtitle mean
// (e.g. slot name + neutral ref, brand source + hex, etc.) and computes the
// `overridden` flag against its own baseline.

interface ColorRowProps {
  hex: string;
  title: string;
  subtitle?: string;
  overridden?: boolean;
  /** Editable mode: clicking the swatch opens the native color picker. */
  onPick?: (hex: string) => void;
  /** Selectable mode: the whole row is a button; ring shows when `selected`. */
  onSelect?: () => void;
  selected?: boolean;
}

export function ColorRow({
  hex,
  title,
  subtitle,
  overridden,
  onPick,
  onSelect,
  selected,
}: ColorRowProps) {
  const swatch = (
    <div
      className="w-8 h-8 rounded shrink-0 border border-neutral-200"
      style={{ background: hex }}
    />
  );

  const swatchEl = onPick ? (
    <label className="cursor-pointer shrink-0" title={hex}>
      <input
        type="color"
        value={hex}
        onChange={(e) => onPick(e.target.value)}
        className="sr-only"
      />
      {swatch}
    </label>
  ) : (
    swatch
  );

  const body = (
    <div className="flex-1 min-w-0">
      <div className="text-xs text-neutral-900 truncate flex items-center gap-1.5">
        <span className={selected ? "font-medium" : undefined}>{title}</span>
        {overridden && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-neutral-900 shrink-0"
            title="Override"
          />
        )}
      </div>
      {subtitle && (
        <div className="font-mono text-2xs text-neutral-500 truncate">
          {subtitle}
        </div>
      )}
    </div>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={[
          "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors",
          selected
            ? "bg-neutral-50 ring-1 ring-neutral-900"
            : "hover:bg-neutral-50",
        ].join(" ")}
      >
        {swatchEl}
        {body}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      {swatchEl}
      {body}
    </div>
  );
}
