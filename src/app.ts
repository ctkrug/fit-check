/**
 * Fit Check application controller.
 *
 * Framework-free: it builds the DOM once, then re-renders only the readout on
 * every input change. The heavy lifting is all pure (see src/lib/*) — this
 * file is wiring: read inputs, resolve a GPU + a parameter count, recompute
 * the four bars, and reflect the state into the URL. Network (HF lookup) and
 * timers are injected so the whole thing is drivable in jsdom.
 */

import { typeWordmark } from "./ui/boot";
import { searchGpus, findGpu, type Gpu } from "./lib/gpus";
import { computeReadout, type QuantResult } from "./lib/readout";
import { explainResult } from "./lib/explain";
import { formatBytes, formatParamCount, formatTokensPerSecond } from "./lib/format";
import { parseParamCount } from "./lib/params";
import { lookupModel, isValidRepoId, type LookupError } from "./lib/hf";
import { type WeightFormat } from "./lib/quant";
import { decodeState, encodeState, type ShareState } from "./lib/urlstate";

export interface AppOptions {
  fetchImpl?: typeof fetch;
  setTimeoutImpl?: typeof setTimeout;
  clearTimeoutImpl?: typeof clearTimeout;
  /** Initial URL query (defaults to window.location.search). */
  initialSearch?: string;
  reducedMotion?: boolean;
}

type LookupStatus = "idle" | "loading" | "ok" | "error";

interface State {
  gpu: Gpu | null;
  custom: boolean;
  vramGB: number;
  bandwidthGBs: number;
  modelInput: string;
  paramCount: number | null;
  format: WeightFormat;
  lookupStatus: LookupStatus;
  lookupError: LookupError | null;
  expanded: string | null;
}

const LOOKUP_MESSAGES: Record<LookupError, string> = {
  "invalid-repo": "Enter a valid repo ID like meta-llama/Llama-3.1-8B",
  "not-found": "Model not found on Hugging Face",
  "no-param-count": "Couldn't read a parameter count from this model's config",
  network: "Network error fetching the model config — check your connection",
};

const VERDICT_LABEL: Record<string, string> = {
  "wont-fit": "WON'T FIT",
  "too-slow": "TOO SLOW",
  usable: "USABLE",
  comfortable: "RUNS WELL",
};

export interface AppHandle {
  destroy(): void;
}

