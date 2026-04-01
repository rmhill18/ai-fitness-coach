/**
 * Tests for src/api/client.ts
 *
 * Strategy: intercept HTTP at the network layer with MSW so the real
 * axios instance inside client.ts is exercised end-to-end.
 */

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import {
  getUser,
  createUser,
  updateUser,
  generateDailyPlan,
  getDailyPlan,
  logMeal,
  getMeals,
  deleteMeal,
  logWorkout,
  getWorkouts,
  getAdaptiveWorkout,
  logSteps,
  getSteps,
  analyzeProgress,
  getWeeklyReport,
  getBodyHistory,
} from './client';

// ── MSW server ────────────────────────────────────────────────────────────────

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ── Fixture data ──────────────────────────────────────────────────────────────

const mockUser = {
  id: 1,
  name: 'Jane Doe',
  age: 30,
  height_cm: 168,
  weight_kg: 65,
  goal: 'weight_loss' as const,
  activity_level: 'moderate' as const,
  fitness_level: 'intermediate' as const,
  dietary_restrictions: '',
};

const mockPlan = {
  id: 1,
  plan_date: '2024-01-15',
  calorie_target: 2200,
  protein_target_g: 165,
  carb_target_g: 240,
  fat_target_g: 72,
  step_target: 9000,
  water_target_ml: 2800,
  ai_notes: 'Keep it up!',
  workout: {
    type: 'Strength',
    duration_minutes: 45,
    estimated_calories_burned: 300,
    warmup: [],
    exercises: [],
    cooldown: [],
  },
  meal_suggestions: {
    breakfast: { name: 'Oats', calories: 350, protein_g: 15, description: '' },
    lunch: { name: 'Salad', calories: 500, protein_g: 35, description: '' },
    dinner: { name: 'Salmon', calories: 650, protein_g: 50, description: '' },
    snack: { name: 'Apple', calories: 100, protein_g: 1, description: '' },
  },
};

// ── Users ─────────────────────────────────────────────────────────────────────

describe('getUser', () => {
  it('fetches a user by id', async () => {
    server.use(http.get('/api/users/1', () => HttpResponse.json(mockUser)));
    const result = await getUser(1);
    expect(result).toEqual(mockUser);
  });
});

describe('createUser', () => {
  it('posts user data and returns created user id', async () => {
    server.use(
      http.post('/api/users', () => HttpResponse.json({ id: 1, name: 'Jane Doe', message: 'Profile created!' })),
    );
    const { id } = await createUser(mockUser);
    expect(id).toBe(1);
  });
});

describe('updateUser', () => {
  it('sends PUT with updated data', async () => {
    let captured: unknown;
    server.use(
      http.put('/api/users/1', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ message: 'Profile updated' });
      }),
    );
    await updateUser(1, mockUser);
    expect((captured as typeof mockUser).weight_kg).toBe(65);
  });
});

// ── Daily Plans ───────────────────────────────────────────────────────────────

describe('generateDailyPlan', () => {
  it('posts to /daily-plan with user_id query param', async () => {
    let url: string | undefined;
    server.use(
      http.post('/api/daily-plan', ({ request }) => {
        url = request.url;
        return HttpResponse.json(mockPlan);
      }),
    );
    await generateDailyPlan(1, '2024-01-15');
    expect(url).toContain('user_id=1');
    expect(url).toContain('plan_date=2024-01-15');
  });
});

describe('getDailyPlan', () => {
  it('fetches the plan for a given date', async () => {
    server.use(
      http.get('/api/daily-plan/1', () => HttpResponse.json(mockPlan)),
    );
    const result = await getDailyPlan(1, '2024-01-15');
    expect(result?.calorie_target).toBe(2200);
  });

  it('returns null when no plan exists', async () => {
    server.use(http.get('/api/daily-plan/1', () => HttpResponse.json(null)));
    const result = await getDailyPlan(1);
    expect(result).toBeNull();
  });
});

// ── Meals ─────────────────────────────────────────────────────────────────────

describe('logMeal', () => {
  it('posts meal data and returns id', async () => {
    server.use(
      http.post('/api/meals', () => HttpResponse.json({ id: 42, message: 'Meal logged' })),
    );
    const result = await logMeal({
      user_id: 1,
      log_date: '2024-01-15',
      meal_type: 'breakfast',
      description: 'Oats',
      calories: 350,
      protein_g: 15,
      carbs_g: 60,
      fat_g: 5,
    });
    expect(result.id).toBe(42);
  });
});

