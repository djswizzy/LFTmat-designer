"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import HexMat from "./HexMat";
import Toolbar from "./Toolbar";
import ColorPalette from "./ColorPalette";
import TileCountPanel from "./TileCount";
import { Tool } from "./tools";
import {
  bucketFill,
  cloneDesign,
  deserializeDesign,
  isPaintable,
  newDesign,
  serializeDesign,
} from "@/app/lib/designState";
import {
  CELLS,
  Cell,
  MAT_HEIGHT,
  MAT_WIDTH,
  cellAt,
  hexVertices,
} from "@/app/lib/hexGrid";
import { DEFAULT_COLOR_ID, PALETTE, colorIndex } from "@/app/lib/colors";
import { layoutText } from "@/app/lib/pixelFont";
import {
  cellsInEllipse,
  cellsInRectangle,
  cellsOnLine,
} from "@/app/lib/shapes";
import { sampleImageToCells } from "@/app/lib/imageImport";

const STORAGE_KEY = "tilemat-designer:design-v1";
const HISTORY_LIMIT = 60;

export default function Designer() {
  // ----- core state -----
  const [design, setDesign] = useState(() => newDesign());
  const [tool, setTool] = useState<Tool>("pencil");
  const [colorIdx, setColorIdx] = useState<number>(
    colorIndex("black"),
  );
  const [shapeFilled, setShapeFilled] = useState(true);

  // ----- text tool state -----
  const [text, setText] = useState("HELLO");
  const [textKerning, setTextKerning] = useState(1);
  const [textScale, setTextScale] = useState(1);

  // ----- image tool state -----
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [imageFit, setImageFit] = useState<"contain" | "cover" | "stretch">(
    "contain",
  );
  const [imageRotate, setImageRotate] = useState(0);
  const [imageFlipX, setImageFlipX] = useState(false);
  const [imageFlipY, setImageFlipY] = useState(false);
  const [restrictPalette, setRestrictPalette] = useState(false);
  const [allowedColors, setAllowedColors] = useState<Set<number>>(
    () => new Set(PALETTE.map((_, i) => i)),
  );

  // ----- transient pointer state -----
  const [cursorCell, setCursorCell] = useState<Cell | null>(null);
  const [dragStart, setDragStart] = useState<Cell | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Cell | null>(null);

  // ----- undo / redo stacks -----
  const historyRef = useRef<Uint8Array[]>([]);
  const redoRef = useRef<Uint8Array[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushHistory = useCallback((current: Uint8Array) => {
    historyRef.current.push(cloneDesign(current));
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    redoRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (!historyRef.current.length) return;
    const prev = historyRef.current.pop()!;
    setDesign((d) => {
      redoRef.current.push(cloneDesign(d));
      setCanRedo(true);
      return prev;
    });
    setCanUndo(historyRef.current.length > 0);
  }, []);

  const redo = useCallback(() => {
    if (!redoRef.current.length) return;
    const next = redoRef.current.pop()!;
    setDesign((d) => {
      historyRef.current.push(cloneDesign(d));
      setCanUndo(true);
      return next;
    });
    setCanRedo(redoRef.current.length > 0);
  }, []);

  // ----- persistence -----
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const restored = deserializeDesign(saved);
      if (restored) setDesign(restored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, serializeDesign(design));
    }, 250);
    return () => clearTimeout(t);
  }, [design]);

  // ----- preview cells (shown on top of mat) -----
  const preview = useMemo<{
    indexes: Set<number>;
    color: number;
  } | null>(() => {
    if (!cursorCell && !dragCurrent) return null;
    const eraseColor = colorIndex(DEFAULT_COLOR_ID);
    switch (tool) {
      case "pencil":
        if (!cursorCell || !isPaintable(cursorCell)) return null;
        return { indexes: new Set([cursorCell.index]), color: colorIdx };
      case "eraser":
        if (!cursorCell || !isPaintable(cursorCell)) return null;
        return { indexes: new Set([cursorCell.index]), color: eraseColor };
      case "bucket":
        return null;
      case "text": {
        if (!text || !cursorCell) return null;
        const all = textCellIndexes(text, textKerning, textScale, cursorCell);
        const paintable = new Set<number>();
        for (const i of all) {
          if (isPaintable(CELLS[i])) paintable.add(i);
        }
        return { indexes: paintable, color: colorIdx };
      }
      case "rectangle":
      case "ellipse":
      case "line": {
        const a = dragStart ?? cursorCell;
        const b = dragCurrent ?? cursorCell;
        if (!a || !b) return null;
        const cells = computeShapeCells(
          tool,
          a.cx,
          a.cy,
          b.cx,
          b.cy,
          shapeFilled,
        ).filter(isPaintable);
        return { indexes: new Set(cells.map((c) => c.index)), color: colorIdx };
      }
      case "image":
        return null;
    }
  }, [
    tool,
    cursorCell,
    colorIdx,
    text,
    textKerning,
    textScale,
    dragStart,
    dragCurrent,
    shapeFilled,
  ]);

  // ----- pointer handlers -----
  const handlePointerDown = useCallback(
    (cell: Cell | null) => {
      if (!cell) return;
      switch (tool) {
        case "pencil": {
          if (!isPaintable(cell)) return;
          pushHistory(design);
          setDesign((d) => {
            const next = cloneDesign(d);
            next[cell.index] = colorIdx;
            return next;
          });
          break;
        }
        case "eraser": {
          if (!isPaintable(cell)) return;
          pushHistory(design);
          setDesign((d) => {
            const next = cloneDesign(d);
            next[cell.index] = colorIndex(DEFAULT_COLOR_ID);
            return next;
          });
          break;
        }
        case "bucket": {
          if (!isPaintable(cell)) return;
          pushHistory(design);
          setDesign((d) => bucketFill(d, cell, colorIdx));
          break;
        }
        case "text": {
          if (!text) return;
          pushHistory(design);
          const indexes = textCellIndexes(text, textKerning, textScale, cell);
          setDesign((d) => {
            const next = cloneDesign(d);
            for (const i of indexes) {
              if (isPaintable(CELLS[i])) next[i] = colorIdx;
            }
            return next;
          });
          break;
        }
        case "rectangle":
        case "ellipse":
        case "line":
          setDragStart(cell);
          setDragCurrent(cell);
          break;
        case "image":
          // image is applied via dedicated button, not click
          break;
      }
    },
    [tool, colorIdx, design, pushHistory, text, textKerning, textScale],
  );

  const handlePointer = useCallback(
    (
      cell: Cell | null,
      _e: PointerEvent,
      info: { isDown: boolean; localX: number; localY: number },
    ) => {
      setCursorCell(cell);
      if (info.isDown) {
        if ((tool === "pencil" || tool === "eraser") && cell && isPaintable(cell)) {
          const paintColor = tool === "pencil" ? colorIdx : colorIndex(DEFAULT_COLOR_ID);
          setDesign((d) => {
            if (d[cell.index] === paintColor) return d;
            const next = cloneDesign(d);
            next[cell.index] = paintColor;
            return next;
          });
        } else if (
          (tool === "rectangle" ||
            tool === "ellipse" ||
            tool === "line") &&
          cell
        ) {
          setDragCurrent(cell);
        }
      }
    },
    [tool, colorIdx],
  );

  const handlePointerUp = useCallback(() => {
    if (
      (tool === "rectangle" || tool === "ellipse" || tool === "line") &&
      dragStart &&
      dragCurrent
    ) {
      pushHistory(design);
      const cells = computeShapeCells(
        tool,
        dragStart.cx,
        dragStart.cy,
        dragCurrent.cx,
        dragCurrent.cy,
        shapeFilled,
      );
      setDesign((d) => {
        const next = cloneDesign(d);
        for (const c of cells) next[c.index] = colorIdx;
        return next;
      });
    }
    setDragStart(null);
    setDragCurrent(null);
  }, [
    tool,
    dragStart,
    dragCurrent,
    shapeFilled,
    colorIdx,
    design,
    pushHistory,
  ]);

  // ----- image actions -----
  const handleImageFile = useCallback((file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImageEl(img);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  const applyImage = useCallback(() => {
    if (!imageEl) return;
    pushHistory(design);
    const samples = sampleImageToCells(imageEl, {
      fit: imageFit,
      rotate: imageRotate,
      flipX: imageFlipX,
      flipY: imageFlipY,
      allowedColors: restrictPalette
        ? Array.from(allowedColors)
        : undefined,
      skipTransparent: true,
    });
    setDesign((d) => {
      const next = cloneDesign(d);
      for (const [idx, ci] of samples) next[idx] = ci;
      return next;
    });
  }, [
    imageEl,
    imageFit,
    imageRotate,
    imageFlipX,
    imageFlipY,
    allowedColors,
    restrictPalette,
    design,
    pushHistory,
  ]);

  const clearMat = useCallback(() => {
    pushHistory(design);
    setDesign(newDesign());
  }, [design, pushHistory]);

  // ----- export PNG -----
  const exportPng = useCallback(() => {
    const SIZE = 24; // px per hex-size unit
    const BEZEL = 0.9; // hex-size units; matches HexMat.tsx
    const padding = Math.round((BEZEL + 0.5) * SIZE);
    const w = Math.ceil(MAT_WIDTH * SIZE + padding * 2);
    const h = Math.ceil(MAT_HEIGHT * SIZE + padding * 2);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    const black = PALETTE[colorIndex("black")].hex;
    ctx.fillStyle = black;
    ctx.fillRect(0, 0, w, h);

    ctx.translate(padding, padding);
    ctx.fillStyle = "#f3ece0";
    ctx.fillRect(0, 0, MAT_WIDTH * SIZE, MAT_HEIGHT * SIZE);

    for (const cell of CELLS) {
      const verts = hexVertices(cell, 1);
      ctx.beginPath();
      ctx.moveTo(verts[0][0] * SIZE, verts[0][1] * SIZE);
      for (let i = 1; i < verts.length; i++) {
        ctx.lineTo(verts[i][0] * SIZE, verts[i][1] * SIZE);
      }
      ctx.closePath();
      ctx.fillStyle = PALETTE[design[cell.index]]?.hex ?? PALETTE[0].hex;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Side wedges (left + right edges) so the export looks like the UI.
    const SQRT3_PX = Math.sqrt(3);
    ctx.fillStyle = black;
    for (let r = 0; r < 17; r++) {
      const y0 = SQRT3_PX * r * SIZE;
      const y1 = SQRT3_PX * (r + 1) * SIZE;
      const yMid = SQRT3_PX * (r + 0.5) * SIZE;
      // left
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(0.5 * SIZE, yMid);
      ctx.lineTo(0, y1);
      ctx.closePath();
      ctx.fill();
      // right
      const xR = MAT_WIDTH * SIZE;
      ctx.beginPath();
      ctx.moveTo(xR, y0);
      ctx.lineTo(xR - 0.5 * SIZE, yMid);
      ctx.lineTo(xR, y1);
      ctx.closePath();
      ctx.fill();
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tile-mat-design.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }, [design]);

  // ----- keyboard shortcuts -----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.tagName === "INPUT" ||
        (e.target as HTMLElement)?.tagName === "TEXTAREA"
      )
        return;
      if (e.key.toLowerCase() === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (
        (e.key.toLowerCase() === "y" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "Z" && e.shiftKey && (e.metaKey || e.ctrlKey))
      ) {
        e.preventDefault();
        redo();
      } else if (e.key === "p") setTool("pencil");
      else if (e.key === "e") setTool("eraser");
      else if (e.key === "f" || e.key === "b") setTool("bucket");
      else if (e.key === "t") setTool("text");
      else if (e.key === "r") setTool("rectangle");
      else if (e.key === "o") setTool("ellipse");
      else if (e.key === "l") setTool("line");
      else if (e.key === "i") setTool("image");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return (
    <div className="min-h-screen w-full">
      <header className="px-6 py-4 flex items-center justify-between gap-4 border-b border-black/10 bg-cream/80 backdrop-blur sticky top-0 z-10">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Tile Mat Designer
          </h1>
          <p className="text-xs text-black/55">
            Plan your hexagon mat. Paint, type, draw, or import an image.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportPng}
            className="px-3 py-1.5 rounded-md bg-ink text-cream text-sm font-medium hover:bg-black"
          >
            Export PNG
          </button>
        </div>
      </header>

      <div className="workspace-bg">
        <div className="grid gap-4 p-4 lg:grid-cols-[14rem_minmax(0,1fr)_18rem]">
          <aside className="flex flex-col gap-4">
            <Toolbar
              tool={tool}
              onToolChange={setTool}
              shapeFilled={shapeFilled}
              onShapeFilledChange={setShapeFilled}
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              onClear={clearMat}
            />

            {tool === "text" && (
              <TextOptions
                text={text}
                onTextChange={setText}
                kerning={textKerning}
                onKerningChange={setTextKerning}
                scale={textScale}
                onScaleChange={setTextScale}
              />
            )}

            {tool === "image" && (
              <ImageOptions
                imageEl={imageEl}
                onFile={handleImageFile}
                fit={imageFit}
                onFitChange={setImageFit}
                rotate={imageRotate}
                onRotateChange={setImageRotate}
                flipX={imageFlipX}
                onFlipXChange={setImageFlipX}
                flipY={imageFlipY}
                onFlipYChange={setImageFlipY}
                restrictPalette={restrictPalette}
                onRestrictPaletteChange={setRestrictPalette}
                allowedColors={allowedColors}
                onToggleAllowedColor={(i) =>
                  setAllowedColors((prev) => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    return next;
                  })
                }
                onApply={applyImage}
              />
            )}
          </aside>

          <main className="flex items-center justify-center">
            <div
              className="mat-surface w-full max-w-[1100px] p-3 sm:p-5"
              style={{ aspectRatio: `${MAT_WIDTH + 3} / ${MAT_HEIGHT + 3}` }}
            >
              <HexMat
                design={design}
                previewIndexes={preview?.indexes}
                previewColorIndex={preview?.color}
                onPointer={handlePointer}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                className="w-full h-full"
              />
            </div>
          </main>

          <aside className="flex flex-col gap-4">
            <ColorPalette selected={colorIdx} onSelect={setColorIdx} />
            <TileCountPanel design={design} />
          </aside>
        </div>
      </div>

      <footer className="text-center text-xs text-black/55 py-6">
        A fan-made design tool for the{" "}
        <a
          className="underline"
          href="https://tilemat.letterfolk.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Letterfolk Tile Mat
        </a>
        . Not affiliated with Letterfolk.
      </footer>
    </div>
  );
}

// ---- helpers used by the designer ----

/** Map a string laid out as 5x7 pixel font onto hex cells starting at the
 * cell under the cursor. With scale=1 each font pixel is one hex; with
 * scale=N each pixel becomes an N×N block of hexes. The natural column
 * offset of the hex grid gives letters a subtle hand-set feel. */
function textCellIndexes(
  text: string,
  kerning: number,
  scale: number,
  origin: Cell,
): Set<number> {
  const out = new Set<number>();
  const pixels = layoutText(text, kerning);
  const s = Math.max(1, Math.floor(scale));
  for (const p of pixels) {
    for (let dy = 0; dy < s; dy++) {
      for (let dx = 0; dx < s; dx++) {
        const cell = cellAt(origin.col + p.x * s + dx, origin.row + p.y * s + dy);
        if (cell) out.add(cell.index);
      }
    }
  }
  return out;
}

function computeShapeCells(
  tool: "rectangle" | "ellipse" | "line",
  ax: number,
  ay: number,
  bx: number,
  by: number,
  filled: boolean,
): Cell[] {
  if (tool === "rectangle") return cellsInRectangle(ax, ay, bx, by, filled);
  if (tool === "ellipse") return cellsInEllipse(ax, ay, bx, by, filled);
  return cellsOnLine(ax, ay, bx, by);
}

// ---- text + image option panels (kept inline to keep file count small) ----

function TextOptions({
  text,
  onTextChange,
  kerning,
  onKerningChange,
  scale,
  onScaleChange,
}: {
  text: string;
  onTextChange: (s: string) => void;
  kerning: number;
  onKerningChange: (n: number) => void;
  scale: number;
  onScaleChange: (n: number) => void;
}) {
  return (
    <div className="bg-white/70 backdrop-blur rounded-xl shadow-sm border border-black/5 p-3 flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-black/60">
        Text
      </h3>
      <input
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Type something"
        className="px-2 py-1.5 text-sm border border-black/15 rounded bg-white"
        maxLength={40}
      />
      <label className="text-[11px] text-black/60 flex items-center gap-2">
        Size
        <input
          type="range"
          min={1}
          max={4}
          value={scale}
          onChange={(e) => onScaleChange(parseInt(e.target.value, 10))}
          className="flex-1"
        />
        <span className="tabular-nums w-8">{scale}×</span>
      </label>
      <label className="text-[11px] text-black/60 flex items-center gap-2">
        Letter spacing
        <input
          type="range"
          min={1}
          max={3}
          value={kerning}
          onChange={(e) => onKerningChange(parseInt(e.target.value, 10))}
          className="flex-1"
        />
        <span className="tabular-nums w-4">{kerning}</span>
      </label>
      <p className="text-[11px] text-black/50">
        Click on the mat to stamp text. Hover to preview placement.
      </p>
    </div>
  );
}

function ImageOptions({
  imageEl,
  onFile,
  fit,
  onFitChange,
  rotate,
  onRotateChange,
  flipX,
  onFlipXChange,
  flipY,
  onFlipYChange,
  restrictPalette,
  onRestrictPaletteChange,
  allowedColors,
  onToggleAllowedColor,
  onApply,
}: {
  imageEl: HTMLImageElement | null;
  onFile: (f: File | null) => void;
  fit: "contain" | "cover" | "stretch";
  onFitChange: (f: "contain" | "cover" | "stretch") => void;
  rotate: number;
  onRotateChange: (n: number) => void;
  flipX: boolean;
  onFlipXChange: (b: boolean) => void;
  flipY: boolean;
  onFlipYChange: (b: boolean) => void;
  restrictPalette: boolean;
  onRestrictPaletteChange: (b: boolean) => void;
  allowedColors: Set<number>;
  onToggleAllowedColor: (i: number) => void;
  onApply: () => void;
}) {
  return (
    <div className="bg-white/70 backdrop-blur rounded-xl shadow-sm border border-black/5 p-3 flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-black/60">
        Import image
      </h3>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        className="text-xs"
      />
      {imageEl && (
        <>
          <div className="rounded border border-black/10 p-2 bg-white/60 flex items-center justify-center">
            <img
              src={imageEl.src}
              alt="preview"
              className="max-w-full max-h-32 object-contain"
              style={{
                transform: `rotate(${rotate}deg) scale(${flipX ? -1 : 1}, ${
                  flipY ? -1 : 1
                })`,
              }}
            />
          </div>
          <label className="text-[11px] text-black/60 flex items-center gap-2">
            Fit
            <select
              value={fit}
              onChange={(e) => onFitChange(e.target.value as typeof fit)}
              className="text-xs border border-black/15 rounded px-1 py-0.5 bg-white"
            >
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="stretch">Stretch</option>
            </select>
          </label>
          <label className="text-[11px] text-black/60 flex items-center gap-2">
            Rotate
            <input
              type="range"
              min={-180}
              max={180}
              value={rotate}
              onChange={(e) => onRotateChange(parseInt(e.target.value, 10))}
              className="flex-1"
            />
            <span className="tabular-nums w-8">{rotate}°</span>
          </label>
          <div className="flex items-center gap-3 text-[11px] text-black/60">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={flipX}
                onChange={(e) => onFlipXChange(e.target.checked)}
              />
              Flip H
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={flipY}
                onChange={(e) => onFlipYChange(e.target.checked)}
              />
              Flip V
            </label>
          </div>
          <label className="text-[11px] text-black/60 flex items-center gap-1">
            <input
              type="checkbox"
              checked={restrictPalette}
              onChange={(e) => onRestrictPaletteChange(e.target.checked)}
            />
            Restrict to selected colors
          </label>
          {restrictPalette && (
            <div className="grid grid-cols-8 gap-1">
              {PALETTE.map((c, i) => (
                <button
                  key={c.id}
                  title={c.name}
                  onClick={() => onToggleAllowedColor(i)}
                  className={`aspect-square rounded border text-[10px] ${
                    allowedColors.has(i)
                      ? "border-ink ring-1 ring-ink"
                      : "border-black/10 opacity-40"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          )}
          <button
            onClick={onApply}
            className="mt-1 px-3 py-1.5 rounded bg-ink text-cream text-sm font-medium"
          >
            Apply image to mat
          </button>
        </>
      )}
    </div>
  );
}
