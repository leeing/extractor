import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EnvConfig } from "../context";
import { ModelConfigProvider, useModelConfig } from "../context";

// Setup mocks
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Ensure crypto.randomUUID is available or mocked
if (!global.crypto) {
  Object.defineProperty(global, "crypto", {
    value: { randomUUID: () => "default-uuid" },
    writable: true,
    configurable: true,
  });
}

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("ModelConfigProvider", () => {
  beforeEach(() => {
    localStorageMock.clear();
    fetchMock.mockReset();

    // Default mock for fetch /api/config
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          baseUrl: "",
          modelId: "",
          hasApiKey: false,
          isConfigured: false,
          requiresAuth: false,
        } as EnvConfig,
      }),
    });

    // Reset crypto.randomUUID mock if needed
    if (!global.crypto.randomUUID) {
      // @ts-expect-error
      global.crypto.randomUUID = () => "mock-uuid";
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with empty configs and fetches env config", async () => {
    const { result } = renderHook(() => useModelConfig(), {
      wrapper: ModelConfigProvider,
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.configs).toEqual([]);
    expect(result.current.envConfig).toEqual({
      baseUrl: "",
      modelId: "",
      hasApiKey: false,
      isConfigured: false,
      requiresAuth: false,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/config", { headers: {} });
  });

  it("adds a new config and persists it", async () => {
    const { result } = renderHook(() => useModelConfig(), {
      wrapper: ModelConfigProvider,
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));

    vi.spyOn(crypto, "randomUUID").mockReturnValue("uuid-1");

    act(() => {
      result.current.addConfig({
        name: "Test Config",
        baseUrl: "http://test",
        modelId: "gpt-4",
        apiKey: "sk-test",
        customPrompt: "",
        isActive: true,
      });
    });

    expect(result.current.configs).toHaveLength(1);
    expect(result.current.configs[0]).toEqual(
      expect.objectContaining({
        id: "uuid-1",
        name: "Test Config",
        isActive: true,
      }),
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "extractor_model_configs",
      expect.stringContaining("uuid-1"),
    );
  });

  it("updates a config", async () => {
    const { result } = renderHook(() => useModelConfig(), {
      wrapper: ModelConfigProvider,
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    vi.spyOn(crypto, "randomUUID").mockReturnValue("uuid-1");

    act(() => {
      result.current.addConfig({
        name: "Test Config",
        baseUrl: "http://test",
        modelId: "gpt-4",
        apiKey: "sk-test",
        customPrompt: "",
        isActive: true,
      });
    });

    act(() => {
      result.current.updateConfig("uuid-1", { name: "Updated Config" });
    });

    expect(result.current.configs[0]!.name).toBe("Updated Config");
  });

  it("deletes a config", async () => {
    const { result } = renderHook(() => useModelConfig(), {
      wrapper: ModelConfigProvider,
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    vi.spyOn(crypto, "randomUUID").mockReturnValue("uuid-1");

    act(() => {
      result.current.addConfig({
        name: "Test Config",
        baseUrl: "http://test",
        modelId: "gpt-4",
        apiKey: "sk-test",
        customPrompt: "",
        isActive: true,
      });
    });

    act(() => {
      result.current.deleteConfig("uuid-1");
    });

    expect(result.current.configs).toHaveLength(0);
  });

  it("sets active config", async () => {
    const { result } = renderHook(() => useModelConfig(), {
      wrapper: ModelConfigProvider,
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));

    const uuidSpy = vi.spyOn(crypto, "randomUUID");
    uuidSpy.mockReturnValueOnce("uuid-1").mockReturnValueOnce("uuid-2");

    act(() => {
      result.current.addConfig({
        name: "Config 1",
        baseUrl: "http://test",
        modelId: "gpt-4",
        apiKey: "sk-test",
        customPrompt: "",
        isActive: true,
      });
      result.current.addConfig({
        name: "Config 2",
        baseUrl: "http://test",
        modelId: "gpt-4",
        apiKey: "sk-test",
        customPrompt: "",
        isActive: false,
      });
    });

    expect(result.current.configs).toHaveLength(2);
    expect(result.current.configs[0]!.isActive).toBe(true);
    expect(result.current.configs[1]!.isActive).toBe(false);

    act(() => {
      result.current.setActiveConfig("uuid-2");
    });

    expect(result.current.configs[0]!.isActive).toBe(false);
    expect(result.current.configs[1]!.isActive).toBe(true);
  });

  it("handles access token and refetches config", async () => {
    const { result } = renderHook(() => useModelConfig(), {
      wrapper: ModelConfigProvider,
    });

    await waitFor(() => expect(result.current.isReady).toBe(true));

    // Prepare next fetch response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          baseUrl: "http://env",
          modelId: "env-model",
          hasApiKey: true,
          isConfigured: true,
          requiresAuth: false,
        } as EnvConfig,
      }),
    });

    act(() => {
      result.current.setAccessToken("new-token");
    });

    expect(result.current.accessToken).toBe("new-token");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "extractor_access_token",
      "new-token",
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/config", {
        headers: { Authorization: "Bearer new-token" },
      });
    });
  });
});
