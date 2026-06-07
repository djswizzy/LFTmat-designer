# Tile Mat Designer

An interactive web app for designing custom layouts on a [Letterfolk Tile Mat](https://tilemat.letterfolk.com/). Paint a design tile-by-tile, type letters, draw shapes, or import an image — then see exactly which colored tiles you need to swap on the physical mat to bring it to life.

> Not affiliated with Letterfolk. This is a fan-made planning tool.

## Mat geometry

The standard Tile Mat is **33 columns of flat-top hexagons** that alternate in height: even columns (0, 2, …, 32, including the leftmost and rightmost columns) hold 16 full hexes plus a top-half and bottom-half tile that sit flush against the mat's edges, while odd columns (1, 3, …, 31) hold 17 full hexes flush with both edges. Both column types span the same height (17·√3·s ≈ 18″ for s = 0.6″), so the mat forms a clean rectangle. The half-tiles on the even columns make up the mat's black woven border and are locked / not user-replaceable.

## Features

- **Pencil / Eraser** — paint tiles with the active color.
- **Bucket fill** — flood-fill connected regions of the same color.
- **Text** — stamp uppercase letters, numbers and basic punctuation. A 5×7 bitmap font maps each pixel to a single hex tile.
- **Shapes** — drag out rectangles, ovals, and lines. Filled or outlined.
- **Image import** — drop in any image, choose how it fits the mat, and the app quantizes every hex to the nearest tile color.
- **Tile counter** — live count of how many tiles you need in each color (full + half).
- **Undo / redo / clear**, plus auto-save to `localStorage`.
- **Export PNG** of the current design.

## Local development

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new) — the default Next.js settings work as-is.
3. (Optional) `npx vercel` from the repo root for a one-shot deploy.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `P` | Pencil |
| `E` | Eraser |
| `F` / `B` | Bucket fill |
| `T` | Text tool |
| `R` | Rectangle |
| `O` | Oval / ellipse |
| `L` | Line |
| `I` | Image import |
| `⌘/Ctrl + Z` | Undo |
| `⌘/Ctrl + Shift + Z` or `⌘/Ctrl + Y` | Redo |

## Project structure

```
app/
  layout.tsx         # root layout + metadata
  page.tsx           # mounts the Designer
  globals.css        # Tailwind + workspace styling
  components/
    Designer.tsx     # top-level state + tool orchestration
    HexMat.tsx       # SVG hex grid renderer
    Toolbar.tsx      # tool buttons + undo/redo/clear
    ColorPalette.tsx # swatch grid
    TileCount.tsx    # tile-count summary
    tools.ts         # shared Tool union
  lib/
    hexGrid.ts       # geometry, cell list, hit-testing, neighbors
    colors.ts        # palette + nearest-color quantizer
    designState.ts   # design buffer, bucket fill, counts, serialize
    pixelFont.ts     # 5x7 bitmap font for text tool
    shapes.ts        # rectangle/ellipse/line rasterization
    imageImport.ts   # image -> hex grid sampler
```
