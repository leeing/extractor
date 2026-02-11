import { describe, expect, it } from "vitest";
import { decodeApiKey, encodeApiKey } from "@/features/settings/context";

describe("API Key encoding", () => {
  it("encodes and decodes round-trip", () => {
    const key = "sk-abc123xyz";
    const encoded = encodeApiKey(key);
    expect(encoded).not.toBe(key);
    expect(decodeApiKey(encoded)).toBe(key);
  });

  it("encodes to base64", () => {
    const key = "test-key";
    expect(encodeApiKey(key)).toBe(btoa(key));
  });

  it("handles empty string", () => {
    expect(encodeApiKey("")).toBe("");
    expect(decodeApiKey("")).toBe("");
  });

  it("returns original string on invalid base64 decode", () => {
    const invalid = "%%%not-base64%%%";
    expect(decodeApiKey(invalid)).toBe(invalid);
  });

  it("handles unicode characters in key", () => {
    const key = "key-with-special-chars-!@#$%";
    const encoded = encodeApiKey(key);
    expect(decodeApiKey(encoded)).toBe(key);
  });
});
