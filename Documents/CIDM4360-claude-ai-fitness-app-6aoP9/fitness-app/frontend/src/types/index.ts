export interface UserProfile {
  id: number;
  name: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  goal: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'endurance';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'very_active';
  fitness_level: 'beginner' | 'intermediate' | 'advanced';
  dietary_restrictions: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
  modification?: string;
}

export interface Workout {
  type: string;
  duration_minutes: number;
  estimated_calories_burned: number;
  warmup: string[];
  exercises: Exercise[];
  cooldown: string[];
}

export interface MealSuggestion {
  name: string;
  calories: number;
  protein_g: number;
  description: string;
}

export interface DailyPlan {
  id: number;
  plan_date: string;
  calorie_target: number;
  protein_target_g: number;
  carb_target_g: number;
  fat_target_g: number;
  step_target: number;
  water_target_ml: number;
  ai_notes: string;
  workout: Workout;
  meal_suggestions: {
    breakfast: MealSuggestion;
    lunch: MealSuggestion;
    dinner: MealSuggestion;
    snack: MealSuggestion;
  };
}

export interface MealLog {
  id: number;
  meal_type: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  created_at: string;
}

export interface MealAnalysis {
  description: string;
  meal_name: string;
  confidence: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  vitamin_c_mg: number;
  calcium_mg: number;
  iron_mg: number;
  health_score: number;
  health_notes: string;
  components: Array<{ item: string; estimated_portion: string; calories: number }>;
  suggestions: string[];
}

export interface WorkoutLog {
  id: number;
  log_date: string;
  workout_type: string;
  duration_minutes: number;
  calories_burned: number;
  perceived_effort: number;
  completed: boolean;
  notes: string;
}

export interface ProgressIssue {
  category: string;
  severity: 'low' | 'medium' | 'high';
  issue: string;
  data_evidence: string;
  fix: string;
}

export interface ProgressAnalysis {
  overall_assessment: string;
  progress_score: number;
  issues: ProgressIssue[];
  wins: string[];
  top_priority: string;
  adjusted_recommendation: {
    calories: number;
    protein_g: number;
    workouts_per_week: number;
    steps_per_day: number;
  };
}

export interface WeeklyReport {
  headline: string;
  overall_grade: string;
  weekly_score: number;
  what_worked: Array<{ title: string; detail: string; keep_doing: string }>;
  what_didnt_work: Array<{ title: string; detail: string; impact: string; fix: string }>;
  stats_summary: {
    consistency_score: number;
    nutrition_score: number;
    activity_score: number;
    recovery_score: number;
  };
  next_week_focus: string[];
  motivational_message: string;
  adjusted_plan: {
    increase: string[];
    decrease: string[];
    maintain: string[];
  };
  week_start: string;
  week_end: string;
}

export interface WearableData {
  id?: number;
  log_date: string;
  sleep_score?: number;
  sleep_hours?: number;
  hrv_ms?: number;
  resting_heart_rate?: number;
  recovery_score?: number;
  spo2_pct?: number;
  steps?: number;
  active_calories?: number;
  device_type?: string;
}

export interface DailyCheckin {
  id?: number;
  checkin_date: string;
  mood: number;
  energy_level: number;
  sleep_quality: number;
  stress_level: number;
  muscle_soreness: number;
  notes?: string;
  streak_days?: number;
}

export interface QuickFoodResult {
  recommendation: string;
  why: string;
  estimated_calories: number;
  estimated_protein_g: number;
  smart_swaps: string[];
  avoid: string[];
  backup_option: string;
  quick_tip: string;
}

export interface TimedWorkoutResult {
  workout_name: string;
  total_minutes: number;
  format: string;
  calories_estimate: number;
  difficulty: string;
  warmup: { duration_minutes: number; exercises: string[] };
  main_workout: {
    duration_minutes: number;
    structure: string;
    exercises: Array<{
      name: string;
      duration_or_reps: string;
      rest: string;
      modification: string;
    }>;
  };
  cooldown: { duration_minutes: number; exercises: string[] };
  pro_tip: string;
  motivation: string;
}

export interface RecompositionGuidance {
  overview: string;
  calorie_strategy: { daily_calories: number; rationale: string; cycling: string };
  macro_split: { protein_g: number; carbs_g: number; fat_g: number; protein_priority_reason: string };
  training_approach: {
    weekly_sessions: number;
    strength_days: number;
    cardio_days: number;
    style: string;
    key_principles: string[];
  };
  timeline: {
    monthly_fat_loss_kg: number;
    monthly_muscle_gain_kg: number;
    milestones: string[];
  };
  top_tips: string[];
  common_mistakes: string[];
  progress_markers: string[];
}

export interface WeeklyMealPlanMeal {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  prep_minutes: number;
}

export interface WeeklyMealPlanDay {
  day: string;
  meals: {
    breakfast: WeeklyMealPlanMeal;
    lunch: WeeklyMealPlanMeal;
    dinner: WeeklyMealPlanMeal;
    snack: WeeklyMealPlanMeal;
  };
  day_totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

export interface WeeklyMealPlan {
  summary: string;
  daily_targets: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  days: WeeklyMealPlanDay[];
  hydration_tip: string;
  key_tips: string[];
}

export interface BudgetMealPlan {
  weekly_cost_estimate: number;
  cost_per_day: number;
  overview: string;
  staple_foods: Array<{ food: string; weekly_cost_usd: number; uses: string[] }>;
  daily_template: {
    breakfast: { meal: string; cost_usd: number; calories: number; protein_g: number; prep_minutes: number };
    lunch: { meal: string; cost_usd: number; calories: number; protein_g: number; prep_minutes: number };
    dinner: { meal: string; cost_usd: number; calories: number; protein_g: number; prep_minutes: number };
    snack: { meal: string; cost_usd: number; calories: number; protein_g: number; prep_minutes: number };
  };
  shopping_list: Array<{ item: string; quantity: string; estimated_cost_usd: number }>;
  meal_prep_tips: string[];
  budget_protein_sources: string[];
  total_daily_nutrition: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

export interface BodyAnalysisResult {
  bmi: number;
  bmi_category: string;
  estimated_body_fat_pct: number;
  estimated_muscle_mass_pct: number;
  lean_mass_kg: number;
  fat_mass_kg: number;
  muscle_development: {
    upper_body: string;
    core: string;
    lower_body: string;
    overall_symmetry: string;
  };
  posture_assessment: {
    overall: string;
    notes: string[];
  };
  body_type: string;
  fitness_potential: string;
  health_indicators: {
    cardiovascular_risk: string;
    metabolic_health_indicator: string;
  };
  goal_alignment: string;
  recommendations: Array<{ area: string; recommendation: string; priority: string }>;
  encouragement: string;
}
