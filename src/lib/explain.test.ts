import { describe, expect, it } from "vitest";
import { explainResult } from "./explain";
import { computeReadout } from "./readout";

const RTX_4090 = { vramGB: 24, bandwidthGBs: 1008 };

describe("explainResult", () => {
  it("shows footprint, fit, and speed lines for a fitting bar", () => {
    const [q4] = computeReadout(RTX_4090, 8e9);
    const lines = explainResult(q4, 8e9, RTX_4090, "GGUF");
    const labels = lines.map((l) => l.label);
    expect(labels).toEqual(["Footprint", "Fit", "Speed"]);
    expect(lines[0].value).toContain("8.0B params");
    expect(lines[2].value).toContain("tok/s");
  });

  it("omits the speed line and marks won't-fit when the model is too large", () => {
    const results = computeReadout(RTX_4090, 13e9);
    const fp16 = results.find((r) => r.quant === "FP16")!;
    const lines = explainResult(fp16, 13e9, RTX_4090, "GGUF");
    expect(lines.map((l) => l.label)).toEqual(["Footprint", "Fit"]);
    expect(lines.find((l) => l.label === "Fit")!.value).toContain("won't fit");
  });

  it("reflects the selected weight format's bits-per-parameter", () => {
    const [q4Awq] = computeReadout(RTX_4090, 8e9, "AWQ");
    const lines = explainResult(q4Awq, 8e9, RTX_4090, "AWQ");
    expect(lines[0].value).toContain("4.16 bits");
  });
});
