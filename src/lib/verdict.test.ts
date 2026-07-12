import { describe, expect, it } from "vitest";
import { classifyFit } from "./verdict";

describe("classifyFit", () => {
  it("labels a too-large model 'wont-fit' regardless of speed", () => {
    const r = classifyFit(30e9, 24e9, 999);
    expect(r).toEqual({ verdict: "red", reason: "wont-fit", fits: false });
  });

  it("distinguishes 'too-slow' (fits) from 'wont-fit'", () => {
    const r = classifyFit(10e9, 24e9, 2);
    expect(r.fits).toBe(true);
    expect(r.reason).toBe("too-slow");
    expect(r.verdict).toBe("red");
  });

  it("reports 'usable' at yellow speeds and 'comfortable' at green", () => {
    expect(classifyFit(10e9, 24e9, 10).reason).toBe("usable");
    expect(classifyFit(10e9, 24e9, 40).reason).toBe("comfortable");
  });

  it("treats a zero-byte (no model) input as not fitting", () => {
    expect(classifyFit(0, 24e9, 0).fits).toBe(false);
  });

  it("reserves VRAM headroom so a model near the ceiling won't fit", () => {
    // 23 GB weights technically < 24 GB VRAM, but not under the 90% margin.
    expect(classifyFit(23e9, 24e9, 40).fits).toBe(false);
    expect(classifyFit(21e9, 24e9, 40).verdict).toBe("green");
  });

  it("puts the threshold speeds on the faster side (>= is inclusive)", () => {
    // Exactly SLOW_THRESHOLD (5) is 'usable', not 'too-slow'.
    expect(classifyFit(10e9, 24e9, 5).reason).toBe("usable");
    // Exactly COMFORTABLE_THRESHOLD (20) is 'comfortable', not 'usable'.
    expect(classifyFit(10e9, 24e9, 20).reason).toBe("comfortable");
    // Just below each threshold falls to the slower band.
    expect(classifyFit(10e9, 24e9, 4.99).reason).toBe("too-slow");
    expect(classifyFit(10e9, 24e9, 19.99).reason).toBe("usable");
  });
});
