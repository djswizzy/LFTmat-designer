// Shape rasterization onto the hex grid.
//
// All shapes are defined in hex-grid design units (s = 1) by two anchor
// points and applied to the cells whose centers fall inside the shape.

import { CELLS, Cell } from "./hexGrid";

export type ShapeKind = "rectangle" | "ellipse" | "line";

export function cellsInRectangle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  filled: boolean,
): Cell[] {
  const x0 = Math.min(ax, bx);
  const x1 = Math.max(ax, bx);
  const y0 = Math.min(ay, by);
  const y1 = Math.max(ay, by);
  // Rectangle stroke thickness ≈ 1 hex (radius 1 in design units).
  const strokeR = 1.0;
  const out: Cell[] = [];
  for (const c of CELLS) {
    const inside =
      c.cx >= x0 && c.cx <= x1 && c.cy >= y0 && c.cy <= y1;
    if (!inside) continue;
    if (filled) {
      out.push(c);
    } else {
      const onEdge =
        c.cx - x0 < strokeR ||
        x1 - c.cx < strokeR ||
        c.cy - y0 < strokeR ||
        y1 - c.cy < strokeR;
      if (onEdge) out.push(c);
    }
  }
  return out;
}

export function cellsInEllipse(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  filled: boolean,
): Cell[] {
  const cx = (ax + bx) / 2;
  const cy = (ay + by) / 2;
  const rx = Math.max(0.5, Math.abs(bx - ax) / 2);
  const ry = Math.max(0.5, Math.abs(by - ay) / 2);
  const out: Cell[] = [];
  for (const c of CELLS) {
    const dx = (c.cx - cx) / rx;
    const dy = (c.cy - cy) / ry;
    const r = dx * dx + dy * dy;
    if (filled) {
      if (r <= 1) out.push(c);
    } else {
      // Ring approximately one tile wide.
      const ringInner = Math.max(
        0,
        1 - 1 / Math.min(rx, ry) - 0.4 / Math.min(rx, ry),
      );
      if (r <= 1 && r >= ringInner) out.push(c);
    }
  }
  return out;
}

export function cellsOnLine(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): Cell[] {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len === 0) return [];
  const nx = -dy / len;
  const ny = dx / len;
  // Width ~ 1 design unit (about one tile across).
  const halfWidth = 0.7;
  const out: Cell[] = [];
  for (const c of CELLS) {
    // Project (cx,cy) onto line, ensure within segment and within halfWidth.
    const px = c.cx - ax;
    const py = c.cy - ay;
    const t = (px * dx + py * dy) / (len * len); // 0..1 along segment
    if (t < 0 || t > 1) continue;
    const dist = Math.abs(px * nx + py * ny);
    if (dist <= halfWidth) out.push(c);
  }
  return out;
}
