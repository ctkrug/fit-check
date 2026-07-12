import { describe, expect, it } from "vitest";
import { estimateTokensPerSecond } from "./speed";

describe("estimateTokensPerSecond", () => {
  it("returns higher throughput for higher bandwidth", () => {
    const modelBytes = 4_000_000_000;
    const slow = estimateTokensPerSecond(200, modelBytes);
    const fast = estimateTokensPerSecond(800, modelBytes);
    expect(fast).toBeGreaterThan(slow);
  });

  it("returns lower throughput for a larger model at fixed bandwidth", () => {
    const bandwidth = 500;
    const small = estimateTokensPerSecond(bandwidth, 4_000_000_000);
    const large = estimateTokensPerSecond(bandwidth, 40_000_000_000);
    expect(large).toBeLessThan(small);
  });

  it("returns 0 for a zero-byte model", () => {
    expect(estimateTokensPerSecond(500, 0)).toBe(0);
  });
});
