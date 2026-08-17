// Vite의 `base`는 에셋 URL만 다시 쓴다 — 손으로 만든 라우팅(App.tsx의 pathname
// 비교)과 <a href>는 base를 스스로 알아야 한다. GitHub Pages 프로젝트 사이트가
// /design-system-starter/ 서브패스에 올라가기 때문에 둘 다 어긋나면 링크가 죽는다.
//
// base를 인자로 받는 이유: import.meta.env.BASE_URL은 테스트에서 항상 "/"라
// 서브패스 동작을 env 조작 없이는 검증할 수 없다. 기본값으로 두고 주입 가능하게 한다.
// Vite는 BASE_URL을 항상 슬래시로 끝나게 정규화한다("/" 또는 "/design-system-starter/").

/** base를 뗀 접두사. "/" → "", "/design-system-starter/" → "/design-system-starter" */
const prefixOf = (base: string) => base.replace(/\/+$/, "");

/** 앱 경로("/color-palette")를 실제 문서 URL로 — <a href>에 넣을 값. */
export function routeHref(path: string, base = import.meta.env.BASE_URL): string {
  return prefixOf(base) + path;
}

/**
 * location.pathname에서 base를 떼어 앱 경로로. 끝 슬래시는 정규화한다 —
 * 루트("/")까지 지우면 안 되니 빈 문자열은 "/"로 되돌린다.
 */
export function appPath(pathname: string, base = import.meta.env.BASE_URL): string {
  const prefix = prefixOf(base);
  // startsWith만 쓰면 base "/dss"가 "/dsstuff"에도 걸린다 — 경계를 확인한다.
  const inBase = prefix !== "" && (pathname === prefix || pathname.startsWith(prefix + "/"));
  const rest = inBase ? pathname.slice(prefix.length) : pathname;
  const trimmed = rest.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}
