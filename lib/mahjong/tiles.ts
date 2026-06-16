// ── Suits and values ──────────────────────────────────────────────────────────

export type NumberedSuit = 'bamboo' | 'circles' | 'characters'
export type HonorSuit = 'winds' | 'dragons'
export type FlowerSuit = 'flowers'
export type Suit = NumberedSuit | HonorSuit | FlowerSuit

export type WindValue = 'east' | 'south' | 'west' | 'north'
export type DragonValue = 'red' | 'green' | 'white'
export type NumberValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type FlowerValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export interface Tile {
  suit: Suit
  value: NumberValue | WindValue | DragonValue | FlowerValue
  id: string
}

export interface NumberedTile extends Tile {
  suit: NumberedSuit
  value: NumberValue
}

export interface WindTile extends Tile {
  suit: 'winds'
  value: WindValue
}

export interface DragonTile extends Tile {
  suit: 'dragons'
  value: DragonValue
}

export interface FlowerTile extends Tile {
  suit: 'flowers'
  value: FlowerValue
}

// ── Meld types ────────────────────────────────────────────────────────────────

export type MeldType = 'chow' | 'pung' | 'kong' | 'pair'

export interface Meld {
  type: MeldType
  tiles: Tile[]
  concealed: boolean
}

// ── Wind ordering ─────────────────────────────────────────────────────────────

export const WIND_ORDER: WindValue[] = ['east', 'south', 'west', 'north']
export const DRAGON_ORDER: DragonValue[] = ['red', 'green', 'white']
export const NUMBERED_SUITS: NumberedSuit[] = ['bamboo', 'circles', 'characters']
export const ALL_SUITS: Suit[] = ['bamboo', 'circles', 'characters', 'winds', 'dragons']

// ── Tile helpers ──────────────────────────────────────────────────────────────

export function isNumberedTile(tile: Tile): tile is NumberedTile {
  return tile.suit === 'bamboo' || tile.suit === 'circles' || tile.suit === 'characters'
}

export function isHonorTile(tile: Tile): boolean {
  return tile.suit === 'winds' || tile.suit === 'dragons'
}

export function isTerminal(tile: Tile): boolean {
  return isNumberedTile(tile) && (tile.value === 1 || tile.value === 9)
}

export function isTerminalOrHonor(tile: Tile): boolean {
  return isTerminal(tile) || isHonorTile(tile)
}

export function isSimple(tile: Tile): boolean {
  return isNumberedTile(tile) && tile.value >= 2 && tile.value <= 8
}

export function isGreenTile(tile: Tile): boolean {
  if (tile.suit === 'bamboo') {
    return [2, 3, 4, 6, 8].includes(tile.value as number)
  }
  if (tile.suit === 'dragons') return tile.value === 'green'
  return false
}

export function isReversibleTile(tile: Tile): boolean {
  if (tile.suit === 'circles') {
    return [1, 2, 3, 4, 5, 8, 9].includes(tile.value as number)
  }
  if (tile.suit === 'bamboo') {
    return tile.value === 2 || tile.value === 4 || tile.value === 5 || tile.value === 6 || tile.value === 8 || tile.value === 9
  }
  if (tile.suit === 'dragons') return tile.value === 'white'
  return false
}

export function tileEquals(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value
}

export function tileKey(tile: Tile): string {
  return `${tile.suit}:${tile.value}`
}

export function compareTiles(a: Tile, b: Tile): number {
  if (a.suit !== b.suit) {
    const suitOrder = ['bamboo', 'circles', 'characters', 'winds', 'dragons', 'flowers']
    return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit)
  }
  if (isNumberedTile(a) && isNumberedTile(b)) {
    return (a.value as number) - (b.value as number)
  }
  if (a.suit === 'winds') {
    return WIND_ORDER.indexOf(a.value as WindValue) - WIND_ORDER.indexOf(b.value as WindValue)
  }
  if (a.suit === 'dragons') {
    return DRAGON_ORDER.indexOf(a.value as DragonValue) - DRAGON_ORDER.indexOf(b.value as DragonValue)
  }
  return 0
}

export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort(compareTiles)
}

// ── Tile factory ──────────────────────────────────────────────────────────────

let _tileIdCounter = 0
export function makeTile(suit: Suit, value: NumberValue | WindValue | DragonValue | FlowerValue): Tile {
  return { suit, value, id: `tile-${_tileIdCounter++}` }
}

export function resetTileIdCounter() {
  _tileIdCounter = 0
}

// ── Full tile set ─────────────────────────────────────────────────────────────

export function buildFullDeck(): Tile[] {
  const tiles: Tile[] = []
  for (const suit of NUMBERED_SUITS) {
    for (let v = 1; v <= 9; v++) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push(makeTile(suit, v as NumberValue))
      }
    }
  }
  for (const wind of WIND_ORDER) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push(makeTile('winds', wind))
    }
  }
  for (const dragon of DRAGON_ORDER) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push(makeTile('dragons', dragon))
    }
  }
  for (let v = 1; v <= 8; v++) {
    tiles.push(makeTile('flowers', v as FlowerValue))
  }
  return tiles
}

// ── Display names ─────────────────────────────────────────────────────────────

export function tileName(tile: Tile): string {
  if (tile.suit === 'flowers') {
    const flowerNames = ['Plum', 'Orchid', 'Chrysanthemum', 'Bamboo', 'Spring', 'Summer', 'Autumn', 'Winter']
    return flowerNames[(tile.value as number) - 1]
  }
  if (tile.suit === 'winds') {
    const name = (tile.value as string)
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  if (tile.suit === 'dragons') {
    if (tile.value === 'red') return 'Red Dragon'
    if (tile.value === 'green') return 'Green Dragon'
    return 'White Dragon'
  }
  const suitNames: Record<NumberedSuit, string> = { bamboo: 'Bam', circles: 'Cir', characters: 'Chr' }
  return `${tile.value} ${suitNames[tile.suit as NumberedSuit]}`
}

export function tileEmoji(tile: Tile): string {
  if (tile.suit === 'flowers') return '🌸'
  if (tile.suit === 'winds') {
    const map: Record<WindValue, string> = { east: '東', south: '南', west: '西', north: '北' }
    return map[tile.value as WindValue]
  }
  if (tile.suit === 'dragons') {
    const map: Record<DragonValue, string> = { red: '中', green: '發', white: '白' }
    return map[tile.value as DragonValue]
  }
  const suitPrefix: Record<NumberedSuit, string> = { bamboo: 'b', circles: 'c', characters: 'm' }
  return `${suitPrefix[tile.suit as NumberedSuit]}${tile.value}`
}

export function tileLabel(tile: Tile): string {
  if (tile.suit === 'flowers') {
    const labels = ['1F', '2F', '3F', '4F', '1S', '2S', '3S', '4S']
    return labels[(tile.value as number) - 1]
  }
  if (tile.suit === 'winds') {
    return (tile.value as string).substring(0, 1).toUpperCase()
  }
  if (tile.suit === 'dragons') {
    return tile.value === 'red' ? 'Zh' : tile.value === 'green' ? 'Fa' : 'Bk'
  }
  const s: Record<NumberedSuit, string> = { bamboo: 'b', circles: 'c', characters: 'm' }
  return `${tile.value}${s[tile.suit as NumberedSuit]}`
}
