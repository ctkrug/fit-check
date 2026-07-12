import { describe, expect, it } from "vitest";
import { findGpu, GPUS, searchGpus } from "./gpus";

describe("GPUS catalogue", () => {
  it("lists at least 15 GPUs with positive VRAM and bandwidth", () => {
    expect(GPUS.length).toBeGreaterThanOrEqual(15);
    for (const gpu of GPUS) {
      expect(gpu.vramGB).toBeGreaterThan(0);
      expect(gpu.bandwidthGBs).toBeGreaterThan(0);
      expect(gpu.name.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate names", () => {
    const names = GPUS.map((g) => g.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("findGpu", () => {
  it("finds a known GPU case-insensitively", () => {
    expect(findGpu("rtx 4090")?.vramGB).toBe(24);
  });

  it("returns undefined for an unknown GPU", () => {
    expect(findGpu("Some Made Up Card 9000")).toBeUndefined();
  });
});

describe("searchGpus", () => {
  it("returns the full list for an empty query", () => {
    expect(searchGpus("")).toHaveLength(GPUS.length);
    expect(searchGpus("   ")).toHaveLength(GPUS.length);
  });

  it("filters by name substring, case-insensitively", () => {
    const results = searchGpus("4090");
    expect(results.every((g) => g.name.includes("4090"))).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("filters by vendor", () => {
    const apple = searchGpus("apple");
    expect(apple.length).toBeGreaterThan(0);
    expect(apple.every((g) => g.vendor === "Apple")).toBe(true);
  });

  it("returns an empty list for no matches", () => {
    expect(searchGpus("zzz-nonexistent")).toHaveLength(0);
  });
});
