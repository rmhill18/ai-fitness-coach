import axios from 'axios';
import type {
  UserProfile,
  DailyPlan,
  MealLog,
  MealAnalysis,
  WorkoutLog,
  ProgressAnalysis,
  WeeklyReport,
  BodyAnalysisResult,
  WearableData,
  DailyCheckin,
  QuickFoodResult,
  TimedWorkoutResult,
  RecompositionGuidance,
  BudgetMealPlan,
} from '../types';

// Use VITE_API_URL env var for native builds pointing at a deployed backend,
// otherwise fall back to the local proxy path used during web development.
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

const api = axios.create({ baseURL: BASE_URL });

// ── Attach JWT token to every request ────────────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── On 401, clear credentials and reload (force re-login) ────────────────────
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('fitness_user_id');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const registerUser = (email: string, password: string) =>
  api.post<{ access_token: string; user_id: number | null; has_profile: boolean }>(
    '/auth/register', { email, password }
  ).then(r => r.data);

export const loginUser = (email: string, password: string) =>
  api.post<{ access_token: string; user_id: number | null; has_profile: boolean }>(
    '/auth/login', { email, password }
  ).then(r => r.data);

export const getAuthMe = () =>
  api.get<{ email: string; user_id: number | null; has_profile: boolean }>('/auth/me').then(r => r.data);

// ── Push Token ────────────────────────────────────────────────────────────────
export const savePushToken = (userId: number, token: string, platform: 'ios' | 'android' | 'web') =>
  api.post('/push-token', { user_id: userId, token, platform }).then(r => r.data);

// ── Users ─────────────────────────────────────────────────────────────────────
export const createUser = (data: Omit<UserProfile, 'id'>) =>
  api.post('/users', data).then(r => r.data);

export const getUser = (id: number) =>
  api.get<UserProfile>(`/users/${id}`).then(r => r.data);

export const updateUser = (id: number, data: Omit<UserProfile, 'id'>) =>
  api.put(`/users/${id}`, data).then(r => r.data);

// ── Daily Plans ───────────────────────────────────────────────────────────────
export const generateDailyPlan = (userId: number, date?: string) =>
  api
    .post<DailyPlan>('/daily-plan', null, { params: { user_id: userId, plan_date: date } })
    .then(r => r.data);

export const getDailyPlan = (userId: number, date?: string) =>
  api
    .get<DailyPlan | null>(`/daily-plan/${userId}`, { params: { plan_date: date } })
    .then(r => r.data);

// ── Meals ─────────────────────────────────────────────────────────────────────
export const analyzeMealPhoto = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<MealAnalysis>('/meals/analyze-photo', form).then(r => r.data);
};

export const logMeal = (data: {
  user_id: number;
  log_date: string;
  meal_type: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  vitamin_c_mg?: number;
  calcium_mg?: number;
  iron_mg?: number;
}) => api.post('/meals', data).then(r => r.data);

export const getMeals = (userId: number, date?: string) =>
  api
    .get<MealLog[]>(`/meals/${userId}`, { params: { log_date: date } })
    .then(r => r.data);

export const deleteMeal = (mealId: number) =>
  api.delete(`/meals/${mealId}`).then(r => r.data);

// ── Workouts ──────────────────────────────────────────────────────────────────
export const logWorkout = (data: {
  user_id: number;
  log_date: string;
  workout_type: string;
  exercises: string;
  duration_minutes: number;
  calories_burned: number;
  perceived_effort: number;
  completed: boolean;
  notes?: string;
}) => api.post('/workouts', data).then(r => r.data);

export const getWorkouts = (userId: number, days?: number) =>
  api
    .get<WorkoutLog[]>(`/workouts/${userId}`, { params: { days } })
    .then(r => r.data);

export const getAdaptiveWorkout = (userId: number) =>
  api.post('/workouts/adaptive', null, { params: { user_id: userId } }).then(r => r.data);

// ── Steps ─────────────────────────────────────────────────────────────────────
export const logSteps = (userId: number, date: string, steps: number) =>
  api.post('/steps', { user_id: userId, log_date: date, steps }).then(r => r.data);

export const getSteps = (userId: number, days?: number) =>
  api
    .get<Array<{ log_date: string; steps: number }>>(`/steps/${userId}`, { params: { days } })
    .then(r => r.data);

// ── Progress & Reports ────────────────────────────────────────────────────────
export const analyzeProgress = (userId: number) =>
  api.get<ProgressAnalysis>(`/progress/analyze/${userId}`).then(r => r.data);

export const getWeeklyReport = (userId: number, weekOffset?: number) =>
  api
    .get<WeeklyReport>(`/weekly-report/${userId}`, { params: { week_offset: weekOffset } })
    .then(r => r.data);

// ── Body Analysis ─────────────────────────────────────────────────────────────
export const analyzeBody = (userId: number, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<BodyAnalysisResult>(`/body/analyze/${userId}`, form).then(r => r.data);
};

export const getBodyHistory = (userId: number) =>
  api.get(`/body/history/${userId}`).then(r => r.data);

// ── Wearable / Health Data ────────────────────────────────────────────────────
export const logWearableData = (data: WearableData & { user_id: number }) =>
  api.post('/wearable', data).then(r => r.data);

export const getWearableData = (userId: number, days?: number) =>
  api.get<WearableData[]>(`/wearable/${userId}`, { params: { days } }).then(r => r.data);

// ── Daily Check-in ────────────────────────────────────────────────────────────
export const dailyCheckin = (data: DailyCheckin & { user_id: number }) =>
  api.post('/checkin', data).then(r => r.data);

export const getCheckins = (userId: number, days?: number) =>
  api.get<DailyCheckin[]>(`/checkin/${userId}`, { params: { days } }).then(r => r.data);

// ── Quick Food Decision ───────────────────────────────────────────────────────
export const getQuickFoodDecision = (data: {
  user_id: number;
  restaurant: string;
  meal_context?: string;
  calories_remaining?: number;
}) => api.post<QuickFoodResult>('/food/quick-decision', data).then(r => r.data);

// ── Timed Workout Generator ───────────────────────────────────────────────────
export const generateTimedWorkout = (data: {
  user_id: number;
  available_minutes: number;
  equipment?: string;
  focus_area?: string;
}) => api.post<TimedWorkoutResult>('/workouts/timed', data).then(r => r.data);

// ── Body Recomposition ────────────────────────────────────────────────────────
export const getRecompositionGuidance = (userId: number) =>
  api.get<RecompositionGuidance>(`/recomposition/${userId}`).then(r => r.data);

// ── Weekly Meal Plan ──────────────────────────────────────────────────────────
export const getWeeklyMealPlan = (userId: number) =>
  api.get<import('../types').WeeklyMealPlan>(`/meal-plan/${userId}`).then(r => r.data);

// ── Budget Meal Plan ──────────────────────────────────────────────────────────
export const getBudgetMealPlan = (userId: number, weeklyBudget?: number) =>
  api
    .get<BudgetMealPlan>(`/budget-plan/${userId}`, { params: { weekly_budget: weeklyBudget } })
    .then(r => r.data);
