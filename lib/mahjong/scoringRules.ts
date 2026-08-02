// Chinese Official Mahjong (MCR) scoring patterns.
// Each pattern is self-contained data — the scoring engine applies them.

import {
  Tile,
  Meld,
  WindValue,
  WIND_ORDER,
  NUMBERED_SUITS,
  isNumberedTile,
  isHonorTile,
  isTerminal,
  isTerminalOrHonor,
  isSimple,
  isGreenTile,
  isReversibleTile,
  tileKey,
  sortTiles,
} from './tiles'
import {
  HandDecomposition,
  SevenPairsDecomposition,
  isThirteenOrphans,
  findKnittedStraight,
  isGreaterHonorsAndKnitted,
  isLesserHonorsAndKnitted,
} from './grouping'

// ── Scoring context ───────────────────────────────────────────────────────────

export type WaitType = 'edge' | 'closed' | 'pair' | 'two-sided' | 'knitted'

export interface ScoringContext {
  allTiles: Tile[]           // 14 tiles (excl. flowers)
  winningTile: Tile
  declaredMelds: Meld[]      // Pre-declared melds (open sets)
  selfDraw: boolean
  seatWind: WindValue
  prevalentWind: WindValue
  flowerCount: number
  waitType: WaitType
  isLastTile: boolean        // last tile of the game
  isRobbingKong: boolean
  isOutOnKong: boolean
  isLastClaim: boolean       // last discard in game
  isLastDraw: boolean        // last self-draw in game
}

export interface ScoredPattern {
  id: string
  name: string
  chineseName: string
  points: number
  count: number              // times this pattern applies
  excludedBy?: string[]      // IDs of patterns that exclude this one
}

// ── Pattern definition ────────────────────────────────────────────────────────

export interface Pattern {
  id: string
  name: string
  chineseName: string
  points: number
  // Patterns this one excludes (by id)
  excludes: string[]
  // Returns how many times this pattern applies (usually 0 or 1)
  score(
    ctx: ScoringContext,
    decomp: HandDecomposition | null,
    sevenPairs: SevenPairsDecomposition | null
  ): number
}

// ── Helper utilities ──────────────────────────────────────────────────────────

function allMelds(decomp: HandDecomposition): Meld[] {
  return [...decomp.melds, decomp.pair]
}

function chows(decomp: HandDecomposition): Meld[] {
  return decomp.melds.filter((m) => m.type === 'chow')
}

function pungs(decomp: HandDecomposition): Meld[] {
  return decomp.melds.filter((m) => m.type === 'pung' || m.type === 'kong')
}

function kongs(decomp: HandDecomposition): Meld[] {
  return decomp.melds.filter((m) => m.type === 'kong')
}

function concealedPungs(decomp: HandDecomposition): Meld[] {
  return pungs(decomp).filter((m) => m.concealed)
}

function chowValue(chow: Meld): number {
  if (chow.type !== 'chow') return 0
  return Math.min(...chow.tiles.filter(isNumberedTile).map((t) => t.value as number))
}

function pungValue(pung: Meld): number {
  if (!isNumberedTile(pung.tiles[0])) return -1
  return pung.tiles[0].value as number
}

function allTilesIn(decomp: HandDecomposition): Tile[] {
  return allMelds(decomp).flatMap((m) => m.tiles)
}

function suitsUsed(tiles: Tile[]): Set<string> {
  return new Set(tiles.map((t) => t.suit))
}

// ── 88-point patterns ─────────────────────────────────────────────────────────

const BIG_FOUR_WINDS: Pattern = {
  id: 'big-four-winds',
  name: 'Big Four Winds',
  chineseName: '大四喜',
  points: 88,
  excludes: ['little-four-winds', 'big-three-winds', 'prevalent-wind', 'seat-wind',
    'pung-terminals-honors', 'all-pungs', 'double-pung', 'two-concealed-pungs', 'three-concealed-pungs', 'four-concealed-pungs'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const ps = pungs(decomp)
    return ps.length >= 4 &&
      WIND_ORDER.every((w) => ps.some((m) => tileKey(m.tiles[0]) === `winds:${w}`))
      ? 1 : 0
  },
}

const BIG_THREE_DRAGONS: Pattern = {
  id: 'big-three-dragons',
  name: 'Big Three Dragons',
  chineseName: '大三元',
  points: 88,
  excludes: ['little-three-dragons', 'two-dragon-pungs', 'dragon-pung'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const ps = pungs(decomp)
    return ps.some((m) => tileKey(m.tiles[0]) === 'dragons:red') &&
      ps.some((m) => tileKey(m.tiles[0]) === 'dragons:green') &&
      ps.some((m) => tileKey(m.tiles[0]) === 'dragons:white')
      ? 1 : 0
  },
}

const ALL_GREEN: Pattern = {
  id: 'all-green',
  name: 'All Green',
  chineseName: '绿一色',
  points: 88,
  excludes: ['full-flush', 'all-pungs', 'pure-triple-chow', 'mixed-triple-chow', 'all-simples',
    'no-honors', 'pung-terminals-honors', 'dragon-pung'],
  score(ctx, decomp, sevenPairs) {
    const tiles = decomp ? allTilesIn(decomp) : sevenPairs ? sevenPairs.pairs.flatMap((p) => p.tiles) : ctx.allTiles
    return tiles.every(isGreenTile) ? 1 : 0
  },
}

const NINE_GATES: Pattern = {
  id: 'nine-gates',
  name: 'Nine Gates',
  chineseName: '九莲宝灯',
  points: 88,
  excludes: ['full-flush', 'pure-straight', 'pure-triple-chow', 'pure-shifted-chows', 'all-pungs',
    'all-simples', 'no-honors', 'concealed-hand', 'pung-terminals-honors', 'two-terminal-chows'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const tiles = sortTiles(ctx.allTiles)
    if (tiles.length !== 14) return 0
    const suits = suitsUsed(tiles)
    if (suits.size !== 1 || suits.has('winds') || suits.has('dragons')) return 0
    const vals = tiles.map((t) => t.value as number).sort((a, b) => a - b)
    // Must be 1112345678999 + one extra
    const base = [1,1,1,2,3,4,5,6,7,8,9,9,9]
    const extraCandidates = [1,2,3,4,5,6,7,8,9]
    for (const extra of extraCandidates) {
      const full = [...base, extra].sort((a, b) => a - b)
      if (vals.join(',') === full.join(',')) return 1
    }
    return 0
  },
}

