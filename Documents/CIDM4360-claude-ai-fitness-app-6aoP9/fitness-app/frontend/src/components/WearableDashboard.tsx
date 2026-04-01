import React, { useState, useEffect } from 'react';
import {
  Heart, Moon, Activity, Zap, Footprints, Wind,
  Watch, Plus, CheckCircle, RefreshCw, TrendingUp,
} from 'lucide-react';
import { logWearableData, getWearableData, dailyCheckin, getCheckins } from '../api/client';
import type { UserProfile, WearableData, DailyCheckin } from '../types';

interface Props {
  user: UserProfile;
}

const today = () => new Date().toISOString().split('T')[0];

function ScoreRing({ value, max = 100, color, size = 60 }: {
  value?: number; max?: number; color: string; size?: number;
}) {
  const pct = value != null ? Math.min((value / max) * 100, 100) : 0;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2937" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, unit, color, sub }: {
  icon: React.ElementType; label: string; value?: number | null;
  unit?: string; color: string; sub?: string;
}) {
  return (
    <div className="bg-gray-900 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}/20`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-white font-bold text-lg leading-tight">
          {value != null ? value : '—'}
          {value != null && unit && <span className="text-gray-400 text-sm font-normal ml-1">{unit}</span>}
        </p>
        {sub && <p className="text-xs text-gray-600">{sub}</p>}
      </div>
    </div>
  );
}

const EMOJI_SCALE = ['', '😩', '😕', '😐', '🙂', '😁'];

