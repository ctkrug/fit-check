import { describe, expect, it } from "vitest";
import { deriveParamCount, paramCountFromConfig, parseParamCount } from "./params";

describe("parseParamCount", () => {
  it("parses billions and millions with a suffix", () => {
    expect(parseParamCount("7B")).toBe(7_000_000_000);
    expect(parseParamCount("1.5b")).toBe(1_500_000_000);
    expect(parseParamCount("125M")).toBe(125_000_000);
    expect(parseParamCount("70 B")).toBe(70_000_000_000);
  });

  it("parses bare integers and scientific notation", () => {
    expect(parseParamCount("8000000000")).toBe(8_000_000_000);
    expect(parseParamCount("8e9")).toBe(8_000_000_000);
  });

  it("applies K and M suffixes", () => {
    expect(parseParamCount("500k")).toBe(500_000);
    expect(parseParamCount("125M")).toBe(125_000_000);
  });

  it("rejects a non-finite magnitude", () => {
    expect(parseParamCount("1e999B")).toBeNull();
  });

  it("tolerates surrounding whitespace and mixed case", () => {
    expect(parseParamCount("  7b  ")).toBe(7_000_000_000);
    expect(parseParamCount("1.5B")).toBe(1_500_000_000);
  });

  it("rejects unit-only, sign, and unicode noise", () => {
    expect(parseParamCount("B")).toBeNull();
    expect(parseParamCount("+7B")).toBeNull();
    expect(parseParamCount("7️⃣B")).toBeNull();
    expect(parseParamCount("7BB")).toBeNull();
  });

  it("returns null for empty or malformed input", () => {
    expect(parseParamCount("")).toBeNull();
    expect(parseParamCount("   ")).toBeNull();
    expect(parseParamCount("abc")).toBeNull();
    expect(parseParamCount("7 gazillion")).toBeNull();
    expect(parseParamCount("-7B")).toBeNull();
    expect(parseParamCount("0")).toBeNull();
  });
});

describe("deriveParamCount", () => {
  it("derives Llama-3-8B (~8.03B) within 2% from its config dimensions", () => {
    const count = deriveParamCount({
      hidden_size: 4096,
      num_hidden_layers: 32,
      intermediate_size: 14336,
      vocab_size: 128256,
      num_attention_heads: 32,
      num_key_value_heads: 8,
      tie_word_embeddings: false,
    })!;
    expect(Math.abs(count - 8.03e9) / 8.03e9).toBeLessThan(0.02);
  });

  it("counts a tied embedding only once", () => {
    const base = {
      hidden_size: 2048,
      num_hidden_layers: 24,
      intermediate_size: 5632,
      vocab_size: 32000,
      num_attention_heads: 16,
    };
    const untied = deriveParamCount({ ...base, tie_word_embeddings: false })!;
    const tied = deriveParamCount({ ...base, tie_word_embeddings: true })!;
    expect(tied).toBeLessThan(untied);
  });

  it("derives a count even when head counts are absent (defaults applied)", () => {
    const count = deriveParamCount({
      hidden_size: 2048,
      num_hidden_layers: 24,
      intermediate_size: 5632,
      vocab_size: 32000,
    });
    expect(count).toBeGreaterThan(0);
  });

  it("returns null when required dimensions are missing", () => {
    expect(deriveParamCount({ hidden_size: 4096 })).toBeNull();
    expect(deriveParamCount({})).toBeNull();
  });
});

describe("paramCountFromConfig", () => {
  it("prefers an explicit parameter field over derivation", () => {
    expect(paramCountFromConfig({ num_parameters: 7_000_000_000 })).toBe(7_000_000_000);
  });

  it("falls back to architecture derivation without an explicit field", () => {
    const count = paramCountFromConfig({
      hidden_size: 4096,
      num_hidden_layers: 32,
      intermediate_size: 14336,
      vocab_size: 128256,
      num_attention_heads: 32,
      num_key_value_heads: 8,
    });
    expect(count).toBeGreaterThan(7e9);
  });

  it("returns null when neither an explicit count nor dimensions exist", () => {
    expect(paramCountFromConfig({ model_type: "llama" } as never)).toBeNull();
  });
});
