'use client'

import { Tile, WindValue, DragonValue } from '@/lib/mahjong/tiles'

// ── PNG file mapping ──────────────────────────────────────────────────────────
// Files: public/tiles/Full Mahjong Tile 3-{nn}.png
//   01-09  Circles 1-9
//   10-18  Bamboo 1-9
//   19-27  Characters 1-9
//   28-31  Winds (East, South, West, North)
//   32-34  Dragons (White/白, Red/中, Green/發)
//   37-44  Flowers 1-8

function tileFileNumber(tile: Tile): number {
  if (tile.suit === 'circles')    return tile.value as number
  if (tile.suit === 'bamboo')     return (tile.value as number) + 9
  if (tile.suit === 'characters') return (tile.value as number) + 18
  if (tile.suit === 'winds') {
    const idx = ({ east: 0, south: 1, west: 2, north: 3 } as Record<WindValue, number>)[tile.value as WindValue]
    return 28 + idx
  }
  if (tile.suit === 'dragons') {
    const idx = ({ white: 0, red: 1, green: 2 } as Record<DragonValue, number>)[tile.value as DragonValue]
    return 32 + idx
  }
  if (tile.suit === 'flowers')    return (tile.value as number) + 36
  return 1
}

function tileImagePath(tile: Tile): string {
  const n = String(tileFileNumber(tile)).padStart(2, '0')
  return `/tiles/Full%20Mahjong%20Tile%203-${n}.png`
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface TileSvgProps {
  tile: Tile
  /** Fixed height in px — ignored when imgClass is provided */
  size?: number
  /** Tailwind classes applied to the img — use this for responsive heights */
  imgClass?: string
}

export function TileSvg({ tile, size = 92, imgClass }: TileSvgProps) {
  return (
    <div style={{ flexShrink: 0 }} className="inline-block">
      <img
        src={tileImagePath(tile)}
        alt=""
        aria-hidden="true"
        className={imgClass}
        style={imgClass ? { width: 'auto', display: 'block' } : { height: size, width: 'auto', display: 'block' }}
        draggable={false}
      />
    </div>
  )
}
