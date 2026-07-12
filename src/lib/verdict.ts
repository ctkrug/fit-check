/**
 * Fit/speed verdict classification.
 *
 * Placeholder thresholds for the scaffold — BUILD calibrates the speed
 * bands against real benchmark data (see docs/BACKLOG.md, epic
 * "Core fit + speed engine").
 */

export type Verdict = "green" | "yellow" | "red";

const SLOW_THRESHOLD_TOKENS_PER_SEC = 5;
const COMFORTABLE_THRESHOLD_TOKENS_PER_SEC = 20;

export function classifyVerdict(
  modelBytes: number,
  vramBytes: number,
  tokensPerSecond: number,
): Verdict {
  if (modelBytes > vramBytes) return "red";
  if (tokensPerSecond < SLOW_THRESHOLD_TOKENS_PER_SEC) return "red";
  if (tokensPerSecond < COMFORTABLE_THRESHOLD_TOKENS_PER_SEC) return "yellow";
  return "green";
}
