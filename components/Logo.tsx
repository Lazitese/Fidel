
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'icon' | 'full';
}

/**
 * Fidel AI Brand Identity
 * Uses the official logo image
 */
export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', variant = 'icon' }) => {
  const dimensions = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-48 h-48',
    xl: 'w-64 h-64'
  };

  return (
    <div className={`${dimensions[size]} ${className} flex items-center justify-center`}>
      <img
        src="/logo.png"
        alt="Fidel AI Logo"
        className="w-full h-full object-contain"
      />
    </div>
  );
};
