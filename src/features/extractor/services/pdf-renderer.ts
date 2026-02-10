/**
 * PDF rendering service using pdfjs-dist.
 * Converts PDF pages to base64 PNG images.
 */

import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
}

/** Default rendering scale (2x for good quality) */
const DEFAULT_SCALE = 2;

export interface RenderedPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

/** Maximum pages to render (prevents OOM on very large PDFs) */
const MAX_PAGES = 50;

/**
 * Render all pages of a PDF file to base64 PNG images.
 * If the PDF exceeds MAX_PAGES, only the first MAX_PAGES pages are rendered.
 */
export async function renderPdfToImages(
  pdfData: ArrayBuffer,
  scale: number = DEFAULT_SCALE,
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal,
): Promise<RenderedPage[]> {
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
  const totalPages = pdf.numPages;
  const pagesToRender = Math.min(totalPages, MAX_PAGES);

  if (totalPages > MAX_PAGES) {
    console.warn(
      `PDF has ${totalPages} pages, only rendering first ${MAX_PAGES} to prevent OOM`,
    );
  }

  const pages: RenderedPage[] = [];

  for (let i = 1; i <= pagesToRender; i++) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error(`Failed to get canvas 2d context for page ${i}`);
    }

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvas, viewport }).promise;

    pages.push({
      pageNumber: i,
      dataUrl: canvas.toDataURL("image/png"),
      width: viewport.width,
      height: viewport.height,
    });

    onProgress?.(i, pagesToRender);
  }

  return pages;
}
