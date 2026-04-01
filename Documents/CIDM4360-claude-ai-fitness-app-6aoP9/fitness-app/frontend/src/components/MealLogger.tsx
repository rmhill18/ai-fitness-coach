import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, Plus, Trash2, Utensils, Sparkles, ChevronDown,
  Flame, Zap, Droplets, Award, X
} from 'lucide-react';
import { analyzeMealPhoto, logMeal, getMeals, deleteMeal } from '../api/client';
import type { MealLog, MealAnalysis, UserProfile } from '../types';

interface Props { user: UserProfile }

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

function NutritionBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300 font-medium">{Math.round(value)}{label.includes('cal') ? '' : 'g'}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function AnalysisModal({ analysis, onConfirm, onClose, mealType, userId, date }: {
  analysis: MealAnalysis;
  onConfirm: (meal: Omit<MealLog, 'id' | 'created_at'>) => void;
  onClose: () => void;
  mealType: string;
  userId: number;
  date: string;
}) {
  const [type, setType] = useState(mealType);
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    setSaving(true);
    try {
      await logMeal({
        user_id: userId,
        log_date: date,
        meal_type: type,
        description: analysis.meal_name,
        calories: analysis.calories,
        protein_g: analysis.protein_g,
        carbs_g: analysis.carbs_g,
        fat_g: analysis.fat_g,
        fiber_g: analysis.fiber_g,
        sugar_g: analysis.sugar_g,
        sodium_mg: analysis.sodium_mg,
        vitamin_c_mg: analysis.vitamin_c_mg,
        calcium_mg: analysis.calcium_mg,
        iron_mg: analysis.iron_mg,
      });
      onConfirm({} as any);
    } finally {
      setSaving(false);
    }
  };

  const healthColor = analysis.health_score >= 7 ? '#22c55e' : analysis.health_score >= 5 ? '#f59e0b' : '#ef4444';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden fade-in">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-start justify-between">
          <div>
            <h3 className="font-bold text-white text-lg">{analysis.meal_name}</h3>
            <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{analysis.description}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white ml-2 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Health Score */}
          <div className="flex items-center justify-between bg-gray-800 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-gray-300">Health Score</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold" style={{ color: healthColor }}>
                {analysis.health_score}/10
              </div>
              <span className={`badge ${analysis.confidence === 'high' ? 'bg-green-500/20 text-green-400' : analysis.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                {analysis.confidence} confidence
              </span>
            </div>
          </div>

          {/* Key Macros */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Calories', value: analysis.calories, unit: '', color: 'text-orange-400' },
              { label: 'Protein', value: analysis.protein_g, unit: 'g', color: 'text-green-400' },
              { label: 'Carbs', value: analysis.carbs_g, unit: 'g', color: 'text-blue-400' },
              { label: 'Fat', value: analysis.fat_g, unit: 'g', color: 'text-yellow-400' },
            ].map(m => (
              <div key={m.label} className="bg-gray-800 rounded-xl p-2 text-center">
                <p className={`text-base font-bold ${m.color}`}>{Math.round(m.value)}{m.unit}</p>
                <p className="text-xs text-gray-400">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Micros */}
          <div className="bg-gray-800 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Micronutrients</p>
            {[
              { label: 'Fiber', value: analysis.fiber_g, unit: 'g' },
              { label: 'Sugar', value: analysis.sugar_g, unit: 'g' },
              { label: 'Sodium', value: analysis.sodium_mg, unit: 'mg' },
              { label: 'Vitamin C', value: analysis.vitamin_c_mg, unit: 'mg' },
              { label: 'Calcium', value: analysis.calcium_mg, unit: 'mg' },
              { label: 'Iron', value: analysis.iron_mg, unit: 'mg' },
            ].map(m => (
              <div key={m.label} className="flex justify-between text-xs">
                <span className="text-gray-400">{m.label}</span>
                <span className="text-gray-200 font-medium">{Math.round(m.value)}{m.unit}</span>
              </div>
            ))}
          </div>

          {/* Components */}
          {analysis.components?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Components</p>
              <div className="space-y-1">
                {analysis.components.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">{c.item} <span className="text-gray-500">({c.estimated_portion})</span></span>
                    <span className="text-gray-400">{c.calories} cal</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Health Notes */}
          {analysis.health_notes && (
            <div className="bg-primary-500/10 rounded-xl p-3">
              <p className="text-xs text-primary-300">{analysis.health_notes}</p>
            </div>
          )}

          {/* Suggestions */}
          {analysis.suggestions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Suggestions</p>
              {analysis.suggestions.map((s, i) => (
                <p key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                  <span className="text-primary-400 mt-0.5">•</span>{s}
                </p>
              ))}
            </div>
          )}

          {/* Meal Type */}
          <div>
            <label className="label">Meal Type</label>
            <div className="relative">
              <select
                className="input appearance-none pr-8"
                value={type}
                onChange={e => setType(e.target.value)}
              >
                {MEAL_TYPES.map(t => (
                  <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={confirm} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin" /> : <Plus className="w-4 h-4" />}
            Log Meal
          </button>
        </div>
      </div>
    </div>
  );
}

function ManualEntryModal({ onSave, onClose, userId, date }: {
  onSave: () => void; onClose: () => void; userId: number; date: string;
}) {
  const [form, setForm] = useState({
    meal_type: 'breakfast', description: '', calories: '',
    protein_g: '', carbs_g: '', fat_g: '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.description || !form.calories) return;
    setSaving(true);
    try {
      await logMeal({
        user_id: userId,
        log_date: date,
        meal_type: form.meal_type,
        description: form.description,
        calories: parseFloat(form.calories) || 0,
        protein_g: parseFloat(form.protein_g) || 0,
        carbs_g: parseFloat(form.carbs_g) || 0,
        fat_g: parseFloat(form.fat_g) || 0,
      });
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden fade-in">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="font-bold text-white">Log Meal Manually</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="label">Meal Type</label>
            <div className="relative">
              <select className="input appearance-none" value={form.meal_type} onChange={e => setForm(f => ({ ...f, meal_type: e.target.value }))}>
                {MEAL_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description *</label>
            <input className="input" placeholder="e.g., Chicken salad with dressing" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Calories *</label><input className="input" type="number" placeholder="450" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} /></div>
            <div><label className="label">Protein (g)</label><input className="input" type="number" placeholder="30" value={form.protein_g} onChange={e => setForm(f => ({ ...f, protein_g: e.target.value }))} /></div>
            <div><label className="label">Carbs (g)</label><input className="input" type="number" placeholder="45" value={form.carbs_g} onChange={e => setForm(f => ({ ...f, carbs_g: e.target.value }))} /></div>
            <div><label className="label">Fat (g)</label><input className="input" type="number" placeholder="15" value={form.fat_g} onChange={e => setForm(f => ({ ...f, fat_g: e.target.value }))} /></div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-800 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving || !form.description || !form.calories} className="btn-primary flex-1">Log Meal</button>
        </div>
      </div>
    </div>
  );
}

export default function MealLogger({ user }: Props) {
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];

  const loadMeals = async () => {
    const data = await getMeals(user.id, today);
    setMeals(data);
  };

  useEffect(() => { loadMeals(); }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setAnalyzing(true);
    try {
      const result = await analyzeMealPhoto(file);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    await deleteMeal(id);
    loadMeals();
  };

  const totalCals = meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = meals.reduce((s, m) => s + m.protein_g, 0);
  const totalCarbs = meals.reduce((s, m) => s + m.carbs_g, 0);
  const totalFat = meals.reduce((s, m) => s + m.fat_g, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
      <h1 className="text-xl font-bold text-white">Meal Logger</h1>

      {/* Daily Summary */}
      <div className="card">
        <p className="text-sm font-semibold text-gray-400 mb-3">Today's Nutrition</p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Calories', value: Math.round(totalCals), color: 'text-orange-400' },
            { label: 'Protein', value: `${Math.round(totalProtein)}g`, color: 'text-green-400' },
            { label: 'Carbs', value: `${Math.round(totalCarbs)}g`, color: 'text-blue-400' },
            { label: 'Fat', value: `${Math.round(totalFat)}g`, color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-800 rounded-xl p-2 text-center">
              <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={analyzing}
          className="card-hover flex flex-col items-center gap-2 py-4 border-dashed border-2 border-gray-700 hover:border-primary-500"
        >
          {analyzing ? (
            <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full spin" />
          ) : (
            <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary-400" />
            </div>
          )}
          <span className="text-sm font-semibold text-gray-300">
            {analyzing ? 'Analyzing…' : 'Photo Analysis'}
          </span>
          <span className="text-xs text-gray-500 text-center">AI scans your meal</span>
        </button>

        <button
          onClick={() => setShowManual(true)}
          className="card-hover flex flex-col items-center gap-2 py-4 border-dashed border-2 border-gray-700 hover:border-primary-500"
        >
          <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center">
            <Plus className="w-5 h-5 text-gray-300" />
          </div>
          <span className="text-sm font-semibold text-gray-300">Manual Entry</span>
          <span className="text-xs text-gray-500 text-center">Enter details yourself</span>
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} capture="environment" />

      {/* Analyzing indicator */}
      {analyzing && previewUrl && (
        <div className="card flex items-center gap-3">
          <img src={previewUrl} className="w-16 h-16 rounded-xl object-cover" alt="Meal" />
          <div>
            <p className="text-sm font-semibold text-white">Analyzing your meal…</p>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary-400" /> AI is estimating nutrition
            </p>
          </div>
          <div className="ml-auto w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full spin" />
        </div>
      )}

      {/* Meals List */}
      {meals.length > 0 && (
        <div className="space-y-2">
          <h2 className="section-title">Today's Meals</h2>
          {MEAL_TYPES.map(type => {
            const typeMeals = meals.filter(m => m.meal_type === type);
            if (typeMeals.length === 0) return null;
            return (
              <div key={type} className="card space-y-2">
                <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider">{type}</p>
                {typeMeals.map(meal => (
                  <div key={meal.id} className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{meal.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {Math.round(meal.calories)} cal • {Math.round(meal.protein_g)}g P • {Math.round(meal.carbs_g)}g C • {Math.round(meal.fat_g)}g F
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(meal.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {meals.length === 0 && !analyzing && (
        <div className="text-center py-8 text-gray-500">
          <Utensils className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No meals logged yet today</p>
          <p className="text-xs mt-1">Take a photo or add manually</p>
        </div>
      )}

      {/* Analysis Modal */}
      {analysis && (
        <AnalysisModal
          analysis={analysis}
          mealType={selectedMealType}
          userId={user.id}
          date={today}
          onConfirm={() => {
            setAnalysis(null);
            setPreviewUrl(null);
            loadMeals();
          }}
          onClose={() => {
            setAnalysis(null);
            setPreviewUrl(null);
          }}
        />
      )}

      {/* Manual Entry Modal */}
      {showManual && (
        <ManualEntryModal
          userId={user.id}
          date={today}
          onSave={() => { setShowManual(false); loadMeals(); }}
          onClose={() => setShowManual(false)}
        />
      )}
    </div>
  );
}
