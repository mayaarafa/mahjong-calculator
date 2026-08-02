import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic();

// In-memory rate limiter: 10 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 10;
const WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= LIMIT) return false;
  entry.count++;
  return true;
}

const PROMPT = `You are an expert at reading mahjong tiles from photos. Follow these steps carefully.

STEP 1 — Find the player's hand:
Look for the neat horizontal row of face-up tiles arranged close to the camera in the foreground, along the nearest edge of the table. This is the player's hand. IGNORE everything else:
- The large pile of tiles in the middle of the table (the wall/discard heap)
- Tiles along the far or side edges (other players' hands or discards)
- Face-down tiles
- Any tiles not part of this specific neat foreground row

STEP 2 — Read each tile left to right:
For each tile in the foreground row, identify its suit and value using these descriptions:

BAMBOO (綠/bamboo sticks):
- Bamboo 1: has a colourful bird (phoenix/peacock) design — NOT bamboo sticks
- Bamboo 2–9: vertical green bamboo stalks/tubes; COUNT the stalks carefully:
  2 = two stalks, 3 = three stalks, 4 = four stalks, 5 = five stalks (often arranged 2+3),
  6 = six stalks (2×3), 7 = seven stalks, 8 = eight stalks (2×4), 9 = nine stalks (3×3)
- Note: bamboo tiles often have a mix of green and red/blue stalks

CIRCLES (筒/dots):
- Round dot patterns; COUNT the dots: 1 dot, 2 dots (1×2), 3 dots (triangle), 4 dots (square),
  5 dots (cross/quincunx), 6 dots (2×3), 7 dots, 8 dots (2×4), 9 dots (3×3)

CHARACTERS (萬/man):
- Has a large Chinese number at the top (一二三四五六七八九) and the character 萬 below
- Usually also has a small Arabic numeral (1–9) at the top-left corner
- The Chinese numeral IS the value: 一=1, 二=2, 三=3, 四=4, 五=5, 六=6, 七=7, 八=8, 九=9

WINDS (風):
- 東 (or 东) = "east", 南 = "south", 西 = "west", 北 = "north"
- These are single Chinese characters on an otherwise plain tile

DRAGONS (三元):
- 中 in red = "red" dragon
- 發 (or 发) in green = "green" dragon
- Plain white/blank rectangle with only a thin border = "white" dragon

FLOWERS (花):
- Decorative tiles with floral or seasonal art
- 梅/plum=1, 蘭/orchid=2, 菊/chrysanthemum=3, 竹/bamboo-plant=4
- 春/spring=5, 夏/summer=6, 秋/autumn=7, 冬/winter=8
- Include flowers in the tiles array; they are bonus tiles

STEP 3 — Check your count:
- A standard hand has 13–18 non-flower tiles. Recount if outside this range.
- No more than 4 copies of any single non-flower tile. If you counted 5+, recount — it is always 4 or fewer.
- No more than 1 copy of each flower tile.

STEP 4 — Identify the winning tile (optional):
If one tile is slightly separated or pulled apart from the rest of the hand, it may be the declared winning tile. If so, include it both in "tiles" AND in "winningTile". Otherwise set "winningTile" to null.

STEP 5 — List every tile out loud:
Before writing JSON, write each tile from left to right on its own line in this format:
  Tile 1: bamboo 3 (counted 3 stalks)
  Tile 2: west wind (西 character)
  Tile 3: circles 6 (2 columns of 3 dots)
  ...
For bamboo tiles explicitly state how many stalks you counted. For wind/dragon tiles state the Chinese character you see. For circles tiles state the dot arrangement. This forces careful counting before committing to output.

STEP 6 — Output:
Return ONLY valid JSON in exactly this format (no explanation, no markdown fences):
{
  "tiles": [
    { "suit": "bamboo", "value": 1 },
    { "suit": "circles", "value": 5 },
    { "suit": "characters", "value": 9 },
    { "suit": "winds", "value": "east" },
    { "suit": "dragons", "value": "red" },
    { "suit": "flowers", "value": 1 }
  ],
  "winningTile": null
}

Valid suit values: "bamboo", "circles", "characters", "winds", "dragons", "flowers"
Valid value types: 1–9 (integer) for bamboo/circles/characters/flowers; "east"/"south"/"west"/"north" for winds; "red"/"green"/"white" for dragons

If the image is too unclear to read, return: { "error": "Cannot identify tiles from this image" }`;

interface TileSpec {
  suit: string;
  value: number | string;
}

function tileKey(t: TileSpec): string {
  return `${t.suit}:${t.value}`;
}

// Enforce max 4 of each non-flower tile, max 1 of each flower
function sanitizeTiles(tiles: TileSpec[]): TileSpec[] {
  const counts = new Map<string, number>();
  const result: TileSpec[] = [];
  for (const tile of tiles) {
    const key = tileKey(tile);
    const current = counts.get(key) ?? 0;
    const limit = tile.suit === "flowers" ? 1 : 4;
    if (current < limit) {
      result.push(tile);
      counts.set(key, current + 1);
    }
  }
  return result;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: "Too many requests — please wait a minute and try again." },
      { status: 429 },
    );
  }

  const { imageData } = await request.json();

  const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return Response.json({ error: "Invalid image format" }, { status: 400 });
  }

  const mediaType = match[1] as
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp";
  const base64Data = match[2];

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const text =
      textBlock && "text" in textBlock ? String(textBlock.text).trim() : "";
    const cleaned = text
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();

    let parsed: {
      tiles?: TileSpec[];
      winningTile?: TileSpec | null;
      error?: string;
    };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return Response.json(
          { error: "Unexpected response from vision model" },
          { status: 500 },
        );
      }
    }

    if (parsed.error) return Response.json(parsed);

    // Sanitize: cap each tile at its legal maximum
    const sanitizedTiles = sanitizeTiles(parsed.tiles ?? []);

    return Response.json({
      tiles: sanitizedTiles,
      winningTile: parsed.winningTile ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
