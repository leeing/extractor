"use client";

import { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

interface ResultPanelProps {
  markdown: string;
  isStreaming: boolean;
  pageNumber: number;
  totalPages: number;
}

export function ResultPanel({
  markdown,
  isStreaming,
  pageNumber,
  totalPages,
}: ResultPanelProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 2000);
    }
  }, [markdown]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extracted_page_${pageNumber}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [markdown, pageNumber]);

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {totalPages <= 1 ? "提取结果" : `第 ${pageNumber}/${totalPages} 页`}
          </span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-blue-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              生成中...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {showRaw ? "预览" : "源码"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!markdown}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4" style={{ maxHeight: "60vh" }}>
        {!markdown && !isStreaming ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
            等待转换...
          </div>
        ) : showRaw ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-sm text-zinc-800 dark:text-zinc-200">
            {markdown}
          </pre>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-table:text-sm prose-th:bg-zinc-100 dark:prose-th:bg-zinc-800">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
              {markdown}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block h-4 w-1 animate-pulse bg-blue-500" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
