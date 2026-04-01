/**
 * Tests for the UserProfile component.
 *
 * Covers:
 *   - Rendering in "create" vs "update" mode
 *   - Required-field validation
 *   - BMI live calculation
 *   - Successful create flow (calls createUser, fires onSave)
 *   - Successful update flow (calls updateUser, fires onSave)
 *   - API error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserProfile from './UserProfile';
import type { UserProfile as UserProfileType } from '../types';

// Mock the entire API client module
vi.mock('../api/client', () => ({
  createUser: vi.fn(),
  updateUser: vi.fn(),
}));

import { createUser, updateUser } from '../api/client';

const mockCreateUser = vi.mocked(createUser);
const mockUpdateUser = vi.mocked(updateUser);

const existingUser: UserProfileType = {
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

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('UserProfile rendering', () => {
  it('shows "Create Your Profile" when no existing user', () => {
    render(<UserProfile onSave={vi.fn()} />);
    expect(screen.getByText('Create Your Profile')).toBeInTheDocument();
  });

  it('shows "Update Profile" when an existing user is passed', () => {
    render(<UserProfile existing={existingUser} onSave={vi.fn()} />);
    expect(screen.getByText('Update Profile')).toBeInTheDocument();
  });

  it('pre-fills fields with existing user data', () => {
    render(<UserProfile existing={existingUser} onSave={vi.fn()} />);
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    expect(screen.getByDisplayValue('168')).toBeInTheDocument();
    expect(screen.getByDisplayValue('65')).toBeInTheDocument();
  });

  it('renders all four goal options', () => {
    render(<UserProfile onSave={vi.fn()} />);
    expect(screen.getByText('Weight Loss')).toBeInTheDocument();
    expect(screen.getByText('Muscle Gain')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText('Endurance')).toBeInTheDocument();
  });

  it('renders all four activity level options', () => {
    render(<UserProfile onSave={vi.fn()} />);
    expect(screen.getByText('Sedentary')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Very Active')).toBeInTheDocument();
  });

  it('renders all three fitness level options', () => {
    render(<UserProfile onSave={vi.fn()} />);
    expect(screen.getByText('Beginner')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });
});

// ── BMI calculation ───────────────────────────────────────────────────────────

describe('BMI live calculation', () => {
  it('shows BMI when both height and weight are filled', async () => {
    const user = userEvent.setup();
    render(<UserProfile onSave={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('175'), '168');
    await user.type(screen.getByPlaceholderText('75'), '65');

    // BMI = 65 / (1.68^2) ≈ 23.0
    expect(screen.getByText(/BMI:/)).toBeInTheDocument();
    expect(screen.getByText(/23\./)).toBeInTheDocument();
  });

  it('does not show BMI when height is missing', () => {
    render(<UserProfile onSave={vi.fn()} />);
    expect(screen.queryByText(/BMI:/)).not.toBeInTheDocument();
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe('form validation', () => {
  it('shows error when required fields are empty on submit', async () => {
    const user = userEvent.setup();
    render(<UserProfile onSave={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /save profile/i }));
    expect(await screen.findByText(/please fill in all required fields/i)).toBeInTheDocument();
  });

  it('does not call createUser when required fields are missing', async () => {
    const user = userEvent.setup();
    render(<UserProfile onSave={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /save profile/i }));
    expect(mockCreateUser).not.toHaveBeenCalled();
  });
});

// ── Create flow ───────────────────────────────────────────────────────────────

describe('create user flow', () => {
  it('calls createUser and fires onSave on success', async () => {
    mockCreateUser.mockResolvedValueOnce({ id: 7, name: 'Alice', message: 'Profile created!' });
    const onSave = vi.fn();
    const user = userEvent.setup();

    render(<UserProfile onSave={onSave} />);

    await user.type(screen.getByPlaceholderText('Your name'), 'Alice');
    await user.type(screen.getByPlaceholderText('25'), '25');
    await user.type(screen.getByPlaceholderText('175'), '170');
    await user.type(screen.getByPlaceholderText('75'), '70');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledOnce();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 7, name: 'Alice' }));
    });
  });

  it('shows error message when API call fails', async () => {
    mockCreateUser.mockRejectedValueOnce(new Error('Network error'));
    const user = userEvent.setup();

    render(<UserProfile onSave={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Your name'), 'Alice');
    await user.type(screen.getByPlaceholderText('25'), '25');
    await user.type(screen.getByPlaceholderText('175'), '170');
    await user.type(screen.getByPlaceholderText('75'), '70');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(await screen.findByText(/failed to save profile/i)).toBeInTheDocument();
  });
});

// ── Update flow ───────────────────────────────────────────────────────────────

describe('update user flow', () => {
  it('calls updateUser (not createUser) when existing user provided', async () => {
    mockUpdateUser.mockResolvedValueOnce({ message: 'Profile updated' });
    const onSave = vi.fn();
    const user = userEvent.setup();

    render(<UserProfile existing={existingUser} onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith(1, expect.any(Object));
      expect(mockCreateUser).not.toHaveBeenCalled();
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    });
  });
});

// ── Goal selection ────────────────────────────────────────────────────────────

describe('goal selection', () => {
  it('clicking a different goal selects it', async () => {
    mockCreateUser.mockResolvedValueOnce({ id: 1, name: 'Test' });
    const user = userEvent.setup();
    render(<UserProfile onSave={vi.fn()} />);

    await user.click(screen.getByText('Muscle Gain'));

    // Fill required fields and submit to verify the goal is sent
    await user.type(screen.getByPlaceholderText('Your name'), 'Test');
    await user.type(screen.getByPlaceholderText('25'), '25');
    await user.type(screen.getByPlaceholderText('175'), '170');
    await user.type(screen.getByPlaceholderText('75'), '70');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      const callArg = mockCreateUser.mock.calls[0][0];
      expect(callArg.goal).toBe('muscle_gain');
    });
  });
});
