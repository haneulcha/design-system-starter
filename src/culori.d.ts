declare module "culori" {
  interface Color {
    mode: string;
    l?: number;
    c?: number;
    h?: number;
    a?: number;
    b?: number;
    r?: number;
    g?: number;
    [key: string]: unknown;
  }
  export function parse(color: string): Color | undefined;
  export function formatHex(color: Color | Record<string, unknown>): string | undefined;
  export function converter(mode: string): (color: string | Color) => Color;
}
