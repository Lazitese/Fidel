
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 relative overflow-hidden">
      {/* 
        The main container uses safe-area-inset classes defined in CSS 
        to ensure content is visible around camera notches and gesture bars.
      */}
      <main className="flex-1 overflow-y-auto relative bg-white touch-pan-y">
        <div className="min-h-full flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
};
