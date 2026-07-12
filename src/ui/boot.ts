/**
 * Boot-sequence wordmark animation (docs/DESIGN.md signature detail).
 *
 * The title types out character by character like an instrument powering on,
 * with a blinking cursor. Respects prefers-reduced-motion: with motion
 * reduced (or no timer available in tests) it renders the full text instantly.
 */

export interface BootOptions {
  /** Milliseconds between characters. */
  charDelayMs?: number;
  /** Force instant render (defaults to the reduced-motion media query). */
  reducedMotion?: boolean;
  /** Injected setInterval, for testability. */
  setIntervalImpl?: typeof setInterval;
  clearIntervalImpl?: typeof clearInterval;
}

function prefersReducedMotion(): boolean {
  return (
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Type `text` into `el`. Returns a cancel function that stops an in-flight
 * animation. When motion is reduced, sets the text immediately and returns a
 * no-op canceller.
 */
export function typeWordmark(
  el: HTMLElement,
  text: string,
  options: BootOptions = {},
): () => void {
  const reduce = options.reducedMotion ?? prefersReducedMotion();
  if (reduce) {
    el.textContent = text;
    return () => {};
  }

  const setIntervalImpl = options.setIntervalImpl ?? setInterval;
  const clearIntervalImpl = options.clearIntervalImpl ?? clearInterval;
  const delay = options.charDelayMs ?? 90;

  el.textContent = "";
  el.classList.add("is-typing");
  let i = 0;
  const timer = setIntervalImpl(() => {
    i += 1;
    el.textContent = text.slice(0, i);
    if (i >= text.length) {
      clearIntervalImpl(timer);
      el.classList.remove("is-typing");
    }
  }, delay);

  return () => {
    clearIntervalImpl(timer);
    el.textContent = text;
    el.classList.remove("is-typing");
  };
}
