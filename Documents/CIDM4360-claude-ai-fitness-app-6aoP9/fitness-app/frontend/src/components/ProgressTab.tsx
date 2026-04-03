import React, { useState, useEffect } from 'react';
import {
  TrendingUp, BarChart2, Scan, Calendar,
  ChevronLeft, ChevronRight, Flame, Footprints, Dumbbell, X,
} from 'lucide-react';
import ProgressAnalysis from './ProgressAnalysis';
import WeeklyReport from './WeeklyReport';
import BodyAnalysis from './BodyAnalysis';
import { getMeals, getWorkouts, getSteps, getBodyHistory } from '../api/client';
import type { UserProfile } from '../types';

interface Props { user: UserProfile; }

// ── Tiny type for calendar day data ──────────────────────────────────────────
interface DayData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  steps: number;
  workout: string | null;
  bodyPhoto: boolean;
}

const SUB_TABS = [
  { id: 'overview',  label: 'Overview',  icon: TrendingUp },
  { id: 'report',    label: 'Report',    icon: BarChart2  },
  { id: 'calendar',  label: 'Calendar',  icon: Calendar   },
  { id: 'body',      label: 'Body Scan', icon: Scan       },
];

// ── Calendar Component ────────────────────────────────────────────────────────
function ProgressCalendar({ user }: { user: UserProfile }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [marked, setMarked] = useState<Record<string, { steps: number; workout: boolean; bodyPhoto: boolean; meals: number }>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<DayData | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);

  // Load month data once per month change
  useEffect(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay    = new Date(year, month, 1).toISOString().split('T')[0];

    Promise.all([
      getWorkouts(user.id, daysInMonth + 5),
      getSteps(user.id, daysInMonth + 5),
      getBodyHistory(user.id),
    ]).then(([workouts, steps, bodyHistory]) => {
      const map: typeof marked = {};

      steps.forEach((s: { log_date: string; steps: number }) => {
        const d = s.log_date;
        if (d >= firstDay) {
          map[d] = map[d] ?? { steps: 0, workout: false, bodyPhoto: false, meals: 0 };
          map[d].steps = s.steps;
        }
      });

      workouts.forEach((w: { log_date: string; completed: boolean }) => {
        if (w.log_date >= firstDay && w.completed) {
          map[w.log_date] = map[w.log_date] ?? { steps: 0, workout: false, bodyPhoto: false, meals: 0 };
          map[w.log_date].workout = true;
        }
      });

      (bodyHistory as Array<{ analysis_date: string }>).forEach(b => {
        const d = b.analysis_date;
        if (d >= firstDay) {
          map[d] = map[d] ?? { steps: 0, workout: false, bodyPhoto: false, meals: 0 };
          map[d].bodyPhoto = true;
        }
      });

      setMarked(map);
    }).catch(() => {});
  }, [year, month, user.id]);

  // Load a specific day's detail on tap
  const handleDayPress = async (dateStr: string) => {
    setSelected(dateStr);
    setLoadingDay(true);
    try {
      const meals = await getMeals(user.id, dateStr);
      const stepEntry = marked[dateStr];
      const wEntry    = await getWorkouts(user.id, 1);
      const todayW    = wEntry.find((w: { log_date: string; workout_type: string }) => w.log_date === dateStr);
      setDayDetail({
        calories: meals.reduce((s: number, m: { calories: number }) => s + m.calories, 0),
        protein:  meals.reduce((s: number, m: { protein_g: number }) => s + m.protein_g, 0),
        carbs:    meals.reduce((s: number, m: { carbs_g: number }) => s + m.carbs_g, 0),
        fat:      meals.reduce((s: number, m: { fat_g: number }) => s + m.fat_g, 0),
        steps:    stepEntry?.steps ?? 0,
        workout:  todayW?.workout_type ?? null,
        bodyPhoto: stepEntry?.bodyPhoto ?? false,
      });
    } catch { setDayDetail(null); }
    finally { setLoadingDay(false); }
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstWeekDay = new Date(year, month, 1).getDay(); // 0=Sun
  const monthLabel   = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayStr     = now.toISOString().split('T')[0];

  const cells: Array<string | null> = [
    ...Array(firstWeekDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }),
  ];

  // Pad to full grid rows
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="p-4 space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-900 text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-white font-bold text-base">{monthLabel}</p>
        <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-900 text-gray-400 hover:text-white transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 text-center mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <p key={d} className="text-xs font-semibold text-gray-600 py-1">{d}</p>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateStr, idx) => {
          if (!dateStr) return <div key={idx} />;
          const day   = new Date(dateStr).getDate();
          const info  = marked[dateStr];
          const isToday    = dateStr === todayStr;
          const isSelected = dateStr === selected;
          const hasData    = !!info;

          return (
            <button
              key={dateStr}
              onClick={() => handleDayPress(dateStr)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                isSelected
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                  : isToday
                  ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/50'
                  : hasData
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:bg-gray-900'
              }`}
            >
              {day}
              {/* Dot indicators */}
              {hasData && !isSelected && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {info.workout   && <div className="w-1 h-1 rounded-full bg-primary-400" />}
                  {info.steps > 0 && <div className="w-1 h-1 rounded-full bg-orange-400" />}
                  {info.bodyPhoto && <div className="w-1 h-1 rounded-full bg-purple-400" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center pt-1">
        {[
          { color: 'bg-primary-400', label: 'Workout' },
          { color: 'bg-orange-400',  label: 'Meals' },
          { color: 'bg-purple-400',  label: 'Body photo' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${l.color}`} />
            <p className="text-xs text-gray-500">{l.label}</p>
          </div>
        ))}
      </div>

      {/* Day Detail Drawer */}
      {selected && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-white text-sm">
              {new Date(selected + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <button onClick={() => { setSelected(null); setDayDetail(null); }} className="text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {loadingDay ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full spin" />
            </div>
          ) : dayDetail ? (
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Flame,     label: 'Calories', value: `${Math.round(dayDetail.calories)} kcal`, color: 'text-orange-400' },
                { icon: Footprints,label: 'Steps',    value: dayDetail.steps.toLocaleString(),          color: 'text-primary-400' },
                { icon: Dumbbell,  label: 'Workout',  value: dayDetail.workout ?? 'Not logged',         color: 'text-purple-400' },
                { icon: BarChart2, label: 'Protein',  value: `${Math.round(dayDetail.protein)}g`,        color: 'text-emerald-400' },
              ].map(row => {
                const Icon = row.icon;
                return (
                  <div key={row.label} className="bg-gray-800 rounded-xl p-3 flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${row.color} shrink-0`} />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">{row.label}</p>
                      <p className="text-sm font-semibold text-white truncate">{row.value}</p>
                    </div>
                  </div>
                );
              })}
              {/* Macros bar */}
              <div className="col-span-2 bg-gray-800 rounded-xl p-3 space-y-1.5">
                <p className="text-xs text-gray-500 font-semibold">Macros</p>
                <div className="flex gap-3">
                  {[
                    { label: 'Protein', val: Math.round(dayDetail.protein), color: 'bg-emerald-400' },
                    { label: 'Carbs',   val: Math.round(dayDetail.carbs),   color: 'bg-primary-400' },
                    { label: 'Fat',     val: Math.round(dayDetail.fat),     color: 'bg-orange-400' },
                  ].map(m => (
                    <div key={m.label} className="flex items-center gap-1.5 text-xs">
                      <div className={`w-2 h-2 rounded-full ${m.color}`} />
                      <span className="text-gray-400">{m.label}</span>
                      <span className="text-white font-semibold">{m.val}g</span>
                    </div>
                  ))}
                </div>
              </div>
              {dayDetail.bodyPhoto && (
                <div className="col-span-2 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                  <p className="text-xs text-purple-300 font-semibold">📸 Body photo taken this day — view in Body tab</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-3">No data logged for this day</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ProgressTab Component ────────────────────────────────────────────────
export default function ProgressTab({ user }: Props) {
  const [active, setActive] = useState<'overview' | 'report' | 'calendar' | 'body'>('overview');

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm px-4 pt-4 pb-0">
        <div className="grid grid-cols-4 bg-gray-900 rounded-2xl p-1 border border-gray-800">
          {SUB_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id as typeof active)}
                className={`flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="h-2" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {active === 'overview'  && <ProgressAnalysis user={user} />}
        {active === 'calendar'  && <ProgressCalendar user={user} />}
        {active === 'report'    && <WeeklyReport user={user} />}
        {active === 'body'      && <BodyAnalysis user={user} />}
      </div>
    </div>
  );
}
