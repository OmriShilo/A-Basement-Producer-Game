import React from 'react';

/**
 * The full-bleed bedroom-studio backdrop.
 *
 * The design handoff specifies a real photo here ("bedroom studio — photo")
 * and ships a placeholder slot instead. This is a drawn stand-in built to sit
 * correctly under the spec'd treatment: a rgba(10,10,10,0.45) scrim plus the
 * 3px halftone dot-grain, both applied in styles.css (.backdrop::after).
 *
 * TO SWAP IN THE REAL PHOTO: drop the file in /public and replace the <svg>
 * below with <img className="backdrop-img" src="/bedroom-studio.jpg" alt="" />.
 * Nothing else needs to change — the scrim and grain live in CSS.
 */
export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <svg
        className="backdrop-img"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Tuned to survive the 45% black scrim: lit surfaces sit around
              #6a6478 so they still read as a room once darkened. */}
          <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6a6478" />
            <stop offset="100%" stopColor="#37333f" />
          </linearGradient>
          <radialGradient id="glowWarm" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#c9873f" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#c9873f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glowScreen" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#7fb6c9" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7fb6c9" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="window" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fa4c4" />
            <stop offset="100%" stopColor="#4a5670" />
          </linearGradient>
        </defs>

        {/* room */}
        <rect width="1600" height="900" fill="url(#wall)" />
        <rect y="640" width="1600" height="260" fill="#2a2733" />
        <rect y="632" width="1600" height="10" fill="#5f5a6d" />

        {/* window, left */}
        <rect x="96" y="120" width="250" height="300" fill="url(#window)" />
        <rect x="96" y="120" width="250" height="300" fill="none" stroke="#211f29" strokeWidth="12" />
        <line x1="221" y1="120" x2="221" y2="420" stroke="#211f29" strokeWidth="8" />
        <line x1="96" y1="270" x2="346" y2="270" stroke="#211f29" strokeWidth="8" />

        {/* tacked-up paper on the wall */}
        {[
          [470, 130, 120, 160, -3], [610, 150, 96, 128, 4], [726, 122, 110, 150, -6],
          [470, 310, 100, 120, 5], [590, 300, 130, 96, -2],
          [1180, 140, 150, 200, 3], [1350, 170, 110, 150, -4], [1190, 360, 120, 90, 6],
        ].map(([x, y, w, h, r], i) => (
          <g key={i} transform={`rotate(${r} ${x + w / 2} ${y + h / 2})`}>
            <rect x={x} y={y} width={w} height={h} fill={i % 3 === 0 ? '#7e7889' : '#6b6577'} />
            <rect x={x + 8} y={y + 10} width={w - 16} height="6" fill="#a49dae" opacity="0.7" />
            <rect x={x + 8} y={y + h - 26} width={w * 0.5} height="5" fill="#a49dae" opacity="0.5" />
          </g>
        ))}

        {/* shelf of records */}
        <rect x="1150" y="470" width="330" height="14" fill="#5a5568" />
        {Array.from({ length: 26 }).map((_, i) => (
          <rect key={i} x={1158 + i * 12} y={402} width="9" height="68"
            fill={['#736d80', '#7d6f5c', '#6a687a', '#7c6c76'][i % 4]} />
        ))}

        {/* desk */}
        <rect x="380" y="596" width="860" height="18" fill="#7a6450" />
        <rect x="380" y="614" width="860" height="10" fill="#4a3c31" />
        <rect x="418" y="624" width="16" height="120" fill="#4a3c31" />
        <rect x="1186" y="624" width="16" height="120" fill="#4a3c31" />

        {/* monitor speakers */}
        {[[432, 470], [1092, 470]].map(([x, y], i) => (
          <g key={i}>
            <rect x={x} y={y} width="104" height="126" fill="#3c3a47" />
            <rect x={x + 6} y={y + 6} width="92" height="114" fill="#57546a" />
            <circle cx={x + 52} cy={y + 74} r="30" fill="#2b2a35" />
            <circle cx={x + 52} cy={y + 74} r="12" fill="#605d73" />
            <circle cx={x + 52} cy={y + 30} r="11" fill="#2b2a35" />
            <circle cx={x + 88} cy={y + 116} r="3" fill="#c9873f" />
          </g>
        ))}

        {/* laptop, open, screen lit */}
        <g>
          <path d="M700 476 L900 476 L916 592 L684 592 Z" fill="#3a3846" />
          <path d="M710 484 L890 484 L903 584 L697 584 Z" fill="#7fb0c6" />
          <path d="M710 484 L890 484 L886 512 L714 512 Z" fill="#a3cbdb" opacity="0.75" />
          {Array.from({ length: 7 }).map((_, i) => (
            <rect key={i} x={722} y={522 + i * 8} width={140 - (i % 3) * 34} height="3" fill="#4e6f80" opacity="0.9" />
          ))}
          <path d="M672 592 L928 592 L940 606 L660 606 Z" fill="#565266" />
        </g>

        {/* MIDI keyboard */}
        <g transform="translate(640 612)">
          <rect width="330" height="46" fill="#3f3d4b" />
          <rect x="8" y="8" width="314" height="30" fill="#e8e6e2" opacity="0.42" />
          {Array.from({ length: 22 }).map((_, i) => (
            <rect key={i} x={8 + i * 14.3} y="8" width="1.6" height="30" fill="#26252e" opacity="0.8" />
          ))}
          {Array.from({ length: 22 }).map((_, i) =>
            i % 7 === 2 || i % 7 === 6 ? null : (
              <rect key={`b${i}`} x={16 + i * 14.3} y="8" width="6" height="18" fill="#2b2a35" opacity="0.85" />
            )
          )}
        </g>

        {/* mic on a boom arm */}
        <g stroke="#4c4959" strokeWidth="9" fill="none">
          <path d="M1240 300 L1240 596" />
          <path d="M1240 330 L1090 372" />
        </g>
        <g transform="rotate(-14 1074 378)">
          <rect x="1052" y="352" width="44" height="86" rx="0" fill="#605c72" />
          <rect x="1058" y="360" width="32" height="52" fill="#3b3947" />
        </g>

        {/* chair back */}
        <rect x="740" y="700" width="190" height="200" fill="#3a3849" />
        <rect x="752" y="712" width="166" height="120" fill="#4c4a5e" />

        {/* cables */}
        <path d="M470 596 C 470 700, 560 690, 596 760" stroke="#191821" strokeWidth="7" fill="none" />
        <path d="M1140 596 C 1150 690, 1060 700, 1020 772" stroke="#191821" strokeWidth="7" fill="none" />

        {/* light */}
        <ellipse cx="800" cy="520" rx="330" ry="210" fill="url(#glowScreen)" />
        <ellipse cx="1320" cy="250" rx="260" ry="240" fill="url(#glowWarm)" />
      </svg>
    </div>
  );
}
