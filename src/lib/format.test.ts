import { describe, expect, it } from "vitest";
import { formatBytes, formatParamCount, formatTokensPerSecond } from "./format";

describe("formatBytes", () => {
  it("formats large sizes as GB with one decimal", () => {
    expect(formatBytes(4_200_000_000)).toBe("4.2 GB");
  });

  it("formats sub-GB sizes as MB", () => {
    expect(formatBytes(500_000_000)).toBe("500 MB");
  });

  it("clamps non-positive or non-finite values to 0 GB", () => {
    expect(formatBytes(0)).toBe("0 GB");
    expect(formatBytes(-5)).toBe("0 GB");
    expect(formatBytes(Number.NaN)).toBe("0 GB");
  });
});

describe("formatTokensPerSecond", () => {
  it("formats sub-100 throughput with one decimal", () => {
    expect(formatTokensPerSecond(42.34)).toBe("42.3 tok/s");
  });

  it("rounds throughput at/over 100 to whole numbers", () => {
    expect(formatTokensPerSecond(142.7)).toBe("143 tok/s");
  });

  it("renders a dash for non-positive throughput", () => {
    expect(formatTokensPerSecond(0)).toBe("— tok/s");
    expect(formatTokensPerSecond(-1)).toBe("— tok/s");
  });
});

describe("formatParamCount", () => {
  it("formats billions and millions", () => {
    expect(formatParamCount(7_000_000_000)).toBe("7.0B");
    expect(formatParamCount(125_000_000)).toBe("125M");
  });

  it("drops the decimal for very large counts", () => {
    expect(formatParamCount(405_000_000_000)).toBe("405B");
  });

  it("formats thousands with a K suffix", () => {
    expect(formatParamCount(500_000)).toBe("500K");
  });

  it("renders a dash for non-positive or non-finite counts", () => {
    expect(formatParamCount(0)).toBe("—");
    expect(formatParamCount(Number.NaN)).toBe("—");
  });
});
