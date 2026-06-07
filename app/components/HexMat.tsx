"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  CELLS,
  Cell,
  GRID_ROWS,
  MAT_HEIGHT,
  MAT_WIDTH,
  SQRT3,
  findCellAt,
  hexVertices,
} from "@/app/lib/hexGrid";
import { PALETTE } from "@/app/lib/colors";
import { colorIndex } from "@/app/lib/colors";
import { DesignState } from "@/app/lib/designState";

const BEZEL_WIDTH = 0.9; // thickness (in hex-size units) of the black bezel
const MAT_PADDING = BEZEL_WIDTH + 0.4; // viewBox padding so the bezel + a little air fits
const EDGE_BLACK = PALETTE[colorIndex("black")].hex;

/**
 * Build the SVG path that fills the small triangular wedges along the
 * mat's left and right edges. Between every pair of vertically adjacent
 * col-0 (or col-32) hexes, the slanted edges of the two hexes meet at a
 * "valley" 0.5 units in from the mat edge, leaving a tiny triangle of
 * empty mat behind. We paint those triangles black so the border is
 * continuous on all four sides.
 */
function buildSideWedgePath(side: "left" | "right"): string {
  const xEdge = side === "left" ? 0 : MAT_WIDTH;
  const xValley = side === "left" ? 0.5 : MAT_WIDTH - 0.5;
  const parts: string[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const y0 = SQRT3 * r;
    const y1 = SQRT3 * (r + 1);
    const yMid = SQRT3 * (r + 0.5);
    parts.push(
      `M ${xEdge} ${y0.toFixed(4)} L ${xValley} ${yMid.toFixed(4)} L ${xEdge} ${y1.toFixed(4)} Z`,
    );
  }
  return parts.join(" ");
}

interface HexMatProps {
  design: DesignState;
  /** Cell indices that should render with a soft "preview" overlay. */
  previewIndexes?: Set<number>;
  /** Color used for the preview overlay (palette index). */
  previewColorIndex?: number;
  /** Called when the pointer moves over a cell while a button is pressed (or just hovers). */
  onPointer?: (
    cell: Cell | null,
    e: PointerEvent,
    info: { isDown: boolean; localX: number; localY: number },
  ) => void;
  /** Called once when the pointer goes down over the mat. */
  onPointerDown?: (cell: Cell | null, info: { localX: number; localY: number }) => void;
  /** Called when the pointer is released. */
  onPointerUp?: (cell: Cell | null, info: { localX: number; localY: number }) => void;
  /** Optional class for the outer wrapper. */
  className?: string;
  /** Optional inline style override for the SVG element. */
  style?: React.CSSProperties;
}

export default function HexMat({
  design,
  previewIndexes,
  previewColorIndex,
  onPointer,
  onPointerDown,
  onPointerUp,
  className,
  style,
}: HexMatProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isDown = useRef(false);

  // Precompute SVG paths for each cell shape since they don't change.
  const cellPaths = useMemo(() => {
    return CELLS.map((cell) => {
      const verts = hexVertices(cell, 1);
      let d = `M ${verts[0][0].toFixed(4)} ${verts[0][1].toFixed(4)}`;
      for (let i = 1; i < verts.length; i++) {
        d += ` L ${verts[i][0].toFixed(4)} ${verts[i][1].toFixed(4)}`;
      }
      d += " Z";
      return d;
    });
  }, []);

  const viewBox = `${-MAT_PADDING} ${-MAT_PADDING} ${MAT_WIDTH + 2 * MAT_PADDING} ${
    MAT_HEIGHT + 2 * MAT_PADDING
  }`;

  // Convert client (pixel) coords to mat (design) coords.
  const toLocal = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const { x, y } = toLocal(e.clientX, e.clientY);
      const cell = findCellAt(x, y) ?? null;
      onPointer?.(cell, e.nativeEvent, {
        isDown: isDown.current,
        localX: x,
        localY: y,
      });
    },
    [onPointer, toLocal],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      isDown.current = true;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const { x, y } = toLocal(e.clientX, e.clientY);
      const cell = findCellAt(x, y) ?? null;
      onPointerDown?.(cell, { localX: x, localY: y });
      onPointer?.(cell, e.nativeEvent, { isDown: true, localX: x, localY: y });
    },
    [onPointer, onPointerDown, toLocal],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      isDown.current = false;
      const { x, y } = toLocal(e.clientX, e.clientY);
      const cell = findCellAt(x, y) ?? null;
      onPointerUp?.(cell, { localX: x, localY: y });
    },
    [onPointerUp, toLocal],
  );

  return (
    <div className={className}>
      <svg
        ref={svgRef}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full select-none touch-none"
        style={style}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Black bezel: a thick frame around the mat for contrast. */}
        <rect
          x={-BEZEL_WIDTH}
          y={-BEZEL_WIDTH}
          width={MAT_WIDTH + 2 * BEZEL_WIDTH}
          height={MAT_HEIGHT + 2 * BEZEL_WIDTH}
          rx={0.55}
          ry={0.55}
          fill={EDGE_BLACK}
        />
        {/* Subtle inner highlight along the inside of the bezel. */}
        <rect
          x={-0.04}
          y={-0.04}
          width={MAT_WIDTH + 0.08}
          height={MAT_HEIGHT + 0.08}
          rx={0.18}
          ry={0.18}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={0.08}
        />
        {/* Mat backdrop: warm off-white surface inside the bezel. */}
        <rect
          x={0}
          y={0}
          width={MAT_WIDTH}
          height={MAT_HEIGHT}
          fill="#f3ece0"
        />

        {CELLS.map((cell, i) => {
          const colorIdx = design[cell.index];
          const fill = PALETTE[colorIdx]?.hex ?? PALETTE[0].hex;
          return (
            <path
              key={cell.index}
              d={cellPaths[i]}
              fill={fill}
              stroke="rgba(0,0,0,0.22)"
              strokeWidth={0.04}
              strokeLinejoin="round"
            />
          );
        })}

        {/* Locked black wedges that cap the left and right edges so the
            woven border is continuous around the whole mat. */}
        <path
          d={buildSideWedgePath("left")}
          fill={EDGE_BLACK}
          stroke="rgba(0,0,0,0.22)"
          strokeWidth={0.04}
          strokeLinejoin="round"
          pointerEvents="none"
        />
        <path
          d={buildSideWedgePath("right")}
          fill={EDGE_BLACK}
          stroke="rgba(0,0,0,0.22)"
          strokeWidth={0.04}
          strokeLinejoin="round"
          pointerEvents="none"
        />

        {/* Preview overlay: soft tint on cells the active tool will affect */}
        {previewIndexes && previewIndexes.size > 0 && (
          <g pointerEvents="none">
            {Array.from(previewIndexes).map((idx) => {
              const cell = CELLS[idx];
              if (!cell) return null;
              const previewFill =
                previewColorIndex !== undefined
                  ? PALETTE[previewColorIndex]?.hex
                  : "#000";
              return (
                <path
                  key={`prev-${idx}`}
                  d={cellPaths[idx]}
                  fill={previewFill}
                  fillOpacity={0.55}
                  stroke="rgba(0,0,0,0.55)"
                  strokeWidth={0.06}
                  strokeDasharray="0.08 0.08"
                />
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
}

// suppress unused import warning for SQRT3 (kept for downstream consumers)
export const _UNUSED = SQRT3;
