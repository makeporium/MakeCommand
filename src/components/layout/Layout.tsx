import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileSidebar } from './MobileSidebar';
import { MobileHeader } from './MobileHeader';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case '/dashboard':
      return 'Dashboard';
    case '/thoughts':
      return 'Neural Thoughts';
    case '/tasks':
      return 'Task Management';
    case '/ideas':
      return 'Idea Capture';
    case '/calendar':
      return 'Smart Calendar';
    case '/projects':
      return 'Project Central';
    default:
      return 'MakeCommand';
  }
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

  const [currentBg, setCurrentBg] = useState(() => backgrounds[Math.floor(Math.random() * backgrounds.length)]);
  const [nextBg, setNextBg] = useState<string | null>(null);
  const [isFading, setIsFading] = useState(false);

  // Preload all background images into memory during idle time
  React.useEffect(() => {
    const preloadImages = () => {
      backgrounds.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preloadImages);
    } else {
      setTimeout(preloadImages, 1000);
    }
  }, []);

  const handleSwitchBackground = () => {
    if (isFading) return;

    const currentIndex = backgrounds.indexOf(currentBg);
    const nextIndex = (currentIndex + 1) % backgrounds.length;
    const targetBg = backgrounds[nextIndex];

    const img = new Image();
    img.src = targetBg;

    const triggerFade = () => {
      setNextBg(targetBg);
      // Wait a frame for nextBg layer to mount with opacity-0, then fade to opacity-100
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsFading(true);
        });
      });
    };

    if (img.complete) {
      triggerFade();
    } else {
      img.onload = triggerFade;
    }
  };

  const handleFadeEnd = () => {
    if (isFading && nextBg) {
      setCurrentBg(nextBg);
      setNextBg(null);
      setIsFading(false);
    }
  };

  const handleMobileMenuToggle = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="relative flex min-h-screen overflow-hidden text-white">
      {/* Persistent Base Background Layer */}
      <div
        className="fixed inset-0 z-[-2] h-full w-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${currentBg})`,
        }}
      />

      {/* Smooth Cross-Fade Overlay Layer */}
      {nextBg && (
        <div
          onTransitionEnd={handleFadeEnd}
          className={`fixed inset-0 z-[-1] h-full w-full bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-in-out ${
            isFading ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(${nextBg})`,
          }}
        />
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar onSwitchBackground={handleSwitchBackground} />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onSwitchBackground={handleSwitchBackground}
      />

      {/* Main Content */}
      {/* Reverted to original and correct flex-1 for the backdrop effect */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <MobileHeader
          onMenuClick={handleMobileMenuToggle}
          title={pageTitle}
        />

        {/* Main Content Area */}
        {/* The flex-1 on this main tag is correct for the main content area to fill space */}
        <main className="flex-1 overflow-y-auto bg-black/50 backdrop-blur-[0.5px]">
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};