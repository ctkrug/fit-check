// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

describe("entrypoint", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it("renders into #app without throwing", async () => {
    await import("./main");
    const app = document.querySelector("#app");
    expect(app?.textContent).toContain("Fit Check");
  });
});
