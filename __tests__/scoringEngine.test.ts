import { makeTile, resetTileIdCounter, Tile, WindValue } from '../lib/mahjong/tiles'
import { scoreHand, HandInput } from '../lib/mahjong/scoringEngine'
import { WaitType } from '../lib/mahjong/scoringRules'

function t(suit: string, value: string | number): Tile {
  return makeTile(suit as never, value as never)
}

function makeInput(overrides: Partial<HandInput> & { tiles: Tile[] }): HandInput {
  return {
    flowers: 0,
    winningTile: overrides.tiles[overrides.tiles.length - 1],
    declaredMelds: [],
    selfDraw: false,
    seatWind: 'east',
    prevalentWind: 'east',
    waitType: 'two-sided',
    isLastTile: false,
    isRobbingKong: false,
    isOutOnKong: false,
    isLastClaim: false,
    isLastDraw: false,
    ...overrides,
  }
}

beforeEach(() => resetTileIdCounter())

// ── Validity ───────────────────────────────────────────────────────────────────

describe('hand validity', () => {
  test('4 chows + pair is valid', () => {
    const tiles = [
      t('bamboo',2),t('bamboo',3),t('bamboo',4),
      t('circles',3),t('circles',4),t('circles',5),
      t('characters',5),t('characters',6),t('characters',7),
      t('bamboo',6),t('bamboo',7),t('bamboo',8),
      t('circles',8),t('circles',8),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('circles',8), waitType: 'pair' }))
    expect(result.isValid).toBe(true)
  })

  test('13 tiles is invalid', () => {
    const tiles = [
      t('bamboo',2),t('bamboo',3),t('bamboo',4),
      t('circles',3),t('circles',4),t('circles',5),
      t('characters',5),t('characters',6),t('characters',7),
      t('bamboo',6),t('bamboo',7),t('bamboo',8),
      t('circles',8),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('circles',8) }))
    expect(result.isValid).toBe(false)
  })

  test('random tiles with no valid grouping is invalid', () => {
    const tiles = [
      t('bamboo',1),t('bamboo',3),t('bamboo',5),
      t('circles',2),t('circles',4),t('circles',6),
      t('characters',1),t('characters',3),t('characters',5),
      t('winds','east'),t('winds','south'),t('winds','west'),
      t('dragons','red'),t('dragons','green'),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('dragons','green') }))
    expect(result.isValid).toBe(false)
  })
})

// ── All Chows ──────────────────────────────────────────────────────────────────

describe('All Chows (平和)', () => {
  test('four chows + pair scores All Chows and All Simples; no-honors excluded by all-simples', () => {
    const tiles = [
      t('bamboo',2),t('bamboo',3),t('bamboo',4),
      t('circles',3),t('circles',4),t('circles',5),
      t('characters',5),t('characters',6),t('characters',7),
      t('bamboo',6),t('bamboo',7),t('bamboo',8),
      t('circles',8),t('circles',8),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('circles',8), waitType: 'pair', selfDraw: false }))
    expect(result.isValid).toBe(true)
    const ids = result.matchedPatterns.map((p) => p.id)
    expect(ids).toContain('all-chows')
    expect(ids).toContain('all-simples')
    // no-honors excluded by all-simples (higher points takes priority)
    expect(ids).not.toContain('no-honors')
    const excludedIds = result.excludedPatterns.map((p) => p.id)
    expect(excludedIds).toContain('no-honors')
  })
})

// ── All Pungs ──────────────────────────────────────────────────────────────────

