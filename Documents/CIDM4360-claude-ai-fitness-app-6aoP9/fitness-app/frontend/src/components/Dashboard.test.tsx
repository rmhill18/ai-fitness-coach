/**
 * Tests for the Dashboard component.
 *
 * Covers:
 *   - Loading state
 *   - "Generate Today's Plan" CTA when no plan exists
 *   - Progress rings appear when plan exists
 *   - User greeting displays first name
 *   - Quick stat tiles (BMI, goal, level, activity)
 *   - Steps update interaction
 *   - Navigation shortcuts call onNavigate
 *   - Coach note displayed from ai_notes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from './Dashboard';
import type { UserProfile, DailyPlan, MealLog, WorkoutLog } from '../types';

vi.mock('../api/client', () => ({
  getDailyPlan: vi.fn(),
  getMeals: vi.fn(),
  getWorkouts: vi.fn(),
  getSteps: vi.fn(),
  logSteps: vi.fn(),
}));

import { getDailyPlan, getMeals, getWorkouts, getSteps, logSteps } from '../api/client';

const mockGetDailyPlan = vi.mocked(getDailyPlan);
const mockGetMeals = vi.mocked(getMeals);
const mockGetWorkouts = vi.mocked(getWorkouts);
const mockGetSteps = vi.mocked(getSteps);
const mockLogSteps = vi.mocked(logSteps);

const testUser: UserProfile = {
  id: 1,
  name: 'Jane Doe',
  age: 30,
  height_cm: 168,
  weight_kg: 65,
  goal: 'weight_loss',
  activity_level: 'moderate',
  fitness_level: 'intermediate',
  dietary_restrictions: '',
};

const mockPlan: DailyPlan = {
  id: 1,
  plan_date: '2024-01-15',
  calorie_target: 2200,
  protein_target_g: 165,
  carb_target_g: 240,
  fat_target_g: 72,
  step_target: 9000,
  water_target_ml: 2800,
  ai_notes: 'You are doing great! Keep pushing.',
  workout: {
    type: 'Upper Body Strength',
    duration_minutes: 50,
    estimated_calories_burned: 320,
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

const mockMeal: MealLog = {
  id: 1,
  meal_type: 'breakfast',
  description: 'Oatmeal',
  calories: 350,
  protein_g: 12,
  carbs_g: 60,
  fat_g: 6,
  fiber_g: 5,
  sugar_g: 3,
  sodium_mg: 120,
  created_at: '2024-01-15T08:00:00',
};

const today = new Date().toISOString().split('T')[0];

const mockWorkout: WorkoutLog = {
  id: 1,
  log_date: today,
  workout_type: 'Upper Body Strength',
  duration_minutes: 45,
  calories_burned: 280,
  perceived_effort: 7,
  completed: true,
  notes: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no plan, no meals, no workouts, no steps
  mockGetDailyPlan.mockResolvedValue(null);
  mockGetMeals.mockResolvedValue([]);
  mockGetWorkouts.mockResolvedValue([]);
  mockGetSteps.mockResolvedValue([]);
  mockLogSteps.mockResolvedValue({ message: 'Steps logged' });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('shows a loading spinner before data arrives', () => {
    // Never resolve the promises
    mockGetDailyPlan.mockReturnValue(new Promise(() => {}));
    mockGetMeals.mockReturnValue(new Promise(() => {}));
    mockGetWorkouts.mockReturnValue(new Promise(() => {}));
    mockGetSteps.mockReturnValue(new Promise(() => {}));

    render(<Dashboard user={testUser} onNavigate={vi.fn()} />);
    // The spinner element has a specific CSS class; just check loading is active
    expect(screen.queryByText(/Hey Jane/)).not.toBeInTheDocument();
  });
});

// ── Greeting ──────────────────────────────────────────────────────────────────

describe('greeting', () => {
  it('shows first name from user profile', async () => {
    render(<Dashboard user={testUser} onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Hey Jane!/)).toBeInTheDocument();
    });
  });

  it('only uses first name for multi-word names', async () => {
    render(<Dashboard user={{ ...testUser, name: 'John Smith' }} onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Hey John!/)).toBeInTheDocument();
    });
  });
});

// ── Quick stat tiles ──────────────────────────────────────────────────────────

describe('quick stat tiles', () => {
  it('displays computed BMI', async () => {
    render(<Dashboard user={testUser} onNavigate={vi.fn()} />);
    // BMI = 65 / (1.68^2) ≈ 23.0
    await waitFor(() => {
      expect(screen.getByText('23.0')).toBeInTheDocument();
    });
  });

  it('displays goal with underscore replaced', async () => {
    render(<Dashboard user={testUser} onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('weight loss')).toBeInTheDocument();
    });
  });

  it('displays fitness level', async () => {
    render(<Dashboard user={testUser} onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('intermediate')).toBeInTheDocument();
    });
  });
});

// ── No plan CTA ───────────────────────────────────────────────────────────────

describe('no-plan state', () => {
  it('shows "Generate Today\'s Plan" when plan is null', async () => {
    render(<Dashboard user={testUser} onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Generate Today's Plan")).toBeInTheDocument();
    });
  });

  it('clicking the CTA calls onNavigate with "plan"', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<Dashboard user={testUser} onNavigate={onNavigate} />);
    await waitFor(() => screen.getByText("Generate Today's Plan"));
    await user.click(screen.getByText("Generate Today's Plan"));
    expect(onNavigate).toHaveBeenCalledWith('plan');
  });
});

// ── With plan ─────────────────────────────────────────────────────────────────

describe('with plan loaded', () => {
  beforeEach(() => {
    mockGetDailyPlan.mockResolvedValue(mockPlan);
  });

  it('shows "Today\'s Progress" section', async () => {
    render(<Dashboard user={testUser} onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Today's Progress")).toBeInTheDocument();
    });
  });

  it('displays calorie target', async () => {
    render(<Dashboard user={testUser} onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('/ 2200')).toBeInTheDocument();
    });
  });

  it('displays step target', async () => {
    render(<Dashboard user={testUser} onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/9,000/)).toBeInTheDocument();
    });
  });

  it('shows ai_notes as coach note', async () => {
    render(<Dashboard user={testUser} onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('You are doing great! Keep pushing.')).toBeInTheDocument();
    });
  });
});

// ── Meal summary ──────────────────────────────────────────────────────────────

describe('meal summary', () => {
  it('shows meal count in the Log Meal shortcut', async () => {
    mockGetMeals.mockResolvedValue([mockMeal]);
    render(<Dashboard user={testUser} onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('1 logged today')).toBeInTheDocument();
    });
  });
});

// ── Workout status ────────────────────────────────────────────────────────────

describe('workout status', () => {
  it('shows planned workout from plan when no workout logged yet', async () => {
    mockGetDailyPlan.mockResolvedValue(mockPlan);
    render(<Dashboard user={testUser} onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Upper Body Strength')).toBeInTheDocument();
    });
  });

  it('shows completed workout when one is logged today', async () => {
    mockGetWorkouts.mockResolvedValue([mockWorkout]);
    render(<Dashboard user={testUser} onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Upper Body Strength')).toBeInTheDocument();
      expect(screen.getByText(/45 min/)).toBeInTheDocument();
    });
  });
});

// ── Steps update ──────────────────────────────────────────────────────────────

describe('steps update', () => {
  it('calls logSteps with the entered value', async () => {
    const user = userEvent.setup();
    render(<Dashboard user={testUser} onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText(/Update Steps/));

    const input = screen.getByRole('spinbutton');
    await user.type(input, '8000');
    await user.click(screen.getByRole('button', { name: '' })); // the + button

    await waitFor(() => {
      expect(mockLogSteps).toHaveBeenCalledWith(1, expect.any(String), 8000);
    });
  });

  it('ignores non-numeric step input', async () => {
    const user = userEvent.setup();
    render(<Dashboard user={testUser} onNavigate={vi.fn()} />);
    await waitFor(() => screen.getByText(/Update Steps/));

    const input = screen.getByRole('spinbutton');
    await user.type(input, 'abc');
    await user.click(screen.getByRole('button', { name: '' }));

    expect(mockLogSteps).not.toHaveBeenCalled();
  });
});

// ── Navigation shortcuts ──────────────────────────────────────────────────────

describe('navigation shortcuts', () => {
  it('Log Meal button calls onNavigate("meals")', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<Dashboard user={testUser} onNavigate={onNavigate} />);
    await waitFor(() => screen.getByText('Log Meal'));
    await user.click(screen.getByText('Log Meal'));
    expect(onNavigate).toHaveBeenCalledWith('meals');
  });

  it('Check Progress button calls onNavigate("progress")', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<Dashboard user={testUser} onNavigate={onNavigate} />);
    await waitFor(() => screen.getByText('Check Progress'));
    await user.click(screen.getByText('Check Progress'));
    expect(onNavigate).toHaveBeenCalledWith('progress');
  });
});
