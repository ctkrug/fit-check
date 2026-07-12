/** Human-readable byte size, e.g. 4_200_000_000 -> "4.2 GB", 5e8 -> "500 MB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 GB";
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  return `${Math.round(bytes / 1e6)} MB`;
}

/** Human-readable throughput, e.g. 42.3 -> "42.3 tok/s", 0 -> "— tok/s". */
export function formatTokensPerSecond(tokensPerSecond: number): string {
  if (!Number.isFinite(tokensPerSecond) || tokensPerSecond <= 0) return "— tok/s";
  if (tokensPerSecond >= 100) return `${Math.round(tokensPerSecond)} tok/s`;
  return `${tokensPerSecond.toFixed(1)} tok/s`;
}

/** Human-readable parameter count, e.g. 7_000_000_000 -> "7.0B", 125e6 -> "125M". */
export function formatParamCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "—";
  if (count >= 1e9) return `${(count / 1e9).toFixed(count >= 1e11 ? 0 : 1)}B`;
  if (count >= 1e6) return `${Math.round(count / 1e6)}M`;
  return `${Math.round(count / 1e3)}K`;
}
