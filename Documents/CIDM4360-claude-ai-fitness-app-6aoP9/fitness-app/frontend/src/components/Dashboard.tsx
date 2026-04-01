import React, { useState, useEffect } from 'react';
import {
  Footprints, Flame, Droplets, Dumbbell, TrendingUp,
  Sparkles, Plus, CheckCircle2, Circle
} from 'lucide-react';
import { getDailyPlan, getMeals, getWorkouts, logSteps, getSteps } from '../api/client';
import type { DailyPlan, MealLog, WorkoutLog, UserProfile } from '../types';

interface Props {
  user: UserProfile;
  onNavigate: (tab: string) => void;
}

function RingProgress({ value, max, size = 80, strokeWidth = 8, color = '#22c55e', children }: {
  value: number; max: number; size?: number; strokeWidth?: number; color?: string; children?: React.ReactNode
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / Math.max(max, 1), 1);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#1f2937" strokeWidth={strokeWidth} />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${pct * circumference} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export default function Dashboard({ user, onNavigate }: Props) {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [steps, setSteps] = useState(0);
  const [stepsInput, setStepsInput] = useState('');
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    Promise.all([
      getDailyPlan(user.id, today),
      getMeals(user.id, today),
      getWorkouts(user.id, 1),
      getSteps(user.id, 1),
    ]).then(([p, m, w, s]) => {
      setPlan(p);
      setMeals(m);
      setWorkouts(w.filter(wk => wk.log_date === today));
      const todaySteps = s.find(st => st.log_date === today);
      setSteps(todaySteps?.steps ?? 0);
    }).finally(() => setLoading(false));
  }, [user.id]);

  const totalCals = meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = meals.reduce((s, m) => s + m.protein_g, 0);
  const todayWorkout = workouts.find(w => w.completed);

  const handleStepUpdate = async () => {
    const n = parseInt(stepsInput);
    if (!isNaN(n) && n >= 0) {
      await logSteps(user.id, today, n);
      setSteps(n);
      setStepsInput('');
    }
  };

  const bmi = (user.weight_kg / ((user.height_cm / 100) ** 2)).toFixed(1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-black text-white">
          Hey {user.name.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'BMI', value: bmi, color: 'text-blue-400' },
          { label: 'Goal', value: user.goal.replace('_', ' '), color: 'text-green-400' },
          { label: 'Level', value: user.fitness_level, color: 'text-purple-400' },
          { label: 'Activity', value: user.activity_level.replace('_', ' '), color: 'text-orange-400' },
        ].map(s => (
          <div key={s.label} className="card text-center p-2">
            <p className={`text-xs font-bold capitalize ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* No Plan CTA */}
      {!plan && (
        <button
          onClick={() => onNavigate('plan')}
          className="w-full card bg-primary-500/10 border-primary-500/30 hover:bg-primary-500/20 transition-colors flex items-center gap-4 p-4"
        >
          <div className="w-12 h-12 bg-primary-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-primary-400" />
          </div>
          <div className="text-left">
            <p className="font-bold text-white">Generate Today's Plan</p>
            <p className="text-sm text-primary-300">Your AI coach is ready to create a personalized plan</p>
          </div>
        </button>
      )}

      {/* Today's Progress */}
      {plan && (
        <div className="card">
          <p className="section-title">Today's Progress</p>
          <div className="grid grid-cols-2 gap-4">
            {/* Calories Ring */}
            <div className="flex items-center gap-3">
              <RingProgress value={totalCals} max={plan.calorie_target} size={72} color="#f97316">
                <Flame className="w-5 h-5 text-orange-400" />
              </RingProgress>
              <div>
                <p className="text-xs text-gray-400">Calories</p>
                <p className="font-bold text-white">{Math.round(totalCals)}</p>
                <p className="text-xs text-gray-500">/ {plan.calorie_target}</p>
              </div>
            </div>
            {/* Steps Ring */}
            <div className="flex items-center gap-3">
              <RingProgress value={steps} max={plan.step_target} size={72} color="#60a5fa">
                <Footprints className="w-5 h-5 text-blue-400" />
              </RingProgress>
              <div>
                <p className="text-xs text-gray-400">Steps</p>
                <p className="font-bold text-white">{steps.toLocaleString()}</p>
                <p className="text-xs text-gray-500">/ {plan.step_target.toLocaleString()}</p>
              </div>
            </div>
            {/* Protein Ring */}
            <div className="flex items-center gap-3">
              <RingProgress value={totalProtein} max={plan.protein_target_g} size={72} color="#22c55e">
                <span className="text-xs font-bold text-green-400">P</span>
              </RingProgress>
              <div>
                <p className="text-xs text-gray-400">Protein</p>
                <p className="font-bold text-white">{Math.round(totalProtein)}g</p>
                <p className="text-xs text-gray-500">/ {plan.protein_target_g}g</p>
              </div>
            </div>
            {/* Water Ring */}
            <div className="flex items-center gap-3">
              <RingProgress value={0} max={plan.water_target_ml} size={72} color="#06b6d4">
                <Droplets className="w-5 h-5 text-cyan-400" />
              </RingProgress>
              <div>
                <p className="text-xs text-gray-400">Water</p>
                <p className="font-bold text-white">0ml</p>
                <p className="text-xs text-gray-500">/ {plan.water_target_ml}ml</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Steps Logger */}
      <div className="card">
        <p className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
          <Footprints className="w-4 h-4 text-blue-400" /> Update Steps
        </p>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="number"
            placeholder={`Current: ${steps.toLocaleString()}`}
            value={stepsInput}
            onChange={e => setStepsInput(e.target.value)}
          />
          <button onClick={handleStepUpdate} className="btn-primary px-4 py-2">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Today's Workout Status */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary-400" /> Today's Workout
          </p>
          <button onClick={() => onNavigate('workout')} className="text-xs text-primary-400 hover:text-primary-300">
            {todayWorkout ? 'View' : 'Log →'}
          </button>
        </div>
        {todayWorkout ? (
          <div className="flex items-center gap-3 bg-green-500/10 rounded-xl p-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm font-semibold text-white">{todayWorkout.workout_type}</p>
              <p className="text-xs text-gray-400">{todayWorkout.duration_minutes} min • {Math.round(todayWorkout.calories_burned)} cal</p>
            </div>
          </div>
        ) : plan?.workout ? (
          <div
            onClick={() => onNavigate('plan')}
            className="flex items-center gap-3 bg-gray-800 rounded-xl p-3 cursor-pointer hover:bg-gray-700 transition-colors"
          >
            <Circle className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm font-semibold text-gray-300">{plan.workout.type}</p>
              <p className="text-xs text-gray-500">{plan.workout.duration_minutes} min planned</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-2">No workout planned yet</p>
        )}
      </div>

      {/* Quick Shortcuts */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onNavigate('meals')} className="card-hover flex items-center gap-3 py-3">
          <div className="w-9 h-9 bg-orange-500/20 rounded-xl flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Log Meal</p>
            <p className="text-xs text-gray-400">{meals.length} logged today</p>
          </div>
        </button>
        <button onClick={() => onNavigate('progress')} className="card-hover flex items-center gap-3 py-3">
          <div className="w-9 h-9 bg-green-500/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Check Progress</p>
            <p className="text-xs text-gray-400">AI analysis</p>
          </div>
        </button>
      </div>

      {/* Coach Note */}
      {plan?.ai_notes && (
        <div className="card bg-primary-500/10 border-primary-500/30">
          <div className="flex gap-2">
            <Sparkles className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-primary-200">{plan.ai_notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
