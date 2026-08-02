import {
  Tile,
  Meld,
  isNumberedTile,
  isHonorTile,
  tileKey,
  sortTiles,
} from './tiles'

// ── Decomposition result ──────────────────────────────────────────────────────

export interface HandDecomposition {
  melds: Meld[]  // four sets
  pair: Meld     // the pair
  isValid: boolean
}

export interface SevenPairsDecomposition {
  pairs: Meld[]
  isValid: boolean
}

export interface KnittedDecomposition {
  knittedTiles: Tile[]  // 9 tiles forming knitted straight
  honorTiles: Tile[]    // honor tiles
  isValid: boolean
}

// ── Tile counting utilities ───────────────────────────────────────────────────

type TileCountMap = Map<string, { tile: Tile; count: number }>

function buildCountMap(tiles: Tile[]): TileCountMap {
  const map: TileCountMap = new Map()
  for (const tile of tiles) {
    const key = tileKey(tile)
    if (map.has(key)) {
      map.get(key)!.count++
    } else {
      map.set(key, { tile, count: 1 })
    }
  }
  return map
}

function countMapToArray(map: TileCountMap): Tile[] {
  const result: Tile[] = []
  for (const { tile, count } of map.values()) {
    for (let i = 0; i < count; i++) result.push(tile)
  }
  return result
}

// ── Main decomposition (backtracking) ─────────────────────────────────────────

export function findAllDecompositions(
  tiles: Tile[],
  declaredMelds: Meld[] = []
): HandDecomposition[] {
  const results: HandDecomposition[] = []
  const sorted = sortTiles(tiles)
  const map = buildCountMap(sorted)
  const setsNeeded = 4 - declaredMelds.length

  backtrack(map, setsNeeded, declaredMelds, [], null, results)
  return deduplicateDecompositions(results)
}

function backtrack(
  map: TileCountMap,
  setsNeeded: number,
  fixedMelds: Meld[],
  currentMelds: Meld[],
  currentPair: Meld | null,
  results: HandDecomposition[]
) {
  const minNeeded = setsNeeded * 3 + (currentPair ? 0 : 2)
  const maxNeeded = setsNeeded * 4 + (currentPair ? 0 : 2)
  const remaining = countMapToArray(map)

  if (remaining.length === 0) {
    if (setsNeeded === 0 && currentPair !== null) {
      results.push({
        melds: [...fixedMelds, ...currentMelds],
        pair: currentPair,
        isValid: true,
      })
    }
    return
  }

  if (remaining.length < minNeeded || remaining.length > maxNeeded) return

  // Find first tile in remaining
  const firstKey = [...map.keys()].find((k) => (map.get(k)?.count ?? 0) > 0)
  if (!firstKey) return
  const { tile, count } = map.get(firstKey)!

  // Try pair (only once)
  if (currentPair === null && count >= 2) {
    map.get(firstKey)!.count -= 2
    if (map.get(firstKey)!.count === 0) map.delete(firstKey)

    backtrack(
      map,
      setsNeeded,
      fixedMelds,
      currentMelds,
      { type: 'pair', tiles: [tile, tile], concealed: true },
      results
    )

    // Restore
    if (map.has(firstKey)) {
      map.get(firstKey)!.count += 2
    } else {
      map.set(firstKey, { tile, count: 2 })
    }
  }

  if (setsNeeded > 0) {
    // Try pung
    if (count >= 3) {
      map.get(firstKey)!.count -= 3
      if (map.get(firstKey)!.count === 0) map.delete(firstKey)

      backtrack(
        map,
        setsNeeded - 1,
        fixedMelds,
        [...currentMelds, { type: 'pung', tiles: [tile, tile, tile], concealed: true }],
        currentPair,
        results
      )

      if (map.has(firstKey)) {
        map.get(firstKey)!.count += 3
      } else {
        map.set(firstKey, { tile, count: 3 })
      }
    }

    // Try kong (4 of same)
    if (count >= 4) {
      map.get(firstKey)!.count -= 4
      if (map.get(firstKey)!.count === 0) map.delete(firstKey)

      backtrack(
        map,
        setsNeeded - 1,
        fixedMelds,
        [...currentMelds, { type: 'kong', tiles: [tile, tile, tile, tile], concealed: true }],
        currentPair,
        results
      )

      if (map.has(firstKey)) {
        map.get(firstKey)!.count += 4
      } else {
        map.set(firstKey, { tile, count: 4 })
      }
    }

    // Try chow
    if (isNumberedTile(tile)) {
      const v = tile.value as number
      const suit = tile.suit
      const key2 = `${suit}:${v + 1}`
      const key3 = `${suit}:${v + 2}`
      if (map.get(key2)?.count && map.get(key3)?.count) {
        const t2 = map.get(key2)!.tile
        const t3 = map.get(key3)!.tile

        map.get(firstKey)!.count -= 1
        if (map.get(firstKey)!.count === 0) map.delete(firstKey)
        map.get(key2)!.count -= 1
        if (map.get(key2)!.count === 0) map.delete(key2)
        map.get(key3)!.count -= 1
        if (map.get(key3)!.count === 0) map.delete(key3)

        backtrack(
          map,
          setsNeeded - 1,
          fixedMelds,
          [...currentMelds, { type: 'chow', tiles: [tile, t2, t3], concealed: true }],
          currentPair,
          results
        )

        // Restore
        if (map.has(firstKey)) {
          map.get(firstKey)!.count += 1
        } else {
          map.set(firstKey, { tile, count: 1 })
        }
        if (map.has(key2)) {
          map.get(key2)!.count += 1
        } else {
          map.set(key2, { tile: t2, count: 1 })
        }
        if (map.has(key3)) {
          map.get(key3)!.count += 1
        } else {
          map.set(key3, { tile: t3, count: 1 })
        }
      }
    }
  }
}

