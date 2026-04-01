import React, { useState, useEffect } from 'react';
import {
  Sparkles, Dumbbell, Utensils, Footprints, Droplets,
  ChevronDown, ChevronUp, RefreshCw, Clock, Flame, Target
} from 'lucide-react';
import { generateDailyPlan, getDailyPlan } from '../api/client';
import type { DailyPlan, UserProfile } from '../types';

interface Props {
  user: UserProfile;
  onPlanReady?: (plan: DailyPlan) => void;
}

function MacroRing({ label, value, target, color }: {
  label: string; value: number; target: number; color: string;
}) {
  const pct = Math.min((value / target) * 100, 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="22" fill="none" stroke="#1f2937" strokeWidth="5" />
          <circle
            cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${(pct / 100) * 138.2} 138.2`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
          {Math.round(pct)}%
        </span>
      </div>
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs text-gray-300 font-semibold">{target}g</span>
    </div>
  );
}

export default function DailyPlanPage({ user, onPlanReady }: Props) {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('workout');
  const today = new Date().toISOString().split('T')[0];

  const loadPlan = async () => {
    setLoading(true);
    try {
      const existing = await getDailyPlan(user.id, today);
      if (existing) {
        setPlan(existing);
        onPlanReady?.(existing);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlan(); }, [user.id]);

  const generate = async () => {
    setGenerating(true);
    try {
      const newPlan = await generateDailyPlan(user.id, today);
      setPlan(newPlan);
      onPlanReady?.(newPlan);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full spin" />
        <p className="text-gray-400">Loading your plan…</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 flex flex-col items-center gap-6 fade-in">
        <div className="w-20 h-20 bg-primary-500/20 rounded-3xl flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-primary-400" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">No Plan for Today</h2>
          <p className="text-gray-400">Generate your personalized AI fitness plan for {today}</p>
        </div>
        <button onClick={generate} disabled={generating} className="btn-primary flex items-center gap-2">
          {generating ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin" />Generating…</>
          ) : (
            <><Sparkles className="w-4 h-4" />Generate Today's Plan</>
          )}
        </button>
      </div>
    );
  }

  const toggle = (s: string) => setExpandedSection(prev => prev === s ? null : s);

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Today's Plan</h1>
          <p className="text-gray-400 text-sm">{today}</p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="btn-secondary flex items-center gap-2 text-sm py-2"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? 'spin' : ''}`} />
          {generating ? 'Generating…' : 'Regenerate'}
        </button>
      </div>

      {/* AI Coach Note */}
      {plan.ai_notes && (
        <div className="card bg-primary-500/10 border-primary-500/30">
          <div className="flex gap-3">
            <Sparkles className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
            <p className="text-primary-200 text-sm leading-relaxed">{plan.ai_notes}</p>
          </div>
        </div>
      )}

      {/* Daily Targets */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Target className="w-5 h-5 text-primary-400" /> Daily Targets
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
            <Flame className="w-6 h-6 text-orange-400" />
            <div>
              <p className="text-xs text-gray-400">Calories</p>
              <p className="text-lg font-bold text-white">{plan.calorie_target}</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
            <Footprints className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-xs text-gray-400">Steps</p>
              <p className="text-lg font-bold text-white">{plan.step_target.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
            <Droplets className="w-6 h-6 text-cyan-400" />
            <div>
              <p className="text-xs text-gray-400">Water</p>
              <p className="text-lg font-bold text-white">{plan.water_target_ml}ml</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
            <Dumbbell className="w-6 h-6 text-purple-400" />
            <div>
              <p className="text-xs text-gray-400">Workout</p>
              <p className="text-lg font-bold text-white">{plan.workout?.duration_minutes ?? 0}min</p>
            </div>
          </div>
        </div>
        {/* Macros */}
        <div className="flex justify-around pt-2 border-t border-gray-800">
          <MacroRing label="Protein" value={0} target={plan.protein_target_g} color="#22c55e" />
          <MacroRing label="Carbs" value={0} target={plan.carb_target_g} color="#3b82f6" />
          <MacroRing label="Fat" value={0} target={plan.fat_target_g} color="#f59e0b" />
        </div>
      </div>

      {/* Workout Plan */}
      {plan.workout && (
        <div className="card">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => toggle('workout')}
          >
            <h2 className="section-title flex items-center gap-2 mb-0">
              <Dumbbell className="w-5 h-5 text-primary-400" />
              {plan.workout.type}
            </h2>
            <div className="flex items-center gap-3 text-gray-400">
              <span className="text-sm flex items-center gap-1">
                <Clock className="w-4 h-4" />{plan.workout.duration_minutes}min
              </span>
              <span className="text-sm flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-400" />{plan.workout.estimated_calories_burned}cal
              </span>
              {expandedSection === 'workout' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {expandedSection === 'workout' && (
            <div className="mt-4 space-y-4">
              {plan.workout.warmup?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2">Warmup</p>
                  <div className="space-y-1">
                    {plan.workout.warmup.map((ex, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                        <div className="w-1.5 h-1.5 bg-primary-400 rounded-full flex-shrink-0" />
                        {ex}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Main Workout</p>
                <div className="space-y-2">
                  {plan.workout.exercises?.map((ex, i) => (
                    <div key={i} className="bg-gray-800 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-white">{ex.name}</span>
                        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">
                          {ex.sets} × {ex.reps}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>Rest: {ex.rest_seconds}s</span>
                        {ex.notes && <span className="text-gray-500">• {ex.notes}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {plan.workout.cooldown?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Cooldown</p>
                  <div className="space-y-1">
                    {plan.workout.cooldown.map((ex, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                        {ex}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Meal Suggestions */}
      {plan.meal_suggestions && (
        <div className="card">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => toggle('meals')}
          >
            <h2 className="section-title flex items-center gap-2 mb-0">
              <Utensils className="w-5 h-5 text-primary-400" /> Meal Suggestions
            </h2>
            {expandedSection === 'meals' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {expandedSection === 'meals' && (
            <div className="mt-4 space-y-2">
              {Object.entries(plan.meal_suggestions).map(([type, meal]) => (
                <div key={type} className="bg-gray-800 rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-primary-400 capitalize mb-0.5">{type}</p>
                      <p className="font-semibold text-sm text-white">{meal.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{meal.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-bold text-orange-400">{meal.calories} cal</p>
                      <p className="text-xs text-gray-400">{meal.protein_g}g protein</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
