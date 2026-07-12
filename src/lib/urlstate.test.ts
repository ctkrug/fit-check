import { describe, expect, it } from "vitest";
import { decodeState, encodeState, type ShareState } from "./urlstate";

describe("encode/decode round-trip", () => {
  it("round-trips a named GPU + HF repo + AWQ format", () => {
    const state: ShareState = {
      gpuName: "RTX 4090",
      repoId: "meta-llama/Llama-3.1-8B",
      format: "AWQ",
    };
    expect(decodeState(encodeState(state))).toEqual(state);
  });

  it("round-trips a custom GPU + manual param input", () => {
    const state: ShareState = {
      vramGB: 24,
      bandwidthGBs: 1008,
      paramInput: "7B",
    };
    expect(decodeState(encodeState(state))).toEqual(state);
  });
});

describe("encodeState", () => {
  it("omits the default GGUF format to keep links short", () => {
    expect(encodeState({ gpuName: "RTX 4090", format: "GGUF" })).toBe("gpu=RTX+4090");
  });

  it("returns an empty string for empty state", () => {
    expect(encodeState({})).toBe("");
  });
});

describe("decodeState", () => {
  it("tolerates a leading question mark", () => {
    expect(decodeState("?gpu=RTX+4090").gpuName).toBe("RTX 4090");
  });

  it("drops invalid numbers and formats instead of throwing", () => {
    const state = decodeState("vram=abc&bw=-5&fmt=BOGUS");
    expect(state.vramGB).toBeUndefined();
    expect(state.bandwidthGBs).toBeUndefined();
    expect(state.format).toBeUndefined();
  });

  it("returns empty state for an empty query", () => {
    expect(decodeState("")).toEqual({});
  });
});
