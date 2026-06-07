"use client";

import { PALETTE } from "@/app/lib/colors";

interface ColorPaletteProps {
  selected: number;
  onSelect: (i: number) => void;
  /** Optional multi-select for limiting which colors an image import may use. */
  multiSelected?: Set<number>;
  onMultiToggle?: (i: number) => void;
  multiMode?: boolean;
  title?: string;
}

export default function ColorPalette({
  selected,
  onSelect,
  multiSelected,
  onMultiToggle,
  multiMode = false,
  title = "Tile colors",
}: ColorPaletteProps) {
  return (
    <div className="bg-white/70 backdrop-blur rounded-xl shadow-sm border border-black/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-black/60">
          {title}
        </h3>
        {multiMode && (
          <span className="text-[10px] text-black/50">
            tap to toggle
          </span>
        )}
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {PALETTE.map((c, i) => {
          const active = multiMode
            ? !!multiSelected?.has(i)
            : selected === i;
          return (
            <button
              key={c.id}
              title={c.name}
              onClick={() =>
                multiMode ? onMultiToggle?.(i) : onSelect(i)
              }
              className={`relative aspect-square rounded-md border transition
                ${
                  active
                    ? "ring-2 ring-offset-1 ring-ink border-ink"
                    : "border-black/10 hover:border-black/30"
                }`}
              style={{ backgroundColor: c.hex }}
            >
              {active && (
                <span
                  className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
                  style={{
                    color: isLight(c.hex) ? "#000" : "#fff",
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[11px] text-black/55">
        {multiMode ? (
          <>Selected: {multiSelected?.size ?? 0} of {PALETTE.length}</>
        ) : (
          <>Selected: <span className="font-medium">{PALETTE[selected]?.name}</span></>
        )}
      </div>
    </div>
  );
}

function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Relative luminance.
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}
