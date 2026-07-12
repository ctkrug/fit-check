import { describe, expect, it } from "vitest";
import { computeReadout, QUANT_LEVELS } from "./readout";

const RTX_4090 = { vramGB: 24, bandwidthGBs: 1008 };

describe("computeReadout", () => {
  it("returns one result per quant level in order", () => {
    const results = computeReadout(RTX_4090, 8e9);
    expect(results.map((r) => r.quant)).toEqual(QUANT_LEVELS);
  });

  it("fits a 13B model at Q4 but not at FP16 on a 24GB card", () => {
    // 13B FP16 ~26GB > 24GB; 13B Q4 ~7.9GB fits comfortably.
    const results = computeReadout(RTX_4090, 13e9);
    const q4 = results.find((r) => r.quant === "Q4")!;
    const fp16 = results.find((r) => r.quant === "FP16")!;
    expect(q4.fits).toBe(true);
    expect(fp16.fits).toBe(false);
    expect(fp16.reason).toBe("wont-fit");
  });

  it("reports higher throughput at lower quant (smaller weights stream faster)", () => {
    const results = computeReadout(RTX_4090, 8e9);
    const q4 = results.find((r) => r.quant === "Q4")!;
    const q8 = results.find((r) => r.quant === "Q8")!;
    expect(q4.tokensPerSecond).toBeGreaterThan(q8.tokensPerSecond);
  });

  it("changes throughput when GPU bandwidth changes (wow-moment guarantee)", () => {
    const fast = computeReadout({ vramGB: 24, bandwidthGBs: 1008 }, 8e9)[0];
    const slow = computeReadout({ vramGB: 24, bandwidthGBs: 360 }, 8e9)[0];
    expect(fast.tokensPerSecond).toBeGreaterThan(slow.tokensPerSecond);
  });

  it("gives an empty, non-fitting readout when no model is entered", () => {
    const results = computeReadout(RTX_4090, 0);
    expect(results).toHaveLength(4);
    for (const r of results) {
      expect(r.bytes).toBe(0);
      expect(r.fits).toBe(false);
      expect(r.tokensPerSecond).toBe(0);
    }
  });

  it("marks everything won't-fit on a zero-VRAM GPU without dividing by zero", () => {
    const results = computeReadout({ vramGB: 0, bandwidthGBs: 500 }, 8e9);
    for (const r of results) {
      expect(r.fits).toBe(false);
      expect(Number.isFinite(r.fitsFraction)).toBe(true);
    }
  });
});
