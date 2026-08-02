'use client'

import { useState, useEffect } from 'react'
import { Tile, Suit, NumberValue, WindValue, DragonValue, FlowerValue, makeTile, tileKey, tileName } from '@/lib/mahjong/tiles'
import { TileSvg } from '@/components/MahjongTileSvg'
import { cn } from '@/lib/utils'

// ── Suit tab styles ───────────────────────────────────────────────────────────

const SUIT_TAB_ACTIVE = 'bg-[#1a449a] text-[#F6F1E6] border-[#1a449a]'
const SUIT_TAB_INACTIVE = 'text-[#8A7A63] bg-[#F6F1E6] border-[#D9CBA9] hover:border-[#1a449a] hover:text-[#1a449a]'

const SUIT_LABELS: Record<string, string> = {
  bamboo:     'Bamboo',
  circles:    'Circles',
  characters: 'Characters',
  winds:      'Winds',
  dragons:    'Dragons',
  flowers:    'Flowers',
}

// ── Tile button ───────────────────────────────────────────────────────────────

interface TileButtonProps {
  tile: Tile
  onClick: (tile: Tile) => void
  count?: number
  maxAllowed?: number
}

function TileButton({ tile, onClick, count = 0, maxAllowed = 4 }: TileButtonProps) {
  const disabled = count >= maxAllowed
  return (
    <button
      onClick={() => !disabled && onClick(tile)}
      disabled={disabled}
      className={cn(
        'relative transition-all',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'cursor-pointer active:scale-95 hover:drop-shadow-md',
      )}
      title={tileName(tile)}
      aria-label={`${tileName(tile)}${count > 0 ? ` (${count} selected)` : ''}`}
    >
      <TileSvg tile={tile} imgClass="h-16 sm:h-[54px] w-auto block" />
      {count > 0 && !disabled && (
        <span className="absolute -top-2 -right-2 bg-[#21201C] text-[#F6F1E6] rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold leading-none z-10">
          {count}
        </span>
      )}
    </button>
  )
}

// ── Selected tile chip ────────────────────────────────────────────────────────

interface SelectedTileProps {
  tile: Tile
  onRemove: (tile: Tile) => void
}