const FOUR_KONGS: Pattern = {
  id: 'four-kongs',
  name: 'Four Kongs',
  chineseName: '四杠子',
  points: 88,
  excludes: ['three-kongs', 'all-pungs', 'concealed-kong', 'melded-kong', 'two-melded-kongs'],
  score(ctx, decomp) {
    if (!decomp) return 0
    return kongs(decomp).length === 4 ? 1 : 0
  },
}

const SEVEN_SHIFTED_PAIRS: Pattern = {
  id: 'seven-shifted-pairs',
  name: 'Seven Shifted Pairs',
  chineseName: '连七对',
  points: 88,
  excludes: ['seven-pairs', 'full-flush', 'pure-double-chow', 'two-terminal-chows',
    'short-straight', 'all-simples', 'no-honors'],
  score(ctx, decomp, sevenPairs) {
    if (!sevenPairs) return 0
    const tiles = sortTiles(sevenPairs.pairs.flatMap((p) => [p.tiles[0]]))
    if (!isNumberedTile(tiles[0])) return 0
    const suit = tiles[0].suit
    if (tiles.some((t) => t.suit !== suit)) return 0
    const vals = tiles.map((t) => t.value as number).sort((a, b) => a - b)
    if (vals.length !== 7) return 0
    return vals[6] - vals[0] === 6 && vals.every((v, i) => i === 0 || v === vals[i - 1] + 1) ? 1 : 0
  },
}

const THIRTEEN_ORPHANS_PATTERN: Pattern = {
  id: 'thirteen-orphans',
  name: 'Thirteen Orphans',
  chineseName: '十三幺',
  points: 88,
  excludes: ['all-types', 'no-honors', 'pung-terminals-honors', 'concealed-hand', 'single-tile-wait'],
  score(ctx) {
    return isThirteenOrphans(ctx.allTiles) ? 1 : 0
  },
}

// ── 64-point patterns ─────────────────────────────────────────────────────────

const ALL_TERMINALS: Pattern = {
  id: 'all-terminals',
  name: 'All Terminals',
  chineseName: '清幺九',
  points: 64,
  excludes: ['all-terminals-honors', 'all-pungs', 'outside-hand', 'no-honors',
    'pung-terminals-honors', 'two-terminal-chows', 'double-pung'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const tiles = allTilesIn(decomp)
    return tiles.every(isTerminal) ? 1 : 0
  },
}

const LITTLE_FOUR_WINDS: Pattern = {
  id: 'little-four-winds',
  name: 'Little Four Winds',
  chineseName: '小四喜',
  points: 64,
  excludes: ['big-three-winds', 'prevalent-wind', 'seat-wind', 'pung-terminals-honors',
    'all-pungs', 'double-pung', 'two-concealed-pungs', 'three-concealed-pungs'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const ps = pungs(decomp)
    const pairIsWind = decomp.pair.tiles[0].suit === 'winds'
    const windPungs = ps.filter((m) => m.tiles[0].suit === 'winds')
    return windPungs.length === 3 && pairIsWind ? 1 : 0
  },
}

const LITTLE_THREE_DRAGONS: Pattern = {
  id: 'little-three-dragons',
  name: 'Little Three Dragons',
  chineseName: '小三元',
  points: 64,
  excludes: ['two-dragon-pungs', 'dragon-pung'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const ps = pungs(decomp)
    const pairIsDragon = decomp.pair.tiles[0].suit === 'dragons'
    const dragonPungs = ps.filter((m) => m.tiles[0].suit === 'dragons')
    return dragonPungs.length === 2 && pairIsDragon ? 1 : 0
  },
}

const ALL_HONORS: Pattern = {
  id: 'all-honors',
  name: 'All Honors',
  chineseName: '字一色',
  points: 64,
  excludes: ['all-terminals-honors', 'all-pungs', 'no-honors', 'pung-terminals-honors',
    'outside-hand', 'double-pung'],
  score(ctx, decomp, sevenPairs) {
    const tiles = decomp ? allTilesIn(decomp) : sevenPairs ? sevenPairs.pairs.flatMap((p) => p.tiles) : ctx.allTiles
    return tiles.every(isHonorTile) ? 1 : 0
  },
}

const FOUR_CONCEALED_PUNGS: Pattern = {
  id: 'four-concealed-pungs',
  name: 'Four Concealed Pungs',
  chineseName: '四暗刻',
  points: 64,
  excludes: ['three-concealed-pungs', 'two-concealed-pungs', 'all-pungs', 'fully-concealed-hand', 'concealed-hand'],
  score(ctx, decomp) {
    if (!decomp) return 0
    return concealedPungs(decomp).length === 4 ? 1 : 0
  },
}

const PURE_TERMINAL_CHOWS: Pattern = {
  id: 'pure-terminal-chows',
  name: 'Pure Terminal Chows',
  chineseName: '一色双龙会',
  points: 64,
  excludes: ['full-flush', 'pure-straight', 'seven-pairs', 'two-terminal-chows', 'pure-double-chow',
    'all-simples', 'no-honors', 'all-chows'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const cs = chows(decomp)
    if (cs.length < 4) return 0
    // 123 + 789 + 123 + 789 same suit + pair 55 same suit
    const suit = cs[0].tiles[0].suit
    if (!isNumberedTile(cs[0].tiles[0])) return 0
    if (cs.some((c) => c.tiles[0].suit !== suit)) return 0
    const vals = cs.map(chowValue).sort((a, b) => a - b)
    if (!(vals[0] === 1 && vals[1] === 1 && vals[2] === 7 && vals[3] === 7)) return 0
    const pair = decomp.pair
    return pair.tiles[0].suit === suit && (pair.tiles[0].value as number) === 5 ? 1 : 0
  },
}

// ── 48-point patterns ─────────────────────────────────────────────────────────

