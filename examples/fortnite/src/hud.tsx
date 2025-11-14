import { useViverseProfile } from '@react-three/viverse'
import { useState } from 'react'
import { useAmmo } from './app.js'

export function HUD() {
  const [health, setHealth] = useState(50)
  const ammo = useAmmo((s) => s.ammo)

  const { name } = useViverseProfile() ?? { name: 'Anonymous', activeAvatar: null }

  const percent = Math.max(0, Math.min(100, health))

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          color: '#fff',
          zIndex: 100000,
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: 2 }}>{name}</div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 28,
          left: 28,
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(0,0,0,0.2)',
          padding: '8px 12px',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 22, lineHeight: 1, transform: 'translate(0, -2px)' }}>+</div>
        <div
          style={{
            width: 260,
            height: 20,
            background: 'rgba(255,255,255,0.3)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              background: 'linear-gradient(90deg,rgb(31, 224, 102), #2dbb5f)',
            }}
          />
        </div>
        <div style={{ fontWeight: 800, fontSize: 18, minWidth: 36, textAlign: 'right' }}>{Math.round(health)}</div>
      </div>

      <div
        style={{
          zIndex: 100000,
          position: 'absolute',
          bottom: 28,
          right: 28,
          color: '#fff',
          textAlign: 'right',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4, fontWeight: 700 }}>AMMO</div>
        <div style={{ fontWeight: 800, fontSize: 38 }}>
          {ammo}
          <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 'normal' }}>/ 12</span>
        </div>
      </div>

      {/* Crosshair */}
      <div
        style={{
          zIndex: 100000,
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      >
        {/* center dot */}
        <div
          style={{
            position: 'absolute',
            width: 2,
            height: 2,
            borderRadius: 1,
            background: 'rgba(255,255,255,0.55)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
            transform: 'translate(-1px, -1px)',
          }}
        />
        {/* top line */}
        <div
          style={{
            position: 'absolute',
            left: -1,
            top: -22,
            width: 2,
            height: 8,
            borderRadius: 1,
            background: 'rgba(255,255,255,0.55)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
          }}
        />
        {/* bottom line */}
        <div
          style={{
            position: 'absolute',
            left: -1,
            top: 14,
            width: 2,
            height: 8,
            borderRadius: 1,
            background: 'rgba(255,255,255,0.55)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
          }}
        />
        {/* left line */}
        <div
          style={{
            position: 'absolute',
            top: -1,
            left: -22,
            width: 8,
            height: 2,
            borderRadius: 1,
            background: 'rgba(255,255,255,0.55)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
          }}
        />
        {/* right line */}
        <div
          style={{
            position: 'absolute',
            top: -1,
            left: 14,
            width: 8,
            height: 2,
            borderRadius: 1,
            background: 'rgba(255,255,255,0.55)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
          }}
        />
      </div>
    </>
  )
}
