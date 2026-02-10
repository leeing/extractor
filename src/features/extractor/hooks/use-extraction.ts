"use client";

import { useCallback, useRef, useState } from "react";
import type { RenderedPage } from "@/features/extractor/services/pdf-renderer";
import { getDecodedConfig } from "@/features/settings/context";
import type { ModelConfig } from "@/features/settings/types";

/** Pipeline step */
export type Step = "upload" | "extract" | "done";

/** Uploaded file type */
export type FileType = "pdf" | "docx" | "image";

/** DOCX API response shape */
interface DocxApiResponse {
  success: boolean;
  data?: { markdown: string; messages: string[] };
  error?: string;
}

interface UseExtractionOptions {
  hasAnyConfig: boolean;
  activeConfig: ModelConfig | null;
  onConfigMissing: () => void;
}

interface UseExtractionReturn {
  step: Step;
  fileType: FileType;
  extractionImages: string[];
  allMarkdown: string[];
  extractingIdx: number;
  isExtracting: boolean;
  streamingMarkdown: string;
  totalPages: number;
  handlePagesRendered: (renderedPages: RenderedPage[]) => void;
  handleImageUploaded: (dataUrl: string) => void;
  handleDocxUploaded: (file: File) => void;
  handleReset: () => void;
}

/**
 * Hook encapsulating all extraction logic:
 * - LLM-based page-by-page extraction for PDF/image
 * - DOCX conversion via /api/convert-docx
 * - Streaming state management
 */
export function useExtraction({
  hasAnyConfig,
  activeConfig,
  onConfigMissing,
}: UseExtractionOptions): UseExtractionReturn {
  const [step, setStep] = useState<Step>("upload");
  const [fileType, setFileType] = useState<FileType>("pdf");
  const [extractionImages, setExtractionImages] = useState<string[]>([]);
  const [allMarkdown, setAllMarkdown] = useState<string[]>([]);
  const [extractingIdx, setExtractingIdx] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [streamingMarkdown, setStreamingMarkdown] = useState("");

  // Refs to avoid stale closures
  const hasAnyConfigRef = useRef(hasAnyConfig);
  hasAnyConfigRef.current = hasAnyConfig;
  const activeConfigRef = useRef(activeConfig);
  activeConfigRef.current = activeConfig;
  const abortControllerRef = useRef<AbortController | null>(null);

  // Core extraction: call LLM page by page
  const startExtraction = useCallback(
    async (images: string[]) => {
      if (!hasAnyConfigRef.current) {
        onConfigMissing();
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsExtracting(true);
      setExtractingIdx(0);
      const results: string[] = [];
      const currentConfig = activeConfigRef.current;
      const decoded = currentConfig ? getDecodedConfig(currentConfig) : null;

      for (let i = 0; i < images.length; i++) {
        if (controller.signal.aborted) break;

        setExtractingIdx(i);
        setStreamingMarkdown("");

        try {
          const response = await fetch("/api/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: images[i],
              baseUrl: decoded?.baseUrl ?? "",
              modelId: decoded?.modelId ?? "",
              apiKey: decoded?.apiKey ?? "",
              customPrompt: decoded?.customPrompt ?? "",
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errText = await response.text();
            results.push(`> ⚠️ 第 ${i + 1} 页提取失败: ${errText}`);
            setAllMarkdown([...results]);
            continue;
          }

          // Read the streaming response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let pageMarkdown = "";

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              pageMarkdown += chunk;
              setStreamingMarkdown(pageMarkdown);
            }
          }

          results.push(pageMarkdown);
          setAllMarkdown([...results]);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }
          results.push(
            `> ⚠️ 第 ${i + 1} 页提取失败: ${err instanceof Error ? err.message : "网络错误"}`,
          );
          setAllMarkdown([...results]);
        }
      }

      setIsExtracting(false);
      setStep("done");
    },
    [onConfigMissing],
  );

  const handlePagesRendered = useCallback(
    (renderedPages: RenderedPage[]) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      setFileType("pdf");
      setAllMarkdown([]);
      const images = renderedPages.map((p) => p.dataUrl);
      setExtractionImages(images);
      setStep("extract");
      startExtraction(images);
    },
    [startExtraction],
  );

  const handleImageUploaded = useCallback(
    (dataUrl: string) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      setFileType("image");
      setAllMarkdown([]);
      setExtractionImages([dataUrl]);
      setStep("extract");
      startExtraction([dataUrl]);
    },
    [startExtraction],
  );

  const handleDocxUploaded = useCallback(async (file: File) => {
    setFileType("docx");
    setAllMarkdown([]);
    setExtractionImages([]);
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
        setAllMarkdown([`> ⚠️ DOCX 转换失败: ${result.error ?? "未知错误"}`]);
      } else {
        setAllMarkdown([result.data.markdown]);
        if (result.data.messages.length > 0) {
          console.warn("DOCX conversion warnings:", result.data.messages);
        }
      }
    } catch (err) {
      setAllMarkdown([
        `> ⚠️ DOCX 转换失败: ${err instanceof Error ? err.message : "网络错误"}`,
      ]);
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
    setExtractionImages([]);
    setAllMarkdown([]);
    setStreamingMarkdown("");
    setExtractingIdx(0);
    setIsExtracting(false);
  }, []);

  const totalPages = Math.max(
    extractionImages.length,
    allMarkdown.length,
    isExtracting ? extractingIdx + 1 : 0,
  );

  return {
    step,
    fileType,
    extractionImages,
    allMarkdown,
    extractingIdx,
    isExtracting,
    streamingMarkdown,
    totalPages,
    handlePagesRendered,
    handleImageUploaded,
    handleDocxUploaded,
    handleReset,
  };
}
