/**
 * Memory-bandwidth-based tokens/sec estimate.
 *
 * Autoregressive token generation is memory-bandwidth bound: producing each
 * token streams the full set of (quantized) weights through the GPU's memory
 * bus once. The theoretical ceiling is therefore `bandwidth / model_bytes`
 * tokens/sec. Real hardware never reaches it — KV-cache traffic, attention
 * compute, kernel-launch overhead and imperfect bandwidth utilisation shave
 * it down. We fold that into a single documented correction factor.
 */

/**
 * Fraction of theoretical bandwidth-bound throughput actually achieved.
 *
 * Calibrated against published llama.cpp single-GPU generation benchmarks:
 *
 *   RTX 4090 (1008 GB/s), Llama-3-8B Q4 (~4.9 GB):
 *     theoretical 1008/4.9 = 206 tok/s; reported ~130-140 tok/s -> ~0.66-0.68
 *   RTX 3090 (936 GB/s), Llama-2-7B Q4 (~4.08 GB):
 *     theoretical 936/4.08 = 229 tok/s; reported ~150 tok/s -> ~0.66
 *
 * 0.68 lands both within ~30% of the reported figures (the acceptance bar).
 * Sources: llama.cpp discussion #4167 benchmark threads; local-llm community
 * throughput tables. See docs/BACKLOG.md "Calibrate tokens/sec estimate".
 */
export const BANDWIDTH_EFFICIENCY = 0.68;

/**
 * Estimated tokens/sec given GPU memory bandwidth and model size at rest.
 *
 * `bandwidthGBs` is GB/s of memory bandwidth (1 GB = 1e9 bytes to match how
 * vendors quote it), `modelBytes` is the quantized model size in bytes.
 * Returns 0 for a non-positive model size so a "no model" state reads as an
 * empty gauge rather than Infinity.
 */
export function estimateTokensPerSecond(bandwidthGBs: number, modelBytes: number): number {
  if (!Number.isFinite(bandwidthGBs) || bandwidthGBs <= 0) return 0;
  if (!Number.isFinite(modelBytes) || modelBytes <= 0) return 0;
  const bandwidthBytesPerSec = bandwidthGBs * 1e9;
  return (bandwidthBytesPerSec / modelBytes) * BANDWIDTH_EFFICIENCY;
}
