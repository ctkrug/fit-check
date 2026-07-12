// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppHandle } from "./app";

const LLAMA3_CONFIG = {
  hidden_size: 4096,
  num_hidden_layers: 32,
  intermediate_size: 14336,
  vocab_size: 128256,
  num_attention_heads: 32,
  num_key_value_heads: 8,
  tie_word_embeddings: false,
};

/** Immediate setTimeout so debounced lookups run synchronously in tests. */
const immediateTimeout = ((fn: () => void) => {
  fn();
  return 0 as unknown as ReturnType<typeof setTimeout>;
}) as typeof setTimeout;

const flush = () => new Promise((r) => setTimeout(r, 0));

let handle: AppHandle | null = null;
function mount(opts: Parameters<typeof createApp>[1] = {}): HTMLElement {
  const root = document.createElement("div");
  document.body.appendChild(root);
  handle = createApp(root, {
    reducedMotion: true,
    setTimeoutImpl: immediateTimeout,
    initialSearch: "",
    ...opts,
  });
  return root;
}

function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event("input"));
}

afterEach(() => {
  handle?.destroy();
  handle = null;
  document.body.innerHTML = "";
});

describe("createApp — live readout", () => {
  it("renders four bars synchronously from a GPU + manual param count", () => {
    const root = mount({ initialSearch: "?gpu=RTX+4090" });
    type(root.querySelector("#model-input")!, "8B");
    const bars = root.querySelectorAll(".bar");
    expect(bars).toHaveLength(4);
    expect(root.querySelector(".bar-quant")?.textContent).toBe("Q4");
  });

  it("shows a designed empty state before any model is entered", () => {
    const root = mount({ initialSearch: "?gpu=RTX+4090" });
    expect(root.querySelector(".empty")).not.toBeNull();
    expect(root.querySelector(".bar")).toBeNull();
  });

  it("prompts to pick a GPU before computing when none is selected", () => {
    const root = mount({ initialSearch: "" });
    type(root.querySelector("#model-input")!, "8B");
    // No GPU picked: must not invent a phantom "Custom" card and compute bars.
    expect(root.querySelector(".bar")).toBeNull();
    expect(root.querySelector(".empty")?.textContent).toContain("Pick a GPU");
  });

  it("marks FP16 of a 13B model as won't-fit on a 24GB card", () => {
    const root = mount({ initialSearch: "?gpu=RTX+4090" });
    type(root.querySelector("#model-input")!, "13B");
    const bars = Array.from(root.querySelectorAll(".bar"));
    const fp16 = bars[3]!;
    expect(fp16.classList.contains("bar--red")).toBe(true);
    expect(fp16.querySelector(".bar-speed")?.textContent).toBe("won't fit");
  });

  it("changes tokens/sec when GPU bandwidth changes (wow-moment guarantee)", () => {
    const fast = mount({ initialSearch: "?gpu=RTX+4090&params=8B" });
    const fastSpeed = fast.querySelector(".bar-speed")!.textContent;
    handle!.destroy();
    const slow = mount({ initialSearch: "?gpu=RTX+3060+12GB&params=8B" });
    const slowSpeed = slow.querySelector(".bar-speed")!.textContent;
    expect(fastSpeed).not.toBe(slowSpeed);
  });

  it("recomputes footprint when the weight format toggles", () => {
    const root = mount({ initialSearch: "?gpu=RTX+4090&params=8B" });
    const q4BytesBefore = root.querySelector(".bar-bytes")!.textContent;
    const awqBtn = root.querySelector<HTMLButtonElement>('[data-format="AWQ"]')!;
    awqBtn.click();
    const q4BytesAfter = root.querySelector(".bar-bytes")!.textContent;
    expect(q4BytesAfter).not.toBe(q4BytesBefore);
  });
});

