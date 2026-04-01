import React, { useState } from 'react';
import { Zap, Search, RefreshCw, CheckCircle, XCircle, ArrowRight, Lightbulb } from 'lucide-react';
import { getQuickFoodDecision } from '../api/client';
import type { UserProfile, QuickFoodResult } from '../types';

interface Props {
  user: UserProfile;
}

const COMMON_SPOTS = [
  'McDonald\'s', 'Chipotle', 'Subway', 'Chick-fil-A', 'Starbucks',
  'Panera Bread', 'Taco Bell', 'Wendy\'s', 'Panda Express', 'Five Guys',
];

const CONTEXTS = [
  'lunch break', 'post-workout', 'breakfast on the go', 'late night',
  'dinner with friends', 'road trip', 'pre-workout fuel',
];

export default function QuickFood({ user }: Props) {
  const [restaurant, setRestaurant] = useState('');
  const [context, setContext] = useState('lunch break');
  const [caloriesLeft, setCaloriesLeft] = useState(600);
  const [result, setResult] = useState<QuickFoodResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDecide = async () => {
    if (!restaurant.trim()) {
      setError('Enter a restaurant or food spot');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await getQuickFoodDecision({
        user_id: user.id,
        restaurant: restaurant.trim(),
        meal_context: context,
        calories_remaining: caloriesLeft,
      });
      setResult(data);
    } catch {
      setError('Could not get recommendation. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setRestaurant('');
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
          <Zap className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Quick Food Decision</h1>
          <p className="text-xs text-gray-400">What should I order right now?</p>
        </div>
      </div>

      {!result ? (
        <div className="space-y-4">
          {/* Restaurant Input */}
          <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <label className="text-sm font-semibold text-gray-300">Where are you?</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={restaurant}
                onChange={e => setRestaurant(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDecide()}
                placeholder="e.g. Chipotle, local burger place…"
                className="w-full pl-9 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
              />
            </div>

            {/* Quick pick chips */}
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SPOTS.map(spot => (
                <button
                  key={spot}
                  onClick={() => setRestaurant(spot)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    restaurant === spot
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {spot}
                </button>
              ))}
            </div>
          </div>

          {/* Context */}
          <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <label className="text-sm font-semibold text-gray-300">What's the situation?</label>
            <div className="flex flex-wrap gap-1.5">
              {CONTEXTS.map(ctx => (
                <button
                  key={ctx}
                  onClick={() => setContext(ctx)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    context === ctx
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {ctx}
                </button>
              ))}
            </div>
          </div>

          {/* Calories remaining */}
          <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <label className="text-sm font-semibold text-gray-300">
              Calories remaining today: <span className="text-orange-400">{caloriesLeft} kcal</span>
            </label>
            <input
              type="range"
              min={200}
              max={1200}
              step={50}
              value={caloriesLeft}
              onChange={e => setCaloriesLeft(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>200</span><span>700</span><span>1200</span>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={handleDecide}
            disabled={loading || !restaurant.trim()}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing menu…
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Tell Me What to Order
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main Recommendation */}
          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-orange-400 shrink-0" />
              <span className="text-sm font-semibold text-orange-300">Order This</span>
            </div>
            <p className="text-white font-bold text-lg leading-tight">{result.recommendation}</p>
            <p className="text-gray-300 text-sm">{result.why}</p>
            <div className="flex gap-4 pt-1">
              <div className="text-center">
                <p className="text-orange-400 font-bold text-lg">{result.estimated_calories}</p>
                <p className="text-gray-500 text-xs">kcal</p>
              </div>
              <div className="text-center">
                <p className="text-orange-400 font-bold text-lg">{result.estimated_protein_g}g</p>
                <p className="text-gray-500 text-xs">protein</p>
              </div>
            </div>
          </div>

          {/* Smart Swaps */}
          {result.smart_swaps?.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-semibold text-green-400">Smart Swaps</p>
              {result.smart_swaps.map((swap, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <ArrowRight className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  {swap}
                </div>
              ))}
            </div>
          )}

          {/* Avoid */}
          {result.avoid?.length > 0 && (
            <div className="bg-gray-900 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-semibold text-red-400">Skip These</p>
              {result.avoid.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          )}

          {/* Backup + Tip */}
          <div className="grid grid-cols-2 gap-3">
            {result.backup_option && (
              <div className="bg-gray-900 rounded-2xl p-3 space-y-1">
                <p className="text-xs font-semibold text-gray-400">Backup Option</p>
                <p className="text-sm text-white">{result.backup_option}</p>
              </div>
            )}
            {result.quick_tip && (
              <div className="bg-gray-900 rounded-2xl p-3 space-y-1">
                <div className="flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                  <p className="text-xs font-semibold text-gray-400">Quick Tip</p>
                </div>
                <p className="text-sm text-white">{result.quick_tip}</p>
              </div>
            )}
          </div>

          <button
            onClick={reset}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Ask Again
          </button>
        </div>
      )}
    </div>
  );
}
