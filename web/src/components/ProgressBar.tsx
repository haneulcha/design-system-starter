const STEPS = ["Archetype", "Font"];

export function ProgressBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              i <= current
                ? "bg-neutral-900 text-white"
                : "bg-neutral-200 text-neutral-500"
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-sm hidden sm:inline ${
              i <= current ? "text-neutral-900" : "text-neutral-400"
            }`}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <div className="w-8 h-px bg-neutral-300 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}
