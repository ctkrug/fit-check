/**
 * Shareable-result URL state.
 *
 * The full input state — which GPU (named or custom), which model (HF repo or
 * a manual param count), and the weight format — round-trips through the URL
 * query string so a link reproduces exactly what the sender saw. Encoding and
 * decoding are pure and total: decode never throws, it just drops anything it
 * can't validate, so a hand-mangled URL degrades gracefully.
 */

import type { WeightFormat } from "./quant";

export interface ShareState {
  gpuName?: string;
  vramGB?: number;
  bandwidthGBs?: number;
  repoId?: string;
  paramInput?: string;
  format?: WeightFormat;
}

const isValidFormat = (value: string): value is WeightFormat =>
  value === "GGUF" || value === "AWQ";

const positiveNumber = (value: string | null): number | undefined => {
  if (value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Serialize state to a query string (no leading "?"). Empty state -> "". */
export function encodeState(state: ShareState): string {
  const params = new URLSearchParams();
  if (state.gpuName) params.set("gpu", state.gpuName);
  if (state.vramGB && state.vramGB > 0) params.set("vram", String(state.vramGB));
  if (state.bandwidthGBs && state.bandwidthGBs > 0)
    params.set("bw", String(state.bandwidthGBs));
  if (state.repoId) params.set("model", state.repoId);
  if (state.paramInput) params.set("params", state.paramInput);
  // GGUF is the default; only encode a non-default format to keep links short.
  if (state.format && state.format === "AWQ") params.set("fmt", state.format);
  return params.toString();
}

/** Parse a query string (with or without leading "?") back into state. */
export function decodeState(search: string): ShareState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const state: ShareState = {};

  const gpu = params.get("gpu");
  if (gpu) state.gpuName = gpu;

  const vram = positiveNumber(params.get("vram"));
  if (vram !== undefined) state.vramGB = vram;

  const bw = positiveNumber(params.get("bw"));
  if (bw !== undefined) state.bandwidthGBs = bw;

  const model = params.get("model");
  if (model) state.repoId = model;

  const paramInput = params.get("params");
  if (paramInput) state.paramInput = paramInput;

  const fmt = params.get("fmt");
  if (fmt && isValidFormat(fmt)) state.format = fmt;

  return state;
}
