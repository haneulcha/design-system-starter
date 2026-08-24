// web/src/color-palette/AccentInput.tsx
//
// hex 텍스트 입력은 로컬 드래프트로 둔다 — 부모 상태(hex prop)는 유효한 값만
// 받는 게 맞지만, 입력창 자체가 그 값에 그대로 매인 제어 컴포넌트면 "#3" 같은
// 중간 상태에서 React가 매 keystroke마다 값을 이전 유효값으로 되돌려 전체
// 선택 후 붙여넣기밖에 못 하게 된다. 이 도구의 유일한 필수 입력이라 심각하다.

import { useEffect, useState } from "react";
import { OklchPicker } from "../components/OklchPicker";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function AccentInput({
  hex, onChange,
}: { readonly hex: string; readonly onChange: (hex: string) => void }) {
  const [draft, setDraft] = useState(hex);

  // 부모가 액센트를 바꾸면(후보 선택, URL 복원 등) 드래프트도 따라간다 —
  // 입력 중이 아닐 때만 의미 있는 동기화라 타이핑 중엔 사용자가 친 값이 이긴다.
  useEffect(() => setDraft(hex), [hex]);

  return (
    <div
      className="border border-neutral-200"
      style={{
        borderRadius: "var(--ds-radius-card)",
        padding: "var(--ds-space-sm)",
      }}
    >
      <div className="flex items-start gap-6">
        <OklchPicker hex={hex} onChange={onChange} />
        <label className="text-xs text-neutral-500">
          <span className="block mb-1">액센트 hex</span>
          <input
            aria-label="액센트 hex"
            value={draft}
            onChange={(e) => {
              const v = e.target.value;
              setDraft(v);
              // 형식을 갖췄을 때만 부모에 커밋한다 — 드래프트는 화면에서 자유롭게
              // 타이핑을 반영하되, 확정된 팔레트 상태는 여전히 유효한 hex만 본다.
              if (HEX_RE.test(v)) onChange(v.toLowerCase());
            }}
            onBlur={() => {
              // blur 시 형식이 안 맞으면 마지막 유효값으로 되돌린다.
              if (!HEX_RE.test(draft)) setDraft(hex);
            }}
            className="border border-neutral-300 rounded px-2 py-1 text-sm font-mono w-28"
          />
        </label>
      </div>
    </div>
  );
}
