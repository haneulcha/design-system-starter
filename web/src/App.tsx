import { useState } from "react";
import { ResultPage } from "./result/ResultPage";
import { DEFAULT_STATE, useGenerateResult, type WizardState } from "./hooks/useGenerator";

export function App() {
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  const result = useGenerateResult(state);

  const update = (partial: Partial<WizardState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  return <ResultPage state={state} result={result} onChange={update} />;
}
