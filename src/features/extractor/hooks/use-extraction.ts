"use client";

import { useCallback, useRef, useState } from "react";
import type { RenderedPage } from "@/features/extractor/services/pdf-renderer";
import { RateLimiter, sleep } from "@/features/extractor/services/rate-limiter";
import type { EnvConfig } from "@/features/settings/context";
import { getDecodedConfig } from "@/features/settings/context";
import type { ModelConfig, RateLimitConfig } from "@/features/settings/types";
import { hasRateLimitEnabled } from "@/features/settings/types";

/** Pipeline step */
export type Step = "upload" | "select" | "extract" | "done";

/** Uploaded file type */
export type FileType = "pdf" | "docx" | "image";

/** Per-page extraction status */
export type PageStatus =
  | "pending"
  | "extracting"
  | "success"
  | "error"
  | "skipped";

/** Structured result for a single page */
export interface PageResult {
  imageIndex: number;
  pageNumber: number;
  status: PageStatus;
  markdown: string;
  errorMessage?: string | undefined;
  usage?: { promptTokens: number; completionTokens: number } | undefined;
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

/** DOCX API response shape */
interface DocxApiResponse {
  success: boolean;
  data?: { markdown: string; messages: string[] };
  error?: string;
}

interface UseExtractionOptions {
  hasAnyConfig: boolean;
  activeConfig: ModelConfig | null;
  envConfig: EnvConfig | null;
  onConfigMissing: () => void;
}

interface UseExtractionReturn {
  step: Step;
  fileType: FileType;
  fileName: string;
  extractionImages: string[];
  pageResults: PageResult[];
  extractingIdx: number;
  isExtracting: boolean;
  streamingMarkdown: string;
  totalPages: number;
  rateLimitWaitUntil: number | null;
  handlePagesRendered: (
    renderedPages: RenderedPage[],
    originalFileName: string,
  ) => void;
  handleImageUploaded: (dataUrl: string, originalFileName: string) => void;
  handleDocxUploaded: (file: File) => void;
  handleStartSelectedExtraction: (selectedIndices: number[]) => void;
  handleStop: () => void;
  retryPage: (resultIndex: number) => void;
  handleReset: () => void;
}

/** Merge rate limit: model config > env config > no limit */
export function resolveRateLimit(
  activeConfig: ModelConfig | null,
  envConfig: EnvConfig | null,
): RateLimitConfig | undefined {
  if (activeConfig?.rateLimit && hasRateLimitEnabled(activeConfig.rateLimit)) {
    return activeConfig.rateLimit;
  }
  if (envConfig?.rateLimit && hasRateLimitEnabled(envConfig.rateLimit)) {
    return envConfig.rateLimit;
  }
  return undefined;
}

/** Parse usage sentinel from stream tail, return usage + cleaned markdown */
export function parseUsageSentinel(raw: string): {
  markdown: string;
  usage?: { promptTokens: number; completionTokens: number };
} {
  const match = raw.match(
    /\n<!--EXTRACT_USAGE:\{"prompt_tokens":(\d+),"completion_tokens":(\d+)\}-->\s*$/,
  );
  if (!match) return { markdown: raw };
  return {
    markdown: raw.slice(0, match.index),
    usage: {
      promptTokens: Number(match[1]),
      completionTokens: Number(match[2]),
    },
  };
}

/**
 * Hook encapsulating all extraction logic:
 * - LLM-based page-by-page extraction for PDF/image
 * - DOCX conversion via /api/convert-docx
 * - Streaming state management
 * - Stop / retry / page selection
 */
export function useExtraction({
  hasAnyConfig,
  activeConfig,
  envConfig,
  onConfigMissing,
}: UseExtractionOptions): UseExtractionReturn {
  const [step, setStep] = useState<Step>("upload");
  const [fileType, setFileType] = useState<FileType>("pdf");
  const [extractionImages, setExtractionImages] = useState<string[]>([]);
  const [pageResults, setPageResults] = useState<PageResult[]>([]);
  const [extractingIdx, setExtractingIdx] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [streamingMarkdown, setStreamingMarkdown] = useState("");
  const [fileName, setFileName] = useState("");
  const [rateLimitWaitUntil, setRateLimitWaitUntil] = useState<number | null>(
    null,
  );

  // Refs to avoid stale closures
  const hasAnyConfigRef = useRef(hasAnyConfig);
  hasAnyConfigRef.current = hasAnyConfig;
  const activeConfigRef = useRef(activeConfig);
  activeConfigRef.current = activeConfig;
  const abortControllerRef = useRef<AbortController | null>(null);
  const pageResultsRef = useRef<PageResult[]>([]);
  const extractionImagesRef = useRef<string[]>([]);

  /**
   * Extract a single page by image index. Returns updated PageResult.
   * Used by both startExtraction loop and retryPage.
   */
  const extractSinglePage = useCallback(
    async (
      imageDataUrl: string,
      imageIndex: number,
      pageNumber: number,
      signal: AbortSignal,
      onStream: (markdown: string) => void,
    ): Promise<PageResult> => {
      const currentConfig = activeConfigRef.current;
      const decoded = currentConfig ? getDecodedConfig(currentConfig) : null;

      try {
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: imageDataUrl,
            baseUrl: decoded?.baseUrl ?? "",
            modelId: decoded?.modelId ?? "",
            apiKey: decoded?.apiKey ?? "",
            customPrompt: decoded?.customPrompt ?? "",
          }),
          signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          let errorDetail = errText;
          try {
            const parsed = JSON.parse(errText) as { error?: string };
            if (parsed.error) errorDetail = parsed.error;
          } catch {
            // Not JSON, use raw text
          }
          return {
            imageIndex,
            pageNumber,
            status: "error",
            markdown: "",
            errorMessage: `第 ${pageNumber} 页提取失败: ${errorDetail}`,
          };
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let pageMarkdown = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            pageMarkdown += chunk;
            onStream(pageMarkdown);
          }
        }

