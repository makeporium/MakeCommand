
import React from 'react';
import {
  Brain,
  CheckSquare,
  Lightbulb,
  Calendar,
  FolderOpen,
  Home,
  LogOut,
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

interface SidebarProps {
  onSwitchBackground: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSwitchBackground }) => {
  const { signOut } = useAuth();

  return (
    <div className="w-64 min-h-screen flex flex-col justify-between border-r-2 border-purple-500/40 bg-black/50 backdrop-blur-[0.5px] font-inter-tight">
      {/* Header */}
      <div className="p-6 border-b border-purple-500/30">
        <h1 className="text-2xl font-bold text-purple-400 font-futuristic flex items-center gap-2 drop-shadow">
          MakeCommand
        </h1>
        <p className="text-purple-200 text-sm mt-1 drop-shadow">
          Command Center
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 transform border ${
                isActive
                  ? 'bg-purple-600/20 text-purple-300 border-purple-400 shadow-[0_4px_10px_rgba(128,0,255,0.3)]'
                  : 'text-gray-400 border-gray-500/50 hover:text-purple-300 hover:border-purple-400 hover:bg-purple-800/10 hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(128,0,255,0.4)]'
              }`
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Switch Background & Sign Out */}
      <div className="p-4 space-y-3 border-t border-purple-500/30">
        <button
          onClick={onSwitchBackground}
          className="w-full px-4 py-3 flex items-center gap-3 text-gray-400 border border-gray-500/50 hover:text-purple-300 hover:bg-purple-800/10 hover:border-purple-400 transition-all duration-300 rounded-lg transform hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(128,0,255,0.4)]"
        >
          <ImageIcon size={20} />
          <span className="font-medium">Switch Background</span>
        </button>

        <button
          onClick={signOut}
          className="w-full px-4 py-3 flex items-center gap-3 text-gray-400 border border-gray-500/50 hover:text-red-400 hover:bg-red-900/50 hover:border-red-500 transition-all duration-300 rounded-lg transform hover:-translate-y-[2px] hover:shadow-[0_6px_15px_rgba(255,0,80,0.3)]"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
