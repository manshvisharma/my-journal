import React from 'react';

interface MoodFlowerGlyphProps {
  valence: number; // 0..6
  size?: number; // px
  className?: string;
}

export const MoodFlowerGlyph: React.FC<MoodFlowerGlyphProps> = ({
  valence,
  size = 52,
  className = '',
}) => {
  // Normalize valence
  const v = Math.max(0, Math.min(6, Math.round(valence)));

  // Color schemes according to Apple Journal State of Mind design
  // 0: Deep Indigo / Violet 8-point star flower
  // 1-2: Lavender 6-point flower
  // 3: Teal-blue pentagon
  // 4-5: Green glowing pentagon
  // 6: Warm Orange/Yellow 5-petal flower

  if (v === 0) {
    // 8-point deep indigo/violet star flower
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 drop-shadow-[0_2px_8px_rgba(106,35,138,0.4)] ${className}`}
      >
        <defs>
          <radialGradient id="indigoCenter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="40%" stopColor="#818CF8" />
            <stop offset="85%" stopColor="#4338CA" />
            <stop offset="100%" stopColor="#312E81" />
          </radialGradient>
          <filter id="glowIndigo" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer 8 Petals Layer */}
        <g opacity="0.85" filter="url(#glowIndigo)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <path
              key={i}
              d="M50 50 C42 22 40 10 50 4 C60 10 58 22 50 50 Z"
              fill="url(#indigoCenter)"
              opacity="0.8"
              transform={`rotate(${angle} 50 50)`}
            />
          ))}
        </g>

        {/* Inner Secondary Petal Layer offset by 22.5 deg */}
        <g opacity="0.95">
          {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle, i) => (
            <path
              key={`inner-${i}`}
              d="M50 50 C44 28 42 18 50 12 C58 18 56 28 50 50 Z"
              fill="#A5B4FC"
              opacity="0.65"
              transform={`rotate(${angle} 50 50)`}
            />
          ))}
        </g>

        {/* Center glowing core */}
        <circle cx="50" cy="50" r="14" fill="#3730A3" opacity="0.9" />
        <circle cx="50" cy="50" r="8" fill="#818CF8" opacity="0.8" />
        <circle cx="50" cy="50" r="3.5" fill="#FFFFFF" opacity="0.95" />
      </svg>
    );
  }

  if (v === 1 || v === 2) {
    // 6-point lavender / purple flower (Matches Screenshot 3, 4, 6)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 drop-shadow-[0_2px_10px_rgba(139,92,246,0.35)] ${className}`}
      >
        <defs>
          <linearGradient id="lavenderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DDD6FE" />
            <stop offset="45%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>
          <linearGradient id="lavenderLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EDE9FE" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#C4B5FD" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Outer 6 Layered Petals */}
        <g opacity="0.9">
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <path
              key={i}
              d="M50 50 C38 25 34 12 50 5 C66 12 62 25 50 50 Z"
              fill="url(#lavenderGrad)"
              opacity="0.85"
              transform={`rotate(${angle} 50 50)`}
            />
          ))}
        </g>

        {/* Inner 6 Petals (Offset by 30 degrees) */}
        <g opacity="0.95">
          {[30, 90, 150, 210, 270, 330].map((angle, i) => (
            <path
              key={`in-${i}`}
              d="M50 50 C41 30 38 18 50 12 C62 18 59 30 50 50 Z"
              fill="url(#lavenderLight)"
              transform={`rotate(${angle} 50 50)`}
            />
          ))}
        </g>

        {/* Central Core & Highlights */}
        <circle cx="50" cy="50" r="15" fill="#5B21B6" opacity="0.8" />
        <circle cx="50" cy="50" r="9" fill="#8B5CF6" opacity="0.9" />
        <circle cx="50" cy="50" r="4" fill="#FFFFFF" opacity="0.95" />
      </svg>
    );
  }

  if (v === 3) {
    // Neutral Teal-Blue Pentagon
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 drop-shadow-[0_2px_8px_rgba(20,184,166,0.35)] ${className}`}
      >
        <defs>
          <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#99F6E4" />
            <stop offset="50%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#0F766E" />
          </linearGradient>
        </defs>

        {/* Pentagon Layers */}
        <g transform="translate(50, 50)">
          <polygon
            points="0,-42 40,-13 25,34 -25,34 -40,-13"
            fill="url(#tealGrad)"
            opacity="0.75"
          />
          <polygon
            points="0,-34 32,-10 20,27 -20,27 -32,-10"
            fill="#5EEAD4"
            opacity="0.6"
            transform="rotate(36)"
          />
          <polygon
            points="0,-24 23,-7 14,19 -14,19 -23,-7"
            fill="#0D9488"
            opacity="0.85"
          />
        </g>

        <circle cx="50" cy="50" r="6" fill="#CCFBF1" opacity="0.9" />
        <circle cx="50" cy="50" r="2.5" fill="#FFFFFF" />
      </svg>
    );
  }

  if (v === 4 || v === 5) {
    // Green Glowing Pentagon (Matches Screenshot 5)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 drop-shadow-[0_2px_12px_rgba(74,222,128,0.45)] ${className}`}
      >
        <defs>
          <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DCFCE7" />
            <stop offset="40%" stopColor="#86EFAC" />
            <stop offset="75%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#15803D" />
          </linearGradient>
          <filter id="softGlowGreen">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Concentric Rounded Pentagons */}
        <g filter="url(#softGlowGreen)" opacity="0.95">
          <path
            d="M50 8 L88 36 L74 82 L26 82 L12 36 Z"
            fill="url(#greenGrad)"
            opacity="0.8"
          />
          <path
            d="M50 18 L80 40 L69 76 L31 76 L20 40 Z"
            fill="#BBF7D0"
            opacity="0.65"
          />
          <path
            d="M50 28 L70 43 L63 68 L37 68 L30 43 Z"
            fill="#16A34A"
            opacity="0.85"
          />
        </g>

        {/* Center Luminous Core */}
        <circle cx="50" cy="50" r="10" fill="#4ADE80" opacity="0.9" />
        <circle cx="50" cy="50" r="4.5" fill="#FFFFFF" opacity="0.95" />
      </svg>
    );
  }

  // Valence 6: Warm Orange / Yellow 5-Petal Flower (Matches Screenshot 7)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-[0_2px_12px_rgba(251,146,60,0.45)] ${className}`}
    >
      <defs>
        <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="40%" stopColor="#FDBA74" />
          <stop offset="80%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>

      {/* 5 Layered Curved Flower Petals */}
      <g opacity="0.95">
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <path
            key={i}
            d="M50 50 C36 28 32 10 50 6 C68 10 64 28 50 50 Z"
            fill="url(#orangeGrad)"
            opacity="0.9"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
      </g>

      {/* Inner Petal highlights */}
      <g opacity="0.8">
        {[36, 108, 180, 252, 324].map((angle, i) => (
          <circle
            key={`dot-${i}`}
            cx="50"
            cy="32"
            r="8"
            fill="#FEF3C7"
            opacity="0.75"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
      </g>

      {/* Core Center */}
      <circle cx="50" cy="50" r="12" fill="#C2410C" opacity="0.85" />
      <circle cx="50" cy="50" r="7" fill="#F59E0B" opacity="0.95" />
      <circle cx="50" cy="50" r="3" fill="#FFFFFF" opacity="0.95" />
    </svg>
  );
};
