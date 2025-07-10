
import React from 'react';
import { Brain, CheckSquare, Lightbulb, Calendar, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const quickActions = [
  { icon: Brain, label: 'New Thought', path: '/thoughts', color: 'from-purple-500 to-pink-500' },
  { icon: CheckSquare, label: 'Add Task', path: '/tasks', color: 'from-blue-500 to-cyan-500' },
  { icon: Lightbulb, label: 'New Idea', path: '/ideas', color: 'from-yellow-500 to-orange-500' },
  { icon: Calendar, label: 'Add Event', path: '/calendar', color: 'from-green-500 to-emerald-500' },
  { icon: FolderOpen, label: 'New Project', path: '/projects', color: 'from-indigo-500 to-purple-500' },
];

export const Dashboard = () => {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Welcome to MakeCommand</h1>
        <p className="text-gray-400 text-base md:text-lg">Your personal Space</p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
        {quickActions.map((action, index) => (
          <Link
            key={action.label}
            to={action.path}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br bg-gray-800/40 border border-gray-700/50 p-4 md:p-6 hover:border-cyan-500/50 transition-all duration-500 hover:scale-105 active:scale-95 touch-manipulation"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300`}>
              <action.icon className="text-white" size={20} />
            </div>
            <h3 className="text-white font-semibold text-sm md:text-base mb-2">{action.label}</h3>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </Link>
        ))}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-cyan-400 mb-3 md:mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
              <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
              <span className="text-gray-300 text-sm md:text-base">System initialized</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-gray-300 text-sm md:text-base">Database connected</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-gray-300 text-sm md:text-base">Authentication active</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-cyan-400 mb-3 md:mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm md:text-base">Database</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-sm md:text-base">Online</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm md:text-base">Authentication</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-sm md:text-base">Active</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm md:text-base">Storage</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-sm md:text-base">Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
