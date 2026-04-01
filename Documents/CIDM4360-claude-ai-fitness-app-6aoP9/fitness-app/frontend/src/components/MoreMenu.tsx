import React from 'react';
import {
  TrendingUp, BarChart2, Scan, User,
  ChevronRight, Activity
} from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
  userName: string;
  userGoal: string;
  userInitial: string;
}

const MENU_ITEMS = [
  {
    id: 'progress',
    label: 'Progress Analysis',
    description: 'AI breakdown of your last 7 days',
    icon: TrendingUp,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    id: 'report',
    label: 'Weekly Report',
    description: 'Full AI-generated weekly review',
    icon: BarChart2,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    id: 'body',
    label: 'Body Analysis',
    description: 'AI body composition from photo',
    icon: Scan,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    id: 'profile',
    label: 'My Profile',
    description: 'Update your stats and goals',
    icon: User,
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
  },
  {
    id: 'subscription',
    label: 'Plans & Pricing',
    description: 'Upgrade for unlimited AI features',
    icon: Activity,
    color: 'text-primary-400',
    bg: 'bg-primary-500/10',
  },
];

export default function MoreMenu({ onNavigate, userName, userGoal, userInitial }: Props) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-5 fade-in">
      {/* Profile summary */}
      <div className="card mb-5 flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-emerald-400 rounded-2xl flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xl font-black">{userInitial}</span>
        </div>
        <div>
          <p className="font-bold text-white text-lg">{userName}</p>
          <p className="text-sm text-gray-400 capitalize">Goal: {userGoal.replace('_', ' ')}</p>
        </div>
        <button
          onClick={() => onNavigate('profile')}
          className="ml-auto text-xs text-primary-400 hover:text-primary-300 font-medium"
        >
          Edit
        </button>
      </div>

      {/* Menu items */}
      <div className="space-y-2">
        {MENU_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full card hover:border-gray-600 transition-colors flex items-center gap-4 text-left"
            >
              <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
