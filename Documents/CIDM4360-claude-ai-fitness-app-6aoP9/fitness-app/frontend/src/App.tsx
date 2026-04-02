import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Utensils, Dumbbell,
  TrendingUp, Watch, User, Bell, Zap, LogOut, Shield,
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import MealsTab from './components/MealsTab';
import TrainingTab from './components/TrainingTab';
import ProgressTab from './components/ProgressTab';
import WearableDashboard from './components/WearableDashboard';
import UserProfilePage from './components/UserProfile';
import PrivacyPolicy from './components/PrivacyPolicy';
import { getUser } from './api/client';
import type { UserProfile } from './types';

const NAV_TABS = [
  { id: 'home',     label: 'Home',     icon: LayoutDashboard },
  { id: 'meals',    label: 'Meals',    icon: Utensils },
  { id: 'training', label: 'Training', icon: Dumbbell },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'health',   label: 'Health',   icon: Watch },
  { id: 'profile',  label: 'Profile',  icon: User },
];

function AuthenticatedApp() {
  const { userId, hasProfile, setHasProfile, logout, email } = useAuth();
  const [user, setUser]         = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading]   = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!hasProfile || !userId) { setShowOnboarding(true); setLoading(false); return; }
    getUser(userId)
      .then(u => { setUser(u); setShowOnboarding(false); })
      .catch(() => setShowOnboarding(true))
      .finally(() => setLoading(false));
  }, [userId, hasProfile]);

  const handleUserSaved = (u: UserProfile) => {
    setUser(u); setHasProfile(u.id); setShowOnboarding(false); setActiveTab('home');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full spin" />
    </div>
  );

  if (showOnboarding || !user) return (
    <div className="min-h-screen bg-gray-950">
      <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="w-10 h-10 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <button onClick={logout} className="text-gray-500 hover:text-gray-300 text-xs flex items-center gap-1">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
      <UserProfilePage onSave={handleUserSaved} />
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'home':     return <Dashboard user={user} onNavigate={setActiveTab} />;
      case 'meals':    return <MealsTab user={user} />;
      case 'training': return <TrainingTab user={user} />;
      case 'progress': return <ProgressTab user={user} />;
      case 'health':   return <WearableDashboard user={user} />;
      case 'privacy':  return <PrivacyPolicy />;
      case 'profile':  return (
        <div>
          <UserProfilePage existing={user} onSave={handleUserSaved} />
          <div className="px-4 pb-10 space-y-3 max-w-2xl mx-auto">
            <button onClick={() => setActiveTab('privacy')}
              className="w-full py-3 bg-gray-900 rounded-2xl text-gray-400 text-sm flex items-center justify-center gap-2 hover:text-white transition-colors">
              <Shield className="w-4 h-4" /> Privacy Policy
            </button>
            <button onClick={logout}
              className="w-full py-3 bg-gray-900 rounded-2xl text-red-400 text-sm flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors">
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

      {/* ── Top Header ── */}
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800/60">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">

          {/* Left: Notifications */}
          <button className="relative w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-gray-800">
            <Bell className="w-5 h-5" />
            {/* Unread dot */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-gray-950" />
          </button>

          {/* Center: Logo */}
          <div className="w-11 h-11 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Zap className="w-6 h-6 text-white" />
          </div>

          {/* Right: Avatar */}
          <button
            onClick={() => setActiveTab('profile')}
            className="w-9 h-9 bg-primary-500/15 rounded-full flex items-center justify-center hover:bg-primary-500/25 transition-colors ring-2 ring-primary-500/30"
          >
            <span className="text-primary-400 text-sm font-bold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </button>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="flex-1 overflow-y-auto pb-24">
        {renderContent()}
      </main>

      {/* ── Bottom Navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-sm border-t border-gray-800/60 z-10">
        <div className="max-w-2xl mx-auto grid grid-cols-6 safe-area-pb">
          {NAV_TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center py-3 gap-1 transition-all ${
                  active ? 'text-primary-400' : 'text-gray-500 hover:text-gray-400'
                }`}
              >
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                  active ? 'bg-primary-500/15' : ''
                }`}>
                  <Icon className={`w-[18px] h-[18px] transition-all ${
                    active ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.7)]' : ''
                  }`} />
                </div>
                <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function AppInner() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <AuthScreen onAuthenticated={() => {}} />;
  return <AuthenticatedApp />;
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}
