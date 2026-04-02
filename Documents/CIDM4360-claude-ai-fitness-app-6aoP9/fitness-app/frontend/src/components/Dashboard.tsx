import React, { useState, useEffect } from 'react';
import {
  Footprints, Flame, Droplets, Dumbbell,
  TrendingUp, Utensils, Watch, Sparkles, CheckCircle2, Circle, Moon, Activity,
} from 'lucide-react';
import { getDailyPlan, getMeals, getWorkouts, getSteps, getWearableData } from '../api/client';
import type { DailyPlan, MealLog, WorkoutLog, UserProfile, WearableData } from '../types';

interface Props { user: UserProfile; onNavigate: (tab: string) => void; }

function RingProgress({ value, max, size = 72, strokeWidth = 7, color, children }: {
  value: number; max: number; size?: number; strokeWidth?: number; color: string; children?: React.ReactNode;
}) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / Math.max(max, 1), 1);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1f2937" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
          className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

function HealthPill({ icon: Icon, label, value, unit, color }: {
  icon: React.ElementType; label: string; value: number | string; unit?: string; color: string;
}) {
  return (
    <div className="flex-1 bg-gray-900 rounded-2xl p-3 flex flex-col items-center gap-1 min-w-0">
      <Icon className={`w-4 h-4 ${color}`} />
      <p className="text-white font-bold text-base leading-none">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="text-gray-500 text-xs font-normal ml-0.5">{unit}</span>}
      </p>
      <p className="text-gray-500 text-[10px]">{label}</p>
    </div>
  );
}

