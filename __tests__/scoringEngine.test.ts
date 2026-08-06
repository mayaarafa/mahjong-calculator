import { makeTile, resetTileIdCounter, Tile } from '../lib/mahjong/tiles'
import { scoreHand, HandInput } from '../lib/mahjong/scoringEngine'

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

describe('Mixed Straight (花龙) vs Mixed Triple Chow (三色三同顺)', () => {
  test('123 in all three suits is Mixed Triple Chow, not Mixed Straight', () => {
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
    expect(ids).toContain('mixed-triple-chow')
    expect(ids).not.toContain('mixed-straight')
    expect(result.fanPoints).toBeGreaterThanOrEqual(8)
  })

  test('123 / 456 / 789 across the three suits scores Mixed Straight', () => {
    const tiles = [
      t('bamboo',1),t('bamboo',2),t('bamboo',3),
      t('circles',4),t('circles',5),t('circles',6),
      t('characters',7),t('characters',8),t('characters',9),
      t('bamboo',5),t('bamboo',6),t('bamboo',7),
      t('circles',9),t('circles',9),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('circles',9), waitType: 'pair' }))
    expect(result.isValid).toBe(true)
    const ids = result.matchedPatterns.map((p) => p.id)
    expect(ids).toContain('mixed-straight')
    expect(ids).not.toContain('mixed-triple-chow')
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

// ── Tile Hog vs kongs ─────────────────────────────────────────────────────────

describe('tile hog', () => {
  // A kong uses all 4 copies by definition, so it must not also score 四归一
  test('a kong does not score tile hog', () => {
    const tiles = [
      t('circles',9),t('circles',9),t('circles',9),t('circles',9), // kong
      t('winds','south'),t('winds','south'),t('winds','south'),
      t('bamboo',2),t('bamboo',2),t('bamboo',2),
      t('characters',3),t('characters',3),t('characters',3),
      t('characters',7),t('characters',7),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('characters',7) }))
    const ids = result.matchedPatterns.map((p) => p.id)
    expect(ids).not.toContain('tile-hog')
  })

  test('4 copies split across sets without a kong still scores tile hog', () => {
    const tiles = [
      t('bamboo',3),t('bamboo',3),t('bamboo',3), // pung of 3b
      t('bamboo',2),t('bamboo',3),t('bamboo',4), // 4th 3b lives in a chow
      t('circles',4),t('circles',5),t('circles',6),
      t('characters',2),t('characters',3),t('characters',4),
      t('circles',8),t('circles',8),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('circles',8), waitType: 'pair' }))
    const ids = result.matchedPatterns.map((p) => p.id)
    expect(ids).toContain('tile-hog')
  })
})

// ── Concealed vs exposed melds ────────────────────────────────────────────────