// ── Seven Pairs ───────────────────────────────────────────────────────────────

export function findSevenPairsDecomposition(tiles: Tile[]): SevenPairsDecomposition | null {
  if (tiles.length !== 14) return null
  const map = buildCountMap(tiles)
  const pairs: Meld[] = []

  for (const { tile, count } of map.values()) {
    if (count !== 2) return null
    pairs.push({ type: 'pair', tiles: [tile, tile], concealed: true })
  }

  if (pairs.length !== 7) return null
  return { pairs, isValid: true }
}

// ── Thirteen Orphans ──────────────────────────────────────────────────────────

const THIRTEEN_ORPHAN_KEYS = [
  'bamboo:1', 'bamboo:9',
  'circles:1', 'circles:9',
  'characters:1', 'characters:9',
  'winds:east', 'winds:south', 'winds:west', 'winds:north',
  'dragons:red', 'dragons:green', 'dragons:white',
]

export function isThirteenOrphans(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false
  const map = buildCountMap(tiles)
  let pairFound = false

  for (const key of THIRTEEN_ORPHAN_KEYS) {
    const count = map.get(key)?.count ?? 0
    if (count === 0) return false
    if (count === 2) {
      if (pairFound) return false
      pairFound = true
    }
  }
  return pairFound && map.size === 13
}

// ── Knitted Straight ──────────────────────────────────────────────────────────

// 147 in one suit + 258 in another + 369 in third
const KNITTED_PATTERNS: [number[], number[], number[]][] = [
  [[1,4,7], [2,5,8], [3,6,9]],
  [[1,4,7], [3,6,9], [2,5,8]],
  [[2,5,8], [1,4,7], [3,6,9]],
  [[2,5,8], [3,6,9], [1,4,7]],
  [[3,6,9], [1,4,7], [2,5,8]],
  [[3,6,9], [2,5,8], [1,4,7]],
]

export function findKnittedStraight(tiles: Tile[]): { knitted: Tile[]; rest: Tile[] } | null {
  const map = buildCountMap(tiles)

  for (const [bam, cir, chr] of KNITTED_PATTERNS) {
    const needed = [
      ...bam.map((v) => `bamboo:${v}`),
      ...cir.map((v) => `circles:${v}`),
      ...chr.map((v) => `characters:${v}`),
    ]
    if (needed.every((k) => (map.get(k)?.count ?? 0) >= 1)) {
      const knittedKeys = new Set(needed)
      const knitted: Tile[] = []
      const rest: Tile[] = []

      // Build knitted tiles, consuming one of each
      const consumed = new Map<string, number>()
      for (const t of tiles) {
        const k = tileKey(t)
        if (knittedKeys.has(k) && (consumed.get(k) ?? 0) < 1) {
          knitted.push(t)
          consumed.set(k, (consumed.get(k) ?? 0) + 1)
        } else {
          rest.push(t)
        }
      }
      return { knitted, rest }
    }
  }
  return null
}

