
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 relative overflow-hidden">
      <main className="flex-1 overflow-y-auto relative bg-white touch-pan-y safe-area-inset-top safe-area-inset-bottom">
        {children}
      </main>
    </div>
  );
};
