"""
Unit tests for ai_service.py.

The Anthropic client is mocked throughout — no real API calls are made.
The focus is on:
  1. _parse_json_response — all input variations it must handle
  2. Each public function's happy path
  3. Edge cases: empty histories, missing keys, malformed Claude output
"""

import json
import pytest
from unittest.mock import MagicMock, patch

import ai_service
from ai_service import (
    _parse_json_response,
    generate_daily_plan,
    analyze_meal_photo,
    analyze_progress,
    generate_weekly_report,
    analyze_body_photo,
    generate_adaptive_workout,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_mock_response(payload: dict) -> MagicMock:
    """Build a mock Anthropic Message whose single content block contains JSON."""
    block = MagicMock()
    block.type = "text"
    block.text = json.dumps(payload)
    response = MagicMock()
    response.content = [block]
    return response


def make_mock_response_raw(text: str) -> MagicMock:
    """Build a mock response where the text is an arbitrary string (not bare JSON)."""
    block = MagicMock()
    block.type = "text"
    block.text = text
    response = MagicMock()
    response.content = [block]
    return response


def make_thinking_response(payload: dict) -> MagicMock:
    """
    Simulates a response with a thinking block followed by a text block,
    as produced when thinking={"type": "adaptive"} is used.
    """
    thinking_block = MagicMock()
    thinking_block.type = "thinking"
    # thinking blocks have no .text attribute we need

    text_block = MagicMock()
    text_block.type = "text"
    text_block.text = json.dumps(payload)

    response = MagicMock()
    response.content = [thinking_block, text_block]
    return response


# ── _parse_json_response ──────────────────────────────────────────────────────

class TestParseJsonResponse:
    def test_plain_json_object(self):
        assert _parse_json_response('{"foo": "bar"}') == {"foo": "bar"}

    def test_plain_json_array(self):
        assert _parse_json_response('[1, 2, 3]') == [1, 2, 3]

    def test_json_code_block(self):
        text = '```json\n{"foo": "bar"}\n```'
        assert _parse_json_response(text) == {"foo": "bar"}

    def test_generic_code_block(self):
        text = '```\n{"foo": "bar"}\n```'
        assert _parse_json_response(text) == {"foo": "bar"}

    def test_leading_prose(self):
        text = 'Here is the plan:\n{"calories": 2000}'
        assert _parse_json_response(text) == {"calories": 2000}

    def test_trailing_prose(self):
        text = '{"calories": 2000}\nLet me know if you need changes.'
        assert _parse_json_response(text) == {"calories": 2000}

    def test_leading_and_trailing_prose(self):
        text = 'Sure thing!\n{"calories": 2000}\nHope that helps.'
        assert _parse_json_response(text) == {"calories": 2000}

    def test_nested_json(self):
        payload = {"workout": {"exercises": [{"name": "squat", "sets": 3}]}}
        assert _parse_json_response(json.dumps(payload)) == payload

    def test_invalid_json_raises(self):
        with pytest.raises(json.JSONDecodeError):
            _parse_json_response("not json at all")

    def test_whitespace_only_raises(self):
        with pytest.raises((json.JSONDecodeError, StopIteration, ValueError)):
            _parse_json_response("   ")

    def test_json_block_with_extra_whitespace(self):
        text = '```json\n\n  {"key": "value"}  \n\n```'
        assert _parse_json_response(text) == {"key": "value"}


# ── generate_daily_plan ───────────────────────────────────────────────────────

DAILY_PLAN_RESPONSE = {
    "calorie_target": 2200,
    "protein_target_g": 165,
    "carb_target_g": 240,
    "fat_target_g": 72,
    "step_target": 9000,
    "water_target_ml": 2800,
    "ai_notes": "Great job staying consistent! Today focus on compound movements.",
    "workout": {
        "type": "Upper Body Strength",
        "duration_minutes": 50,
        "estimated_calories_burned": 320,
        "warmup": ["arm circles", "shoulder rolls", "light jog"],
        "exercises": [
            {"name": "Bench Press", "sets": 4, "reps": "8-10", "rest_seconds": 90, "notes": "Keep scapulae retracted"}
        ],
        "cooldown": ["chest stretch", "shoulder stretch", "deep breathing"],
    },
    "meal_suggestions": {
        "breakfast": {"name": "Greek Yogurt Bowl", "calories": 400, "protein_g": 30, "description": "High-protein start"},
        "lunch": {"name": "Chicken Salad", "calories": 550, "protein_g": 45, "description": "Lean protein with greens"},
        "dinner": {"name": "Salmon & Quinoa", "calories": 650, "protein_g": 50, "description": "Omega-3 rich"},
        "snack": {"name": "Protein Shake", "calories": 200, "protein_g": 30, "description": "Post-workout recovery"},
    },
}

USER = {
    "name": "Jane",
    "age": 30,
    "height_cm": 168.0,
    "weight_kg": 65.0,
    "goal": "weight_loss",
    "activity_level": "moderate",
    "fitness_level": "intermediate",
    "dietary_restrictions": "",
}


class TestGenerateDailyPlan:
    @patch("ai_service.client")
    def test_returns_plan_with_expected_keys(self, mock_client):
        mock_client.messages.create.return_value = make_mock_response(DAILY_PLAN_RESPONSE)
        result = generate_daily_plan(USER, [], [], 0)
        assert result["calorie_target"] == 2200
        assert result["protein_target_g"] == 165
        assert "workout" in result
        assert "meal_suggestions" in result

    @patch("ai_service.client")
    def test_called_with_correct_model(self, mock_client):
        mock_client.messages.create.return_value = make_mock_response(DAILY_PLAN_RESPONSE)
        generate_daily_plan(USER, [], [], 0)
        call_kwargs = mock_client.messages.create.call_args
        assert call_kwargs.kwargs["model"] == ai_service.MODEL

    @patch("ai_service.client")
    def test_includes_recent_meals_in_history(self, mock_client):
        mock_client.messages.create.return_value = make_mock_response(DAILY_PLAN_RESPONSE)
        meals = [{"calories": 500, "protein_g": 30}] * 3
        generate_daily_plan(USER, meals, [], 0)
        prompt = mock_client.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "500" in prompt  # avg calories referenced in prompt

    @patch("ai_service.client")
    def test_mentions_missed_workouts_in_prompt(self, mock_client):
        mock_client.messages.create.return_value = make_mock_response(DAILY_PLAN_RESPONSE)
        generate_daily_plan(USER, [], [], missed_workouts=3)
        prompt = mock_client.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "Missed 3 workouts" in prompt

    @patch("ai_service.client")
    def test_handles_thinking_block_in_response(self, mock_client):
        """Thinking+text responses (adaptive thinking mode) must work correctly."""
        mock_client.messages.create.return_value = make_thinking_response(DAILY_PLAN_RESPONSE)
        result = generate_daily_plan(USER, [], [], 0)
        assert result["calorie_target"] == 2200

    @patch("ai_service.client")
    def test_handles_json_wrapped_in_code_block(self, mock_client):
        """Claude sometimes wraps JSON in ```json ... ``` fences."""
        mock_client.messages.create.return_value = make_mock_response_raw(
            f"```json\n{json.dumps(DAILY_PLAN_RESPONSE)}\n```"
        )
        result = generate_daily_plan(USER, [], [], 0)
        assert result["step_target"] == 9000

    @patch("ai_service.client")
    def test_empty_history_no_crash(self, mock_client):
        mock_client.messages.create.return_value = make_mock_response(DAILY_PLAN_RESPONSE)
        result = generate_daily_plan(USER, [], [], 0)
        assert isinstance(result, dict)


# ── analyze_meal_photo ────────────────────────────────────────────────────────

MEAL_PHOTO_RESPONSE = {
    "description": "Grilled chicken breast with steamed broccoli and brown rice",
    "meal_name": "Chicken & Veggie Bowl",
    "confidence": "high",
    "calories": 520,
    "protein_g": 45.0,
    "carbs_g": 55.0,
    "fat_g": 10.0,
    "fiber_g": 8.0,
    "sugar_g": 4.0,
    "sodium_mg": 480.0,
    "vitamin_c_mg": 62.0,
    "calcium_mg": 85.0,
    "iron_mg": 3.2,
    "health_score": 9,
    "health_notes": "Excellent macronutrient balance",
    "components": [
        {"item": "Chicken breast", "estimated_portion": "150g", "calories": 250}
    ],
    "suggestions": ["Add a side salad for extra fiber"],
}


class TestAnalyzeMealPhoto:
    @patch("ai_service.client")
    def test_returns_nutrition_data(self, mock_client):
        mock_client.messages.create.return_value = make_mock_response(MEAL_PHOTO_RESPONSE)
        result = analyze_meal_photo("base64encodeddata", "image/jpeg")
        assert result["calories"] == 520
        assert result["protein_g"] == 45.0
        assert result["health_score"] == 9

    @patch("ai_service.client")
    def test_image_sent_as_base64_content_block(self, mock_client):
        mock_client.messages.create.return_value = make_mock_response(MEAL_PHOTO_RESPONSE)
        analyze_meal_photo("mybase64data", "image/png")
        call_kwargs = mock_client.messages.create.call_args.kwargs
        # The image should be in the messages content as a base64 block
        content = call_kwargs["messages"][0]["content"]
        image_block = next(b for b in content if b.get("type") == "image")
        assert image_block["source"]["data"] == "mybase64data"
        assert image_block["source"]["media_type"] == "image/png"

    @patch("ai_service.client")
    def test_default_media_type_is_jpeg(self, mock_client):
        mock_client.messages.create.return_value = make_mock_response(MEAL_PHOTO_RESPONSE)
        analyze_meal_photo("data123")
        content = mock_client.messages.create.call_args.kwargs["messages"][0]["content"]
        image_block = next(b for b in content if b.get("type") == "image")
        assert image_block["source"]["media_type"] == "image/jpeg"

    @patch("ai_service.client")
    def test_returns_components_and_suggestions(self, mock_client):
        mock_client.messages.create.return_value = make_mock_response(MEAL_PHOTO_RESPONSE)
        result = analyze_meal_photo("data")
        assert isinstance(result["components"], list)
        assert isinstance(result["suggestions"], list)


# ── analyze_progress ──────────────────────────────────────────────────────────

PROGRESS_RESPONSE = {
    "overall_assessment": "Good consistency this week with room to improve nutrition.",
    "progress_score": 7,
    "issues": [
        {
            "category": "Nutrition",
            "severity": "medium",
            "issue": "Calorie intake slightly below target",
            "data_evidence": "Average 1800 kcal vs 2200 target",
            "fix": "Add a mid-morning snack",
        }
    ],
    "wins": ["5 workouts completed", "Steps goal hit 6 of 7 days"],
    "top_priority": "Increase daily calorie intake to support muscle gain",
    "adjusted_recommendation": {
        "calories": 2300,
        "protein_g": 170,
        "workouts_per_week": 5,
        "steps_per_day": 9000,
    },
}


class TestAnalyzeProgress:
    @patch("ai_service.client")
    def test_returns_analysis_structure(self, mock_client):
        mock_client.messages.create.return_value = make_thinking_response(PROGRESS_RESPONSE)
        result = analyze_progress(
            USER,
            [{"calories": 1800, "protein_g": 140}] * 7,
            [{"completed": True, "workout_type": "Strength"}] * 5,
            [{"calorie_target": 2200}] * 7,
            [{"steps": 8500}] * 7,
        )
        assert result["progress_score"] == 7
        assert "issues" in result
        assert "wins" in result
        assert "adjusted_recommendation" in result

    @patch("ai_service.client")
    def test_prompt_contains_computed_averages(self, mock_client):
        mock_client.messages.create.return_value = make_thinking_response(PROGRESS_RESPONSE)
        analyze_progress(
            USER,
            [{"calories": 2000, "protein_g": 150}] * 4,
            [],
            [{"calorie_target": 2200}] * 7,
            [{"steps": 10000}] * 7,
        )
        prompt = mock_client.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "2000" in prompt   # avg calories
        assert "10000" in prompt  # avg steps

    @patch("ai_service.client")
    def test_empty_data_no_crash(self, mock_client):
        mock_client.messages.create.return_value = make_thinking_response(PROGRESS_RESPONSE)
        result = analyze_progress(USER, [], [], [], [])
        assert isinstance(result, dict)

    @patch("ai_service.client")
    def test_missed_workouts_counted_correctly(self, mock_client):
        mock_client.messages.create.return_value = make_thinking_response(PROGRESS_RESPONSE)
        # 7 plans, 3 completed workouts → 4 missed
        analyze_progress(
            USER,
            [],
            [{"completed": True, "workout_type": "Cardio"}] * 3,
            [{"calorie_target": 2000}] * 7,
            [],
        )
        prompt = mock_client.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "4" in prompt  # missed count


# ── generate_weekly_report ────────────────────────────────────────────────────

WEEKLY_REPORT_RESPONSE = {
    "headline": "Solid week — consistency is building!",
    "overall_grade": "B+",
    "weekly_score": 78,
    "what_worked": [
        {"title": "Workout consistency", "detail": "Hit 4 of 5 sessions", "keep_doing": "Schedule workouts in advance"}
    ],
    "what_didnt_work": [
        {"title": "Hydration", "detail": "Only 1.8L average", "impact": "Reduced performance", "fix": "Set water reminders"}
    ],
    "stats_summary": {
        "consistency_score": 80,
        "nutrition_score": 72,
        "activity_score": 85,
        "recovery_score": 65,
    },
    "next_week_focus": ["Increase water intake", "Add 1 extra protein serving", "Sleep 8 hours"],
    "motivational_message": "You're making real progress. Keep building those habits!",
    "adjusted_plan": {
        "increase": ["water intake", "sleep"],
        "decrease": ["processed food"],
        "maintain": ["workout frequency"],
    },
}


class TestGenerateWeeklyReport:
    @patch("ai_service.client")
    def test_returns_report_structure(self, mock_client):
        mock_client.messages.create.return_value = make_thinking_response(WEEKLY_REPORT_RESPONSE)
        result = generate_weekly_report(
            {"name": "Jane", "goal": "weight_loss"},
            [{"calories": 500, "protein_g": 35, "log_date": "2024-01-15"}] * 14,
            [{"completed": True, "duration_minutes": 45}] * 4,
            [{"steps": 8000}] * 7,
            [{"calorie_target": 2000}] * 7,
        )
        assert result["overall_grade"] == "B+"
        assert result["weekly_score"] == 78
        assert "stats_summary" in result
        assert "adjusted_plan" in result

    @patch("ai_service.client")
    def test_missed_workouts_computed_correctly(self, mock_client):
        mock_client.messages.create.return_value = make_thinking_response(WEEKLY_REPORT_RESPONSE)
        # 7 plans, 2 completed workouts → 5 missed
        generate_weekly_report(
            {"name": "Jane", "goal": "maintenance"},
            [],
            [{"completed": True, "duration_minutes": 30}] * 2,
            [],
            [{"calorie_target": 2000}] * 7,
        )
        prompt = mock_client.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "5" in prompt  # missed count in prompt

    @patch("ai_service.client")
    def test_empty_week_no_crash(self, mock_client):
        mock_client.messages.create.return_value = make_thinking_response(WEEKLY_REPORT_RESPONSE)
        result = generate_weekly_report({"name": "Jane", "goal": "maintenance"}, [], [], [], [])
        assert isinstance(result, dict)


# ── analyze_body_photo ────────────────────────────────────────────────────────

BODY_PHOTO_RESPONSE = {
    "bmi": 23.0,
    "bmi_category": "Normal weight",
    "estimated_body_fat_pct": 22.5,
    "estimated_muscle_mass_pct": 38.0,
    "lean_mass_kg": 50.7,
    "fat_mass_kg": 14.6,
    "muscle_development": {
        "upper_body": "moderate",
        "core": "developing",
        "lower_body": "moderate",
        "overall_symmetry": "good",
    },
    "posture_assessment": {"overall": "good", "notes": ["Slight forward head posture"]},
    "body_type": "Ecto-Mesomorph",
    "fitness_potential": "High potential for lean muscle gain",
    "health_indicators": {
        "cardiovascular_risk": "low - based on body composition",
        "metabolic_health_indicator": "likely good",
    },
    "goal_alignment": "Current physique is well-aligned with weight loss goal",
    "recommendations": [
        {"area": "Training", "recommendation": "Add progressive overload", "priority": "high"}
    ],
    "encouragement": "You're doing great! Keep building consistency.",
}


class TestAnalyzeBodyPhoto:
    @patch("ai_service.client")
    def test_returns_bmi_and_body_composition(self, mock_client):
        mock_client.messages.create.return_value = make_mock_response(BODY_PHOTO_RESPONSE)
        result = analyze_body_photo("base64data", 168.0, 65.0, 30, "weight_loss", "image/jpeg")
        assert result["bmi_category"] == "Normal weight"
        assert result["estimated_body_fat_pct"] == 22.5
        assert "recommendations" in result

    @patch("ai_service.client")
    def test_bmi_injected_into_prompt(self, mock_client):
        mock_client.messages.create.return_value = make_mock_response(BODY_PHOTO_RESPONSE)
        # BMI = 65 / (1.68^2) ≈ 23.0
        analyze_body_photo("data", 168.0, 65.0, 30, "weight_loss")
        prompt_content = mock_client.messages.create.call_args.kwargs["messages"][0]["content"]
        text_block = next(b for b in prompt_content if b.get("type") == "text")
        assert "23.0" in text_block["text"]

    @patch("ai_service.client")
    def test_image_sent_as_base64_content_block(self, mock_client):
        mock_client.messages.create.return_value = make_mock_response(BODY_PHOTO_RESPONSE)
        analyze_body_photo("myphotob64", 168.0, 65.0, 30, "muscle_gain", "image/png")
        content = mock_client.messages.create.call_args.kwargs["messages"][0]["content"]
        image_block = next(b for b in content if b.get("type") == "image")
        assert image_block["source"]["data"] == "myphotob64"
        assert image_block["source"]["media_type"] == "image/png"

    def test_bmi_calculation_is_correct(self):
        """BMI is computed in the function before the API call; verify the math."""
        with patch("ai_service.client") as mock_client:
            mock_client.messages.create.return_value = make_mock_response(BODY_PHOTO_RESPONSE)
            # height 200 cm, weight 80 kg → BMI = 80 / (2.0^2) = 20.0
            analyze_body_photo("data", 200.0, 80.0, 25, "maintenance")
            content = mock_client.messages.create.call_args.kwargs["messages"][0]["content"]
            text_block = next(b for b in content if b.get("type") == "text")
            assert "20.0" in text_block["text"]


# ── generate_adaptive_workout ─────────────────────────────────────────────────

ADAPTIVE_WORKOUT_RESPONSE = {
    "strategy": "Compressed 2-in-1 session to make up for missed days",
    "workout_name": "Full Body Catch-Up",
    "duration_minutes": 60,
    "intensity": "moderate",
    "focus": "Full body compound movements",
    "warmup": ["jumping jacks 2 min", "dynamic stretches"],
    "main_workout": [
        {"name": "Squat", "sets": 4, "reps": "12", "rest_seconds": 60, "modification": "Bodyweight squat"}
    ],
    "cooldown": ["quad stretch", "hamstring stretch"],
    "estimated_calories": 420,
    "motivation": "You're back and stronger! One session at a time.",
}


class TestGenerateAdaptiveWorkout:
    @patch("ai_service.client")
    def test_returns_workout_structure(self, mock_client):
        mock_client.messages.create.return_value = make_thinking_response(ADAPTIVE_WORKOUT_RESPONSE)
        result = generate_adaptive_workout(
            {"name": "Jane", "goal": "muscle_gain", "fitness_level": "intermediate", "age": 30},
            missed_workouts=2,
            upcoming_days=4,
            last_workout_type="Cardio",
        )
        assert result["workout_name"] == "Full Body Catch-Up"
        assert result["duration_minutes"] == 60
        assert "main_workout" in result

    @patch("ai_service.client")
    def test_prompt_mentions_missed_and_days_left(self, mock_client):
        mock_client.messages.create.return_value = make_thinking_response(ADAPTIVE_WORKOUT_RESPONSE)
        generate_adaptive_workout(
            {"name": "Jane", "goal": "weight_loss", "fitness_level": "beginner", "age": 25},
            missed_workouts=3,
            upcoming_days=2,
        )
        prompt = mock_client.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "3" in prompt   # missed_workouts
        assert "2" in prompt   # upcoming_days

    @patch("ai_service.client")
    def test_last_workout_type_none_handled(self, mock_client):
        mock_client.messages.create.return_value = make_thinking_response(ADAPTIVE_WORKOUT_RESPONSE)
        result = generate_adaptive_workout(
            {"name": "Bob", "goal": "endurance", "fitness_level": "advanced", "age": 40},
            missed_workouts=1,
            upcoming_days=3,
            last_workout_type=None,
        )
        assert isinstance(result, dict)
