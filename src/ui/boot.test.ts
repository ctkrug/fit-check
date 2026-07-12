// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { typeWordmark } from "./boot";

describe("typeWordmark", () => {
  it("renders the full text instantly when motion is reduced", () => {
    const el = document.createElement("h1");
    typeWordmark(el, "FIT CHECK", { reducedMotion: true });
    expect(el.textContent).toBe("FIT CHECK");
    expect(el.classList.contains("is-typing")).toBe(false);
  });

  it("types character by character on a fake timer", () => {
    const el = document.createElement("h1");
    let tick: (() => void) | null = null;
    const fakeSetInterval = ((fn: () => void) => {
      tick = fn;
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval;
    const fakeClear = (() => {}) as typeof clearInterval;

    typeWordmark(el, "FIT", {
      reducedMotion: false,
      setIntervalImpl: fakeSetInterval,
      clearIntervalImpl: fakeClear,
    });

    expect(el.textContent).toBe("");
    tick!();
    expect(el.textContent).toBe("F");
    tick!();
    expect(el.textContent).toBe("FI");
    tick!();
    expect(el.textContent).toBe("FIT");
  });

  it("honors the reduced-motion media query when the option is omitted", () => {
    const el = document.createElement("h1");
    const original = globalThis.matchMedia;
    // Simulate a user who has "reduce motion" enabled at the OS level.
    globalThis.matchMedia = ((q: string) =>
      ({ matches: q.includes("reduce"), media: q }) as MediaQueryList) as typeof matchMedia;
    try {
      typeWordmark(el, "FIT CHECK");
      expect(el.textContent).toBe("FIT CHECK");
      expect(el.classList.contains("is-typing")).toBe(false);
    } finally {
      globalThis.matchMedia = original;
    }
  });

  it("cancel() finishes the text immediately", () => {
    const el = document.createElement("h1");
    const fakeSetInterval = (() =>
      1 as unknown as ReturnType<typeof setInterval>) as typeof setInterval;
    const cancel = typeWordmark(el, "FIT CHECK", {
      reducedMotion: false,
      setIntervalImpl: fakeSetInterval,
      clearIntervalImpl: (() => {}) as typeof clearInterval,
    });
    cancel();
    expect(el.textContent).toBe("FIT CHECK");
  });
});
