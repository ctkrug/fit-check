/**
 * Math-transparency breakdown.
 *
 * Every bar can show its own working: the exact params -> bytes -> fit ->
 * tokens/sec chain with the real numbers plugged in. This module produces
 * those lines as pure data so the UI just renders them and tests can assert
 * on them. No rounding decisions live in the UI.
 */

import { formatBytes, formatTokensPerSecond } from "./format";
import { bitsPerParam } from "./quant";
import { type QuantResult } from "./readout";
import { BANDWIDTH_EFFICIENCY } from "./speed";
import { VRAM_USABLE_FRACTION } from "./verdict";
import type { WeightFormat } from "./quant";

export interface ExplainLine {
  label: string;
  value: string;
}

/**
 * Build the calculation breakdown for one quant bar. `paramCount` and the GPU
 * figures are the live inputs; the returned lines mirror the formulas in
 * quant.ts / speed.ts / verdict.ts so the UI and the math never drift.
 */
export function explainResult(
  result: QuantResult,
  paramCount: number,
  gpu: { vramGB: number; bandwidthGBs: number },
  format: WeightFormat,
): ExplainLine[] {
  const bits = bitsPerParam(result.quant, format);
  const paramsB = (paramCount / 1e9).toFixed(1);
  const usableVram = gpu.vramGB * VRAM_USABLE_FRACTION;

  const lines: ExplainLine[] = [
    {
      label: "Footprint",
      value: `${paramsB}B params × ${bits} bits ÷ 8 = ${formatBytes(result.bytes)}`,
    },
    {
      label: "Fit",
      value: result.fits
        ? `${formatBytes(result.bytes)} ≤ ${usableVram.toFixed(1)} GB usable (${gpu.vramGB} GB × ${VRAM_USABLE_FRACTION}) ✓`
        : `${formatBytes(result.bytes)} > ${usableVram.toFixed(1)} GB usable (${gpu.vramGB} GB × ${VRAM_USABLE_FRACTION}) — won't fit`,
    },
  ];

  if (result.fits) {
    lines.push({
      label: "Speed",
      value: `${gpu.bandwidthGBs} GB/s ÷ ${formatBytes(result.bytes)} × ${BANDWIDTH_EFFICIENCY} eff = ${formatTokensPerSecond(result.tokensPerSecond)}`,
    });
  }

  return lines;
}
