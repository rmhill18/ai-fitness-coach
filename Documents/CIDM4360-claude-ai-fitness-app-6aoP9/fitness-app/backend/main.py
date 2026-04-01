import base64
import json
import os
from datetime import date, datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

import ai_service
from database import get_db, init_db
from models import (
    BodyAnalysis,
    CheckIn,
    DailyPlan,
    DeviceData,
    MealLog,
    NotificationSetting,
    SleepLog,
    StepLog,
    UserProfile,
    WeeklyReport,
    WorkoutLog,
)

load_dotenv()

app = FastAPI(title="AI Fitness Coach API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class UserProfileCreate(BaseModel):
    name: str
    age: int
    height_cm: float
    weight_kg: float
    goal: str  # weight_loss, muscle_gain, maintenance, endurance
    activity_level: str  # sedentary, light, moderate, very_active
    fitness_level: str  # beginner, intermediate, advanced
    dietary_restrictions: str = ""


class MealLogCreate(BaseModel):
    user_id: int
    log_date: str
    meal_type: str
    description: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float = 0
    sugar_g: float = 0
    sodium_mg: float = 0
    vitamin_c_mg: float = 0
    calcium_mg: float = 0
    iron_mg: float = 0


class WorkoutLogCreate(BaseModel):
    user_id: int
    log_date: str
    workout_type: str
    exercises: str  # JSON string
    duration_minutes: int
    calories_burned: float
    perceived_effort: int
    completed: bool = True
    notes: str = ""


class StepLogCreate(BaseModel):
    user_id: int
    log_date: str
    steps: int


class SleepLogCreate(BaseModel):
    user_id: int
    log_date: str
    hours_slept: float
    quality_score: int  # 1-10
    bedtime: str = ""
    wake_time: str = ""
    notes: str = ""


class CheckInCreate(BaseModel):
    user_id: int
    mood: int           # 1-5
    energy_level: int   # 1-10
    stress_level: int   # 1-10
    logged_meals: bool = False
    completed_workout: bool = False
    hit_water_goal: bool = False
    notes: str = ""


class NotificationSettingUpdate(BaseModel):
    meal_reminders: bool = True
    workout_reminders: bool = True
    checkin_reminders: bool = True
    water_reminders: bool = True
    morning_checkin_time: str = "07:00"
    meal_reminder_times: str = '["08:00","12:00","18:00"]'
    workout_reminder_time: str = "17:00"
    push_endpoint: str = ""
    push_keys: str = ""


class DeviceDataCreate(BaseModel):
    user_id: int
    log_date: str
    device_type: str = "manual"
    sleep_score: Optional[int] = None
    sleep_hours: Optional[float] = None
    sleep_stages: str = "{}"
    hrv_ms: Optional[float] = None
    resting_hr: Optional[int] = None
    steps: Optional[int] = None
    active_calories: Optional[int] = None
    total_calories: Optional[int] = None
    active_minutes: Optional[int] = None
    recovery_score: Optional[int] = None
    readiness_score: Optional[int] = None
    spo2_pct: Optional[float] = None
    stress_score: Optional[int] = None
    raw_data: str = "{}"


class FastFoodRequest(BaseModel):
    restaurant: str
    item: str
    size: str = "regular"


class QuickDirectiveRequest(BaseModel):
    user_id: int
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[int] = None
    mood: Optional[int] = None
    energy: Optional[int] = None
    missed_workouts: Optional[int] = 0


class BudgetPlanRequest(BaseModel):
    user_id: int
    daily_budget_usd: float = 10.0


class TimeBasedWorkoutRequest(BaseModel):
    user_id: int
    available_minutes: int
    equipment: str = "none"
    focus: Optional[str] = None


class FoodAdvisorRequest(BaseModel):
    user_id: int
    situation: str
    context: Optional[str] = None


# ─── User Routes ──────────────────────────────────────────────────────────────

@app.post("/api/users")
async def create_user(data: UserProfileCreate, db: AsyncSession = Depends(get_db)):
    user = UserProfile(**data.model_dump())
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": user.id, "name": user.name, "message": "Profile created!"}


@app.get("/api/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id, "name": user.name, "age": user.age,
        "height_cm": user.height_cm, "weight_kg": user.weight_kg,
        "goal": user.goal, "activity_level": user.activity_level,
        "fitness_level": user.fitness_level,
        "dietary_restrictions": user.dietary_restrictions,
    }


@app.put("/api/users/{user_id}")
async def update_user(
    user_id: int, data: UserProfileCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for k, v in data.model_dump().items():
        setattr(user, k, v)
    await db.commit()
    return {"message": "Profile updated"}


# ─── Daily Plan Routes ────────────────────────────────────────────────────────

@app.post("/api/daily-plan")
async def create_daily_plan(
    user_id: int,
    plan_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    target_date = date.fromisoformat(plan_date) if plan_date else date.today()

    # Gather recent data (last 7 days)
    seven_days_ago = target_date - timedelta(days=7)
    meals_result = await db.execute(
        select(MealLog).where(
            and_(MealLog.user_id == user_id, MealLog.log_date >= seven_days_ago)
        )
    )
    recent_meals = [
        {"calories": m.calories, "protein_g": m.protein_g}
        for m in meals_result.scalars().all()
    ]

    workouts_result = await db.execute(
        select(WorkoutLog).where(
            and_(WorkoutLog.user_id == user_id, WorkoutLog.log_date >= seven_days_ago)
        )
    )
    recent_workouts = [
        {"workout_type": w.workout_type, "completed": w.completed}
        for w in workouts_result.scalars().all()
    ]

    plans_result = await db.execute(
        select(DailyPlan).where(
            and_(DailyPlan.user_id == user_id, DailyPlan.plan_date >= seven_days_ago)
        )
    )
    plan_count = len(plans_result.scalars().all())
    missed = max(0, plan_count - len(recent_workouts))

    user_dict = {
        "name": user.name, "age": user.age, "height_cm": user.height_cm,
        "weight_kg": user.weight_kg, "goal": user.goal,
        "activity_level": user.activity_level, "fitness_level": user.fitness_level,
        "dietary_restrictions": user.dietary_restrictions,
    }

    ai_plan = ai_service.generate_daily_plan(
        user_dict, recent_meals, recent_workouts, missed
    )

    plan = DailyPlan(
        user_id=user_id,
        plan_date=target_date,
        workout_plan=json.dumps(ai_plan.get("workout", {})),
        calorie_target=ai_plan.get("calorie_target", 2000),
        protein_target_g=ai_plan.get("protein_target_g", 150),
        carb_target_g=ai_plan.get("carb_target_g", 200),
        fat_target_g=ai_plan.get("fat_target_g", 65),
        step_target=ai_plan.get("step_target", 8000),
        water_target_ml=ai_plan.get("water_target_ml", 2500),
        ai_notes=ai_plan.get("ai_notes", ""),
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    return {
        "id": plan.id,
        "plan_date": str(plan.plan_date),
        "calorie_target": plan.calorie_target,
        "protein_target_g": plan.protein_target_g,
        "carb_target_g": plan.carb_target_g,
        "fat_target_g": plan.fat_target_g,
        "step_target": plan.step_target,
        "water_target_ml": plan.water_target_ml,
        "ai_notes": plan.ai_notes,
        "workout": ai_plan.get("workout", {}),
        "meal_suggestions": ai_plan.get("meal_suggestions", {}),
    }


@app.get("/api/daily-plan/{user_id}")
async def get_daily_plan(
    user_id: int,
    plan_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    target_date = date.fromisoformat(plan_date) if plan_date else date.today()
    result = await db.execute(
        select(DailyPlan).where(
            and_(DailyPlan.user_id == user_id, DailyPlan.plan_date == target_date)
        )
    )
    plan = result.scalar_one_or_none()
    if not plan:
        return None
    return {
        "id": plan.id,
        "plan_date": str(plan.plan_date),
        "calorie_target": plan.calorie_target,
        "protein_target_g": plan.protein_target_g,
        "carb_target_g": plan.carb_target_g,
        "fat_target_g": plan.fat_target_g,
        "step_target": plan.step_target,
        "water_target_ml": plan.water_target_ml,
        "ai_notes": plan.ai_notes,
        "workout": json.loads(plan.workout_plan) if plan.workout_plan else {},
    }


# ─── Meal Routes ──────────────────────────────────────────────────────────────

@app.post("/api/meals/analyze-photo")
async def analyze_meal_photo(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    contents = await file.read()
    b64 = base64.standard_b64encode(contents).decode("utf-8")
    media_type = file.content_type
    result = ai_service.analyze_meal_photo(b64, media_type)
    return result


@app.post("/api/meals")
async def log_meal(data: MealLogCreate, db: AsyncSession = Depends(get_db)):
    meal = MealLog(
        user_id=data.user_id,
        log_date=date.fromisoformat(data.log_date),
        meal_type=data.meal_type,
        description=data.description,
        calories=data.calories,
        protein_g=data.protein_g,
        carbs_g=data.carbs_g,
        fat_g=data.fat_g,
        fiber_g=data.fiber_g,
        sugar_g=data.sugar_g,
        sodium_mg=data.sodium_mg,
        vitamin_c_mg=data.vitamin_c_mg,
        calcium_mg=data.calcium_mg,
        iron_mg=data.iron_mg,
    )
    db.add(meal)
    await db.commit()
    await db.refresh(meal)
    return {"id": meal.id, "message": "Meal logged"}


@app.get("/api/meals/{user_id}")
async def get_meals(
    user_id: int,
    log_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    target_date = date.fromisoformat(log_date) if log_date else date.today()
    result = await db.execute(
        select(MealLog).where(
            and_(MealLog.user_id == user_id, MealLog.log_date == target_date)
        )
    )
    meals = result.scalars().all()
    return [
        {
            "id": m.id, "meal_type": m.meal_type, "description": m.description,
            "calories": m.calories, "protein_g": m.protein_g,
            "carbs_g": m.carbs_g, "fat_g": m.fat_g,
            "fiber_g": m.fiber_g, "sugar_g": m.sugar_g,
            "sodium_mg": m.sodium_mg, "created_at": str(m.created_at),
        }
        for m in meals
    ]


@app.delete("/api/meals/{meal_id}")
async def delete_meal(meal_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MealLog).where(MealLog.id == meal_id))
    meal = result.scalar_one_or_none()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    await db.delete(meal)
    await db.commit()
    return {"message": "Meal deleted"}


# ─── Workout Routes ───────────────────────────────────────────────────────────

@app.post("/api/workouts")
async def log_workout(data: WorkoutLogCreate, db: AsyncSession = Depends(get_db)):
    workout = WorkoutLog(
        user_id=data.user_id,
        log_date=date.fromisoformat(data.log_date),
        workout_type=data.workout_type,
        exercises=data.exercises,
        duration_minutes=data.duration_minutes,
        calories_burned=data.calories_burned,
        perceived_effort=data.perceived_effort,
        completed=data.completed,
        notes=data.notes,
    )
    db.add(workout)
    await db.commit()
    await db.refresh(workout)
    return {"id": workout.id, "message": "Workout logged"}


@app.get("/api/workouts/{user_id}")
async def get_workouts(
    user_id: int,
    days: int = 7,
    db: AsyncSession = Depends(get_db),
):
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(WorkoutLog).where(
            and_(WorkoutLog.user_id == user_id, WorkoutLog.log_date >= since)
        )
    )
    workouts = result.scalars().all()
    return [
        {
            "id": w.id, "log_date": str(w.log_date), "workout_type": w.workout_type,
            "duration_minutes": w.duration_minutes, "calories_burned": w.calories_burned,
            "perceived_effort": w.perceived_effort, "completed": w.completed,
            "notes": w.notes,
        }
        for w in workouts
    ]


@app.post("/api/workouts/adaptive")
async def get_adaptive_workout(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    week_start = date.today() - timedelta(days=date.today().weekday())
    workouts_result = await db.execute(
        select(WorkoutLog).where(
            and_(WorkoutLog.user_id == user_id, WorkoutLog.log_date >= week_start)
        )
    )
    workouts = workouts_result.scalars().all()
    plans_result = await db.execute(
        select(DailyPlan).where(
            and_(DailyPlan.user_id == user_id, DailyPlan.plan_date >= week_start)
        )
    )
    plans = plans_result.scalars().all()
    missed = max(0, len(plans) - len(workouts))
    days_left = 7 - date.today().weekday()
    last_type = workouts[-1].workout_type if workouts else None

    user_dict = {
        "name": user.name, "goal": user.goal,
        "fitness_level": user.fitness_level, "age": user.age,
    }
    workout = ai_service.generate_adaptive_workout(user_dict, missed, days_left, last_type)
    return workout


# ─── Steps Routes ─────────────────────────────────────────────────────────────

@app.post("/api/steps")
async def log_steps(data: StepLogCreate, db: AsyncSession = Depends(get_db)):
    # Upsert
    result = await db.execute(
        select(StepLog).where(
            and_(
                StepLog.user_id == data.user_id,
                StepLog.log_date == date.fromisoformat(data.log_date),
            )
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.steps = data.steps
    else:
        db.add(StepLog(
            user_id=data.user_id,
            log_date=date.fromisoformat(data.log_date),
            steps=data.steps,
        ))
    await db.commit()
    return {"message": "Steps logged"}


@app.get("/api/steps/{user_id}")
async def get_steps(user_id: int, days: int = 7, db: AsyncSession = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(StepLog).where(
            and_(StepLog.user_id == user_id, StepLog.log_date >= since)
        )
    )
    return [
        {"log_date": str(s.log_date), "steps": s.steps}
        for s in result.scalars().all()
    ]


# ─── Progress Analysis ────────────────────────────────────────────────────────

@app.get("/api/progress/analyze/{user_id}")
async def analyze_progress(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    seven_days_ago = date.today() - timedelta(days=7)
    meals_r = await db.execute(
        select(MealLog).where(
            and_(MealLog.user_id == user_id, MealLog.log_date >= seven_days_ago)
        )
    )
    workouts_r = await db.execute(
        select(WorkoutLog).where(
            and_(WorkoutLog.user_id == user_id, WorkoutLog.log_date >= seven_days_ago)
        )
    )
    plans_r = await db.execute(
        select(DailyPlan).where(
            and_(DailyPlan.user_id == user_id, DailyPlan.plan_date >= seven_days_ago)
        )
    )
    steps_r = await db.execute(
        select(StepLog).where(
            and_(StepLog.user_id == user_id, StepLog.log_date >= seven_days_ago)
        )
    )

    meals = [{"calories": m.calories, "protein_g": m.protein_g} for m in meals_r.scalars()]
    workouts = [{"completed": w.completed, "workout_type": w.workout_type} for w in workouts_r.scalars()]
    plans = [{"calorie_target": p.calorie_target} for p in plans_r.scalars()]
    steps = [{"steps": s.steps} for s in steps_r.scalars()]

    user_dict = {
        "name": user.name, "goal": user.goal, "age": user.age,
        "weight_kg": user.weight_kg, "height_cm": user.height_cm,
    }
    return ai_service.analyze_progress(user_dict, meals, workouts, plans, steps)


# ─── Weekly Report ────────────────────────────────────────────────────────────

@app.get("/api/weekly-report/{user_id}")
async def get_weekly_report(
    user_id: int,
    week_offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today = date.today()
    week_start = today - timedelta(days=today.weekday()) - timedelta(weeks=week_offset)
    week_end = week_start + timedelta(days=6)

    meals_r = await db.execute(
        select(MealLog).where(
            and_(
                MealLog.user_id == user_id,
                MealLog.log_date >= week_start,
                MealLog.log_date <= week_end,
            )
        )
    )
    workouts_r = await db.execute(
        select(WorkoutLog).where(
            and_(
                WorkoutLog.user_id == user_id,
                WorkoutLog.log_date >= week_start,
                WorkoutLog.log_date <= week_end,
            )
        )
    )
    plans_r = await db.execute(
        select(DailyPlan).where(
            and_(
                DailyPlan.user_id == user_id,
                DailyPlan.plan_date >= week_start,
                DailyPlan.plan_date <= week_end,
            )
        )
    )
    steps_r = await db.execute(
        select(StepLog).where(
            and_(
                StepLog.user_id == user_id,
                StepLog.log_date >= week_start,
                StepLog.log_date <= week_end,
            )
        )
    )

    meals = [{"calories": m.calories, "protein_g": m.protein_g, "log_date": str(m.log_date)} for m in meals_r.scalars()]
    workouts = [{"completed": w.completed, "duration_minutes": w.duration_minutes} for w in workouts_r.scalars()]
    plans = [{"calorie_target": p.calorie_target} for p in plans_r.scalars()]
    steps = [{"steps": s.steps} for s in steps_r.scalars()]

    user_dict = {"name": user.name, "goal": user.goal}
    report = ai_service.generate_weekly_report(user_dict, meals, workouts, steps, plans)
    report["week_start"] = str(week_start)
    report["week_end"] = str(week_end)
    return report


# ─── Body Analysis ────────────────────────────────────────────────────────────

@app.post("/api/body/analyze/{user_id}")
async def analyze_body(
    user_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    b64 = base64.standard_b64encode(contents).decode("utf-8")

    analysis = ai_service.analyze_body_photo(
        b64, user.height_cm, user.weight_kg, user.age, user.goal, file.content_type
    )

    record = BodyAnalysis(
        user_id=user_id,
        analysis_date=date.today(),
        estimated_bmi=analysis.get("bmi"),
        bmi_category=analysis.get("bmi_category"),
        estimated_body_fat_pct=analysis.get("estimated_body_fat_pct"),
        estimated_muscle_mass_pct=analysis.get("estimated_muscle_mass_pct"),
        posture_notes=json.dumps(analysis.get("posture_assessment", {})),
        ai_assessment=json.dumps(analysis),
        recommendations=json.dumps(analysis.get("recommendations", [])),
    )
    db.add(record)
    await db.commit()

    return analysis


@app.get("/api/body/history/{user_id}")
async def get_body_history(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BodyAnalysis)
        .where(BodyAnalysis.user_id == user_id)
        .order_by(BodyAnalysis.analysis_date.desc())
        .limit(10)
    )
    analyses = result.scalars().all()
    return [
        {
            "id": a.id,
            "analysis_date": str(a.analysis_date),
            "estimated_bmi": a.estimated_bmi,
            "bmi_category": a.bmi_category,
            "estimated_body_fat_pct": a.estimated_body_fat_pct,
            "estimated_muscle_mass_pct": a.estimated_muscle_mass_pct,
        }
        for a in analyses
    ]


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}


# ─── Sleep Routes ─────────────────────────────────────────────────────────────

@app.post("/api/sleep")
async def log_sleep(data: SleepLogCreate, db: AsyncSession = Depends(get_db)):
    # Upsert by user + date
    result = await db.execute(
        select(SleepLog).where(
            and_(SleepLog.user_id == data.user_id,
                 SleepLog.log_date == date.fromisoformat(data.log_date))
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        for k, v in data.model_dump().items():
            if k not in ("user_id", "log_date"):
                setattr(existing, k, v)
    else:
        db.add(SleepLog(
            user_id=data.user_id,
            log_date=date.fromisoformat(data.log_date),
            hours_slept=data.hours_slept,
            quality_score=data.quality_score,
            bedtime=data.bedtime,
            wake_time=data.wake_time,
            notes=data.notes,
        ))
    await db.commit()
    return {"message": "Sleep logged"}


@app.get("/api/sleep/{user_id}")
async def get_sleep(user_id: int, days: int = 14, db: AsyncSession = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(SleepLog).where(
            and_(SleepLog.user_id == user_id, SleepLog.log_date >= since)
        ).order_by(SleepLog.log_date.desc())
    )
    return [
        {
            "id": s.id, "log_date": str(s.log_date),
            "hours_slept": s.hours_slept, "quality_score": s.quality_score,
            "bedtime": s.bedtime, "wake_time": s.wake_time, "notes": s.notes,
        }
        for s in result.scalars().all()
    ]


# ─── Check-In Routes ──────────────────────────────────────────────────────────

@app.post("/api/checkin")
async def create_checkin(data: CheckInCreate, db: AsyncSession = Depends(get_db)):
    today = date.today()
    # Upsert today's check-in
    result = await db.execute(
        select(CheckIn).where(
            and_(CheckIn.user_id == data.user_id, CheckIn.checkin_date == today)
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.mood = data.mood
        existing.energy_level = data.energy_level
        existing.stress_level = data.stress_level
        existing.logged_meals = data.logged_meals
        existing.completed_workout = data.completed_workout
        existing.hit_water_goal = data.hit_water_goal
        existing.notes = data.notes
    else:
        db.add(CheckIn(
            user_id=data.user_id,
            checkin_date=today,
            mood=data.mood,
            energy_level=data.energy_level,
            stress_level=data.stress_level,
            logged_meals=data.logged_meals,
            completed_workout=data.completed_workout,
            hit_water_goal=data.hit_water_goal,
            notes=data.notes,
        ))
    await db.commit()
    return {"message": "Check-in saved"}


@app.get("/api/checkin/{user_id}")
async def get_checkins(user_id: int, days: int = 30, db: AsyncSession = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(CheckIn).where(
            and_(CheckIn.user_id == user_id, CheckIn.checkin_date >= since)
        ).order_by(CheckIn.checkin_date.desc())
    )
    checkins = result.scalars().all()
    streak = 0
    today = date.today()
    for i, c in enumerate(checkins):
        expected = today - timedelta(days=i)
        if c.checkin_date == expected:
            streak += 1
        else:
            break
    return {
        "streak": streak,
        "checkins": [
            {
                "id": c.id, "checkin_date": str(c.checkin_date),
                "mood": c.mood, "energy_level": c.energy_level,
                "stress_level": c.stress_level, "logged_meals": c.logged_meals,
                "completed_workout": c.completed_workout,
                "hit_water_goal": c.hit_water_goal, "notes": c.notes,
            }
            for c in checkins
        ],
    }


# ─── Notification Settings Routes ─────────────────────────────────────────────

@app.get("/api/notifications/{user_id}")
async def get_notification_settings(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(NotificationSetting).where(NotificationSetting.user_id == user_id)
    )
    ns = result.scalar_one_or_none()
    if not ns:
        return {
            "meal_reminders": True, "workout_reminders": True,
            "checkin_reminders": True, "water_reminders": True,
            "morning_checkin_time": "07:00",
            "meal_reminder_times": '["08:00","12:00","18:00"]',
            "workout_reminder_time": "17:00",
            "push_endpoint": "", "push_keys": "",
        }
    return {
        "meal_reminders": ns.meal_reminders,
        "workout_reminders": ns.workout_reminders,
        "checkin_reminders": ns.checkin_reminders,
        "water_reminders": ns.water_reminders,
        "morning_checkin_time": ns.morning_checkin_time,
        "meal_reminder_times": ns.meal_reminder_times,
        "workout_reminder_time": ns.workout_reminder_time,
        "push_endpoint": ns.push_endpoint,
        "push_keys": ns.push_keys,
    }


@app.put("/api/notifications/{user_id}")
async def update_notification_settings(
    user_id: int, data: NotificationSettingUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(NotificationSetting).where(NotificationSetting.user_id == user_id)
    )
    ns = result.scalar_one_or_none()
    if ns:
        for k, v in data.model_dump().items():
            setattr(ns, k, v)
    else:
        db.add(NotificationSetting(user_id=user_id, **data.model_dump()))
    await db.commit()
    return {"message": "Notification settings updated"}


# ─── Device Data Routes ───────────────────────────────────────────────────────

@app.post("/api/device-data")
async def log_device_data(data: DeviceDataCreate, db: AsyncSession = Depends(get_db)):
    log_date = date.fromisoformat(data.log_date)
    result = await db.execute(
        select(DeviceData).where(
            and_(DeviceData.user_id == data.user_id, DeviceData.log_date == log_date)
        )
    )
    existing = result.scalar_one_or_none()
    fields = data.model_dump()
    fields.pop("user_id")
    fields.pop("log_date")
    if existing:
        for k, v in fields.items():
            if v is not None:
                setattr(existing, k, v)
    else:
        db.add(DeviceData(user_id=data.user_id, log_date=log_date, **fields))
    await db.commit()
    return {"message": "Device data logged"}


@app.get("/api/device-data/{user_id}")
async def get_device_data(user_id: int, days: int = 7, db: AsyncSession = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(DeviceData).where(
            and_(DeviceData.user_id == user_id, DeviceData.log_date >= since)
        ).order_by(DeviceData.log_date.desc())
    )
    data_rows = result.scalars().all()
    return [
        {
            "id": d.id, "log_date": str(d.log_date), "device_type": d.device_type,
            "sleep_score": d.sleep_score, "sleep_hours": d.sleep_hours,
            "sleep_stages": d.sleep_stages, "hrv_ms": d.hrv_ms,
            "resting_hr": d.resting_hr, "steps": d.steps,
            "active_calories": d.active_calories, "total_calories": d.total_calories,
            "active_minutes": d.active_minutes, "recovery_score": d.recovery_score,
            "readiness_score": d.readiness_score, "spo2_pct": d.spo2_pct,
            "stress_score": d.stress_score,
        }
        for d in data_rows
    ]


# ─── Quick Directive Route ────────────────────────────────────────────────────

@app.post("/api/quick-directive")
async def get_quick_directive(data: QuickDirectiveRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).where(UserProfile.id == data.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_dict = {
        "name": user.name, "goal": user.goal,
        "fitness_level": user.fitness_level, "age": user.age,
        "weight_kg": user.weight_kg, "height_cm": user.height_cm,
        "dietary_restrictions": user.dietary_restrictions,
    }
    context = {
        "sleep_hours": data.sleep_hours,
        "sleep_quality": data.sleep_quality,
        "mood": data.mood,
        "energy": data.energy,
        "missed_workouts": data.missed_workouts,
    }
    return ai_service.generate_quick_directive(user_dict, context)


# ─── Fast Food Nutrition Route ────────────────────────────────────────────────

@app.post("/api/meals/fast-food")
async def get_fast_food_nutrition(data: FastFoodRequest):
    return ai_service.get_fast_food_nutrition(data.restaurant, data.item, data.size)


# ─── Budget Plan Route ────────────────────────────────────────────────────────

@app.post("/api/budget-plan")
async def get_budget_plan(data: BudgetPlanRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).where(UserProfile.id == data.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_dict = {
        "name": user.name, "goal": user.goal, "weight_kg": user.weight_kg,
        "height_cm": user.height_cm, "dietary_restrictions": user.dietary_restrictions,
    }
    return ai_service.generate_budget_meal_plan(user_dict, data.daily_budget_usd)


# ─── Time-Based Workout Route ─────────────────────────────────────────────────

@app.post("/api/workouts/time-based")
async def get_time_based_workout(
    data: TimeBasedWorkoutRequest, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserProfile).where(UserProfile.id == data.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_dict = {
        "name": user.name, "goal": user.goal,
        "fitness_level": user.fitness_level, "age": user.age,
    }
    return ai_service.generate_time_based_workout(
        user_dict, data.available_minutes, data.equipment, data.focus
    )


# ─── Recomposition Plan Route ─────────────────────────────────────────────────

@app.get("/api/recomp-plan/{user_id}")
async def get_recomp_plan(
    user_id: int, weeks: int = 8, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_dict = {
        "name": user.name, "goal": user.goal, "age": user.age,
        "weight_kg": user.weight_kg, "height_cm": user.height_cm,
        "fitness_level": user.fitness_level, "activity_level": user.activity_level,
    }
    return ai_service.generate_recomp_plan(user_dict, weeks)


# ─── Food Advisor Route ───────────────────────────────────────────────────────

@app.post("/api/food-advisor")
async def food_advisor(data: FoodAdvisorRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).where(UserProfile.id == data.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get today's calorie target for context
    plan_result = await db.execute(
        select(DailyPlan).where(
            and_(DailyPlan.user_id == data.user_id, DailyPlan.plan_date == date.today())
        )
    )
    plan = plan_result.scalar_one_or_none()

    user_dict = {
        "name": user.name, "goal": user.goal,
        "dietary_restrictions": user.dietary_restrictions,
        "calorie_target": plan.calorie_target if plan else 2000,
    }
    return ai_service.get_food_recommendation(user_dict, data.situation, data.context)