const QUADRUPLE_CHOW: Pattern = {
  id: 'quadruple-chow',
  name: 'Quadruple Chow',
  chineseName: '一色四同顺',
  points: 48,
  excludes: ['pure-triple-chow', 'pure-double-chow', 'tile-hog', 'all-chows',
    'full-flush', 'no-honors', 'all-simples'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const cs = chows(decomp)
    if (cs.length < 4) return 0
    const groups = groupIdenticalChows(cs)
    return groups.some((g) => g.length >= 4) ? 1 : 0
  },
}

const FOUR_PURE_SHIFTED_PUNGS: Pattern = {
  id: 'four-pure-shifted-pungs',
  name: 'Four Pure Shifted Pungs',
  chineseName: '一色四步高',
  points: 48,
  excludes: ['pure-shifted-pungs', 'all-pungs', 'full-flush', 'no-honors', 'double-pung'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const ps = pungs(decomp)
    if (ps.length < 4) return 0
    // Four pungs same suit with consecutive values
    for (const suit of NUMBERED_SUITS) {
      const suitPungs = ps.filter((m) => m.tiles[0].suit === suit)
      if (suitPungs.length < 4) continue
      const vals = suitPungs.map(pungValue).sort((a, b) => a - b)
      for (let i = 0; i <= vals.length - 4; i++) {
        if (vals[i+1] - vals[i] === 1 && vals[i+2] - vals[i+1] === 1 && vals[i+3] - vals[i+2] === 1) {
          return 1
        }
      }
    }
    return 0
  },
}

// ── 32-point patterns ─────────────────────────────────────────────────────────

const FOUR_SHIFTED_CHOWS: Pattern = {
  id: 'four-shifted-chows',
  name: 'Four Shifted Chows',
  chineseName: '一色四节高',
  points: 32,
  excludes: ['pure-shifted-chows', 'all-chows', 'full-flush', 'no-honors', 'short-straight',
    'pure-double-chow', 'mixed-double-chow'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const cs = chows(decomp)
    if (cs.length < 4) return 0
    for (const suit of NUMBERED_SUITS) {
      const sc = cs.filter((c) => c.tiles[0].suit === suit)
      if (sc.length < 4) continue
      const vals = sc.map(chowValue).sort((a, b) => a - b)
      for (let i = 0; i <= vals.length - 4; i++) {
        if (vals[i+1]-vals[i]===1 && vals[i+2]-vals[i+1]===1 && vals[i+3]-vals[i+2]===1) return 1
      }
    }
    return 0
  },
}

const THREE_KONGS: Pattern = {
  id: 'three-kongs',
  name: 'Three Kongs',
  chineseName: '三杠子',
  points: 32,
  excludes: ['two-melded-kongs', 'melded-kong', 'concealed-kong'],
  score(ctx, decomp) {
    if (!decomp) return 0
    return kongs(decomp).length === 3 ? 1 : 0
  },
}

const ALL_TERMINALS_HONORS: Pattern = {
  id: 'all-terminals-honors',
  name: 'All Terminals and Honors',
  chineseName: '混幺九',
  points: 32,
  excludes: ['outside-hand', 'all-pungs', 'no-honors', 'pung-terminals-honors',
    'two-terminal-chows', 'double-pung'],
  score(ctx, decomp, sevenPairs) {
    const tiles = decomp ? allTilesIn(decomp) : sevenPairs ? sevenPairs.pairs.flatMap((p) => p.tiles) : []
    if (!tiles.length) return 0
    return tiles.every(isTerminalOrHonor) ? 1 : 0
  },
}

// ── 24-point patterns ─────────────────────────────────────────────────────────

const SEVEN_PAIRS: Pattern = {
  id: 'seven-pairs',
  name: 'Seven Pairs',
  chineseName: '七对子',
  points: 24,
  excludes: ['all-chows', 'all-pungs', 'all-simples', 'concealed-hand',
    'pure-double-chow', 'mixed-double-chow', 'tile-hog'],
  score(ctx, decomp, sevenPairs) {
    return sevenPairs ? 1 : 0
  },
}

const GREATER_HONORS_KNITTED: Pattern = {
  id: 'greater-honors-knitted',
  name: 'Greater Honors and Knitted Tiles',
  chineseName: '全不靠',
  points: 24,
  excludes: ['lesser-honors-knitted', 'knitted-straight', 'all-types', 'no-honors',
    'concealed-hand', 'one-voided-suit'],
  score(ctx) {
    return isGreaterHonorsAndKnitted(ctx.allTiles) ? 1 : 0
  },
}

const ALL_EVEN_PUNGS: Pattern = {
  id: 'all-even-pungs',
  name: 'All Even Pungs',
  chineseName: '全双刻',
  points: 24,
  excludes: ['all-pungs', 'all-simples', 'no-honors'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const tiles = allTilesIn(decomp)
    return tiles.every((t) => isNumberedTile(t) && (t.value as number) % 2 === 0) ? 1 : 0
  },
}

const FULL_FLUSH: Pattern = {
  id: 'full-flush',
  name: 'Full Flush',
  chineseName: '清一色',
  points: 24,
  excludes: ['half-flush', 'no-honors', 'one-voided-suit'],
  score(ctx, decomp, sevenPairs) {
    const tiles = decomp ? allTilesIn(decomp) : sevenPairs ? sevenPairs.pairs.flatMap((p) => p.tiles) : ctx.allTiles
    const suits = suitsUsed(tiles)
    return suits.size === 1 && !suits.has('winds') && !suits.has('dragons') ? 1 : 0
  },
}

const PURE_TRIPLE_CHOW: Pattern = {
  id: 'pure-triple-chow',
  name: 'Pure Triple Chow',
  chineseName: '一色三同顺',
  points: 24,
  excludes: ['pure-double-chow', 'tile-hog', 'all-chows', 'full-flush', 'no-honors'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const cs = chows(decomp)
    const groups = groupIdenticalChows(cs)
    return groups.some((g) => g.length >= 3) ? 1 : 0
  },
}

const PURE_SHIFTED_PUNGS: Pattern = {
  id: 'pure-shifted-pungs',
  name: 'Pure Shifted Pungs',
  chineseName: '一色三步高',
  points: 24,
  excludes: ['all-pungs', 'full-flush', 'no-honors', 'double-pung'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const ps = pungs(decomp)
    for (const suit of NUMBERED_SUITS) {
      const sp = ps.filter((m) => m.tiles[0].suit === suit)
      if (sp.length < 3) continue
      const vals = sp.map(pungValue).sort((a, b) => a - b)
      for (let i = 0; i <= vals.length - 3; i++) {
        if (vals[i+1]-vals[i]===1 && vals[i+2]-vals[i+1]===1) return 1
      }
    }
    return 0
  },
}

