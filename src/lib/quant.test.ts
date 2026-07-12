import { describe, expect, it } from "vitest";
import { bitsPerParam, estimateModelBytes } from "./quant";

const GB = 1e9;

describe("estimateModelBytes", () => {
  it("scales linearly with parameter count", () => {
    const oneB = estimateModelBytes(1_000_000_000, "FP16");
    const twoB = estimateModelBytes(2_000_000_000, "FP16");
    expect(twoB).toBe(oneB * 2);
  });

  it("produces a smaller footprint at lower quant levels", () => {
    const params = 7_000_000_000;
    expect(estimateModelBytes(params, "Q4")).toBeLessThan(estimateModelBytes(params, "Q5"));
    expect(estimateModelBytes(params, "Q5")).toBeLessThan(estimateModelBytes(params, "Q8"));
    expect(estimateModelBytes(params, "Q8")).toBeLessThan(estimateModelBytes(params, "FP16"));
  });

  it("returns 0 bytes for empty/invalid param counts", () => {
    expect(estimateModelBytes(0, "Q4")).toBe(0);
    expect(estimateModelBytes(-5, "Q8")).toBe(0);
    expect(estimateModelBytes(Number.NaN, "FP16")).toBe(0);
    expect(estimateModelBytes(Number.POSITIVE_INFINITY, "FP16")).toBe(0);
  });

  // Acceptance: GGUF byte math validated against 2 known real file sizes, <10%.
  it("matches real Llama-2-7B GGUF file sizes within 10%", () => {
    const params = 6_740_000_000;
    const within10 = (actualGB: number, quant: Parameters<typeof estimateModelBytes>[1]) => {
      const est = estimateModelBytes(params, quant) / GB;
      expect(Math.abs(est - actualGB) / actualGB).toBeLessThan(0.1);
    };
    within10(4.08, "Q4");
    within10(4.78, "Q5");
    within10(7.16, "Q8");
    within10(13.5, "FP16");
  });

  it("matches real Llama-3-8B GGUF file sizes within 10%", () => {
    const params = 8_030_000_000;
    const est = (quant: Parameters<typeof estimateModelBytes>[1]) =>
      estimateModelBytes(params, quant) / GB;
    expect(Math.abs(est("Q4") - 4.92) / 4.92).toBeLessThan(0.1);
    expect(Math.abs(est("Q8") - 8.54) / 8.54).toBeLessThan(0.1);
  });

  // Acceptance: AWQ 4-bit footprint differs from GGUF Q4 (different overhead).
  it("gives AWQ Q4 a different footprint than GGUF Q4", () => {
    const params = 7_000_000_000;
    const gguf = estimateModelBytes(params, "Q4", "GGUF");
    const awq = estimateModelBytes(params, "Q4", "AWQ");
    expect(awq).not.toBe(gguf);
    expect(awq).toBeLessThan(gguf); // AWQ int4 group overhead < GGUF k-quant
  });
});

describe("bitsPerParam", () => {
  it("defaults to GGUF and ranges from Q4 up to FP16", () => {
    expect(bitsPerParam("Q4")).toBeGreaterThan(4);
    expect(bitsPerParam("Q4")).toBeLessThan(bitsPerParam("FP16"));
    expect(bitsPerParam("FP16")).toBe(16);
  });
});
