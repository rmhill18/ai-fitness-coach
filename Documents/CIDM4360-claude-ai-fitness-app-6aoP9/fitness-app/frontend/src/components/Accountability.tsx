import React, { useState, useEffect } from 'react';
import {
  Flame, Bell, BellOff, CheckCircle2, ChevronDown, ChevronUp,
  Pencil, Calendar, TrendingUp, Zap, Droplets, Utensils, Dumbbell
} from 'lucide-react';

interface CheckInEntry {
  id: number;
  checkin_date: string;
  mood: number;
  energy_level: number;
  stress_level: number;
  logged_meals: boolean;
  completed_workout: boolean;
  hit_water_goal: boolean;
  notes: string;
}

interface NotificationSettings {
  meal_reminders: boolean;
  workout_reminders: boolean;
  checkin_reminders: boolean;
  water_reminders: boolean;
  morning_checkin_time: string;
  workout_reminder_time: string;
  meal_reminder_times: string;
  push_endpoint: string;
  push_keys: string;
}

interface Props {
  user: { id: number; name: string; goal: string };
}

const MOODS = ['😫', '😕', '😐', '🙂', '😄'];

function moodEmoji(mood: number) {
  return MOODS[Math.max(0, Math.min(4, mood - 1))];
}

function sliderColor(value: number, max = 10) {
  const pct = value / max;
  if (pct <= 0.33) return '#ef4444';
  if (pct <= 0.66) return '#eab308';
  return '#22c55e';
}

function accountabilityMessage(streak: number): string {
  if (streak === 0) return "Start your streak today!";
  if (streak <= 3) return "Great start! Keep the momentum going.";
  if (streak < 7) return `${streak} days in a row — you're on a roll!`;
  if (streak < 30) return "One week strong! You're building real habits.";
  return "30+ days! You're unstoppable.";
}

