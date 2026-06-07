// Snap an arbitrary image to the hex grid and the active palette.

import {
  CELLS,
  Cell,
  MAT_HEIGHT,
  MAT_WIDTH,
  SQRT3,
} from "./hexGrid";
import { nearestColorIndex } from "./colors";

export type FitMode = "contain" | "cover" | "stretch";

export interface SampleOptions {
  /** Subset of palette indices the image is allowed to use (e.g. selected colors). */
  allowedColors?: number[];
  /** Rotation (degrees) applied to the source image before sampling. */
  rotate?: number;
  /** Flip horizontally / vertically. */
  flipX?: boolean;
  flipY?: boolean;
  /** Fit mode for placing the image inside the mat rectangle. */
  fit?: FitMode;
  /** Treat fully transparent pixels as "skip" so existing tiles aren't overwritten. */
  skipTransparent?: boolean;
}

/**
 * For each cell on the mat, sample the corresponding pixel from the image
 * (with the given fit / transform), then quantize to the nearest palette
 * color. Returns a map of cell.index -> palette index.
 */
export function sampleImageToCells(
  img: HTMLImageElement,
  opts: SampleOptions = {},
): Map<number, number> {
  const {
    allowedColors,
    rotate = 0,
    flipX = false,
    flipY = false,
    fit = "contain",
    skipTransparent = true,
  } = opts;

  // We rasterize the image (with transform) into an offscreen canvas of the
  // mat aspect ratio so each hex maps neatly to a pixel region.
  const renderW = 800;
  const renderH = Math.round((renderW * MAT_HEIGHT) / MAT_WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = renderW;
  canvas.height = renderH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  // Background = transparent so skipTransparent works on letterboxed areas.
  ctx.clearRect(0, 0, renderW, renderH);
  ctx.save();
  ctx.translate(renderW / 2, renderH / 2);
  if (rotate) ctx.rotate((rotate * Math.PI) / 180);
  if (flipX) ctx.scale(-1, 1);
  if (flipY) ctx.scale(1, -1);

  let dw = renderW;
  let dh = renderH;
  if (fit !== "stretch") {
    const matAR = renderW / renderH;
    const imgAR = img.width / img.height;
    if (fit === "contain") {
      if (imgAR > matAR) {
        dw = renderW;
        dh = renderW / imgAR;
      } else {
        dh = renderH;
        dw = renderH * imgAR;
      }
    } else {
      // cover
      if (imgAR > matAR) {
        dh = renderH;
        dw = renderH * imgAR;
      } else {
        dw = renderW;
        dh = renderW / imgAR;
      }
    }
  }
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();

  const data = ctx.getImageData(0, 0, renderW, renderH).data;
  const pxPerUnitX = renderW / MAT_WIDTH;
  const pxPerUnitY = renderH / MAT_HEIGHT;

  const out = new Map<number, number>();
  for (const cell of CELLS) {
    // Average the pixels in a small disk around the cell center so single
    // noisy pixels don't dominate.
    const px = cell.cx * pxPerUnitX;
    const py = cell.cy * pxPerUnitY;
    const radius = Math.max(2, Math.round(pxPerUnitX * 0.4));
    let r = 0,
      g = 0,
      b = 0,
      a = 0,
      n = 0;
    const xMin = Math.max(0, Math.floor(px - radius));
    const xMax = Math.min(renderW - 1, Math.ceil(px + radius));
    const yMin = Math.max(0, Math.floor(py - radius));
    const yMax = Math.min(renderH - 1, Math.ceil(py + radius));
    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        const dx = x - px;
        const dy = y - py;
        if (dx * dx + dy * dy > radius * radius) continue;
        const idx = (y * renderW + x) * 4;
        const alpha = data[idx + 3];
        if (alpha === 0) continue;
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        a += alpha;
        n++;
      }
    }
    if (n === 0) continue; // transparent area
    if (skipTransparent && a / n < 32) continue;
    const ar = r / n;
    const ag = g / n;
    const ab = b / n;
    const ci = nearestColorIndex(ar, ag, ab, allowedColors);
    out.set(cell.index, ci);
  }
  return out;
}

/** Useful for shape-import-by-stamping later. */
export function applySampleToDesign(
  design: Uint8Array,
  samples: Map<number, number>,
): Uint8Array {
  const next = new Uint8Array(design);
  for (const [idx, ci] of samples) next[idx] = ci;
  return next;
}

/** Touch the SQRT3 import so build doesn't tree-shake the file in unused-export checks. */
export const __KEEP_SQRT3 = SQRT3;
export type _UnusedCellMarker = Cell; // keep type ref for potential future use
