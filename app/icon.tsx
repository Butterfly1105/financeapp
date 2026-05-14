import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(180deg, #6366f1 0%, #4338ca 100%)',
          borderRadius: '108px',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: '172px',
            fontWeight: '900',
            color: 'white',
            letterSpacing: '-6px',
            lineHeight: 1,
          }}
        >
          R$
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
          <div style={{ width: '28px', height: '48px', background: 'rgba(255,255,255,0.28)', borderRadius: '6px' }} />
          <div style={{ width: '28px', height: '68px', background: 'rgba(255,255,255,0.42)', borderRadius: '6px' }} />
          <div style={{ width: '28px', height: '92px', background: 'rgba(255,255,255,0.58)', borderRadius: '6px' }} />
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
