// src/export/color/index.ts
//
// 색 산출물의 공개 표면. web/이 여기서만 import한다.

export type { ColorSystem, ExportRole, ExportScale } from "./types.js";
export { assertColorSystem } from "./types.js";
export type { ScaleSetLike, ScaleDescriptorLike } from "./adapter.js";
export { toColorSystem } from "./adapter.js";
export type { CssSelectors } from "./css.js";
export { generateColorCss } from "./css.js";
export { generateColorThemeCss } from "./theme-css.js";
export { toColorFigma } from "./figma.js";
export { renderColorDesignMd } from "./design-md.js";