describe('All Pungs (对对胡)', () => {
  test('four concealed pungs fires at 64pt and excludes all-pungs; seat/prevalent wind still score', () => {
    const tiles = [
      t('bamboo',2),t('bamboo',2),t('bamboo',2),
      t('circles',5),t('circles',5),t('circles',5),
      t('characters',7),t('characters',7),t('characters',7),
      t('winds','east'),t('winds','east'),t('winds','east'),
      t('dragons','red'),t('dragons','red'),
    ]
    const result = scoreHand(makeInput({
      tiles,
      winningTile: t('dragons','red'),
      waitType: 'pair',
      seatWind: 'east',
      prevalentWind: 'east',
    }))
    expect(result.isValid).toBe(true)
    const ids = result.matchedPatterns.map((p) => p.id)
    // all four pungs are concealed → four-concealed-pungs (64pt) takes over
    expect(ids).toContain('four-concealed-pungs')
    expect(ids).toContain('seat-wind')
    expect(ids).toContain('prevalent-wind')
    // red dragon is the PAIR (not a pung), so dragon-pung does not fire
    expect(ids).not.toContain('dragon-pung')
    // all-pungs excluded by the higher four-concealed-pungs
    expect(ids).not.toContain('all-pungs')
    expect(result.fanPoints).toBeGreaterThanOrEqual(64)
  })
})

// ── Seven Pairs ────────────────────────────────────────────────────────────────

describe('Seven Pairs (七对子)', () => {
  test('seven distinct pairs scores Seven Pairs', () => {
    const tiles = [
      t('bamboo',1),t('bamboo',1),
      t('bamboo',4),t('bamboo',4),
      t('circles',2),t('circles',2),
      t('circles',7),t('circles',7),
      t('characters',3),t('characters',3),
      t('characters',9),t('characters',9),
      t('winds','south'),t('winds','south'),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('winds','south'), waitType: 'pair', selfDraw: true }))
    expect(result.isValid).toBe(true)
    expect(result.isSpecialHand).toBe(true)
    expect(result.specialHandType).toBe('seven-pairs')
    const ids = result.matchedPatterns.map((p) => p.id)
    expect(ids).toContain('seven-pairs')
    expect(result.fanPoints).toBeGreaterThanOrEqual(24)
  })
})

// ── Pure Straight ──────────────────────────────────────────────────────────────

describe('Pure Straight (清龙)', () => {
  test('123+456+789 bamboo scores Pure Straight', () => {
    const tiles = [
      t('bamboo',1),t('bamboo',2),t('bamboo',3),
      t('bamboo',4),t('bamboo',5),t('bamboo',6),
      t('bamboo',7),t('bamboo',8),t('bamboo',9),
      t('circles',3),t('circles',4),t('circles',5),
      t('circles',7),t('circles',7),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('circles',7), waitType: 'pair' }))
    expect(result.isValid).toBe(true)
    const ids = result.matchedPatterns.map((p) => p.id)
    expect(ids).toContain('pure-straight')
    expect(result.fanPoints).toBeGreaterThanOrEqual(8)
  })
})

// ── Mixed Straight ─────────────────────────────────────────────────────────────

describe('Mixed Straight (三色三同顺)', () => {
  test('123 in three suits scores Mixed Straight', () => {
    const tiles = [
      t('bamboo',1),t('bamboo',2),t('bamboo',3),
      t('circles',1),t('circles',2),t('circles',3),
      t('characters',1),t('characters',2),t('characters',3),
      t('bamboo',5),t('bamboo',6),t('bamboo',7),
      t('circles',5),t('circles',5),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('circles',5), waitType: 'pair' }))
    expect(result.isValid).toBe(true)
    const ids = result.matchedPatterns.map((p) => p.id)
    expect(ids).toContain('mixed-straight')
    expect(result.fanPoints).toBeGreaterThanOrEqual(8)
  })
})

// ── Self-Draw with Flowers ─────────────────────────────────────────────────────

