/**
 * Trigger a browser download of an in-memory string as a file.
 * No dependencies — Blob + object URL + transient anchor click.
 */
export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on next tick so Safari/Firefox have committed the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
