
import React from 'react';
import { Menu } from 'lucide-react';

interface MobileHeaderProps {
  onMenuClick: () => void;
  title: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuClick, title }) => {
  return (
    <header className="md:hidden bg-black/80 backdrop-blur-md border-b border-purple-500/30 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <button
        onClick={onMenuClick}
        className="p-2 text-purple-400 hover:text-purple-300 transition-colors active:scale-95"
      >
        <Menu size={24} />
      </button>
      
      <h1 className="text-lg font-bold text-purple-400 font-futuristic">
        {title}
      </h1>
      
      <div className="w-10" /> {/* Spacer for centering */}
    </header>
  );
};
