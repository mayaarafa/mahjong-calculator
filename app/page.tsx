'use client'

import { useState, useMemo } from 'react'
import { PhotoInput } from '@/components/PhotoInput'
import { TilePicker } from '@/components/TilePicker'
import { HandSettings, HandSettingsValues, DEFAULT_SETTINGS } from '@/components/HandSettings'
import { ScoreResult } from '@/components/ScoreResult'
import { Tile, makeTile } from '@/lib/mahjong/tiles'
import { scoreHand } from '@/lib/mahjong/scoringEngine'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Sample hands ───────────────────────────────────────────────────────────────

type SampleHand = {
  name: string
  tiles: Tile[]
  winningTile: Tile
  settings: Partial<HandSettingsValues>
}

function t(suit: string, value: string | number): Tile {
  return makeTile(suit as never, value as never)
}

const SAMPLE_HANDS: SampleHand[] = [
  {
    name: 'All Chows',
    tiles: [
      t('bamboo',2),t('bamboo',3),t('bamboo',4),
      t('circles',3),t('circles',4),t('circles',5),
      t('characters',5),t('characters',6),t('characters',7),
      t('bamboo',6),t('bamboo',7),t('bamboo',8),
      t('circles',8),t('circles',8),
    ],
    winningTile: t('circles', 8),
    settings: { selfDraw: false, waitType: 'pair' },
  },
  {
    name: 'All Pungs',
    tiles: [
      t('bamboo',2),t('bamboo',2),t('bamboo',2),
      t('circles',5),t('circles',5),t('circles',5),
      t('characters',7),t('characters',7),t('characters',7),
      t('winds','east'),t('winds','east'),t('winds','east'),
      t('dragons','red'),t('dragons','red'),
    ],
    winningTile: t('dragons', 'red'),
    settings: { selfDraw: false, waitType: 'pair', seatWind: 'east' },
  },
  {
    name: 'Seven Pairs',
    tiles: [
      t('bamboo',1),t('bamboo',1),
      t('bamboo',4),t('bamboo',4),
      t('circles',2),t('circles',2),
      t('circles',7),t('circles',7),
      t('characters',3),t('characters',3),
      t('characters',9),t('characters',9),
      t('winds','south'),t('winds','south'),
    ],
    winningTile: t('winds','south'),
    settings: { selfDraw: true, waitType: 'pair' },
  },
  {
    name: 'Pure Straight',
    tiles: [
      t('bamboo',1),t('bamboo',2),t('bamboo',3),
      t('bamboo',4),t('bamboo',5),t('bamboo',6),
      t('bamboo',7),t('bamboo',8),t('bamboo',9),
      t('circles',3),t('circles',4),t('circles',5),
      t('circles',7),t('circles',7),
    ],
    winningTile: t('circles',7),
    settings: { selfDraw: false, waitType: 'pair' },
  },
  {
    name: 'Mixed Straight',
    tiles: [
      t('bamboo',1),t('bamboo',2),t('bamboo',3),
      t('circles',1),t('circles',2),t('circles',3),
      t('characters',1),t('characters',2),t('characters',3),
      t('bamboo',5),t('bamboo',6),t('bamboo',7),
      t('circles',5),t('circles',5),
    ],
    winningTile: t('circles',5),
    settings: { selfDraw: false, waitType: 'pair' },
  },
  {
    name: 'Self-Draw + Flowers',
    tiles: [
      t('bamboo',3),t('bamboo',4),t('bamboo',5),
      t('circles',4),t('circles',5),t('circles',6),
      t('characters',2),t('characters',3),t('characters',4),
      t('bamboo',6),t('bamboo',7),t('bamboo',8),
      t('circles',9),t('circles',9),
    ],
    winningTile: t('circles',9),
    settings: { selfDraw: true, waitType: 'pair', flowerCount: 3 },
  },
  {
    name: 'Below Minimum',
    tiles: [
      t('bamboo',1),t('bamboo',2),t('bamboo',3),
      t('circles',3),t('circles',4),t('circles',5),
      t('characters',6),t('characters',7),t('characters',8),
      t('bamboo',5),t('bamboo',6),t('bamboo',7),
      t('circles',2),t('circles',2),
    ],
    winningTile: t('circles',2),
    settings: { selfDraw: false, waitType: 'pair' },
  },
]

