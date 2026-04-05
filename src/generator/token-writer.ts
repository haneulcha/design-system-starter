import type { PrimitiveTokens, SemanticTokens, ComponentTokens } from "../schema/types.js";

function toJson(obj: unknown, indent: number = 2): string {
  return JSON.stringify(obj, null, indent);
}

export function writePrimitiveTs(tokens: PrimitiveTokens): string {
  return `export const primitive = ${toJson(tokens)} as const;\n`;
}

export function writeSemanticTs(tokens: SemanticTokens): string {
  return `export const semantic = ${toJson(tokens)} as const;\n`;
}

export function writeComponentTs(tokens: ComponentTokens): string {
  return `export const component = ${toJson(tokens)} as const;\n`;
}

export function writeIndexTs(): string {
  return [
    'export { primitive } from "./primitive.js";',
    'export { semantic } from "./semantic.js";',
    'export { component } from "./component.js";',
    '',
  ].join('\n');
}
