import React, { useState } from 'react';
import { User, Target, Activity, Dumbbell, Save } from 'lucide-react';
import { createUser, updateUser } from '../api/client';
import type { UserProfile } from '../types';

interface Props {
  existing?: UserProfile;
  onSave: (user: UserProfile) => void;
}

const GOALS = [
  { value: 'weight_loss', label: 'Weight Loss', emoji: '🏃' },
  { value: 'muscle_gain', label: 'Muscle Gain', emoji: '💪' },
  { value: 'maintenance', label: 'Maintenance', emoji: '⚖️' },
  { value: 'endurance', label: 'Endurance', emoji: '🚴' },
];

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
  { value: 'light', label: 'Light', desc: '1–3 days/week' },
  { value: 'moderate', label: 'Moderate', desc: '3–5 days/week' },
  { value: 'very_active', label: 'Very Active', desc: '6–7 days/week' },
];

const FITNESS_LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: 'Just starting out' },
  { value: 'intermediate', label: 'Intermediate', desc: '1–3 years experience' },
  { value: 'advanced', label: 'Advanced', desc: '3+ years experience' },
];

export default function UserProfilePage({ existing, onSave }: Props) {
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    age: existing?.age?.toString() ?? '',
    height_cm: existing?.height_cm?.toString() ?? '',
    weight_kg: existing?.weight_kg?.toString() ?? '',
    goal: existing?.goal ?? 'weight_loss',
    activity_level: existing?.activity_level ?? 'moderate',
    fitness_level: existing?.fitness_level ?? 'beginner',
    dietary_restrictions: existing?.dietary_restrictions ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.age || !form.height_cm || !form.weight_kg) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        age: parseInt(form.age),
        height_cm: parseFloat(form.height_cm),
        weight_kg: parseFloat(form.weight_kg),
        goal: form.goal as UserProfile['goal'],
        activity_level: form.activity_level as UserProfile['activity_level'],
        fitness_level: form.fitness_level as UserProfile['fitness_level'],
        dietary_restrictions: form.dietary_restrictions,
      };
      let result;
      if (existing?.id) {
        await updateUser(existing.id, payload);
        result = { ...payload, id: existing.id };
      } else {
        const r = await createUser(payload);
        result = { ...payload, id: r.id };
      }
      onSave(result as UserProfile);
    } catch (err) {
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const bmi =
    form.height_cm && form.weight_kg
      ? (parseFloat(form.weight_kg) / (parseFloat(form.height_cm) / 100) ** 2).toFixed(1)
      : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-primary-500/20 rounded-2xl flex items-center justify-center">
          <User className="w-6 h-6 text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {existing ? 'Update Profile' : 'Create Your Profile'}
          </h1>
          <p className="text-gray-400 text-sm">
            Tell us about yourself to get personalized plans
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <User className="w-4 h-4 text-primary-400" /> Basic Info
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Name *</label>
              <input
                className="input"
                placeholder="Your name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Age *</label>
              <input
                className="input"
                type="number"
                placeholder="25"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Height (cm) *</label>
              <input
                className="input"
                type="number"
                placeholder="175"
                value={form.height_cm}
                onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Weight (kg) *</label>
              <input
                className="input"
                type="number"
                placeholder="75"
                value={form.weight_kg}
                onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
              />
            </div>
            {bmi && (
              <div className="flex items-end pb-2">
                <span className="text-sm text-gray-400">
                  BMI: <span className="text-primary-400 font-bold text-base">{bmi}</span>
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="label">Dietary Restrictions / Allergies</label>
            <input
              className="input"
              placeholder="e.g., vegetarian, gluten-free, nut allergy…"
              value={form.dietary_restrictions}
              onChange={e => setForm(f => ({ ...f, dietary_restrictions: e.target.value }))}
            />
          </div>
        </div>

        {/* Goal */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary-400" /> Primary Goal
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {GOALS.map(g => (
              <button
                key={g.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, goal: g.value as UserProfile['goal'] }))}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  form.goal === g.value
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-2xl mb-1">{g.emoji}</div>
                <div className="font-semibold text-sm text-white">{g.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Activity Level */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-400" /> Activity Level
          </h2>
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map(a => (
              <button
                key={a.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, activity_level: a.value as UserProfile['activity_level'] }))}
                className={`w-full p-3 rounded-xl border-2 text-left flex justify-between items-center transition-all ${
                  form.activity_level === a.value
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <span className="font-semibold text-sm text-white">{a.label}</span>
                <span className="text-xs text-gray-400">{a.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fitness Level */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-300 flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary-400" /> Fitness Level
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {FITNESS_LEVELS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, fitness_level: f.value as UserProfile['fitness_level'] }))}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  form.fitness_level === f.value
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="font-semibold text-sm text-white">{f.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Profile
            </>
          )}
        </button>
      </form>
    </div>
  );
}
