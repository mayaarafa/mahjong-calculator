import { Tile, Meld, WindValue } from './tiles'
import {
  HandDecomposition,
  SevenPairsDecomposition,
  findAllDecompositions,
  findSevenPairsDecomposition,
  isThirteenOrphans,
  isGreaterHonorsAndKnitted,
  isLesserHonorsAndKnitted,
} from './grouping'
import {
  Pattern,
  ScoredPattern,
  ScoringContext,
  WaitType,
  ALL_PATTERNS,
} from './scoringRules'

// ── Public input type ─────────────────────────────────────────────────────────

export interface HandInput {
  tiles: Tile[]              // 13+1 hand tiles (no flowers)
  flowers: number
  winningTile: Tile
  declaredMelds: Meld[]      // Open/declared sets
  selfDraw: boolean
  seatWind: WindValue
  prevalentWind: WindValue
  waitType: WaitType
  isLastTile?: boolean
  isRobbingKong?: boolean
  isOutOnKong?: boolean
  isLastClaim?: boolean
  isLastDraw?: boolean
}

export interface PaymentBreakdown {
  basePoints: number
  fanPoints: number
  flowerPoints: number
  totalHandPoints: number    // fan + flowers
  selfDraw: boolean
  // Who pays what
  eachPlayerPays: number     // per-player payment to winner
  discarderPays?: number     // extra discard penalty (win by discard only)
  totalReceived: number      // total points winner receives
}

export interface ScoringResult {
  isValid: boolean
  meetsMinimum: boolean      // >= 8 fan (excl. flowers)
  fanPoints: number
  flowerPoints: number
  totalPoints: number        // fan + flowers
  matchedPatterns: ScoredPattern[]
  excludedPatterns: ScoredPattern[]
  decomposition: HandDecomposition | SevenPairsDecomposition | null
  isSpecialHand: boolean
  specialHandType?: 'seven-pairs' | 'thirteen-orphans' | 'greater-honors-knitted' | 'lesser-honors-knitted'
  payment: (basePoints: number) => PaymentBreakdown
}

// ── Exclusion logic ───────────────────────────────────────────────────────────
// Processes patterns in ALL_PATTERNS order (highest → lowest points).
// A pattern may only contribute exclusions if it is not itself already excluded.
// This prevents lower-value patterns from canceling higher-value ones.

function applyExclusions(scored: { pattern: Pattern; count: number }[]): {
  kept: { pattern: Pattern; count: number }[]
  excluded: { pattern: Pattern; count: number; excludedBy: string }[]
} {
  const excludedIds = new Map<string, string>() // id → excluder id

  for (const { pattern, count } of scored) {
    if (count === 0) continue
    if (excludedIds.has(pattern.id)) continue // already excluded — cannot exclude others
    for (const id of pattern.excludes) {
      if (!excludedIds.has(id)) {
        excludedIds.set(id, pattern.id)
      }
    }
  }

  const kept: { pattern: Pattern; count: number }[] = []
  const excluded: { pattern: Pattern; count: number; excludedBy: string }[] = []

  for (const item of scored) {
    if (item.count === 0) continue
    if (excludedIds.has(item.pattern.id)) {
      excluded.push({ ...item, excludedBy: excludedIds.get(item.pattern.id)! })
    } else {
      kept.push(item)
    }
  }

  return { kept, excluded }
}

// ── Score a single decomposition ──────────────────────────────────────────────

function scoreDecomposition(
  ctx: ScoringContext,
  decomp: HandDecomposition | null,
  sevenPairs: SevenPairsDecomposition | null
): number {
  let total = 0
  const raw: { pattern: Pattern; count: number }[] = []

  for (const pattern of ALL_PATTERNS) {
    const count = pattern.score(ctx, decomp, sevenPairs)
    raw.push({ pattern, count })
  }

  const { kept } = applyExclusions(raw)
  for (const { pattern, count } of kept) {
    total += pattern.points * count
  }
  return total
}

// ── Main scoring function ─────────────────────────────────────────────────────

