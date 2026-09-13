import React from 'react';
import { FestivalThemeConfig } from '../../config/festivals';

interface FestivalHeaderDecorationProps {
  festival: FestivalThemeConfig | undefined;
  highContrast?: boolean;
}

export const FestivalHeaderDecoration: React.FC<FestivalHeaderDecorationProps> = ({
  festival,
  highContrast = false,
}) => {
  if (!festival || highContrast) return null;

  const key = festival.key;

  return (
    <div
      id={`festival-header-decor-${key.toLowerCase()}`}
      data-testid={`festival-header-decor-${key.toLowerCase()}`}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      {/* 1. HOLI: Multi-color radial gulal splash background */}
      {key === 'HOLI' && (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `
                radial-gradient(circle at 18% 45%, rgba(255, 105, 180, 0.28) 0%, transparent 40%),
                radial-gradient(circle at 45% 30%, rgba(30, 144, 255, 0.24) 0%, transparent 42%),
                radial-gradient(circle at 75% 60%, rgba(255, 215, 0, 0.22) 0%, transparent 38%),
                radial-gradient(circle at 92% 35%, rgba(76, 175, 80, 0.22) 0%, transparent 35%)
              `,
            }}
          />
          {/* Subtle static gulal powder pigment droplets */}
          <svg
            style={{ position: 'absolute', right: '120px', top: '10px', width: '80px', height: '36px', opacity: 0.4 }}
            viewBox="0 0 100 40"
          >
            <circle cx="15" cy="15" r="7" fill="#FF69B4" />
            <circle cx="35" cy="22" r="5" fill="#FFD700" />
            <circle cx="55" cy="12" r="8" fill="#1E90FF" />
            <circle cx="78" cy="25" r="6" fill="#4CAF50" />
            <circle cx="28" cy="10" r="3" fill="#E63946" />
            <circle cx="68" cy="30" r="4" fill="#FF69B4" />
          </svg>
        </div>
      )}

      {/* 2. DIWALI: Warm gold amber background, oil diyas with gentle flame glow, spark dots */}
      {key === 'DIWALI' && (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(123,31,31,0.4) 0%, rgba(212,175,55,0.15) 50%, rgba(123,31,31,0.4) 100%)',
            }}
          />
          {/* Small Diya Motifs along the header */}
          <div style={{ position: 'absolute', right: '160px', top: '12px', display: 'flex', gap: '32px', alignItems: 'center' }}>
            {[1, 2].map((i) => (
              <svg key={i} width="32" height="24" viewBox="0 0 36 26" style={{ opacity: 0.9 }}>
                {/* Diya Base */}
                <path d="M4 16 C 8 24, 28 24, 32 16 C 30 18, 6 18, 4 16 Z" fill="#D4AF37" stroke="#E8A33D" strokeWidth="1" />
                {/* Diya Wick/Flame */}
                <path
                  d="M18 4 C 15 9, 15 14, 18 16 C 21 14, 21 9, 18 4 Z"
                  fill="#FF9900"
                  style={{
                    transformOrigin: '18px 14px',
                    animation: 'diyaFlamePulse 2.8s ease-in-out infinite alternate',
                  }}
                />
                <circle cx="18" cy="11" r="2.5" fill="#FFF7CC" />
              </svg>
            ))}
          </div>
          {/* Subtle static gold spark dots */}
          <svg style={{ position: 'absolute', left: '260px', top: '16px', width: '60px', height: '20px', opacity: 0.6 }} viewBox="0 0 60 20">
            <circle cx="10" cy="10" r="1.5" fill="#FFD700" />
            <circle cx="30" cy="5" r="2" fill="#FFE57F" />
            <circle cx="50" cy="12" r="1.5" fill="#FFD700" />
          </svg>
        </div>
      )}

      {/* 3. NEW YEAR: Midnight navy, gold stars/sparkles, elegant gold header edge */}
      {key === 'NEW_YEAR' && (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(11,19,43,0.6) 0%, rgba(28,37,65,0.4) 50%, rgba(243,198,35,0.08) 100%)',
            }}
          />
          {/* Subtle 4-point gold star sparkles */}
          <div style={{ position: 'absolute', right: '180px', top: '14px', display: 'flex', gap: '28px', opacity: 0.75 }}>
            {[14, 10, 16].map((size, idx) => (
              <svg key={idx} width={size} height={size} viewBox="0 0 24 24">
                <path
                  d="M12 0 L14 9 L23 12 L14 15 L12 24 L10 15 L1 12 L10 9 Z"
                  fill="#F3C623"
                  stroke="#D4AF37"
                  strokeWidth="0.5"
                />
              </svg>
            ))}
          </div>
          {/* Subtle gold bottom accent trim */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(243,198,35,0.5) 50%, transparent 100%)',
            }}
          />
        </div>
      )}

      {/* 4. GUDI PADWA: Saffron gradient, Gudi kalash banner motif, thin rangoli geometric diamond border */}
      {key === 'GUDI_PADWA' && (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(255,153,51,0.2) 0%, rgba(220,38,38,0.12) 100%)',
            }}
          />
          {/* Gudi Pole + Silk Cloth + Kalash Silhouette SVG */}
          <div style={{ position: 'absolute', right: '170px', top: '8px', opacity: 0.9 }}>
            <svg width="28" height="34" viewBox="0 0 32 40">
              {/* Pole */}
              <line x1="16" y1="2" x2="16" y2="38" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
              {/* Inverted Kalash (Pot) on top */}
              <path d="M11 5 C 11 2, 21 2, 21 5 L 20 8 C 18 9, 14 9, 12 8 Z" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="0.8" />
              {/* Bright Saffron & Red Silk Cloth */}
              <path d="M16 9 Q 26 14, 23 26 Q 18 20, 16 23 Z" fill="#FF9933" />
              <path d="M16 10 Q 7 15, 10 25 Q 14 20, 16 22 Z" fill="#DC2626" />
              {/* Neem leaves twig accent */}
              <circle cx="16" cy="9" r="2.5" fill="#15803D" />
            </svg>
          </div>
          {/* Rangoli Diamond Trim along bottom edge */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '5px',
              backgroundImage: 'radial-gradient(circle, #FF9933 1.5px, transparent 1.5px), radial-gradient(circle, #DC2626 1px, transparent 1px)',
              backgroundSize: '12px 5px, 12px 5px',
              backgroundPosition: '0 0, 6px 2.5px',
              opacity: 0.65,
            }}
          />
        </div>
      )}

      {/* 5. CHRISTMAS: Deep pine green gradient, red accent, static delicate snowflakes */}
      {key === 'CHRISTMAS' && (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(22,91,51,0.25) 0%, rgba(187,37,40,0.15) 50%, rgba(22,91,51,0.25) 100%)',
            }}
          />
          {/* Static Snowflakes */}
          <div style={{ position: 'absolute', right: '165px', top: '12px', display: 'flex', gap: '24px', opacity: 0.8 }}>
            {[16, 12, 18].map((size, idx) => (
              <svg key={idx} width={size} height={size} viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.5" fill="none">
                <line x1="12" y1="2" x2="12" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="5" y1="19" x2="19" y2="5" />
                <circle cx="12" cy="12" r="1.5" fill="#D4AF37" stroke="none" />
              </svg>
            ))}
          </div>
          {/* Subtle holly berry accent */}
          <div style={{ position: 'absolute', left: '260px', top: '16px', opacity: 0.75 }}>
            <svg width="24" height="18" viewBox="0 0 24 18">
              <circle cx="9" cy="9" r="3.5" fill="#BB2528" />
              <circle cx="15" cy="8" r="3.5" fill="#BB2528" />
              <circle cx="12" cy="13" r="3.5" fill="#BB2528" />
            </svg>
          </div>
        </div>
      )}

      {/* 6. EID: Deep teal emerald, golden crescent moon, lantern (fanous), 8-point geometric star border */}
      {key === 'EID' && (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(15,92,74,0.3) 0%, rgba(27,77,62,0.2) 60%, rgba(74,21,75,0.15) 100%)',
            }}
          />
          {/* Crescent Moon & Lantern SVG */}
          <div style={{ position: 'absolute', right: '170px', top: '8px', display: 'flex', alignItems: 'center', gap: '14px', opacity: 0.9 }}>
            {/* Crescent Moon */}
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path
                d="M12 3 A 9 9 0 0 0 21 15 A 9 9 0 1 1 12 3 Z"
                fill="#D4AF37"
                stroke="#F3C623"
                strokeWidth="0.5"
              />
            </svg>
            {/* Lantern (Fanous) */}
            <svg width="18" height="28" viewBox="0 0 20 32">
              <path d="M8 2 L12 2 L10 6 Z" fill="#D4AF37" />
              <path d="M6 6 L14 6 L16 18 L4 18 Z" fill="rgba(212,175,55,0.3)" stroke="#D4AF37" strokeWidth="1" />
              <circle cx="10" cy="12" r="2" fill="#FFE57F" />
              <path d="M4 18 L16 18 L12 26 L8 26 Z" fill="#D4AF37" />
              <line x1="10" y1="26" x2="10" y2="30" stroke="#D4AF37" strokeWidth="1" />
            </svg>
          </div>
          {/* 8-pointed geometric star lattice border along bottom edge */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'repeating-linear-gradient(90deg, #D4AF37, #D4AF37 4px, transparent 4px, transparent 10px)',
              opacity: 0.45,
            }}
          />
        </div>
      )}

      {/* 7. INDEPENDENCE DAY: Patriotic horizontal tricolor stripe + stylized Ashoka Chakra */}
      {key === 'INDEPENDENCE_DAY' && (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(255,153,51,0.15) 0%, rgba(255,255,255,0.05) 50%, rgba(19,136,8,0.15) 100%)',
            }}
          />
          {/* Stylized 24-spoke Ashoka Chakra wheel */}
          <div style={{ position: 'absolute', right: '180px', top: '11px', opacity: 0.85 }}>
            <svg width="26" height="26" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="none" stroke="#000080" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="3" fill="#000080" />
              {/* 8 radial spokes for crisp display */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <line
                  key={deg}
                  x1="16"
                  y1="16"
                  x2={16 + 13 * Math.cos((deg * Math.PI) / 180)}
                  y2={16 + 13 * Math.sin((deg * Math.PI) / 180)}
                  stroke="#000080"
                  strokeWidth="1"
                />
              ))}
            </svg>
          </div>
          {/* Horizontal Flag Stripe Band (Saffron / White / Green) */}
          <div
            id="independence-day-flag-stripe"
            data-testid="independence-day-flag-stripe"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '4px',
              display: 'flex',
            }}
          >
            <div style={{ flex: 1, backgroundColor: '#FF9933' }} />
            <div style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
            <div style={{ flex: 1, backgroundColor: '#138808' }} />
          </div>
        </div>
      )}

      {/* 8. REPUBLIC DAY: Formal constitutional structured framing with stepped tricolor chevron borders and formal chakra insignia */}
      {key === 'REPUBLIC_DAY' && (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(0,0,128,0.22) 0%, rgba(15,23,42,0.4) 50%, rgba(0,0,128,0.22) 100%)',
            }}
          />
          {/* Formal Framed Chakra Roundel */}
          <div style={{ position: 'absolute', right: '180px', top: '10px', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.9 }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1.5px solid #D4AF37',
                background: 'rgba(0,0,128,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="13" fill="none" stroke="#2563eb" strokeWidth="1.5" />
                <circle cx="16" cy="16" r="2.5" fill="#2563eb" />
                {[0, 60, 120, 180, 240, 300].map((deg) => (
                  <line
                    key={deg}
                    x1="16"
                    y1="16"
                    x2={16 + 12 * Math.cos((deg * Math.PI) / 180)}
                    y2={16 + 12 * Math.sin((deg * Math.PI) / 180)}
                    stroke="#2563eb"
                    strokeWidth="1.2"
                  />
                ))}
              </svg>
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 'bold',
                fontFamily: 'JetBrains Mono',
                letterSpacing: '1px',
                color: '#D4AF37',
                textTransform: 'uppercase',
              }}
            >
              Constitution
            </span>
          </div>
          {/* Structured Formal Stepped Tricolor Chevron Border */}
          <div
            id="republic-day-formal-chevron-border"
            data-testid="republic-day-formal-chevron-border"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'repeating-linear-gradient(45deg, #FF9933, #FF9933 10px, #FFFFFF 10px, #FFFFFF 20px, #138808 20px, #138808 30px, #000080 30px, #000080 40px)',
              opacity: 0.9,
            }}
          />
        </div>
      )}
    </div>
  );
};
