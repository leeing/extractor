"use client";

import { useCallback, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PageStatus } from "@/features/extractor/hooks/use-extraction";

/**
 * Strip wrapping ```markdown ... ``` code fences that LLMs often add
 * despite being told not to.
 */
function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(
    /^```(?:markdown|md)?\s*\n([\s\S]*?)(?:\n```\s*$|$)/,
  );
  return match ? (match[1] ?? text) : text;
}

interface ResultPanelProps {
  markdown: string;
  isStreaming: boolean;
  pageNumber: number;
  totalPages: number;
  fileName?: string;
  status?: PageStatus;
  errorMessage?: string | undefined;
  onRetry?: () => void;
}

export function ResultPanel({
  markdown,
  isStreaming,
  pageNumber,
  totalPages,
  fileName,
  status,
  errorMessage,
  onRetry,
}: ResultPanelProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const cleanMarkdown = useMemo(() => stripMarkdownFence(markdown), [markdown]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cleanMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 2000);
    }
  }, [cleanMarkdown]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([cleanMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = fileName || "extracted_page";
    a.download = `${baseName}_${String(pageNumber).padStart(3, "0")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [cleanMarkdown, pageNumber, fileName]);

  const isError = status === "error";
  const isSkipped = status === "skipped";
  const isExtracting = status === "extracting";

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-700">
            {totalPages <= 1 ? "提取结果" : `第 ${pageNumber}/${totalPages} 页`}
          </span>
          {(isStreaming || isExtracting) && (
            <span className="flex items-center gap-1 text-xs text-blue-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              生成中...
            </span>
          )}
          {isError && (
            <span className="text-xs font-medium text-red-500">提取失败</span>
          )}
          {isSkipped && (
            <span className="text-xs font-medium text-zinc-400">未提取</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onRetry && (isError || isSkipped) && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              {isSkipped ? "提取此页" : "重试"}
            </button>
          )}
          {!isError && !isSkipped && (
            <>
              <button
                type="button"
                onClick={() => setShowRaw(!showRaw)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
              >
                {showRaw ? "预览" : "源码"}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!markdown}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50"
              >
                {copyFailed ? "复制失败" : copied ? "✓ 已复制" : "复制"}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!markdown}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                下载 .md
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-auto bg-zinc-50/50 p-6"
        style={{ maxHeight: "60vh" }}
      >
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage ?? "提取失败"}
            </div>
          </div>
        ) : isSkipped ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
            该页未提取
          </div>
        ) : !markdown && !isStreaming && !isExtracting ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
            等待转换...
          </div>
        ) : showRaw ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-sm text-zinc-800">
            {cleanMarkdown}
          </pre>
        ) : (
          <div className="prose max-w-none break-words prose-headings:font-semibold prose-table:text-sm prose-th:bg-zinc-100 prose-pre:bg-zinc-100 prose-pre:text-zinc-800">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {cleanMarkdown}
            </ReactMarkdown>
            {(isStreaming || isExtracting) && (
              <span className="inline-block h-4 w-1 animate-pulse bg-blue-500" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
