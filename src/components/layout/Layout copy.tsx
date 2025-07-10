import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  // List of local background images
  const backgrounds = [
    '/backgrounds/bg1.jpg',
    '/backgrounds/bg2.jpg',
    '/backgrounds/bg3.jpg',
    '/backgrounds/bg4.jpg',
    '/backgrounds/bg5.jpg',
    '/backgrounds/bg6.jpg',
    '/backgrounds/bg7.jpg',
    '/backgrounds/bg8.jpg',
    '/backgrounds/bg9.jpg',
    '/backgrounds/bg10.jpg',
    '/backgrounds/bg11.jpg',
    '/backgrounds/bg12.jpg',
    '/backgrounds/bg13.jpg',
    '/backgrounds/bg14.jpg',
    '/backgrounds/bg15.jpg',
  ];

  const [bgIndex, setBgIndex] = useState(0);
  const [fade, setFade] = useState(false);

  const handleSwitchBackground = () => {
    //setFade(true); // Trigger fade out
    setBgIndex((prev) => (prev + 1) % backgrounds.length);
    //setTimeout(() => {
      
      //setFade(false); // Trigger fade in
    //}); // Duration should match fade-out animation
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden text-white">
      {/* Background Image Layer with fade */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
          fade ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          backgroundImage: `url(${backgrounds[bgIndex]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: -1,
        }}
      />

      {/* Sidebar */}
      <Sidebar onSwitchBackground={handleSwitchBackground} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-black/50">
        {children}
      </main>
    </div>
  );
};
