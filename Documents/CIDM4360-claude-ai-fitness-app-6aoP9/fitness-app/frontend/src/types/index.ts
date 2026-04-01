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
