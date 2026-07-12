/**
 * Fit/speed verdict classification.
 *
 * Two independent questions decide a quant level's fate:
 *   1. Does it fit? weights (+ a working-memory headroom margin) must sit
 *      inside VRAM. If not, speed is irrelevant — the model won't load.
 *   2. If it fits, is it fast enough to actually use? Interactive chat needs
 *      a readable stream; batch/agentic use tolerates less.
 *
 * The colour bands below are deliberately conservative — "yellow" means
 * "runs, but you'll feel it," "green" means "comfortably interactive."
 */

export type Verdict = "green" | "yellow" | "red";

/** Why a quant level got its verdict — lets the UI label a red bar precisely. */
export type FitReason = "wont-fit" | "too-slow" | "usable" | "comfortable";

/** Below this it's a slideshow, not a chat. */
export const SLOW_THRESHOLD_TOKENS_PER_SEC = 5;
/** At/above this it feels interactive. */
export const COMFORTABLE_THRESHOLD_TOKENS_PER_SEC = 20;

/**
 * Fraction of VRAM assumed available to weights after the runtime's own
 * overhead (CUDA context, activations, a small KV cache). A model whose
 * weights exceed `vram * this` is treated as "won't fit" in practice even if
 * the raw bytes technically slot under the VRAM number.
 */
export const VRAM_USABLE_FRACTION = 0.9;

export interface FitResult {
  verdict: Verdict;
  reason: FitReason;
  fits: boolean;
}

/**
 * Full structured verdict: colour, machine reason, and a plain `fits` flag.
 * `tokensPerSecond` is ignored when the model doesn't fit.
 */
export function classifyFit(
  modelBytes: number,
  vramBytes: number,
  tokensPerSecond: number,
): FitResult {
  const fits = modelBytes > 0 && modelBytes <= vramBytes * VRAM_USABLE_FRACTION;
  if (!fits) return { verdict: "red", reason: "wont-fit", fits: false };
  if (tokensPerSecond < SLOW_THRESHOLD_TOKENS_PER_SEC) {
    return { verdict: "red", reason: "too-slow", fits: true };
  }
  if (tokensPerSecond < COMFORTABLE_THRESHOLD_TOKENS_PER_SEC) {
    return { verdict: "yellow", reason: "usable", fits: true };
  }
  return { verdict: "green", reason: "comfortable", fits: true };
}

/** Colour-only verdict, for callers that just need the bar hue. */
export function classifyVerdict(
  modelBytes: number,
  vramBytes: number,
  tokensPerSecond: number,
): Verdict {
  return classifyFit(modelBytes, vramBytes, tokensPerSecond).verdict;
}
