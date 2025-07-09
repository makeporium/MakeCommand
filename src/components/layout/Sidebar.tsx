
import React from 'react';
import { Brain, CheckSquare, Lightbulb, Calendar, FolderOpen, Home, LogOut } from 'lucide-react';
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
    <div className="w-64 bg-gray-900/90 backdrop-blur-sm border-r border-cyan-500/20 h-screen flex flex-col">
      <div className="p-6 border-b border-cyan-500/20">
        <h1 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg"></div>
          NEXUS
        </h1>
        <p className="text-gray-400 text-sm mt-1">Command Center</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-cyan-400 hover:bg-gray-800/50'
              }`
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-cyan-500/20">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-300 w-full"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
