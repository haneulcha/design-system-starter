//
// 다운로드·복사의 단일 구현. 전에는 ExportPanel과 DownloadPanel에 같은 코드가
// 두 벌 있었고, 둘 다 Firefox에서 다운로드가 취소되는 문제를 갖고 있었다 —
// 앵커를 문서에 붙이지 않고 object URL을 동기 해제했다. 사본이 늘기 전에 하나로 모은다.

export function downloadFile(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Firefox는 문서에 붙지 않은 앵커의 프로그램적 클릭을 무시한다.
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 동기 해제하면 Firefox가 다운로드를 시작하기 전에 URL이 사라진다.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** 비보안 컨텍스트(LAN에서 `vite preview --host`)에서는 clipboard가 undefined다. */
export function canCopy(): boolean {
  return typeof navigator !== "undefined" && !!navigator.clipboard?.writeText;
}

export async function copyText(text: string): Promise<boolean> {
  if (!canCopy()) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
