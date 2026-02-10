"use client";

import { useCallback, useState } from "react";
import { FileUpload } from "@/features/extractor/components/file-upload";
import { PageRangeSelector } from "@/features/extractor/components/page-range-selector";
import { ResultPanel } from "@/features/extractor/components/result-panel";
import { useExtraction } from "@/features/extractor/hooks/use-extraction";
import { SettingsDialog } from "@/features/settings/components/settings-dialog";
import { useModelConfig } from "@/features/settings/context";

export function ExtractorPage() {
  const { activeConfig, hasAnyConfig, envConfig } = useModelConfig();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    step,
    fileName,
    extractionImages,
    pageResults,
    extractingIdx,
    isExtracting,
    streamingMarkdown,
    totalPages,
    handlePagesRendered,
    handleImageUploaded,
    handleDocxUploaded,
    handleStartSelectedExtraction,
    handleStop,
    retryPage,
    handleReset,
  } = useExtraction({
    hasAnyConfig,
    activeConfig,
    onConfigMissing: () => setSettingsOpen(true),
  });

  // Download all markdown (only successful pages)
  const handleDownloadAll = useCallback(() => {
    const successResults = pageResults.filter((r) => r.status === "success");
    const combined = successResults
      .map((r) => `<!-- Page ${r.pageNumber} -->\n\n${r.markdown}`)
      .join("\n\n---\n\n");
    const blob = new Blob([combined], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName || "extracted_document"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pageResults, fileName]);

  // Copy all markdown (only successful pages)
  const [copiedAll, setCopiedAll] = useState(false);
  const [copyAllFailed, setCopyAllFailed] = useState(false);
  const handleCopyAll = useCallback(async () => {
    try {
      const successResults = pageResults.filter((r) => r.status === "success");
      const combined = successResults
        .map((r) => r.markdown)
        .join("\n\n---\n\n");
      await navigator.clipboard.writeText(combined);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      setCopyAllFailed(true);
      setTimeout(() => setCopyAllFailed(false), 2000);
    }
  }, [pageResults]);

  const successCount = pageResults.filter((r) => r.status === "success").length;
  const hasResults = pageResults.length > 0;

  return (
    <>
      <SettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-white text-sm font-bold">
              E
            </div>
            <h1 className="text-lg font-semibold text-zinc-900">
              Document Extractor
            </h1>
          </button>
          <div className="flex items-center gap-3">
            {activeConfig && (
              <span className="hidden sm:inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                {activeConfig.name}
              </span>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <title>Settings</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93s.844.136 1.173-.149l.707-.565c.432-.345 1.064-.286 1.42.126l.773.773c.412.412.47 1.044.126 1.42l-.565.707c-.285.329-.373.781-.149 1.173.162.396.506.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.424.07-.764.384-.93.78s-.136.844.149 1.173l.565.707c.345.432.286 1.064-.126 1.42l-.773.773c-.412.412-1.044.47-1.42.126l-.707-.565c-.329-.285-.781-.373-1.173-.149-.396.162-.71.506-.78.93l-.15.893c-.09.543-.56.94-1.109.94h-1.094c-.55 0-1.02-.397-1.11-.94l-.148-.893c-.071-.424-.384-.764-.781-.93s-.844-.136-1.173.149l-.707.565c-.432.345-1.064.286-1.42-.126l-.773-.773c-.412-.412-.47-1.044-.126-1.42l.565-.707c.285-.329.373-.781.149-1.173-.162-.396-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.764-.384.93-.78s.136-.844-.149-1.173l-.565-.707c-.345-.432-.286-1.064.126-1.42l.773-.773c.412-.412 1.044-.47 1.42-.126l.707.565c.329.285.781.373 1.173.149.396-.162.71-.506.78-.93l.15-.894z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              模型设置
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Step: Upload */}
        {step === "upload" && (
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-zinc-900">文档智能提取</h2>
              <p className="mt-2 text-sm text-zinc-500">
                上传 PDF、Word (.docx) 或图片，智能转换为 Markdown
              </p>
            </div>

            {!hasAnyConfig && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                ⚠️ PDF / 图片提取需要先配置 LLM 模型。请{" "}
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="font-medium underline"
                >
                  配置模型
                </button>{" "}
                或设置 .env.local 环境变量（Word 文档无需配置）
              </div>
            )}

            {envConfig?.isConfigured && !activeConfig && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                ✅ 已检测到环境变量配置：{envConfig.modelId}
                （可在设置中自定义覆盖）
              </div>
            )}

            <FileUpload
              onPagesRendered={handlePagesRendered}
              onDocxUploaded={handleDocxUploaded}
              onImageUploaded={handleImageUploaded}
              isProcessing={false}
            />
          </div>
        )}

        {/* Step: Select pages */}
        {step === "select" && (
          <PageRangeSelector
            images={extractionImages}
            onStartExtraction={handleStartSelectedExtraction}
          />
        )}

        {/* Step: Extract (streaming) / Done */}
        {(step === "extract" || step === "done") && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">
                提取结果
                {isExtracting && (
                  <span className="ml-2 text-sm font-normal text-zinc-500">
                    ({extractingIdx + 1}/{pageResults.length})
                  </span>
                )}
              </h2>
              <div className="flex gap-2">
                {isExtracting && (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
                  >
                    停止提取
                  </button>
                )}
                {step === "done" && successCount > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyAll}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
                    >
                      {copyAllFailed
                        ? "复制失败"
                        : copiedAll
                          ? "✓ 已复制"
                          : "复制全部"}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadAll}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      下载全部 .md
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
                >
                  重新开始
                </button>
              </div>
            </div>

            {/* Show results per page */}
            {hasResults && (
              <div className="space-y-4">
                {pageResults.map((pr, i) => (
                  <ResultPanel
                    key={`page-result-${pr.imageIndex}`}
                    markdown={
                      pr.status === "extracting"
                        ? streamingMarkdown
                        : pr.markdown
                    }
                    isStreaming={pr.status === "extracting"}
                    pageNumber={pr.pageNumber}
                    totalPages={totalPages}
                    fileName={fileName}
                    status={pr.status}
                    errorMessage={pr.errorMessage}
                    onRetry={() => retryPage(i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
