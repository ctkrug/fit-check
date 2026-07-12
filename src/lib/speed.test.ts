import { describe, expect, it } from "vitest";
import { BANDWIDTH_EFFICIENCY, estimateTokensPerSecond } from "./speed";

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

  it("returns 0 for invalid bandwidth or model size", () => {
    expect(estimateTokensPerSecond(0, 4_000_000_000)).toBe(0);
    expect(estimateTokensPerSecond(-500, 4_000_000_000)).toBe(0);
    expect(estimateTokensPerSecond(500, -1)).toBe(0);
    expect(estimateTokensPerSecond(Number.NaN, 4_000_000_000)).toBe(0);
  });

  it("applies the bandwidth efficiency factor below the theoretical ceiling", () => {
    const bandwidth = 1000;
    const modelBytes = 5_000_000_000;
    const theoretical = (bandwidth * 1e9) / modelBytes;
    const estimate = estimateTokensPerSecond(bandwidth, modelBytes);
    expect(estimate).toBeCloseTo(theoretical * BANDWIDTH_EFFICIENCY, 5);
    expect(estimate).toBeLessThan(theoretical);
  });

  // Acceptance: land within 30% of published real-world benchmark figures.
  it("lands within 30% of reported llama.cpp benchmarks", () => {
    // RTX 4090, Llama-3-8B Q4 (~4.9 GB): reported ~135 tok/s.
    const a = estimateTokensPerSecond(1008, 4.9e9);
    expect(Math.abs(a - 135) / 135).toBeLessThan(0.3);
    // RTX 3090, Llama-2-7B Q4 (~4.08 GB): reported ~150 tok/s.
    const b = estimateTokensPerSecond(936, 4.08e9);
    expect(Math.abs(b - 150) / 150).toBeLessThan(0.3);
  });
});