describe('declared (exposed) melds', () => {
  const fourPungTiles = [
    t('bamboo',2),t('bamboo',2),t('bamboo',2),
    t('circles',5),t('circles',5),t('circles',5),
    t('characters',7),t('characters',7),t('characters',7),
    t('winds','south'),t('winds','south'),t('winds','south'),
    t('dragons','red'),t('dragons','red'),
  ]

  test('all four pungs concealed scores Four Concealed Pungs', () => {
    const result = scoreHand(
      makeInput({ tiles: fourPungTiles, winningTile: t('dragons','red'), waitType: 'pair' })
    )
    const ids = result.matchedPatterns.map((p) => p.id)
    expect(ids).toContain('four-concealed-pungs')
  })

  test('one exposed pung means it is no longer Four Concealed Pungs', () => {
    // Same hand, but the bamboo pung was claimed from a discard
    const concealed = fourPungTiles.filter((tile) => tile.suit !== 'bamboo')
    const result = scoreHand(
      makeInput({
        tiles: concealed,
        winningTile: t('dragons','red'),
        waitType: 'pair',
        declaredMelds: [
          { type: 'pung', tiles: [t('bamboo',2),t('bamboo',2),t('bamboo',2)], concealed: false },
        ],
      })
    )
    expect(result.isValid).toBe(true)
    const ids = result.matchedPatterns.map((p) => p.id)
    expect(ids).not.toContain('four-concealed-pungs')
    expect(ids).toContain('all-pungs')
  })

  test('whole-hand patterns see exposed meld tiles', () => {
    // Concealed portion is all bamboo, but the exposed pung is circles — so this
    // is NOT a full flush. Fails if ctx.allTiles omits the declared meld.
    const tiles = [
      t('bamboo',2),t('bamboo',3),t('bamboo',4),
      t('bamboo',5),t('bamboo',6),t('bamboo',7),
      t('bamboo',7),t('bamboo',8),t('bamboo',9),
      t('bamboo',1),t('bamboo',1),
    ]
    const result = scoreHand(
      makeInput({
        tiles,
        winningTile: t('bamboo',1),
        waitType: 'pair',
        declaredMelds: [
          { type: 'pung', tiles: [t('circles',5),t('circles',5),t('circles',5)], concealed: false },
        ],
      })
    )
    expect(result.isValid).toBe(true)
    const ids = result.matchedPatterns.map((p) => p.id)
    expect(ids).not.toContain('full-flush')
  })

  test('concealed-only hands do not fire when a set is exposed', () => {
    // Nine Gates shape, but one pung was claimed — must not score 88
    const tiles = [
      t('bamboo',1),t('bamboo',2),t('bamboo',3),
      t('bamboo',4),t('bamboo',5),t('bamboo',6),
      t('bamboo',7),t('bamboo',8),t('bamboo',9),
      t('bamboo',9),t('bamboo',9),
    ]
    const result = scoreHand(
      makeInput({
        tiles,
        winningTile: t('bamboo',9),
        waitType: 'pair',
        declaredMelds: [
          { type: 'pung', tiles: [t('bamboo',1),t('bamboo',1),t('bamboo',1)], concealed: false },
        ],
      })
    )
    const ids = result.matchedPatterns.map((p) => p.id)
    expect(ids).not.toContain('nine-gates')
  })
})

// ── Patterns added / corrected in the MCR audit ───────────────────────────────

describe('MCR pattern table corrections', () => {
  test('Last Tile is 4 points, not 8', () => {
    const tiles = [
      t('bamboo',2),t('bamboo',3),t('bamboo',4),
      t('circles',3),t('circles',4),t('circles',5),
      t('characters',5),t('characters',6),t('characters',7),
      t('bamboo',6),t('bamboo',7),t('bamboo',8),
      t('circles',8),t('circles',8),
    ]
    const result = scoreHand(makeInput({
      tiles, winningTile: t('circles',8), waitType: 'pair', isLastTile: true,
    }))
    const p = result.matchedPatterns.find((x) => x.id === 'last-tile')
    expect(p?.points).toBe(4)
  })

  test('Last Tile Draw and Last Tile Claim are 8 points, not 4', () => {
    const tiles = [
      t('bamboo',2),t('bamboo',3),t('bamboo',4),
      t('circles',3),t('circles',4),t('circles',5),
      t('characters',5),t('characters',6),t('characters',7),
      t('bamboo',6),t('bamboo',7),t('bamboo',8),
      t('circles',8),t('circles',8),
    ]
    const draw = scoreHand(makeInput({
      tiles, winningTile: t('circles',8), waitType: 'pair', selfDraw: true, isLastDraw: true,
    }))
    expect(draw.matchedPatterns.find((x) => x.id === 'last-tile-draw')?.points).toBe(8)

    const claim = scoreHand(makeInput({
      tiles, winningTile: t('circles',8), waitType: 'pair', selfDraw: false, isLastClaim: true,
    }))
    expect(claim.matchedPatterns.find((x) => x.id === 'last-tile-claim')?.points).toBe(8)
  })

  test('Mixed Triple Chow scores 8 for the same chow in all three suits', () => {
    const tiles = [
      t('bamboo',3),t('bamboo',4),t('bamboo',5),
      t('circles',3),t('circles',4),t('circles',5),
      t('characters',3),t('characters',4),t('characters',5),
      t('bamboo',7),t('bamboo',8),t('bamboo',9),
      t('circles',2),t('circles',2),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('circles',2), waitType: 'pair' }))
    const p = result.matchedPatterns.find((x) => x.id === 'mixed-triple-chow')
    expect(p).toBeDefined()
    expect(p?.points).toBe(8)
  })

  test('Two Concealed Kongs scores 6 and replaces Concealed Kong', () => {
    const tiles = [
      t('bamboo',2),t('bamboo',2),t('bamboo',2),t('bamboo',2),
      t('circles',5),t('circles',5),t('circles',5),t('circles',5),
      t('characters',7),t('characters',7),t('characters',7),
      t('winds','south'),t('winds','south'),t('winds','south'),
      t('dragons','red'),t('dragons','red'),
    ]
    const result = scoreHand(makeInput({ tiles, winningTile: t('dragons','red'), waitType: 'pair' }))
    const ids = result.matchedPatterns.map((x) => x.id)
    expect(ids).toContain('two-concealed-kongs')
    expect(ids).not.toContain('concealed-kong')
    expect(result.matchedPatterns.find((x) => x.id === 'two-concealed-kongs')?.points).toBe(6)
  })

  test('Chicken Hand scores 8 when nothing else matches', () => {
    // One exposed pung of simples, three unrelated chows, honour pair,
    // all three suits present, discard win with no wait bonus
    const tiles = [
      t('bamboo',2),t('bamboo',3),t('bamboo',4),
      t('characters',5),t('characters',6),t('characters',7),
      t('circles',7),t('circles',8),t('circles',9),
      t('winds','east'),t('winds','east'),
    ]
    const result = scoreHand(makeInput({
      tiles,
      winningTile: t('bamboo',4),
      waitType: 'two-sided',
      seatWind: 'south',
      prevalentWind: 'west',
      declaredMelds: [
        { type: 'pung', tiles: [t('circles',5),t('circles',5),t('circles',5)], concealed: false },
      ],
    }))
    expect(result.isValid).toBe(true)
    expect(result.matchedPatterns.map((x) => x.id)).toEqual(['chicken-hand'])
    expect(result.fanPoints).toBe(8)
  })
})

