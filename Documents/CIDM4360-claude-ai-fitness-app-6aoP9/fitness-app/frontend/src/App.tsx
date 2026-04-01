import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Sparkles, Utensils, Dumbbell,
  TrendingUp, BarChart2, Scan, User, Zap, Timer, Watch, Shield, LogOut,
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './components/AuthScreen';
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
import PrivacyPolicy from './components/PrivacyPolicy';
import { getUser } from './api/client';
import type { UserProfile } from './types';

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

// ─── Inner app (rendered after authentication) ────────────────────────────────
function AuthenticatedApp() {
  const { userId, hasProfile, setHasProfile, logout, email } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!hasProfile || !userId) {
      setShowOnboarding(true);
      setLoading(false);
      return;
    }
    getUser(userId)
      .then(u => { setUser(u); setShowOnboarding(false); })
      .catch(() => { setShowOnboarding(true); })
      .finally(() => setLoading(false));
  }, [userId, hasProfile]);

  const handleUserSaved = (u: UserProfile) => {
    setUser(u);
    setHasProfile(u.id);
    setShowOnboarding(false);
    setActiveTab('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
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
        <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-white text-lg">AI Fitness Coach</span>
          </div>
          <button onClick={logout} className="text-gray-500 hover:text-gray-300 text-xs flex items-center gap-1">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
        <UserProfilePage onSave={handleUserSaved} />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':      return <Dashboard user={user} onNavigate={setActiveTab} />;
      case 'plan':      return <DailyPlan user={user} />;
      case 'meals':     return <MealLogger user={user} />;
      case 'workout':   return <WorkoutTracker user={user} />;
      case 'progress':  return <ProgressAnalysis user={user} />;
      case 'report':    return <WeeklyReport user={user} />;
      case 'body':      return <BodyAnalysis user={user} />;
      case 'quickfood': return <QuickFood user={user} />;
      case 'timed':     return <TimedWorkout user={user} />;
      case 'health':    return <WearableDashboard user={user} />;
      case 'privacy':   return <PrivacyPolicy />;
      case 'profile':   return (
        <div className="space-y-0">
          <UserProfilePage existing={user} onSave={handleUserSaved} />
          {/* Account actions */}
          <div className="px-4 pb-8 space-y-3 max-w-2xl mx-auto">
            <button
              onClick={() => setActiveTab('privacy')}
              className="w-full py-3 bg-gray-900 rounded-2xl text-gray-400 text-sm flex items-center justify-center gap-2 hover:text-white transition-colors"
            >
              <Shield className="w-4 h-4" /> Privacy Policy
            </button>
            <button
              onClick={logout}
              className="w-full py-3 bg-gray-900 rounded-2xl text-red-400 text-sm flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
            {email && <p className="text-center text-xs text-gray-600">{email}</p>}
          </div>
        </div>
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
          <span className="font-black text-white text-base">AI Fitness Coach</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 capitalize hidden sm:block">
            Goal: {user.goal.replace('_', ' ')}
          </span>
          <button
            onClick={() => setActiveTab('profile')}
            className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center hover:bg-primary-500/30 transition-colors"
          >
            <span className="text-primary-400 text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </button>
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

// ─── Root app wrapper ─────────────────────────────────────────────────────────
function AppInner() {
  const { isAuthenticated } = useAuth();
  const [authedUserId, setAuthedUserId] = useState<number | null>(null);
  const [authedHasProfile, setAuthedHasProfile] = useState(false);
  const { userId, hasProfile } = useAuth();

  useEffect(() => {
    setAuthedUserId(userId);
    setAuthedHasProfile(hasProfile);
  }, [userId, hasProfile]);

  if (!isAuthenticated) {
    return (
      <AuthScreen
        onAuthenticated={(uid, hp) => {
          setAuthedUserId(uid);
          setAuthedHasProfile(hp);
        }}
      />
    );
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
