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
          background: 'linear-gradient(150deg, #1e1b4b 0%, #312e81 30%, #4f46e5 65%, #6366f1 100%)',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '22px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative ring — depth layer */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            width: '440px',
            height: '440px',
            borderRadius: '220px',
            border: '52px solid rgba(255,255,255,0.04)',
            top: '36px',
            left: '36px',
          }}
        />

        {/* R$ — main mark */}
        <div
          style={{
            display: 'flex',
            fontSize: '190px',
            fontWeight: '900',
            color: 'white',
            letterSpacing: '-7px',
            lineHeight: 1,
          }}
        >
          R$
        </div>

        {/* Ascending bar chart */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '13px' }}>
          {/* Bar 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '5px', background: '#22c55e' }} />
            <div style={{ width: '38px', height: '50px', background: 'rgba(255,255,255,0.20)', borderRadius: '7px' }} />
          </div>
          {/* Bar 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '5px', background: '#22c55e' }} />
            <div style={{ width: '38px', height: '78px', background: 'rgba(255,255,255,0.34)', borderRadius: '7px' }} />
          </div>
          {/* Bar 3 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '13px', height: '13px', borderRadius: '7px', background: '#22c55e' }} />
            <div style={{ width: '38px', height: '108px', background: 'rgba(255,255,255,0.50)', borderRadius: '7px' }} />
          </div>
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
