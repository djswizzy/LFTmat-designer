"use client";

import { PALETTE } from "@/app/lib/colors";
import { TileCount, countTiles } from "@/app/lib/designState";
import { useMemo } from "react";

interface TileCountPanelProps {
  design: Uint8Array;
}

export default function TileCountPanel({ design }: TileCountPanelProps) {
  const counts = useMemo(() => countTiles(design), [design]);

  // Sort by total descending so the dominant colors show first.
  const sorted = [...counts]
    .filter((c) => c.full + c.half > 0)
    .sort((a, b) => b.full + b.half - (a.full + a.half));

  const totalFull = sorted.reduce((acc, c) => acc + c.full, 0);
  const totalHalf = sorted.reduce((acc, c) => acc + c.half, 0);
  const defaultIdx = 0; // "white" / mat base

  return (
    <div className="bg-white/70 backdrop-blur rounded-xl shadow-sm border border-black/5 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-black/60 mb-2">
        Tiles you'll need
      </h3>

      <ul className="space-y-1.5">
        {sorted.map((c) => {
          const color = PALETTE[c.colorIndex];
          const isBase = c.colorIndex === defaultIdx;
          return (
            <li
              key={c.colorIndex}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className="inline-block w-4 h-4 rounded border border-black/15"
                style={{ backgroundColor: color.hex }}
              />
              <span className="flex-1 truncate">
                {color.name}
                {isBase && (
                  <span className="text-[10px] text-black/45 ml-1">
                    (mat base)
                  </span>
                )}
              </span>
              <span className="font-semibold tabular-nums">{c.full}</span>
              {c.half > 0 && (
                <span
                  className="text-[10px] text-black/55 tabular-nums"
                  title={`${c.half} half tiles on the mat edges`}
                >
                  +{c.half}½
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 pt-2 border-t border-black/10 space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-black/55">Full tiles</span>
          <span className="font-semibold tabular-nums">{totalFull}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-black/55">Edge half-tiles</span>
          <span className="font-semibold tabular-nums">{totalHalf}</span>
        </div>
      </div>

      <p className="mt-2 text-[10px] text-black/45 leading-snug">
        The half-tiles and edge wedges form the mat's black woven border —
        they're part of the base mat and aren't replaceable.
      </p>
    </div>
  );
}

// Re-export the type for convenience.
export type { TileCount };
