import { toPng } from "html-to-image";

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

const PRINT_LANDSCAPE_WIDTH_PX = 1123;

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function shareImage(blob: Blob, filename: string): Promise<boolean> {
  const file = new File([blob], filename, { type: "image/png" });
  if (!navigator.canShare?.({ files: [file] })) return false;

  await navigator.share({
    files: [file],
    title: "테니스 대진표",
    text: "테니스 대진표 이미지",
  });
  return true;
}

async function saveBlob(blob: Blob, filename: string): Promise<void> {
  if (isMobileDevice()) {
    try {
      const shared = await shareImage(blob, filename);
      if (shared) return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
  }

  await downloadBlob(blob, filename);
}

export interface ExportImageOptions {
  pixelRatio?: number;
}

async function renderToBlob(element: HTMLElement, options: ExportImageOptions = {}): Promise<Blob> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: options.pixelRatio ?? 2,
    backgroundColor: "#ffffff",
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return !node.classList.contains("export-exclude");
    },
  });

  return dataUrlToBlob(dataUrl);
}

export async function exportElementAsImage(
  element: HTMLElement,
  filename: string,
  options: ExportImageOptions = {}
): Promise<void> {
  const blob = await renderToBlob(element, options);
  await saveBlob(blob, filename);
}

async function waitForNextPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export async function exportPrintLayoutAsLandscapeImage(
  element: HTMLElement,
  filename: string,
  options: ExportImageOptions = {}
): Promise<void> {
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;left:0;top:0;z-index:-1;opacity:0;pointer-events:none;overflow:visible;";

  const clone = element.cloneNode(true) as HTMLElement;
  clone.classList.remove("hidden", "print-only");
  clone.classList.add("print-capture-root");
  clone.style.cssText = `display:block;visibility:visible;width:${PRINT_LANDSCAPE_WIDTH_PX}px;background:#fff;`;
  clone.removeAttribute("aria-hidden");
  overlay.appendChild(clone);
  document.body.appendChild(overlay);

  try {
    await waitForNextPaint();
    const blob = await renderToBlob(clone, { pixelRatio: options.pixelRatio ?? 2 });
    await saveBlob(blob, filename);
  } finally {
    document.body.removeChild(overlay);
  }
}
