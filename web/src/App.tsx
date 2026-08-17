import { useEffect, useState } from "react";
import { ResultPage } from "./result/ResultPage";
import { DEFAULT_STATE, useGenerateResult, type WizardState } from "./hooks/useGenerator";
import { LabPage } from "./lab/LabPage";
import { BuilderPage } from "./builder/BuilderPage";
import { ColorPalettePage } from "./color-palette/ColorPalettePage";
import { appPath } from "./lib/basePath";

/** 화면이 넷뿐이라 라우터 라이브러리를 넣지 않는다. path는 새 도구만 쓰고
 *  기존 연구 화면은 해시를 유지한다 — 북마크를 깨지 않기 위해. */
function useLocation() {
  const read = () => ({ path: window.location.pathname, hash: window.location.hash });
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const onChange = () => setLoc(read());
    window.addEventListener("popstate", onChange);
    window.addEventListener("hashchange", onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener("hashchange", onChange);
    };
  }, []);
  return loc;
}

export function App() {
  const { path, hash } = useLocation();
  const [state, setState] = useState<WizardState>(DEFAULT_STATE);
  const result = useGenerateResult(state);

  // appPath가 base 접두사와 끝 슬래시를 함께 흡수한다 — GitHub Pages 프로젝트
  // 사이트에서는 pathname이 /design-system-starter/color-palette로 도착한다.
  if (appPath(path) === "/color-palette") return <ColorPalettePage />;
  if (hash === "#lab") return <LabPage />;
  if (hash === "#builder") return <BuilderPage />;

  const update = (partial: Partial<WizardState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  return <ResultPage state={state} result={result} onChange={update} />;
}
