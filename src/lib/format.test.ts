import { describe, expect, it } from "vitest";
import { formatBytes, formatTokensPerSecond } from "./format";

describe("formatBytes", () => {
  it("formats bytes as GB with one decimal", () => {
    expect(formatBytes(4_200_000_000)).toBe("4.2 GB");
  });

  it("clamps non-positive values to 0 GB", () => {
    expect(formatBytes(0)).toBe("0 GB");
    expect(formatBytes(-5)).toBe("0 GB");
  });
});

describe("formatTokensPerSecond", () => {
  it("formats throughput with one decimal", () => {
    expect(formatTokensPerSecond(42.34)).toBe("42.3 tok/s");
  });

  it("clamps non-positive values to 0 tok/s", () => {
    expect(formatTokensPerSecond(0)).toBe("0 tok/s");
  });
});
