// Matches the sizes declared under manifest.json's top-level "icons" key
// (public/icon/16.png..128.png) — action.default_icon isn't set separately in
// wxt.config.ts, so Chrome falls back to this same set for the toolbar icon.
const ICON_SIZES = [16, 32, 48, 96, 128] as const;

// Decoded source icons, reused for every recomposition — the service worker
// has no <canvas>/document, but OffscreenCanvas/fetch/createImageBitmap are
// all available in its global scope.
const baseImageCache = new Map<number, ImageBitmap>();

// Keyed by dot color (or 'none') — not a correctness dependency, just avoids
// redecoding/redrawing the same handful of states repeatedly. Safe to lose:
// MV3 service workers are ephemeral and can be evicted any time, wiping this.
const composedCache = new Map<string, Record<number, ImageData>>();

async function loadBaseIcon(size: number): Promise<ImageBitmap> {
  const cached = baseImageCache.get(size);
  if (cached) return cached;

  const blob = await (await fetch(chrome.runtime.getURL(`icon/${size}.png`))).blob();
  const bitmap = await createImageBitmap(blob);
  baseImageCache.set(size, bitmap);
  return bitmap;
}

async function composeIcon(size: number, dotColor: string | null): Promise<ImageData> {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('OffscreenCanvas 2d context unavailable');

  ctx.drawImage(await loadBaseIcon(size), 0, 0, size, size);

  if (dotColor) {
    const radius = Math.max(2, Math.round(size * 0.22));
    const cx = size - radius - Math.round(size * 0.06);
    const cy = size - radius - Math.round(size * 0.06);

    // White ring first so the dot reads clearly against whatever color the
    // base icon artwork happens to have underneath it.
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();
  }

  return ctx.getImageData(0, 0, size, size);
}

// dotColor: null returns the plain, unmodified icon at every size — callers
// must still pass this through to chrome.action.setIcon rather than skipping
// the call, since a per-tab setIcon override persists until explicitly reset
// (see render-badge-for-state.ts).
export async function iconImageDataFor(
  dotColor: string | null,
): Promise<Record<number, ImageData>> {
  const key = dotColor ?? 'none';
  const cached = composedCache.get(key);
  if (cached) return cached;

  const entries = await Promise.all(
    ICON_SIZES.map(async (size) => [size, await composeIcon(size, dotColor)] as const),
  );
  const result = Object.fromEntries(entries);
  composedCache.set(key, result);
  return result;
}
