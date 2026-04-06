import { useState } from "react";
import { ProgressBar } from "./components/ProgressBar";
import { StepColor } from "./steps/StepColor";
import { StepArchetype } from "./steps/StepArchetype";
import { StepFont } from "./steps/StepFont";
import { ResultPage } from "./result/ResultPage";
import { DEFAULT_STATE, useGenerateResult, type WizardState, type MoodArchetype } from "./hooks/useGenerator";

type Screen = "wizard" | "result";

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
        onBack={() => { setScreen("wizard"); setStep(2); }}
      />
    );
  }

  const next = () => {
    if (step < 2) setStep(step + 1);
    else setScreen("result");
  };
  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <ProgressBar current={step} />
        <div className="py-8">
          {step === 0 && (
            <StepColor
              value={state.primaryColor}
              onChange={(c: string) => update({ primaryColor: c })}
              scales={result?.system.colors ?? null}
            />
          )}
          {step === 1 && (
            <StepArchetype
              value={state.mood}
              tokens={result?.tokens ?? null}
              system={result?.system ?? null}
              onChange={(m: MoodArchetype) => update({ mood: m })}
            />
          )}
          {step === 2 && (
            <StepFont
              value={state.fontFamily}
              mood={state.mood}
              onChange={(f: string) => update({ fontFamily: f })}
              system={result?.system ?? null}
            />
          )}
        </div>
        <div className="flex justify-between pb-12">
          <button
            onClick={back}
            className={`px-6 py-2 rounded text-sm transition-colors ${
              step === 0
                ? "invisible"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Back
          </button>
          <button
            onClick={next}
            className="px-6 py-2 rounded bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors"
          >
            {step === 2 ? "Generate" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
