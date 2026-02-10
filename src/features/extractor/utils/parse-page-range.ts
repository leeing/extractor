/**
 * Parse a page range expression like "1-5, 8, 10-15" into a sorted,
 * deduplicated array of 0-indexed page indices.
 *
 * @param input - User input string (1-indexed page numbers)
 * @param maxPage - Total number of pages (used to clamp upper bounds)
 * @returns Sorted array of 0-indexed indices, or empty array on invalid input
 */
export function parsePageRange(input: string, maxPage: number): number[] {
  if (!input.trim() || maxPage <= 0) return [];

  const result = new Set<number>();
  const segments = input.split(",");

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (Number.isNaN(start) || Number.isNaN(end)) continue;

      const clampedStart = Math.max(1, Math.min(start, maxPage));
      const clampedEnd = Math.max(1, Math.min(end, maxPage));
      const lo = Math.min(clampedStart, clampedEnd);
      const hi = Math.max(clampedStart, clampedEnd);

      for (let i = lo; i <= hi; i++) {
        result.add(i - 1); // Convert to 0-indexed
      }
      continue;
    }

    const singleMatch = trimmed.match(/^(\d+)$/);
    if (singleMatch) {
      const page = Number(singleMatch[1]);
      if (!Number.isNaN(page) && page >= 1 && page <= maxPage) {
        result.add(page - 1); // Convert to 0-indexed
      }
    }
    // Skip any segment that doesn't match expected patterns
  }

  return [...result].sort((a, b) => a - b);
}
