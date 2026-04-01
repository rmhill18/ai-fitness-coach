import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Sparkles, Utensils, Dumbbell,
  TrendingUp, BarChart2, Scan, User, Zap, Timer, Watch,
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import DailyPlan from './components/DailyPlan';
import MealLogger from './components/MealLogger';
import WorkoutTracker from './components/WorkoutTracker';
import ProgressAnalysis from './components/ProgressAnalysis';
import WeeklyReport from './components/WeeklyReport';
import BodyAnalysis from './components/BodyAnalysis';
import UserProfilePage from './components/UserProfile';
import QuickFood from './components/QuickFood';
import TimedWorkout from './components/TimedWorkout';
import WearableDashboard from './components/WearableDashboard';
import type { UserProfile } from './types';

const STORAGE_KEY = 'fitness_user_id';

// Split nav into two rows for 11 tabs
const NAV_TABS_ROW1 = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'plan', label: 'Plan', icon: Sparkles },
  { id: 'meals', label: 'Meals', icon: Utensils },
  { id: 'workout', label: 'Train', icon: Dumbbell },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'report', label: 'Report', icon: BarChart2 },
];

const NAV_TABS_ROW2 = [
  { id: 'body', label: 'Body', icon: Scan },
  { id: 'quickfood', label: 'Quick Food', icon: Zap },
  { id: 'timed', label: 'Quick Train', icon: Timer },
  { id: 'health', label: 'Health', icon: Watch },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (storedId) {
      fetch(`/api/users/${storedId}`)
        .then(r => r.ok ? r.json() : null)
        .then(u => {
          if (u) setUser(u);
          else setShowOnboarding(true);
        })
        .catch(() => setShowOnboarding(true))
        .finally(() => setLoading(false));
    } else {
      setShowOnboarding(true);
      setLoading(false);
    }
  }, []);

  const handleUserSaved = (u: UserProfile) => {
    localStorage.setItem(STORAGE_KEY, String(u.id));
    setUser(u);
    setShowOnboarding(false);
    setActiveTab('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary-500/30 border-t-primary-500 rounded-full spin mx-auto mb-4" />
          <p className="text-gray-400">Loading AI Fitness Coach…</p>
        </div>
      </div>
    );
  }

  if (showOnboarding || !user) {
    return (
      <div className="min-h-screen bg-gray-950">
        {/* App Header */}
        <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-white text-lg">AI Fitness Coach</span>
        </div>
        <UserProfilePage onSave={handleUserSaved} />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <Dashboard user={user} onNavigate={setActiveTab} />;
      case 'plan': return <DailyPlan user={user} />;
      case 'meals': return <MealLogger user={user} />;
      case 'workout': return <WorkoutTracker user={user} />;
      case 'progress': return <ProgressAnalysis user={user} />;
      case 'report': return <WeeklyReport user={user} />;
      case 'body': return <BodyAnalysis user={user} />;
      case 'quickfood': return <QuickFood user={user} />;
      case 'timed': return <TimedWorkout user={user} />;
      case 'health': return <WearableDashboard user={user} />;
      case 'profile': return (
        <UserProfilePage
          existing={user}
          onSave={handleUserSaved}
        />
      );
      default: return <Dashboard user={user} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top Header */}
      <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-black text-white text-base">AI Fitness Coach</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 capitalize hidden sm:block">
            Goal: {user.goal.replace('_', ' ')}
          </span>
          <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center">
            <span className="text-primary-400 text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto pb-32">
        {renderContent()}
      </main>

      {/* Bottom Navigation — two rows */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-sm border-t border-gray-800 z-10">
        <div className="max-w-2xl mx-auto">
          {/* Row 1 */}
          <div className="grid grid-cols-6 border-b border-gray-800/50">
            {NAV_TABS_ROW1.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center py-2 gap-0.5 transition-colors ${
                    active ? 'text-primary-400' : 'text-gray-500 hover:text-gray-400'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]' : ''}`} />
                  <span className="text-[9px] font-medium">{tab.label}</span>
                  {active && <div className="w-1 h-1 bg-primary-400 rounded-full" />}
                </button>
              );
            })}
          </div>
          {/* Row 2 */}
          <div className="grid grid-cols-5">
            {NAV_TABS_ROW2.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center py-2 gap-0.5 transition-colors ${
                    active ? 'text-primary-400' : 'text-gray-500 hover:text-gray-400'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]' : ''}`} />
                  <span className="text-[9px] font-medium">{tab.label}</span>
                  {active && <div className="w-1 h-1 bg-primary-400 rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