export function createApp(root: HTMLElement, options: AppOptions = {}): AppHandle {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const setTimeoutImpl = options.setTimeoutImpl ?? setTimeout;
  const clearTimeoutImpl = options.clearTimeoutImpl ?? clearTimeout;

  const state: State = {
    gpu: null,
    custom: false,
    vramGB: 24,
    bandwidthGBs: 1008,
    modelInput: "",
    paramCount: null,
    format: "GGUF",
    lookupStatus: "idle",
    lookupError: null,
    expanded: null,
  };

  root.innerHTML = template();

  const wordmark = root.querySelector<HTMLElement>(".wordmark-text")!;
  const gpuInput = root.querySelector<HTMLInputElement>("#gpu-input")!;
  const gpuList = root.querySelector<HTMLUListElement>("#gpu-list")!;
  const customToggle = root.querySelector<HTMLButtonElement>("#custom-toggle")!;
  const customFields = root.querySelector<HTMLDivElement>("#custom-fields")!;
  const vramInput = root.querySelector<HTMLInputElement>("#vram")!;
  const bwInput = root.querySelector<HTMLInputElement>("#bw")!;
  const modelInput = root.querySelector<HTMLInputElement>("#model-input")!;
  const modelStatus = root.querySelector<HTMLElement>("#model-status")!;
  const readout = root.querySelector<HTMLElement>("#readout")!;
  const shareBtn = root.querySelector<HTMLButtonElement>("#share")!;
  const formatBtns = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-format]"));

  typeWordmark(wordmark, "FIT CHECK", { reducedMotion: options.reducedMotion });

  // --- GPU combobox ------------------------------------------------------
  function renderGpuList(query: string): void {
    const matches = searchGpus(query).slice(0, 8);
    gpuList.innerHTML = matches
      .map(
        (g) =>
          `<li role="option" data-gpu="${escapeAttr(g.name)}" tabindex="-1">` +
          `<span>${escapeHtml(g.name)}</span>` +
          `<span class="muted">${g.vramGB}GB · ${g.bandwidthGBs}GB/s</span></li>`,
      )
      .join("");
    gpuList.hidden = matches.length === 0;
  }

  function selectGpu(name: string): void {
    const gpu = findGpu(name);
    if (!gpu) return;
    state.gpu = gpu;
    state.custom = false;
    state.vramGB = gpu.vramGB;
    state.bandwidthGBs = gpu.bandwidthGBs;
    gpuInput.value = gpu.name;
    gpuList.hidden = true;
    customFields.hidden = true;
    customToggle.setAttribute("aria-pressed", "false");
    render();
  }

  gpuInput.addEventListener("focus", () => renderGpuList(gpuInput.value));
  gpuInput.addEventListener("input", () => renderGpuList(gpuInput.value));
  gpuInput.addEventListener("blur", () => {
    // Delay so a click on a list item registers before hiding.
    setTimeoutImpl(() => (gpuList.hidden = true), 150);
  });
  gpuList.addEventListener("mousedown", (e) => {
    const li = (e.target as HTMLElement).closest("li[data-gpu]");
    if (li) selectGpu(li.getAttribute("data-gpu")!);
  });

  customToggle.addEventListener("click", () => {
    state.custom = !state.custom;
    customFields.hidden = !state.custom;
    customToggle.setAttribute("aria-pressed", String(state.custom));
    if (state.custom) {
      state.gpu = null;
      vramInput.value = String(state.vramGB);
      bwInput.value = String(state.bandwidthGBs);
      vramInput.focus();
    }
    render();
  });

  function readCustom(): void {
    const vram = Number(vramInput.value);
    const bw = Number(bwInput.value);
    state.vramGB = Number.isFinite(vram) && vram > 0 ? vram : 0;
    state.bandwidthGBs = Number.isFinite(bw) && bw > 0 ? bw : 0;
    render();
  }
  vramInput.addEventListener("input", readCustom);
  bwInput.addEventListener("input", readCustom);

  // --- Model input (repo id or manual param count) -----------------------
  let lookupTimer: ReturnType<typeof setTimeout> | null = null;
  let lookupSeq = 0;

  function onModelInput(): void {
    state.modelInput = modelInput.value.trim();
    if (lookupTimer) clearTimeoutImpl(lookupTimer);

    if (!state.modelInput) {
      state.paramCount = null;
      state.lookupStatus = "idle";
      state.lookupError = null;
      render();
      return;
    }

    // A bare param string ("7B", "8e9") resolves instantly, no network.
    if (!state.modelInput.includes("/")) {
      const parsed = parseParamCount(state.modelInput);
      state.paramCount = parsed;
      state.lookupStatus = parsed === null ? "error" : "ok";
      state.lookupError = parsed === null ? "no-param-count" : null;
      render();
      return;
    }

    // Looks like a repo ID -> debounced HF lookup.
    if (!isValidRepoId(state.modelInput)) {
      state.paramCount = null;
      state.lookupStatus = "error";
      state.lookupError = "invalid-repo";
      render();
      return;
    }

    state.lookupStatus = "loading";
    state.lookupError = null;
    render();
    const seq = ++lookupSeq;
    lookupTimer = setTimeoutImpl(() => {
      void runLookup(state.modelInput, seq);
    }, 300);
  }

  async function runLookup(repoId: string, seq: number): Promise<void> {
    const result = await lookupModel(repoId, fetchImpl);
    if (seq !== lookupSeq) return; // a newer input superseded this one
    if (result.ok) {
      state.paramCount = result.paramCount;
      state.lookupStatus = "ok";
      state.lookupError = null;
    } else {
      state.paramCount = null;
      state.lookupStatus = "error";
      state.lookupError = result.error;
    }
    render();
  }

  modelInput.addEventListener("input", onModelInput);

  // --- Format toggle -----------------------------------------------------
  for (const btn of formatBtns) {
    btn.addEventListener("click", () => {
      state.format = btn.dataset.format as WeightFormat;
      for (const b of formatBtns)
        b.setAttribute("aria-pressed", String(b === btn));
      render();
    });
  }

  // --- Expand / collapse breakdown (event-delegated) ---------------------
  readout.addEventListener("click", (e) => {
    const toggle = (e.target as HTMLElement).closest("[data-expand]");
    if (!toggle) return;
    const quant = toggle.getAttribute("data-expand")!;
    state.expanded = state.expanded === quant ? null : quant;
    render();
  });

  // --- Share -------------------------------------------------------------
  shareBtn.addEventListener("click", () => {
    void copyShareLink(shareBtn);
  });

  // --- Render ------------------------------------------------------------
  function render(): void {
    renderReadout();
    syncUrl();
    formatBtns.forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.format === state.format)),
    );
  }

  function renderReadout(): void {
    modelStatus.textContent = modelStatusText();
    modelStatus.dataset.state = state.lookupStatus;

    const gpuReady = state.vramGB > 0 && state.bandwidthGBs > 0;
    if (!gpuReady || state.paramCount === null) {
      readout.innerHTML = emptyState(!gpuReady, state.lookupStatus === "error");
      return;
    }

    const gpu = { vramGB: state.vramGB, bandwidthGBs: state.bandwidthGBs };
    const results = computeReadout(gpu, state.paramCount, state.format);
    readout.innerHTML =
      `<p class="readout-caption">${escapeHtml(gpuLabel())} · ` +
      `${escapeHtml(formatParamCount(state.paramCount))} params · ${state.format}</p>` +
      results.map((r) => barMarkup(r, gpu)).join("");
  }

  function barMarkup(r: QuantResult, gpu: { vramGB: number; bandwidthGBs: number }): string {
    const pct = Math.min(100, Math.max(4, r.fitsFraction * 100));
    const speed = r.fits ? formatTokensPerSecond(r.tokensPerSecond) : "won't fit";
    const expanded = state.expanded === r.quant;
    const lines = expanded
      ? `<div class="breakdown" role="region">` +
        explainResult(r, state.paramCount!, gpu, state.format)
          .map(
            (l) =>
              `<div class="bd-row"><span class="muted">${escapeHtml(l.label)}</span>` +
              `<span>${escapeHtml(l.value)}</span></div>`,
          )
          .join("") +
        `</div>`
      : "";
    return (
      `<div class="bar bar--${r.verdict}${expanded ? " is-expanded" : ""}">` +
      `<div class="bar-head">` +
      `<span class="bar-quant">${r.quant}</span>` +
      `<span class="bar-tag">${VERDICT_LABEL[r.reason]}</span>` +
      `<span class="bar-speed">${escapeHtml(speed)}</span>` +
      `<button class="bar-expand" data-expand="${r.quant}" aria-expanded="${expanded}" ` +
      `aria-label="Show the calculation for ${r.quant}">${expanded ? "×" : "ƒ"}</button>` +
      `</div>` +
      `<div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div>` +
      `<span class="bar-bytes">${escapeHtml(formatBytes(r.bytes))}</span></div>` +
      lines +
      `</div>`
    );
  }

  function modelStatusText(): string {
    if (state.lookupStatus === "loading") return "Fetching config…";
    if (state.lookupStatus === "error" && state.lookupError)
      return LOOKUP_MESSAGES[state.lookupError];
    if (state.lookupStatus === "ok" && state.paramCount)
      return `${formatParamCount(state.paramCount)} parameters`;
    return "Enter a HF repo ID or a size like 7B";
  }

  function gpuLabel(): string {
    if (state.gpu) return state.gpu.name;
    return `Custom (${state.vramGB}GB · ${state.bandwidthGBs}GB/s)`;
  }

  function currentShareState(): ShareState {
    const s: ShareState = { format: state.format };
    if (state.gpu) s.gpuName = state.gpu.name;
    else {
      s.vramGB = state.vramGB;
      s.bandwidthGBs = state.bandwidthGBs;
    }
    if (state.modelInput.includes("/")) s.repoId = state.modelInput;
    else if (state.modelInput) s.paramInput = state.modelInput;
    return s;
  }

  function syncUrl(): void {
    const query = encodeState(currentShareState());
    const url = query ? `?${query}` : location.pathname;
    try {
      history.replaceState(null, "", url);
    } catch {
      // jsdom/opaque-origin: URL sync is best-effort, never fatal.
    }
  }

  async function copyShareLink(btn: HTMLButtonElement): Promise<void> {
    const query = encodeState(currentShareState());
    const link = `${location.origin}${location.pathname}${query ? `?${query}` : ""}`;
    try {
      await navigator.clipboard.writeText(link);
      btn.textContent = "Copied ✓";
      setTimeoutImpl(() => (btn.textContent = "Share"), 1600);
    } catch {
      btn.textContent = "Copy failed";
      setTimeoutImpl(() => (btn.textContent = "Share"), 1600);
    }
  }

  // --- Hydrate from URL --------------------------------------------------
  hydrate(decodeState(options.initialSearch ?? location.search));
  render();

  function hydrate(s: ShareState): void {
    if (s.format) state.format = s.format;
    if (s.gpuName && findGpu(s.gpuName)) {
      selectGpuSilently(findGpu(s.gpuName)!);
    } else if (s.vramGB && s.bandwidthGBs) {
      state.custom = true;
      state.vramGB = s.vramGB;
      state.bandwidthGBs = s.bandwidthGBs;
      customFields.hidden = false;
      customToggle.setAttribute("aria-pressed", "true");
      vramInput.value = String(s.vramGB);
      bwInput.value = String(s.bandwidthGBs);
    }
    const modelValue = s.repoId ?? s.paramInput;
    if (modelValue) {
      modelInput.value = modelValue;
      onModelInput();
    }
  }

  function selectGpuSilently(gpu: Gpu): void {
    state.gpu = gpu;
    state.vramGB = gpu.vramGB;
    state.bandwidthGBs = gpu.bandwidthGBs;
    gpuInput.value = gpu.name;
  }

  return {
    destroy() {
      if (lookupTimer) clearTimeoutImpl(lookupTimer);
      root.innerHTML = "";
    },
  };
}

