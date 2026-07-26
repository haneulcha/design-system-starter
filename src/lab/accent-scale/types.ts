// src/lab/accent-scale/types.ts
//
// 유도 알고리즘 공통 인터페이스. 실험 코드 — 제품 파이프라인에서 import 금지.

import type { Oklch } from "../../schema/types.js";

export interface ScaleSpec {
  /** 생성할 stop 수 */
  count: number;
  /** 입력(앵커) 색이 놓이는 위치 (0-based, 밝은→어두운) */
  anchorIndex: number;
}

export interface AccentAlgorithm {
  id: string;
  label: string;
  /** 랩 UI에 표시되는 한 줄 특징 설명 — 이 알고리즘이 무엇을 하고 무엇을 무시하는지 (교보재 목적) */
  description: string;
  /** 랩 UI가 기본으로 보여줄 stop 구성 */
  nativeSpec: ScaleSpec;
  /** 밝은→어두운 순서의 Oklch 배열 반환 */
  derive(anchorHex: string, spec: ScaleSpec): Oklch[];
}
