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
} from '../types';

const api = axios.create({ baseURL: '/api' });

// Users
export const createUser = (data: Omit<UserProfile, 'id'>) =>
  api.post('/users', data).then(r => r.data);

export const getUser = (id: number) =>
  api.get<UserProfile>(`/users/${id}`).then(r => r.data);

export const updateUser = (id: number, data: Omit<UserProfile, 'id'>) =>
  api.put(`/users/${id}`, data).then(r => r.data);

// Daily Plans
export const generateDailyPlan = (userId: number, date?: string) =>
  api
    .post<DailyPlan>('/daily-plan', null, { params: { user_id: userId, plan_date: date } })
    .then(r => r.data);

export const getDailyPlan = (userId: number, date?: string) =>
  api
    .get<DailyPlan | null>(`/daily-plan/${userId}`, { params: { plan_date: date } })
    .then(r => r.data);

// Meals
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

// Workouts
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

// Steps
export const logSteps = (userId: number, date: string, steps: number) =>
  api.post('/steps', { user_id: userId, log_date: date, steps }).then(r => r.data);

export const getSteps = (userId: number, days?: number) =>
  api
    .get<Array<{ log_date: string; steps: number }>>(`/steps/${userId}`, { params: { days } })
    .then(r => r.data);

// Progress Analysis
export const analyzeProgress = (userId: number) =>
  api.get<ProgressAnalysis>(`/progress/analyze/${userId}`).then(r => r.data);

// Weekly Report
export const getWeeklyReport = (userId: number, weekOffset?: number) =>
  api
    .get<WeeklyReport>(`/weekly-report/${userId}`, { params: { week_offset: weekOffset } })
    .then(r => r.data);

// Body Analysis
export const analyzeBody = (userId: number, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<BodyAnalysisResult>(`/body/analyze/${userId}`, form).then(r => r.data);
};

export const getBodyHistory = (userId: number) =>
  api.get(`/body/history/${userId}`).then(r => r.data);

// AI Coach Chat
export const chatWithCoach = (
  userId: number,
  message: string,
  history: Array<{ role: string; content: string }> = [],
) =>
  api
    .post<{ response: string }>(`/coach/chat/${userId}`, { message, history })
    .then(r => r.data);
