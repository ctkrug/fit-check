// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

describe("entrypoint", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it("mounts the app UI into #app without throwing", async () => {
    await import("./main");
    const app = document.querySelector("#app");
    // Stable structure (the animated wordmark may still be typing).
    expect(app?.querySelector(".tagline")?.textContent).toContain("GPU");
    expect(app?.querySelector("#gpu-input")).not.toBeNull();
    expect(app?.querySelector("#model-input")).not.toBeNull();
    expect(app?.querySelector("#readout")).not.toBeNull();
  });
});