const SHORTCUTS = [
  { id: 'meals',    label: 'Meals',    sub: 'Log food', icon: Utensils,   color: 'text-orange-400', bg: 'bg-orange-500/15' },
  { id: 'training', label: 'Training', sub: 'Plan & train', icon: Dumbbell,   color: 'text-primary-400', bg: 'bg-primary-500/15' },
  { id: 'progress', label: 'Progress', sub: 'AI analysis', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/15' },
  { id: 'health',   label: 'Health',   sub: 'Sleep & recovery', icon: Watch,     color: 'text-cyan-400',  bg: 'bg-cyan-500/15' },
];

export default function Dashboard({ user, onNavigate }: Props) {
  const [plan,     setPlan]     = useState<DailyPlan | null>(null);
  const [meals,    setMeals]    = useState<MealLog[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [steps,    setSteps]    = useState(0);
  const [wearable, setWearable] = useState<WearableData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    Promise.all([
      getDailyPlan(user.id, today),
      getMeals(user.id, today),
      getWorkouts(user.id, 1),
      getSteps(user.id, 1),
      getWearableData(user.id, 1),
    ]).then(([p, m, w, s, wd]) => {
      setPlan(p);
      setMeals(m);
      setWorkouts(w.filter((wk: WorkoutLog) => wk.log_date === today));
      const todaySteps = s.find((st: { log_date: string; steps: number }) => st.log_date === today);
      setSteps(todaySteps?.steps ?? 0);
      const todayWearable = wd?.find((d: WearableData) => d.log_date === today);
      setWearable(todayWearable ?? null);
    }).finally(() => setLoading(false));
  }, [user.id]);

  const totalCals    = meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = meals.reduce((s, m) => s + m.protein_g, 0);
  const todayWorkout = workouts.find(w => w.completed);
  const stepTarget   = plan?.step_target ?? 10000;

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-black text-white">
          Hey {user.name.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── Auto Health Bar ── */}
      <div className="flex gap-2">
        <HealthPill icon={Footprints} label="Steps"    value={steps}                       unit="" color="text-primary-400" />
        <HealthPill icon={Moon}       label="Sleep"     value={wearable?.sleep_score ?? '—'} unit={wearable?.sleep_score ? '/100' : ''} color="text-indigo-400" />
        <HealthPill icon={Activity}   label="Recovery"  value={wearable?.recovery_score ?? '—'} unit={wearable?.recovery_score ? '/100' : ''} color="text-emerald-400" />
      </div>

      {/* No Plan CTA */}
      {!plan && (
        <button onClick={() => onNavigate('training')}
          className="w-full card bg-primary-500/10 border-primary-500/30 hover:bg-primary-500/15 transition-colors flex items-center gap-4 p-4">
          <div className="w-12 h-12 bg-primary-500/20 rounded-2xl flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-primary-400" />
          </div>
          <div className="text-left">
            <p className="font-bold text-white">Generate Today's Plan</p>
            <p className="text-sm text-primary-300 mt-0.5">Your AI coach is ready</p>
          </div>
        </button>
      )}

      {/* Today's Progress Rings */}
      {plan && (
        <div className="card">
          <p className="section-title">Today's Progress</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: totalCals,    max: plan.calorie_target,   color: '#f97316', icon: <Flame className="w-4 h-4 text-orange-400" />,    label: 'Calories', display: `${Math.round(totalCals)}`, sub: `/ ${plan.calorie_target}` },
              { value: steps,        max: stepTarget,            color: '#3b82f6', icon: <Footprints className="w-4 h-4 text-primary-400" />, label: 'Steps',    display: steps.toLocaleString(),     sub: `/ ${stepTarget.toLocaleString()}` },
              { value: totalProtein, max: plan.protein_target_g, color: '#34d399', icon: <span className="text-xs font-bold text-emerald-400">P</span>, label: 'Protein', display: `${Math.round(totalProtein)}g`, sub: `/ ${plan.protein_target_g}g` },
              { value: 0,            max: plan.water_target_ml,  color: '#22d3ee', icon: <Droplets className="w-4 h-4 text-cyan-400" />,    label: 'Water',    display: '0ml',                        sub: `/ ${plan.water_target_ml}ml` },
            ].map(ring => (
              <div key={ring.label} className="flex items-center gap-3">
                <RingProgress value={ring.value} max={ring.max} color={ring.color}>
                  {ring.icon}
                </RingProgress>
                <div>
                  <p className="text-xs text-gray-400">{ring.label}</p>
                  <p className="font-bold text-white text-sm">{ring.display}</p>
                  <p className="text-xs text-gray-500">{ring.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Workout */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-200 flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary-400" /> Today's Workout
          </p>
          <button onClick={() => onNavigate('training')} className="text-xs text-primary-400 hover:text-primary-300 font-semibold">
            {todayWorkout ? 'View' : 'Go →'}
          </button>
        </div>
        {todayWorkout ? (
          <div className="flex items-center gap-3 bg-primary-500/10 border border-primary-500/20 rounded-xl p-3">
            <CheckCircle2 className="w-5 h-5 text-primary-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">{todayWorkout.workout_type}</p>
              <p className="text-xs text-gray-400">{todayWorkout.duration_minutes} min · {Math.round(todayWorkout.calories_burned)} cal</p>
            </div>
          </div>
        ) : plan?.workout ? (
          <div onClick={() => onNavigate('training')}
            className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 cursor-pointer hover:bg-gray-750 transition-colors">
            <Circle className="w-5 h-5 text-gray-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-300">{plan.workout.type}</p>
              <p className="text-xs text-gray-500">{plan.workout.duration_minutes} min planned</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-2">No workout planned yet</p>
        )}
      </div>

      {/* Shortcut Grid */}
      <div className="grid grid-cols-2 gap-3">
        {SHORTCUTS.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => onNavigate(s.id)}
              className="card hover:border-gray-700 active:scale-95 transition-all flex items-center gap-3 py-3.5">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-bold text-white">{s.label}</p>
                <p className="text-xs text-gray-500 truncate">{s.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* AI Coach Note */}
      {plan?.ai_notes && (
        <div className="card bg-primary-500/8 border-primary-500/25">
          <div className="flex gap-2.5">
            <Sparkles className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
            <p className="text-sm text-primary-200 leading-relaxed">{plan.ai_notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
