
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'icon' | 'full';
}

/**
 * Fidel AI Brand Identity
 * High-fidelity SVG recreation of the user-provided logo and icon.
 * This ensures the logo is always sharp, loads instantly, and matches the brand perfectly.
 */
export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', variant = 'icon' }) => {
  const dimensions = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-48 h-48',
    xl: 'w-64 h-64'
  };

  const primaryGreen = "#064e3b"; // Imperial Green from design
  const secondaryGreen = "#004d3d"; // Deep forest
  const highlightGreen = "#059669"; // Emerald for "AI"

  const BookIcon = () => (
    <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Stylized Open Book */}
      <path 
        d="M256 420c-40-60-120-80-200-80v-280c80 0 160 20 200 80 40-60 120-80 200-80v280c-80 0-160 20-200 80z" 
        fill={primaryGreen} 
      />
      <path 
        d="M256 140c0-60 80-80 200-80v280c-120 0-200 20-200 80V140z" 
        fill={secondaryGreen} 
        opacity="0.3"
      />
      
      {/* Magnifying Glass on the right page */}
      <circle cx="360" cy="180" r="45" stroke="white" strokeWidth="12" fill={primaryGreen} />
      <path d="M395 215L425 245" stroke="white" strokeWidth="12" strokeLinecap="round" />
      
      {/* Star inside magnifying glass */}
      <path 
        d="M360 165l4 10h11l-9 7 3 11-9-7-9 7 3-11-9-7h11l4-10z" 
        fill="white" 
      />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={`${dimensions[size]} ${className} flex items-center justify-center`}>
        <BookIcon />
      </div>
    );
  }

  return (
    <div className={`${className} flex flex-col items-center justify-center gap-4`}>
      <div className={dimensions[size]}>
        <BookIcon />
      </div>
      <div className="flex flex-col items-center">
        <h2 className="text-slate-900 font-black tracking-[0.05em] leading-none text-center" style={{ fontSize: size === 'xl' ? '3.5rem' : '2.5rem' }}>
          FIDEL<span style={{ color: highlightGreen }}>AI</span>
        </h2>
      </div>
    </div>
  );
};
