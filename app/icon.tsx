import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
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
          background: '#F6F1E6',
          gap: '3px',
        }}
      >
        {/* Top: green */}
        <div style={{ width: 11, height: 11, borderRadius: 2, background: '#179e4b' }} />
        {/* Bottom row: red + blue */}
        <div style={{ display: 'flex', gap: '3px' }}>
          <div style={{ width: 11, height: 11, borderRadius: 2, background: '#e51e28' }} />
          <div style={{ width: 11, height: 11, borderRadius: 2, background: '#1a449a' }} />
        </div>
      </div>
    ),
    { ...size },
  )
}
