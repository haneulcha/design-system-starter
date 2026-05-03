import { useState } from "react";
import { ProgressBar } from "./components/ProgressBar";
import { StepArchetype } from "./steps/StepArchetype";
import { StepFont } from "./steps/StepFont";
import { ResultPage } from "./result/ResultPage";
import { DEFAULT_STATE, useGenerateResult, type WizardState, type PresetName } from "./hooks/useGenerator";

type Screen = "wizard" | "result";

const STEP_COUNT = 2;

export function App() {
  const [screen, setScreen] = useState<Screen>("wizard");
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  const result = useGenerateResult(state);

  const update = (partial: Partial<WizardState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  if (screen === "result") {
    return (
      <ResultPage
        state={state}
        result={result}
        onChange={update}
        onBack={() => { setScreen("wizard"); setStep(STEP_COUNT - 1); }}
      />
    );
  }

  const next = () => {
    if (step < STEP_COUNT - 1) setStep(step + 1);
    else setScreen("result");
  };
  const back = () => { if (step > 0) setStep(step - 1); };

  return (
    <div className="min-h-screen bg-white antialiased">
      <div className="max-w-3xl mx-auto px-4">
        <ProgressBar current={step} />
        <div className="py-8">
          {step === 0 && (
            <StepArchetype
              value={state.preset}
              tokens={result?.tokens ?? null}
              system={result?.system ?? null}
              onChange={(p: PresetName) => update({ preset: p })}
            />
          )}
          {step === 1 && (
            <StepFont
              value={state.fontFamily}
              preset={state.preset}
              onChange={(f: string) => update({ fontFamily: f })}
              system={result?.system ?? null}
            />
          )}
        </div>
        <div className="flex justify-between pb-12">
          <button
            onClick={back}
            className={`px-6 py-2 rounded text-sm transition-colors ${
              step === 0 ? "invisible" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Back
          </button>
          <button
            onClick={next}
            className="px-6 py-2 rounded bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors"
          >
            {step === STEP_COUNT - 1 ? "Generate" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
