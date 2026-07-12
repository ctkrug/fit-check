/**
 * Hugging Face model lookup.
 *
 * Given a public repo ID we fetch only its `config.json` (a few KB) directly
 * from the HF CDN and derive a parameter count from it — never the weights.
 * The fetch implementation is injected so the logic is testable offline and
 * the browser's global `fetch` is the only default dependency.
 */

import { paramCountFromConfig, type ModelConfig } from "./params";

export type LookupError = "invalid-repo" | "not-found" | "no-param-count" | "network";

export type LookupResult =
  | { ok: true; repoId: string; paramCount: number; config: ModelConfig }
  | { ok: false; error: LookupError };

/** HF repo IDs are `owner/name`; allow the usual [A-Za-z0-9._-] segments. */
const REPO_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function isValidRepoId(repoId: string): boolean {
  return REPO_ID_RE.test(repoId.trim());
}

/** The public config.json URL for a repo's main revision. */
export function configUrl(repoId: string): string {
  return `https://huggingface.co/${repoId.trim()}/resolve/main/config.json`;
}

/**
 * Look up a model's parameter count by repo ID.
 *
 * Resolves to a discriminated result rather than throwing: every failure mode
 * (bad ID, 404, missing dimensions, network error) maps to a designed error
 * state in the UI. `fetchImpl` defaults to the global `fetch`.
 */
export async function lookupModel(
  repoId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LookupResult> {
  const id = repoId.trim();
  if (!isValidRepoId(id)) return { ok: false, error: "invalid-repo" };

  let response: Response;
  try {
    response = await fetchImpl(configUrl(id));
  } catch {
    return { ok: false, error: "network" };
  }

  if (response.status === 404) return { ok: false, error: "not-found" };
  if (!response.ok) return { ok: false, error: "network" };

  let config: ModelConfig;
  try {
    config = (await response.json()) as ModelConfig;
  } catch {
    return { ok: false, error: "network" };
  }

  const paramCount = paramCountFromConfig(config);
  if (paramCount === null) return { ok: false, error: "no-param-count" };

  return { ok: true, repoId: id, paramCount, config };
}
