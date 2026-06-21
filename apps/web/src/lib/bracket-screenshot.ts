const BRACKET_CSS_VARS = [
  "--bracket-card-bg",
  "--bracket-card-border",
  "--bracket-card-border-finished",
  "--bracket-card-border-active",
  "--bracket-card-border-active-glow",
  "--bracket-card-bg-active",
  "--bracket-card-border-hover",
  "--bracket-card-shadow",
  "--bracket-row-border",
  "--bracket-row-text",
  "--bracket-row-muted",
  "--bracket-row-winner-bg",
  "--bracket-row-winner-text",
  "--bracket-row-loser-text",
  "--bracket-bye-text",
  "--bracket-bye-done-text",
  "--bracket-meta-text",
  "--bracket-round-label",
  "--bracket-line",
  "--bracket-canvas-bg",
  "--bracket-canvas-border",
  "--bracket-edge-loss",
] as const;

const MAX_CANVAS_DIM = 16384;
const MAX_CANVAS_PIXELS = 16_000_000;

const CAPTURE_LAYOUT_FIX_CSS = `
[data-bracket-screenshot-root] .llb-bracket-match,
[data-bracket-screenshot-root] .bracket-match-card {
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}
[data-bracket-screenshot-root] .llb-bracket-match > *,
[data-bracket-screenshot-root] .bracket-match-card > * {
  flex-shrink: 0 !important;
  box-sizing: border-box !important;
}
[data-bracket-screenshot-root] .llb-bracket-match .grid.grid-cols-2 {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
}
`;

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG не создан"))),
      "image/png",
    );
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Не удалось загрузить превью"));
    img.src = url;
  });
}

function bracketCanvasBg(): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--bracket-canvas-bg")
    .trim();
  return raw || "#f4f4f5";
}

function readCaptureSize(el: HTMLElement): { width: number; height: number } {
  const styleWidth = Number.parseInt(el.style.width, 10);
  const styleHeight = Number.parseInt(el.style.height, 10);
  const width = styleWidth || el.scrollWidth || el.offsetWidth;
  const height = styleHeight || el.scrollHeight || el.offsetHeight;
  return { width, height };
}

function computeCaptureScale(width: number, height: number): number {
  let scale = 2;
  while (scale >= 0.5) {
    const w = width * scale;
    const h = height * scale;
    if (w <= MAX_CANVAS_DIM && h <= MAX_CANVAS_DIM && w * h <= MAX_CANVAS_PIXELS) {
      return scale;
    }
    scale -= 0.25;
  }
  return 0.5;
}

function copyBracketThemeStyles(target: HTMLElement): void {
  const root = document.documentElement;
  const rootStyle = getComputedStyle(root);
  for (const name of BRACKET_CSS_VARS) {
    target.style.setProperty(name, rootStyle.getPropertyValue(name));
  }
  if (root.classList.contains("light")) {
    target.classList.add("light");
  }
}

function resolveVarInAttribute(value: string | null): string | null {
  if (!value || !value.includes("var(")) return value;
  const match = value.match(/var\(\s*(--[^,)]+)/);
  if (!match) return value;
  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue(match[1]!)
    .trim();
  return resolved || value;
}

function fixSvgAndColors(root: HTMLElement): void {
  root.querySelectorAll("svg [stroke], svg [fill]").forEach((node) => {
    if (!(node instanceof SVGElement)) return;

    const stroke = node.getAttribute("stroke");
    if (stroke) {
      node.setAttribute("stroke", resolveVarInAttribute(stroke) ?? stroke);
    }
    const fill = node.getAttribute("fill");
    if (fill && fill !== "none") {
      node.setAttribute("fill", resolveVarInAttribute(fill) ?? fill);
    }
  });

  root.querySelectorAll<HTMLElement>("[style]").forEach((node) => {
    const style = node.getAttribute("style");
    if (!style?.includes("var(")) return;
    let next = style;
    for (const name of BRACKET_CSS_VARS) {
      if (!next.includes(name)) continue;
      const resolved = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
      if (resolved) {
        next = next.replaceAll(`var(${name})`, resolved);
      }
    }
    node.setAttribute("style", next);
  });
}

