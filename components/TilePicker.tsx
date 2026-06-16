'use client'

import { useState } from 'react'
import { Tile, Suit, NumberValue, WindValue, DragonValue, FlowerValue, makeTile, tileKey } from '@/lib/mahjong/tiles'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ── Tile display ───────────────────────────────────────────────────────────────

const SUIT_COLORS: Record<string, string> = {
  bamboo: 'text-green-700 bg-green-50 border-green-300',
  circles: 'text-blue-700 bg-blue-50 border-blue-300',
  characters: 'text-red-700 bg-red-50 border-red-300',
  winds: 'text-purple-700 bg-purple-50 border-purple-300',
  dragons: 'text-yellow-700 bg-yellow-50 border-yellow-300',
  flowers: 'text-pink-700 bg-pink-50 border-pink-300',
}

const SUIT_LABELS: Record<string, string> = {
  bamboo: '🎋 Bamboo',
  circles: '⭕ Circles',
  characters: '字 Characters',
  winds: '🧭 Winds',
  dragons: '🐉 Dragons',
  flowers: '🌸 Flowers/Seasons',
}

function tileDisplayValue(tile: Tile): string {
  if (tile.suit === 'flowers') {
    const labels = ['Plum 1', 'Orchid 2', 'Mum 3', 'Bam 4', 'Spr 1', 'Sum 2', 'Aut 3', 'Wnt 4']
    return labels[(tile.value as number) - 1]
  }
  if (tile.suit === 'winds') {
    return { east: 'E 東', south: 'S 南', west: 'W 西', north: 'N 北' }[tile.value as WindValue]
  }
  if (tile.suit === 'dragons') {
    return { red: 'Zh 中', green: 'Fa 發', white: 'Bk 白' }[tile.value as DragonValue]
  }
  return String(tile.value)
}

interface TileButtonProps {
  tile: Tile
  onClick: (tile: Tile) => void
  count?: number
  maxAllowed?: number
}

function TileButton({ tile, onClick, count = 0, maxAllowed = 4 }: TileButtonProps) {
  const colorClass = SUIT_COLORS[tile.suit] ?? ''
  const disabled = count >= maxAllowed
  return (
    <button
      onClick={() => !disabled && onClick(tile)}
      disabled={disabled}
      className={cn(
        'relative border rounded-lg px-2 py-1.5 text-xs font-medium transition-all min-w-[44px]',
        'flex flex-col items-center gap-0.5',
        colorClass,
        disabled ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer',
        count > 0 && !disabled && 'ring-2 ring-offset-1 ring-current'
      )}
    >
      <span className="font-bold text-sm leading-tight">{tileDisplayValue(tile)}</span>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-slate-700 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  )
}

// ── Selected tile list ─────────────────────────────────────────────────────────

interface SelectedTileProps {
  tile: Tile
  onRemove: (tile: Tile) => void
}

function SelectedTileChip({ tile, onRemove }: SelectedTileProps) {
  const colorClass = SUIT_COLORS[tile.suit] ?? ''
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border rounded px-1.5 py-0.5 text-xs font-medium',
        colorClass
      )}
    >
      {tileDisplayValue(tile)}
      <button
        onClick={() => onRemove(tile)}
        className="ml-0.5 hover:bg-black/10 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] leading-none"
        aria-label="Remove tile"
      >
        ×
      </button>
    </span>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface TilePickerProps {
  selectedTiles: Tile[]
  onChange: (tiles: Tile[]) => void
  maxTiles?: number
  label?: string
  showFlowers?: boolean
  singleSelect?: boolean       // for winning tile picker
}

// ── Component ──────────────────────────────────────────────────────────────────

export function TilePicker({
  selectedTiles,
  onChange,
  maxTiles = 14,
  label,
  showFlowers = false,
  singleSelect = false,
}: TilePickerProps) {
  const [activeTab, setActiveTab] = useState<Suit>('bamboo')

  // Count occurrences of each tile key
  const countMap = new Map<string, number>()
  for (const t of selectedTiles) {
    const k = tileKey(t)
    countMap.set(k, (countMap.get(k) ?? 0) + 1)
  }

  function addTile(template: Tile) {
    if (selectedTiles.length >= maxTiles) return
    const newTile = makeTile(template.suit, template.value)
    if (singleSelect) {
      onChange([newTile])
    } else {
      onChange([...selectedTiles, newTile])
    }
  }

  function removeLast(template: Tile) {
    const idx = [...selectedTiles].reverse().findIndex((t) => tileKey(t) === tileKey(template))
    if (idx === -1) return
    const realIdx = selectedTiles.length - 1 - idx
    const next = [...selectedTiles]
    next.splice(realIdx, 1)
    onChange(next)
  }

  function clearAll() {
    onChange([])
  }

  // Build tile options per suit
  const suitTiles: Record<string, Tile[]> = {
    bamboo: Array.from({ length: 9 }, (_, i) => makeTile('bamboo', (i + 1) as NumberValue)),
    circles: Array.from({ length: 9 }, (_, i) => makeTile('circles', (i + 1) as NumberValue)),
    characters: Array.from({ length: 9 }, (_, i) => makeTile('characters', (i + 1) as NumberValue)),
    winds: (['east', 'south', 'west', 'north'] as WindValue[]).map((v) => makeTile('winds', v)),
    dragons: (['red', 'green', 'white'] as DragonValue[]).map((v) => makeTile('dragons', v)),
    flowers: Array.from({ length: 8 }, (_, i) => makeTile('flowers', (i + 1) as FlowerValue)),
  }

  const tabs: Suit[] = showFlowers
    ? ['bamboo', 'circles', 'characters', 'winds', 'dragons', 'flowers']
    : ['bamboo', 'circles', 'characters', 'winds', 'dragons']

  return (
    <div className="space-y-3">
      {label && <p className="text-sm font-medium text-slate-700">{label}</p>}

      {/* Selected tile display */}
      {!singleSelect && (
        <div className="min-h-[40px] bg-slate-50 rounded-lg p-2 flex flex-wrap gap-1 border border-slate-200">
          {selectedTiles.length === 0 ? (
            <span className="text-slate-400 text-xs self-center">No tiles selected</span>
          ) : (
            selectedTiles.map((tile, i) => (
              <SelectedTileChip key={tile.id + i} tile={tile} onRemove={removeLast} />
            ))
          )}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((suit) => (
          <button
            key={suit}
            onClick={() => setActiveTab(suit)}
            className={cn(
              'px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors border',
              activeTab === suit
                ? SUIT_COLORS[suit] + ' shadow-sm'
                : 'text-slate-500 bg-white border-slate-200 hover:border-slate-300'
            )}
          >
            {SUIT_LABELS[suit]}
          </button>
        ))}
      </div>

      {/* Tile grid */}
      <div className="flex flex-wrap gap-1.5">
        {(suitTiles[activeTab] ?? []).map((tile) => {
          const k = tileKey(tile)
          const count = countMap.get(k) ?? 0
          const maxAllowed = tile.suit === 'flowers' ? 1 : 4
          return (
            <TileButton
              key={k}
              tile={tile}
              onClick={addTile}
              count={count}
              maxAllowed={singleSelect ? 0 : maxAllowed}
            />
          )
        })}
      </div>

      {/* Controls */}
      {!singleSelect && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{selectedTiles.length} / {maxTiles} tiles</span>
          {selectedTiles.length > 0 && (
            <button onClick={clearAll} className="text-red-500 hover:text-red-700 underline">
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}
