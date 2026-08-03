import { ImageResponse } from 'next/og'

// Next.js wires this up as og:image automatically via the file convention.
// 1200×630 is the standard social card ratio.
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'The Mahjong Calculator — Chinese Official Rules hand scorer'

const SQUARE = 78
const GAP = 20

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F6F1E6',
          gap: 44,
        }}
      >
        {/* Same three-square motif as the favicon */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: GAP,
          }}
        >
          <div
            style={{
              width: SQUARE,
              height: SQUARE,
              borderRadius: 14,
              background: '#179e4b',
            }}
          />
          <div style={{ display: 'flex', gap: GAP }}>
            <div
              style={{
                width: SQUARE,
                height: SQUARE,
                borderRadius: 14,
                background: '#e51e28',
              }}
            />
            <div
              style={{
                width: SQUARE,
                height: SQUARE,
                borderRadius: 14,
                background: '#1a449a',
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ fontSize: 68, fontWeight: 700, color: '#21201C' }}>
            The Mahjong Calculator
          </div>
          <div style={{ fontSize: 32, color: '#8A7A63' }}>
            Chinese Official Rules scorer · photo tile recognition
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
