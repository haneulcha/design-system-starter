// src/lab/accent-scale/index.ts
//
// 알고리즘 레지스트리. 벤치 CLI와 web 랩이 공유하는 단일 목록.

import type { AccentAlgorithm } from "./types.js";
import { v1Algorithm } from "./v1.js";
import { naiveAlgorithm } from "./naive.js";
import { hctAlgorithm } from "./hct.js";
import { leonardoAlgorithm } from "./leonardo.js";
import { radixAlgorithm } from "./radix.js";
import { oursAlgorithm } from "./ours.js";

export const ALGORITHMS: readonly AccentAlgorithm[] = [
  v1Algorithm,
  naiveAlgorithm,
  hctAlgorithm,
  leonardoAlgorithm,
  radixAlgorithm,
  oursAlgorithm,
];

export type { AccentAlgorithm, ScaleSpec } from "./types.js";
