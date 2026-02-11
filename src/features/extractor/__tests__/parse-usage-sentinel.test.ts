import { describe, expect, it } from "vitest";
import { parseUsageSentinel } from "@/features/extractor/hooks/use-extraction";

describe("parseUsageSentinel", () => {
  it("parses markdown with usage sentinel at the end", () => {
    const raw =
      '# Hello\nSome content\n<!--EXTRACT_USAGE:{"prompt_tokens":100,"completion_tokens":50}-->';
    const result = parseUsageSentinel(raw);
    expect(result.markdown).toBe("# Hello\nSome content");
    expect(result.usage).toEqual({
      promptTokens: 100,
      completionTokens: 50,
    });
  });

  it("returns original markdown when no sentinel is present", () => {
    const raw = "# Hello\nNo sentinel here";
    const result = parseUsageSentinel(raw);
    expect(result.markdown).toBe(raw);
    expect(result.usage).toBeUndefined();
  });

  it("handles sentinel followed by trailing whitespace", () => {
    const raw =
      '# Hello\n<!--EXTRACT_USAGE:{"prompt_tokens":200,"completion_tokens":80}-->  \n';
    const result = parseUsageSentinel(raw);
    expect(result.markdown).toBe("# Hello");
    expect(result.usage).toEqual({
      promptTokens: 200,
      completionTokens: 80,
    });
  });

  it("returns empty markdown for empty string input", () => {
    const result = parseUsageSentinel("");
    expect(result.markdown).toBe("");
    expect(result.usage).toBeUndefined();
  });

  it("does not match sentinel in the middle of the text", () => {
    const raw =
      '# Hello\n<!--EXTRACT_USAGE:{"prompt_tokens":10,"completion_tokens":5}-->\nMore content after';
    const result = parseUsageSentinel(raw);
    expect(result.markdown).toBe(raw);
    expect(result.usage).toBeUndefined();
  });
});
