import React, { useState } from 'react';
import {
  RefreshCw, Flame, Dumbbell, Wheat, Droplets,
  Clock, ChevronDown, ChevronUp, Sparkles, Info,
} from 'lucide-react';
import { getWeeklyMealPlan } from '../api/client';
import type { UserProfile, WeeklyMealPlan, WeeklyMealPlanDay } from '../types';

interface Props { user: UserProfile; }

const MEAL_COLORS = {
  breakfast: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', label: 'Breakfast' },
  lunch:     { bg: 'bg-primary-500/10', border: 'border-primary-500/20', text: 'text-primary-400', label: 'Lunch' },
  dinner:    { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400',  label: 'Dinner' },
  snack:     { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', label: 'Snack' },
} as const;

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="text-white text-xs font-semibold">{Math.round(value)}g</span>
    </div>
  );
}

function DayCard({ day, defaultOpen = false }: { day: WeeklyMealPlanDay; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Day Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500/15 rounded-xl flex items-center justify-center">
            <span className="text-primary-400 font-bold text-sm">{day.day.slice(0, 3)}</span>
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">{day.day}</p>
            <p className="text-gray-500 text-xs">{Math.round(day.day_totals.calories)} kcal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex gap-3">
            <MacroPill label="P" value={day.day_totals.protein_g} color="bg-emerald-400" />
            <MacroPill label="C" value={day.day_totals.carbs_g}   color="bg-primary-400" />
            <MacroPill label="F" value={day.day_totals.fat_g}     color="bg-orange-400" />
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {/* Meals */}
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-800/60 pt-3">
          {(Object.entries(day.meals) as Array<[keyof typeof MEAL_COLORS, WeeklyMealPlanDay['meals'][keyof WeeklyMealPlanDay['meals']]]>).map(([key, meal]) => {
            const style = MEAL_COLORS[key];
            return (
              <div key={key} className={`${style.bg} border ${style.border} rounded-xl p-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${style.text} uppercase tracking-wide mb-0.5`}>{style.label}</p>
                    <p className="text-white text-sm font-semibold leading-snug">{meal.name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 shrink-0 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">{meal.prep_minutes}m</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <span className="text-xs text-gray-400 font-semibold flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" />{Math.round(meal.calories)}
                  </span>
                  <MacroPill label="P" value={meal.protein_g} color="bg-emerald-400" />
                  <MacroPill label="C" value={meal.carbs_g}   color="bg-primary-400" />
                  <MacroPill label="F" value={meal.fat_g}     color="bg-orange-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MealPlanTab({ user }: Props) {
  const [plan, setPlan]       = useState<WeeklyMealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetchPlan = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getWeeklyMealPlan(user.id);
      setPlan(data);
    } catch {
      setError('Could not generate your meal plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Empty state
  if (!plan && !loading) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 gap-6">
        <div className="w-20 h-20 bg-primary-500/10 rounded-3xl flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-primary-400" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-white font-bold text-xl">Your Weekly Meal Plan</h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            Get a personalized 7-day meal plan built around your calorie target and fitness goal.
          </p>
        </div>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button
          onClick={fetchPlan}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-8 py-3.5 rounded-2xl transition-colors shadow-lg shadow-primary-500/25"
        >
          <Sparkles className="w-5 h-5" />
          Generate My Plan
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Building your personalized meal plan…</p>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="p-4 space-y-4">
      {/* Summary Card */}
      <div className="bg-primary-500/10 border border-primary-500/20 rounded-2xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h2 className="text-white font-bold text-base mb-1">Your 7-Day Plan</h2>
            <p className="text-gray-300 text-sm leading-relaxed">{plan.summary}</p>
          </div>
          <button
            onClick={fetchPlan}
            disabled={loading}
            className="shrink-0 flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Regenerate
          </button>
        </div>

        {/* Daily Targets */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Flame,   label: 'Calories', value: `${plan.daily_targets.calories}`, unit: 'kcal', color: 'text-orange-400' },
            { icon: Dumbbell,label: 'Protein',  value: `${plan.daily_targets.protein_g}`, unit: 'g',   color: 'text-emerald-400' },
            { icon: Wheat,   label: 'Carbs',    value: `${plan.daily_targets.carbs_g}`,   unit: 'g',   color: 'text-primary-400' },
            { icon: Droplets,label: 'Fat',      value: `${plan.daily_targets.fat_g}`,     unit: 'g',   color: 'text-yellow-400' },
          ].map(t => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="bg-gray-900/60 rounded-xl p-2.5 flex flex-col items-center gap-1">
                <Icon className={`w-4 h-4 ${t.color}`} />
                <p className="text-white font-bold text-sm leading-none">{t.value}<span className="text-gray-500 text-[10px]">{t.unit}</span></p>
                <p className="text-gray-500 text-[10px]">{t.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Cards */}
      {plan.days.map((day, i) => (
        <DayCard key={day.day} day={day} defaultOpen={i === 0} />
      ))}

      {/* Tips */}
      {(plan.key_tips?.length > 0 || plan.hydration_tip) && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary-400" />
            <p className="text-white font-bold text-sm">Nutrition Tips</p>
          </div>
          {plan.hydration_tip && (
            <div className="flex items-start gap-2">
              <Droplets className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
              <p className="text-gray-300 text-sm">{plan.hydration_tip}</p>
            </div>
          )}
          {plan.key_tips?.map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
              <p className="text-gray-400 text-sm">{tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
