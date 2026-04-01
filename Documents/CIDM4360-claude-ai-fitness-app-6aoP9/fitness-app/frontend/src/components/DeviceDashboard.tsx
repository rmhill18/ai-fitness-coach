import React, { useState, useEffect } from 'react';
import {
  Heart, Activity, Moon, Zap, Footprints, Flame,
  Wind, Brain, Clock, TrendingUp, TrendingDown,
  Minus, ChevronDown, ChevronUp, Loader2, CheckCircle2,
  Link, AlertCircle, Sparkles, Watch, RefreshCw
} from 'lucide-react';
import type { UserProfile } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

interface DeviceDataEntry {
  id: number;
  log_date: string;
  device_type: string;
  sleep_score: number | null;
  sleep_hours: number | null;
  sleep_stages: string;
  hrv_ms: number | null;
  resting_hr: number | null;
  steps: number | null;
  active_calories: number | null;
  total_calories: number | null;
  active_minutes: number | null;
  recovery_score: number | null;
  readiness_score: number | null;
  spo2_pct: number | null;
  stress_score: number | null;
}

interface SleepStages {
  deep: number;
  light: number;
  rem: number;
  awake: number;
}

interface ManualFormState {
  sleep_hours: string;
  sleep_quality: number;
  hrv_ms: string;
  resting_hr: string;
  steps: string;
  recovery_score: string;
  readiness_score: string;
  spo2_pct: string;
  active_calories: string;
  active_minutes: string;
  stress_score: string;
}

interface Props {
  user: UserProfile;
}

// ── Device definitions ───────────────────────────────────────────────────────

