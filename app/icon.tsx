import { ImageResponse } from 'next/og'

// 96px keeps it well above the 48px Google recommends for search results,
// and stays crisp on high-DPI screens. All values below are 3x the 32px design.
export const size = { width: 96, height: 96 }
export const contentType = 'image/png'

export default function Icon() {
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
          gap: '9px',
        }}
      >
        {/* Top: green */}
        <div style={{ width: 33, height: 33, borderRadius: 6, background: '#179e4b' }} />
        {/* Bottom row: red + blue */}
        <div style={{ display: 'flex', gap: '9px' }}>
          <div style={{ width: 33, height: 33, borderRadius: 6, background: '#e51e28' }} />
          <div style={{ width: 33, height: 33, borderRadius: 6, background: '#1a449a' }} />
        </div>
      </div>
    ),
    { ...size },
  )
}
