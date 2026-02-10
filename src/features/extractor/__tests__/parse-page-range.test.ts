import { describe, expect, it } from "vitest";
import { parsePageRange } from "@/features/extractor/utils/parse-page-range";

describe("parsePageRange", () => {
  it("parses a simple range", () => {
    expect(parsePageRange("1-5", 10)).toEqual([0, 1, 2, 3, 4]);
  });

  it("parses a single page number", () => {
    expect(parsePageRange("3", 10)).toEqual([2]);
  });

  it("parses mixed ranges and singles", () => {
    expect(parsePageRange("1-3, 5, 8-10", 10)).toEqual([0, 1, 2, 4, 7, 8, 9]);
  });

  it("clamps upper bound to maxPage", () => {
    expect(parsePageRange("8-15", 10)).toEqual([7, 8, 9]);
  });

  it("clamps lower bound to 1", () => {
    expect(parsePageRange("0-3", 10)).toEqual([0, 1, 2]);
  });

  it("handles reversed range (5-3)", () => {
    expect(parsePageRange("5-3", 10)).toEqual([2, 3, 4]);
  });

  it("deduplicates overlapping ranges", () => {
    expect(parsePageRange("1-5, 3-7", 10)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("returns empty array for empty string", () => {
    expect(parsePageRange("", 10)).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    expect(parsePageRange("   ", 10)).toEqual([]);
  });

  it("returns empty array when maxPage is 0", () => {
    expect(parsePageRange("1-5", 0)).toEqual([]);
  });

  it("ignores invalid segments", () => {
    expect(parsePageRange("abc, 2, xyz, 4", 10)).toEqual([1, 3]);
  });

  it("ignores out-of-range single pages", () => {
    expect(parsePageRange("0, 11, 5", 10)).toEqual([4]);
  });

  it("handles extra whitespace gracefully", () => {
    expect(parsePageRange("  1 - 3 , 5 , 7 - 9  ", 10)).toEqual([
      0, 1, 2, 4, 6, 7, 8,
    ]);
  });

  it("handles single page equal to maxPage", () => {
    expect(parsePageRange("10", 10)).toEqual([9]);
  });

  it("handles trailing comma", () => {
    expect(parsePageRange("1, 2,", 10)).toEqual([0, 1]);
  });

  it("handles negative maxPage", () => {
    expect(parsePageRange("1-5", -1)).toEqual([]);
  });
});
