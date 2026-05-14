import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(150deg, #1e1b4b 0%, #312e81 30%, #4f46e5 65%, #6366f1 100%)',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '8px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative ring */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            width: '154px',
            height: '154px',
            borderRadius: '77px',
            border: '18px solid rgba(255,255,255,0.05)',
            top: '13px',
            left: '13px',
          }}
        />

        {/* R$ */}
        <div
          style={{
            display: 'flex',
            fontSize: '67px',
            fontWeight: '900',
            color: 'white',
            letterSpacing: '-2.5px',
            lineHeight: 1,
          }}
        >
          R$
        </div>

        {/* Ascending bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '2px', background: '#22c55e' }} />
            <div style={{ width: '14px', height: '18px', background: 'rgba(255,255,255,0.22)', borderRadius: '3px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '2px', background: '#22c55e' }} />
            <div style={{ width: '14px', height: '27px', background: 'rgba(255,255,255,0.36)', borderRadius: '3px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '3px', background: '#22c55e' }} />
            <div style={{ width: '14px', height: '38px', background: 'rgba(255,255,255,0.52)', borderRadius: '3px' }} />
          </div>
        </div>
      </div>
    ),
    { width: 180, height: 180 }
  )
}
