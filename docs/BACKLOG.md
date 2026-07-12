# Backlog

Epics and stories for the v1 build. All start unchecked. Build runs implement to the acceptance
criteria; QA runs attack them. The first story of Epic 1 is the wow moment — it ships before
anything else.

## Epic 1 — Core fit + speed engine and live readout

- [ ] **Live quant readout for manual GPU + param count input** *(wow moment)*
  - Entering VRAM + bandwidth and a parameter count renders four bars (Q4/Q5/Q8/FP16) within
    100ms of the last keystroke, with no page reload and no network request.
  - Each bar shows a computed tokens/sec figure that visibly changes when GPU bandwidth changes.
  - A quant level whose memory footprint exceeds available VRAM renders its bar red, labeled
    "won't fit," instead of a speed number.

- [ ] **Replace placeholder byte math with real GGUF bits-per-parameter formula**
  - `estimateModelBytes` uses documented GGUF bits/param constants per quant level (Q4_K_M,
    Q5_K_M, Q8_0) validated against at least 2 known real model file sizes, within 10%.
  - Unit tests cover at least 3 quant levels against known reference sizes.

- [ ] **Add AWQ bits-per-parameter formula alongside GGUF**
  - The UI can toggle format (GGUF vs AWQ) and the footprint numbers change accordingly.
  - A unit test asserts AWQ 4-bit footprint differs from GGUF Q4 footprint (different overhead).

- [ ] **Calibrate tokens/sec estimate with a correction factor**
  - `estimateTokensPerSecond` includes a documented correction factor tuned against at least 2
    published real-world benchmark figures (e.g. llama.cpp benchmark threads), landing within
    30% of the reported number.
  - The correction factor and its source are documented in code comments or a docs file.

## Epic 2 — GPU and model input

- [ ] **Curated GPU picker with search**
  - The picker lists at least 15 real GPUs with VRAM + bandwidth sourced from vendor specs.
  - Typing filters the list; selecting a GPU populates the VRAM/bandwidth fields.

- [ ] **Manual GPU entry fallback**
  - A "custom GPU" option reveals VRAM + bandwidth number inputs.
  - Invalid input (negative, non-numeric, empty) shows an inline error, not a crash, and disables
    the readout until corrected.

- [ ] **Hugging Face model lookup by repo ID**
  - Entering a valid public HF repo ID (e.g. `meta-llama/Llama-3.1-8B`) fetches `config.json`
    client-side and extracts a parameter count without downloading model weights.
  - An invalid or nonexistent repo ID shows an inline "model not found" error, not a crash.

- [ ] **Architecture-aware parameter count fallback**
  - If a model config lacks an explicit parameter-count field, it's derived from
    `hidden_size`/`num_layers`/`vocab_size` per a documented architecture formula.
  - A unit test covers at least one model config missing an explicit count.

## Epic 3 — Math transparency and sharing

- [ ] **"How this is calculated" breakdown per bar**
  - Expanding a quant bar reveals the exact formula and numbers used (params × bits/8 = bytes;
    bandwidth / bytes = tokens/sec).
  - The breakdown updates live as inputs change.

- [ ] **Shareable result URL**
  - Selecting a GPU and entering a model updates the URL query string without a page reload.
  - Loading that URL directly reproduces the same GPU, model, and readout state.

- [ ] **Designed empty and error states**
  - Before any input, the page shows a designed empty state matching `docs/DESIGN.md`, not a
    blank panel.
  - A network failure fetching the HF config shows a designed inline error with a retry action.

## Epic 4 — Design polish and ship readiness

- [ ] **Apply the blueprint design system across the UI**
  - Every token (colors, fonts, spacing, radius) from `docs/DESIGN.md` is implemented in the
    stylesheet/component styles.
  - Every interactive control (inputs, picker, toggle, expandable breakdown) has themed
    hover/focus/active states, confirmed in a manual QA pass.

- [ ] **Responsive layout at 390 / 768 / 1440**
  - No horizontal scroll and no overlapping elements at 390px, 768px, and 1440px widths.
  - The four-bar readout remains the visual majority of the viewport at all three widths.

- [ ] **Boot-sequence signature detail and favicon**
  - The page title types out on load per `docs/DESIGN.md`, and renders instantly (no animation)
    when `prefers-reduced-motion` is set.
  - A generated, non-default favicon using the accent color renders in the browser tab.

- [ ] **Verify static build is deployable to a subpath**
  - `npm run build` outputs a self-contained `dist/` using only relative asset paths (no leading
    `/`).
  - Serving `dist/` under a subpath (e.g. `/fit-check/`) loads all assets and the app functions
    correctly.
