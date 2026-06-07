// Hex grid math for the Letterfolk Tile Mat.
//
// The mat is a rectangle filled with flat-top hexagons. The math:
//   - Hex "size" s = corner-to-center distance == edge length.
//   - Flat-top hex width  = 2s, height = sqrt(3) * s.
//   - Adjacent columns step horizontally by 1.5s and offset vertically by
//     sqrt(3)/2 * s (half a hex height).
//
// Layout per the physical Tile Mat:
//   - 33 columns of full hexagons.
//   - Even columns (0, 2, ..., 32) hold 16 full hexes plus a top-half and
//     bottom-half tile flush with the top and bottom edges. The leftmost
//     and rightmost columns are even, so each shows 16 full hexes (with
//     halves on the ends). 18 cells total per even column.
//   - Odd columns (1, 3, ..., 31) hold 17 full hexes whose flat top and
//     bottom edges sit on the mat boundary (no halves). 17 cells total.
//
// On the physical Letterfolk mat the top and bottom half tiles on every
// even column are part of the woven black border and aren't user-
// replaceable. The design tool reflects this by locking them to black.
//
// For an 18" x 30" Standard mat: 32 column steps * 1.5s + 2s = 50s = 30"
// gives s = 0.6", and 17 * sqrt(3) * 0.6" ~= 17.66" ~ 18".

export const GRID_COLS = 33;
export const GRID_ROWS = 17; // visual rows; even cols carry an extra half-row at the top

export const SQRT3 = Math.sqrt(3);

export type CellKind = "full" | "top-half" | "bottom-half";

/** True if the cell is a fixed/immutable edge tile. */
export function isEdgeKind(kind: CellKind): boolean {
  return kind !== "full";
}

export interface Cell {
  /** Column index, 0 .. GRID_COLS-1. */
  col: number;
  /**
   * Row index. For even columns this is 0..GRID_ROWS-1 (17 cells).
   * For odd columns this is 0..GRID_ROWS (18 cells), with row 0 = top-half
   * and row GRID_ROWS = bottom-half.
   */
  row: number;
  kind: CellKind;
  /** Center x in design units (where s = 1). */
  cx: number;
  /** Center y in design units (where s = 1). */
  cy: number;
  /** Linear index into the cell array. */
  index: number;
}

/** Total mat width when hex size s = 1. */
export const MAT_WIDTH = 1.5 * (GRID_COLS - 1) + 2; // 50 when COLS=33
/** Total mat height when hex size s = 1. */
export const MAT_HEIGHT = GRID_ROWS * SQRT3; // ~29.44 when ROWS=17

/**
 * Build the canonical list of cells for the mat.
 *
 *   - Even columns (0, 2, ..., 32) hold 18 cells each: a top-half at
 *     cy=0, 16 fulls at cy = sqrt(3)·r for r=1..16, and a bottom-half
 *     at cy=17·sqrt(3) (= MAT_HEIGHT).
 *   - Odd columns (1, 3, ..., 31) hold 17 fulls at
 *     cy = sqrt(3)·(r + 0.5) for r = 0..16 — flush with both edges.
 */
export function buildCells(): Cell[] {
  const cells: Cell[] = [];
  let index = 0;
  for (let col = 0; col < GRID_COLS; col++) {
    const cx = 1 + 1.5 * col; // col 0 cx=1, col 32 cx=49
    if (col % 2 === 0) {
      // Even column: 1 top-half + 16 fulls + 1 bottom-half.
      for (let row = 0; row <= GRID_ROWS; row++) {
        let kind: CellKind = "full";
        if (row === 0) kind = "top-half";
        else if (row === GRID_ROWS) kind = "bottom-half";
        cells.push({
          col,
          row,
          kind,
          cx,
          cy: SQRT3 * row,
          index: index++,
        });
      }
    } else {
      // Odd column: 17 full hexes, flush with the mat's top and bottom.
      for (let row = 0; row < GRID_ROWS; row++) {
        cells.push({
          col,
          row,
          kind: "full",
          cx,
          cy: SQRT3 * (row + 0.5),
          index: index++,
        });
      }
    }
  }
  return cells;
}

export const CELLS = buildCells();
export const CELL_COUNT = CELLS.length;

/** Build a (col,row) -> index lookup. */
const cellIndexLookup: Map<string, number> = (() => {
  const m = new Map<string, number>();
  for (const c of CELLS) m.set(`${c.col},${c.row}`, c.index);
  return m;
})();

