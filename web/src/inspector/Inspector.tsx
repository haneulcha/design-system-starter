import { useState } from "react";
import type { WizardState } from "../hooks/useGenerator";
import { CategoryTabs, type InspectorCategory } from "./CategoryTabs";
import { ColorPanel } from "./panels/ColorPanel";
import { TypographyPanel } from "./panels/TypographyPanel";
import { SpacingPanel } from "./panels/SpacingPanel";
import { RadiusPanel } from "./panels/RadiusPanel";
import { ElevationPanel } from "./panels/ElevationPanel";
import { ComponentPanel } from "./panels/ComponentPanel";

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
          {active === "color" && (
            <ColorPanel state={state} onChange={onChange} />
          )}
          {active === "typography" && (
            <TypographyPanel state={state} onChange={onChange} />
          )}
          {active === "spacing" && (
            <SpacingPanel state={state} onChange={onChange} />
          )}
          {active === "radius" && (
            <RadiusPanel state={state} onChange={onChange} />
          )}
          {active === "elevation" && (
            <ElevationPanel state={state} onChange={onChange} />
          )}
          {active === "component" && (
            <ComponentPanel state={state} onChange={onChange} />
          )}
        </div>
      </div>
    </aside>
  );
}
