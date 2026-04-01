import React, { useState, useEffect } from 'react';
import {
  Dumbbell, Plus, Clock, Flame, Zap, CheckCircle2,
  X, ChevronDown, RefreshCw, Trophy, Timer, Wrench
} from 'lucide-react';
import { logWorkout, getWorkouts, getAdaptiveWorkout } from '../api/client';
import type { WorkoutLog, UserProfile } from '../types';

interface Props { user: UserProfile }

function EffortDots({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-5 h-5 rounded-full border-2 transition-all ${
            n <= value
              ? n <= 3 ? 'bg-green-500 border-green-500'
                : n <= 6 ? 'bg-yellow-500 border-yellow-500'
                : 'bg-red-500 border-red-500'
              : 'border-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

const TIME_PRESETS = [15, 20, 30, 45, 60];
const EQUIPMENT_OPTIONS = [
  { value: 'none', label: 'Bodyweight Only' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'barbell', label: 'Barbell + Rack' },
  { value: 'resistance bands', label: 'Resistance Bands' },
  { value: 'full gym', label: 'Full Gym' },
];

export default function WorkoutTracker({ user }: Props) {
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [adaptiveWorkout, setAdaptiveWorkout] = useState<any>(null);
  const [loadingAdaptive, setLoadingAdaptive] = useState(false);
  const [timeWorkout, setTimeWorkout] = useState<any>(null);
  const [loadingTime, setLoadingTime] = useState(false);
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [timeForm, setTimeForm] = useState({
    available_minutes: 30,
    equipment: 'none',
    focus: '',
  });
  const [form, setForm] = useState({
    workout_type: '',
    duration_minutes: '',
    calories_burned: '',
    perceived_effort: 5,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const loadWorkouts = async () => {
    const data = await getWorkouts(user.id, 7);
    setWorkouts(data);
  };

  useEffect(() => { loadWorkouts(); }, []);

  const loadAdaptive = async () => {
    setLoadingAdaptive(true);
    try {
      const w = await getAdaptiveWorkout(user.id);
      setAdaptiveWorkout(w);
    } finally {
      setLoadingAdaptive(false);
    }
  };

  const generateTimeWorkout = async () => {
    setLoadingTime(true);
    setTimeWorkout(null);
    try {
      const res = await fetch('/api/workouts/time-based', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          available_minutes: timeForm.available_minutes,
          equipment: timeForm.equipment,
          focus: timeForm.focus || null,
        }),
      });
      const data = await res.json();
      setTimeWorkout(data);
      setShowTimeForm(false);
    } finally {
      setLoadingTime(false);
    }
  };

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.workout_type || !form.duration_minutes) return;
    setSaving(true);
    try {
      await logWorkout({
        user_id: user.id,
        log_date: today,
        workout_type: form.workout_type,
        exercises: '[]',
        duration_minutes: parseInt(form.duration_minutes),
        calories_burned: parseFloat(form.calories_burned) || 0,
        perceived_effort: form.perceived_effort,
        completed: true,
        notes: form.notes,
      });
      setShowLog(false);
      setForm({ workout_type: '', duration_minutes: '', calories_burned: '', perceived_effort: 5, notes: '' });
      loadWorkouts();
    } finally {
      setSaving(false);
    }
  };

  const totalMins = workouts.filter(w => w.completed).reduce((s, w) => s + w.duration_minutes, 0);
  const totalCal = workouts.filter(w => w.completed).reduce((s, w) => s + (w.calories_burned || 0), 0);
  const completedCount = workouts.filter(w => w.completed).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Workouts</h1>
        <button onClick={() => setShowLog(true)} className="btn-primary flex items-center gap-2 py-2">
          <Plus className="w-4 h-4" /> Log Workout
        </button>
      </div>

      {/* This Week Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card text-center">
          <Trophy className="w-5 h-5 text-yellow-400 mx-auto" />
          <p className="text-xl font-bold text-white">{completedCount}</p>
          <p className="text-xs text-gray-400">Workouts</p>
        </div>
        <div className="stat-card text-center">
          <Clock className="w-5 h-5 text-blue-400 mx-auto" />
          <p className="text-xl font-bold text-white">{totalMins}</p>
          <p className="text-xs text-gray-400">Minutes</p>
        </div>
        <div className="stat-card text-center">
          <Flame className="w-5 h-5 text-orange-400 mx-auto" />
          <p className="text-xl font-bold text-white">{Math.round(totalCal)}</p>
          <p className="text-xs text-gray-400">Calories</p>
        </div>
      </div>

      {/* Time-Based Workout */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0 flex items-center gap-2">
            <Timer className="w-5 h-5 text-blue-400" /> Time-Based Workout
          </h2>
          <button
            onClick={() => setShowTimeForm(f => !f)}
            className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            {showTimeForm ? 'Hide' : 'Set Up'}
          </button>
        </div>

        {showTimeForm && (
          <div className="space-y-3 mb-4 p-3 bg-gray-800 rounded-xl">
            <div>
              <label className="label">Available Time</label>
              <div className="flex gap-2 flex-wrap">
                {TIME_PRESETS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeForm(f => ({ ...f, available_minutes: t }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      timeForm.available_minutes === t
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {t} min
                  </button>
                ))}
                <input
                  type="number"
                  className="input w-24 py-1.5 text-sm"
                  placeholder="Custom"
                  value={timeForm.available_minutes}
                  onChange={e => setTimeForm(f => ({ ...f, available_minutes: parseInt(e.target.value) || 30 }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Equipment</label>
              <select
                className="input"
                value={timeForm.equipment}
                onChange={e => setTimeForm(f => ({ ...f, equipment: e.target.value }))}
              >
                {EQUIPMENT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Focus (optional)</label>
              <input
                className="input"
                placeholder="e.g., upper body, legs, cardio, full body"
                value={timeForm.focus}
                onChange={e => setTimeForm(f => ({ ...f, focus: e.target.value }))}
              />
            </div>
            <button
              onClick={generateTimeWorkout}
              disabled={loadingTime}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loadingTime
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin" />Building {timeForm.available_minutes}-Min Workout…</>
                : <><Timer className="w-4 h-4" />Generate {timeForm.available_minutes}-Min Workout</>
              }
            </button>
          </div>
        )}

        {timeWorkout ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">{timeWorkout.workout_name}</h3>
              <span className={`badge ${
                timeWorkout.intensity === 'very high' || timeWorkout.intensity === 'high' ? 'bg-red-500/20 text-red-400'
                : timeWorkout.intensity === 'moderate' ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-green-500/20 text-green-400'
              }`}>{timeWorkout.intensity}</span>
            </div>
            <div className="flex gap-3 text-sm text-gray-400">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-blue-400" />{timeWorkout.total_minutes} min</span>
              <span className="flex items-center gap-1"><Flame className="w-4 h-4 text-orange-400" />{timeWorkout.estimated_calories} cal</span>
              <span className="flex items-center gap-1"><Wrench className="w-4 h-4 text-gray-400" />{timeWorkout.equipment_needed}</span>
            </div>
            {timeWorkout.why_this_works && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                <p className="text-sm text-blue-200">{timeWorkout.why_this_works}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2">Warmup ({timeWorkout.warmup_minutes} min)</p>
              {timeWorkout.warmup?.map((ex: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-300 mb-1">
                  <div className="w-1.5 h-1.5 bg-primary-400 rounded-full flex-shrink-0" />
                  {ex.exercise} — {ex.duration_seconds}s
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Main ({timeWorkout.main_minutes} min)</p>
              <div className="space-y-2">
                {timeWorkout.main_workout?.map((ex: any, i: number) => (
                  <div key={i} className="bg-gray-800 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">{ex.exercise}</span>
                      <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">
                        {ex.sets} × {ex.reps_or_duration}
                      </span>
                    </div>
                    {ex.notes && <p className="text-xs text-gray-400 mt-1">{ex.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : !showTimeForm && (
          <p className="text-sm text-gray-400 text-center py-4">
            Set your available time and get a perfectly timed workout
          </p>
        )}
      </div>

      {/* Adaptive Workout */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" /> Adaptive Workout
          </h2>
          <button
            onClick={loadAdaptive}
            disabled={loadingAdaptive}
            className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAdaptive ? 'spin' : ''}`} />
            {loadingAdaptive ? 'Loading…' : 'Generate'}
          </button>
        </div>

        {adaptiveWorkout ? (
          <div className="space-y-3">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
              <p className="text-sm text-yellow-200">{adaptiveWorkout.strategy}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400 flex items-center gap-1">
                <Clock className="w-4 h-4" /> {adaptiveWorkout.duration_minutes} min
              </span>
              <span className="text-gray-400 flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-400" /> {adaptiveWorkout.estimated_calories} cal
              </span>
              <span className={`badge ${
                adaptiveWorkout.intensity === 'high' ? 'bg-red-500/20 text-red-400'
                : adaptiveWorkout.intensity === 'moderate' ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-green-500/20 text-green-400'
              }`}>
                {adaptiveWorkout.intensity} intensity
              </span>
            </div>
            <div className="space-y-2">
              {adaptiveWorkout.main_workout?.map((ex: any, i: number) => (
                <div key={i} className="bg-gray-800 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-white">{ex.name}</span>
                    <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">
                      {ex.sets} × {ex.reps}
                    </span>
                  </div>
                  {ex.modification && (
                    <p className="text-xs text-blue-400 mt-1">Easier: {ex.modification}</p>
                  )}
                </div>
              ))}
            </div>
            {adaptiveWorkout.motivation && (
              <p className="text-sm text-primary-300 italic">{adaptiveWorkout.motivation}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">
            Generate an AI workout adapted to your progress this week
          </p>
        )}
      </div>

      {/* Workout History */}
      {workouts.length > 0 && (
        <div className="space-y-2">
          <h2 className="section-title">Recent Workouts (7 days)</h2>
          {workouts.map(w => (
            <div key={w.id} className="card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                w.completed ? 'bg-primary-500/20' : 'bg-gray-700'
              }`}>
                {w.completed
                  ? <CheckCircle2 className="w-5 h-5 text-primary-400" />
                  : <X className="w-5 h-5 text-gray-400" />
                }
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-white">{w.workout_type}</p>
                <p className="text-xs text-gray-400">{w.log_date}</p>
              </div>
              <div className="text-right text-xs text-gray-400">
                <p className="flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3" />{w.duration_minutes}min
                </p>
                <p className="flex items-center gap-1 justify-end mt-0.5">
                  <Flame className="w-3 h-3 text-orange-400" />{Math.round(w.calories_burned)} cal
                </p>
              </div>
              <div className="w-8 text-center">
                <p className="text-xs text-gray-400">RPE</p>
                <p className={`font-bold text-sm ${
                  w.perceived_effort >= 8 ? 'text-red-400'
                  : w.perceived_effort >= 6 ? 'text-yellow-400'
                  : 'text-green-400'
                }`}>{w.perceived_effort}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log Workout Modal */}
      {showLog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden fade-in">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-white">Log Today's Workout</h3>
              <button onClick={() => setShowLog(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleLog} className="p-4 space-y-3">
              <div>
                <label className="label">Workout Type *</label>
                <input
                  className="input"
                  placeholder="e.g., Upper Body, Running, Yoga"
                  value={form.workout_type}
                  onChange={e => setForm(f => ({ ...f, workout_type: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Duration (min) *</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="45"
                    value={form.duration_minutes}
                    onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Calories Burned</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="300"
                    value={form.calories_burned}
                    onChange={e => setForm(f => ({ ...f, calories_burned: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="label">Perceived Effort (RPE): {form.perceived_effort}/10</label>
                <EffortDots value={form.perceived_effort} onChange={v => setForm(f => ({ ...f, perceived_effort: v }))} />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="How did it feel?"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowLog(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin" /> : <Plus className="w-4 h-4" />}
                  Log It
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