describe('getMeals', () => {
  it('fetches meals with log_date query param', async () => {
    let url: string | undefined;
    const mockMeals = [
      {
        id: 1,
        meal_type: 'breakfast',
        description: 'Oats',
        calories: 350,
        protein_g: 15,
        carbs_g: 60,
        fat_g: 5,
        fiber_g: 4,
        sugar_g: 2,
        sodium_mg: 100,
        created_at: '2024-01-15',
      },
    ];
    server.use(
      http.get('/api/meals/1', ({ request }) => {
        url = request.url;
        return HttpResponse.json(mockMeals);
      }),
    );
    const result = await getMeals(1, '2024-01-15');
    expect(url).toContain('log_date=2024-01-15');
    expect(result).toHaveLength(1);
    expect(result[0].calories).toBe(350);
  });
});

describe('deleteMeal', () => {
  it('sends DELETE to the correct meal endpoint', async () => {
    let deletedId: string | undefined;
    server.use(
      http.delete('/api/meals/:id', ({ params }) => {
        deletedId = params.id as string;
        return HttpResponse.json({ message: 'Meal deleted' });
      }),
    );
    await deleteMeal(5);
    expect(deletedId).toBe('5');
  });
});

// ── Workouts ──────────────────────────────────────────────────────────────────

describe('logWorkout', () => {
  it('posts workout data and returns id', async () => {
    server.use(
      http.post('/api/workouts', () => HttpResponse.json({ id: 10, message: 'Workout logged' })),
    );
    const result = await logWorkout({
      user_id: 1,
      log_date: '2024-01-15',
      workout_type: 'Strength',
      exercises: '[]',
      duration_minutes: 45,
      calories_burned: 300,
      perceived_effort: 7,
      completed: true,
    });
    expect(result.id).toBe(10);
  });
});

describe('getWorkouts', () => {
  it('fetches workouts with days param', async () => {
    let url: string | undefined;
    server.use(
      http.get('/api/workouts/1', ({ request }) => {
        url = request.url;
        return HttpResponse.json([]);
      }),
    );
    await getWorkouts(1, 14);
    expect(url).toContain('days=14');
  });
});

describe('getAdaptiveWorkout', () => {
  it('posts to adaptive endpoint with user_id', async () => {
    let url: string | undefined;
    server.use(
      http.post('/api/workouts/adaptive', ({ request }) => {
        url = request.url;
        return HttpResponse.json({ workout_name: 'Catch-Up' });
      }),
    );
    await getAdaptiveWorkout(1);
    expect(url).toContain('user_id=1');
  });
});

// ── Steps ─────────────────────────────────────────────────────────────────────

describe('logSteps', () => {
  it('posts correct step payload', async () => {
    let body: unknown;
    server.use(
      http.post('/api/steps', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ message: 'Steps logged' });
      }),
    );
    await logSteps(1, '2024-01-15', 9500);
    expect(body).toEqual({ user_id: 1, log_date: '2024-01-15', steps: 9500 });
  });
});

describe('getSteps', () => {
  it('fetches steps with days param', async () => {
    let url: string | undefined;
    server.use(
      http.get('/api/steps/1', ({ request }) => {
        url = request.url;
        return HttpResponse.json([]);
      }),
    );
    await getSteps(1, 30);
    expect(url).toContain('days=30');
  });
});

// ── Progress & Reports ────────────────────────────────────────────────────────

describe('analyzeProgress', () => {
  it('calls the correct endpoint', async () => {
    const mock = { progress_score: 8, issues: [], wins: [] };
    server.use(http.get('/api/progress/analyze/1', () => HttpResponse.json(mock)));
    const result = await analyzeProgress(1);
    expect(result.progress_score).toBe(8);
  });
});

describe('getWeeklyReport', () => {
  it('passes week_offset as query param', async () => {
    let url: string | undefined;
    server.use(
      http.get('/api/weekly-report/1', ({ request }) => {
        url = request.url;
        return HttpResponse.json({ headline: 'Great week!' });
      }),
    );
    await getWeeklyReport(1, 2);
    expect(url).toContain('week_offset=2');
  });
});

describe('getBodyHistory', () => {
  it('fetches body history for user', async () => {
    const history = [{ id: 1, analysis_date: '2024-01-15', bmi: 23.0 }];
    server.use(http.get('/api/body/history/1', () => HttpResponse.json(history)));
    const result = await getBodyHistory(1);
    expect(result).toHaveLength(1);
  });
});
