import { describe, expect, it } from "vitest";
import { estimateModelBytes } from "./quant";

describe("estimateModelBytes", () => {
  it("scales linearly with parameter count", () => {
    const oneB = estimateModelBytes(1_000_000_000, "FP16");
    const twoB = estimateModelBytes(2_000_000_000, "FP16");
    expect(twoB).toBe(oneB * 2);
  });

  it("produces a smaller footprint at lower quant levels", () => {
    const params = 7_000_000_000;
    const q4 = estimateModelBytes(params, "Q4");
    const fp16 = estimateModelBytes(params, "FP16");
    expect(q4).toBeLessThan(fp16);
  });
});
