import React, { useState } from 'react';
import { UtensilsCrossed, CalendarDays, Zap } from 'lucide-react';
import MealLogger from './MealLogger';
import MealPlanTab from './MealPlanTab';
import QuickFood from './QuickFood';
import type { UserProfile } from '../types';

interface Props { user: UserProfile; }

type TabId = 'log' | 'plan' | 'quick';

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType; desc: string }> = [
  { id: 'log',   label: 'Log Meal',   icon: UtensilsCrossed, desc: 'Track what you eat today' },
  { id: 'plan',  label: 'Meal Plan',  icon: CalendarDays,    desc: 'Your personalized 7-day plan' },
  { id: 'quick', label: 'Quick Food', icon: Zap,             desc: 'What should I order right now?' },
];

export default function MealsTab({ user }: Props) {
  const [active, setActive] = useState<TabId>('log');

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm px-4 pt-4 pb-0">
        <div className="flex bg-gray-900 rounded-2xl p-1 border border-gray-800">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 text-center py-2">
          {TABS.find(t => t.id === active)?.desc}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {active === 'log'   && <MealLogger user={user} />}
        {active === 'plan'  && <MealPlanTab user={user} />}
        {active === 'quick' && <QuickFood user={user} />}
      </div>
    </div>
  );
}
