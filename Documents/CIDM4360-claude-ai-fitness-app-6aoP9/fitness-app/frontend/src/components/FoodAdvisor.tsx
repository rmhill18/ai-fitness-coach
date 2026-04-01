import React, { useState } from 'react';
import {
  Search, Utensils, MessageSquare, DollarSign, Loader2,
  Award, ChevronDown, Flame, Zap, Droplets, AlertCircle,
  CheckCircle, ShoppingCart, Lightbulb, TrendingUp, Clock,
  ThumbsUp, X, Plus,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FastFoodResult {
  restaurant: string;
  item_name: string;
  size: string;
  confidence: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  saturated_fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  health_score: number;
  notes: string;
  healthier_alternatives: string[];
  modifications: string[];
}

interface FoodAdvice {
  situation_summary: string;
  top_recommendation: { what: string; why: string; calories: number; protein_g: number };
  alternatives: Array<{ what: string; calories: number; protein_g: number; why_good: string }>;
  what_to_avoid: string;
  ordering_tip: string;
  guilt_free_note: string;
  macro_impact: string;
}

interface BudgetMeal {
  meal_type: string;
  name: string;
  ingredients: string[];
  estimated_cost: number;
  calories: number;
  protein_g: number;
  prep_time_minutes: number;
  instructions: string;
}

interface BudgetPlan {
  daily_budget: number;
  estimated_actual_cost: number;
  calorie_total: number;
  protein_total_g: number;
  carb_total_g: number;
  fat_total_g: number;
  meals: BudgetMeal[];
  weekly_grocery_list: string[];
  budget_tips: string[];
  protein_per_dollar: number;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  user: { id: number; name: string; goal: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const POPULAR_RESTAURANTS = [
  "McDonald's", 'Chipotle', 'Subway', 'Chick-fil-A',
  "Domino's", 'Taco Bell', 'Starbucks', 'Panera',
];

const QUICK_SITUATIONS = [
  'At a fast food drive-through',
  'At a restaurant now',
  'Had a cheat meal',
  'Super hungry at night',
  'Nothing at home',
];

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

function healthScoreColor(score: number): string {
  if (score >= 7) return '#22c55e';
  if (score >= 5) return '#f59e0b';
  return '#ef4444';
}

function healthScoreLabel(score: number): string {
  if (score >= 8) return 'Great';
  if (score >= 6) return 'Okay';
  if (score >= 4) return 'Moderate';
  return 'Poor';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MacroGrid({
  calories, protein, carbs, fat,
}: { calories: number; protein: number; carbs: number; fat: number }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: 'Calories', value: Math.round(calories), unit: '', color: 'text-orange-400' },
        { label: 'Protein', value: Math.round(protein), unit: 'g', color: 'text-green-400' },
        { label: 'Carbs', value: Math.round(carbs), unit: 'g', color: 'text-blue-400' },
        { label: 'Fat', value: Math.round(fat), unit: 'g', color: 'text-yellow-400' },
      ].map(m => (
        <div key={m.label} className="bg-gray-800 rounded-xl p-2 text-center">
          <p className={`text-base font-bold ${m.color}`}>
            {m.value}{m.unit}
          </p>
          <p className="text-xs text-gray-400">{m.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Tab 1: Fast Food Lookup ───────────────────────────────────────────────────

function FastFoodTab({ userId }: { userId: number }) {
  const [restaurant, setRestaurant] = useState('');
  const [item, setItem] = useState('');
  const [size, setSize] = useState('regular');
  const [customSize, setCustomSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FastFoodResult | null>(null);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [logMealType, setLogMealType] = useState('lunch');
  const [logging, setLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);

  const handleLookup = async () => {
    if (!restaurant.trim() || !item.trim()) {
      setError('Please enter both a restaurant name and item.');
      return;
    }
    setError('');
    setResult(null);
    setShowLogPanel(false);
    setLogSuccess(false);
    setLoading(true);
    try {
      const res = await fetch('/api/meals/fast-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant: restaurant.trim(),
          item: item.trim(),
          size: size === 'custom' ? customSize.trim() : size,
        }),
      });
      if (!res.ok) throw new Error('Failed to fetch nutrition data.');
      const data: FastFoodResult = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogMeal = async () => {
    if (!result) return;
    setLogging(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          log_date: today,
          meal_type: logMealType,
          description: `${result.restaurant} — ${result.item_name} (${result.size})`,
          calories: result.calories,
          protein_g: result.protein_g,
          carbs_g: result.carbs_g,
          fat_g: result.fat_g,
          fiber_g: result.fiber_g,
          sugar_g: result.sugar_g,
          sodium_mg: result.sodium_mg,
        }),
      });
      if (!res.ok) throw new Error('Failed to log meal.');
      setLogSuccess(true);
      setShowLogPanel(false);
    } catch (e: any) {
      setError(e.message || 'Could not log meal.');
    } finally {
      setLogging(false);
    }
  };

  const scoreColor = result ? healthScoreColor(result.health_score) : '#22c55e';

  return (
    <div className="space-y-4">
      {/* Quick-select restaurant buttons */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Popular Restaurants
        </p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_RESTAURANTS.map(r => (
            <button
              key={r}
              onClick={() => setRestaurant(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                restaurant === r
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-3">
        <div>
          <label className="label">Restaurant</label>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3 pointer-events-none" />
            <input
              className="input pl-9"
              placeholder="e.g., McDonald's, Chipotle…"
              value={restaurant}
              onChange={e => setRestaurant(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
            />
          </div>
        </div>

        <div>
          <label className="label">Menu Item</label>
          <input
            className="input"
            placeholder="e.g., Big Mac, Burrito Bowl…"
            value={item}
            onChange={e => setItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
          />
        </div>

        <div>
          <label className="label">Size / Variation</label>
          <div className="relative">
            <select
              className="input appearance-none pr-8"
              value={size}
              onChange={e => setSize(e.target.value)}
            >
              <option value="small">Small</option>
              <option value="regular">Regular / Medium</option>
              <option value="large">Large</option>
              <option value="custom">Custom…</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>
          {size === 'custom' && (
            <input
              className="input mt-2"
              placeholder="Describe size or variation"
              value={customSize}
              onChange={e => setCustomSize(e.target.value)}
            />
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 rounded-xl p-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleLookup}
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Looking up nutrition…</>
        ) : (
          <><Search className="w-4 h-4" /> Get Nutrition</>
        )}
      </button>

      {/* Results */}
      {result && (
        <div className="space-y-4 fade-in">
          {/* Header */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight">{result.item_name}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{result.restaurant} · {result.size}</p>
                </div>
                <span className={`badge text-xs ${
                  result.confidence === 'high'
                    ? 'bg-green-500/20 text-green-400'
                    : result.confidence === 'medium'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {result.confidence} confidence
                </span>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Macros */}
              <MacroGrid
                calories={result.calories}
                protein={result.protein_g}
                carbs={result.carbs_g}
                fat={result.fat_g}
              />

              {/* Health Score */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-300 font-medium">Health Score</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: scoreColor }}>
                    {result.health_score}/10 · {healthScoreLabel(result.health_score)}
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${result.health_score * 10}%`,
                      backgroundColor: scoreColor,
                    }}
                  />
                </div>
              </div>

              {/* Extra Micros */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { label: 'Sodium', value: `${Math.round(result.sodium_mg)}mg` },
                  { label: 'Fiber', value: `${Math.round(result.fiber_g)}g` },
                  { label: 'Sat. Fat', value: `${Math.round(result.saturated_fat_g)}g` },
                  { label: 'Sugar', value: `${Math.round(result.sugar_g)}g` },
                ].map(m => (
                  <div key={m.label} className="bg-gray-800 rounded-lg p-2 text-center">
                    <p className="text-gray-200 font-semibold">{m.value}</p>
                    <p className="text-gray-500">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {result.notes && (
                <div className="bg-primary-500/10 rounded-xl p-3">
                  <p className="text-xs text-primary-300">{result.notes}</p>
                </div>
              )}

              {/* Modifications */}
              {result.modifications?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Modification Tips
                  </p>
                  <ul className="space-y-1">
                    {result.modifications.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                        <CheckCircle className="w-3.5 h-3.5 text-primary-400 mt-0.5 flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Healthier Alternatives */}
              {result.healthier_alternatives?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Healthier Alternatives
                  </p>
                  <ul className="space-y-1">
                    {result.healthier_alternatives.map((alt, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                        <TrendingUp className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                        {alt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Log This Meal */}
          {logSuccess ? (
            <div className="flex items-center gap-2 text-green-400 bg-green-500/10 rounded-xl p-3 text-sm">
              <CheckCircle className="w-4 h-4" />
              Meal logged successfully!
            </div>
          ) : showLogPanel ? (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3 fade-in">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Log this meal</p>
                <button onClick={() => setShowLogPanel(false)}>
                  <X className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
              </div>
              <div>
                <label className="label">Meal Type</label>
                <div className="relative">
                  <select
                    className="input appearance-none pr-8"
                    value={logMealType}
                    onChange={e => setLogMealType(e.target.value)}
                  >
                    {MEAL_TYPES.map(t => (
                      <option key={t} value={t} className="capitalize">{t}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowLogPanel(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleLogMeal}
                  disabled={logging}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {logging ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Confirm
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowLogPanel(true)}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Log This Meal
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Ask the Advisor ────────────────────────────────────────────────────

function AdvisorTab({ userId }: { userId: number }) {
  const [situation, setSituation] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [advice, setAdvice] = useState<FoodAdvice | null>(null);

  const handleGetAdvice = async () => {
    if (!situation.trim()) {
      setError('Please describe your situation first.');
      return;
    }
    setError('');
    setAdvice(null);
    setLoading(true);
    try {
      const res = await fetch('/api/food-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          situation: situation.trim(),
          context: context.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed to get advice.');
      const data: FoodAdvice = await res.json();
      setAdvice(data);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick situations */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Quick Scenarios
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_SITUATIONS.map(s => (
            <button
              key={s}
              onClick={() => setSituation(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                situation === s
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-3">
        <div>
          <label className="label">Describe your situation</label>
          <textarea
            className="input min-h-[90px] resize-none"
            placeholder={`e.g., "I'm at a Chinese restaurant with my family", "At the airport and starving", "I already ate pizza and feel guilty"…`}
            value={situation}
            onChange={e => setSituation(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Additional context <span className="text-gray-600 font-normal">(optional)</span></label>
          <input
            className="input"
            placeholder='e.g., "Under 500 cal", "Haven't eaten since morning"'
            value={context}
            onChange={e => setContext(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 rounded-xl p-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleGetAdvice}
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Getting your advice…</>
        ) : (
          <><MessageSquare className="w-4 h-4" /> Get Advice</>
        )}
      </button>

      {/* Results */}
      {advice && (
        <div className="space-y-4 fade-in">
          {/* Situation summary */}
          {advice.situation_summary && (
            <div className="bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">
                Situation
              </p>
              <p className="text-sm text-gray-300">{advice.situation_summary}</p>
            </div>
          )}

          {/* Top Recommendation */}
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <ThumbsUp className="w-4 h-4 text-primary-400" />
              </div>
              <p className="text-sm font-bold text-primary-300">Top Recommendation</p>
            </div>
            <p className="text-base font-semibold text-white mb-1">
              {advice.top_recommendation.what}
            </p>
            <p className="text-xs text-gray-400 mb-3">{advice.top_recommendation.why}</p>
            <div className="flex gap-3">
              <div className="bg-gray-800/60 rounded-lg px-3 py-1.5 text-center">
                <p className="text-orange-400 font-bold text-sm">
                  {advice.top_recommendation.calories}
                </p>
                <p className="text-gray-500 text-xs">cal</p>
              </div>
              <div className="bg-gray-800/60 rounded-lg px-3 py-1.5 text-center">
                <p className="text-green-400 font-bold text-sm">
                  {advice.top_recommendation.protein_g}g
                </p>
                <p className="text-gray-500 text-xs">protein</p>
              </div>
            </div>
          </div>

          {/* Alternatives */}
          {advice.alternatives?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Alternatives
              </p>
              <div className="space-y-2">
                {advice.alternatives.map((alt, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-white">{alt.what}</p>
                      <div className="flex gap-2 flex-shrink-0 text-xs">
                        <span className="text-orange-400 font-semibold">{alt.calories} cal</span>
                        <span className="text-green-400 font-semibold">{alt.protein_g}g P</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{alt.why_good}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What to avoid, ordering tip, guilt-free note, macro impact */}
          {[
            { icon: <X className="w-4 h-4 text-red-400" />, label: 'What to Avoid', text: advice.what_to_avoid, bg: 'bg-red-500/10', border: 'border-red-500/20', text_color: 'text-red-300' },
            { icon: <Lightbulb className="w-4 h-4 text-yellow-400" />, label: 'Ordering Tip', text: advice.ordering_tip, bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text_color: 'text-yellow-300' },
            { icon: <CheckCircle className="w-4 h-4 text-green-400" />, label: 'Guilt-Free Note', text: advice.guilt_free_note, bg: 'bg-green-500/10', border: 'border-green-500/20', text_color: 'text-green-300' },
            { icon: <TrendingUp className="w-4 h-4 text-blue-400" />, label: 'Macro Impact', text: advice.macro_impact, bg: 'bg-blue-500/10', border: 'border-blue-500/20', text_color: 'text-blue-300' },
          ].filter(item => item.text).map(item => (
            <div key={item.label} className={`${item.bg} border ${item.border} rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                {item.icon}
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {item.label}
                </p>
              </div>
              <p className={`text-sm ${item.text_color}`}>{item.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Budget Meals ───────────────────────────────────────────────────────

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: 'text-orange-400',
  lunch: 'text-blue-400',
  dinner: 'text-purple-400',
  snack: 'text-green-400',
};

function BudgetTab({ userId }: { userId: number }) {
  const [dailyBudget, setDailyBudget] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<BudgetPlan | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);

  const handleGenerate = async () => {
    setError('');
    setPlan(null);
    setExpandedMeal(null);
    setLoading(true);
    try {
      const res = await fetch('/api/budget-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, daily_budget_usd: dailyBudget }),
      });
      if (!res.ok) throw new Error('Failed to generate budget plan.');
      const data: BudgetPlan = await res.json();
      setPlan(data);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const budgetUsed = plan
    ? Math.min((plan.estimated_actual_cost / plan.daily_budget) * 100, 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Daily Budget</label>
          <span className="text-lg font-bold text-primary-400">${dailyBudget}</span>
        </div>
        <input
          type="range"
          min={5}
          max={30}
          step={1}
          value={dailyBudget}
          onChange={e => setDailyBudget(Number(e.target.value))}
          className="w-full accent-primary-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>$5 / day</span>
          <span>$30 / day</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 rounded-xl p-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Building your budget plan…
          </>
        ) : (
          <>
            <DollarSign className="w-4 h-4" />
            Generate Budget Plan
          </>
        )}
      </button>

      {loading && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center fade-in">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Building your budget plan…</p>
          <p className="text-xs text-gray-400 mt-1">
            AI is crafting meals optimised for your ${dailyBudget}/day budget
          </p>
        </div>
      )}

      {/* Results */}
      {plan && !loading && (
        <div className="space-y-4 fade-in">
          {/* Overview cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Cost */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Est. Cost
              </p>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-2xl font-bold text-white">
                  ${plan.estimated_actual_cost.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500 mb-0.5">/ ${plan.daily_budget}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-700"
                  style={{ width: `${budgetUsed}%` }}
                />
              </div>
            </div>

            {/* Protein per dollar — highlighted */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Protein / $
              </p>
              <p className="text-2xl font-bold text-green-400">
                {plan.protein_per_dollar.toFixed(1)}g
              </p>
              <p className="text-xs text-gray-500 mt-1">per dollar spent</p>
            </div>
          </div>

          {/* Nutrition totals */}
          <MacroGrid
            calories={plan.calorie_total}
            protein={plan.protein_total_g}
            carbs={plan.carb_total_g}
            fat={plan.fat_total_g}
          />

          {/* Meal Cards */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Meal Plan
            </p>
            <div className="space-y-2">
              {plan.meals.map((meal, i) => {
                const isOpen = expandedMeal === i;
                const mealColor = MEAL_TYPE_COLORS[meal.meal_type] ?? 'text-gray-300';
                return (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <button
                      className="w-full p-4 text-left flex items-center justify-between"
                      onClick={() => setExpandedMeal(isOpen ? null : i)}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-semibold uppercase tracking-wider ${mealColor}`}>
                            {meal.meal_type}
                          </span>
                          <span className="text-xs text-gray-500">
                            <Clock className="w-3 h-3 inline mr-0.5" />
                            {meal.prep_time_minutes} min
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white">{meal.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {Math.round(meal.calories)} cal · {Math.round(meal.protein_g)}g protein ·{' '}
                          <span className="text-green-400">${meal.estimated_cost.toFixed(2)}</span>
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-800 pt-3 fade-in">
                        {/* Ingredients */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            Ingredients
                          </p>
                          <ul className="space-y-1">
                            {meal.ingredients.map((ing, j) => (
                              <li key={j} className="flex items-center gap-2 text-xs text-gray-300">
                                <span className="w-1 h-1 rounded-full bg-primary-400 flex-shrink-0" />
                                {ing}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {/* Instructions */}
                        {meal.instructions && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                              Instructions
                            </p>
                            <p className="text-xs text-gray-300 leading-relaxed">
                              {meal.instructions}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Grocery List */}
          {plan.weekly_grocery_list?.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCart className="w-4 h-4 text-primary-400" />
                <p className="text-sm font-semibold text-white">Weekly Grocery List</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {plan.weekly_grocery_list.map((item, i) => (
                  <p key={i} className="text-xs text-gray-300 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-500 flex-shrink-0" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Budget Tips */}
          {plan.budget_tips?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Budget Tips
              </p>
              <div className="space-y-2">
                {plan.budget_tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-800 rounded-xl p-3">
                    <div className="w-6 h-6 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Lightbulb className="w-3.5 h-3.5 text-primary-400" />
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type Tab = 'fastfood' | 'advisor' | 'budget';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'fastfood', label: 'Fast Food', icon: <Utensils className="w-4 h-4" /> },
  { id: 'advisor', label: 'Ask Advisor', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'budget', label: 'Budget Meals', icon: <DollarSign className="w-4 h-4" /> },
];

export default function FoodAdvisor({ user }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('fastfood');

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary-400" />
          Food Intelligence
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Smart food decisions for {user.name}
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex bg-gray-900 rounded-2xl p-1 border border-gray-800 gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-primary-500 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'fastfood' && <FastFoodTab userId={user.id} />}
        {activeTab === 'advisor' && <AdvisorTab userId={user.id} />}
        {activeTab === 'budget' && <BudgetTab userId={user.id} />}
      </div>
    </div>
  );
}