describe('Self-draw with flowers', () => {
  test('fully-concealed-hand fires (subsumes self-draw); flowers add separately', () => {
    const tiles = [
      t('bamboo',3),t('bamboo',4),t('bamboo',5),
      t('circles',4),t('circles',5),t('circles',6),
      t('characters',2),t('characters',3),t('characters',4),
      t('bamboo',6),t('bamboo',7),t('bamboo',8),
      t('circles',9),t('circles',9),
    ]
    const result = scoreHand(makeInput({
      tiles,
      winningTile: t('circles',9),
      waitType: 'pair',
      selfDraw: true,
      flowers: 3,
    }))
    expect(result.isValid).toBe(true)
    const ids = result.matchedPatterns.map((p) => p.id)
    // Self-draw + all concealed → fully-concealed-hand (4pt) fires and excludes self-draw (1pt)
    expect(ids).toContain('fully-concealed-hand')
    expect(ids).not.toContain('self-draw')
    expect(result.flowerPoints).toBe(3)
    expect(result.totalPoints).toBe(result.fanPoints + 3)
  })

  test('flowers do not count toward 8-point minimum', () => {
    // An all-chows hand with no other patterns scores only 2 fan
    // Adding 10 flowers should NOT make it meet the minimum
    const tiles = [
      t('bamboo',1),t('bamboo',2),t('bamboo',3),
      t('circles',3),t('circles',4),t('circles',5),
      t('characters',6),t('characters',7),t('characters',8),
      t('bamboo',5),t('bamboo',6),t('bamboo',7),
      t('circles',2),t('circles',2),
    ]
    const result = scoreHand(makeInput({
      tiles,
      winningTile: t('circles',2),
      waitType: 'pair',
      flowers: 8,
    }))
    expect(result.flowerPoints).toBe(8)
    expect(result.meetsMinimum).toBe(false)
  })
})

// ── Below minimum ──────────────────────────────────────────────────────────────

describe('Minimum 8 fan', () => {
  test('hand scoring below 8 fan does not meet minimum', () => {
    const tiles = [
      t('bamboo',1),t('bamboo',2),t('bamboo',3),
      t('circles',3),t('circles',4),t('circles',5),
      t('characters',6),t('characters',7),t('characters',8),
      t('bamboo',5),t('bamboo',6),t('bamboo',7),
      t('circles',2),t('circles',2),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('circles',2), waitType: 'pair' }))
    expect(result.isValid).toBe(true)
    expect(result.meetsMinimum).toBe(false)
    expect(result.fanPoints).toBeLessThan(8)
  })
})

// ── Payment calculation ────────────────────────────────────────────────────────

describe('Payment calculation', () => {
  test('discard win: non-discarders pay base, discarder pays base+hand', () => {
    const tiles = [
      t('bamboo',2),t('bamboo',2),t('bamboo',2),
      t('circles',5),t('circles',5),t('circles',5),
      t('characters',7),t('characters',7),t('characters',7),
      t('winds','east'),t('winds','east'),t('winds','east'),
      t('dragons','red'),t('dragons','red'),
    ]
    const result = scoreHand(makeInput({
      tiles,
      winningTile: t('dragons','red'),
      waitType: 'pair',
      seatWind: 'east',
      prevalentWind: 'east',
    }))
    const payment = result.payment(8)
    expect(payment.eachPlayerPays).toBe(8) // base only
    expect(payment.discarderPays).toBe(8 + result.totalPoints) // base + hand
    expect(payment.totalReceived).toBe(8 * 2 + (8 + result.totalPoints))
  })

  test('self-draw: all players pay base + hand', () => {
    const tiles = [
      t('bamboo',3),t('bamboo',4),t('bamboo',5),
      t('circles',4),t('circles',5),t('circles',6),
      t('characters',2),t('characters',3),t('characters',4),
      t('bamboo',6),t('bamboo',7),t('bamboo',8),
      t('circles',9),t('circles',9),
    ]
    const result = scoreHand(makeInput({
      tiles,
      winningTile: t('circles',9),
      waitType: 'pair',
      selfDraw: true,
      flowers: 3,
    }))
    const payment = result.payment(8)
    expect(payment.eachPlayerPays).toBe(8 + result.totalPoints)
    expect(payment.totalReceived).toBe(payment.eachPlayerPays * 3)
  })
})

// ── Thirteen Orphans ───────────────────────────────────────────────────────────

describe('Thirteen Orphans (十三幺)', () => {
  test('13 orphans + duplicate terminal scores 88 points', () => {
    const tiles = [
      t('bamboo',1),t('bamboo',9),
      t('circles',1),t('circles',9),
      t('characters',1),t('characters',9),
      t('winds','east'),t('winds','south'),t('winds','west'),t('winds','north'),
      t('dragons','red'),t('dragons','green'),t('dragons','white'),
      t('bamboo',1),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('bamboo',1) }))
    expect(result.isValid).toBe(true)
    expect(result.isSpecialHand).toBe(true)
    expect(result.specialHandType).toBe('thirteen-orphans')
    expect(result.fanPoints).toBe(88)
  })
})

