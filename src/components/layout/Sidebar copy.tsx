import React from 'react';
import {
  Brain,
  CheckSquare,
  Lightbulb,
  Calendar,
  FolderOpen,
  Home,
  LogOut,
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

export const Sidebar = () => {
  const { signOut } = useAuth();

  return (
    <div className="w-64 min-h-screen flex flex-col justify-between border-r border-purple-500/30 bg-black/10">
      {/* Header */}
      <div className="p-6 border-b border-purple-500/30">
        <h1 className="text-2xl font-bold text-purple-400 font-futuristic flex items-center gap-2">
          MakeCommand
        </h1>
        <p className="text-purple-200 text-sm mt-1">Command Center</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'text-gray-400 hover:text-purple-300 hover:bg-purple-800/10'
              }`
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sign Out Button */}
      <div className="p-4 border-t border-purple-500/30">
        <button
          onClick={signOut}
          className="w-full px-4 py-3 flex items-center gap-3 text-gray-400 hover:text-red-400 hover:bg-red-900/10 transition-all duration-300"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
