# The Mahjong Calculator

A hand scorer for **Chinese Official Rules (MCR)** mahjong. Upload a photo of your hand or enter tiles manually, set your game conditions, and get an instant breakdown of your fan points and payment amounts.

## Features

- **Photo recognition** — take a photo, crop to your hand row, and tiles are identified using Gemini's vision API
- **Manual tile entry** — pick tiles by suit across Bamboo, Circles, Characters, Winds, Dragons, and Flowers
- **Full MCR scoring** — calculates fan points for all standard patterns, special hands, and bonus conditions
- **Payment calculator** — supports MCR, Discarder Only, and Discarder Pays All payment styles
- **Game settings** — seat wind, prevalent wind, wait type, minimum points to win, base points, and special conditions (Last Tile, Kong variants, etc.)
- **Mobile-first** — responsive layout optimised for phone use at the table

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Google Gen AI SDK](https://github.com/googleapis/js-genai) — `gemini-3.5-flash-lite` for tile recognition

## Getting Started

```bash
npm install
```

Create a `.env.local` file with your [Google AI Studio](https://aistudio.google.com/apikey) API key:

```
GEMINI_API_KEY=...
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Note on the free tier:** `gemini-3.5-flash-lite` allows 15 requests/minute and 500/day,
> shared across all users of a deployment. Google also uses free-tier content to improve its
> products, so consider a paid key before putting this in front of real users. The model is
> set via the `MODEL` constant in `app/api/recognize-tiles/route.ts`.

## Project Structure

```
app/
  page.tsx              # Main app shell (tabs: Photo, Tiles, Settings, Result)
  layout.tsx            # Fonts, metadata, Google Analytics
  icon.tsx              # Favicon (pyramid of three coloured squares)
  api/
    recognize-tiles/    # POST endpoint — sends image to Gemini, returns tile list
components/
  PhotoInput.tsx        # Camera / upload UI with drag-to-crop and recognition status
  TilePicker.tsx        # Suit-tabbed tile selector with count badges
  HandSettings.tsx      # Game settings panel
  ScoreResult.tsx       # Fan breakdown + payment table
  MahjongTileSvg.tsx    # Tile image renderer
lib/
  mahjong/
    tiles.ts            # Tile types and helpers
    grouping.ts         # Hand decomposition (melds, pairs, seven pairs)
    scoringEngine.ts    # MCR scoring logic and payment calculation
    scoringRules.ts     # Pattern definitions
```

## Running Tests

```bash
npm test
```
