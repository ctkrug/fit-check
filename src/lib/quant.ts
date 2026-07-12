/**
 * Quantization memory-footprint math.
 *
 * Token-generation memory is dominated by the model weights, and a weight's
 * on-disk / in-VRAM size is set by the *effective* bits-per-parameter of its
 * quantization format. "Effective" matters: real formats carry overhead
 * (block scales, group zero-points, a few layers kept in higher precision),
 * so the number is not the nominal bit width. The constants below are
 * calibrated against published real model file sizes — see BITS_PER_PARAM.
 */

export type QuantLevel = "Q4" | "Q5" | "Q8" | "FP16";

/** Weight formats we model. GGUF (llama.cpp) and AWQ carry different overhead. */
export type WeightFormat = "GGUF" | "AWQ";

/**
 * Effective bits per parameter, GGUF (llama.cpp k-quants).
 *
 * Calibrated against community file sizes so that
 * `paramCount * bits / 8` lands within ~2% of the real GGUF download:
 *
 *   Llama-2-7B (6.74B params)      Llama-3-8B (8.03B params)
 *   Q4_K_M  4.08 GB -> 4.84 b/p    Q4_K_M  4.92 GB -> 4.90 b/p
 *   Q5_K_M  4.78 GB -> 5.67 b/p    Q5_K_M  5.73 GB -> 5.71 b/p
 *   Q8_0    7.16 GB -> 8.50 b/p    Q8_0    8.54 GB -> 8.51 b/p
 *   FP16    13.5 GB -> 16.0 b/p    FP16    16.1 GB -> 16.0 b/p
 */
export const GGUF_BITS_PER_PARAM: Record<QuantLevel, number> = {
  Q4: 4.85,
  Q5: 5.68,
  Q8: 8.5,
  FP16: 16,
};

/**
 * Effective bits per parameter, AWQ (activation-aware weight quantization).
 *
 * AWQ int4 with group size 128 stores, per group: 128x4 weight bits + one
 * fp16 scale (16 bits) + one int4 zero-point (4 bits) = 532 bits / 128 =
 * 4.156 b/p. That is deliberately different overhead from GGUF's block
 * structure, so AWQ Q4 footprint != GGUF Q4 footprint. AWQ only defines a
 * 4-bit path in common use; higher levels fall back to the GGUF constants so
 * the four-bar readout still renders a full column.
 */
export const AWQ_BITS_PER_PARAM: Record<QuantLevel, number> = {
  Q4: 4.16,
  Q5: 5.68,
  Q8: 8.5,
  FP16: 16,
};

/** Effective bits-per-parameter table for a given weight format. */
export function bitsPerParam(quant: QuantLevel, format: WeightFormat = "GGUF"): number {
  return format === "AWQ" ? AWQ_BITS_PER_PARAM[quant] : GGUF_BITS_PER_PARAM[quant];
}

/**
 * Estimated model weight size in bytes at a given quantization level.
 *
 * `paramCount` is the model's total parameter count (e.g. 7_000_000_000
 * for a 7B model). `format` selects the overhead model (defaults to GGUF).
 * Returns 0 for a non-positive or non-finite param count so callers can
 * treat "no model yet" as an empty, non-crashing state.
 */
export function estimateModelBytes(
  paramCount: number,
  quant: QuantLevel,
  format: WeightFormat = "GGUF",
): number {
  if (!Number.isFinite(paramCount) || paramCount <= 0) return 0;
  const bits = bitsPerParam(quant, format);
  return (paramCount * bits) / 8;
}
