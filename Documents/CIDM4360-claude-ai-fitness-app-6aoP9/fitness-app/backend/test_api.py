"""
Integration tests for the FastAPI endpoints in main.py.

Every test uses:
  - An in-memory SQLite database (via the `client` fixture in conftest.py)
  - Mocked ai_service functions so no real Claude API calls are made

Tests are grouped by resource: Users → Daily Plans → Meals → Workouts → Steps
→ Progress Analysis → Weekly Report → Body Analysis → Health.
"""

import io
import json
import pytest
from unittest.mock import patch, MagicMock

from conftest import SAMPLE_USER, SAMPLE_MEAL, SAMPLE_WORKOUT


# ── Shared AI mock payloads ───────────────────────────────────────────────────

MOCK_DAILY_PLAN = {
    "calorie_target": 2200,
    "protein_target_g": 165,
    "carb_target_g": 240,
    "fat_target_g": 72,
    "step_target": 9000,
    "water_target_ml": 2800,
    "ai_notes": "Keep it up!",
    "workout": {
        "type": "Upper Body Strength",
        "duration_minutes": 50,
        "estimated_calories_burned": 320,
        "warmup": ["arm circles"],
        "exercises": [{"name": "Push-up", "sets": 3, "reps": "15", "rest_seconds": 60, "notes": ""}],
        "cooldown": ["chest stretch"],
    },
    "meal_suggestions": {
        "breakfast": {"name": "Oats", "calories": 350, "protein_g": 15, "description": ""},
        "lunch": {"name": "Salad", "calories": 500, "protein_g": 35, "description": ""},
        "dinner": {"name": "Salmon", "calories": 650, "protein_g": 50, "description": ""},
        "snack": {"name": "Apple", "calories": 100, "protein_g": 1, "description": ""},
    },
}

MOCK_MEAL_ANALYSIS = {
    "description": "Grilled chicken with rice",
    "meal_name": "Chicken Rice Bowl",
    "confidence": "high",
    "calories": 520,
    "protein_g": 45.0,
    "carbs_g": 55.0,
    "fat_g": 10.0,
    "fiber_g": 4.0,
    "sugar_g": 2.0,
    "sodium_mg": 400.0,
    "vitamin_c_mg": 10.0,
    "calcium_mg": 50.0,
    "iron_mg": 2.5,
    "health_score": 8,
    "health_notes": "Balanced meal",
    "components": [],
    "suggestions": [],
}

MOCK_PROGRESS = {
    "overall_assessment": "Good week overall.",
    "progress_score": 7,
    "issues": [],
    "wins": ["Consistent workouts"],
    "top_priority": "Improve sleep",
    "adjusted_recommendation": {
        "calories": 2200,
        "protein_g": 165,
        "workouts_per_week": 5,
        "steps_per_day": 9000,
    },
}

MOCK_WEEKLY_REPORT = {
    "headline": "Solid week!",
    "overall_grade": "B+",
    "weekly_score": 78,
    "what_worked": [],
    "what_didnt_work": [],
    "stats_summary": {"consistency_score": 80, "nutrition_score": 72, "activity_score": 85, "recovery_score": 65},
    "next_week_focus": ["hydrate more"],
    "motivational_message": "Keep going!",
    "adjusted_plan": {"increase": [], "decrease": [], "maintain": []},
}

MOCK_BODY_ANALYSIS = {
    "bmi": 23.0,
    "bmi_category": "Normal weight",
    "estimated_body_fat_pct": 22.5,
    "estimated_muscle_mass_pct": 38.0,
    "lean_mass_kg": 50.7,
    "fat_mass_kg": 14.6,
    "muscle_development": {"upper_body": "moderate", "core": "developing", "lower_body": "moderate", "overall_symmetry": "good"},
    "posture_assessment": {"overall": "good", "notes": []},
    "body_type": "Ecto-Mesomorph",
    "fitness_potential": "High",
    "health_indicators": {"cardiovascular_risk": "low", "metabolic_health_indicator": "likely good"},
    "goal_alignment": "Well aligned",
    "recommendations": [],
    "encouragement": "Great work!",
}

