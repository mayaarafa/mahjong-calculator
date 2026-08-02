# The Mahjong Calculator

A hand scorer for **Chinese Official Rules (MCR)** mahjong. Upload a photo of your hand or enter tiles manually, set your game conditions, and get an instant breakdown of your fan points and payment amounts.

## Features

- **Photo recognition** — take a photo or upload an image; tiles are identified using Claude's vision API
- **Manual tile entry** — pick tiles by suit across Bamboo, Circles, Characters, Winds, Dragons, and Flowers
- **Full MCR scoring** — calculates fan points for all standard patterns, special hands, and bonus conditions
- **Payment calculator** — supports MCR, Discarder Only, and Discarder Pays All payment styles
- **Game settings** — seat wind, prevalent wind, wait type, minimum points to win, base points, and special conditions (Last Tile, Kong variants, etc.)
- **Mobile-first** — responsive layout optimised for phone use at the table

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) — `claude-sonnet-5` for tile recognition

## Getting Started

```bash
npm install
```

Create a `.env.local` file with your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-...
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  page.tsx              # Main app shell (tabs: Photo, Tiles, Settings, Result)
  layout.tsx            # Fonts, metadata, Google Analytics
  icon.tsx              # Favicon (pyramid of three coloured squares)
  api/
    recognize-tiles/    # POST endpoint — sends image to Claude, returns tile list
components/
  PhotoInput.tsx        # Camera / upload UI with recognition status
  TilePicker.tsx        # Suit-tabbed tile selector with count badges
  HandSettings.tsx      # Game settings panel
  ScoreResult.tsx       # Fan breakdown + payment table
  MahjongTileSvg.tsx    # Tile image renderer
lib/
  mahjong/
    tiles.ts            # Tile types and helpers
    scoringEngine.ts    # MCR scoring logic and payment calculation
    scoringRules.ts     # Pattern definitions
```

## Running Tests

```bash
npm test
```
