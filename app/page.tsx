"use client";

import { useState, useMemo } from "react";
import {
  Camera,
  Calculator,
  SlidersHorizontal,
  Trophy,
  AlertTriangle,
  Check,
  LayoutGrid,
  ChevronDown,
} from "lucide-react";
import { PhotoInput, TileSpec } from "@/components/PhotoInput";
import { TilePicker } from "@/components/TilePicker";
import {
  HandSettings,
  HandSettingsValues,
  DEFAULT_SETTINGS,
} from "@/components/HandSettings";
import { ScoreResult } from "@/components/ScoreResult";
import { Tile, makeTile, tileKey } from "@/lib/mahjong/tiles";
import { scoreHand } from "@/lib/mahjong/scoringEngine";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Sample hands ───────────────────────────────────────────────────────────────

type SampleHand = {
  name: string;
  tiles: Tile[];
  winningTile: Tile;
  settings: Partial<HandSettingsValues>;
};

function t(suit: string, value: string | number): Tile {
  return makeTile(suit as never, value as never);
}

// Recognition results come from a vision model — validate before trusting
function isValidTileSpec(s: TileSpec): boolean {
  if (["bamboo", "circles", "characters"].includes(s.suit))
    return typeof s.value === "number" && s.value >= 1 && s.value <= 9;
  if (s.suit === "flowers")
    return typeof s.value === "number" && s.value >= 1 && s.value <= 8;
  if (s.suit === "winds")
    return ["east", "south", "west", "north"].includes(s.value as string);
  if (s.suit === "dragons")
    return ["red", "green", "white"].includes(s.value as string);
  return false;
}

const SAMPLE_HANDS: SampleHand[] = [
  {
    name: "All Chows",
    tiles: [
      t("bamboo", 2),
      t("bamboo", 3),
      t("bamboo", 4),
      t("circles", 3),
      t("circles", 4),
      t("circles", 5),
      t("characters", 5),
      t("characters", 6),
      t("characters", 7),
      t("bamboo", 6),
      t("bamboo", 7),
      t("bamboo", 8),
      t("circles", 8),
      t("circles", 8),
    ],
    winningTile: t("circles", 8),
    settings: { selfDraw: false, waitType: "pair" },
  },
  {
    name: "All Pungs",
    tiles: [
      t("bamboo", 2),
      t("bamboo", 2),
      t("bamboo", 2),
      t("circles", 5),
      t("circles", 5),
      t("circles", 5),
      t("characters", 7),
      t("characters", 7),
      t("characters", 7),
      t("winds", "east"),
      t("winds", "east"),
      t("winds", "east"),
      t("dragons", "red"),
      t("dragons", "red"),
    ],
    winningTile: t("dragons", "red"),
    settings: { selfDraw: false, waitType: "pair", seatWind: "east" },
  },
  {
    name: "Seven Pairs",
    tiles: [
      t("bamboo", 1),
      t("bamboo", 1),
      t("bamboo", 4),
      t("bamboo", 4),
      t("circles", 2),
      t("circles", 2),
      t("circles", 7),
      t("circles", 7),
      t("characters", 3),
      t("characters", 3),
      t("characters", 9),
      t("characters", 9),
      t("winds", "south"),
      t("winds", "south"),
    ],
    winningTile: t("winds", "south"),
    settings: { selfDraw: true, waitType: "pair" },
  },
  {
    name: "Pure Straight",
    tiles: [
      t("bamboo", 1),
      t("bamboo", 2),
      t("bamboo", 3),
      t("bamboo", 4),
      t("bamboo", 5),
      t("bamboo", 6),
      t("bamboo", 7),
      t("bamboo", 8),
      t("bamboo", 9),
      t("circles", 3),
      t("circles", 4),
      t("circles", 5),
      t("circles", 7),
      t("circles", 7),
    ],
    winningTile: t("circles", 7),
    settings: { selfDraw: false, waitType: "pair" },
  },
  {
    name: "Mixed Straight",
    tiles: [
      t("bamboo", 1),
      t("bamboo", 2),
      t("bamboo", 3),
      t("circles", 1),
      t("circles", 2),
      t("circles", 3),
      t("characters", 1),
      t("characters", 2),
      t("characters", 3),
      t("bamboo", 5),
      t("bamboo", 6),
      t("bamboo", 7),
      t("circles", 5),
      t("circles", 5),
    ],
    winningTile: t("circles", 5),
    settings: { selfDraw: false, waitType: "pair" },
  },
  {
    name: "Self-Draw + Flowers",
    tiles: [
      t("bamboo", 3),
      t("bamboo", 4),
      t("bamboo", 5),
      t("circles", 4),
      t("circles", 5),
      t("circles", 6),
      t("characters", 2),
      t("characters", 3),
      t("characters", 4),
      t("bamboo", 6),
      t("bamboo", 7),
      t("bamboo", 8),
      t("circles", 9),
      t("circles", 9),
      t("flowers", 1),
      t("flowers", 2),
      t("flowers", 3),
    ],
    winningTile: t("circles", 9),
    settings: { selfDraw: true, waitType: "pair" },
  },
  {
    name: "Below Minimum",
    tiles: [
      t("bamboo", 1),
      t("bamboo", 2),
      t("bamboo", 3),
      t("circles", 3),
      t("circles", 4),
      t("circles", 5),
      t("characters", 6),
      t("characters", 7),
      t("characters", 8),
      t("bamboo", 5),
      t("bamboo", 6),
      t("bamboo", 7),
      t("circles", 2),
      t("circles", 2),
    ],
    winningTile: t("circles", 2),
    settings: { selfDraw: false, waitType: "pair" },
  },
];