// --- Markup helpers ------------------------------------------------------

function emptyState(noGpu: boolean, hasError: boolean): string {
  if (hasError) {
    return (
      `<div class="empty empty--error"><div class="empty-mark">!</div>` +
      `<p>Adjust the model input above to run the check.</p></div>`
    );
  }
  const msg = noGpu
    ? "Pick a GPU (or enter custom VRAM + bandwidth) to begin."
    : "Enter a model — a Hugging Face repo ID or a size like <code>7B</code>.";
  return (
    `<div class="empty"><div class="empty-mark">⌖</div>` +
    `<p>${msg}</p>` +
    `<p class="muted">Four bars — Q4 · Q5 · Q8 · FP16 — will light up with fit and speed.</p></div>`
  );
}

function template(): string {
  return `
  <div class="frame">
    <div class="corner tl"></div><div class="corner tr"></div>
    <div class="corner bl"></div><div class="corner br"></div>
    <header class="masthead">
      <h1 class="wordmark"><span class="wordmark-text">FIT CHECK</span><span class="caret"></span></h1>
      <p class="tagline">Will your GPU run it — and how fast? Real quant math, no lookup table.</p>
    </header>

    <section class="controls" aria-label="Inputs">
      <div class="field">
        <label for="gpu-input">GPU</label>
        <div class="combo">
          <input id="gpu-input" type="text" role="combobox" aria-expanded="false"
                 aria-controls="gpu-list" autocomplete="off" placeholder="Search GPUs…" />
          <ul id="gpu-list" class="combo-list" role="listbox" hidden></ul>
        </div>
        <button id="custom-toggle" type="button" class="ghost" aria-pressed="false">Custom</button>
        <div id="custom-fields" class="custom-fields" hidden>
          <label>VRAM <input id="vram" type="number" min="1" step="1" inputmode="numeric" /> GB</label>
          <label>BW <input id="bw" type="number" min="1" step="1" inputmode="numeric" /> GB/s</label>
        </div>
      </div>

      <div class="field field--model">
        <label for="model-input">Model</label>
        <input id="model-input" type="text" autocomplete="off"
               placeholder="meta-llama/Llama-3.1-8B  ·  or  7B" />
        <p id="model-status" class="status" role="status" aria-live="polite"></p>
      </div>

      <div class="field field--format">
        <span class="field-label">Format</span>
        <div class="segmented" role="group" aria-label="Weight format">
          <button type="button" data-format="GGUF" aria-pressed="true">GGUF</button>
          <button type="button" data-format="AWQ" aria-pressed="false">AWQ</button>
        </div>
        <button id="share" type="button" class="ghost share">Share</button>
      </div>
    </section>

    <section id="readout" class="readout" aria-label="Fit and speed readout" aria-live="polite"></section>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