const UPPER_TILES: Pattern = {
  id: 'upper-tiles',
  name: 'Upper Tiles',
  chineseName: '大于五',
  points: 24,
  excludes: ['no-honors', 'all-simples', 'upper-four', 'middle-tiles'],
  score(ctx, decomp, sevenPairs) {
    const tiles = decomp ? allTilesIn(decomp) : sevenPairs ? sevenPairs.pairs.flatMap((p) => p.tiles) : []
    if (!tiles.length) return 0
    return tiles.every((t) => isNumberedTile(t) && (t.value as number) >= 7) ? 1 : 0
  },
}

const MIDDLE_TILES: Pattern = {
  id: 'middle-tiles',
  name: 'Middle Tiles',
  chineseName: '全中',
  points: 24,
  excludes: ['no-honors', 'all-simples'],
  score(ctx, decomp, sevenPairs) {
    const tiles = decomp ? allTilesIn(decomp) : sevenPairs ? sevenPairs.pairs.flatMap((p) => p.tiles) : []
    if (!tiles.length) return 0
    return tiles.every((t) => isNumberedTile(t) && (t.value as number) >= 4 && (t.value as number) <= 6) ? 1 : 0
  },
}

const LOWER_TILES: Pattern = {
  id: 'lower-tiles',
  name: 'Lower Tiles',
  chineseName: '小于五',
  points: 24,
  excludes: ['no-honors', 'all-simples', 'lower-four', 'middle-tiles'],
  score(ctx, decomp, sevenPairs) {
    const tiles = decomp ? allTilesIn(decomp) : sevenPairs ? sevenPairs.pairs.flatMap((p) => p.tiles) : []
    if (!tiles.length) return 0
    return tiles.every((t) => isNumberedTile(t) && (t.value as number) <= 3) ? 1 : 0
  },
}

// ── 16-point patterns ─────────────────────────────────────────────────────────

const PURE_STRAIGHT: Pattern = {
  id: 'pure-straight',
  name: 'Pure Straight',
  chineseName: '清龙',
  points: 16,
  excludes: ['all-chows', 'no-honors', 'short-straight', 'two-terminal-chows',
    'pure-shifted-chows', 'pure-double-chow', 'mixed-double-chow'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const cs = chows(decomp)
    for (const suit of NUMBERED_SUITS) {
      const sc = cs.filter((c) => c.tiles[0].suit === suit)
      const vals = sc.map(chowValue)
      if (vals.includes(1) && vals.includes(4) && vals.includes(7)) return 1
    }
    return 0
  },
}

const THREE_SUITED_TERMINAL_CHOWS: Pattern = {
  id: 'three-suited-terminal-chows',
  name: 'Three-Suited Terminal Chows',
  chineseName: '三色双龙会',
  points: 16,
  excludes: ['all-chows', 'no-honors', 'two-terminal-chows', 'all-simples', 'mixed-double-chow'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const cs = chows(decomp)
    // Need 123 in two different suits + 789 in two different suits + pair of 5 in any suit
    const terminal123 = NUMBERED_SUITS.filter((s) => cs.some((c) => c.tiles[0].suit === s && chowValue(c) === 1))
    const terminal789 = NUMBERED_SUITS.filter((s) => cs.some((c) => c.tiles[0].suit === s && chowValue(c) === 7))
    if (terminal123.length < 2 || terminal789.length < 2) return 0
    const pair = decomp.pair
    return isNumberedTile(pair.tiles[0]) && (pair.tiles[0].value as number) === 5 ? 1 : 0
  },
}

const PURE_SHIFTED_CHOWS: Pattern = {
  id: 'pure-shifted-chows',
  name: 'Pure Shifted Chows',
  chineseName: '一色三节高',
  points: 16,
  excludes: ['all-chows', 'full-flush', 'no-honors', 'short-straight', 'pure-double-chow'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const cs = chows(decomp)
    for (const suit of NUMBERED_SUITS) {
      const sc = cs.filter((c) => c.tiles[0].suit === suit)
      if (sc.length < 3) continue
      const vals = sc.map(chowValue).sort((a, b) => a - b)
      for (let i = 0; i <= vals.length - 3; i++) {
        if (vals[i+1]-vals[i]===1 && vals[i+2]-vals[i+1]===1) return 1
      }
    }
    return 0
  },
}

const ALL_FIVES: Pattern = {
  id: 'all-fives',
  name: 'All Fives',
  chineseName: '全带五',
  points: 16,
  excludes: ['all-simples', 'no-honors', 'middle-tiles'],
  score(ctx, decomp) {
    if (!decomp) return 0
    // Every set and pair must contain a 5
    const ms = allMelds(decomp)
    return ms.every((m) => m.tiles.some((t) => isNumberedTile(t) && t.value === 5)) ? 1 : 0
  },
}

const TRIPLE_PUNG: Pattern = {
  id: 'triple-pung',
  name: 'Triple Pung',
  chineseName: '三同刻',
  points: 16,
  excludes: ['double-pung', 'all-pungs'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const ps = pungs(decomp)
    for (let v = 1; v <= 9; v++) {
      const same = ps.filter((m) => isNumberedTile(m.tiles[0]) && m.tiles[0].value === v)
      if (same.length >= 3) return 1
    }
    return 0
  },
}

const THREE_CONCEALED_PUNGS: Pattern = {
  id: 'three-concealed-pungs',
  name: 'Three Concealed Pungs',
  chineseName: '三暗刻',
  points: 16,
  excludes: ['two-concealed-pungs'],
  score(ctx, decomp) {
    if (!decomp) return 0
    return concealedPungs(decomp).length >= 3 ? 1 : 0
  },
}

// ── 12-point patterns ─────────────────────────────────────────────────────────

