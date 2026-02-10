"use client";

import clsx from "clsx";
import { useCallback, useRef, useState } from "react";
import type { RenderedPage } from "../services/pdf-renderer";

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const ACCEPTED_TYPES = ["application/pdf", DOCX_MIME_TYPE];

const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

interface FileUploadProps {
  onPagesRendered: (pages: RenderedPage[]) => void;
  onDocxUploaded: (file: File) => void;
  onImageUploaded: (dataUrl: string) => void;
  isProcessing: boolean;
  abortSignal?: AbortSignal;
}

export function FileUpload({
  onPagesRendered,
  onDocxUploaded,
  onImageUploaded,
  isProcessing,
  abortSignal,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      const isAccepted =
        ACCEPTED_TYPES.includes(file.type) ||
        ACCEPTED_IMAGE_TYPES.includes(file.type);
      if (!isAccepted) {
        setError("仅支持 PDF、Word (.docx) 和图片 (PNG/JPG/WEBP) 格式");
        return;
      }

      // Size check applies to all file types
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        setError("文件大小不能超过 100MB");
        return;
      }

      // DOCX: delegate to parent via callback
      if (file.type === DOCX_MIME_TYPE) {
        onDocxUploaded(file);
        return;
      }

      // Image: read as data URL and delegate
      if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setProgress({ current: 0, total: 1 });
        const reader = new FileReader();
        reader.onload = () => {
          setProgress(null);
          if (typeof reader.result === "string") {
            onImageUploaded(reader.result);
          }
        };
        reader.onerror = () => {
          setProgress(null);
          setError("图片读取失败");
        };
        reader.readAsDataURL(file);
        return;
      }

      try {
        setProgress({ current: 0, total: 0 });

        // Dynamic import to avoid SSR issues
        const { renderPdfToImages } = await import("../services/pdf-renderer");

        const arrayBuffer = await file.arrayBuffer();
        const pages = await renderPdfToImages(
          arrayBuffer,
          2,
          (current, total) => {
            setProgress({ current, total });
          },
          abortSignal,
        );

        onPagesRendered(pages);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setError(
          `PDF 解析失败: ${err instanceof Error ? err.message : "未知错误"}`,
        );
      } finally {
        setProgress(null);
      }
    },
    [onPagesRendered, onDocxUploaded, onImageUploaded, abortSignal],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so re-uploading the same file triggers onChange
      e.target.value = "";
    },
    [handleFile],
  );

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        className={clsx(
          "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center",
          "rounded-2xl border-2 border-dashed p-8 transition-all duration-300",
          isDragging
            ? "border-blue-400 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/20"
            : "border-zinc-300 bg-zinc-50/50 hover:border-blue-300 hover:bg-blue-50/30 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-blue-600",
          isProcessing && "pointer-events-none opacity-60",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp"
          onChange={handleInputChange}
          className="hidden"
          id="file-upload-input"
        />

        {progress ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              正在渲染第 {progress.current} / {progress.total} 页...
            </p>
            <div className="h-2 w-48 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <svg
              className="h-12 w-12 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <title>Upload</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <div className="text-center">
              <p className="text-base font-medium text-zinc-700 dark:text-zinc-300">
                拖拽文件到此处，或{" "}
                <span className="text-blue-500">点击选择</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                支持 PDF、Word (.docx)、图片 (PNG/JPG/WEBP)，最大 100MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