// ── Main App ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [tiles, setTiles] = useState<Tile[]>([])
  const [winningTile, setWinningTile] = useState<Tile | null>(null)
  const [settings, setSettings] = useState<HandSettingsValues>(DEFAULT_SETTINGS)
  const [activeTab, setActiveTab] = useState('tiles')
  const [hasScored, setHasScored] = useState(false)

  const nonFlowerTiles = tiles.filter((t) => t.suit !== 'flowers')
  const flowerTiles = tiles.filter((t) => t.suit === 'flowers')

  const result = useMemo(() => {
    if (!hasScored || nonFlowerTiles.length !== 14 || !winningTile) return null
    return scoreHand({
      tiles: nonFlowerTiles,
      flowers: settings.flowerCount + flowerTiles.length,
      winningTile,
      declaredMelds: [],
      selfDraw: settings.selfDraw,
      seatWind: settings.seatWind,
      prevalentWind: settings.prevalentWind,
      waitType: settings.waitType,
      isLastTile: settings.isLastTile,
      isRobbingKong: settings.isRobbingKong,
      isOutOnKong: settings.isOutOnKong,
      isLastClaim: settings.isLastClaim,
      isLastDraw: settings.isLastDraw,
    })
  }, [hasScored, nonFlowerTiles, winningTile, settings, flowerTiles.length])

  const handleScore = () => {
    setHasScored(true)
    setActiveTab('result')
  }

  const handleReset = () => {
    setTiles([])
    setWinningTile(null)
    setSettings(DEFAULT_SETTINGS)
    setHasScored(false)
    setActiveTab('tiles')
  }

  const loadSample = (sample: SampleHand) => {
    setTiles(sample.tiles)
    setWinningTile(sample.winningTile)
    setSettings({ ...DEFAULT_SETTINGS, ...sample.settings })
    setHasScored(false)
    setActiveTab('tiles')
  }

  const canScore = nonFlowerTiles.length === 14 && winningTile !== null

  const tileCountLabel = () => {
    if (nonFlowerTiles.length === 0) return 'No tiles'
    if (nonFlowerTiles.length < 14) return `${nonFlowerTiles.length}/14 tiles`
    return '14 tiles ✓'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">🀄 Mahjong Scorer</h1>
            <p className="text-xs text-slate-400">Chinese Official Rules</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs px-2 py-1 rounded-full font-medium',
              nonFlowerTiles.length === 14
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-500'
            )}>
              {tileCountLabel()}
            </span>
            <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
              Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Sample hands strip */}
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Try a sample hand</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SAMPLE_HANDS.map((s) => (
              <button
                key={s.name}
                onClick={() => loadSample(s)}
                className="flex-shrink-0 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="photo" className="text-xs">📷 Photo</TabsTrigger>
            <TabsTrigger value="tiles" className="text-xs">🀄 Tiles</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">⚙️ Settings</TabsTrigger>
            <TabsTrigger value="result" className="text-xs">🏆 Result</TabsTrigger>
          </TabsList>

          {/* Photo tab */}
          <TabsContent value="photo" className="mt-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <h2 className="font-semibold text-slate-800 text-sm">Photo Input</h2>
              <p className="text-xs text-slate-400">
                Take or upload a photo of your hand, then enter tiles manually below.
              </p>
              <PhotoInput onImageCaptured={() => setActiveTab('tiles')} />
            </div>
          </TabsContent>

          {/* Tiles tab */}
          <TabsContent value="tiles" className="mt-3 space-y-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-slate-800 text-sm">Your Hand</h2>
                  <p className="text-xs text-slate-400">Select 14 tiles (flowers are extra)</p>
                </div>
                {nonFlowerTiles.length === 14 && (
                  <span className="text-xs text-green-600 font-medium">✓ Complete</span>
                )}
              </div>
              <TilePicker
                selectedTiles={tiles}
                onChange={setTiles}
                maxTiles={22}
                showFlowers
              />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-slate-800 text-sm">Winning Tile</h2>
                  <p className="text-xs text-slate-400">Which tile completed your hand?</p>
                </div>
                {winningTile && (
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full font-medium">
                    Set ✓
                  </span>
                )}
              </div>
              <TilePicker
                selectedTiles={winningTile ? [winningTile] : []}
                onChange={(ts) => setWinningTile(ts[0] ?? null)}
                singleSelect
                maxTiles={1}
              />
            </div>

            <Button
              className="w-full h-12 text-base font-bold"
              disabled={!canScore}
              onClick={handleScore}
            >
              {canScore
                ? '🧮 Calculate Score'
                : nonFlowerTiles.length < 14
                  ? `Need ${14 - nonFlowerTiles.length} more tile${14 - nonFlowerTiles.length === 1 ? '' : 's'}`
                  : 'Select winning tile'}
            </Button>
          </TabsContent>

          {/* Settings tab */}
          <TabsContent value="settings" className="mt-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-800 text-sm mb-4">Hand Settings</h2>
              <HandSettings values={settings} onChange={setSettings} />
            </div>
          </TabsContent>

          {/* Result tab */}
          <TabsContent value="result" className="mt-3 space-y-3">
            {result ? (
              <>
                <ScoreResult result={result} basePoints={settings.basePoints} />
                <Button variant="outline" className="w-full" onClick={() => setActiveTab('tiles')}>
                  ← Edit Hand
                </Button>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                <p className="text-4xl mb-3">🀄</p>
                <p className="text-sm">Enter your tiles then press "Calculate Score"</p>
                <Button className="mt-4" onClick={() => setActiveTab('tiles')}>
                  Enter Tiles →
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Sticky score strip */}
        {hasScored && result && activeTab !== 'result' && (
          <button
            onClick={() => setActiveTab('result')}
            className={cn(
              'w-full rounded-xl border-2 p-3 flex items-center justify-between',
              result.meetsMinimum
                ? 'border-green-300 bg-green-50 text-green-800'
                : 'border-amber-300 bg-amber-50 text-amber-800'
            )}
          >
            <span className="text-sm font-semibold">
              {result.meetsMinimum
                ? `✅ ${result.fanPoints} Fan (${result.totalPoints} total)`
                : `⚠️ ${result.fanPoints}/8 Fan — below minimum`}
            </span>
            <span className="text-xs opacity-70">View →</span>
          </button>
        )}
      </main>
    </div>
  )
}
