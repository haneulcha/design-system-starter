export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1"
    >
      <span>↺</span> Reset to preset
    </button>
  );
}
