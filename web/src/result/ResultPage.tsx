import type { WizardState } from "../hooks/useGenerator";
export function ResultPage({ state, onChange, onBack }: { state: WizardState; onChange: (p: Partial<WizardState>) => void; onBack: () => void }) {
  return (
    <div className="p-8">
      <button onClick={onBack} className="text-sm text-neutral-500 hover:text-neutral-900 mb-4">← Back to wizard</button>
      <div className="text-neutral-500">ResultPage — {state.mood} / {state.primaryColor} / {state.fontFamily}</div>
    </div>
  );
}