const LESSER_HONORS_KNITTED: Pattern = {
  id: 'lesser-honors-knitted',
  name: 'Lesser Honors and Knitted Tiles',
  chineseName: '七星不靠',
  points: 12,
  excludes: ['knitted-straight', 'all-types', 'no-honors', 'one-voided-suit', 'concealed-hand'],
  score(ctx) {
    return isLesserHonorsAndKnitted(ctx.allTiles) ? 1 : 0
  },
}

const KNITTED_STRAIGHT: Pattern = {
  id: 'knitted-straight',
  name: 'Knitted Straight',
  chineseName: '组合龙',
  points: 12,
  excludes: ['pure-straight', 'no-honors', 'one-voided-suit', 'all-chows', 'all-simples'],
  score(ctx, decomp) {
    // Only applies when the non-flower tiles contain a knitted straight
    if (!decomp) return 0
    const ks = findKnittedStraight(ctx.allTiles)
    return ks ? 1 : 0
  },
}

const UPPER_FOUR: Pattern = {
  id: 'upper-four',
  name: 'Upper Four',
  chineseName: '大于五',
  points: 12,
  excludes: ['upper-tiles', 'no-honors', 'all-simples'],
  score(ctx, decomp, sevenPairs) {
    const tiles = decomp ? allTilesIn(decomp) : sevenPairs ? sevenPairs.pairs.flatMap((p) => p.tiles) : []
    if (!tiles.length) return 0
    return tiles.every((t) => isNumberedTile(t) && (t.value as number) >= 6) ? 1 : 0
  },
}

const LOWER_FOUR: Pattern = {
  id: 'lower-four',
  name: 'Lower Four',
  chineseName: '小于五',
  points: 12,
  excludes: ['lower-tiles', 'no-honors', 'all-simples'],
  score(ctx, decomp, sevenPairs) {
    const tiles = decomp ? allTilesIn(decomp) : sevenPairs ? sevenPairs.pairs.flatMap((p) => p.tiles) : []
    if (!tiles.length) return 0
    return tiles.every((t) => isNumberedTile(t) && (t.value as number) <= 4) ? 1 : 0
  },
}

const BIG_THREE_WINDS: Pattern = {
  id: 'big-three-winds',
  name: 'Big Three Winds',
  chineseName: '三风刻',
  points: 12,
  excludes: ['pung-terminals-honors', 'all-pungs', 'double-pung'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const windPungs = pungs(decomp).filter((m) => m.tiles[0].suit === 'winds')
    return windPungs.length >= 3 ? 1 : 0
  },
}

// ── 8-point patterns ──────────────────────────────────────────────────────────

const MIXED_STRAIGHT: Pattern = {
  id: 'mixed-straight',
  name: 'Mixed Straight',
  chineseName: '三色三同顺',
  points: 8,
  excludes: ['all-chows', 'no-honors', 'mixed-double-chow'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const cs = chows(decomp)
    // 123 in each of three suits, or 456, or 789, etc.
    for (let startVal = 1; startVal <= 7; startVal++) {
      const has = NUMBERED_SUITS.every((s) =>
        cs.some((c) => c.tiles[0].suit === s && chowValue(c) === startVal)
      )
      if (has) return 1
    }
    return 0
  },
}

const REVERSIBLE_TILES: Pattern = {
  id: 'reversible-tiles',
  name: 'Reversible Tiles',
  chineseName: '可逆对',
  points: 8,
  excludes: ['no-honors', 'all-simples'],
  score(ctx, decomp, sevenPairs) {
    const tiles = decomp ? allTilesIn(decomp) : sevenPairs ? sevenPairs.pairs.flatMap((p) => p.tiles) : ctx.allTiles
    return tiles.every(isReversibleTile) ? 1 : 0
  },
}

const MIXED_SHIFTED_PUNGS: Pattern = {
  id: 'mixed-shifted-pungs',
  name: 'Mixed Shifted Pungs',
  chineseName: '三色三步高',
  points: 8,
  excludes: ['all-pungs', 'no-honors', 'double-pung'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const ps = pungs(decomp)
    for (let v = 1; v <= 7; v++) {
      for (let i = 0; i < 3; i++) {
        const trio = [
          { suit: NUMBERED_SUITS[i % 3], val: v },
          { suit: NUMBERED_SUITS[(i + 1) % 3], val: v + 1 },
          { suit: NUMBERED_SUITS[(i + 2) % 3], val: v + 2 },
        ]
        if (trio.every(({ suit, val }) =>
          ps.some((m) => m.tiles[0].suit === suit && isNumberedTile(m.tiles[0]) && m.tiles[0].value === val)
        )) return 1
      }
    }
    return 0
  },
}

const LAST_TILE: Pattern = {
  id: 'last-tile',
  name: 'Last Tile',
  chineseName: '绝张',
  points: 8,
  excludes: [],
  score(ctx) {
    return ctx.isLastTile ? 1 : 0
  },
}

const OUT_ON_KONG: Pattern = {
  id: 'out-on-kong',
  name: 'Out on Kong',
  chineseName: '杠上开花',
  points: 8,
  excludes: ['self-draw'],
  score(ctx) {
    return ctx.isOutOnKong ? 1 : 0
  },
}

const ROBBING_KONG: Pattern = {
  id: 'robbing-kong',
  name: 'Robbing the Kong',
  chineseName: '抢杠胡',
  points: 8,
  excludes: [],
  score(ctx) {
    return ctx.isRobbingKong ? 1 : 0
  },
}

// ── 6-point patterns ──────────────────────────────────────────────────────────

const ALL_PUNGS: Pattern = {
  id: 'all-pungs',
  name: 'All Pungs',
  chineseName: '对对胡',
  points: 6,
  excludes: ['all-chows', 'concealed-hand'],
  score(ctx, decomp) {
    if (!decomp) return 0
    return decomp.melds.every((m) => m.type === 'pung' || m.type === 'kong') ? 1 : 0
  },
}

const HALF_FLUSH: Pattern = {
  id: 'half-flush',
  name: 'Half Flush',
  chineseName: '混一色',
  points: 6,
  excludes: ['full-flush', 'all-honors', 'no-honors', 'one-voided-suit'],
  score(ctx, decomp, sevenPairs) {
    const tiles = decomp ? allTilesIn(decomp) : sevenPairs ? sevenPairs.pairs.flatMap((p) => p.tiles) : ctx.allTiles
    const numbered = tiles.filter(isNumberedTile)
    const honors = tiles.filter(isHonorTile)
    if (numbered.length === 0 || honors.length === 0) return 0
    const suits = new Set(numbered.map((t) => t.suit))
    return suits.size === 1 ? 1 : 0
  },
}