// ── Flowers and the winning minimum ───────────────────────────────────────────

describe('flowers do not count toward the minimum', () => {
  test('a 4-fan hand with 6 flowers still fails the 8-point minimum', () => {
    // 4 chows + pair, discard win, concealed → concealed-hand (2) + all-chows (2)
    const tiles = [
      t('bamboo',2),t('bamboo',3),t('bamboo',4),
      t('circles',3),t('circles',4),t('circles',5),
      t('characters',5),t('characters',6),t('characters',7),
      t('bamboo',6),t('bamboo',7),t('bamboo',8),
      t('circles',8),t('circles',8),
    ]
    const result = scoreHand(makeInput({
      tiles, winningTile: t('circles',8), waitType: 'pair', flowers: 6,
    }))
    expect(result.flowerPoints).toBe(6)
    expect(result.fanPoints).toBeLessThan(8)
    expect(result.meetsMinimum).toBe(false)
    // but flowers still count toward what is actually paid
    expect(result.totalPoints).toBe(result.fanPoints + 6)
  })
})

// ── Payment styles ────────────────────────────────────────────────────────────

describe('payment styles', () => {
  const tiles = [
    t('bamboo',1),t('bamboo',2),t('bamboo',3),
    t('bamboo',4),t('bamboo',5),t('bamboo',6),
    t('bamboo',7),t('bamboo',8),t('bamboo',9),
    t('circles',3),t('circles',4),t('circles',5),
    t('circles',7),t('circles',7),
  ]

  test('MCR: everyone pays base, discarder also pays the hand', () => {
    const r = scoreHand(makeInput({ tiles, winningTile: t('circles',7), waitType: 'pair' }))
    const p = r.payment(8, 'mcr')
    expect(p.eachPlayerPays).toBe(8)
    expect(p.discarderPays).toBe(8 + p.totalHandPoints)
    expect(p.totalReceived).toBe(8 * 2 + 8 + p.totalHandPoints)
  })

  test('discarder-all: discarder covers all three shares', () => {
    const r = scoreHand(makeInput({ tiles, winningTile: t('circles',7), waitType: 'pair' }))
    const p = r.payment(8, 'discarder-all')
    expect(p.eachPlayerPays).toBe(0)
    expect(p.discarderPays).toBe(3 * (8 + p.totalHandPoints))
    expect(p.totalReceived).toBe(p.discarderPays)
  })

  test('self-draw: all three opponents pay equally regardless of style', () => {
    const r = scoreHand(makeInput({
      tiles, winningTile: t('circles',7), waitType: 'pair', selfDraw: true,
    }))
    const p = r.payment(8, 'single-pay')
    expect(p.selfDraw).toBe(true)
    expect(p.eachPlayerPays).toBe(8 + p.totalHandPoints)
    expect(p.totalReceived).toBe(3 * (8 + p.totalHandPoints))
  })
})
