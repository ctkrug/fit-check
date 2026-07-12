import { describe, expect, it } from "vitest";
import { findGpu } from "./gpus";

describe("findGpu", () => {
  it("finds a known GPU case-insensitively", () => {
    expect(findGpu("rtx 4090")?.vramGB).toBe(24);
  });

  it("returns undefined for an unknown GPU", () => {
    expect(findGpu("Some Made Up Card 9000")).toBeUndefined();
  });
});
