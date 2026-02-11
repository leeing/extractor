import { describe, expect, it } from "vitest";
import { resolveRateLimit } from "@/features/extractor/hooks/use-extraction";
import type { EnvConfig } from "@/features/settings/context";
import type { ModelConfig } from "@/features/settings/types";

function makeModelConfig(rateLimit?: ModelConfig["rateLimit"]): ModelConfig {
  return {
    id: "test-id",
    name: "Test Model",
    baseUrl: "https://api.example.com/v1",
    modelId: "test-model",
    apiKey: "dGVzdC1rZXk=",
    customPrompt: "test prompt",
    isActive: true,
    rateLimit,
  };
}

function makeEnvConfig(rateLimit?: EnvConfig["rateLimit"]): EnvConfig {
  return {
    baseUrl: "https://env.example.com/v1",
    modelId: "env-model",
    hasApiKey: true,
    isConfigured: true,
    rateLimit,
  };
}

describe("resolveRateLimit", () => {
  it("returns undefined when both activeConfig and envConfig are null", () => {
    expect(resolveRateLimit(null, null)).toBeUndefined();
  });

  it("returns env rateLimit when only envConfig has rate limit", () => {
    const envRl = { maxRequests: 10, requestWindowSeconds: 60 };
    const result = resolveRateLimit(null, makeEnvConfig(envRl));
    expect(result).toEqual(envRl);
  });

  it("returns model rateLimit when only model has rate limit", () => {
    const modelRl = { maxRequests: 5, requestWindowSeconds: 30 };
    const result = resolveRateLimit(makeModelConfig(modelRl), null);
    expect(result).toEqual(modelRl);
  });

  it("prefers model rateLimit over env rateLimit when both are set", () => {
    const modelRl = { maxRequests: 5, requestWindowSeconds: 30 };
    const envRl = { maxRequests: 10, requestWindowSeconds: 60 };
    const result = resolveRateLimit(
      makeModelConfig(modelRl),
      makeEnvConfig(envRl),
    );
    expect(result).toEqual(modelRl);
  });

  it("falls back to env rateLimit when model rateLimit has all zeros", () => {
    const modelRl = {
      maxRequests: 0,
      requestWindowSeconds: 0,
      maxInputTokensPerMinute: 0,
      maxOutputTokensPerMinute: 0,
    };
    const envRl = { maxRequests: 10, requestWindowSeconds: 60 };
    const result = resolveRateLimit(
      makeModelConfig(modelRl),
      makeEnvConfig(envRl),
    );
    expect(result).toEqual(envRl);
  });

  it("returns undefined when env rateLimit has all zeros", () => {
    const envRl = {
      maxRequests: 0,
      requestWindowSeconds: 0,
      maxInputTokensPerMinute: 0,
      maxOutputTokensPerMinute: 0,
    };
    const result = resolveRateLimit(null, makeEnvConfig(envRl));
    expect(result).toBeUndefined();
  });
});