export function scoreHand(input: HandInput): ScoringResult {
  const ctx: ScoringContext = {
    allTiles: input.tiles,
    winningTile: input.winningTile,
    declaredMelds: input.declaredMelds,
    selfDraw: input.selfDraw,
    seatWind: input.seatWind,
    prevalentWind: input.prevalentWind,
    flowerCount: input.flowers,
    waitType: input.waitType,
    isLastTile: input.isLastTile ?? false,
    isRobbingKong: input.isRobbingKong ?? false,
    isOutOnKong: input.isOutOnKong ?? false,
    isLastClaim: input.isLastClaim ?? false,
    isLastDraw: input.isLastDraw ?? false,
  }

  // Try all decomposition types
  const standardDecomps = findAllDecompositions(input.tiles, input.declaredMelds)
  const sevenPairsDecomp = findSevenPairsDecomposition(input.tiles)
  const thirteenOrphans = isThirteenOrphans(input.tiles)
  const greaterHonors = isGreaterHonorsAndKnitted(input.tiles)
  const lesserHonors = isLesserHonorsAndKnitted(input.tiles)

  const isValid = standardDecomps.length > 0 ||
    sevenPairsDecomp !== null ||
    thirteenOrphans ||
    greaterHonors ||
    lesserHonors

  if (!isValid) {
    return {
      isValid: false,
      meetsMinimum: false,
      fanPoints: 0,
      flowerPoints: input.flowers,
      totalPoints: input.flowers,
      matchedPatterns: [],
      excludedPatterns: [],
      decomposition: null,
      isSpecialHand: false,
      payment: (base) => makePayment(base, 0, input.flowers, input.selfDraw),
    }
  }

  // Score every possible decomposition and pick the best
  type Candidate = {
    score: number
    decomp: HandDecomposition | null
    sevenPairs: SevenPairsDecomposition | null
    isSpecial: boolean
    specialType?: ScoringResult['specialHandType']
  }

  const candidates: Candidate[] = []

  for (const d of standardDecomps) {
    candidates.push({ score: scoreDecomposition(ctx, d, null), decomp: d, sevenPairs: null, isSpecial: false })
  }
  if (sevenPairsDecomp) {
    candidates.push({ score: scoreDecomposition(ctx, null, sevenPairsDecomp), decomp: null, sevenPairs: sevenPairsDecomp, isSpecial: true, specialType: 'seven-pairs' })
  }
  if (thirteenOrphans) {
    candidates.push({ score: scoreDecomposition(ctx, null, null), decomp: null, sevenPairs: null, isSpecial: true, specialType: 'thirteen-orphans' })
  }
  if (greaterHonors) {
    candidates.push({ score: scoreDecomposition(ctx, null, null), decomp: null, sevenPairs: null, isSpecial: true, specialType: 'greater-honors-knitted' })
  }
  if (lesserHonors) {
    candidates.push({ score: scoreDecomposition(ctx, null, null), decomp: null, sevenPairs: null, isSpecial: true, specialType: 'lesser-honors-knitted' })
  }

  const best = candidates.reduce((a, b) => (b.score > a.score ? b : a))

  // Build final scored pattern list
  const raw: { pattern: Pattern; count: number }[] = []
  for (const pattern of ALL_PATTERNS) {
    const count = pattern.score(ctx, best.decomp, best.sevenPairs)
    raw.push({ pattern, count })
  }

  const { kept, excluded } = applyExclusions(raw.filter((r) => r.count > 0))

  const fanPoints = kept.reduce((sum, { pattern, count }) => sum + pattern.points * count, 0)
  const flowerPoints = input.flowers

  const matchedPatterns: ScoredPattern[] = kept.map(({ pattern, count }) => ({
    id: pattern.id,
    name: pattern.name,
    chineseName: pattern.chineseName,
    points: pattern.points,
    count,
  }))

  const excludedPatterns: ScoredPattern[] = excluded.map(({ pattern, count, excludedBy }) => ({
    id: pattern.id,
    name: pattern.name,
    chineseName: pattern.chineseName,
    points: pattern.points,
    count,
    excludedBy: [excludedBy],
  }))

  const decomposition = best.decomp ?? best.sevenPairs

  return {
    isValid: true,
    meetsMinimum: fanPoints >= 8,
    fanPoints,
    flowerPoints,
    totalPoints: fanPoints + flowerPoints,
    matchedPatterns,
    excludedPatterns,
    decomposition,
    isSpecialHand: best.isSpecial,
    specialHandType: best.specialType,
    payment: (base) => makePayment(base, fanPoints, flowerPoints, input.selfDraw),
  }
}

// ── Payment calculation ───────────────────────────────────────────────────────

function makePayment(
  basePoints: number,
  fanPoints: number,
  flowerPoints: number,
  selfDraw: boolean
): PaymentBreakdown {
  const totalHandPoints = fanPoints + flowerPoints

  if (selfDraw) {
    // All 3 opponents pay base + full hand score
    const eachPlayerPays = basePoints + totalHandPoints
    return {
      basePoints,
      fanPoints,
      flowerPoints,
      totalHandPoints,
      selfDraw: true,
      eachPlayerPays,
      totalReceived: eachPlayerPays * 3,
    }
  } else {
    // All 3 opponents pay base; discarder additionally pays the hand score
    const eachPlayerPays = basePoints
    const discarderPays = basePoints + totalHandPoints
    return {
      basePoints,
      fanPoints,
      flowerPoints,
      totalHandPoints,
      selfDraw: false,
      eachPlayerPays,
      discarderPays,
      // Two non-discarders pay base; discarder pays base + hand
      totalReceived: eachPlayerPays * 2 + discarderPays,
    }
  }
}
