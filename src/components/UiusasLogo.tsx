import React from 'react';

interface UiusasLogoProps {
  className?: string;
}

export function UiusasLogo({ className = "" }: UiusasLogoProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" /> {/* cyan-400 */}
          <stop offset="100%" stopColor="#d946ef" /> {/* fuchsia-400 */}
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Outer Shield/U Shape */}
      <path 
        d="M 20 20 L 20 60 C 20 75 35 90 50 90 C 65 90 80 75 80 60 L 80 20 L 65 20 L 65 60 C 65 68 58 75 50 75 C 42 75 35 68 35 60 L 35 20 Z" 
        fill="url(#neonGradient)" 
        filter="url(#glow)"
      />
      
      {/* Inner Medical Cross */}
      <path 
        d="M 45 35 L 55 35 L 55 45 L 65 45 L 65 55 L 55 55 L 55 65 L 45 65 L 45 55 L 35 55 L 35 45 L 45 45 Z" 
        fill="#ffffff" 
        filter="url(#glow)"
      />
      
      {/* Top Tech Bars */}
      <rect x="25" y="10" width="15" height="5" fill="#22d3ee" filter="url(#glow)" />
      <rect x="60" y="10" width="15" height="5" fill="#d946ef" filter="url(#glow)" />
    </svg>
  );
}
