import React, { useState } from 'react';
import { Sparkles, Timer } from 'lucide-react';
import DailyPlan from './DailyPlan';
import TimedWorkout from './TimedWorkout';
import type { UserProfile } from '../types';

interface Props { user: UserProfile; }

const TABS = [
  { id: 'plan',  label: "Today's Plan", icon: Sparkles, desc: 'AI-generated daily workout' },
  { id: 'quick', label: 'Quick Train',  icon: Timer,    desc: 'Set your time, get a workout' },
];

export default function TrainingTab({ user }: Props) {
  const [active, setActive] = useState<'plan' | 'quick'>('plan');

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
                onClick={() => setActive(tab.id as 'plan' | 'quick')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        {/* Sub-tab description */}
        <p className="text-xs text-gray-500 text-center py-2">
          {TABS.find(t => t.id === active)?.desc}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {active === 'plan'  && <DailyPlan user={user} />}
        {active === 'quick' && <TimedWorkout user={user} />}
      </div>
    </div>
  );
}
