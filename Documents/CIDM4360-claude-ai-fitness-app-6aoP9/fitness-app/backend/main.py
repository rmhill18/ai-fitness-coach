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
    DailyPlan,
    MealLog,
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
    return {"status": "ok", "version": "1.0.0"}


# ─── AI Coach Chat ────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


@app.post("/api/coach/chat/{user_id}")
async def coach_chat(
    user_id: int,
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_dict = {
        "name": user.name,
        "age": user.age,
        "goal": user.goal,
        "weight_kg": user.weight_kg,
        "height_cm": user.height_cm,
        "fitness_level": user.fitness_level,
        "activity_level": user.activity_level,
        "dietary_restrictions": user.dietary_restrictions,
    }

    history = [{"role": m.role, "content": m.content} for m in data.history]
    reply = ai_service.chat_with_coach(user_dict, data.message, history)
    return {"response": reply}
