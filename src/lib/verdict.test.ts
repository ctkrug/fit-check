import { describe, expect, it } from "vitest";
import { classifyVerdict } from "./verdict";

describe("classifyVerdict", () => {
  it("is red when the model doesn't fit in VRAM", () => {
    expect(classifyVerdict(30e9, 24e9, 40)).toBe("red");
  });

  it("is red when the model fits but is too slow", () => {
    expect(classifyVerdict(10e9, 24e9, 2)).toBe("red");
  });

  it("is yellow when the model fits and runs at a usable-but-slow speed", () => {
    expect(classifyVerdict(10e9, 24e9, 10)).toBe("yellow");
  });

  it("is green when the model fits and runs comfortably fast", () => {
    expect(classifyVerdict(10e9, 24e9, 40)).toBe("green");
  });
});
