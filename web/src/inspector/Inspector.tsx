import { useState } from "react";
import type { WizardState } from "../hooks/useGenerator";
import { CategoryTabs, type InspectorCategory } from "./CategoryTabs";
import { RadiusPanel } from "./panels/RadiusPanel";

interface InspectorProps {
  state: WizardState;
  onChange: (partial: Partial<WizardState>) => void;
}

export function Inspector({ state, onChange }: InspectorProps) {
  const [active, setActive] = useState<InspectorCategory>("radius");

  return (
    <aside className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-neutral-200 lg:h-screen lg:sticky lg:top-0 lg:overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Inspector
        </div>
        <CategoryTabs active={active} onChange={setActive} />
        <div className="pt-2">
          {active === "radius" && <RadiusPanel state={state} onChange={onChange} />}
          {active !== "radius" && (
            <div className="text-[12px] text-neutral-400 italic px-1 py-8 text-center">
              Coming soon — this category panel ships in a follow-up slice.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
