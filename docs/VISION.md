# Vision

## The problem

Anyone with a GPU and a passing interest in local LLMs eventually asks the same question: "can
I run this model?" The existing answers are all versions of a static lookup table — a
spreadsheet or a hardcoded JSON blob mapping a handful of popular model names to VRAM
requirements at one or two quant levels. That approach has two structural failures:

1. **It answers the wrong question.** "Fits in memory" and "runs at a speed you'd actually
   tolerate" are different things. A 70B Q4 model can be well within a 24GB card's VRAM budget
   and still generate at 2 tokens/sec because it's bandwidth-starved. A tool that only checks
   capacity gives a false green light.
2. **It's always behind.** New models ship constantly. A hardcoded table needs a manual update
   for every one, so it's permanently stale for anything released in the last week — which,
   for local-LLM enthusiasts, is often the model they actually want to run.

## Who it's for

Hobbyists and developers running open-weight models locally (Ollama, llama.cpp, text-generation-
webui, LM Studio, vLLM) who are shopping for a model to try, or deciding whether an upgrade is
worth it. They know their hardware; they don't want to become quantization experts to answer
"will this work."

## The core idea

Compute the answer instead of looking it up:

- **Fit** is a formula over the model's parameter count (pulled from its public Hugging Face
  config — no weights downloaded) and the bits-per-parameter of a given quantization scheme
  (GGUF or AWQ). This works for any model, including one released an hour ago, because it only
  needs metadata that's already public the moment a repo goes up.
- **Speed** is a formula over GPU memory bandwidth and the resulting quantized model size.
  Autoregressive token generation at batch size 1 is memory-bandwidth-bound: each token requires
  streaming the full weight set through memory once, so `tokens/sec ≈ bandwidth / model bytes`,
  refined with an empirically-tuned correction factor rather than treated as exact physics.

Both numbers are computed client-side, live, as the user types — no backend, no request
round-trip, no waiting.

## Key design decisions

- **No backend, no database.** Static site, all computation in the browser. This keeps hosting
  free and trivial (a static host under `apps.charliekrug.com/fit-check`) and keeps the tool
  fast — there's nothing to wait on.
- **Formula over table, always.** Any time a shortcut would mean hardcoding a specific model's
  numbers, prefer deriving it from parameters + architecture instead. The table approach is the
  thing this project exists to replace.
- **Show the math.** The result includes a visible breakdown of how the estimate was derived
  (bits/param × params = size; bandwidth / size = tokens/sec) so trust is earned, not asserted.
- **Honest uncertainty.** The bandwidth-bound model is a first-order approximation, not a
  cycle-accurate simulator. The UI communicates a range/estimate rather than false precision, and
  the design should make clear this is an estimate, not a benchmark result.
- **Four quant levels, one glance.** Q4 / Q5 / Q8 / FP16 render together so the user sees the
  full fit-vs-speed trade-off curve for a model at once, not one number at a time.

## What "v1 done" looks like

- Type a GPU (from a curated list, or manual VRAM + bandwidth entry) and a Hugging Face model
  name or repo ID.
- See four bars (Q4, Q5, Q8, FP16), each colored by a green/yellow/red fit-and-speed verdict and
  labeled with an estimated tokens/sec, updating live with no reload as input changes.
- See the underlying math for any bar on demand (size calculation, bandwidth calculation).
- The result state is shareable via a URL that reproduces the same GPU + model input.
- Works and looks intentionally designed on both a 1440px desktop and a 390px phone screen.
- Ships as a static site buildable into a single output directory, deployable to a subpath host.
