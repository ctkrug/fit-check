/**
 * The readout engine: given a GPU and a model, compute a full per-quant-level
 * result — footprint, fit, throughput and verdict — for the four bars the UI
 * renders. This is the single pure function behind the "wow moment": it takes
 * plain numbers in and returns plain data out, so the UI can call it on every
 * keystroke with no I/O and no surprises.
 */

import { estimateModelBytes, type QuantLevel, type WeightFormat } from "./quant";
import { estimateTokensPerSecond } from "./speed";
import { classifyFit, type FitReason, type Verdict } from "./verdict";

/** The quant levels rendered, weakest-to-strongest (bar order top-to-bottom). */
export const QUANT_LEVELS: QuantLevel[] = ["Q4", "Q5", "Q8", "FP16"];

export interface GpuSpec {
  vramGB: number;
  bandwidthGBs: number;
}

export interface QuantResult {
  quant: QuantLevel;
  bytes: number;
  fitsFraction: number; // bytes / vram, for sizing the bar (0..>1)
  fits: boolean;
  tokensPerSecond: number;
  verdict: Verdict;
  reason: FitReason;
}

/**
 * Compute the four-bar readout for a GPU + model. `paramCount` of 0 (no model
 * entered yet) yields four empty, non-fitting bars rather than throwing —
 * the UI renders that as its designed empty state.
 */
export function computeReadout(
  gpu: GpuSpec,
  paramCount: number,
  format: WeightFormat = "GGUF",
): QuantResult[] {
  const vramBytes = Math.max(0, gpu.vramGB) * 1e9;
  return QUANT_LEVELS.map((quant) => {
    const bytes = estimateModelBytes(paramCount, quant, format);
    const tokensPerSecond = estimateTokensPerSecond(gpu.bandwidthGBs, bytes);
    const { verdict, reason, fits } = classifyFit(bytes, vramBytes, tokensPerSecond);
    return {
      quant,
      bytes,
      fitsFraction: vramBytes > 0 ? bytes / vramBytes : 0,
      fits,
      tokensPerSecond,
      verdict,
      reason,
    };
  });
}
