/**
 * Quantization memory-footprint math.
 *
 * Placeholder for the SCOPE scaffold — real GGUF/AWQ bits-per-parameter
 * formulas land in BUILD (see docs/BACKLOG.md, epic "Quant math engine").
 */

export type QuantLevel = "Q4" | "Q5" | "Q8" | "FP16";

/** Bits per parameter for each supported quantization level. */
export const BITS_PER_PARAM: Record<QuantLevel, number> = {
  Q4: 4.5,
  Q5: 5.5,
  Q8: 8.5,
  FP16: 16,
};

/**
 * Estimated model weight size in bytes at a given quantization level.
 *
 * `paramCount` is the model's total parameter count (e.g. 7_000_000_000
 * for a 7B model). This is intentionally simple for the scaffold; BUILD
 * will refine it with per-format overhead (GGUF headers, AWQ group
 * scales, etc.).
 */
export function estimateModelBytes(paramCount: number, quant: QuantLevel): number {
  const bits = BITS_PER_PARAM[quant];
  return (paramCount * bits) / 8;
}
