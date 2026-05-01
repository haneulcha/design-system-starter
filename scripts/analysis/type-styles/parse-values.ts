export interface ParsedValue<T> {
  value: T | null;
  range?: [T, T];
  uppercase?: boolean;
}

const PX_RE = /(-?\d+(?:\.\d+)?)\s*px/;

export function parseSize(input: string): ParsedValue<number> {
  const m = input.match(PX_RE);
  if (!m) return { value: null };
  return { value: Number(m[1]) };
}

const WEIGHT_RANGE_RE = /^\s*(\d{2,3})\s*[-–]\s*(\d{2,3})\b/;
const WEIGHT_NUM_RE = /^\s*(\d{2,3})\b/;

export function parseWeight(input: string): ParsedValue<number> {
  const r = input.match(WEIGHT_RANGE_RE);
  if (r) return { value: null, range: [Number(r[1]), Number(r[2])] };
  const n = input.match(WEIGHT_NUM_RE);
  if (n) return { value: Number(n[1]) };
  return { value: null };
}

const LH_RANGE_RE = /^\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/;
const LH_NUM_RE = /^\s*(\d+(?:\.\d+)?)/;

export function parseLineHeight(input: string): ParsedValue<number> {
  if (/^\s*normal\b/i.test(input)) return { value: null };
  const r = input.match(LH_RANGE_RE);
  if (r) {
    const lo = Number(r[1]);
    const hi = Number(r[2]);
    if (lo >= 0.5 && lo <= 3 && hi >= 0.5 && hi <= 3) {
      return { value: null, range: [lo, hi] };
    }
  }
  const n = input.match(LH_NUM_RE);
  if (n) return { value: Number(n[1]) };
  return { value: null };
}

const LS_RANGE_RE = /(-?\d+(?:\.\d+)?)\s*px\s+to\s+(-?\d+(?:\.\d+)?)\s*px/i;
const UPPERCASE_RE = /\(\s*uppercase\s*\)/i;

export function parseLetterSpacing(input: string): ParsedValue<number> {
  const trimmed = input.trim();
  const uppercase = UPPERCASE_RE.test(trimmed) || undefined;

  if (/^\s*normal\b/i.test(trimmed)) return { value: 0, ...(uppercase ? { uppercase } : {}) };

  const r = trimmed.match(LS_RANGE_RE);
  if (r) {
    const a = Number(r[1]);
    const b = Number(r[2]);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return { value: null, range: [lo, hi], ...(uppercase ? { uppercase } : {}) };
  }

  const m = trimmed.match(PX_RE);
  if (m) return { value: Number(m[1]), ...(uppercase ? { uppercase } : {}) };

  if (/^\s*0\b/.test(trimmed)) return { value: 0, ...(uppercase ? { uppercase } : {}) };

  return { value: null, ...(uppercase ? { uppercase } : {}) };
}
