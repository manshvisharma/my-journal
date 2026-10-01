import React from 'react';

interface MoodGlyphProps {
  valence: number; // 0 to 6
  size?: number;
  className?: string;
}

export function getMoodTheme(valence: number) {
  // Return colors for light & dark backgrounds and glyph colors
  if (valence <= 1) {
    // Very Unpleasant / Unpleasant (Indigo / Violet)
    return {
      name: 'Unpleasant',
      color: '#7C3AED',
      petalColor1: 'rgba(124, 58, 237, 0.85)',
      petalColor2: 'rgba(91, 33, 182, 0.65)',
      centerColor: '#DDD6FE',
      lightBg: 'linear-gradient(135deg, #F3E8FF 0%, #EDE9FE 100%)',
      darkBg: 'linear-gradient(135deg, #1C1033 0%, #150D24 100%)',
      textAccent: '#6D28D9',
      borderLight: 'rgba(124, 58, 237, 0.15)',
      borderDark: 'rgba(124, 58, 237, 0.3)',
    };
  } else if (valence === 2 || valence === 3) {
    // Slightly Unpleasant / Neutral (Teal / Cyan)
    return {
      name: 'Neutral',
      color: '#0D9488',
      petalColor1: 'rgba(13, 148, 136, 0.85)',
      petalColor2: 'rgba(15, 118, 110, 0.65)',
      centerColor: '#CCFBF1',
      lightBg: 'linear-gradient(135deg, #E6FFFA 0%, #E0F2FE 100%)',
      darkBg: 'linear-gradient(135deg, #092628 0%, #081B1C 100%)',
      textAccent: '#0F766E',
      borderLight: 'rgba(13, 148, 136, 0.15)',
      borderDark: 'rgba(13, 148, 136, 0.3)',
    };
  } else if (valence === 4 || valence === 5) {
    // Pleasant / Slightly Pleasant (Emerald / Green)
    return {
      name: 'Pleasant',
      color: '#16A34A',
      petalColor1: 'rgba(22, 163, 74, 0.85)',
      petalColor2: 'rgba(21, 128, 61, 0.65)',
      centerColor: '#DCFCE7',
      lightBg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
      darkBg: 'linear-gradient(135deg, #0C2817 0%, #081D11 100%)',
      textAccent: '#15803D',
      borderLight: 'rgba(22, 163, 74, 0.15)',
      borderDark: 'rgba(22, 163, 74, 0.3)',
    };
  } else {
    // Very Pleasant (Orange / Amber / Yellow)
    return {
      name: 'Very Pleasant',
      color: '#EA580C',
      petalColor1: 'rgba(234, 88, 12, 0.85)',
      petalColor2: 'rgba(217, 119, 6, 0.65)',
      centerColor: '#FEF3C7',
      lightBg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
      darkBg: 'linear-gradient(135deg, #321A06 0%, #201004 100%)',
      textAccent: '#C2410C',
      borderLight: 'rgba(234, 88, 12, 0.15)',
      borderDark: 'rgba(234, 88, 12, 0.3)',
    };
  }
}

export const MoodGlyph: React.FC<MoodGlyphProps> = ({ valence, size = 48, className = '' }) => {
  const theme = getMoodTheme(valence);
  const numPetals = valence <= 1 ? 8 : valence <= 3 ? 6 : 5;
  const radius = size * 0.32;
  const petalR = size * 0.22;
  const center = size / 2;

  // Generate petal centers in a circle
  const petals = [];
  for (let i = 0; i < numPetals; i++) {
    const angle = (i * 2 * Math.PI) / numPetals;
    const cx = center + radius * Math.cos(angle);
    const cy = center + radius * Math.sin(angle);
    petals.push({ cx, cy });
  }

  // Inner layer rotated by half angle for rich layering
  const innerPetals = [];
  for (let i = 0; i < numPetals; i++) {
    const angle = ((i + 0.5) * 2 * Math.PI) / numPetals;
    const cx = center + (radius * 0.7) * Math.cos(angle);
    const cy = center + (radius * 0.7) * Math.sin(angle);
    innerPetals.push({ cx, cy });
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <defs>
          <filter id={`glow-${valence}-${size}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={size * 0.05} result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer soft aura */}
        <circle cx={center} cy={center} r={size * 0.44} fill={theme.petalColor2} opacity={0.3} />

        {/* Base Petals Layer */}
        <g filter={`url(#glow-${valence}-${size})`}>
          {petals.map((p, idx) => (
            <circle
              key={`petal-${idx}`}
              cx={p.cx}
              cy={p.cy}
              r={petalR}
              fill={theme.petalColor1}
              opacity={0.8}
            />
          ))}
        </g>

        {/* Inner Layer */}
        {innerPetals.map((p, idx) => (
          <circle
            key={`inner-${idx}`}
            cx={p.cx}
            cy={p.cy}
            r={petalR * 0.85}
            fill={theme.petalColor2}
            opacity={0.9}
          />
        ))}

        {/* Center Glow */}
        <circle cx={center} cy={center} r={size * 0.16} fill={theme.color} opacity={0.95} />

        {/* Tiny Center Dot */}
        <circle cx={center} cy={center} r={size * 0.07} fill={theme.centerColor} />
      </svg>
    </div>
  );
};