function SelectedTileChip({ tile, onRemove }: SelectedTileProps) {
  return (
    <button
      onClick={() => onRemove(tile)}
      className="relative hover:scale-105 active:scale-95 transition-transform"
      title={`Remove ${tileName(tile)}`}
      aria-label={`Remove ${tileName(tile)}`}
    >
      <TileSvg tile={tile} imgClass="h-14 sm:h-[38px] w-auto block" />
      <span className="absolute -top-0.5 -right-0.5 bg-[#21201C] text-[#F6F1E6] rounded-full w-3 h-3 text-[8px] flex items-center justify-center font-bold leading-none">
        ×
      </span>
    </button>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface TilePickerProps {
  selectedTiles: Tile[]
  onChange: (tiles: Tile[]) => void
  maxTiles?: number
  label?: string
  showFlowers?: boolean
  singleSelect?: boolean
  allowedTiles?: Tile[]  // when set, tiles absent from this list are disabled
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TilePicker({
  selectedTiles,
  onChange,
  maxTiles = 14,
  label,
  showFlowers = false,
  singleSelect = false,
  allowedTiles,
}: TilePickerProps) {
  const [activeTab, setActiveTab] = useState<Suit>('bamboo')
  const [expanded, setExpanded] = useState(selectedTiles.length === 0)

  // Re-open picker when tile is cleared externally (e.g. Reset)
  useEffect(() => {
    if (singleSelect && selectedTiles.length === 0) setExpanded(true)
  }, [singleSelect, selectedTiles.length])

  const countMap = new Map<string, number>()
  for (const t of selectedTiles) {
    const k = tileKey(t)
    countMap.set(k, (countMap.get(k) ?? 0) + 1)
  }

  const allowedCountMap = new Map<string, number>()
  if (allowedTiles) {
    for (const t of allowedTiles) {
      const k = tileKey(t)
      allowedCountMap.set(k, (allowedCountMap.get(k) ?? 0) + 1)
    }
  }

  function addTile(template: Tile) {
    const newTile = makeTile(template.suit, template.value)
    if (singleSelect) {
      onChange([newTile])
      setExpanded(false)
      return
    }
    const nonFlowerCount = selectedTiles.filter((t) => t.suit !== 'flowers').length
    if (template.suit !== 'flowers' && nonFlowerCount >= maxTiles) return
    onChange([...selectedTiles, newTile])
  }

  function removeLast(template: Tile) {
    const idx = [...selectedTiles].reverse().findIndex((t) => tileKey(t) === tileKey(template))
    if (idx === -1) return
    const realIdx = selectedTiles.length - 1 - idx
    const next = [...selectedTiles]
    next.splice(realIdx, 1)
    onChange(next)
  }

  const suitTiles: Record<string, Tile[]> = {
    bamboo:     Array.from({ length: 9 }, (_, i) => makeTile('bamboo', (i + 1) as NumberValue)),
    circles:    Array.from({ length: 9 }, (_, i) => makeTile('circles', (i + 1) as NumberValue)),
    characters: Array.from({ length: 9 }, (_, i) => makeTile('characters', (i + 1) as NumberValue)),
    winds:      (['east', 'south', 'west', 'north'] as WindValue[]).map((v) => makeTile('winds', v)),
    dragons:    (['red', 'green', 'white'] as DragonValue[]).map((v) => makeTile('dragons', v)),
    flowers:    Array.from({ length: 8 }, (_, i) => makeTile('flowers', (i + 1) as FlowerValue)),
  }

  const tabs: Suit[] = showFlowers
    ? ['bamboo', 'circles', 'characters', 'winds', 'dragons', 'flowers']
    : ['bamboo', 'circles', 'characters', 'winds', 'dragons']

  // Compact view for single-select when a tile is already chosen
  if (singleSelect && selectedTiles.length > 0 && !expanded) {
    return (
      <div className="flex items-center gap-3 py-0.5">
        <TileSvg tile={selectedTiles[0]} size={44} />
        <span className="text-sm font-medium text-[#21201C]">{tileName(selectedTiles[0])}</span>
        <button
          onClick={() => setExpanded(true)}
          className="ml-auto text-xs border border-[#D9CBA9] rounded-md px-2.5 py-1 text-[#8A7A63] hover:border-[#1a449a] hover:text-[#1a449a] transition-colors"
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {label && <p className="text-sm font-medium text-[#21201C]">{label}</p>}

      {/* Selected tiles display */}
      {!singleSelect && (
        <div className="min-h-[38px] bg-[#F6F1E6] rounded-lg p-1.5 flex flex-wrap gap-1 border border-[#D9CBA9]">
          {selectedTiles.length === 0 ? (
            <span className="text-[#8A7A63] text-xs self-center px-1">No tiles selected</span>
          ) : (
            selectedTiles.map((tile, i) => (
              <SelectedTileChip key={tile.id + i} tile={tile} onRemove={removeLast} />
            ))
          )}
        </div>
      )}

      {/* Suit tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((suit) => (
          <button
            key={suit}
            onClick={() => setActiveTab(suit)}
            className={cn(
              'px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors border',
              activeTab === suit ? SUIT_TAB_ACTIVE : SUIT_TAB_INACTIVE
            )}
          >
            {SUIT_LABELS[suit]}
          </button>
        ))}
      </div>

      {/* Tile grid — wraps on mobile, single row on wider screens */}
      <div className="flex flex-wrap gap-2 py-2 px-1">
        {(suitTiles[activeTab] ?? []).map((tile) => {
          const k = tileKey(tile)
          const count = countMap.get(k) ?? 0
          let maxAllowed: number
          if (allowedTiles) {
            maxAllowed = (allowedCountMap.get(k) ?? 0) > 0 ? 1 : 0
          } else {
            maxAllowed = singleSelect ? 1 : (tile.suit === 'flowers' ? 1 : 4)
          }
          return (
            <TileButton
              key={k}
              tile={tile}
              onClick={addTile}
              count={count}
              maxAllowed={maxAllowed}
            />
          )
        })}
      </div>

      {/* Count / clear */}
      {!singleSelect && (
        <div className="flex items-center justify-between text-xs text-[#8A7A63]">
          <span>{selectedTiles.filter(t => t.suit !== 'flowers').length} / {maxTiles} tiles
            {selectedTiles.filter(t => t.suit === 'flowers').length > 0 &&
              ` + ${selectedTiles.filter(t => t.suit === 'flowers').length} flower${selectedTiles.filter(t => t.suit === 'flowers').length > 1 ? 's' : ''}`
            }
          </span>
          {selectedTiles.length > 0 && (
            <button onClick={() => onChange([])} className="text-[#e51e28] hover:text-[#e51e28]/70 underline">
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}