const MIXED_SHIFTED_CHOWS: Pattern = {
  id: 'mixed-shifted-chows',
  name: 'Mixed Shifted Chows',
  chineseName: '三色三步高',
  points: 6,
  excludes: ['all-chows', 'no-honors', 'mixed-double-chow', 'short-straight'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const cs = chows(decomp)
    for (let v = 1; v <= 7; v++) {
      for (let i = 0; i < 3; i++) {
        const trio = [
          { suit: NUMBERED_SUITS[i % 3], val: v },
          { suit: NUMBERED_SUITS[(i + 1) % 3], val: v + 1 },
          { suit: NUMBERED_SUITS[(i + 2) % 3], val: v + 2 },
        ]
        if (trio.every(({ suit, val }) =>
          cs.some((c) => c.tiles[0].suit === suit && chowValue(c) === val)
        )) return 1
      }
    }
    return 0
  },
}

const ALL_TYPES: Pattern = {
  id: 'all-types',
  name: 'All Types',
  chineseName: '五门齐',
  points: 6,
  excludes: ['no-honors'],
  score(ctx, decomp, sevenPairs) {
    const tiles = decomp ? allTilesIn(decomp) : sevenPairs ? sevenPairs.pairs.flatMap((p) => p.tiles) : ctx.allTiles
    return NUMBERED_SUITS.every((s) => tiles.some((t) => t.suit === s)) &&
      tiles.some((t) => t.suit === 'winds') &&
      tiles.some((t) => t.suit === 'dragons')
      ? 1 : 0
  },
}

const MELDED_HAND: Pattern = {
  id: 'melded-hand',
  name: 'Melded Hand',
  chineseName: '全求人',
  points: 6,
  excludes: ['fully-concealed-hand', 'concealed-hand', 'self-draw'],
  score(ctx, decomp) {
    if (!decomp) return 0
    // All four sets are open (melded), won by discard
    if (ctx.selfDraw) return 0
    const allOpen = decomp.melds.every((m) => !m.concealed)
    return allOpen ? 1 : 0
  },
}

const TWO_DRAGON_PUNGS: Pattern = {
  id: 'two-dragon-pungs',
  name: 'Two Dragon Pungs',
  chineseName: '双箭刻',
  points: 6,
  excludes: ['dragon-pung'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const dragonPungs = pungs(decomp).filter((m) => m.tiles[0].suit === 'dragons')
    return dragonPungs.length >= 2 ? 1 : 0
  },
}

// ── 4-point patterns ──────────────────────────────────────────────────────────

const OUTSIDE_HAND: Pattern = {
  id: 'outside-hand',
  name: 'Outside Hand',
  chineseName: '全带幺',
  points: 4,
  excludes: [],
  score(ctx, decomp) {
    if (!decomp) return 0
    return allMelds(decomp).every((m) => m.tiles.some(isTerminalOrHonor)) ? 1 : 0
  },
}

const FULLY_CONCEALED_HAND: Pattern = {
  id: 'fully-concealed-hand',
  name: 'Fully Concealed Hand',
  chineseName: '不求人',
  points: 4,
  excludes: ['concealed-hand', 'self-draw'],
  score(ctx, decomp) {
    if (!decomp) return 0
    if (!ctx.selfDraw) return 0
    return decomp.melds.every((m) => m.concealed) ? 1 : 0
  },
}

const TWO_MELDED_KONGS: Pattern = {
  id: 'two-melded-kongs',
  name: 'Two Melded Kongs',
  chineseName: '双明杠',
  points: 4,
  excludes: ['melded-kong'],
  score(ctx, decomp) {
    if (!decomp) return 0
    const meldedKongs = kongs(decomp).filter((m) => !m.concealed)
    return meldedKongs.length >= 2 ? 1 : 0
  },
}

const LAST_TILE_CLAIM: Pattern = {
  id: 'last-tile-claim',
  name: 'Last Tile Claim',
  chineseName: '河底捞鱼',
  points: 4,
  excludes: ['last-tile-draw'],
  score(ctx) {
    return ctx.isLastClaim && !ctx.selfDraw ? 1 : 0
  },
}

const LAST_TILE_DRAW: Pattern = {
  id: 'last-tile-draw',
  name: 'Last Tile Draw',
  chineseName: '海底捞月',
  points: 4,
  excludes: ['last-tile-claim'],
  score(ctx) {
    return ctx.isLastDraw && ctx.selfDraw ? 1 : 0
  },
}

// ── 2-point patterns ──────────────────────────────────────────────────────────

const DRAGON_PUNG: Pattern = {
  id: 'dragon-pung',
  name: 'Dragon Pung',
  chineseName: '箭刻',
  points: 2,
  excludes: [],
  score(ctx, decomp) {
    if (!decomp) return 0
    return pungs(decomp).filter((m) => m.tiles[0].suit === 'dragons').length
  },
}

const PREVALENT_WIND: Pattern = {
  id: 'prevalent-wind',
  name: 'Prevalent Wind',
  chineseName: '圈风刻',
  points: 2,
  excludes: [],
  score(ctx, decomp) {
    if (!decomp) return 0
    return pungs(decomp).filter((m) => tileKey(m.tiles[0]) === `winds:${ctx.prevalentWind}`).length
  },
}

const SEAT_WIND: Pattern = {
  id: 'seat-wind',
  name: 'Seat Wind',
  chineseName: '门风刻',
  points: 2,
  excludes: [],
  score(ctx, decomp) {
    if (!decomp) return 0
    return pungs(decomp).filter((m) => tileKey(m.tiles[0]) === `winds:${ctx.seatWind}`).length
  },
}

const CONCEALED_HAND: Pattern = {
  id: 'concealed-hand',
  name: 'Concealed Hand',
  chineseName: '门前清',
  points: 2,
  excludes: [],
  score(ctx, decomp) {
    if (!decomp) return 0
    if (ctx.selfDraw) return 0  // Fully Concealed Hand covers this
    return decomp.melds.every((m) => m.concealed) ? 1 : 0
  },
}

