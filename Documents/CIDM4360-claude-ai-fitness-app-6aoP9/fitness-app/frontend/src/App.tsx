import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Sparkles, Utensils, Dumbbell, MoreHorizontal, MessageCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import DailyPlan from './components/DailyPlan';
import MealLogger from './components/MealLogger';
import WorkoutTracker from './components/WorkoutTracker';
import ProgressAnalysis from './components/ProgressAnalysis';
import WeeklyReport from './components/WeeklyReport';
import BodyAnalysis from './components/BodyAnalysis';
import UserProfilePage from './components/UserProfile';
import AICoach from './components/AICoach';
import Subscription from './components/Subscription';
import MoreMenu from './components/MoreMenu';
import type { UserProfile } from './types';

const STORAGE_KEY = 'fitness_user_id';
const PLAN_KEY = 'fitness_plan';

const NAV_TABS = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'plan', label: 'Plan', icon: Sparkles },
  { id: 'coach', label: 'AI Coach', icon: MessageCircle, highlight: true },
  { id: 'meals', label: 'Meals', icon: Utensils },
  { id: 'workout', label: 'Train', icon: Dumbbell },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'elite'>('free');

  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY);
    const storedPlan = localStorage.getItem(PLAN_KEY) as 'free' | 'pro' | 'elite' | null;
    if (storedPlan) setCurrentPlan(storedPlan);

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

  const handleUpgrade = () => setActiveTab('subscription');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-white font-bold text-lg">AI Fitness Coach</p>
          <p className="text-gray-400 text-sm mt-1">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (showOnboarding || !user) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-emerald-400 rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
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
      case 'coach': return <AICoach user={user} isPro={currentPlan !== 'free'} onUpgrade={handleUpgrade} />;
      case 'meals': return <MealLogger user={user} />;
      case 'workout': return <WorkoutTracker user={user} />;
      case 'progress': return <ProgressAnalysis user={user} />;
      case 'report': return <WeeklyReport user={user} />;
      case 'body': return <BodyAnalysis user={user} />;
      case 'profile': return <UserProfilePage existing={user} onSave={handleUserSaved} />;
      case 'subscription': return <Subscription currentPlan={currentPlan} onClose={() => setActiveTab('more')} />;
      case 'more': return (
        <MoreMenu
          onNavigate={setActiveTab}
          userName={user.name}
          userGoal={user.goal}
          userInitial={user.name.charAt(0).toUpperCase()}
        />
      );
      default: return <Dashboard user={user} onNavigate={setActiveTab} />;
    }
  };

  const mainTabs = ['home', 'plan', 'coach', 'meals', 'workout', 'more'];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top Header */}
      <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-white text-base">AI Fitness Coach</span>
          {currentPlan !== 'free' && (
            <span className="text-[10px] font-bold bg-primary-500/20 text-primary-400 border border-primary-500/30 px-2 py-0.5 rounded-full capitalize">
              {currentPlan}
            </span>
          )}
        </div>
        <button
          onClick={() => setActiveTab('more')}
          className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center border border-primary-500/20"
        >
          <span className="text-primary-400 text-xs font-bold">{user.name.charAt(0).toUpperCase()}</span>
        </button>
      </div>

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-sm border-t border-gray-800 z-10">
        <div className="max-w-2xl mx-auto grid grid-cols-6">
          {NAV_TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id || (!mainTabs.includes(activeTab) && tab.id === 'more');
            const isCoach = tab.id === 'coach';

            if (isCoach) {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex flex-col items-center py-2 gap-0.5 relative"
                >
                  <div className={`w-12 h-8 rounded-2xl flex items-center justify-center transition-all ${
                    active
                      ? 'bg-primary-500 shadow-lg shadow-primary-500/50'
                      : 'bg-gradient-to-br from-primary-500/80 to-emerald-500/80 shadow-md shadow-primary-500/30'
                  }`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className={`text-[9px] font-bold ${active ? 'text-primary-400' : 'text-primary-500/80'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
                  active ? 'text-primary-400' : 'text-gray-500 hover:text-gray-400'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'drop-shadow-[0_0_6px_rgba(34,197,94,0.5)]' : ''}`} />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {active && <div className="w-1 h-1 bg-primary-400 rounded-full" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
