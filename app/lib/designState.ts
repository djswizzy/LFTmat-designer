// Centralized design state. Stored as a Uint8Array of color indices into
// the PALETTE (one byte per cell). This is small (~600 bytes) and trivially
// serializable to JSON or localStorage.

import { CELL_COUNT, CELLS, Cell, isEdgeKind, neighborsOf } from "./hexGrid";
import { DEFAULT_COLOR_ID, PALETTE, colorIndex } from "./colors";

export type DesignState = Uint8Array;

/** Color id that the immutable edge tiles use. */
export const EDGE_COLOR_ID = "black";

/**
 * Force every edge half-tile to the locked black color. Used by newDesign
 * and after deserializing so edge tiles can never drift out of sync.
 */
export function lockEdgeTiles(d: DesignState): void {
  const black = colorIndex(EDGE_COLOR_ID);
  for (const cell of CELLS) {
    if (isEdgeKind(cell.kind)) d[cell.index] = black;
  }
}

export function newDesign(): DesignState {
  const arr = new Uint8Array(CELL_COUNT);
  arr.fill(colorIndex(DEFAULT_COLOR_ID));
  lockEdgeTiles(arr);
  return arr;
}

export function cloneDesign(d: DesignState): DesignState {
  return new Uint8Array(d);
}

/** True if a cell is paintable (i.e. a full hex, not a locked edge tile). */
export function isPaintable(cell: Cell): boolean {
  return !isEdgeKind(cell.kind);
}

/**
 * Bucket-fill: given a starting cell, replace all connected paintable
 * cells of the same color with the new color. Edge half-tiles act as a
 * boundary — flood fill never crosses or recolors them.
 */
export function bucketFill(
  d: DesignState,
  start: Cell,
  newColorIndex: number,
): DesignState {
  if (!isPaintable(start)) return d;
  const target = d[start.index];
  if (target === newColorIndex) return d;
  const next = cloneDesign(d);
  const stack: Cell[] = [start];
  while (stack.length) {
    const c = stack.pop()!;
    if (next[c.index] !== target) continue;
    if (!isPaintable(c)) continue;
    next[c.index] = newColorIndex;
    for (const n of neighborsOf(c)) {
      if (isPaintable(n) && next[n.index] === target) stack.push(n);
    }
  }
  return next;
}

// ----- Tile counts -----

export interface TileCount {
  colorIndex: number;
  full: number;
  half: number;
}

export function countTiles(d: DesignState): TileCount[] {
  const counts: TileCount[] = PALETTE.map((_, i) => ({
    colorIndex: i,
    full: 0,
    half: 0,
  }));
  for (const cell of CELLS) {
    const ci = d[cell.index];
    if (cell.kind === "full") counts[ci].full++;
    else counts[ci].half++;
  }
  return counts;
}

// ----- Serialization -----

export function serializeDesign(d: DesignState): string {
  // Base64-ish: encode each byte as 2 hex chars, then run-length compress
  // is overkill for ~600 bytes. Just hex-encode.
  let out = "";
  for (const v of d) out += v.toString(16).padStart(2, "0");
  return out;
}

export function deserializeDesign(s: string): DesignState | null {
  if (s.length !== CELL_COUNT * 2) return null;
  const arr = new Uint8Array(CELL_COUNT);
  for (let i = 0; i < CELL_COUNT; i++) {
    const v = parseInt(s.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(v) || v >= PALETTE.length) return null;
    arr[i] = v;
  }
  // Migration / safety: any older save might have edge tiles in the wrong
  // color (e.g. white from before edge-locking was added). Force them.
  lockEdgeTiles(arr);
  return arr;
}
