# Fit Check

Type a GPU, type a Hugging Face model name, get an instant answer: **will it run, and how
fast?** Not just "fits in memory" — a per-quantization speed estimate (tokens/sec) grounded in
real memory-bandwidth math, so you know whether it's usable or just technically loadable.

## Why

Every "will this model fit on my GPU" tool out there is a static lookup table: hardcoded VRAM
numbers for a handful of popular models, a green checkmark if you clear the bar. That's the
wrong question. A 70B model in Q4 might *fit* in 24GB and still crawl at 2 tokens/sec because
you're bandwidth-starved, not capacity-starved. Fit Check answers the question people actually
have — "can I use this, at a speed I'll tolerate" — by computing it from first principles instead
of looking it up:

- **Quantization math, not a table.** GGUF and AWQ have well-defined bits-per-parameter formulas.
  Given a model's parameter count (from its Hugging Face config, no download required) and a
  target quant level, we compute the resulting memory footprint directly.
- **Speed from memory bandwidth, not folklore.** Token generation for a given batch size is
  bandwidth-bound: `tokens/sec ≈ GPU memory bandwidth / model size in bytes` (with a load-derived
  correction factor). We estimate real tokens/sec per quant level, not just a fit/no-fit flag.
- **Day-one coverage for new models.** Because it's a formula over parameter count and
  architecture, not a hand-maintained table, a model released this morning works exactly as well
  as one from a year ago.

## What it does

Enter your GPU (or its VRAM + memory bandwidth) and a Hugging Face model name or ID. Fit Check
renders a bar per quantization level — Q4, Q5, Q8, FP16 — colored green (comfortably fast),
yellow (fits, usable but slow), or red (won't fit or unusably slow) — each annotated with an
estimated tokens/sec. No page reload, no waiting on a backend: it's all computed client-side the
moment you stop typing.

## Planned features

- GPU picker with a curated database of common consumer/prosumer cards (VRAM + bandwidth), plus
  a manual-entry fallback for anything not listed.
- Hugging Face model lookup by repo ID, pulling parameter count and architecture from the
  public model config (no model weights downloaded).
- GGUF and AWQ quantization memory-footprint formulas, covering Q4_0/Q4_K_M/Q5_K_M/Q8_0/FP16
  and comparable AWQ bit-widths.
- Memory-bandwidth-derived tokens/sec estimate per quant level, with a visible "how this is
  calculated" breakdown so the numbers aren't a black box.
- Instant, reload-free UI: type a GPU and a model, see every quant bar update live.
- Shareable results via URL so a specific GPU/model combo can be linked directly.

## Stack

TypeScript, built as a static, self-contained site (no backend, no server-side state) so it can
be published to a static host as-is. Vite for the dev/build toolchain, Vitest for unit tests
covering the quantization and bandwidth math.

## Status

Early scaffold — see [`docs/VISION.md`](docs/VISION.md) for the full design rationale and
[`docs/BACKLOG.md`](docs/BACKLOG.md) for the build plan.

## License

MIT — see [`LICENSE`](LICENSE).
