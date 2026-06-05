import { toPng } from "html-to-image";

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

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

export async function exportElementAsImage(element: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return !node.classList.contains("export-exclude");
    },
  });

  const blob = dataUrlToBlob(dataUrl);

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
