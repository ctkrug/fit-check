import { describe, expect, it, vi } from "vitest";
import { configUrl, isValidRepoId, lookupModel } from "./hf";

const okResponse = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as Response;
const statusResponse = (status: number): Response =>
  ({ ok: status < 400, status, json: async () => ({}) }) as Response;

const LLAMA3_CONFIG = {
  hidden_size: 4096,
  num_hidden_layers: 32,
  intermediate_size: 14336,
  vocab_size: 128256,
  num_attention_heads: 32,
  num_key_value_heads: 8,
  tie_word_embeddings: false,
};

describe("isValidRepoId", () => {
  it("accepts owner/name and rejects malformed IDs", () => {
    expect(isValidRepoId("meta-llama/Llama-3.1-8B")).toBe(true);
    expect(isValidRepoId("mistralai/Mistral-7B-v0.1")).toBe(true);
    expect(isValidRepoId("no-slash")).toBe(false);
    expect(isValidRepoId("too/many/slashes")).toBe(false);
    expect(isValidRepoId("")).toBe(false);
  });
});

describe("configUrl", () => {
  it("points at the main-revision config.json on the HF CDN", () => {
    expect(configUrl("meta-llama/Llama-3.1-8B")).toBe(
      "https://huggingface.co/meta-llama/Llama-3.1-8B/resolve/main/config.json",
    );
  });
});

describe("lookupModel", () => {
  it("returns a derived param count for a valid public repo", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(LLAMA3_CONFIG));
    const result = await lookupModel("meta-llama/Llama-3.1-8B", fetchImpl);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paramCount).toBeGreaterThan(7e9);
      expect(result.repoId).toBe("meta-llama/Llama-3.1-8B");
    }
  });

  it("rejects a malformed repo ID without fetching", async () => {
    const fetchImpl = vi.fn();
    const result = await lookupModel("not-a-repo", fetchImpl);
    expect(result).toEqual({ ok: false, error: "invalid-repo" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps a 404 to a not-found error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(statusResponse(404));
    const result = await lookupModel("ghost/does-not-exist", fetchImpl);
    expect(result).toEqual({ ok: false, error: "not-found" });
  });

  it("maps a thrown fetch to a network error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    const result = await lookupModel("meta-llama/Llama-3.1-8B", fetchImpl);
    expect(result).toEqual({ ok: false, error: "network" });
  });

  it("reports no-param-count when the config lacks dimensions", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ model_type: "llama" }));
    const result = await lookupModel("owner/weird-model", fetchImpl);
    expect(result).toEqual({ ok: false, error: "no-param-count" });
  });
});
