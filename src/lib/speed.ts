/**
 * Memory-bandwidth-based tokens/sec estimate.
 *
 * Token generation is bandwidth-bound: each token requires streaming the
 * full (quantized) model weights through memory once. This is the scaffold
 * version; BUILD refines the correction factor using real hardware
 * benchmarks (see docs/BACKLOG.md, epic "Speed estimate").
 */

/**
 * Estimated tokens/sec given GPU memory bandwidth and model size at rest.
 *
 * `bandwidthGBs` is GB/s of memory bandwidth, `modelBytes` is the
 * quantized model size in bytes.
 */
export function estimateTokensPerSecond(bandwidthGBs: number, modelBytes: number): number {
  const bandwidthBytesPerSec = bandwidthGBs * 1e9;
  const modelGB = modelBytes / 1e9;
  if (modelGB <= 0) return 0;
  return bandwidthBytesPerSec / modelBytes;
}
