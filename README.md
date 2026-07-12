# Fit Check

**▶ Live demo: [apps.charliekrug.com/fit-check](https://apps.charliekrug.com/fit-check/)**

Will that LLM run on your GPU, and how fast? Real quant math, not a lookup table.

[![CI](https://github.com/ctkrug/fit-check/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/fit-check/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Type a GPU, type a Hugging Face model name, get an instant answer: does it fit, and does it run
at a speed you can stand? Not just "fits in memory" but a per-quantization tokens/sec estimate
grounded in memory-bandwidth math, so you know whether a model is usable or just technically
loadable. It runs entirely in your browser: no login, no download, no backend.

## Who it's for

People running LLMs on their own hardware: the setup where you have one gaming GPU or a Mac and
you are deciding which model to pull before you spend the bandwidth and disk on weights that turn
out to crawl. Fit Check is the 5-second gut check before `git lfs pull`.

## Why not just a lookup table

Every "will this model fit on my GPU" tool is a static table: hardcoded VRAM numbers for a handful
of popular models, a green checkmark if you clear the bar. That answers the wrong question. A 70B
model in Q4 might *fit* in 24 GB and still run at 2 tokens/sec because you are bandwidth-starved,
not capacity-starved. Fit Check computes the real answer from first principles:

- **Quantization math, not a table.** GGUF and AWQ have well-defined bits-per-parameter formulas.
  Given a model's parameter count (read from its Hugging Face config, no weights downloaded) and a
  target quant level, it computes the memory footprint directly.
- **Speed from memory bandwidth.** Token generation streams the full set of weights through the
  memory bus once per token, so `tokens/sec ≈ bandwidth / model bytes`, scaled by a calibrated
  efficiency factor. You get a real tokens/sec figure per quant level, not just a fit flag.
- **Day-one coverage.** Because it is a formula over parameter count and architecture, a model
  released this morning works exactly as well as one from a year ago.

## Sample output

Enter a GPU and a model and you get four bars, colored green (comfortably fast), yellow (fits but
slow), or red (won't fit or unusably slow), each with an estimated tokens/sec:

```
RTX 4090 · 8.0B params · GGUF

  Q4     RUNS WELL     141 tok/s     4.9 GB  ████░░░░░░░░░░░░
  Q5     RUNS WELL     120 tok/s     5.7 GB  █████░░░░░░░░░░░
  Q8     RUNS WELL    80.3 tok/s     8.5 GB  ███████░░░░░░░░░
  FP16   RUNS WELL    42.7 tok/s    16.1 GB  █████████████░░░
```

Every bar expands to show its working: the params to bytes to fit to tokens/sec chain with the
real numbers plugged in, so no figure is a black box.

## Features

- **GPU picker** with a curated catalogue of 21 consumer, datacenter, AMD, and Apple parts (VRAM
  and memory bandwidth from vendor specs), type-to-filter search, and a **custom-entry** fallback
  for anything not listed. Fully keyboard-operable.
- **Hugging Face lookup** by repo ID: fetches only the public `config.json` (no weights) and reads
  the parameter count, falling back to an architecture formula (GQA-aware attention, gated MLP,
  tied/untied embeddings) when no explicit count is present.
- **GGUF and AWQ** footprint math from effective bits-per-parameter constants calibrated against
  real Llama-2-7B and Llama-3-8B file sizes (within ~2%), across Q4, Q5, Q8, and FP16.
- **Tokens/sec per quant level** with a calibrated bandwidth-efficiency factor, plus an expandable
  "how this is calculated" breakdown on every bar.
- **Reload-free UI:** the four bars recompute on every keystroke. A manual size like `7B` needs no
  network at all.
- **Shareable via URL:** the GPU, model, and format round-trip through the query string, so a
  specific combo can be linked directly.

## Usage

1. Open the [live demo](https://apps.charliekrug.com/fit-check/).
2. Pick your GPU, or click **Custom** and enter your VRAM and memory bandwidth.
3. Type a Hugging Face repo ID like `meta-llama/Llama-3.1-8B`, or a bare size like `7B`.
4. Read the four bars. Green means it runs well; yellow fits but drags; red won't load or crawls.
5. Hit **Share** to copy a link that reproduces exactly what you see.

## Development

Requires Node 20+ (see `.nvmrc`). TypeScript, built with Vite into a static, self-contained site.

```
npm install
npm run dev        # local dev server
npm test           # run the unit test suite
npm run coverage   # run tests with a V8 coverage report
npm run typecheck  # tsc --noEmit
npm run build      # type-check + production build into site/
```

The build output in `site/` is a plain static bundle: host it on anything that serves files.

## How it works

See [`docs/VISION.md`](docs/VISION.md) for the rationale, [`docs/DESIGN.md`](docs/DESIGN.md) for
the visual direction, and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the module map. The
quantization, bandwidth, and verdict math live in `src/lib/` as pure functions, each with its own
calibration notes and tests.

## License

MIT, see [`LICENSE`](LICENSE).

---

More of Charlie's projects → [apps.charliekrug.com](https://apps.charliekrug.com)