        // Check for inline stream error sentinel written by the API route
        // when the LLM stream breaks mid-way.
        const streamErrMatch = pageMarkdown.match(
          /<!--EXTRACT_STREAM_ERROR:(.+?)-->\s*$/,
        );
        if (streamErrMatch) {
          return {
            imageIndex,
            pageNumber,
            status: "error",
            markdown: "",
            errorMessage: `第 ${pageNumber} 页提取失败: ${streamErrMatch[1]}`,
          };
        }

        // Parse usage sentinel appended by API route
        const { markdown: cleanMarkdown, usage } =
          parseUsageSentinel(pageMarkdown);

        return {
          imageIndex,
          pageNumber,
          status: "success",
          markdown: cleanMarkdown,
          usage,
        };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          throw err; // Let caller handle abort
        }
        return {
          imageIndex,
          pageNumber,
          status: "error",
          markdown: "",
          errorMessage: `第 ${pageNumber} 页提取失败: ${err instanceof Error ? err.message : "网络错误"}`,
        };
      }
    },
    [],
  );

  // Core extraction: call LLM page by page for selected indices
  const startExtraction = useCallback(
    async (images: string[], selectedIndices: number[]) => {
      if (!hasAnyConfigRef.current) {
        onConfigMissing();
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Resolve rate limit config (model config > env > none)
      const rlConfig = resolveRateLimit(activeConfigRef.current, envConfig);
      const limiter = rlConfig ? new RateLimiter(rlConfig) : null;

      // Build initial pageResults array
      const initialResults: PageResult[] = selectedIndices.map((imgIdx) => ({
        imageIndex: imgIdx,
        pageNumber: imgIdx + 1,
        status: "pending" as PageStatus,
        markdown: "",
      }));
      setPageResults(initialResults);
      pageResultsRef.current = initialResults;

      setIsExtracting(true);
      setExtractingIdx(0);
      setRateLimitWaitUntil(null);
      setStep("extract");

      for (let i = 0; i < selectedIndices.length; i++) {
        if (controller.signal.aborted) break;

        const imgIdx = selectedIndices[i];
        if (imgIdx === undefined) continue;
        setExtractingIdx(i);
        setStreamingMarkdown("");

        // Rate limit: wait if needed
        if (limiter) {
          const waitMs = limiter.getWaitTimeMs();
          if (waitMs > 0) {
            setRateLimitWaitUntil(Date.now() + waitMs);
            try {
              await sleep(waitMs, controller.signal);
            } catch (err) {
              if (err instanceof DOMException && err.name === "AbortError") {
                return;
              }
            }
            setRateLimitWaitUntil(null);
          }
        }

        if (controller.signal.aborted) break;

        // Mark current page as extracting
        const updatingResults = [...pageResultsRef.current];
        const currentResult = updatingResults[i];
        if (currentResult) {
          updatingResults[i] = { ...currentResult, status: "extracting" };
        }
        setPageResults(updatingResults);
        pageResultsRef.current = updatingResults;

        try {
          const imageData = images[imgIdx];
          if (!imageData) continue;
          const result = await extractSinglePage(
            imageData,
            imgIdx,
            imgIdx + 1,
            controller.signal,
            (md) => setStreamingMarkdown(md),
          );

          // Record request with usage for rate limiter
          limiter?.recordRequest(result.usage);

          const afterResults = [...pageResultsRef.current];
          afterResults[i] = result;
          setPageResults(afterResults);
          pageResultsRef.current = afterResults;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            // handleStop already cleaned up state
            return;
          }
        }
      }

      setStreamingMarkdown("");
      setRateLimitWaitUntil(null);
      setIsExtracting(false);
      setStep("done");
    },
    [onConfigMissing, extractSinglePage, envConfig],
  );

  /** Stop ongoing extraction — preserve completed results, mark rest as skipped */
  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    const current = pageResultsRef.current;
    const updated = current.map((r) =>
      r.status === "pending" || r.status === "extracting"
        ? { ...r, status: "skipped" as PageStatus }
        : r,
    );
    setPageResults(updated);
    pageResultsRef.current = updated;

    setStreamingMarkdown("");
    setRateLimitWaitUntil(null);
    setIsExtracting(false);
    setStep("done");
  }, []);

  /** Retry a single page by its index in pageResults */
  const retryPage = useCallback(
    async (resultIndex: number) => {
      if (!hasAnyConfigRef.current) {
        onConfigMissing();
        return;
      }

      const images = extractionImagesRef.current;
      const target = pageResultsRef.current[resultIndex];
      if (!target) return;

      const controller = new AbortController();
      // Don't overwrite the main controller if a batch extraction is running
      // This is a single-page retry

      // Mark as extracting
      const updating = [...pageResultsRef.current];
      updating[resultIndex] = {
        ...target,
        status: "extracting",
        markdown: "",
        errorMessage: undefined,
      };
      setPageResults(updating);
      pageResultsRef.current = updating;

      setStreamingMarkdown("");

      const imageData = images[target.imageIndex];
      if (!imageData) return;

      try {
        const result = await extractSinglePage(
          imageData,
          target.imageIndex,
          target.pageNumber,
          controller.signal,
          (md) => setStreamingMarkdown(md),
        );

        const afterResults = [...pageResultsRef.current];
        afterResults[resultIndex] = result;
        setPageResults(afterResults);
        pageResultsRef.current = afterResults;
      } catch {
        // AbortError for single retry — just restore error state
        const afterResults = [...pageResultsRef.current];
        afterResults[resultIndex] = {
          ...target,
          status: "error",
          errorMessage: "重试被中断",
        };
        setPageResults(afterResults);
        pageResultsRef.current = afterResults;
      } finally {
        setStreamingMarkdown("");
      }
    },
    [onConfigMissing, extractSinglePage],
  );

  /** PDF rendered → go to select step (multi-page) */
  const handlePagesRendered = useCallback(
    (renderedPages: RenderedPage[], originalFileName: string) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      setFileType("pdf");
      setFileName(stripExtension(originalFileName));
      setPageResults([]);
      pageResultsRef.current = [];
      const images = renderedPages.map((p) => p.dataUrl);
      setExtractionImages(images);
      extractionImagesRef.current = images;
      setStep("select");
    },
    [],
  );

  /** Single image → skip select, extract directly */
  const handleImageUploaded = useCallback(
    (dataUrl: string, originalFileName: string) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      setFileType("image");
      setFileName(stripExtension(originalFileName));
      setPageResults([]);
      pageResultsRef.current = [];
      const images = [dataUrl];
      setExtractionImages(images);
      extractionImagesRef.current = images;
      startExtraction(images, [0]);
    },
    [startExtraction],
  );

  /** Start extraction for user-selected page indices */
  const handleStartSelectedExtraction = useCallback(
    (selectedIndices: number[]) => {
      const images = extractionImagesRef.current;
      startExtraction(images, selectedIndices);
    },
    [startExtraction],
  );

  const handleDocxUploaded = useCallback(async (file: File) => {
    setFileType("docx");
    setFileName(stripExtension(file.name));
    setPageResults([]);
    pageResultsRef.current = [];
    setExtractionImages([]);
    extractionImagesRef.current = [];
    setIsExtracting(true);
    setStep("extract");
    setStreamingMarkdown("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/convert-docx", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as DocxApiResponse;

      if (!result.success || !result.data) {
        const errResult: PageResult = {
          imageIndex: 0,
          pageNumber: 1,
          status: "error",
          markdown: "",
          errorMessage: `DOCX 转换失败: ${result.error ?? "未知错误"}`,
        };
        setPageResults([errResult]);
        pageResultsRef.current = [errResult];
      } else {
        const successResult: PageResult = {
          imageIndex: 0,
          pageNumber: 1,
          status: "success",
          markdown: result.data.markdown,
        };
        setPageResults([successResult]);
        pageResultsRef.current = [successResult];
        if (result.data.messages.length > 0) {
          console.warn("DOCX conversion warnings:", result.data.messages);
        }
      }
    } catch (err) {
      const errResult: PageResult = {
        imageIndex: 0,
        pageNumber: 1,
        status: "error",
        markdown: "",
        errorMessage: `DOCX 转换失败: ${err instanceof Error ? err.message : "网络错误"}`,
      };
      setPageResults([errResult]);
      pageResultsRef.current = [errResult];
    } finally {
      setIsExtracting(false);
      setStep("done");
    }
  }, []);

  const handleReset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStep("upload");
    setFileType("pdf");
    setFileName("");
    setExtractionImages([]);
    extractionImagesRef.current = [];
    setPageResults([]);
    pageResultsRef.current = [];
    setStreamingMarkdown("");
    setExtractingIdx(0);
    setIsExtracting(false);
    setRateLimitWaitUntil(null);
  }, []);

  const totalPages = Math.max(
    extractionImages.length,
    pageResults.length,
    isExtracting ? extractingIdx + 1 : 0,
  );

  return {
    step,
    fileType,
    fileName,
    extractionImages,
    pageResults,
    extractingIdx,
    isExtracting,
    streamingMarkdown,
    totalPages,
    rateLimitWaitUntil,
    handlePagesRendered,
    handleImageUploaded,
    handleDocxUploaded,
    handleStartSelectedExtraction,
    handleStop,
    retryPage,
    handleReset,
  };
}