// ── Greater Honors and Knitted (全不靠) ───────────────────────────────────────

export function isGreaterHonorsAndKnitted(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false

  // Must have all 7 honors (each wind once + each dragon once)
  const honorRequired = ['winds:east','winds:south','winds:west','winds:north','dragons:red','dragons:green','dragons:white']
  const map = buildCountMap(tiles)
  for (const h of honorRequired) {
    if ((map.get(h)?.count ?? 0) < 1) return false
  }

  // Remaining 7 tiles form a partial knitted straight (any 7 from the 9 knitted tiles)
  const numberedTiles = tiles.filter((t) => isNumberedTile(t))
  if (numberedTiles.length !== 7) return false

  // Check they form a valid knitted sequence
  for (const [bam, cir, chr] of KNITTED_PATTERNS) {
    const allKnitted = [
      ...bam.map((v) => `bamboo:${v}`),
      ...cir.map((v) => `circles:${v}`),
      ...chr.map((v) => `characters:${v}`),
    ]
    const knittedSet = new Set(allKnitted)
    if (numberedTiles.every((t) => knittedSet.has(tileKey(t)))) {
      return true
    }
  }
  return false
}

// ── Lesser Honors and Knitted (七星不靠) ─────────────────────────────────────

export function isLesserHonorsAndKnitted(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false

  // Must have at least one but not all 7 honors
  const honorKeys = ['winds:east','winds:south','winds:west','winds:north','dragons:red','dragons:green','dragons:white']
  const map = buildCountMap(tiles)
  const honorCount = honorKeys.filter((h) => (map.get(h)?.count ?? 0) >= 1).length

  // Greater honors has all 7; lesser has some but not all, forming part of knitted
  if (honorCount === 0 || honorCount === 7) return false

  const numberedTiles = tiles.filter((t) => isNumberedTile(t))
  for (const [bam, cir, chr] of KNITTED_PATTERNS) {
    const allKnitted = [
      ...bam.map((v) => `bamboo:${v}`),
      ...cir.map((v) => `circles:${v}`),
      ...chr.map((v) => `characters:${v}`),
    ]
    const knittedSet = new Set(allKnitted)
    if (numberedTiles.every((t) => knittedSet.has(tileKey(t)))) {
      return true
    }
  }
  return false
}

// ── Deduplication ─────────────────────────────────────────────────────────────

function decompositionKey(d: HandDecomposition): string {
  const meldKeys = d.melds
    .map((m) => `${m.type}:${m.tiles.map(tileKey).sort().join(',')}`)
    .sort()
  const pairKey = `pair:${d.pair.tiles.map(tileKey).sort().join(',')}`
  return [...meldKeys, pairKey].join('|')
}

function deduplicateDecompositions(ds: HandDecomposition[]): HandDecomposition[] {
  const seen = new Set<string>()
  return ds.filter((d) => {
    const k = decompositionKey(d)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

// ── Hand validity ─────────────────────────────────────────────────────────────

export function isValidWinningHand(
  tiles: Tile[],
  declaredMelds: Meld[]
): boolean {
  const handTiles = tiles.filter((t) => t.suit !== 'flowers')
  const fullTiles = [...handTiles]

  if (declaredMelds.length > 0) {
    for (const m of declaredMelds) fullTiles.push(...m.tiles)
  }

  if (fullTiles.length !== 14) return false

  if (isThirteenOrphans(fullTiles)) return true
  if (findSevenPairsDecomposition(fullTiles)) return true

  const knitted = findKnittedStraight(tiles.filter((t) => t.suit !== 'flowers'))
  if (knitted) {
    const rest = knitted.rest
    if (rest.every(isHonorTile) && rest.length === 5) return true
  }
  if (isGreaterHonorsAndKnitted(fullTiles)) return true

  const decomps = findAllDecompositions(handTiles, declaredMelds)
  return decomps.length > 0
}
