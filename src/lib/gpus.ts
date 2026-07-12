export interface Gpu {
  name: string;
  vramGB: number;
  bandwidthGBs: number;
}

/**
 * Seed set for the scaffold. BUILD expands this to a fuller curated list
 * (see docs/BACKLOG.md, epic "GPU + model input").
 */
export const GPUS: Gpu[] = [
  { name: "RTX 4090", vramGB: 24, bandwidthGBs: 1008 },
  { name: "RTX 4080", vramGB: 16, bandwidthGBs: 717 },
  { name: "RTX 3090", vramGB: 24, bandwidthGBs: 936 },
  { name: "RTX 3060", vramGB: 12, bandwidthGBs: 360 },
  { name: "Apple M2 Max", vramGB: 32, bandwidthGBs: 400 },
];

export function findGpu(name: string): Gpu | undefined {
  const needle = name.trim().toLowerCase();
  return GPUS.find((gpu) => gpu.name.toLowerCase() === needle);
}