const DEVICES = [
  { id: 'fitbit',      label: 'Fitbit',       emoji: '⌚', available: false },
  { id: 'apple_watch', label: 'Apple Watch',  emoji: '🍎', available: false },
  { id: 'garmin',      label: 'Garmin',       emoji: '🧭', available: false },
  { id: 'oura',        label: 'Oura Ring',    emoji: '💍', available: false },
  { id: 'whoop',       label: 'WHOOP',        emoji: '📿', available: false },
  { id: 'manual',      label: 'Manual Entry', emoji: '✏️', available: true  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(val: number | null): string {
  if (val === null) return 'text-gray-500';
  if (val >= 80) return 'text-green-400';
  if (val >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

function scoreBg(val: number | null): string {
  if (val === null) return 'bg-gray-700';
  if (val >= 80) return 'bg-green-500';
  if (val >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

function parseSleepStages(raw: string | null | undefined): SleepStages | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      'deep' in parsed && 'light' in parsed &&
      'rem' in parsed && 'awake' in parsed
    ) return parsed as SleepStages;
  } catch {
    // ignore
  }
  return null;
}

function trendIcon(vals: (number | null)[]): React.ReactNode {
  const defined = vals.filter((v): v is number => v !== null);
  if (defined.length < 2) return <Minus size={14} className="text-gray-500" />;
  const first = defined[0];
  const last = defined[defined.length - 1];
  if (last > first * 1.03) return <TrendingUp size={14} className="text-green-400" />;
  if (last < first * 0.97) return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-gray-400" />;
}

const STEP_GOAL = 10000;

// ── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  icon, label, value, unit, children, className = '',
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  unit?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-gray-800 rounded-xl p-4 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold text-white leading-none">{value ?? '–'}</span>
        {unit && <span className="text-sm text-gray-400 mb-0.5">{unit}</span>}
      </div>
      {children}
    </div>
  );
}

function ScoreRing({ score, size = 64 }: { score: number | null; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score !== null ? Math.min(score / 100, 1) : 0;
  const colorMap =
    score === null ? '#4b5563'
    : score >= 80 ? '#22c55e'
    : score >= 60 ? '#eab308'
    : '#ef4444';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2937" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={colorMap} strokeWidth={8}
          strokeDasharray={`${pct * circ} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${scoreColor(score)}`}>{score ?? '–'}</span>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function DeviceDashboard({ user }: Props) {
  const today = new Date().toISOString().split('T')[0];

  // ─ State ──────────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<DeviceDataEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [connectedDevices, setConnectedDevices] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`connected_devices_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const defaultForm: ManualFormState = {
    sleep_hours: '',
    sleep_quality: 7,
    hrv_ms: '',
    resting_hr: '',
    steps: '',
    recovery_score: '',
    readiness_score: '',
    spo2_pct: '',
    active_calories: '',
    active_minutes: '',
    stress_score: '',
  };
  const [form, setForm] = useState<ManualFormState>(defaultForm);

  // ─ Data fetching ──────────────────────────────────────────────────────────
  const loadData = () => {
    setLoading(true);
    fetch(`/api/device-data/${user.id}?days=7`)
      .then(r => r.ok ? r.json() : [])
      .then((data: DeviceDataEntry[]) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [user.id]);

  // ─ Derived: today's entry ─────────────────────────────────────────────────
  const todayEntry = history.find(e => e.log_date === today) ?? null;
  const sleepStages = parseSleepStages(todayEntry?.sleep_stages);

  // ─ 7-day trend arrays ─────────────────────────────────────────────────────
  const sorted = [...history].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const trends = {
    hrv:       sorted.map(e => e.hrv_ms),
    rhr:       sorted.map(e => e.resting_hr),
    sleep:     sorted.map(e => e.sleep_score),
    recovery:  sorted.map(e => e.recovery_score),
    steps:     sorted.map(e => e.steps),
    readiness: sorted.map(e => e.readiness_score),
  };

  // ─ Device connect (localStorage only) ────────────────────────────────────
  const toggleDevice = (deviceId: string) => {
    const next = connectedDevices.includes(deviceId)
      ? connectedDevices.filter(d => d !== deviceId)
      : [...connectedDevices, deviceId];
    setConnectedDevices(next);
    localStorage.setItem(`connected_devices_${user.id}`, JSON.stringify(next));
    if (deviceId === 'manual' && !connectedDevices.includes('manual')) {
      setFormOpen(true);
    }
  };

  // ─ Manual entry submit ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    const payload = {
      user_id: user.id,
      log_date: today,
      device_type: 'manual',
      sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : null,
      sleep_score: Math.round(form.sleep_quality * 10),
      hrv_ms: form.hrv_ms ? Number(form.hrv_ms) : null,
      resting_hr: form.resting_hr ? Number(form.resting_hr) : null,
      steps: form.steps ? Number(form.steps) : null,
      recovery_score: form.recovery_score ? Number(form.recovery_score) : null,
      readiness_score: form.readiness_score ? Number(form.readiness_score) : null,
      spo2_pct: form.spo2_pct ? Number(form.spo2_pct) : null,
      active_calories: form.active_calories ? Number(form.active_calories) : null,
      active_minutes: form.active_minutes ? Number(form.active_minutes) : null,
      stress_score: form.stress_score ? Number(form.stress_score) : null,
    };

    try {
      const res = await fetch('/api/device-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setSubmitSuccess(true);
      setForm(defaultForm);
      loadData();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ─ AI Insights ────────────────────────────────────────────────────────────
  const generateInsights = (): string[] => {
    if (!todayEntry) return ['Log today\'s metrics to unlock AI insights.'];
    const insights: string[] = [];
    const { hrv_ms, resting_hr, recovery_score, readiness_score, sleep_score, sleep_hours, steps, stress_score } = todayEntry;

    if (recovery_score !== null) {
      if (recovery_score >= 80) insights.push('Great recovery score! Your body is primed — today is a good day for intense training.');
      else if (recovery_score >= 60) insights.push('Moderate recovery. Stick to moderate-intensity workouts and prioritize hydration.');
      else insights.push('Low recovery score. Consider active recovery, stretching, or rest today.');
    }
    if (hrv_ms !== null) {
      if (hrv_ms < 40) insights.push('HRV is below average — your nervous system may be under stress. A lighter workout is recommended.');
      else if (hrv_ms >= 60) insights.push('Excellent HRV! High heart rate variability signals strong cardiovascular readiness.');
    }
    if (sleep_score !== null && sleep_score < 60) {
      insights.push('Poor sleep score detected. Avoid caffeine after 2 PM and aim for 7–9 hours tonight.');
    }
    if (sleep_hours !== null && sleep_hours < 6) {
      insights.push(`Only ${sleep_hours}h of sleep logged. Sleep deprivation impairs muscle recovery and decision-making.`);
    }
    if (readiness_score !== null && readiness_score >= 85) {
      insights.push('High readiness score — your body is ready to perform. Push for a personal best today!');
    }
    if (steps !== null && steps < 5000) {
      insights.push('Step count is low. Even a 20-minute walk adds 2,000+ steps and boosts mood.');
    }
    if (resting_hr !== null && resting_hr > 80) {
      insights.push('Elevated resting heart rate may indicate fatigue or dehydration. Drink more water today.');
    }
    if (stress_score !== null && stress_score > 70) {
      insights.push('High stress score. Try 5 minutes of box breathing or a short mindfulness session.');
    }
    if (insights.length === 0) {
      insights.push('All metrics look balanced. Keep up the consistent effort — consistency beats intensity!');
    }
    return insights;
  };

  const insights = generateInsights();

  // ─ Sleep stage bar ────────────────────────────────────────────────────────
  const renderSleepBar = () => {
    if (!sleepStages) return null;
    const total = sleepStages.deep + sleepStages.light + sleepStages.rem + sleepStages.awake;
    if (total === 0) return null;
    const pct = (v: number) => ((v / total) * 100).toFixed(1);
    const stages = [
      { label: 'Deep', key: 'deep' as const, color: 'bg-blue-600', textColor: 'text-blue-400' },
      { label: 'Light', key: 'light' as const, color: 'bg-blue-400', textColor: 'text-blue-300' },
      { label: 'REM', key: 'rem' as const, color: 'bg-purple-500', textColor: 'text-purple-400' },
      { label: 'Awake', key: 'awake' as const, color: 'bg-gray-500', textColor: 'text-gray-400' },
    ];
    return (
      <div className="space-y-3">
        <div className="flex rounded-full overflow-hidden h-5">
          {stages.map(s => (
            <div
              key={s.key}
              className={`${s.color} transition-all`}
              style={{ width: `${pct(sleepStages[s.key])}%` }}
              title={`${s.label}: ${pct(sleepStages[s.key])}%`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {stages.map(s => (
            <div key={s.key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
              <span className="text-xs text-gray-400">
                {s.label} <span className={`font-semibold ${s.textColor}`}>{pct(sleepStages[s.key])}%</span>
                <span className="text-gray-600 ml-1">({sleepStages[s.key]}m)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─ Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Watch size={22} className="text-green-400" />
              Device Dashboard
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Wearable data & today's biometrics for {user.name}
            </p>
          </div>
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── 1. Device Connection Section ──────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Connected Devices
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DEVICES.map(device => {
              const isConnected = connectedDevices.includes(device.id);
              return (
                <div
                  key={device.id}
                  className={`relative rounded-xl p-4 border transition-all ${
                    device.available
                      ? isConnected
                        ? 'bg-green-950 border-green-700'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                      : 'bg-gray-900 border-gray-800 opacity-60'
                  }`}
                >
                  {!device.available && (
                    <span className="absolute top-2 right-2 text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full font-medium">
                      Soon
                    </span>
                  )}
                  <div className="text-2xl mb-2">{device.emoji}</div>
                  <p className="text-sm font-semibold text-white">{device.label}</p>
                  {device.available ? (
                    <button
                      onClick={() => toggleDevice(device.id)}
                      className={`mt-2 text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                        isConnected
                          ? 'bg-green-700 text-green-100 hover:bg-green-800'
                          : 'bg-green-600 text-white hover:bg-green-500'
                      }`}
                    >
                      {isConnected ? (
                        <span className="flex items-center gap-1"><CheckCircle2 size={11} /> Connected</span>
                      ) : (
                        <span className="flex items-center gap-1"><Link size={11} /> Connect</span>
                      )}
                    </button>
                  ) : (
                    <p className="mt-1 text-[11px] text-gray-500 leading-tight">
                      OAuth integration coming soon
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <AlertCircle size={12} />
            Real device sync requires OAuth — manual entry is fully supported today.
          </p>
        </section>

        {/* ── 2. Today's Metrics ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Today's Metrics — {today}
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 size={28} className="animate-spin mr-3" />
              Loading device data…
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">

              {/* Sleep Score */}
              <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-2 col-span-1">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide">
                  <Moon size={14} className="text-blue-400" />
                  <span>Sleep Score</span>
                </div>
                <div className="flex items-center gap-3">
                  <ScoreRing score={todayEntry?.sleep_score ?? null} />
                  <div>
                    <p className={`text-xs font-semibold ${scoreColor(todayEntry?.sleep_score ?? null)}`}>
                      {todayEntry?.sleep_score !== null && todayEntry?.sleep_score !== undefined
                        ? todayEntry.sleep_score >= 80 ? 'Excellent'
                          : todayEntry.sleep_score >= 60 ? 'Fair'
                          : 'Poor'
                        : 'No data'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sleep Hours */}
              <MetricCard
                icon={<Clock size={14} className="text-blue-300" />}
                label="Sleep Hours"
                value={todayEntry?.sleep_hours?.toFixed(1) ?? null}
                unit="hrs"
              />

              {/* Recovery Score */}
              <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide">
                  <Zap size={14} className="text-yellow-400" />
                  <span>Recovery</span>
                </div>
                <div className="flex items-center gap-3">
                  <ScoreRing score={todayEntry?.recovery_score ?? null} />
                </div>
              </div>

              {/* Readiness Score */}
              <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide">
                  <Activity size={14} className="text-green-400" />
                  <span>Readiness</span>
                </div>
                <div className="flex items-center gap-3">
                  <ScoreRing score={todayEntry?.readiness_score ?? null} />
                </div>
              </div>

              {/* Resting HR */}
              <MetricCard
                icon={<Heart size={14} className="text-red-400" />}
                label="Resting HR"
                value={todayEntry?.resting_hr ?? null}
                unit="bpm"
              />

              {/* HRV */}
              <MetricCard
                icon={<Activity size={14} className="text-purple-400" />}
                label="HRV"
                value={todayEntry?.hrv_ms ?? null}
                unit="ms"
              />

              {/* Steps */}
              <MetricCard
                icon={<Footprints size={14} className="text-green-400" />}
                label="Steps"
                value={todayEntry?.steps?.toLocaleString() ?? null}
                className="col-span-2 sm:col-span-1"
              >
                {todayEntry?.steps !== null && todayEntry?.steps !== undefined && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{Math.round(((todayEntry.steps ?? 0) / STEP_GOAL) * 100)}% of {STEP_GOAL.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(((todayEntry.steps ?? 0) / STEP_GOAL) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </MetricCard>

              {/* Active Calories */}
              <MetricCard
                icon={<Flame size={14} className="text-orange-400" />}
                label="Active Cal"
                value={todayEntry?.active_calories ?? null}
                unit="kcal"
              />

              {/* Active Minutes */}
              <MetricCard
                icon={<Clock size={14} className="text-cyan-400" />}
                label="Active Min"
                value={todayEntry?.active_minutes ?? null}
                unit="min"
              />

              {/* SpO2 */}
              <MetricCard
                icon={<Wind size={14} className="text-sky-400" />}
                label="SpO2"
                value={todayEntry?.spo2_pct ?? null}
                unit="%"
              />

              {/* Stress Score */}
              <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide">
                  <Brain size={14} className="text-pink-400" />
                  <span>Stress</span>
                </div>
                <div className="flex items-end gap-1">
                  <span className={`text-2xl font-bold leading-none ${
                    todayEntry?.stress_score === null || todayEntry?.stress_score === undefined
                      ? 'text-gray-500'
                      : todayEntry.stress_score > 70 ? 'text-red-400'
                      : todayEntry.stress_score > 40 ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}>
                    {todayEntry?.stress_score ?? '–'}
                  </span>
                  <span className="text-sm text-gray-400 mb-0.5">/100</span>
                </div>
                {todayEntry?.stress_score !== null && todayEntry?.stress_score !== undefined && (
                  <p className="text-xs text-gray-500">
                    {todayEntry.stress_score > 70 ? 'High' : todayEntry.stress_score > 40 ? 'Moderate' : 'Low'}
                  </p>
                )}
              </div>

            </div>
          )}
        </section>

        {/* ── 3. Sleep Breakdown ────────────────────────────────────────────── */}
        {sleepStages && (
          <section className="bg-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Moon size={14} className="text-blue-400" />
              Sleep Stage Breakdown
            </h2>
            {renderSleepBar()}
          </section>
        )}

        {/* ── 4. 7-Day Trends ───────────────────────────────────────────────── */}
        {history.length > 1 && (
          <section className="bg-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-green-400" />
              7-Day Trends
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'HRV', data: trends.hrv, unit: 'ms', icon: <Activity size={13} className="text-purple-400" /> },
                { label: 'Resting HR', data: trends.rhr, unit: 'bpm', icon: <Heart size={13} className="text-red-400" /> },
                { label: 'Sleep Score', data: trends.sleep, unit: '', icon: <Moon size={13} className="text-blue-400" /> },
                { label: 'Recovery', data: trends.recovery, unit: '', icon: <Zap size={13} className="text-yellow-400" /> },
                { label: 'Steps', data: trends.steps, unit: '', icon: <Footprints size={13} className="text-green-400" /> },
                { label: 'Readiness', data: trends.readiness, unit: '', icon: <Activity size={13} className="text-cyan-400" /> },
              ].map(t => {
                const latest = t.data.filter((v): v is number => v !== null).at(-1);
                return (
                  <div key={t.label} className="bg-gray-700 rounded-lg px-3 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {t.icon}
                      <span className="text-xs text-gray-300">{t.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white">
                        {latest !== undefined ? `${latest.toLocaleString()}${t.unit}` : '–'}
                      </span>
                      {trendIcon(t.data)}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-gray-600">
              Arrows show direction vs. earliest logged entry in the past 7 days. &gt;3% change = trend.
            </p>
          </section>
        )}

        {/* ── 5. Manual Entry Form ──────────────────────────────────────────── */}
        <section className="bg-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setFormOpen(prev => !prev)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-750 transition-colors"
          >
            <span className="font-semibold text-white flex items-center gap-2">
              ✏️ Manual Entry
              <span className="text-xs text-gray-400 font-normal">— Log today's metrics</span>
            </span>
            {formOpen
              ? <ChevronUp size={18} className="text-gray-400" />
              : <ChevronDown size={18} className="text-gray-400" />
            }
          </button>

          {formOpen && (
            <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-5 border-t border-gray-700">
              <p className="pt-4 text-xs text-gray-500">
                Enter what you know — blank fields are skipped. All values are saved for {today}.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

                {/* Sleep Hours */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sleep Hours</label>
                  <input
                    type="number" step="0.1" min="0" max="24"
                    placeholder="e.g. 7.5"
                    value={form.sleep_hours}
                    onChange={e => setForm(f => ({ ...f, sleep_hours: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>

                {/* HRV */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">HRV (ms)</label>
                  <input
                    type="number" min="0" max="300"
                    placeholder="e.g. 55"
                    value={form.hrv_ms}
                    onChange={e => setForm(f => ({ ...f, hrv_ms: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>

                {/* Resting HR */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Resting HR (bpm)</label>
                  <input
                    type="number" min="30" max="200"
                    placeholder="e.g. 60"
                    value={form.resting_hr}
                    onChange={e => setForm(f => ({ ...f, resting_hr: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>

                {/* Steps */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Steps</label>
                  <input
                    type="number" min="0" max="100000"
                    placeholder="e.g. 8500"
                    value={form.steps}
                    onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>

                {/* Recovery Score */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Recovery Score (0–100)</label>
                  <input
                    type="number" min="0" max="100"
                    placeholder="e.g. 75"
                    value={form.recovery_score}
                    onChange={e => setForm(f => ({ ...f, recovery_score: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>

                {/* Readiness Score */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Readiness Score (0–100)</label>
                  <input
                    type="number" min="0" max="100"
                    placeholder="e.g. 80"
                    value={form.readiness_score}
                    onChange={e => setForm(f => ({ ...f, readiness_score: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>

                {/* SpO2 */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">SpO2 (%)</label>
                  <input
                    type="number" step="0.1" min="80" max="100"
                    placeholder="e.g. 97"
                    value={form.spo2_pct}
                    onChange={e => setForm(f => ({ ...f, spo2_pct: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>

                {/* Active Calories */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Active Calories</label>
                  <input
                    type="number" min="0" max="5000"
                    placeholder="e.g. 450"
                    value={form.active_calories}
                    onChange={e => setForm(f => ({ ...f, active_calories: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>

                {/* Active Minutes */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Active Minutes</label>
                  <input
                    type="number" min="0" max="1440"
                    placeholder="e.g. 45"
                    value={form.active_minutes}
                    onChange={e => setForm(f => ({ ...f, active_minutes: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>

                {/* Stress Score */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Stress Score (0–100)</label>
                  <input
                    type="number" min="0" max="100"
                    placeholder="e.g. 35"
                    value={form.stress_score}
                    onChange={e => setForm(f => ({ ...f, stress_score: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              {/* Sleep Quality Slider */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  Sleep Quality: <span className="text-white font-semibold">{form.sleep_quality}/10</span>
                  <span className="text-gray-500 ml-2">(→ Sleep Score: {form.sleep_quality * 10})</span>
                </label>
                <input
                  type="range" min="1" max="10" step="1"
                  value={form.sleep_quality}
                  onChange={e => setForm(f => ({ ...f, sleep_quality: Number(e.target.value) }))}
                  className="w-full accent-green-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                  <span>1 – Terrible</span>
                  <span>5 – OK</span>
                  <span>10 – Perfect</span>
                </div>
              </div>

              {/* Feedback messages */}
              {submitSuccess && (
                <div className="flex items-center gap-2 bg-green-950 border border-green-700 rounded-lg px-4 py-2.5 text-green-400 text-sm">
                  <CheckCircle2 size={16} /> Metrics saved successfully!
                </div>
              )}
              {submitError && (
                <div className="flex items-center gap-2 bg-red-950 border border-red-700 rounded-lg px-4 py-2.5 text-red-400 text-sm">
                  <AlertCircle size={16} /> {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving…</>
                ) : (
                  <>Save Today's Metrics</>
                )}
              </button>
            </form>
          )}
        </section>

        {/* ── 6. AI Insights ────────────────────────────────────────────────── */}
        <section className="bg-gray-900 border border-green-900 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Sparkles size={14} />
            AI Insights
          </h2>
          <ul className="space-y-3">
            {insights.map((insight, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-300 leading-relaxed">
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-green-900 text-green-400 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                {insight}
              </li>
            ))}
          </ul>
          {!todayEntry && (
            <p className="mt-3 text-xs text-gray-600">
              Use the Manual Entry form above to log today's metrics and receive personalized insights.
            </p>
          )}
        </section>

      </div>
    </div>
  );
}
