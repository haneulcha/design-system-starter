// web/src/lab/LabPage.tsx
//
// #lab — 액센트 스케일 유도 알고리즘 비교 랩 (연구용, 제품 UI 아님).
// 스케일 계산은 전부 @core/lab/accent-scale (순수)에서; 이 파일은 렌더만.

import { useState } from "react";
import { ALGORITHMS } from "@core/lab/accent-scale/index.js";
import {
  nativeScale,
  nearestReferences,
  type LabStop,
} from "@core/lab/accent-scale/lab-data.js";
import type { ReferenceSet } from "@core/lab/accent-scale/bench.js";
import tailwindRef from "@data/references/tailwind-v4.json";
import radixRef from "@data/references/radix-light.json";
import { ColorScaleStrip } from "../components/ColorScaleStrip";
import { OklchPicker } from "../components/OklchPicker";

// JSON 모듈의 추론 타입(리터럴 키)과 ReferenceSet(Record)이 달라 unknown 경유 캐스팅
const REF_SETS = [tailwindRef, radixRef] as unknown as ReferenceSet[];

function StripRow({ title, stops }: { title: string; stops: LabStop[] }) {
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
      <ColorScaleStrip stops={stops} />
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

      <div className="flex items-start gap-4">
        <OklchPicker hex={hex} onChange={setHex} />
        <input
          value={hex}
          onChange={(e) => {
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setHex(e.target.value);
          }}
          className="border border-neutral-300 rounded px-2 py-1 text-sm font-mono w-24"
        />
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
          Algorithms
        </h2>
        {ALGORITHMS.map((algo) => (
          <StripRow key={algo.id} title={algo.label} stops={nativeScale(algo, hex)} />
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
            stops={r.stops}
          />
        ))}
      </section>
    </div>
  );
}
