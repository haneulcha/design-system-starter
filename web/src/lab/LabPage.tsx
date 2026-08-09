// web/src/lab/LabPage.tsx
//
// #lab — 액센트 스케일 유도 알고리즘 비교 랩 (연구용, 제품 UI 아님).
// 스케일 계산은 전부 @core/lab/palette (순수)에서; 이 파일은 렌더만.

import { useState } from "react";
import { ALGORITHMS } from "@core/lab/palette/index.js";
import {
  EVAL_PRESETS,
  GLOSSARY,
  nativeScale,
  nearestReferences,
  REF_NOTES,
  type LabStop,
} from "@core/lab/palette/lab-data.js";
import type { ReferenceSet } from "@core/lab/palette/bench.js";
import tailwindRef from "@data/references/tailwind-v4.json";
import radixRef from "@data/references/radix-light.json";
import { ColorScaleStrip } from "../components/ColorScaleStrip";
import { OklchPicker } from "../components/OklchPicker";

// JSON 모듈의 추론 타입(리터럴 키)과 ReferenceSet(Record)이 달라 unknown 경유 캐스팅
const REF_SETS = [tailwindRef, radixRef] as unknown as ReferenceSet[];

function StripRow({
  title,
  description,
  stops,
}: {
  title: string;
  description?: string;
  stops: LabStop[];
}) {
  const copyAll = () =>
    navigator.clipboard.writeText(stops.map((s) => s.hex).join(", "));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-medium text-neutral-600">{title}</span>
        <button
          type="button"
          onClick={copyAll}
          className="text-[10px] text-neutral-400 hover:text-neutral-700"
        >
          copy hex
        </button>
      </div>
      {description && (
        <p className="text-[11px] leading-4 text-neutral-400 mb-1.5">
          {description}
        </p>
      )}
      <ColorScaleStrip stops={stops} />
    </div>
  );
}

/** 피커 축 이동 → 효과 안내 (OklchPicker: 패드 세로=L, 가로=C, 아래 스트립=H) */
function PickerGuide() {
  const rows: [string, string][] = [
    ["↑ 위로", "밝고 가벼운 인상 — 파스텔·배경색 쪽으로"],
    ["↓ 아래로", "진하고 무게감 있게 — 텍스트·강조색 쪽으로"],
    ["→ 오른쪽", "선명하고 쨍한 느낌 (채도↑) — 체커보드로 비는 영역은 화면(sRGB)이 표현할 수 없는 색이라는 뜻"],
    ["← 왼쪽", "차분하고 뮤트된 톤 (채도↓) — 끝까지 가면 무채색"],
    ["아래 스트립", "색상(hue) 자체를 바꾼다 — 브랜드의 성격이 달라지는 축"],
  ];
  return (
    <div className="text-[11px] leading-4 text-neutral-400 space-y-1 max-w-xs">
      <div className="font-medium text-neutral-500">
        피커에서 움직여보기 — 원하는 효과별 방향
      </div>
      {rows.map(([dir, effect]) => (
        <div key={dir} className="flex gap-2">
          <span className="shrink-0 w-16 font-mono text-neutral-500">{dir}</span>
          <span>{effect}</span>
        </div>
      ))}
    </div>
  );
}

export function LabPage() {
  const [hex, setHex] = useState("#3b82f6");
  const references = nearestReferences(hex, REF_SETS);

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <header>
        <h1 className="text-lg font-semibold">Accent Scale Lab</h1>
        <p className="text-xs text-neutral-500">
          브랜드 컬러 → 액센트 스케일 유도 알고리즘 비교 (연구용 · #lab)
        </p>
      </header>

      <div className="flex items-start gap-6">
        <OklchPicker hex={hex} onChange={setHex} />
        <div className="space-y-3">
          <input
            value={hex}
            onChange={(e) => {
              if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setHex(e.target.value);
            }}
            className="border border-neutral-300 rounded px-2 py-1 text-sm font-mono w-24"
          />
          <div className="flex flex-wrap gap-1 max-w-xs">
            {EVAL_PRESETS.map((p) => (
              <button
                key={p.hex}
                type="button"
                onClick={() => setHex(p.hex)}
                title={`${p.label} ${p.hex} — ${p.why}`}
                className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${
                  hex === p.hex
                    ? "border-neutral-900 text-neutral-900"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-400"
                }`}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ background: p.hex }}
                />
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-4 text-neutral-400 max-w-xs">
            눈 평가용 프리셋 — 관찰은 docs/research/accent-eye-eval.md 에 기록
          </p>
          <PickerGuide />
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
          Algorithms
        </h2>
        <p className="text-[11px] leading-4 text-neutral-400">
          진한 테두리 칸 = 지금 선택한 색이 정확히 그대로 남은 자리. 테두리가
          없으면 그 알고리즘은 입력색을 변형해서 원본이 스케일에 없다는 뜻.
        </p>
        {ALGORITHMS.map((algo) => (
          <StripRow
            key={algo.id}
            title={algo.label}
            description={algo.description}
            stops={nativeScale(algo, hex)}
          />
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
          Nearest references (눈 비교 기준)
        </h2>
        {references.map((r) => (
          <StripRow
            key={r.source}
            title={`${r.source} · ${r.palette}`}
            description={REF_NOTES[r.source]}
            stops={r.stops}
          />
        ))}
      </section>

      <section className="space-y-2 border-t border-neutral-200 pt-6">
        <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
          용어
        </h2>
        <dl className="space-y-1">
          {GLOSSARY.map(([term, def]) => (
            <div key={term} className="flex gap-3 text-[11px] leading-4">
              <dt className="shrink-0 w-28 font-medium text-neutral-600">
                {term}
              </dt>
              <dd className="text-neutral-400">{def}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
