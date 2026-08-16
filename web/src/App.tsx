import { useEffect, useState } from "react";
import { ResultPage } from "./result/ResultPage";
import { DEFAULT_STATE, useGenerateResult, type WizardState } from "./hooks/useGenerator";
import { LabPage } from "./lab/LabPage";
import { BuilderPage } from "./builder/BuilderPage";
import { ColorPalettePage } from "./color-palette/ColorPalettePage";

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

  // 루트("/")까지 지우면 안 되니 길이 1보다 긴 경로에서만 끝 슬래시를 뗀다.
  // 위저드·빌더 헤더에서 <a href="/color-palette">를 넣는 순간 실제 링크가
  // /color-palette/로 도달할 위험이 생긴다(브라우저는 상대 경로를 정규화하지 않는다).
  const normalizedPath = path.length > 1 ? path.replace(/\/$/, "") : path;
  if (normalizedPath === "/color-palette") return <ColorPalettePage />;
  if (hash === "#lab") return <LabPage />;
  if (hash === "#builder") return <BuilderPage />;

  const update = (partial: Partial<WizardState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  return <ResultPage state={state} result={result} onChange={update} />;
}
