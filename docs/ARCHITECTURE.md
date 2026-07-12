# Architecture

A static, client-only TypeScript app (Vite + Vitest). No backend: every
computation is pure and runs in the browser; the only network call is an
optional client-side fetch of a Hugging Face `config.json`.

## Data flow

```
 user input ──► app.ts (controller/state) ──► lib/* (pure math) ──► DOM readout
      │                    │                                            ▲
      │                    ├── lib/hf.ts ──(fetch config.json)──► HF CDN │
      │                    └── lib/urlstate.ts ◄──► window.location ──────┘
```

1. `app.ts` reads the GPU (from `lib/gpus`, or custom VRAM/bandwidth) and a
   model input (a HF repo ID → `lib/hf` lookup, or a bare size → `lib/params`).
2. It calls `computeReadout` (`lib/readout`) which combines `lib/quant` +
   `lib/speed` + `lib/verdict` into four `QuantResult`s.
3. It renders the bars, wires the expandable breakdown (`lib/explain`), and
   mirrors state into the URL (`lib/urlstate`).

## Key files

| File | Responsibility |
|---|---|
| `src/app.ts` | UI controller: builds DOM once, re-renders the readout on input; injectable `fetch`/timers for tests |
| `src/main.ts` | Entrypoint: mounts `createApp` into `#app` |
| `src/ui/boot.ts` | Typewriter boot-sequence wordmark (reduced-motion aware) |
| `src/lib/quant.ts` | GGUF/AWQ effective bits-per-parameter → model bytes |
| `src/lib/speed.ts` | Bandwidth-bound tokens/sec with a calibrated efficiency factor |
| `src/lib/verdict.ts` | Structured fit/speed verdict (fits + reason + colour) |
| `src/lib/readout.ts` | `computeReadout`: the pure engine behind the four bars |
| `src/lib/params.ts` | Parse `"7B"` and derive param counts from HF config dimensions |
| `src/lib/hf.ts` | Client-side HF `config.json` lookup → param count (injectable fetch) |
| `src/lib/gpus.ts` | Curated GPU catalogue (VRAM + bandwidth) + search |
| `src/lib/explain.ts` | Per-bar calculation breakdown as pure data |
| `src/lib/format.ts` | Human-readable bytes / tokens-per-sec / param counts |
| `src/lib/urlstate.ts` | Encode/decode shareable state ↔ URL query string |
| `src/style.css` | Blueprint design system (see `docs/DESIGN.md`) |

Every `*.ts` under `src/lib` and `src/ui` has a sibling `*.test.ts`, plus
`src/lib/properties.test.ts` — fast-check property tests asserting engine
invariants (footprint/speed monotonicity, verdict ordering, parse round-trips,
no NaN leaks).

The GPU input is a keyboard-operable WAI-ARIA combobox: Arrow keys move a
highlighted option, Enter selects, Escape closes, and `aria-expanded` /
`aria-activedescendant` track state — a pointer is never required.

## Run / test / build

```bash
npm install
npm run dev        # local dev server
npm test           # vitest run (pure logic + jsdom UI)
npm run coverage   # vitest run --coverage (V8)
npm run typecheck  # tsc --noEmit
npm run build      # tsc --noEmit && vite build -> dist/ (relative base, subpath-safe)
```

The build is base-path-relative (`vite.config.ts` `base: "./"`) so `dist/`
serves correctly from a subpath like `apps.charliekrug.com/fit-check/`.
