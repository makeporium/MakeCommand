
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
      return 'NEXUS';
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

  const [bgIndex, setBgIndex] = useState(() => Math.floor(Math.random() * backgrounds.length));

  const handleSwitchBackground = () => {
    setBgIndex((prev) => (prev + 1) % backgrounds.length);
  };

  const handleMobileMenuToggle = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="relative flex min-h-screen overflow-hidden text-white">
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 transition-opacity duration-500 ease-in-out"
        style={{
          backgroundImage: `url(${backgrounds[bgIndex]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: -1,
        }}
      />

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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <MobileHeader
          onMenuClick={handleMobileMenuToggle}
          title={pageTitle}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-black/50 backdrop-blur-[0.5px]">
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
