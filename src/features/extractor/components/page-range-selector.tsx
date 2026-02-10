"use client";

import { useState } from "react";
import { parsePageRange } from "@/features/extractor/utils/parse-page-range";

interface PageRangeSelectorProps {
  images: string[];
  onStartExtraction: (selectedIndices: number[]) => void;
}

export function PageRangeSelector({
  images,
  onStartExtraction,
}: PageRangeSelectorProps) {
  const totalPages = images.length;
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(images.map((_, i) => i)),
  );
  const [rangeInput, setRangeInput] = useState("");

  const togglePage = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(images.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const applyRange = () => {
    const indices = parsePageRange(rangeInput, totalPages);
    if (indices.length > 0) {
      setSelected(new Set(indices));
    }
  };

  const handleStart = () => {
    const sorted = [...selected].sort((a, b) => a - b);
    if (sorted.length > 0) {
      onStartExtraction(sorted);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-900">选择提取页码</h2>
        <p className="mt-2 text-sm text-zinc-500">
          共 {totalPages} 页，已选 {selected.size} 页
        </p>
      </div>

      {/* Range input */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={rangeInput}
          onChange={(e) => setRangeInput(e.target.value)}
          placeholder="输入页码范围，如 1-5, 8, 10-15"
          className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <button
          type="button"
          onClick={applyRange}
          disabled={!rangeInput.trim()}
          className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
        >
          应用
        </button>
        <button
          type="button"
          onClick={selectAll}
          className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          全选
        </button>
        <button
          type="button"
          onClick={deselectAll}
          className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          取消全选
        </button>
      </div>

      {/* Thumbnail grid */}
      <div className="grid grid-cols-5 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {images.map((img, i) => (
          <button
            key={`thumb-${i}`}
            type="button"
            onClick={() => togglePage(i)}
            className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
              selected.has(i)
                ? "border-blue-500 shadow-sm shadow-blue-200"
                : "border-zinc-200 opacity-60 hover:opacity-90"
            }`}
          >
            {/* biome-ignore lint/performance/noImgElement: data URLs from PDF renderer cannot use next/image optimization */}
            <img
              src={img}
              alt={`第 ${i + 1} 页`}
              className="aspect-[3/4] w-full object-cover"
            />
            <span
              className={`absolute bottom-0 left-0 right-0 py-0.5 text-center text-xs font-medium ${
                selected.has(i)
                  ? "bg-blue-500 text-white"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {i + 1}
            </span>
            {selected.has(i) && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Start button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleStart}
          disabled={selected.size === 0}
          className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          开始提取 ({selected.size} 页)
        </button>
      </div>
    </div>
  );
}