export default function Accountability({ user }: Props) {
  const today = new Date().toISOString().split('T')[0];

  // Data state
  const [streak, setStreak] = useState(0);
  const [checkins, setCheckins] = useState<CheckInEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Check-in form state
  const [mood, setMood] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [stressLevel, setStressLevel] = useState(5);
  const [loggedMeals, setLoggedMeals] = useState(false);
  const [completedWorkout, setCompletedWorkout] = useState(false);
  const [hitWaterGoal, setHitWaterGoal] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingCheckin, setEditingCheckin] = useState(false);

  // Notification settings state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    meal_reminders: false,
    workout_reminders: false,
    checkin_reminders: false,
    water_reminders: false,
    morning_checkin_time: '07:00',
    workout_reminder_time: '17:00',
    meal_reminder_times: '08:00,12:00,18:00',
    push_endpoint: '',
    push_keys: '',
  });
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [savingNotif, setSavingNotif] = useState(false);

  // Derived
  const todayCheckin = checkins.find(c => c.checkin_date === today);
  const checkedInToday = !!todayCheckin && !editingCheckin;

  // Load data on mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/checkin/${user.id}?days=30`).then(r => r.json()),
      fetch(`/api/notifications/${user.id}`).then(r => r.json()).catch(() => null),
    ]).then(([checkinData, notifData]) => {
      if (checkinData?.streak !== undefined) setStreak(checkinData.streak);
      if (checkinData?.checkins) setCheckins(checkinData.checkins);
      if (notifData) setNotifSettings(prev => ({ ...prev, ...notifData }));
    }).finally(() => setLoading(false));

    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, [user.id]);

  // Pre-fill form if editing today's check-in
  useEffect(() => {
    if (editingCheckin && todayCheckin) {
      setMood(todayCheckin.mood);
      setEnergyLevel(todayCheckin.energy_level);
      setStressLevel(todayCheckin.stress_level);
      setLoggedMeals(todayCheckin.logged_meals);
      setCompletedWorkout(todayCheckin.completed_workout);
      setHitWaterGoal(todayCheckin.hit_water_goal);
      setNotes(todayCheckin.notes ?? '');
    }
  }, [editingCheckin]);

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          mood,
          energy_level: energyLevel,
          stress_level: stressLevel,
          logged_meals: loggedMeals,
          completed_workout: completedWorkout,
          hit_water_goal: hitWaterGoal,
          notes,
        }),
      });
      if (res.ok) {
        const newEntry = await res.json();
        setCheckins(prev => {
          const filtered = prev.filter(c => c.checkin_date !== today);
          return [...filtered, newEntry];
        });
        setStreak(prev => editingCheckin ? prev : prev + 1);
        setEditingCheckin(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestNotifPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  };

  const handleSaveNotifications = async () => {
    setSavingNotif(true);
    try {
      await fetch(`/api/notifications/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifSettings),
      });
    } finally {
      setSavingNotif(false);
    }
  };

  // Weekly summary calculations
  const getWeekCheckins = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    return checkins.filter(c => c.checkin_date >= weekAgoStr);
  };
  const weekCheckins = getWeekCheckins();
  const avgMood = weekCheckins.length
    ? weekCheckins.reduce((s, c) => s + c.mood, 0) / weekCheckins.length
    : 0;
  const avgEnergy = weekCheckins.length
    ? weekCheckins.reduce((s, c) => s + c.energy_level, 0) / weekCheckins.length
    : 0;
  const workoutsCompleted = weekCheckins.filter(c => c.completed_workout).length;

  // 30-day calendar
  const calendarDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });
  const checkinDates = new Set(checkins.map(c => c.checkin_date));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 fade-in">
      <div>
        <h1 className="text-2xl font-black text-white">Accountability</h1>
        <p className="text-gray-400 text-sm mt-0.5">Track your habits and stay consistent</p>
      </div>

      {/* ── 1. Streak Counter ── */}
      <div className="card bg-gradient-to-br from-orange-500/20 to-gray-900 border-orange-500/30 text-center py-8">
        <Flame className="w-10 h-10 text-orange-400 mx-auto mb-2" />
        {streak > 0 ? (
          <>
            <p className="text-6xl font-black text-white leading-none">{streak}</p>
            <p className="text-orange-300 font-semibold mt-1 text-lg">day streak</p>
            <p className="text-gray-400 text-sm mt-2">{accountabilityMessage(streak)}</p>
          </>
        ) : (
          <>
            <p className="text-3xl font-black text-gray-300">No streak yet</p>
            <p className="text-orange-300 font-semibold mt-2">{accountabilityMessage(0)}</p>
            <p className="text-gray-500 text-sm mt-1">Check in below to light your flame 🔥</p>
          </>
        )}
      </div>

      {/* ── 2. Today's Check-In Form ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary-400" /> Today's Check-In
          </p>
          {checkedInToday && (
            <button
              onClick={() => setEditingCheckin(true)}
              className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          )}
        </div>

        {checkedInToday ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-green-500/10 rounded-xl p-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-300 font-semibold text-sm">You checked in today!</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-800 rounded-xl p-2 text-center">
                <p className="text-2xl">{moodEmoji(todayCheckin!.mood)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Mood</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-2 text-center">
                <p className="text-lg font-bold text-yellow-400">{todayCheckin!.energy_level}<span className="text-xs text-gray-400">/10</span></p>
                <p className="text-xs text-gray-400 mt-0.5">Energy</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-2 text-center">
                <p className="text-lg font-bold text-blue-400">{todayCheckin!.stress_level}<span className="text-xs text-gray-400">/10</span></p>
                <p className="text-xs text-gray-400 mt-0.5">Stress</p>
              </div>
            </div>
            <div className="flex gap-2">
              {todayCheckin!.logged_meals && (
                <span className="flex items-center gap-1 text-xs bg-orange-500/20 text-orange-300 rounded-full px-2 py-1">
                  <Utensils className="w-3 h-3" /> Meals logged
                </span>
              )}
              {todayCheckin!.completed_workout && (
                <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-300 rounded-full px-2 py-1">
                  <Dumbbell className="w-3 h-3" /> Workout done
                </span>
              )}
              {todayCheckin!.hit_water_goal && (
                <span className="flex items-center gap-1 text-xs bg-cyan-500/20 text-cyan-300 rounded-full px-2 py-1">
                  <Droplets className="w-3 h-3" /> Water goal
                </span>
              )}
            </div>
            {todayCheckin!.notes && (
              <p className="text-sm text-gray-400 italic">"{todayCheckin!.notes}"</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleCheckinSubmit} className="space-y-4">
            {/* Mood selector */}
            <div>
              <p className="text-xs text-gray-400 mb-2">How are you feeling?</p>
              <div className="flex gap-2 justify-between">
                {MOODS.map((emoji, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMood(i + 1)}
                    className={`flex-1 text-2xl py-2 rounded-xl border-2 transition-all ${
                      mood === i + 1
                        ? 'border-primary-500 bg-primary-500/20 scale-110'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy level slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-gray-400">Energy Level</p>
                <span className="text-sm font-bold" style={{ color: sliderColor(energyLevel) }}>
                  {energyLevel}/10
                </span>
              </div>
              <input
                type="range" min={1} max={10} value={energyLevel}
                onChange={e => setEnergyLevel(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: sliderColor(energyLevel) }}
              />
            </div>

            {/* Stress level slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-gray-400">Stress Level</p>
                <span className="text-sm font-bold" style={{ color: sliderColor(stressLevel) }}>
                  {stressLevel}/10
                </span>
              </div>
              <input
                type="range" min={1} max={10} value={stressLevel}
                onChange={e => setStressLevel(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: sliderColor(stressLevel) }}
              />
            </div>

            {/* Toggle buttons */}
            <div className="flex gap-2">
              {[
                { label: 'Logged Meals', value: loggedMeals, setter: setLoggedMeals, icon: <Utensils className="w-3.5 h-3.5" />, color: 'orange' },
                { label: 'Workout Done', value: completedWorkout, setter: setCompletedWorkout, icon: <Dumbbell className="w-3.5 h-3.5" />, color: 'green' },
                { label: 'Water Goal', value: hitWaterGoal, setter: setHitWaterGoal, icon: <Droplets className="w-3.5 h-3.5" />, color: 'cyan' },
              ].map(({ label, value, setter, icon, color }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setter(!value)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 text-xs font-medium transition-all ${
                    value
                      ? color === 'orange' ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                        : color === 'green' ? 'border-green-500 bg-green-500/20 text-green-300'
                        : 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                      : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {icon}
                  <span className="leading-tight text-center">{label}</span>
                </button>
              ))}
            </div>

            {/* Notes */}
            <textarea
              className="input w-full resize-none text-sm"
              rows={2}
              placeholder="Optional notes (how was your day?)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />

            <div className="flex gap-2">
              {editingCheckin && (
                <button
                  type="button"
                  onClick={() => setEditingCheckin(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-700 text-gray-300 font-semibold text-sm hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 btn-primary py-2.5 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Submit Check-In'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── 3. Notification Settings ── */}
      <div className="card">
        <button
          type="button"
          onClick={() => setNotifOpen(o => !o)}
          className="w-full flex items-center justify-between"
        >
          <p className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary-400" /> Notification Settings
          </p>
          {notifOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {notifOpen && (
          <div className="mt-4 space-y-4">
            {/* Permission status */}
            <div className="flex items-center justify-between bg-gray-800 rounded-xl p-3">
              <div>
                <p className="text-xs text-gray-400">Push notification permission</p>
                <p className={`text-sm font-semibold capitalize ${
                  notifPermission === 'granted' ? 'text-green-400'
                  : notifPermission === 'denied' ? 'text-red-400'
                  : 'text-yellow-400'
                }`}>
                  {notifPermission === 'granted' ? '✓ Granted'
                    : notifPermission === 'denied' ? '✗ Denied'
                    : '? Not set'}
                </p>
              </div>
              {notifPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleRequestNotifPermission}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Enable Push
                </button>
              )}
            </div>

            {/* Toggles */}
            {([
              { key: 'meal_reminders', label: 'Meal reminders', icon: <Utensils className="w-4 h-4 text-orange-400" /> },
              { key: 'workout_reminders', label: 'Workout reminders', icon: <Dumbbell className="w-4 h-4 text-green-400" /> },
              { key: 'checkin_reminders', label: 'Morning check-in reminder', icon: <CheckCircle2 className="w-4 h-4 text-primary-400" /> },
              { key: 'water_reminders', label: 'Water reminders', icon: <Droplets className="w-4 h-4 text-cyan-400" /> },
            ] as { key: keyof NotificationSettings; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {icon}
                  <span className="text-sm text-gray-300">{label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    notifSettings[key] ? 'bg-primary-500' : 'bg-gray-700'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    notifSettings[key] ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            ))}

            {/* Time pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Morning check-in time</label>
                <input
                  type="time"
                  className="input w-full text-sm"
                  value={notifSettings.morning_checkin_time}
                  onChange={e => setNotifSettings(prev => ({ ...prev, morning_checkin_time: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Workout reminder time</label>
                <input
                  type="time"
                  className="input w-full text-sm"
                  value={notifSettings.workout_reminder_time}
                  onChange={e => setNotifSettings(prev => ({ ...prev, workout_reminder_time: e.target.value }))}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveNotifications}
              disabled={savingNotif}
              className="w-full btn-primary py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingNotif ? 'Saving…' : 'Save Notification Settings'}
            </button>
          </div>
        )}
      </div>

      {/* ── 4. 30-Day Calendar View ── */}
      <div className="card">
        <p className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-primary-400" /> 30-Day History
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs text-gray-600 font-semibold pb-1">{d}</div>
          ))}
          {/* Offset first day */}
          {Array.from({ length: new Date(calendarDays[0]).getDay() }, (_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {calendarDays.map(date => {
            const dayNum = parseInt(date.split('-')[2]);
            const hasCheckin = checkinDates.has(date);
            const isToday = date === today;
            return (
              <div
                key={date}
                title={date}
                className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-xs font-medium transition-colors ${
                  isToday
                    ? 'ring-1 ring-primary-500'
                    : ''
                } ${
                  hasCheckin
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-gray-800 text-gray-600'
                }`}
              >
                <span>{dayNum}</span>
                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${hasCheckin ? 'bg-green-400' : 'bg-gray-700'}`} />
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 justify-end">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-400" /> Checked in
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-gray-700" /> No check-in
          </span>
        </div>
      </div>

      {/* ── 5. Weekly Summary Stats ── */}
      <div className="card">
        <p className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary-400" /> This Week
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">Avg Mood</p>
            {weekCheckins.length > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="text-2xl">{moodEmoji(Math.round(avgMood))}</span>
                <span className="text-sm font-bold text-white">{avgMood.toFixed(1)}/5</span>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No data</p>
            )}
          </div>
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">Avg Energy</p>
            {weekCheckins.length > 0 ? (
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold text-white">{avgEnergy.toFixed(1)}<span className="text-gray-500">/10</span></span>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No data</p>
            )}
          </div>
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">Check-In Consistency</p>
            <p className="text-sm font-bold text-white">{weekCheckins.length}<span className="text-gray-500">/7 days</span></p>
            <div className="mt-1.5 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full"
                style={{ width: `${(weekCheckins.length / 7) * 100}%` }}
              />
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">Workouts Completed</p>
            <div className="flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-green-400" />
              <span className="text-sm font-bold text-white">{workoutsCompleted}<span className="text-gray-500"> this week</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. Accountability Messages ── */}
      <div className="card bg-primary-500/10 border-primary-500/30">
        <div className="flex gap-3">
          <div className="w-9 h-9 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-300 mb-0.5">Your Coach Says</p>
            <p className="text-sm text-primary-200">{accountabilityMessage(streak)}</p>
            {streak > 0 && (
              <p className="text-xs text-primary-400/70 mt-1">
                Keep showing up — every check-in counts toward your goal of{' '}
                <span className="font-medium">{user.goal.replace(/_/g, ' ')}</span>.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