// ── Reference content accordion ───────────────────────────────────────────────

// Native <details> keeps the content in the server-rendered HTML even when
// collapsed, so crawlers still index it — unlike a modal that mounts on click.
function Accordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-b border-[#D9CBA9]/60 last:border-b-0">
      <summary className="flex items-center justify-between gap-3 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <h2 className="font-semibold font-serif text-[#21201C] text-base">
          {title}
        </h2>
        <ChevronDown
          size={16}
          className="text-[#8A7A63] flex-shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="space-y-2 pb-4">{children}</div>
    </details>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [winningTile, setWinningTile] = useState<Tile | null>(null);
  const [settings, setSettings] =
    useState<HandSettingsValues>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState("tiles");
  const [hasScored, setHasScored] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const updateTiles = (t: Tile[]) => {
    setTiles(t);
    // Winning tile must be one of the hand tiles — clear it if its kind is gone
    if (winningTile && !t.some((tile) => tileKey(tile) === tileKey(winningTile))) {
      setWinningTile(null);
    }
    setHasScored(false);
  };
  const updateWinningTile = (ts: Tile[]) => {
    setWinningTile(ts[0] ?? null);
    setHasScored(false);
  };
  const updateSettings = (s: HandSettingsValues) => {
    setSettings(s);
    setHasScored(false);
  };

  const nonFlowerTiles = tiles.filter((t) => t.suit !== "flowers");
  const flowerTiles = tiles.filter((t) => t.suit === "flowers");

  const result = useMemo(() => {
    if (
      !hasScored ||
      nonFlowerTiles.length < 14 ||
      nonFlowerTiles.length > 18 ||
      !winningTile
    )
      return null;
    return scoreHand({
      tiles: nonFlowerTiles,
      flowers: flowerTiles.length,
      winningTile,
      declaredMelds: [],
      selfDraw: settings.selfDraw,
      seatWind: settings.seatWind,
      prevalentWind: settings.prevalentWind,
      waitType: settings.waitType,
      minPoints: settings.minPoints,
      isLastTile: settings.isLastTile,
      isRobbingKong: settings.isRobbingKong,
      isOutOnKong: settings.isOutOnKong,
      isLastClaim: settings.isLastClaim,
      isLastDraw: settings.isLastDraw,
    });
  }, [hasScored, nonFlowerTiles, winningTile, settings, flowerTiles.length]);

  const handleScore = () => {
    setHasScored(true);
    setActiveTab("result");
  };

  const handleReset = () => {
    setTiles([]);
    setWinningTile(null);
    setSettings(DEFAULT_SETTINGS);
    setHasScored(false);
    setActiveTab("tiles");
    setCapturedPhoto(null);
  };

  const loadSample = (sample: SampleHand) => {
    setTiles(sample.tiles);
    setWinningTile(sample.winningTile);
    setSettings({ ...DEFAULT_SETTINGS, ...sample.settings });
    setHasScored(false);
    setActiveTab("tiles");
  };

  const canScore =
    nonFlowerTiles.length >= 14 &&
    nonFlowerTiles.length <= 18 &&
    winningTile !== null;

  const tileCountLabel = () => {
    if (nonFlowerTiles.length === 0) return "No tiles";
    if (nonFlowerTiles.length < 14) return `${nonFlowerTiles.length}/14 tiles`;
    if (nonFlowerTiles.length > 18)
      return `${nonFlowerTiles.length} tiles — too many`;
    return `${nonFlowerTiles.length} tiles selected`;
  };

  return (
    <div className="min-h-screen bg-[#F6F1E6] shoji-grid">
      {/* Header */}
      <header className="bg-[#F6F1E6] border-b border-[#D9CBA9] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#179e4b] inline-block flex-shrink-0" />
            <div>
              <h1 className="text-lg font-black font-serif text-[#21201C] leading-tight">
                The Mahjong Calculator
              </h1>
              <p className="text-xs text-[#8A7A63]">By Maya Arafa</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs px-2 py-1 rounded-full font-medium",
                nonFlowerTiles.length === 14
                  ? "bg-[#179e4b]/10 text-[#179e4b]"
                  : "bg-[#D9CBA9]/30 text-[#8A7A63]",
              )}
            >
              {tileCountLabel()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs border-[#e51e28]/40 text-[#e51e28] hover:border-[#e51e28] hover:bg-[#e51e28]/5 bg-transparent"
            >
              Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Sample hands strip */}
        <div>
          <p className="text-xs text-[#8A7A63] font-medium uppercase tracking-wide mb-2">
            Try a sample hand
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SAMPLE_HANDS.map((s) => (
              <button
                key={s.name}
                onClick={() => loadSample(s)}
                className="flex-shrink-0 bg-[#EFE7D8] border border-[#D9CBA9] rounded-lg px-3 py-2 text-xs font-medium text-[#21201C] hover:border-[#1a449a] hover:bg-[#F6F1E6] transition-colors whitespace-nowrap"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger
              value="photo"
              className="text-xs flex items-center gap-1.5"
            >
              <Camera size={15} />
              <span className="hidden sm:inline">Photo</span>
            </TabsTrigger>
            <TabsTrigger
              value="tiles"
              className="text-xs flex items-center gap-1.5"
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Tiles</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="text-xs flex items-center gap-1.5"
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger
              value="result"
              className="text-xs flex items-center gap-1.5"
            >
              <Trophy size={15} />
              <span className="hidden sm:inline">Result</span>
            </TabsTrigger>
          </TabsList>

          {/* Photo tab */}
          <TabsContent value="photo" className="mt-3">
            <div className="bg-[#EFE7D8] rounded-xl border border-[#D9CBA9] p-3 sm:p-4 space-y-3">
              <h2 className="font-semibold font-serif text-[#21201C] text-sm">
                Photo Input
              </h2>
              <p className="text-xs text-[#8A7A63]">
                Take or upload a photo of your hand, then enter tiles manually
                below.
              </p>
              <PhotoInput
                onImageCaptured={(url) => setCapturedPhoto(url)}
                onTilesRecognized={(tilespecs: TileSpec[]) => {
                  const parsed = tilespecs
                    .filter(isValidTileSpec)
                    .map((s) => makeTile(s.suit as never, s.value as never));
                  setTiles(parsed);
                  setWinningTile(null);
                  setHasScored(false);
                  setActiveTab("tiles");
                }}
                preview={capturedPhoto}
                onClearPreview={() => setCapturedPhoto(null)}
              />
            </div>
          </TabsContent>

          {/* Tiles tab */}
          <TabsContent value="tiles" className="mt-3 space-y-3">
            <div className="bg-[#EFE7D8] rounded-xl border border-[#D9CBA9] p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <h2 className="font-semibold font-serif text-[#21201C] text-sm">
                    Your Hand
                  </h2>
                  <p className="text-xs text-[#8A7A63]">
                    Select 14 tiles (flowers are extra)
                  </p>
                </div>
                {nonFlowerTiles.length >= 14 && nonFlowerTiles.length <= 18 && (
                  <span className="text-xs text-[#179e4b] font-medium">
                    ✓ Complete
                  </span>
                )}
              </div>
              <TilePicker
                selectedTiles={tiles}
                onChange={updateTiles}
                maxTiles={18}
                showFlowers
              />
            </div>

            <div className="bg-[#EFE7D8] rounded-xl border border-[#D9CBA9] p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <h2 className="font-semibold font-serif text-[#21201C] text-sm">
                    Winning Tile
                  </h2>
                  <p className="text-xs text-[#8A7A63]">
                    Which tile completed your hand?
                  </p>
                </div>
                {winningTile && (
                  <span className="text-xs bg-[#1a449a]/10 text-[#1a449a] border border-[#1a449a]/30 px-2 py-0.5 rounded-full font-medium">
                    Set ✓
                  </span>
                )}
              </div>
              <TilePicker
                selectedTiles={winningTile ? [winningTile] : []}
                onChange={updateWinningTile}
                singleSelect
                maxTiles={1}
                allowedTiles={tiles}
              />
            </div>

            <Button
              className="w-full h-12 text-base font-bold"
              disabled={!canScore}
              onClick={() => setActiveTab("settings")}
            >
              {canScore ? (
                <span className="flex items-center gap-2">
                  <SlidersHorizontal size={16} />
                  Next: Settings
                </span>
              ) : nonFlowerTiles.length < 14 ? (
                `Need ${14 - nonFlowerTiles.length} more tile${14 - nonFlowerTiles.length === 1 ? "" : "s"}`
              ) : nonFlowerTiles.length > 18 ? (
                `Too many tiles (max 18 with 4 kongs)`
              ) : (
                "Select winning tile"
              )}
            </Button>
          </TabsContent>

          {/* Settings tab */}
          <TabsContent value="settings" className="mt-3 space-y-3">
            <div className="bg-[#EFE7D8] rounded-xl border border-[#D9CBA9] p-3 sm:p-4">
              <h2 className="font-semibold font-serif text-[#21201C] text-sm mb-4">
                Hand Settings
              </h2>
              <HandSettings values={settings} onChange={updateSettings} />
            </div>
            <Button
              className="w-full h-12 text-base font-bold"
              disabled={!canScore}
              onClick={handleScore}
            >
              {canScore ? (
                <span className="flex items-center gap-2">
                  <Calculator size={16} />
                  Calculate Score
                </span>
              ) : (
                <span>Select tiles first</span>
              )}
            </Button>
          </TabsContent>

          {/* Result tab */}
          <TabsContent value="result" className="mt-3 space-y-3">
            {result ? (
              <>
                <ScoreResult
                  result={result}
                  basePoints={settings.basePoints}
                  paymentStyle={settings.paymentStyle}
                />
                <Button
                  variant="outline"
                  className="w-full border-[#D9CBA9] text-[#e51e28] hover:border-[#e51e28] hover:bg-[#e51e28]/5 bg-transparent"
                  onClick={() => setActiveTab("tiles")}
                >
                  ← Edit Hand
                </Button>
              </>
            ) : (
              <div className="bg-[#EFE7D8] rounded-xl border border-[#D9CBA9] p-8 text-center text-[#8A7A63]">
                <Trophy size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  Enter your tiles then press &quot;Calculate Score&quot;
                </p>
                <Button className="mt-4" onClick={() => setActiveTab("tiles")}>
                  Enter Tiles →
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Sticky score strip */}
        {hasScored && result && activeTab !== "result" && (
          <button
            onClick={() => setActiveTab("result")}
            className={cn(
              "w-full rounded-xl border-2 p-3 flex items-center justify-between",
              result.meetsMinimum
                ? "border-[#179e4b] bg-[#179e4b]/10 text-[#179e4b]"
                : "border-[#e51e28] bg-[#e51e28]/10 text-[#e51e28]",
            )}
          >
            <span className="text-sm font-semibold flex items-center gap-2">
              {result.meetsMinimum ? (
                <>
                  <Check size={14} />
                  {result.fanPoints} Fan ({result.totalPoints} total)
                </>
              ) : (
                <>
                  <AlertTriangle size={14} />
                  {result.fanPoints}/{result.minPoints} Fan — below minimum
                </>
              )}
            </span>
            <span className="text-xs opacity-70">View →</span>
          </button>
        )}

        {/* Reference content — rendered outside the tabs so it is in the
            initial HTML for search crawlers, and useful to first-time visitors */}
        <section className="bg-[#EFE7D8] rounded-xl border border-[#D9CBA9] px-4 sm:px-6 py-3 sm:py-4 mt-2">
          <p className="text-xs text-[#8A7A63] font-medium uppercase tracking-wide py-1">
            Guide &amp; FAQ
          </p>

          <Accordion title="How mahjong scoring works in Chinese Official Rules">
            <p className="text-sm text-[#8A7A63] leading-relaxed">
              Chinese Official Rules — also called MCR, or Mahjong Competition
              Rules — scores a winning hand by adding up every scoring pattern it
              contains. Each pattern is worth a set number of points, called{" "}
              <em>fan</em>, ranging from 1 fan for common shapes like a Pure
              Double Chow up to 88 fan for rare hands such as Big Four Winds or
              Nine Gates.
            </p>
            <p className="text-sm text-[#8A7A63] leading-relaxed">
              Patterns stack, so a single hand usually scores several at once.
              The rules also define which patterns exclude each other, so a
              higher pattern absorbs the lower ones it implies rather than
              double-counting them. A hand must reach a minimum total — 8 fan by
              default under MCR — before it can be declared a win. This
              calculator applies those exclusions automatically and totals what
              remains.
            </p>
          </Accordion>

          <Accordion title="Scoring your hand from a photo">
            <p className="text-sm text-[#8A7A63] leading-relaxed">
              Instead of entering fourteen tiles by hand, you can photograph the
              hand in front of you. Open the Photo tab, take a picture or upload
              one, then drag the crop box around just your row of tiles — a tight
              crop reads far more reliably than a whole table, because the tiles
              fill more of the image.
            </p>
            <p className="text-sm text-[#8A7A63] leading-relaxed">
              The cropped image is sent to a vision model that identifies each
              tile and fills in the Tiles tab for you. Recognition is not
              perfect, particularly on bamboo tiles where the count of stalks
              matters, so check the detected tiles and tap any that are wrong to
              correct them before scoring.
            </p>
          </Accordion>

          <Accordion title="Payment styles explained">
            <p className="text-sm text-[#8A7A63] leading-relaxed">
              When you win on a discard, different regions settle up
              differently, so the calculator offers three options in Settings.
            </p>
            <ul className="text-sm text-[#8A7A63] leading-relaxed space-y-1.5 list-disc pl-5">
              <li>
                <strong className="text-[#21201C] font-medium">MCR</strong> —
                every player pays the base fee, and the discarder additionally
                pays your hand score. This is the official tournament settlement.
              </li>
              <li>
                <strong className="text-[#21201C] font-medium">
                  Discarder Only
                </strong>{" "}
                — the discarder pays your hand score and the other two players
                pay nothing.
              </li>
              <li>
                <strong className="text-[#21201C] font-medium">
                  Discarder Pays All
                </strong>{" "}
                — the discarder covers all three shares alone, a common house
                rule that penalises careless discards heavily.
              </li>
            </ul>
            <p className="text-sm text-[#8A7A63] leading-relaxed">
              On a self-drawn win all three opponents pay, so the setting does
              not apply and is hidden.
            </p>
          </Accordion>

          <Accordion title="Common questions">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-[#21201C]">
                What is a fan?
              </h3>
              <p className="text-sm text-[#8A7A63] leading-relaxed">
                A fan is the point value of a single scoring pattern. Your hand
                score is the sum of the fan from every pattern it contains, plus
                any bonus for flowers and special winning conditions.
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-[#21201C]">
                Which rule set does this calculator use?
              </h3>
              <p className="text-sm text-[#8A7A63] leading-relaxed">
                Chinese Official Rules (MCR), the 81-pattern system used in
                international competition. It is not Japanese Riichi scoring, so
                yaku, dora and han are not calculated here.
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-[#21201C]">
                Does the order I enter tiles matter?
              </h3>
              <p className="text-sm text-[#8A7A63] leading-relaxed">
                No. The scoring engine tries every valid way of splitting your
                tiles into sets and pairs, then keeps whichever arrangement
                scores highest. You can enter tiles in any order.
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-[#21201C]">
                Are flower tiles counted?
              </h3>
              <p className="text-sm text-[#8A7A63] leading-relaxed">
                Yes. Flowers are bonus tiles that sit outside the fourteen-tile
                hand and each add a point. Add them in the Flowers tab of the
                tile picker and they are included automatically.
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-[#21201C]">
                Can I change the minimum score needed to win?
              </h3>
              <p className="text-sm text-[#8A7A63] leading-relaxed">
                Yes. MCR sets the minimum at 8 fan, but many casual games use a
                lower threshold. Both the minimum and the base points are
                adjustable in Settings.
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-[#21201C]">
                Is it free?
              </h3>
              <p className="text-sm text-[#8A7A63] leading-relaxed">
                Yes — the calculator and the photo recognition are both free to
                use, with no account required.
              </p>
            </div>
          </Accordion>
        </section>
      </main>
    </div>
  );
}
