'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import {
  Tile,
  Meld,
  MeldType,
  NumberValue,
  makeTile,
  tileKey,
  tileName,
} from '@/lib/mahjong/tiles'
import { TileSvg } from '@/components/MahjongTileSvg'
import { TilePicker } from '@/components/TilePicker'
import { Label } from '@/components/ui/label'

// A meld the user claimed from a discard. Stored by its base tile plus a type
// so it can be rebuilt as real Tile objects (with fresh ids) on demand.
export interface ExposedMeldSpec {
  type: MeldType
  base: Tile
}

const SET_SIZE: Record<string, number> = { pung: 3, kong: 4, chow: 3 }

/** Expand a spec into the concrete tiles it consumes from the hand. */
export function meldTiles(spec: ExposedMeldSpec): Tile[] {
  if (spec.type === 'chow') {
    const v = spec.base.value as number
    return [0, 1, 2].map((o) =>
      makeTile(spec.base.suit, (v + o) as NumberValue)
    )
  }
  return Array.from({ length: SET_SIZE[spec.type] }, () =>
    makeTile(spec.base.suit, spec.base.value)
  )
}

/** Convert to the engine's Meld shape. Exposed melds are never concealed. */
export function toMeld(spec: ExposedMeldSpec): Meld {
  return { type: spec.type, tiles: meldTiles(spec), concealed: false }
}

function describe(spec: ExposedMeldSpec): string {
  if (spec.type === 'chow') {
    const v = spec.base.value as number
    return `Chow ${v}-${v + 1}-${v + 2} ${spec.base.suit}`
  }
  return `${spec.type === 'kong' ? 'Kong' : 'Pung'} of ${tileName(spec.base)}`
}

/**
 * Returns the tiles left in `hand` after removing everything the specs consume,
 * or null when the hand does not actually contain those tiles.
 */
export function subtractMelds(
  hand: Tile[],
  specs: ExposedMeldSpec[]
): Tile[] | null {
  const pool = [...hand]
  for (const spec of specs) {
    for (const needed of meldTiles(spec)) {
      const idx = pool.findIndex((t) => tileKey(t) === tileKey(needed))
      if (idx === -1) return null
      pool.splice(idx, 1)
    }
  }
  return pool
}

const TYPE_OPTIONS: { label: string; value: MeldType }[] = [
  { label: 'Pung', value: 'pung' },
  { label: 'Kong', value: 'kong' },
  { label: 'Chow', value: 'chow' },
]

interface ExposedMeldsProps {
  handTiles: Tile[]
  melds: ExposedMeldSpec[]
  onChange: (melds: ExposedMeldSpec[]) => void
}

export function ExposedMelds({
  handTiles,
  melds,
  onChange,
}: ExposedMeldsProps) {
  const [adding, setAdding] = useState(false)
  const [draftType, setDraftType] = useState<MeldType>('pung')
  const [draftTile, setDraftTile] = useState<Tile | null>(null)

  // Only offer tiles the hand still has spare, so a set can't be double-claimed
  const remaining = subtractMelds(handTiles, melds) ?? []

  function reset() {
    setAdding(false)
    setDraftTile(null)
    setDraftType('pung')
  }

  function commit(tile: Tile) {
    const spec: ExposedMeldSpec = { type: draftType, base: tile }
    if (subtractMelds(handTiles, [...melds, spec]) === null) return
    onChange([...melds, spec])
    reset()
  }

  const draftValid =
    draftTile !== null &&
    subtractMelds(handTiles, [...melds, { type: draftType, base: draftTile }]) !==
      null

  return (
    <div className="space-y-2.5">
      {melds.length > 0 && (
        <ul className="space-y-1.5">
          {melds.map((spec, i) => (
            <li
              key={`${spec.type}-${tileKey(spec.base)}-${i}`}
              className="flex items-center gap-2 bg-[#F6F1E6] border border-[#D9CBA9] rounded-lg p-1.5"
            >
              <div className="flex gap-0.5">
                {meldTiles(spec).map((t) => (
                  <TileSvg key={t.id} tile={t} imgClass="h-9 w-auto block" />
                ))}
              </div>
              <span className="text-xs text-[#8A7A63]">{describe(spec)}</span>
              <button
                onClick={() => onChange(melds.filter((_, j) => j !== i))}
                className="ml-auto text-[#8A7A63] hover:text-[#e51e28] transition-colors p-1"
                aria-label={`Remove ${describe(spec)}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="space-y-2 border border-[#D9CBA9] rounded-lg p-2.5 bg-[#F6F1E6]">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#21201C]">
              Set type
            </Label>
            <div className="flex rounded-lg border border-[#D9CBA9] overflow-hidden">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setDraftType(opt.value)
                    setDraftTile(null)
                  }}
                  className={`flex-1 py-1.5 px-2 text-xs font-medium transition-colors ${
                    draftType === opt.value
                      ? 'bg-[#1a449a] text-[#F6F1E6]'
                      : 'bg-[#F6F1E6] text-[#8A7A63] hover:bg-[#EFE7D8]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#21201C]">
              {draftType === 'chow' ? 'Lowest tile of the run' : 'Tile'}
            </Label>
            <TilePicker
              selectedTiles={draftTile ? [draftTile] : []}
              onChange={(ts) => {
                const t = ts[0]
                setDraftTile(t ?? null)
                if (t) commit(t)
              }}
              singleSelect
              maxTiles={1}
              allowedTiles={remaining}
            />
            {draftTile && !draftValid && (
              <p className="text-xs text-[#e51e28]">
                Your hand doesn&apos;t contain enough of that tile for a{' '}
                {draftType}.
              </p>
            )}
          </div>

          <button
            onClick={reset}
            className="text-xs text-[#8A7A63] hover:text-[#e51e28] underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          disabled={remaining.length < 3}
          className="flex items-center gap-1.5 text-xs border border-[#D9CBA9] rounded-md px-2.5 py-1.5 text-[#8A7A63] hover:border-[#1a449a] hover:text-[#1a449a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={13} />
          Add exposed set
        </button>
      )}
    </div>
  )
}