const ALL_CHOWS: Pattern = {
  id: 'all-chows',
  name: 'All Chows',
  chineseName: '平和',
  points: 2,
  excludes: [],
  score(ctx, decomp) {
    if (!decomp) return 0
    return decomp.melds.every((m) => m.type === 'chow') ? 1 : 0
  },
}

const TILE_HOG: Pattern = {
  id: 'tile-hog',
  name: 'Tile Hog',
  chineseName: '四归一',
  points: 2,
  excludes: [],
  score(ctx, decomp) {
    if (!decomp) return 0
    // A tile hog is when all 4 copies of a tile are used (not as kong)
    // i.e., same tile appears 4 times across chows/pungs/pair
    const tiles = allTilesIn(decomp)
    const counts = new Map<string, number>()
    for (const t of tiles) {
      const k = tileKey(t)
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    let count = 0
    for (const [, c] of counts) {
      if (c === 4) count++
    }
    return count
  },
}

const DOUBLE_PUNG: Pattern = {
  id: 'double-pung',
  name: 'Double Pung',
  chineseName: '双同刻',
  points: 2,
  excludes: [],
  score(ctx, decomp) {
    if (!decomp) return 0
    const ps = pungs(decomp)
    for (let v = 1; v <= 9; v++) {
      const same = ps.filter((m) => isNumberedTile(m.tiles[0]) && m.tiles[0].value === v)
      if (same.length >= 2) return 1
    }
    return 0
  },
}

const TWO_CONCEALED_PUNGS: Pattern = {
  id: 'two-concealed-pungs',
  name: 'Two Concealed Pungs',
  chineseName: '双暗刻',
  points: 2,
  excludes: [],
  score(ctx, decomp) {
    if (!decomp) return 0
    return concealedPungs(decomp).length >= 2 ? 1 : 0
  },
}

const CONCEALED_KONG: Pattern = {
  id: 'concealed-kong',
  name: 'Concealed Kong',
  chineseName: '暗杠',
  points: 2,
  excludes: ['melded-kong'],
  score(ctx, decomp) {
    if (!decomp) return 0
    return kongs(decomp).filter((m) => m.concealed).length
  },
}

const ALL_SIMPLES: Pattern = {
  id: 'all-simples',
  name: 'All Simples',
  chineseName: '断幺',
  points: 2,
  excludes: ['outside-hand', 'all-terminals', 'all-terminals-honors', 'no-honors'],
  score(ctx, decomp, sevenPairs) {
    const tiles = decomp ? allTilesIn(decomp) : sevenPairs ? sevenPairs.pairs.flatMap((p) => p.tiles) : []
    if (!tiles.length) return 0
    return tiles.every(isSimple) ? 1 : 0
  },
}

// ── 1-point patterns ──────────────────────────────────────────────────────────

const PURE_DOUBLE_CHOW: Pattern = {
  id: 'pure-double-chow',
  name: 'Pure Double Chow',
  chineseName: '一般高',
  points: 1,
  excludes: [],
  score(ctx, decomp) {
    if (!decomp) return 0
    const cs = chows(decomp)
    const groups = groupIdenticalChows(cs)
    // Score once per pair of identical chows (not triples, which score separately)
    return groups.filter((g) => g.length === 2).length
  },
}

const MIXED_DOUBLE_CHOW: Pattern = {
  id: 'mixed-double-chow',
  name: 'Mixed Double Chow',
  chineseName: '喜相逢',
  points: 1,
  excludes: [],
  score(ctx, decomp) {
    if (!decomp) return 0
    const cs = chows(decomp)
    let count = 0
    const used = new Set<number>()
    for (let i = 0; i < cs.length; i++) {
      if (used.has(i)) continue
      for (let j = i + 1; j < cs.length; j++) {
        if (used.has(j)) continue
        const vi = chowValue(cs[i])
        const vj = chowValue(cs[j])
        if (vi === vj && cs[i].tiles[0].suit !== cs[j].tiles[0].suit) {
          count++
          used.add(i)
          used.add(j)
          break
        }
      }
    }
    return count
  },
}

const SHORT_STRAIGHT: Pattern = {
  id: 'short-straight',
  name: 'Short Straight',
  chineseName: '连六',
  points: 1,
  excludes: [],
  score(ctx, decomp) {
    if (!decomp) return 0
    const cs = chows(decomp)
    let count = 0
    const used = new Set<number>()
    for (let i = 0; i < cs.length; i++) {
      if (used.has(i)) continue
      for (let j = i + 1; j < cs.length; j++) {
        if (used.has(j)) continue
        if (cs[i].tiles[0].suit === cs[j].tiles[0].suit) {
          const vi = chowValue(cs[i])
          const vj = chowValue(cs[j])
          if (Math.abs(vi - vj) === 3) {
            count++
            used.add(i)
            used.add(j)
            break
          }
        }
      }
    }
    return count
  },
}

const TWO_TERMINAL_CHOWS: Pattern = {
  id: 'two-terminal-chows',
  name: 'Two Terminal Chows',
  chineseName: '老少副',
  points: 1,
  excludes: [],
  score(ctx, decomp) {
    if (!decomp) return 0
    const cs = chows(decomp)
    let count = 0
    const used = new Set<number>()
    for (let i = 0; i < cs.length; i++) {
      if (used.has(i)) continue
      for (let j = i + 1; j < cs.length; j++) {
        if (used.has(j)) continue
        if (cs[i].tiles[0].suit === cs[j].tiles[0].suit) {
          const vi = chowValue(cs[i])
          const vj = chowValue(cs[j])
          if ((vi === 1 && vj === 7) || (vi === 7 && vj === 1)) {
            count++
            used.add(i)
            used.add(j)
            break
          }
        }
      }
    }
    return count
  },
}

const PUNG_TERMINALS_HONORS: Pattern = {
  id: 'pung-terminals-honors',
  name: 'Pung of Terminals or Honors',
  chineseName: '幺九刻',
  points: 1,
  excludes: [],
  score(ctx, decomp) {
    if (!decomp) return 0
    return pungs(decomp).filter((m) => isTerminalOrHonor(m.tiles[0])).length
  },
}

const MELDED_KONG: Pattern = {
  id: 'melded-kong',
  name: 'Melded Kong',
  chineseName: '明杠',
  points: 1,
  excludes: [],
  score(ctx, decomp) {
    if (!decomp) return 0
    return kongs(decomp).filter((m) => !m.concealed).length
  },
}

const ONE_VOIDED_SUIT: Pattern = {
  id: 'one-voided-suit',
  name: 'One Voided Suit',
  chineseName: '缺一门',
  points: 1,
  excludes: [],
  score(ctx, decomp, sevenPairs) {
    const tiles = decomp ? allTilesIn(decomp) : sevenPairs ? sevenPairs.pairs.flatMap((p) => p.tiles) : []
    const numbered = tiles.filter(isNumberedTile)
    if (!numbered.length) return 0
    const suits = new Set(numbered.map((t) => t.suit))
    return suits.size === 2 ? 1 : 0
  },
}

const NO_HONORS: Pattern = {
  id: 'no-honors',
  name: 'No Honors',
  chineseName: '无字',
  points: 1,
  excludes: [],
  score(ctx, decomp, sevenPairs) {
    const tiles = decomp ? allTilesIn(decomp) : sevenPairs ? sevenPairs.pairs.flatMap((p) => p.tiles) : []
    if (!tiles.length) return 0
    return tiles.every((t) => !isHonorTile(t)) ? 1 : 0
  },
}

const EDGE_WAIT: Pattern = {
  id: 'edge-wait',
  name: 'Edge Wait',
  chineseName: '边张',
  points: 1,
  excludes: ['closed-wait', 'single-tile-wait'],
  score(ctx) {
    return ctx.waitType === 'edge' ? 1 : 0
  },
}

const CLOSED_WAIT: Pattern = {
  id: 'closed-wait',
  name: 'Closed Wait',
  chineseName: '嵌张',
  points: 1,
  excludes: ['edge-wait', 'single-tile-wait'],
  score(ctx) {
    return ctx.waitType === 'closed' ? 1 : 0
  },
}

const SINGLE_TILE_WAIT: Pattern = {
  id: 'single-tile-wait',
  name: 'Single Tile Wait',
  chineseName: '单钓将',
  points: 1,
  excludes: ['edge-wait', 'closed-wait'],
  score(ctx) {
    return ctx.waitType === 'pair' ? 1 : 0
  },
}

const SELF_DRAW: Pattern = {
  id: 'self-draw',
  name: 'Self-Draw',
  chineseName: '自摸',
  points: 1,
  excludes: [],
  score(ctx) {
    return ctx.selfDraw && !ctx.isOutOnKong ? 1 : 0
  },
}

// ── All patterns in priority order ────────────────────────────────────────────

export const ALL_PATTERNS: Pattern[] = [
  // 88 points
  BIG_FOUR_WINDS,
  BIG_THREE_DRAGONS,
  ALL_GREEN,
  NINE_GATES,
  FOUR_KONGS,
  SEVEN_SHIFTED_PAIRS,
  THIRTEEN_ORPHANS_PATTERN,
  // 64 points
  ALL_TERMINALS,
  LITTLE_FOUR_WINDS,
  LITTLE_THREE_DRAGONS,
  ALL_HONORS,
  FOUR_CONCEALED_PUNGS,
  PURE_TERMINAL_CHOWS,
  // 48 points
  QUADRUPLE_CHOW,
  FOUR_PURE_SHIFTED_PUNGS,
  // 32 points
  FOUR_SHIFTED_CHOWS,
  THREE_KONGS,
  ALL_TERMINALS_HONORS,
  // 24 points
  SEVEN_PAIRS,
  GREATER_HONORS_KNITTED,
  ALL_EVEN_PUNGS,
  FULL_FLUSH,
  PURE_TRIPLE_CHOW,
  PURE_SHIFTED_PUNGS,
  UPPER_TILES,
  MIDDLE_TILES,
  LOWER_TILES,
  // 16 points
  PURE_STRAIGHT,
  THREE_SUITED_TERMINAL_CHOWS,
  PURE_SHIFTED_CHOWS,
  ALL_FIVES,
  TRIPLE_PUNG,
  THREE_CONCEALED_PUNGS,
  // 12 points
  LESSER_HONORS_KNITTED,
  KNITTED_STRAIGHT,
  UPPER_FOUR,
  LOWER_FOUR,
  BIG_THREE_WINDS,
  // 8 points
  MIXED_STRAIGHT,
  REVERSIBLE_TILES,
  MIXED_SHIFTED_PUNGS,
  LAST_TILE,
  OUT_ON_KONG,
  ROBBING_KONG,
  // 6 points
  ALL_PUNGS,
  HALF_FLUSH,
  MIXED_SHIFTED_CHOWS,
  ALL_TYPES,
  MELDED_HAND,
  TWO_DRAGON_PUNGS,
  // 4 points
  OUTSIDE_HAND,
  FULLY_CONCEALED_HAND,
  TWO_MELDED_KONGS,
  LAST_TILE_CLAIM,
  LAST_TILE_DRAW,
  // 2 points
  DRAGON_PUNG,
  PREVALENT_WIND,
  SEAT_WIND,
  CONCEALED_HAND,
  ALL_CHOWS,
  TILE_HOG,
  DOUBLE_PUNG,
  TWO_CONCEALED_PUNGS,
  CONCEALED_KONG,
  ALL_SIMPLES,
  // 1 point
  PURE_DOUBLE_CHOW,
  MIXED_DOUBLE_CHOW,
  SHORT_STRAIGHT,
  TWO_TERMINAL_CHOWS,
  PUNG_TERMINALS_HONORS,
  MELDED_KONG,
  ONE_VOIDED_SUIT,
  NO_HONORS,
  EDGE_WAIT,
  CLOSED_WAIT,
  SINGLE_TILE_WAIT,
  SELF_DRAW,
]

// ── Helper for grouping identical chows ───────────────────────────────────────

function groupIdenticalChows(chowMelds: Meld[]): Meld[][] {
  const groups = new Map<string, Meld[]>()
  for (const c of chowMelds) {
    const key = `${c.tiles[0].suit}:${chowValue(c)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c)
  }
  return [...groups.values()]
}
