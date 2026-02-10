"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ModelConfig } from "./types";
import { DEFAULT_EXTRACT_PROMPT } from "./types";

const STORAGE_KEY = "extractor_model_configs";

function isModelConfigArray(data: unknown): data is ModelConfig[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "name" in item &&
        "baseUrl" in item &&
        "modelId" in item &&
        "apiKey" in item,
    )
  );
}

/** Env-based configuration info (from /api/config) */
export interface EnvConfig {
  baseUrl: string;
  modelId: string;
  hasApiKey: boolean;
  isConfigured: boolean;
}

interface ModelConfigContextValue {
  configs: ModelConfig[];
  activeConfig: ModelConfig | null;
  envConfig: EnvConfig | null;
  /** True if env or user config is available for extraction */
  hasAnyConfig: boolean;
  addConfig: (config: Omit<ModelConfig, "id">) => void;
  updateConfig: (id: string, updates: Partial<ModelConfig>) => void;
  deleteConfig: (id: string) => void;
  setActiveConfig: (id: string) => void;
}

const ModelConfigContext = createContext<ModelConfigContextValue | null>(null);

function loadConfigs(): ModelConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isModelConfigArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveConfigs(configs: ModelConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

/** Encode API key for localStorage (NOT encryption, just obfuscation) */
export function encodeApiKey(key: string): string {
  return btoa(key);
}

/** Decode API key from localStorage */
export function decodeApiKey(encoded: string): string {
  try {
    return atob(encoded);
  } catch {
    return encoded;
  }
}

export function ModelConfigProvider({ children }: { children: ReactNode }) {
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [envConfig, setEnvConfig] = useState<EnvConfig | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setConfigs(loadConfigs());
    setIsLoaded(true);
  }, []);

  // Fetch env config from server
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((res: { success: boolean; data: EnvConfig }) => {
        if (res.success) setEnvConfig(res.data);
      })
      .catch((err: unknown) => {
        console.error("Failed to fetch env config:", err);
      });
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      saveConfigs(configs);
    }
  }, [configs, isLoaded]);

  const addConfig = useCallback((config: Omit<ModelConfig, "id">) => {
    const newConfig: ModelConfig = {
      ...config,
      id: crypto.randomUUID(),
      apiKey: encodeApiKey(config.apiKey),
    };
    setConfigs((prev) => {
      // If this is the first config or it's set as active, deactivate others
      if (newConfig.isActive || prev.length === 0) {
        return [
          ...prev.map((c) => ({ ...c, isActive: false })),
          { ...newConfig, isActive: true },
        ];
      }
      return [...prev, newConfig];
    });
  }, []);

  const updateConfig = useCallback(
    (id: string, updates: Partial<ModelConfig>) => {
      setConfigs((prev) =>
        prev.map((c) => {
          if (c.id !== id) {
            // If the update activates another config, deactivate this one
            if (updates.isActive) return { ...c, isActive: false };
            return c;
          }
          const updated = { ...c, ...updates };
          // Re-encode API key if changed
          if (updates.apiKey && updates.apiKey !== c.apiKey) {
            updated.apiKey = encodeApiKey(updates.apiKey);
          }
          return updated;
        }),
      );
    },
    [],
  );

  const deleteConfig = useCallback((id: string) => {
    setConfigs((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      // If deleted the active one, activate the first remaining
      const first = remaining[0];
      if (first && !remaining.some((c) => c.isActive)) {
        remaining[0] = { ...first, isActive: true };
      }
      return remaining;
    });
  }, []);

  const setActiveConfig = useCallback((id: string) => {
    setConfigs((prev) => prev.map((c) => ({ ...c, isActive: c.id === id })));
  }, []);

  const activeConfig = configs.find((c) => c.isActive) ?? null;
  const hasAnyConfig =
    Boolean(activeConfig) || Boolean(envConfig?.isConfigured);

  return (
    <ModelConfigContext.Provider
      value={{
        configs,
        activeConfig,
        envConfig,
        hasAnyConfig,
        addConfig,
        updateConfig,
        deleteConfig,
        setActiveConfig,
      }}
    >
      {children}
    </ModelConfigContext.Provider>
  );
}

export function useModelConfig(): ModelConfigContextValue {
  const context = useContext(ModelConfigContext);
  if (!context) {
    throw new Error("useModelConfig must be used within ModelConfigProvider");
  }
  return context;
}

/** Get the decoded active config (with raw API key) for API calls */
export function getDecodedConfig(config: ModelConfig): ModelConfig {
  return {
    ...config,
    apiKey: decodeApiKey(config.apiKey),
  };
}

/** Create a new blank config with default values */
export function createBlankConfig(): Omit<ModelConfig, "id"> {
  return {
    name: "",
    baseUrl: "",
    modelId: "",
    apiKey: "",
    customPrompt: DEFAULT_EXTRACT_PROMPT,
    isActive: false,
  };
}
