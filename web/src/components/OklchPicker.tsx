// web/src/components/OklchPicker.tsx
//
// OKLCH-based color picker. Brand-agnostic: the parent owns the effective
// hex. The picker keeps an internal LCH mirror so dragging isn't subject to
// hex-roundtrip rounding, and stashes the last hue so dragging chroma down
// to 0 (gray) doesn't lose the user's hue when they bring chroma back up.
//
// UI: a 2D L×C pad rendered into a canvas at the current hue (top = light,
// right = chromatic), plus a 1D hue strip beneath it. Out-of-gamut cells in
// the pad render transparent so the user can see where the boundary is.

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
    for (let y = 0; y < PAD_H; y++) {
      const L = 1 - y / (PAD_H - 1);
      for (let x = 0; x < PAD_W; x++) {
        const C = (x / (PAD_W - 1)) * CHROMA_MAX;
        // 범위 밖은 null → 알파 0으로 남아 체커보드가 비쳐 보인다 (gamut 경계 시각화)
        const out = oklchToHexIfDisplayable({ l: L, c: C, h: hue });
        const i = (y * PAD_W + x) * 4;
        if (out) {
          img.data[i] = parseInt(out.slice(1, 3), 16);
          img.data[i + 1] = parseInt(out.slice(3, 5), 16);
          img.data[i + 2] = parseInt(out.slice(5, 7), 16);
          img.data[i + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
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
      className="relative w-full h-36 rounded overflow-hidden border border-neutral-200 cursor-crosshair touch-none bg-[repeating-conic-gradient(#eee_0%_25%,#fff_0%_50%)] bg-[length:12px_12px]"
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
