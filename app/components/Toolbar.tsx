"use client";

import { Tool } from "./tools";

const BUTTONS: { id: Tool; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: "pencil", label: "Pencil", hint: "Paint a single tile (drag to paint many)", icon: <PencilIcon /> },
  { id: "eraser", label: "Eraser", hint: "Reset tiles back to the mat color", icon: <EraserIcon /> },
  { id: "bucket", label: "Fill", hint: "Flood-fill connected tiles of one color", icon: <BucketIcon /> },
  { id: "text", label: "Text", hint: "Stamp letters and numbers onto the mat", icon: <TextIcon /> },
  { id: "rectangle", label: "Rect", hint: "Draw a rectangle (drag two corners)", icon: <RectIcon /> },
  { id: "ellipse", label: "Oval", hint: "Draw a circle or oval (drag bounding box)", icon: <OvalIcon /> },
  { id: "line", label: "Line", hint: "Draw a straight line", icon: <LineIcon /> },
  { id: "image", label: "Image", hint: "Import an image and snap to tile colors", icon: <ImageIcon /> },
];

interface ToolbarProps {
  tool: Tool;
  onToolChange: (t: Tool) => void;
  shapeFilled: boolean;
  onShapeFilledChange: (filled: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClear: () => void;
}

export default function Toolbar({
  tool,
  onToolChange,
  shapeFilled,
  onShapeFilledChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClear,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3 p-3 bg-white/70 backdrop-blur rounded-xl shadow-sm border border-black/5">
      <div className="grid grid-cols-2 gap-2">
        {BUTTONS.map((b) => {
          const active = tool === b.id;
          return (
            <button
              key={b.id}
              onClick={() => onToolChange(b.id)}
              title={b.hint}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-xs font-medium border transition
                ${
                  active
                    ? "bg-ink text-cream border-ink shadow"
                    : "bg-white text-ink border-black/10 hover:border-black/30"
                }`}
            >
              <span className="w-5 h-5">{b.icon}</span>
              <span>{b.label}</span>
            </button>
          );
        })}
      </div>

      {(tool === "rectangle" || tool === "ellipse") && (
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={shapeFilled}
              onChange={(e) => onShapeFilledChange(e.target.checked)}
            />
            Filled
          </label>
        </div>
      )}

      <div className="border-t border-black/10 pt-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            disabled={!canUndo}
            onClick={onUndo}
            className="flex-1 px-2 py-1.5 text-xs rounded border border-black/15 bg-white hover:bg-black/5"
          >
            ↶ Undo
          </button>
          <button
            disabled={!canRedo}
            onClick={onRedo}
            className="flex-1 px-2 py-1.5 text-xs rounded border border-black/15 bg-white hover:bg-black/5"
          >
            ↷ Redo
          </button>
        </div>
        <button
          onClick={onClear}
          className="px-2 py-1.5 text-xs rounded border border-red-300 text-red-700 bg-white hover:bg-red-50"
        >
          Clear mat
        </button>
      </div>
    </div>
  );
}

// ------ inline icons (kept tiny so the toolbar feels lightweight) ------
function strokeProps(): React.SVGProps<SVGSVGElement> {
  return { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
}
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps()}><path d="M4 20l4-1L20 7l-3-3L5 16l-1 4z" /><path d="M14 6l3 3" /></svg>
  );
}
function EraserIcon() {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps()}><path d="M3 17l8-8 6 6-8 8H5l-2-2v-4z" /><path d="M14 6l4 4" /><path d="M9 21h12" /></svg>
  );
}
function BucketIcon() {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps()}><path d="M5 11l7-7 7 7-7 7-7-7z" /><path d="M19 13c1 2 2 3 2 5a2 2 0 11-4 0c0-2 1-3 2-5z" /></svg>
  );
}
function TextIcon() {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps()}><path d="M5 6h14" /><path d="M12 6v14" /><path d="M9 20h6" /></svg>
  );
}
function RectIcon() {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps()}><rect x="4" y="6" width="16" height="12" rx="1" /></svg>
  );
}
function OvalIcon() {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps()}><ellipse cx="12" cy="12" rx="8" ry="6" /></svg>
  );
}
function LineIcon() {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps()}><path d="M4 20L20 4" /></svg>
  );
}
function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" {...strokeProps()}><rect x="3" y="5" width="18" height="14" rx="1" /><circle cx="9" cy="11" r="2" /><path d="M21 17l-5-5-7 7" /></svg>
  );
}
