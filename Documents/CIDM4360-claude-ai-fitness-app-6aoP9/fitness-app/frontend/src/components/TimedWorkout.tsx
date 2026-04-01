import React, { useState } from 'react';
import { Timer, Dumbbell, Zap, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { generateTimedWorkout } from '../api/client';
import type { UserProfile, TimedWorkoutResult } from '../types';

interface Props {
  user: UserProfile;
}

const TIME_OPTIONS = [10, 15, 20, 25, 30, 45, 60];

const EQUIPMENT_OPTIONS = [
  { value: 'no equipment', label: 'No Equipment' },
  { value: 'dumbbells only', label: 'Dumbbells' },
  { value: 'resistance bands', label: 'Bands' },
  { value: 'full gym', label: 'Full Gym' },
  { value: 'pull-up bar', label: 'Pull-Up Bar' },
  { value: 'kettlebell', label: 'Kettlebell' },
];

const FOCUS_OPTIONS = [
  'full body', 'upper body', 'lower body', 'core', 'cardio', 'push', 'pull', 'legs',
];

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-green-400',
  moderate: 'text-yellow-400',
  hard: 'text-red-400',
};

export default function TimedWorkout({ user }: Props) {
  const [minutes, setMinutes] = useState(20);
  const [equipment, setEquipment] = useState('no equipment');
  const [focusArea, setFocusArea] = useState('full body');
  const [result, setResult] = useState<TimedWorkoutResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>('main');

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await generateTimedWorkout({
        user_id: user.id,
        available_minutes: minutes,
        equipment,
        focus_area: focusArea,
      });
      setResult(data);
      setExpandedSection('main');
    } catch {
      setError('Could not generate workout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (section: string) =>
    setExpandedSection(prev => (prev === section ? null : section));

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
          <Timer className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Timed Workout</h1>
          <p className="text-xs text-gray-400">Tell me how long you have</p>
        </div>
      </div>

      {!result ? (
        <div className="space-y-4">
          {/* Time Picker */}
          <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <label className="text-sm font-semibold text-gray-300">
              Available Time: <span className="text-blue-400">{minutes} minutes</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {TIME_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => setMinutes(t)}
                  className={`flex-1 min-w-[50px] py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    minutes === t
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {t}m
                </button>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <label className="text-sm font-semibold text-gray-300">Equipment</label>
            <div className="grid grid-cols-3 gap-2">
              {EQUIPMENT_OPTIONS.map(eq => (
                <button
                  key={eq.value}
                  onClick={() => setEquipment(eq.value)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition-colors ${
                    equipment === eq.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {eq.label}
                </button>
              ))}
            </div>
          </div>

          {/* Focus Area */}
          <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <label className="text-sm font-semibold text-gray-300">Focus</label>
            <div className="flex flex-wrap gap-1.5">
              {FOCUS_OPTIONS.map(f => (
                <button
                  key={f}
                  onClick={() => setFocusArea(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                    focusArea === f
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-4 bg-blue-500 hover:bg-blue-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Building your {minutes}-min workout…
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Build My {minutes}-Min Workout
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Workout Header Card */}
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">{result.workout_name}</h2>
                <p className="text-gray-400 text-sm capitalize">{result.format}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm capitalize ${DIFFICULTY_COLOR[result.difficulty] || 'text-gray-400'}`}>
                  {result.difficulty}
                </p>
                <p className="text-gray-500 text-xs">{result.calories_estimate} cal</p>
              </div>
            </div>
            <div className="flex gap-4 mt-3 pt-3 border-t border-blue-500/20">
              <div className="text-center">
                <p className="text-blue-400 font-bold">{result.warmup.duration_minutes}m</p>
                <p className="text-gray-500 text-xs">Warmup</p>
              </div>
              <div className="text-center">
                <p className="text-blue-400 font-bold">{result.main_workout.duration_minutes}m</p>
                <p className="text-gray-500 text-xs">Main</p>
              </div>
              <div className="text-center">
                <p className="text-blue-400 font-bold">{result.cooldown.duration_minutes}m</p>
                <p className="text-gray-500 text-xs">Cooldown</p>
              </div>
            </div>
          </div>

          {/* Warmup */}
          <div className="bg-gray-900 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggle('warmup')}
              className="w-full flex items-center justify-between p-4"
            >
              <span className="text-sm font-semibold text-gray-300">Warmup ({result.warmup.duration_minutes} min)</span>
              {expandedSection === 'warmup' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {expandedSection === 'warmup' && (
              <div className="px-4 pb-4 space-y-1.5">
                {result.warmup.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center text-xs text-gray-400">{i + 1}</div>
                    {ex}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main Workout */}
          <div className="bg-gray-900 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggle('main')}
              className="w-full flex items-center justify-between p-4"
            >
              <span className="text-sm font-semibold text-gray-300">
                Main Workout ({result.main_workout.duration_minutes} min)
              </span>
              {expandedSection === 'main' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {expandedSection === 'main' && (
              <div className="px-4 pb-4 space-y-3">
                <p className="text-xs text-gray-500 italic">{result.main_workout.structure}</p>
                {result.main_workout.exercises.map((ex, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold text-sm">{ex.name}</span>
                      <span className="text-blue-400 text-xs font-bold">{ex.duration_or_reps}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">Rest: {ex.rest}</span>
                    </div>
                    {ex.modification && (
                      <p className="text-gray-500 text-xs italic">Easier: {ex.modification}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cooldown */}
          <div className="bg-gray-900 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggle('cooldown')}
              className="w-full flex items-center justify-between p-4"
            >
              <span className="text-sm font-semibold text-gray-300">Cooldown ({result.cooldown.duration_minutes} min)</span>
              {expandedSection === 'cooldown' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {expandedSection === 'cooldown' && (
              <div className="px-4 pb-4 space-y-1.5">
                {result.cooldown.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <div className="w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center text-xs text-gray-400">{i + 1}</div>
                    {ex}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pro Tip + Motivation */}
          {(result.pro_tip || result.motivation) && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 space-y-2">
              {result.pro_tip && (
                <p className="text-sm text-blue-300"><span className="font-semibold">Pro tip:</span> {result.pro_tip}</p>
              )}
              {result.motivation && (
                <p className="text-sm text-gray-400 italic">{result.motivation}</p>
              )}
            </div>
          )}

          <button
            onClick={() => setResult(null)}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Generate Another
          </button>
        </div>
      )}
    </div>
  );
}
