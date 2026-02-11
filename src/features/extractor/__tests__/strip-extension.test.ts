import { describe, expect, it } from "vitest";

/**
 * stripExtension — extracted from use-extraction.ts for unit testing.
 * TODO: export from a shared utils module.
 */
function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

describe("stripExtension", () => {
  it("removes .pdf extension", () => {
    expect(stripExtension("report.pdf")).toBe("report");
  });

  it("removes .docx extension", () => {
    expect(stripExtension("合同文档.docx")).toBe("合同文档");
  });

  it("removes .png extension", () => {
    expect(stripExtension("screenshot.png")).toBe("screenshot");
  });

  it("handles multiple dots — only removes the last", () => {
    expect(stripExtension("my.report.v2.pdf")).toBe("my.report.v2");
  });

  it("returns original string when no extension", () => {
    expect(stripExtension("README")).toBe("README");
  });

  it("handles empty string", () => {
    expect(stripExtension("")).toBe("");
  });
});
