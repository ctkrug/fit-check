export type GpuVendor = "NVIDIA" | "AMD" | "Apple";

export interface Gpu {
  name: string;
  vendor: GpuVendor;
  vramGB: number;
  bandwidthGBs: number;
}

/**
 * Curated GPUs with VRAM + memory bandwidth from vendor spec sheets.
 *
 * Bandwidth is the figure that drives the tokens/sec estimate, so it's worth
 * getting right: consumer GDDR6X/GDDR7 cards, datacenter HBM parts, and
 * Apple unified-memory SoCs span two orders of magnitude. Apple entries use a
 * representative allocatable VRAM (unified memory shared with the system);
 * their bandwidth is the SoC's total memory bandwidth.
 */
export const GPUS: Gpu[] = [
  { name: "RTX 5090", vendor: "NVIDIA", vramGB: 32, bandwidthGBs: 1792 },
  { name: "RTX 4090", vendor: "NVIDIA", vramGB: 24, bandwidthGBs: 1008 },
  { name: "RTX 4080 Super", vendor: "NVIDIA", vramGB: 16, bandwidthGBs: 736 },
  { name: "RTX 4070 Ti", vendor: "NVIDIA", vramGB: 12, bandwidthGBs: 504 },
  { name: "RTX 4060 Ti 16GB", vendor: "NVIDIA", vramGB: 16, bandwidthGBs: 288 },
  { name: "RTX 3090 Ti", vendor: "NVIDIA", vramGB: 24, bandwidthGBs: 1008 },
  { name: "RTX 3090", vendor: "NVIDIA", vramGB: 24, bandwidthGBs: 936 },
  { name: "RTX 3080 10GB", vendor: "NVIDIA", vramGB: 10, bandwidthGBs: 760 },
  { name: "RTX 3060 12GB", vendor: "NVIDIA", vramGB: 12, bandwidthGBs: 360 },
  { name: "RTX A6000", vendor: "NVIDIA", vramGB: 48, bandwidthGBs: 768 },
  { name: "L40S", vendor: "NVIDIA", vramGB: 48, bandwidthGBs: 864 },
  { name: "A100 40GB", vendor: "NVIDIA", vramGB: 40, bandwidthGBs: 1555 },
  { name: "A100 80GB", vendor: "NVIDIA", vramGB: 80, bandwidthGBs: 2039 },
  { name: "H100 PCIe", vendor: "NVIDIA", vramGB: 80, bandwidthGBs: 2000 },
  { name: "H100 SXM", vendor: "NVIDIA", vramGB: 80, bandwidthGBs: 3350 },
  { name: "Tesla T4", vendor: "NVIDIA", vramGB: 16, bandwidthGBs: 320 },
  { name: "Radeon RX 7900 XTX", vendor: "AMD", vramGB: 24, bandwidthGBs: 960 },
  { name: "Radeon RX 7900 XT", vendor: "AMD", vramGB: 20, bandwidthGBs: 800 },
  { name: "Apple M2 Max", vendor: "Apple", vramGB: 32, bandwidthGBs: 400 },
  { name: "Apple M3 Max", vendor: "Apple", vramGB: 48, bandwidthGBs: 400 },
  { name: "Apple M2 Ultra", vendor: "Apple", vramGB: 96, bandwidthGBs: 800 },
];

/** Exact-name lookup, case-insensitive. */
export function findGpu(name: string): Gpu | undefined {
  const needle = name.trim().toLowerCase();
  return GPUS.find((gpu) => gpu.name.toLowerCase() === needle);
}

/**
 * Filter GPUs by a free-text query against name and vendor. An empty query
 * returns the full list so the picker can show everything before typing.
 */
export function searchGpus(query: string): Gpu[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return GPUS;
  return GPUS.filter(
    (gpu) =>
      gpu.name.toLowerCase().includes(needle) ||
      gpu.vendor.toLowerCase().includes(needle),
  );
}
