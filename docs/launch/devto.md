---
title: "I built a browser tool that tells you if an LLM will actually run on your GPU"
published: false
tags: llm, webdev, typescript, machinelearning
---

Every time I wanted to try a new local model, I hit the same 30 seconds of doubt: will this thing
even fit on my card, and if it fits, will it run fast enough to be worth the download? The tools I
found were all the same shape: a hardcoded table of a dozen popular models with a green checkmark
if the VRAM number cleared the bar. That answers the wrong question. A 70B model in Q4 can fit in
24 GB and still generate two tokens per second, because the bottleneck is memory bandwidth, not
capacity. So I built [Fit Check](https://apps.charliekrug.com/fit-check/): you type a GPU and a
Hugging Face model, and it computes fit *and* speed per quantization level, entirely in the
browser.

Two build decisions turned out to be more interesting than I expected.

## Deriving parameter counts from config.json, not the weights

To size a model you need its parameter count, and most `config.json` files on Hugging Face do not
carry one. What they do carry is the architecture: hidden size, layer count, intermediate size,
vocab size, and the attention head configuration. That is enough to reconstruct the count with
standard decoder-LLM accounting:

- **Embeddings:** `vocab * hidden`, doubled if the input and output embeddings are untied.
- **Attention per layer:** the query and output projections are `hidden^2` each; the key and value
  projections scale by the GQA ratio `num_key_value_heads / num_attention_heads`. Skipping that
  ratio is the classic way to overcount a modern model by a billion-plus parameters, because
  grouped-query attention shrinks K and V dramatically.
- **MLP per layer:** a gated SwiGLU block is `3 * hidden * intermediate`, not two matrices.

Plugging Llama-3-8B's config into that formula lands at about 8.03B, matching the published count.
The whole thing fetches only a few KB of JSON, never a shard of weights, so it stays client-side
and instant.

## Speed is bandwidth divided by bytes, and the constant is the honest part

Autoregressive generation streams every weight through the memory bus once per token, so the
ceiling is `bandwidth / model_bytes` tokens per second. Real hardware never reaches the ceiling:
KV-cache traffic, attention compute, and imperfect bandwidth utilization all shave it down. Rather
than pretend otherwise, I folded that into a single documented efficiency constant and calibrated
it against published llama.cpp benchmarks. An RTX 4090 at 1008 GB/s running an 8B Q4 model
(~4.9 GB) has a theoretical ceiling of ~206 tok/s and reports ~130 to 140 in the wild, which puts
the factor around 0.68. A 3090 lands in the same place. That one number is in the source with its
sources next to it, because a speed estimate you cannot audit is just vibes.

The quantization footprints get the same treatment: the effective bits-per-parameter for Q4, Q5,
Q8, and FP16 are constants calibrated so `params * bits / 8` lands within ~2% of the real GGUF
download sizes, with the calibration table written into the code.

## Keeping it pure

The math lives in `src/lib/` as small pure functions: params, quant, speed, verdict, readout. No
DOM, no I/O, no framework. The UI layer is a single controller that reads inputs, calls those
functions on every keystroke, and reflects state into the URL so any result is shareable. Because
the logic is pure, the test suite covers it thoroughly without a browser, and I could add a
fast-check property suite (footprint is monotonic in bits, no input ever yields NaN, parse
round-trips) that caught edge cases hand-written tests missed.

## What I would do differently

The parameter derivation ignores mixture-of-experts routing, so it undercounts MoE models by their
inactive experts. That is the next thing to fix, and it needs expert-aware accounting rather than a
tweak. I would also love real per-architecture efficiency factors instead of one global constant,
but that trades auditability for precision, and for a gut-check tool the single honest number wins.

Code and math are on [GitHub](https://github.com/ctkrug/fit-check); the live tool is at
[apps.charliekrug.com/fit-check](https://apps.charliekrug.com/fit-check/). If your card and a
favorite model disagree with the readout, I want to hear about it.