function mountCaptureShell(
  source: HTMLElement,
  width: number,
  height: number,
): {
  restore: () => void;
  styleEl: HTMLStyleElement;
} {
  const parent = source.parentElement;
  const nextSibling = source.nextSibling;
  const pad = 24;
  const bg = bracketCanvasBg();

  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-bracket-screenshot-root", "true");
  wrapper.className = "admin-app bracket-screenshot-root";
  wrapper.style.cssText = [
    "position:fixed",
    "left:-100000px",
    "top:0",
    "overflow:visible",
    "z-index:-1",
    `width:${width + pad * 2}px`,
    `height:${height + pad * 2}px`,
    `padding:${pad}px`,
    `background:${bg}`,
    "box-sizing:border-box",
  ].join(";");
  copyBracketThemeStyles(wrapper);

  const styleEl = document.createElement("style");
  styleEl.textContent = CAPTURE_LAYOUT_FIX_CSS;
  wrapper.appendChild(styleEl);

  source.style.margin = "0";
  wrapper.appendChild(source);
  document.body.appendChild(wrapper);

  return {
    styleEl,
    restore: () => {
      if (parent) {
        parent.insertBefore(source, nextSibling);
      }
      wrapper.remove();
    },
  };
}

async function waitForBracketCaptureElement(maxMs = 4000): Promise<HTMLElement> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const el = document.querySelector("[data-bracket-capture]");
    if (el instanceof HTMLElement && el.offsetWidth > 0 && el.offsetHeight > 0) {
      return el;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Сетка не найдена — откройте вкладку «Сетка»");
}

async function captureElementToCanvas(source: HTMLElement): Promise<HTMLCanvasElement> {
  const { toCanvas } = await import("html-to-image");
  await document.fonts.ready;

  const bg = bracketCanvasBg();
  const { width, height } = readCaptureSize(source);
  const pixelRatio = computeCaptureScale(width, height);

  const { restore } = mountCaptureShell(source, width, height);

  try {
    fixSvgAndColors(source);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    return await toCanvas(source, {
      width,
      height,
      pixelRatio,
      backgroundColor: bg,
      cacheBust: true,
    });
  } finally {
    restore();
  }
}

async function composeWithTitle(
  source: HTMLCanvasElement,
  tournamentName: string,
): Promise<HTMLCanvasElement> {
  const pad = 28;
  const titleBand = 56;
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height + titleBand + pad;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступен");

  ctx.fillStyle = bracketCanvasBg();
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.fillStyle = "#18181b";
  const fontSize = Math.max(18, Math.min(36, Math.round(out.width * 0.018)));
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(tournamentName, pad, pad + titleBand / 2 - 4);
  ctx.drawImage(source, 0, titleBand + pad / 2);

  return out;
}

export function bracketScreenshotFilename(tournamentName: string): string {
  const slug = tournamentName
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${slug || "tournament"}-setka.png`;
}

/** PNG всей турнирной сетки (элемент `[data-bracket-capture]`). */
export async function captureBracketScreenshot(tournamentName: string): Promise<Blob> {
  const el = await waitForBracketCaptureElement();
  const inner = await captureElementToCanvas(el);
  const composed = await composeWithTitle(inner, tournamentName);
  return canvasToBlob(composed);
}

export function isMobileShareContext(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.maxTouchPoints > 1 && window.matchMedia("(pointer: coarse)").matches;
}

export async function copyScreenshotBlob(blob: Blob): Promise<boolean> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
    return false;
  }
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareBracketScreenshot(options: {
  blob: Blob;
  filename: string;
  tournamentName: string;
  tournamentUrl: string;
}): Promise<"shared" | "clipboard" | "download"> {
  // macOS/Windows: Web Share → Telegram часто отправляет только текст, не PNG.
  if (!isMobileShareContext()) {
    if (await copyScreenshotBlob(options.blob)) return "clipboard";
    downloadBlob(options.blob, options.filename);
    return "download";
  }

  const file = new File([options.blob], options.filename, {
    type: "image/png",
    lastModified: Date.now(),
  });

  if (typeof navigator.share === "function") {
    try {
      const filePayload: ShareData = { files: [file] };
      if (!navigator.canShare || navigator.canShare(filePayload)) {
        await navigator.share(filePayload);
        return "shared";
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
    }
  }

  if (await copyScreenshotBlob(options.blob)) return "clipboard";

  downloadBlob(options.blob, options.filename);
  return "download";
}

export async function loadImagePreview(blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    await loadImage(url);
    return url;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