export default function WearableDashboard({ user }: Props) {
  const [wearable, setWearable] = useState<WearableData | null>(null);
  const [checkin, setCheckin] = useState<DailyCheckin | null>(null);
  const [history, setHistory] = useState<WearableData[]>([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState(0);

  // Log form state
  const [form, setForm] = useState({
    sleep_score: '', sleep_hours: '', hrv_ms: '', resting_heart_rate: '',
    recovery_score: '', spo2_pct: '', steps: '', active_calories: '',
    device_type: 'manual',
  });

  // Check-in form state
  const [ciForm, setCiForm] = useState({
    mood: 3, energy_level: 3, sleep_quality: 3, stress_level: 3, muscle_soreness: 1, notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [wData, cData] = await Promise.all([
        getWearableData(user.id, 7),
        getCheckins(user.id, 30),
      ]);
      if (wData?.length) {
        setHistory(wData);
        const todayEntry = wData.find(d => d.log_date === today());
        setWearable(todayEntry || null);
      }
      if (cData?.length) {
        const todayCI = cData.find(c => c.checkin_date === today());
        setCheckin(todayCI || null);
        if (cData[0]) setStreak(cData[0].streak_days || 0);
      }
    } catch { /* silently ignore */ }
  };

  const handleSaveWearable = async () => {
    setSaving(true);
    try {
      const payload: WearableData & { user_id: number } = {
        user_id: user.id,
        log_date: today(),
        device_type: form.device_type,
        ...(form.sleep_score && { sleep_score: Number(form.sleep_score) }),
        ...(form.sleep_hours && { sleep_hours: Number(form.sleep_hours) }),
        ...(form.hrv_ms && { hrv_ms: Number(form.hrv_ms) }),
        ...(form.resting_heart_rate && { resting_heart_rate: Number(form.resting_heart_rate) }),
        ...(form.recovery_score && { recovery_score: Number(form.recovery_score) }),
        ...(form.spo2_pct && { spo2_pct: Number(form.spo2_pct) }),
        ...(form.steps && { steps: Number(form.steps) }),
        ...(form.active_calories && { active_calories: Number(form.active_calories) }),
      };
      await logWearableData(payload);
      setShowLogForm(false);
      await loadData();
    } catch { /* silently ignore */ } finally {
      setSaving(false);
    }
  };

  const handleSaveCheckin = async () => {
    setSaving(true);
    try {
      const res = await dailyCheckin({ user_id: user.id, checkin_date: today(), ...ciForm });
      setStreak(res.streak_days || 1);
      setShowCheckinForm(false);
      await loadData();
    } catch { /* silently ignore */ } finally {
      setSaving(false);
    }
  };

  const num = (v?: number | null) => v ?? null;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <Watch className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Health Dashboard</h1>
            <p className="text-xs text-gray-400">Sleep · Recovery · Activity</p>
          </div>
        </div>
        {streak > 0 && (
          <div className="bg-orange-500/20 border border-orange-500/30 rounded-full px-3 py-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-orange-400 text-xs font-bold">{streak} day streak</span>
          </div>
        )}
      </div>

      {/* Today's Score Cards */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-300">Today's Scores</p>
          <button
            onClick={() => setShowLogForm(true)}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
          >
            <Plus className="w-3.5 h-3.5" /> Log Data
          </button>
        </div>
        <div className="flex justify-around">
          {[
            { label: 'Sleep', value: num(wearable?.sleep_score), color: '#818cf8' },
            { label: 'Recovery', value: num(wearable?.recovery_score), color: '#22c55e' },
            { label: 'Readiness', value: wearable ? Math.round(((wearable.sleep_score || 0) + (wearable.recovery_score || 0)) / 2) : null, color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className="relative">
                <ScoreRing value={value ?? 0} color={color} size={64} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{value ?? '—'}</span>
                </div>
              </div>
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Moon} label="Sleep" value={num(wearable?.sleep_hours)} unit="hrs" color="text-indigo-400" sub={wearable?.sleep_score ? `Score: ${wearable.sleep_score}` : undefined} />
        <StatCard icon={Heart} label="Resting HR" value={num(wearable?.resting_heart_rate)} unit="bpm" color="text-red-400" />
        <StatCard icon={Activity} label="HRV" value={num(wearable?.hrv_ms)} unit="ms" color="text-green-400" sub="Higher is better" />
        <StatCard icon={Wind} label="SpO2" value={num(wearable?.spo2_pct)} unit="%" color="text-blue-400" sub="Normal: 95–100%" />
        <StatCard icon={Footprints} label="Steps" value={num(wearable?.steps)} color="text-yellow-400" />
        <StatCard icon={Zap} label="Active Cal" value={num(wearable?.active_calories)} unit="kcal" color="text-orange-400" />
      </div>

      {/* Device Connect Placeholder */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <p className="text-sm font-semibold text-gray-300 mb-3">Connect a Device</p>
        <div className="grid grid-cols-2 gap-2">
          {['Apple Watch', 'Fitbit', 'Garmin', 'Oura Ring'].map(device => (
            <button
              key={device}
              className="py-2.5 px-3 bg-gray-800 border border-gray-700 rounded-xl text-xs text-gray-400 flex items-center gap-2 hover:border-purple-500/50 transition-colors"
            >
              <Watch className="w-3.5 h-3.5 text-purple-400" />
              {device}
              <span className="ml-auto text-gray-600 text-[10px]">Soon</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-600 mt-2 text-center">
          Until integrations are live, log manually above
        </p>
      </div>

      {/* Daily Check-in */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-300">Daily Check-in</p>
          {checkin ? (
            <div className="flex items-center gap-1 text-green-400 text-xs">
              <CheckCircle className="w-3.5 h-3.5" /> Done
            </div>
          ) : (
            <button
              onClick={() => setShowCheckinForm(true)}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Check In
            </button>
          )}
        </div>
        {checkin ? (
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'Mood', value: checkin.mood },
              { label: 'Energy', value: checkin.energy_level },
              { label: 'Sleep', value: checkin.sleep_quality },
              { label: 'Stress', value: checkin.stress_level },
              { label: 'Soreness', value: checkin.muscle_soreness },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-xl">{EMOJI_SCALE[value]}</p>
                <p className="text-[10px] text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-2">How are you feeling today?</p>
        )}
      </div>

      {/* 7-Day Trend (simple text) */}
      {history.length > 1 && (
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <p className="text-sm font-semibold text-gray-300">7-Day Trend</p>
          </div>
          <div className="space-y-2">
            {history.slice(0, 5).map((d) => (
              <div key={d.log_date} className="flex items-center gap-3 text-xs">
                <span className="text-gray-500 w-20 shrink-0">{d.log_date?.slice(5)}</span>
                <div className="flex gap-3 flex-wrap">
                  {d.sleep_score != null && <span className="text-indigo-400">Sleep: {d.sleep_score}</span>}
                  {d.recovery_score != null && <span className="text-green-400">Recovery: {d.recovery_score}</span>}
                  {d.steps != null && <span className="text-yellow-400">{d.steps.toLocaleString()} steps</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log Wearable Modal */}
      {showLogForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-4">
          <div className="bg-gray-900 rounded-3xl w-full max-w-lg p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Log Health Data</h3>
              <button onClick={() => setShowLogForm(false)} className="text-gray-500 hover:text-white text-sm">Cancel</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'sleep_score', label: 'Sleep Score', placeholder: '0–100' },
                { key: 'sleep_hours', label: 'Sleep Hours', placeholder: 'e.g. 7.5' },
                { key: 'recovery_score', label: 'Recovery Score', placeholder: '0–100' },
                { key: 'resting_heart_rate', label: 'Resting HR (bpm)', placeholder: 'e.g. 62' },
                { key: 'hrv_ms', label: 'HRV (ms)', placeholder: 'e.g. 45' },
                { key: 'spo2_pct', label: 'SpO2 (%)', placeholder: 'e.g. 98' },
                { key: 'steps', label: 'Steps', placeholder: 'e.g. 8000' },
                { key: 'active_calories', label: 'Active Calories', placeholder: 'e.g. 350' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                  <input
                    type="number"
                    placeholder={placeholder}
                    value={form[key as keyof typeof form] as string}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Device</label>
              <select
                value={form.device_type}
                onChange={e => setForm(f => ({ ...f, device_type: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
              >
                {['manual', 'apple_watch', 'fitbit', 'garmin', 'oura'].map(d => (
                  <option key={d} value={d}>{d.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSaveWearable}
              disabled={saving}
              className="w-full py-3 bg-purple-500 hover:bg-purple-400 disabled:bg-gray-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Check-in Modal */}
      {showCheckinForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-4">
          <div className="bg-gray-900 rounded-3xl w-full max-w-lg p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Daily Check-in</h3>
              <button onClick={() => setShowCheckinForm(false)} className="text-gray-500 hover:text-white text-sm">Cancel</button>
            </div>

            {[
              { key: 'mood', label: 'Mood' },
              { key: 'energy_level', label: 'Energy Level' },
              { key: 'sleep_quality', label: 'Sleep Quality' },
              { key: 'stress_level', label: 'Stress Level' },
              { key: 'muscle_soreness', label: 'Muscle Soreness' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-300">{label}</label>
                  <span className="text-xl">{EMOJI_SCALE[ciForm[key as keyof typeof ciForm] as number]}</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button
                      key={v}
                      onClick={() => setCiForm(f => ({ ...f, [key]: v }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                        ciForm[key as keyof typeof ciForm] === v
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-800 text-gray-500 hover:text-white'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <textarea
              placeholder="Any notes? (optional)"
              value={ciForm.notes}
              onChange={e => setCiForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none"
            />

            <button
              onClick={handleSaveCheckin}
              disabled={saving}
              className="w-full py-3 bg-purple-500 hover:bg-purple-400 disabled:bg-gray-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Submit Check-in
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
