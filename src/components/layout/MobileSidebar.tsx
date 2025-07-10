
import React from 'react';
import {
  Brain,
  CheckSquare,
  Lightbulb,
  Calendar,
  FolderOpen,
  Home,
  LogOut,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Dashboard' },
  { path: '/thoughts', icon: Brain, label: 'Thoughts' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/ideas', icon: Lightbulb, label: 'Ideas' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/projects', icon: FolderOpen, label: 'Projects' },
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchBackground: () => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ 
  isOpen, 
  onClose, 
  onSwitchBackground 
}) => {
  const { signOut } = useAuth();

  const handleSignOut = () => {
    signOut();
    onClose();
  };

  const handleBackgroundSwitch = () => {
    onSwitchBackground();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Mobile Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-black/90 backdrop-blur-md border-r-2 border-purple-500/40 z-50 md:hidden transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/30">
          <div>
            <h1 className="text-2xl font-bold text-purple-400 font-futuristic">
              MakeCommand
            </h1>
            <p className="text-purple-200 text-sm mt-1">
              Command Center
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-purple-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-4 rounded-lg transition-all duration-300 transform border text-lg ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-300 border-purple-400 shadow-[0_4px_10px_rgba(128,0,255,0.3)]'
                    : 'text-gray-400 border-gray-500/50 hover:text-purple-300 hover:border-purple-400 hover:bg-purple-800/10 active:scale-95'
                }`
              }
            >
              <item.icon size={24} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 space-y-3 border-t border-purple-500/30">
          <button
            onClick={handleBackgroundSwitch}
            className="w-full px-4 py-4 flex items-center gap-4 text-gray-400 border border-gray-500/50 hover:text-purple-300 hover:bg-purple-800/10 hover:border-purple-400 transition-all duration-300 rounded-lg text-lg active:scale-95"
          >
            <ImageIcon size={24} />
            <span className="font-medium">Switch Background</span>
          </button>

          <button
            onClick={handleSignOut}
            className="w-full px-4 py-4 flex items-center gap-4 text-gray-400 border border-gray-500/50 hover:text-red-400 hover:bg-red-900/50 hover:border-red-500 transition-all duration-300 rounded-lg text-lg active:scale-95"
          >
            <LogOut size={24} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};