export function cellAt(col: number, row: number): Cell | undefined {
  const idx = cellIndexLookup.get(`${col},${row}`);
  return idx === undefined ? undefined : CELLS[idx];
}

/**
 * Vertices of a flat-top hexagon centered at (cx, cy) with size s, optionally
 * clipped to top-half or bottom-half. Returned as an array of [x, y] pairs.
 *
 *   Flat-top vertex offsets (size s):
 *     ( s,            0)
 *     ( s/2,   s*√3/2)
 *     (-s/2,   s*√3/2)
 *     (-s,            0)
 *     (-s/2,  -s*√3/2)
 *     ( s/2,  -s*√3/2)
 */
export function hexVertices(cell: Cell, s: number): [number, number][] {
  const { cx, cy, kind } = cell;
  const h = (SQRT3 / 2) * s; // half-height
  const full: [number, number][] = [
    [cx + s, cy],
    [cx + s / 2, cy + h],
    [cx - s / 2, cy + h],
    [cx - s, cy],
    [cx - s / 2, cy - h],
    [cx + s / 2, cy - h],
  ];
  if (kind === "full") return full;

  // For half hexes the cell center is on the boundary edge, so we trim the
  // half that would lie outside the mat. The mat top edge is at y=0 and
  // bottom edge at y=GRID_ROWS*sqrt(3)*s in design units; in our local
  // (cx,cy) coordinates, half cells have cy exactly on those edges.
  if (kind === "top-half") {
    // Cell center sits on the mat's TOP edge (cy = 0). Only the bottom
    // half of the hex is visible (y >= cy).
    return [
      [cx + s, cy],
      [cx + s / 2, cy + h],
      [cx - s / 2, cy + h],
      [cx - s, cy],
    ];
  }
  // bottom-half: cell center sits on the mat's BOTTOM edge. Only the top
  // half of the hex is visible (y <= cy).
  return [
    [cx + s, cy],
    [cx - s, cy],
    [cx - s / 2, cy - h],
    [cx + s / 2, cy - h],
  ];
}

/**
 * Find the cell whose center is closest to (px, py) in design units (s=1
 * coordinates). Used for click hit-testing and for image/shape rasterization.
 *
 * Optimized: we know the hex grid is regular, so we narrow to a few candidate
 * columns and rows.
 */
export function findCellAt(px: number, py: number): Cell | undefined {
  // Approximate column by reversing cx = 1 + 1.5*col.
  const approxCol = (px - 1) / 1.5;
  const colCandidates = [
    Math.floor(approxCol) - 1,
    Math.floor(approxCol),
    Math.ceil(approxCol),
    Math.ceil(approxCol) + 1,
  ];
  let best: Cell | undefined;
  let bestD = Infinity;
  for (const col of colCandidates) {
    if (col < 0 || col >= GRID_COLS) continue;
    // Even col: cy = sqrt(3) * row.   Odd col: cy = sqrt(3) * (row + 0.5).
    const baseRow = col % 2 === 0 ? py / SQRT3 : py / SQRT3 - 0.5;
    const rowCandidates = [
      Math.floor(baseRow) - 1,
      Math.floor(baseRow),
      Math.ceil(baseRow),
      Math.ceil(baseRow) + 1,
    ];
    for (const row of rowCandidates) {
      const cell = cellAt(col, row);
      if (!cell) continue;
      const dx = cell.cx - px;
      const dy = cell.cy - py;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = cell;
      }
    }
  }
  return best;
}

/**
 * Six neighbors for the flat-top hex grid. Offsets depend on column parity
 * because even columns are flush with the mat's top/bottom edges (cy =
 * sqrt(3)*r) and odd columns are inset by half a hex (cy = sqrt(3)*(r+0.5)).
 *
 * Even col neighbors:
 *   same col:  (c, r±1)
 *   col ± 1:   (c±1, r-1), (c±1, r)
 *
 * Odd col neighbors:
 *   same col:  (c, r±1)
 *   col ± 1:   (c±1, r), (c±1, r+1)
 */
export function neighborsOf(cell: Cell): Cell[] {
  const out: Cell[] = [];
  const offsets =
    cell.col % 2 === 0
      ? [
          [0, -1],
          [0, 1],
          [-1, -1],
          [-1, 0],
          [1, -1],
          [1, 0],
        ]
      : [
          [0, -1],
          [0, 1],
          [-1, 0],
          [-1, 1],
          [1, 0],
          [1, 1],
        ];
  for (const [dc, dr] of offsets) {
    const n = cellAt(cell.col + dc, cell.row + dr);
    if (n) out.push(n);
  }
  return out;
}
