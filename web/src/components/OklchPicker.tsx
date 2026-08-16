// web/src/components/OklchPicker.tsx
//
// OKLCH-based color picker. Brand-agnostic: the parent owns the effective
// hex. The picker keeps an internal LCH mirror so dragging isn't subject to
// hex-roundtrip rounding, and stashes the last hue so dragging chroma down
// to 0 (gray) doesn't lose the user's hue when they bring chroma back up.
//
// UI: a 2D L×C pad rendered into a canvas at the current hue (top = light,
// right = chromatic), plus a 1D hue strip beneath it, plus three L/C/H number
// fields for fine-tuning past the pad's 1px-per-0.007-L drag granularity.
// Out-of-gamut cells in the pad are painted with the chroma clamped to the
// gamut boundary — the color stops changing past that point — with a thin
// line drawn along the boundary so it reads as an edge, not a broken image.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampChromaToGamut,
  hexToOklch,
  oklchToHex,
  oklchToHexIfDisplayable,
} from "../lib/oklch";

const CHROMA_MAX = 0.4;
const PAD_W = 200;
const PAD_H = 140;

interface OklchPickerProps {
  hex: string;
  onChange: (hex: string) => void;
}

interface Lch {
  l: number;
  c: number;
  h: number;
}

function fromHex(hex: string, fallbackHue: number): Lch {
  const o = hexToOklch(hex);
  if (!o) return { l: 0.6, c: 0.18, h: fallbackHue };
  return { l: o.l, c: o.c, h: o.h ?? fallbackHue };
}

export function OklchPicker({ hex, onChange }: OklchPickerProps) {
  const [lch, setLch] = useState<Lch>(() => fromHex(hex, 0));

  const lastEmitted = useRef(hex);
  useEffect(() => {
    if (hex !== lastEmitted.current) {
      setLch((prev) => fromHex(hex, prev.h));
      lastEmitted.current = hex;
    }
  }, [hex]);

  function commit(next: Lch) {
    setLch(next);
    const out = oklchToHex(next);
    if (out) {
      lastEmitted.current = out;
      onChange(out);
    }
  }

  return (
    <div className="space-y-2">
      <LcPad
        hue={lch.h}
        l={lch.l}
        c={lch.c}
        onPick={(l, c) => commit({ ...lch, l, c })}
      />
      <HueStrip hue={lch.h} onPick={(h) => commit({ ...lch, h })} />
      <div className="flex gap-2 pt-1">
        <NumberField
          label="L" value={lch.l} min={0} max={1} step={0.001} decimals={3}
          onCommit={(l) => commit({ ...lch, c: clampChromaToGamut(l, lch.c, lch.h), l })}
        />
        <NumberField
          label="C" value={lch.c} min={0} max={CHROMA_MAX} step={0.001} decimals={3}
          onCommit={(c) => commit({ ...lch, c: clampChromaToGamut(lch.l, c, lch.h) })}
        />
        <NumberField
          label="H" value={lch.h} min={0} max={360} step={0.5} decimals={1}
          onCommit={(h) => commit({ ...lch, c: clampChromaToGamut(lch.l, lch.c, h), h })}
        />
      </div>
    </div>
  );
}

// ─── L × C pad ─────────────────────────────────────────────────────────────

function LcPad({
  hue,
  l,
  c,
  onPick,
}: {
  hue: number;
  l: number;
  c: number;
  onPick: (l: number, c: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(PAD_W, PAD_H);
    // 각 행(y)의 gamut 경계 x — 이 x부터 오른쪽은 채도가 잘린 같은 색이라
    // 경계선을 그릴 때 다시 쓴다. 행 전체가 in-gamut이면 오른쪽 끝(PAD_W)으로 둔다.
    const boundaryX: number[] = [];
    for (let y = 0; y < PAD_H; y++) {
      const L = 1 - y / (PAD_H - 1);
      let boundaryFoundAt = PAD_W;
      let clampedHex: string | null = null;
      for (let x = 0; x < PAD_W; x++) {
        const C = (x / (PAD_W - 1)) * CHROMA_MAX;
        const i = (y * PAD_W + x) * 4;
        const out = oklchToHexIfDisplayable({ l: L, c: C, h: hue });
        let hex: string;
        if (out) {
          hex = out;
        } else {
          // 범위 밖은 경계로 채도를 잘라 칠한다 — 이 행에서 한 번만 계산해
          // 재사용한다(gamut 경계는 채도에 단조라 결과가 같다). 그러면 패드가
          // 꽉 차고, 경계 오른쪽은 색이 가로로 더 변하지 않아 "여기가 끝"이
          // 자연히 보인다(체커보드로 비워 두면 이미지 로딩 실패처럼 보인다).
          if (boundaryFoundAt === PAD_W) boundaryFoundAt = x;
          if (clampedHex === null) {
            const clampedC = clampChromaToGamut(L, CHROMA_MAX, hue);
            clampedHex = oklchToHex({ l: L, c: clampedC, h: hue }) ?? "#000000";
          }
          hex = clampedHex;
        }
        img.data[i] = parseInt(hex.slice(1, 3), 16);
        img.data[i + 1] = parseInt(hex.slice(3, 5), 16);
        img.data[i + 2] = parseInt(hex.slice(5, 7), 16);
        img.data[i + 3] = 255;
      }
      boundaryX.push(boundaryFoundAt);
    }
    ctx.putImageData(img, 0, 0);

    // 경계선: 각 행의 마지막 in-gamut x를 이어 1px로 긋는다.
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    boundaryX.forEach((x, y) => {
      const px = Math.min(x, PAD_W - 1) + 0.5;
      if (y === 0) ctx.moveTo(px, y + 0.5);
      else ctx.lineTo(px, y + 0.5);
    });
    ctx.stroke();
  }, [hue]);

  const pick = useCallback(
    (clientX: number, clientY: number) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const l = 1 - y / rect.height;
      const c = (x / rect.width) * CHROMA_MAX;
      // 체커보드(범위 밖)를 찍으면 gamut 경계로 스냅 — 마커 위치 = 실제 색
      onPick(l, clampChromaToGamut(l, c, hue));
    },
    [onPick, hue],
  );

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (draggingRef.current) pick(e.clientX, e.clientY);
    };
    const up = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [pick]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-36 rounded overflow-hidden border border-neutral-200 cursor-crosshair touch-none"
      onPointerDown={(e) => {
        draggingRef.current = true;
        pick(e.clientX, e.clientY);
      }}
    >
      <canvas
        ref={canvasRef}
        width={PAD_W}
        height={PAD_H}
        className="w-full h-full block"
      />
      <div
        className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ring-1 ring-neutral-900/40 pointer-events-none"
        style={{
          left: `${(c / CHROMA_MAX) * 100}%`,
          top: `${(1 - l) * 100}%`,
        }}
      />
    </div>
  );
}