MOCK_ADAPTIVE_WORKOUT = {
    "strategy": "Compressed session",
    "workout_name": "Full Body Catch-Up",
    "duration_minutes": 60,
    "intensity": "moderate",
    "focus": "Full body",
    "warmup": ["jumping jacks"],
    "main_workout": [{"name": "Squat", "sets": 3, "reps": "12", "rest_seconds": 60, "modification": "Bodyweight"}],
    "cooldown": ["stretch"],
    "estimated_calories": 400,
    "motivation": "You got this!",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def create_user(client) -> int:
    """Create a user and return their id."""
    r = await client.post("/api/users", json=SAMPLE_USER)
    assert r.status_code == 200
    return r.json()["id"]


def make_image_file(content: bytes = b"fake-image-data", content_type: str = "image/jpeg"):
    return ("file", (io.BytesIO(content), content_type))


# ── Health ─────────────────────────────────────────────────────────────────────

class TestHealth:
    async def test_health_check(self, client):
        r = await client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


# ── Users ─────────────────────────────────────────────────────────────────────

class TestUsers:
    async def test_create_user_returns_id_and_name(self, client):
        r = await client.post("/api/users", json=SAMPLE_USER)
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        assert data["name"] == SAMPLE_USER["name"]

    async def test_get_user_returns_full_profile(self, client):
        user_id = await create_user(client)
        r = await client.get(f"/api/users/{user_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == SAMPLE_USER["name"]
        assert data["goal"] == SAMPLE_USER["goal"]
        assert data["height_cm"] == SAMPLE_USER["height_cm"]

    async def test_get_nonexistent_user_returns_404(self, client):
        r = await client.get("/api/users/99999")
        assert r.status_code == 404

    async def test_update_user_changes_weight(self, client):
        user_id = await create_user(client)
        updated = {**SAMPLE_USER, "weight_kg": 62.0}
        r = await client.put(f"/api/users/{user_id}", json=updated)
        assert r.status_code == 200

        r2 = await client.get(f"/api/users/{user_id}")
        assert r2.json()["weight_kg"] == 62.0

    async def test_update_nonexistent_user_returns_404(self, client):
        r = await client.put("/api/users/99999", json=SAMPLE_USER)
        assert r.status_code == 404

    async def test_create_multiple_users_get_different_ids(self, client):
        r1 = await client.post("/api/users", json=SAMPLE_USER)
        r2 = await client.post("/api/users", json={**SAMPLE_USER, "name": "Bob Smith"})
        assert r1.json()["id"] != r2.json()["id"]


# ── Daily Plans ───────────────────────────────────────────────────────────────

class TestDailyPlan:
    async def test_create_daily_plan(self, client):
        user_id = await create_user(client)
        with patch("main.ai_service.generate_daily_plan", return_value=MOCK_DAILY_PLAN):
            r = await client.post("/api/daily-plan", params={"user_id": user_id, "plan_date": "2024-01-15"})
        assert r.status_code == 200
        data = r.json()
        assert data["calorie_target"] == 2200
        assert data["step_target"] == 9000
        assert data["workout"]["type"] == "Upper Body Strength"

    async def test_create_daily_plan_user_not_found(self, client):
        r = await client.post("/api/daily-plan", params={"user_id": 99999})
        assert r.status_code == 404

    async def test_get_daily_plan_returns_saved_plan(self, client):
        user_id = await create_user(client)
        with patch("main.ai_service.generate_daily_plan", return_value=MOCK_DAILY_PLAN):
            await client.post("/api/daily-plan", params={"user_id": user_id, "plan_date": "2024-01-15"})

        r = await client.get(f"/api/daily-plan/{user_id}", params={"plan_date": "2024-01-15"})
        assert r.status_code == 200
        data = r.json()
        assert data["calorie_target"] == 2200

    async def test_get_daily_plan_no_plan_returns_null(self, client):
        user_id = await create_user(client)
        r = await client.get(f"/api/daily-plan/{user_id}", params={"plan_date": "2000-01-01"})
        assert r.status_code == 200
        assert r.json() is None

    async def test_ai_notes_persisted(self, client):
        user_id = await create_user(client)
        with patch("main.ai_service.generate_daily_plan", return_value=MOCK_DAILY_PLAN):
            await client.post("/api/daily-plan", params={"user_id": user_id, "plan_date": "2024-01-15"})
        r = await client.get(f"/api/daily-plan/{user_id}", params={"plan_date": "2024-01-15"})
        assert r.json()["ai_notes"] == "Keep it up!"


# ── Meals ─────────────────────────────────────────────────────────────────────

class TestMeals:
    async def test_log_meal_returns_id(self, client):
        user_id = await create_user(client)
        payload = {**SAMPLE_MEAL, "user_id": user_id}
        r = await client.post("/api/meals", json=payload)
        assert r.status_code == 200
        assert "id" in r.json()

    async def test_get_meals_returns_logged_meals(self, client):
        user_id = await create_user(client)
        await client.post("/api/meals", json={**SAMPLE_MEAL, "user_id": user_id})
        r = await client.get(f"/api/meals/{user_id}", params={"log_date": "2024-01-15"})
        assert r.status_code == 200
        meals = r.json()
        assert len(meals) == 1
        assert meals[0]["description"] == SAMPLE_MEAL["description"]
        assert meals[0]["calories"] == SAMPLE_MEAL["calories"]

    async def test_get_meals_wrong_date_returns_empty(self, client):
        user_id = await create_user(client)
        await client.post("/api/meals", json={**SAMPLE_MEAL, "user_id": user_id})
        r = await client.get(f"/api/meals/{user_id}", params={"log_date": "2000-01-01"})
        assert r.json() == []

    async def test_multiple_meals_same_day(self, client):
        user_id = await create_user(client)
        for meal_type in ["breakfast", "lunch", "dinner"]:
            await client.post("/api/meals", json={**SAMPLE_MEAL, "user_id": user_id, "meal_type": meal_type})
        r = await client.get(f"/api/meals/{user_id}", params={"log_date": "2024-01-15"})
        assert len(r.json()) == 3

    async def test_delete_meal(self, client):
        user_id = await create_user(client)
        r = await client.post("/api/meals", json={**SAMPLE_MEAL, "user_id": user_id})
        meal_id = r.json()["id"]

        del_r = await client.delete(f"/api/meals/{meal_id}")
        assert del_r.status_code == 200

        meals = await client.get(f"/api/meals/{user_id}", params={"log_date": "2024-01-15"})
        assert meals.json() == []

    async def test_delete_nonexistent_meal_returns_404(self, client):
        r = await client.delete("/api/meals/99999")
        assert r.status_code == 404

    async def test_analyze_meal_photo_success(self, client):
        with patch("main.ai_service.analyze_meal_photo", return_value=MOCK_MEAL_ANALYSIS):
            r = await client.post(
                "/api/meals/analyze-photo",
                files={"file": ("meal.jpg", io.BytesIO(b"fake-image"), "image/jpeg")},
            )
        assert r.status_code == 200
        data = r.json()
        assert data["calories"] == 520
        assert data["meal_name"] == "Chicken Rice Bowl"

    async def test_analyze_meal_photo_rejects_non_image(self, client):
        r = await client.post(
            "/api/meals/analyze-photo",
            files={"file": ("doc.txt", io.BytesIO(b"not an image"), "text/plain")},
        )
        assert r.status_code == 400
        assert "image" in r.json()["detail"].lower()


# ── Workouts ──────────────────────────────────────────────────────────────────

class TestWorkouts:
    async def test_log_workout_returns_id(self, client):
        user_id = await create_user(client)
        r = await client.post("/api/workouts", json={**SAMPLE_WORKOUT, "user_id": user_id})
        assert r.status_code == 200
        assert "id" in r.json()

    async def test_get_workouts_returns_logged_entry(self, client):
        user_id = await create_user(client)
        # Use today's date so the `days=7` default includes it
        from datetime import date
        today = str(date.today())
        r = await client.post("/api/workouts", json={**SAMPLE_WORKOUT, "user_id": user_id, "log_date": today})
        assert r.status_code == 200

        r2 = await client.get(f"/api/workouts/{user_id}")
        workouts = r2.json()
        assert len(workouts) == 1
        assert workouts[0]["workout_type"] == SAMPLE_WORKOUT["workout_type"]

    async def test_get_workouts_respects_days_filter(self, client):
        user_id = await create_user(client)
        # Log a workout 30 days ago — should not appear with default days=7
        r = await client.post("/api/workouts", json={**SAMPLE_WORKOUT, "user_id": user_id, "log_date": "2020-01-01"})
        assert r.status_code == 200

        r2 = await client.get(f"/api/workouts/{user_id}", params={"days": 7})
        assert r2.json() == []

    async def test_adaptive_workout_user_not_found(self, client):
        r = await client.post("/api/workouts/adaptive", params={"user_id": 99999})
        assert r.status_code == 404

    async def test_adaptive_workout_returns_workout(self, client):
        user_id = await create_user(client)
        with patch("main.ai_service.generate_adaptive_workout", return_value=MOCK_ADAPTIVE_WORKOUT):
            r = await client.post("/api/workouts/adaptive", params={"user_id": user_id})
        assert r.status_code == 200
        data = r.json()
        assert data["workout_name"] == "Full Body Catch-Up"


# ── Steps ─────────────────────────────────────────────────────────────────────

class TestSteps:
    async def test_log_steps_creates_entry(self, client):
        user_id = await create_user(client)
        from datetime import date
        today = str(date.today())
        r = await client.post("/api/steps", json={"user_id": user_id, "log_date": today, "steps": 8000})
        assert r.status_code == 200

        r2 = await client.get(f"/api/steps/{user_id}")
        entries = r2.json()
        assert len(entries) == 1
        assert entries[0]["steps"] == 8000

    async def test_log_steps_upsert_updates_count(self, client):
        """Logging steps for the same date twice should update, not duplicate."""
        user_id = await create_user(client)
        from datetime import date
        today = str(date.today())

        await client.post("/api/steps", json={"user_id": user_id, "log_date": today, "steps": 5000})
        await client.post("/api/steps", json={"user_id": user_id, "log_date": today, "steps": 9500})

        r = await client.get(f"/api/steps/{user_id}")
        entries = r.json()
        # Should still be one entry, with the updated count
        assert len(entries) == 1
        assert entries[0]["steps"] == 9500

    async def test_get_steps_respects_days_filter(self, client):
        user_id = await create_user(client)
        r = await client.post("/api/steps", json={"user_id": user_id, "log_date": "2020-01-01", "steps": 10000})
        assert r.status_code == 200

        r2 = await client.get(f"/api/steps/{user_id}", params={"days": 7})
        assert r2.json() == []

    async def test_multiple_dates_all_returned(self, client):
        user_id = await create_user(client)
        from datetime import date, timedelta
        dates = [(date.today() - timedelta(days=i)).isoformat() for i in range(5)]
        for d in dates:
            await client.post("/api/steps", json={"user_id": user_id, "log_date": d, "steps": 7000})

        r = await client.get(f"/api/steps/{user_id}", params={"days": 7})
        assert len(r.json()) == 5


# ── Progress Analysis ─────────────────────────────────────────────────────────

class TestProgressAnalysis:
    async def test_analyze_progress_user_not_found(self, client):
        r = await client.get("/api/progress/analyze/99999")
        assert r.status_code == 404

    async def test_analyze_progress_returns_ai_result(self, client):
        user_id = await create_user(client)
        with patch("main.ai_service.analyze_progress", return_value=MOCK_PROGRESS):
            r = await client.get(f"/api/progress/analyze/{user_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["progress_score"] == 7
        assert "issues" in data
        assert "adjusted_recommendation" in data

    async def test_analyze_progress_with_no_data(self, client):
        """A user with no meals/workouts/steps should still get a response."""
        user_id = await create_user(client)
        with patch("main.ai_service.analyze_progress", return_value=MOCK_PROGRESS):
            r = await client.get(f"/api/progress/analyze/{user_id}")
        assert r.status_code == 200


# ── Weekly Report ─────────────────────────────────────────────────────────────

class TestWeeklyReport:
    async def test_weekly_report_user_not_found(self, client):
        r = await client.get("/api/weekly-report/99999")
        assert r.status_code == 404

    async def test_weekly_report_returns_report(self, client):
        user_id = await create_user(client)
        with patch("main.ai_service.generate_weekly_report", return_value=MOCK_WEEKLY_REPORT):
            r = await client.get(f"/api/weekly-report/{user_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["overall_grade"] == "B+"
        assert "week_start" in data
        assert "week_end" in data

    async def test_weekly_report_week_offset(self, client):
        """week_offset=1 should shift the date range back one week."""
        user_id = await create_user(client)
        with patch("main.ai_service.generate_weekly_report", return_value=MOCK_WEEKLY_REPORT):
            r0 = await client.get(f"/api/weekly-report/{user_id}", params={"week_offset": 0})
            r1 = await client.get(f"/api/weekly-report/{user_id}", params={"week_offset": 1})
        assert r0.json()["week_start"] != r1.json()["week_start"]


# ── Body Analysis ─────────────────────────────────────────────────────────────

class TestBodyAnalysis:
    async def test_analyze_body_user_not_found(self, client):
        r = await client.post(
            "/api/body/analyze/99999",
            files={"file": ("body.jpg", io.BytesIO(b"fake"), "image/jpeg")},
        )
        assert r.status_code == 404

    async def test_analyze_body_rejects_non_image(self, client):
        user_id = await create_user(client)
        r = await client.post(
            f"/api/body/analyze/{user_id}",
            files={"file": ("doc.pdf", io.BytesIO(b"not an image"), "application/pdf")},
        )
        assert r.status_code == 400
        assert "image" in r.json()["detail"].lower()

    async def test_analyze_body_returns_analysis(self, client):
        user_id = await create_user(client)
        with patch("main.ai_service.analyze_body_photo", return_value=MOCK_BODY_ANALYSIS):
            r = await client.post(
                f"/api/body/analyze/{user_id}",
                files={"file": ("body.jpg", io.BytesIO(b"fake-image"), "image/jpeg")},
            )
        assert r.status_code == 200
        data = r.json()
        assert data["bmi_category"] == "Normal weight"
        assert data["estimated_body_fat_pct"] == 22.5

    async def test_analyze_body_saves_to_history(self, client):
        user_id = await create_user(client)
        with patch("main.ai_service.analyze_body_photo", return_value=MOCK_BODY_ANALYSIS):
            await client.post(
                f"/api/body/analyze/{user_id}",
                files={"file": ("body.jpg", io.BytesIO(b"fake"), "image/jpeg")},
            )
        r = await client.get(f"/api/body/history/{user_id}")
        assert r.status_code == 200
        history = r.json()
        assert len(history) == 1
        assert history[0]["bmi_category"] == "Normal weight"

    async def test_body_history_empty_for_new_user(self, client):
        user_id = await create_user(client)
        r = await client.get(f"/api/body/history/{user_id}")
        assert r.status_code == 200
        assert r.json() == []
