/**
 * Property-based tests for the pure engine. Example tests pin known cases;
 * these assert the invariants that must hold for *any* input, which is where
 * boundary bugs usually hide (overflow, non-monotonic thresholds, NaN leaks).
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { estimateModelBytes } from "./quant";
import { estimateTokensPerSecond } from "./speed";
import { classifyFit } from "./verdict";
import { parseParamCount } from "./params";
import { computeReadout, QUANT_LEVELS } from "./readout";
import { encodeState, decodeState } from "./urlstate";

describe("parseParamCount properties", () => {
  it("round-trips any positive integer written plainly", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 2_000_000_000 }), (n) => {
        expect(parseParamCount(String(n))).toBe(n);
      }),
    );
  });

  it("never returns a non-positive or non-finite count", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const r = parseParamCount(s);
        if (r !== null) {
          expect(Number.isFinite(r)).toBe(true);
          expect(r).toBeGreaterThan(0);
        }
      }),
    );
  });

  it("applies the B suffix as a 1e9 multiplier", () => {
    fc.assert(
      fc.property(fc.double({ min: 0.1, max: 1000, noNaN: true }), (x) => {
        const r = parseParamCount(`${x}B`);
        expect(r).toBe(Math.round(x * 1e9));
      }),
    );
  });
});

describe("footprint + speed monotonicity", () => {
  it("heavier quant never uses fewer bytes", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 700_000_000_000 }), (params) => {
        const sizes = QUANT_LEVELS.map((q) => estimateModelBytes(params, q));
        for (let i = 1; i < sizes.length; i++) {
          expect(sizes[i]!).toBeGreaterThanOrEqual(sizes[i - 1]!);
        }
      }),
    );
  });

  it("a bigger model is never faster at fixed bandwidth", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4000 }),
        fc.integer({ min: 1, max: 100_000_000_000 }),
        (bw, bytes) => {
          const small = estimateTokensPerSecond(bw, bytes);
          const big = estimateTokensPerSecond(bw, bytes * 2);
          expect(big).toBeLessThanOrEqual(small);
        },
      ),
    );
  });
});

describe("verdict properties", () => {
  it("a model that doesn't fit is always red and !fits", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000_000_000 }),
        fc.integer({ min: 1, max: 1_000_000_000_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        (bytes, vram, tps) => {
          const r = classifyFit(bytes, vram, tps);
          if (!r.fits) expect(r.verdict).toBe("red");
        },
      ),
    );
  });

  it("higher throughput never downgrades a fitting verdict", () => {
    const rank = { red: 0, yellow: 1, green: 2 } as const;
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8_000_000_000 }),
        fc.integer({ min: 20_000_000_000, max: 80_000_000_000 }),
        fc.integer({ min: 0, max: 60 }),
        (bytes, vram, tps) => {
          const lo = classifyFit(bytes, vram, tps);
          const hi = classifyFit(bytes, vram, tps + 10);
          expect(rank[hi.verdict]).toBeGreaterThanOrEqual(rank[lo.verdict]);
        },
      ),
    );
  });
});

describe("computeReadout never throws or leaks NaN", () => {
  it("always returns four finite-typed results", () => {
    fc.assert(
      fc.property(
        fc.record({
          vramGB: fc.float({ min: 0, max: 200, noNaN: true }),
          bandwidthGBs: fc.float({ min: 0, max: 4000, noNaN: true }),
        }),
        fc.integer({ min: 0, max: 700_000_000_000 }),
        (gpu, params) => {
          const out = computeReadout(gpu, params);
          expect(out).toHaveLength(QUANT_LEVELS.length);
          for (const r of out) {
            expect(Number.isNaN(r.bytes)).toBe(false);
            expect(Number.isNaN(r.tokensPerSecond)).toBe(false);
            expect(Number.isNaN(r.fitsFraction)).toBe(false);
          }
        },
      ),
    );
  });
});

describe("URL state round-trips", () => {
  it("decode(encode(x)) preserves a named-GPU state", () => {
    fc.assert(
      fc.property(
        fc.record({
          gpuName: fc.constantFrom("RTX 4090", "Apple M2 Max", "H100 SXM"),
          paramInput: fc.constantFrom("7B", "8e9", "13B"),
          format: fc.constantFrom("GGUF" as const, "AWQ" as const),
        }),
        (state) => {
          const back = decodeState(encodeState(state));
          expect(back.gpuName).toBe(state.gpuName);
          expect(back.paramInput).toBe(state.paramInput);
          // GGUF is the default and is intentionally omitted to keep links short.
          expect(back.format ?? "GGUF").toBe(state.format);
        },
      ),
    );
  });
});