// ── Full Flush ─────────────────────────────────────────────────────────────────

describe('Full Flush (清一色)', () => {
  test('all bamboo hand scores Full Flush', () => {
    const tiles = [
      t('bamboo',1),t('bamboo',2),t('bamboo',3),
      t('bamboo',4),t('bamboo',5),t('bamboo',6),
      t('bamboo',2),t('bamboo',3),t('bamboo',4),
      t('bamboo',7),t('bamboo',8),t('bamboo',9),
      t('bamboo',5),t('bamboo',5),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('bamboo',5), waitType: 'pair' }))
    expect(result.isValid).toBe(true)
    const ids = result.matchedPatterns.map((p) => p.id)
    expect(ids).toContain('full-flush')
    expect(result.fanPoints).toBeGreaterThanOrEqual(24)
  })
})

// ── Exclusion rules ────────────────────────────────────────────────────────────

describe('Exclusion rules', () => {
  test('Full Flush excludes Half Flush and No Honors and One Voided Suit', () => {
    const tiles = [
      t('bamboo',1),t('bamboo',2),t('bamboo',3),
      t('bamboo',4),t('bamboo',5),t('bamboo',6),
      t('bamboo',2),t('bamboo',3),t('bamboo',4),
      t('bamboo',7),t('bamboo',8),t('bamboo',9),
      t('bamboo',5),t('bamboo',5),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('bamboo',5), waitType: 'pair' }))
    const matchedIds = result.matchedPatterns.map((p) => p.id)
    expect(matchedIds).not.toContain('half-flush')
    expect(matchedIds).not.toContain('no-honors')
    expect(matchedIds).not.toContain('one-voided-suit')
  })

  test('Four-concealed-pungs fires when all pungs are concealed, all-chows is absent', () => {
    const tiles = [
      t('bamboo',2),t('bamboo',2),t('bamboo',2),
      t('circles',5),t('circles',5),t('circles',5),
      t('characters',7),t('characters',7),t('characters',7),
      t('bamboo',9),t('bamboo',9),t('bamboo',9),
      t('circles',4),t('circles',4),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('circles',4), waitType: 'pair' }))
    const matchedIds = result.matchedPatterns.map((p) => p.id)
    // Four concealed pungs → four-concealed-pungs (64pt) beats all-pungs (6pt)
    expect(matchedIds).toContain('four-concealed-pungs')
    expect(matchedIds).not.toContain('all-chows')
  })
})

// ── Wait types ─────────────────────────────────────────────────────────────────

describe('Wait type scoring', () => {
  const baseTiles = [
    t('bamboo',2),t('bamboo',3),t('bamboo',4),
    t('circles',3),t('circles',4),t('circles',5),
    t('characters',5),t('characters',6),t('characters',7),
    t('bamboo',6),t('bamboo',7),t('bamboo',8),
    t('circles',8),t('circles',8),
  ]

  test('edge wait scores 1 extra point', () => {
    const result = scoreHand(makeInput({ tiles: baseTiles, winningTile: t('circles',8), waitType: 'edge' }))
    const ids = result.matchedPatterns.map((p) => p.id)
    expect(ids).toContain('edge-wait')
  })

  test('closed wait scores 1 extra point', () => {
    const result = scoreHand(makeInput({ tiles: baseTiles, winningTile: t('circles',8), waitType: 'closed' }))
    const ids = result.matchedPatterns.map((p) => p.id)
    expect(ids).toContain('closed-wait')
  })

  test('pair wait scores 1 extra point', () => {
    const result = scoreHand(makeInput({ tiles: baseTiles, winningTile: t('circles',8), waitType: 'pair' }))
    const ids = result.matchedPatterns.map((p) => p.id)
    expect(ids).toContain('single-tile-wait')
  })
})
