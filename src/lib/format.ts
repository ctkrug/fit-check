/** Human-readable byte size, e.g. 4_200_000_000 -> "4.2 GB". */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 GB";
  const gb = bytes / 1e9;
  return `${gb.toFixed(1)} GB`;
}

/** Human-readable throughput, e.g. 42.3 -> "42.3 tok/s". */
export function formatTokensPerSecond(tokensPerSecond: number): string {
  if (tokensPerSecond <= 0) return "0 tok/s";
  return `${tokensPerSecond.toFixed(1)} tok/s`;
}
