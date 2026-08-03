import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest } from "next/server";

// Passed explicitly — without it the SDK falls back to Google Cloud
// application-default credentials and fails with an unrelated error
const API_KEY = process.env.GEMINI_API_KEY;
const client = new GoogleGenAI({ apiKey: API_KEY });

// Free tier gives this model 15 RPM / 500 requests per day.
// Swap for "gemini-3.1-flash-lite" (same limits) or a Flash model (5 RPM / 20 RPD).
const MODEL = "gemini-3.5-flash-lite";

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

const PROMPT = `You are an expert at reading mahjong tiles from photos.

STEP 1 — Find the player's hand:
Look for the neat horizontal row of face-up tiles arranged close to the camera in the foreground, along the nearest edge of the table. This is the player's hand. IGNORE everything else:
- The large pile of tiles in the middle of the table (the wall/discard heap)
- Tiles along the far or side edges (other players' hands or discards)
- Face-down tiles
- Any tiles not part of this specific neat foreground row

STEP 2 — Read each tile left to right using these descriptions:

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

STEP 3 — Fill in "readings" FIRST, one entry per tile, left to right:
  "Tile 1: bamboo 3 (counted 3 stalks)"
  "Tile 2: west wind (西 character)"
  "Tile 3: circles 6 (2 columns of 3 dots)"
For bamboo state how many stalks you counted. For circles state the dot arrangement.
For winds/dragons state the Chinese character. Counting explicitly here before filling in
"tiles" forces careful reading.

STEP 4 — Fill in "tiles" to match your readings exactly, in the same order.
Sanity checks: a standard hand has 13–18 non-flower tiles; no more than 4 copies of any
non-flower tile; no more than 1 of each flower. Recount if any check fails.

Value format: use "1"–"9" for bamboo/circles/characters/flowers;
"east"/"south"/"west"/"north" for winds; "red"/"green"/"white" for dragons.

If the image is too unclear to read any tiles, return an empty "tiles" array.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    readings: {
      type: Type.ARRAY,
      description: "Per-tile reasoning, left to right, one entry per tile",
      items: { type: Type.STRING },
    },
    tiles: {
      type: Type.ARRAY,
      description: "The identified tiles, same order as readings",
      items: {
        type: Type.OBJECT,
        properties: {
          suit: {
            type: Type.STRING,
            enum: [
              "bamboo",
              "circles",
              "characters",
              "winds",
              "dragons",
              "flowers",
            ],
          },
          value: {
            type: Type.STRING,
            description:
              '"1"-"9" for bamboo/circles/characters/flowers; wind or dragon name otherwise',
          },
        },
        required: ["suit", "value"],
        propertyOrdering: ["suit", "value"],
      },
    },
  },
  required: ["readings", "tiles"],
  // Generate the reasoning before committing to tile identities
  propertyOrdering: ["readings", "tiles"],
};

interface TileSpec {
  suit: string;
  value: number | string;
}

const NUMBERED_SUITS = ["bamboo", "circles", "characters", "flowers"];

// The schema returns every value as a string; numbered suits need real numbers
// so the response shape stays the same as before.
function coerceValue(suit: string, value: string): number | string {
  return NUMBERED_SUITS.includes(suit) ? Number(value) : value;
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
  if (!API_KEY) {
    return Response.json(
      { error: "Server is missing GEMINI_API_KEY — set it in .env.local" },
      { status: 500 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: "Too many requests — please wait a minute and try again." },
      { status: 429 },
    );
  }

  const { imageData } = await request.json();

  if (typeof imageData !== "string") {
    return Response.json({ error: "Invalid image format" }, { status: 400 });
  }

  const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return Response.json({ error: "Invalid image format" }, { status: 400 });
  }

  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ] as const;
  const mimeType = match[1] as (typeof ALLOWED_TYPES)[number];
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return Response.json({ error: "Unsupported image type" }, { status: 400 });
  }

  const base64Data = match[2];
  // Inline image data must fit in the request payload; the client crop keeps
  // images well under this, so hitting it means something went wrong upstream.
  if (base64Data.length > 14_000_000) {
    return Response.json(
      { error: "Image too large — please use a smaller photo or crop tighter" },
      { status: 413 },
    );
  }

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: PROMPT },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        // -1 lets the model decide how much to think; counting benefits from it
        thinkingConfig: { thinkingBudget: -1 },
      },
    });

    const text = response.text;
    if (!text) {
      return Response.json(
        { error: "Empty response from vision model" },
        { status: 502 },
      );
    }

    // responseSchema guarantees well-formed JSON, so a plain parse is enough
    const parsed = JSON.parse(text) as {
      tiles?: { suit: string; value: string }[];
    };

    const tiles: TileSpec[] = (parsed.tiles ?? []).map((t) => ({
      suit: t.suit,
      value: coerceValue(t.suit, t.value),
    }));

    if (tiles.length === 0) {
      return Response.json({
        error: "Cannot identify tiles from this image",
      });
    }

    return Response.json({
      tiles: sanitizeTiles(tiles),
      winningTile: null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
