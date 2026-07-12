# Design

## 1. Aesthetic direction

**Blueprint/technical.** Fit Check is engineering, not decoration — it computes real quantization
math and reports it like an instrument reading. The page reads as a drafting blueprint: cyan
linework on deep navy, a faint grid, crosshair corner marks, monospace numerals for every
computed value. This is deliberately distinct from a generic dark-glass/gradient dev-tool look —
the personality here is *precision*, not *mood*.

## 2. Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a1628` | page background (deep blueprint navy) |
| `--surface-1` | `#0f1f38` | panel background |
| `--surface-2` | `#152a4a` | raised panel / input background |
| `--text` | `#e8f1fb` | primary text |
| `--text-muted` | `#7f97b8` | secondary/label text |
| `--accent` | `#4fd6ff` | primary accent — blueprint cyan (lines, focus, active state) |
| `--accent-support` | `#ff9d4d` | support accent — amber, used sparingly for callouts/annotations |
| `--success` | `#4ade80` | green verdict bar |
| `--warning` | `#facc15` | yellow verdict bar |
| `--danger` | `#f87171` | red verdict bar |

- **Display font:** [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) — wordmark,
  headings. Fallback: `ui-sans-serif, system-ui`.
- **UI/mono font:** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) — labels,
  every computed number (params, bytes, tokens/sec), inputs. Fallback: `ui-monospace, monospace`.
  Numbers read as instrument output, not prose, so they're monospaced everywhere.
- **Spacing unit:** 8px scale (8/16/24/32/48/64).
- **Corner radius:** 2px on inputs/buttons, 4px on panels — sharp, drafted, not soft/bubbly.
- **Depth:** no drop shadows (blueprint linework doesn't cast shadows) — depth comes from a 1px
  `--accent` border at low opacity plus a subtle inset glow on active/focused panels, and from
  the grid background sitting a shade darker than panels.
- **Motion:** UI transitions 150ms ease-out; the live-updating quant bars animate width/color
  over 180ms ease-out so a value change reads as a needle resettling, not a jump-cut.

## 3. Layout intent

The hero is the **quant bar readout** — four horizontal bars (Q4/Q5/Q8/FP16), each a full-width
instrument gauge with a fit/speed verdict color and a monospaced tokens/sec figure. Above it, a
compact two-field input row (GPU picker + model name) drafted like a form on a technical
datasheet, with a live "how this is calculated" expandable annotation beneath each bar.

- **Desktop (1440×900):** input row pinned near the top (~15% of viewport height), the four-bar
  readout fills the remaining space (~65%+ of viewport), each bar tall enough to read its verdict
  color and label at a glance. A thin sidebar-style footer strip holds the math breakdown toggle.
- **Phone (390×844):** input fields stack vertically full-width; the four bars stack vertically
  below, each still full-width and tall enough to tap. No horizontal scroll; the grid background
  scales down its cell size so it doesn't look sparse on the narrower viewport.

## 4. Signature detail

A **live corner-crosshair frame**: the four corners of the main panel carry drafting-style
crosshair marks (like a blueprint's registration marks), and the page title renders as a
typewriter-style "boot sequence" on load — `FIT CHECK` types out character by character with a
blinking cyan cursor, like an instrument powering on. It runs once per page load, respects
`prefers-reduced-motion` (renders instantly, no typing animation, if set).

## 5. Games/toys juice plan

Not applicable — Fit Check is a calculator/instrument tool, not a game or playful toy.