// ─── Hue strip ─────────────────────────────────────────────────────────────

const HUE_GRADIENT = (() => {
  const stops: string[] = [];
  for (let i = 0; i <= 12; i++) {
    const out = oklchToHex({ l: 0.7, c: 0.15, h: (i / 12) * 360 });
    if (out) stops.push(out);
  }
  return `linear-gradient(to right, ${stops.join(", ")})`;
})();

function HueStrip({
  hue,
  onPick,
}: {
  hue: number;
  onPick: (h: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const pick = useCallback(
    (clientX: number) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      onPick((x / rect.width) * 360);
    },
    [onPick],
  );

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (draggingRef.current) pick(e.clientX);
    };
    const up = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [pick]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-3 rounded-full cursor-crosshair touch-none"
      style={{ background: HUE_GRADIENT }}
      onPointerDown={(e) => {
        draggingRef.current = true;
        pick(e.clientX);
      }}
    >
      <div
        className="absolute top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ring-1 ring-neutral-900/40 pointer-events-none"
        style={{ left: `${(hue / 360) * 100}%` }}
      />
    </div>
  );
}

// ─── 숫자 칸 ────────────────────────────────────────────────────────────────
//
// 피커 드래그는 1px이 L 0.007씩 튀어 미세조정이 안 된다. 화살표 키로 넛지하거나
// 직접 칠 수 있는 칸을 둔다 (스펙 D1).
//
// 초안(draft)을 로컬 상태로 두는 이유: 제어 입력에서 "유효할 때만 갱신"하면
// "0." 같은 중간 상태가 통과하지 못해 한 글자씩 칠 수 없다.

function NumberField({
  label, value, min, max, step, decimals, onCommit,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly decimals: number;
  readonly onCommit: (n: number) => void;
}) {
  const shown = value.toFixed(decimals);
  const [draft, setDraft] = useState(shown);
  const lastShown = useRef(shown);
  // 바깥(피커 드래그·hex 입력)에서 값이 바뀌면 초안을 따라가게 한다.
  //
  // 되돌림 판정은 문자열이 아니라 **수치**로 한다. 문자열로 하면 두 방향이 다 깨진다:
  //  - "0.7"을 치면 커밋 → shown이 "0.700"이 되어 문자열이 달라지고, 초안이
  //    "0.700"으로 덮어써져 한 글자씩 칠 수 없다 (AccentInput에서 이미 한 번 고친 버그).
  //    hex는 친 문자열과 커밋된 문자열이 글자 그대로 같아 이 문제가 없었지만
  //    숫자는 toFixed 정규화 때문에 같지 않다.
  //  - 반대로 클램프 결과가 표시상 같으면(예: 0.024 → 0.024) 문자열이 안 바뀌어
  //    잘린 값이 칸에 안 돌아온다.
  //
  // 의존성 배열은 `shown`(문자열)이 아니라 `value`(수치)여야 한다. 클램프 결과가
  // 문자열로는 같아도(예: 0.02384072792972787 → 0.023840618133544923, 둘 다
  // "0.024") 실제로는 다른 값일 수 있는데, 문자열을 의존성으로 두면 React가
  // effect를 아예 건너뛰어 안쪽의 수치 비교까지 도달하지 못한다.
  useEffect(() => {
    lastShown.current = shown;
    if (Number(draft) !== value) setDraft(shown);
  }, [value]);

  return (
    <label className="flex items-center gap-1 text-[10px] text-neutral-500">
      <span className="w-3 font-mono">{label}</span>
      <input
        aria-label={label}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(n)) {
            onCommit(Math.min(max, Math.max(min, n)));
          }
        }}
        onBlur={() => setDraft(lastShown.current)}
        className="w-16 rounded border border-neutral-300 px-1 py-0.5 font-mono text-[11px]"
      />
    </label>
  );
}
