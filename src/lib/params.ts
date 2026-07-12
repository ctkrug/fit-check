/**
 * Parameter-count utilities.
 *
 * A model's parameter count is the one number the whole readout hinges on.
 * It arrives two ways: a human types "7B", or a Hugging Face `config.json`
 * gives us the architecture dimensions from which we derive it. Both paths
 * land here so the rest of the app only ever deals in a plain integer.
 */

/**
 * Parse a human parameter string into a raw count.
 *
 * Accepts "7B", "1.5b", "70 B", "125M", "8000000000", "8e9". Returns null for
 * empty or unparseable input so the caller can render a designed error state
 * rather than compute on NaN.
 */
export function parseParamCount(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  const match = trimmed.match(/^([0-9]*\.?[0-9]+(?:e[0-9]+)?)\s*([bmk])?$/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const suffix = match[2];
  const multiplier =
    suffix === "b" ? 1e9 : suffix === "m" ? 1e6 : suffix === "k" ? 1e3 : 1;
  const count = value * multiplier;
  return count > 0 ? Math.round(count) : null;
}

/** The subset of a Hugging Face `config.json` we can derive a count from. */
export interface ModelConfig {
  num_parameters?: number;
  n_params?: number;
  hidden_size?: number;
  num_hidden_layers?: number;
  intermediate_size?: number;
  vocab_size?: number;
  num_attention_heads?: number;
  num_key_value_heads?: number;
  tie_word_embeddings?: boolean;
}

/**
 * Derive a transformer's parameter count from its architecture dimensions.
 *
 * Standard decoder-LLM accounting:
 *   embeddings        vocab * hidden      (+ a separate output head if untied)
 *   per layer, attn   q,o = hidden^2 each; k,v scaled by GQA ratio
 *   per layer, mlp    gated SwiGLU: 3 * hidden * intermediate
 *
 * Validated on Llama-3-8B (hidden 4096, 32 layers, intermediate 14336, vocab
 * 128256, 32/8 heads, untied) -> ~8.03B, matching the published count.
 * Returns null if the required dimensions are missing.
 */
export function deriveParamCount(config: ModelConfig): number | null {
  const hidden = config.hidden_size;
  const layers = config.num_hidden_layers;
  const intermediate = config.intermediate_size;
  const vocab = config.vocab_size;
  if (!hidden || !layers || !intermediate || !vocab) return null;

  const heads = config.num_attention_heads ?? 1;
  const kvHeads = config.num_key_value_heads ?? heads;
  const gqaRatio = heads > 0 ? kvHeads / heads : 1;

  const attnPerLayer = 2 * hidden * hidden + 2 * hidden * hidden * gqaRatio;
  const mlpPerLayer = 3 * hidden * intermediate;
  const perLayer = attnPerLayer + mlpPerLayer;

  const tied = config.tie_word_embeddings === true;
  const embeddings = tied ? vocab * hidden : 2 * vocab * hidden;

  return Math.round(embeddings + layers * perLayer);
}

/**
 * Best-effort parameter count from a config: prefer an explicit field, else
 * derive from architecture. Returns null when neither path yields a count.
 */
export function paramCountFromConfig(config: ModelConfig): number | null {
  const explicit = config.num_parameters ?? config.n_params;
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0) {
    return Math.round(explicit);
  }
  return deriveParamCount(config);
}
