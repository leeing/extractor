"use client";

import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createBlankConfig,
  decodeApiKey,
  useModelConfig,
} from "../../settings/context";
import type { ModelConfig } from "../../settings/types";
import { MODEL_PRESETS } from "../../settings/types";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { configs, addConfig, updateConfig, deleteConfig, setActiveConfig } =
    useModelConfig();
  const [editingConfig, setEditingConfig] = useState<Omit<
    ModelConfig,
    "id"
  > | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleAddNew = useCallback(() => {
    setEditingConfig(createBlankConfig());
    setEditingId(null);
    setShowApiKey(false);
  }, []);

  const handleEdit = useCallback((config: ModelConfig) => {
    setEditingConfig({
      ...config,
      apiKey: decodeApiKey(config.apiKey),
    });
    setEditingId(config.id);
    setShowApiKey(false);
  }, []);

  const handlePreset = useCallback((preset: (typeof MODEL_PRESETS)[number]) => {
    setEditingConfig({
      ...preset,
      apiKey: "",
      isActive: true,
    });
    setEditingId(null);
    setShowApiKey(false);
  }, []);

  const handleSave = useCallback(() => {
    if (!editingConfig) return;
    if (
      !editingConfig.name ||
      !editingConfig.baseUrl ||
      !editingConfig.modelId ||
      !editingConfig.apiKey
    ) {
      return;
    }

    if (editingId) {
      updateConfig(editingId, editingConfig);
    } else {
      addConfig(editingConfig);
    }
    setEditingConfig(null);
    setEditingId(null);
  }, [editingConfig, editingId, updateConfig, addConfig]);

  const handleCancel = useCallback(() => {
    setEditingConfig(null);
    setEditingId(null);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Focus dialog content when opened
  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        className="relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <h2
            id="settings-dialog-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            模型配置
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <title>Close</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {editingConfig ? (
            /* Edit Form */
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {editingId ? "编辑配置" : "新增配置"}
              </h3>

              {!editingId && (
                <div>
                  <span className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
                    快速选择预设
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {MODEL_PRESETS.map((preset) => (
                      <button
                        key={preset.modelId}
                        type="button"
                        onClick={() => handlePreset(preset)}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-blue-600 dark:hover:bg-blue-950/30"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="config-name"
                  className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400"
                >
                  配置名称
                </label>
                <input
                  id="config-name"
                  type="text"
                  value={editingConfig.name}
                  onChange={(e) =>
                    setEditingConfig({ ...editingConfig, name: e.target.value })
                  }
                  placeholder="例如: Qwen-VL 生产"
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:text-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="config-baseurl"
                  className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400"
                >
                  Base URL
                </label>
                <input
                  id="config-baseurl"
                  type="url"
                  value={editingConfig.baseUrl}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      baseUrl: e.target.value,
                    })
                  }
                  placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm font-mono text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:text-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="config-modelid"
                  className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400"
                >
                  Model ID
                </label>
                <input
                  id="config-modelid"
                  type="text"
                  value={editingConfig.modelId}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      modelId: e.target.value,
                    })
                  }
                  placeholder="qwen-vl-plus"
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm font-mono text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:text-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="config-apikey"
                  className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400"
                >
                  API Key
                </label>
                <div className="relative">
                  <input
                    id="config-apikey"
                    type={showApiKey ? "text" : "password"}
                    value={editingConfig.apiKey}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        apiKey: e.target.value,
                      })
                    }
                    placeholder="sk-..."
                    className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 pr-10 text-sm font-mono text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    {showApiKey ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="config-prompt"
                  className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400"
                >
                  自定义提示词
                </label>
                <textarea
                  id="config-prompt"
                  value={editingConfig.customPrompt}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      customPrompt: e.target.value,
                    })
                  }
                  rows={6}
                  className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    !editingConfig.name ||
                    !editingConfig.baseUrl ||
                    !editingConfig.modelId ||
                    !editingConfig.apiKey
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            /* Config List */
            <div className="space-y-4">
              {configs.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-zinc-200 p-8 text-center dark:border-zinc-700">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    暂无模型配置，请添加一个
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {configs.map((config) => (
                    <div
                      key={config.id}
                      className={clsx(
                        "flex items-center justify-between rounded-xl border p-4 transition-colors",
                        config.isActive
                          ? "border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/20"
                          : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                            {config.name}
                          </span>
                          {config.isActive && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              当前
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs font-mono text-zinc-500 dark:text-zinc-400">
                          {config.modelId} • {config.baseUrl}
                        </p>
                      </div>
                      <div className="ml-2 flex gap-1">
                        {!config.isActive && (
                          <button
                            type="button"
                            onClick={() => setActiveConfig(config.id)}
                            className="rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                          >
                            激活
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEdit(config)}
                          className="rounded-lg px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                "确定要删除此配置吗？删除后无法恢复。",
                              )
                            ) {
                              deleteConfig(config.id);
                            }
                          }}
                          className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddNew}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-600 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <title>Add</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                添加模型配置
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