describe("createApp — GPU combobox keyboard", () => {
  function keydown(el: HTMLElement, key: string): void {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  }

  it("selects a GPU with ArrowDown + Enter (no mouse)", () => {
    const root = mount({ initialSearch: "?params=8B" });
    const gpuInput = root.querySelector<HTMLInputElement>("#gpu-input")!;
    gpuInput.value = "4090";
    gpuInput.dispatchEvent(new Event("input"));
    keydown(gpuInput, "ArrowDown");
    keydown(gpuInput, "Enter");
    expect(gpuInput.value).toBe("RTX 4090");
    expect(root.querySelectorAll(".bar")).toHaveLength(4);
  });

  it("tracks listbox visibility in aria-expanded", () => {
    const root = mount({ initialSearch: "?params=8B" });
    const gpuInput = root.querySelector<HTMLInputElement>("#gpu-input")!;
    expect(gpuInput.getAttribute("aria-expanded")).toBe("false");
    gpuInput.dispatchEvent(new Event("focus"));
    expect(gpuInput.getAttribute("aria-expanded")).toBe("true");
    keydown(gpuInput, "Escape");
    expect(gpuInput.getAttribute("aria-expanded")).toBe("false");
  });

  it("wraps ArrowUp from the top to the last option", () => {
    const root = mount({ initialSearch: "?params=8B" });
    const gpuInput = root.querySelector<HTMLInputElement>("#gpu-input")!;
    gpuInput.dispatchEvent(new Event("focus"));
    keydown(gpuInput, "ArrowUp");
    const active = root.querySelector("#gpu-list li.is-active");
    expect(active).not.toBeNull();
    expect(gpuInput.getAttribute("aria-activedescendant")).toBeTruthy();
  });
});

describe("createApp — model input handling", () => {
  it("shows an error state for a malformed size", () => {
    const root = mount({ initialSearch: "?gpu=RTX+4090" });
    type(root.querySelector("#model-input")!, "banana");
    expect(root.querySelector("#model-status")?.getAttribute("data-state")).toBe("error");
    expect(root.querySelector(".bar")).toBeNull();
  });

  it("explains a bad manual size without mentioning a config", () => {
    const root = mount({ initialSearch: "?gpu=RTX+4090" });
    type(root.querySelector("#model-input")!, "banana");
    const msg = root.querySelector("#model-status")?.textContent ?? "";
    // A bare size has no config.json — the message must guide toward "7B".
    expect(msg).not.toContain("config");
    expect(msg).toContain("7B");
  });

  it("resolves a HF repo ID via the injected fetch", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => LLAMA3_CONFIG,
    } as Response);
    const root = mount({ initialSearch: "?gpu=RTX+4090", fetchImpl });
    type(root.querySelector("#model-input")!, "meta-llama/Llama-3.1-8B");
    await flush();
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(root.querySelectorAll(".bar")).toHaveLength(4);
    expect(root.querySelector("#model-status")?.textContent).toContain("parameters");
  });

  it("shows a not-found error for a 404 repo", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);
    const root = mount({ initialSearch: "?gpu=RTX+4090", fetchImpl });
    type(root.querySelector("#model-input")!, "ghost/missing");
    await flush();
    expect(root.querySelector("#model-status")?.textContent).toContain("not found");
  });
});

describe("createApp — breakdown and URL", () => {
  it("expands a bar's calculation breakdown on click", () => {
    const root = mount({ initialSearch: "?gpu=RTX+4090&params=8B" });
    expect(root.querySelector(".breakdown")).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-expand="Q4"]')!.click();
    expect(root.querySelector(".breakdown")).not.toBeNull();
    expect(root.querySelector(".breakdown")?.textContent).toContain("Footprint");
  });

  it("hydrates GPU, model, and format from the URL", () => {
    const root = mount({ initialSearch: "?gpu=RTX+4090&params=7B&fmt=AWQ" });
    expect(root.querySelector<HTMLInputElement>("#gpu-input")!.value).toBe("RTX 4090");
    expect(root.querySelector<HTMLInputElement>("#model-input")!.value).toBe("7B");
    expect(
      root.querySelector<HTMLButtonElement>('[data-format="AWQ"]')!.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(root.querySelectorAll(".bar")).toHaveLength(4);
  });
});
