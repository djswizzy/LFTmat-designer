// Color palette for the Tile Mat designer.
//
// Letterfolk has historically sold tile sets in a couple of dozen colors;
// they are currently mostly black/white but we keep the broader palette
// here so designs can be planned for any era. Names and hex values are
// approximations based on Letterfolk's product photography.

export interface TileColor {
  /** Stable id used in storage. Never rename without a migration. */
  id: string;
  /** Display name. */
  name: string;
  /** sRGB hex like "#ffffff". */
  hex: string;
}

// The first entry, "white", is the default mat color (the fixed bottom tile
// you build a design on top of). It is also used as the "eraser" color.
export const PALETTE: TileColor[] = [
  { id: "white", name: "White", hex: "#f6f1e7" },
  { id: "black", name: "Black", hex: "#1a1a1a" },
  { id: "fog", name: "Fog", hex: "#a8a59c" },
  { id: "stone", name: "Stone", hex: "#7a7972" },
  { id: "cream", name: "Cream", hex: "#efe2c6" },
  { id: "sand", name: "Sand", hex: "#d8c39a" },
  { id: "clay", name: "Clay", hex: "#b06a4d" },
  { id: "desert-bloom", name: "Desert Bloom", hex: "#d97a4a" },
  { id: "rust", name: "Rust", hex: "#9a4326" },
  { id: "blush", name: "Blush", hex: "#e7a9a0" },
  { id: "berry", name: "Berry", hex: "#8a3a4f" },
  { id: "rose", name: "Rose", hex: "#c1577a" },
  { id: "marigold", name: "Marigold", hex: "#e0a82e" },
  { id: "mustard", name: "Mustard", hex: "#b48a1f" },
  { id: "olive", name: "Olive", hex: "#6f7437" },
  { id: "fern", name: "Fern", hex: "#5b8a47" },
  { id: "evergreen", name: "Evergreen", hex: "#2f5240" },
  { id: "teal", name: "Teal", hex: "#2c6f7a" },
  { id: "mist", name: "Mist", hex: "#9bb6c1" },
  { id: "denim", name: "Denim", hex: "#3f5b80" },
  { id: "navy", name: "Navy", hex: "#1f2a44" },
  { id: "lavender", name: "Lavender", hex: "#9b8fb5" },
  { id: "plum", name: "Plum", hex: "#5a3a5f" },
];

export const DEFAULT_COLOR_ID = "white";

export function colorById(id: string): TileColor {
  return PALETTE.find((c) => c.id === id) ?? PALETTE[0];
}

export function colorIndex(id: string): number {
  const i = PALETTE.findIndex((c) => c.id === id);
  return i >= 0 ? i : 0;
}

// --------- color-distance utilities (used by image import) ---------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b];
}

const PALETTE_RGB: [number, number, number][] = PALETTE.map((c) =>
  hexToRgb(c.hex),
);

/**
 * Snap an arbitrary RGB value to the closest palette color. Uses a simple
 * weighted-RGB distance that's a good cheap approximation to perceptual
 * distance and works well on swatch-style images.
 */
export function nearestColorIndex(
  r: number,
  g: number,
  b: number,
  palette: number[] = PALETTE.map((_, i) => i),
): number {
  let bestIdx = palette[0];
  let bestD = Infinity;
  for (const i of palette) {
    const [pr, pg, pb] = PALETTE_RGB[i];
    const dr = r - pr;
    const dg = g - pg;
    const db = b - pb;
    // Weighted RGB distance (Riemersma / "low-cost" approximation).
    const rmean = (r + pr) / 2;
    const d =
      ((512 + rmean) * dr * dr) / 256 +
      4 * dg * dg +
      ((767 - rmean) * db * db) / 256;
    if (d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}
