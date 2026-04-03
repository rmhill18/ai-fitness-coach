import base64
import hashlib
import json
import os
from datetime import date, datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
load_dotenv()  # Must run before any module that reads env vars (e.g. ai_service)

from fastapi import Depends, FastAPI, File, HTTPException, Security, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
import bcrypt as _bcrypt_lib
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

import ai_service
from database import get_db, init_db
from models import (
    BodyAnalysis,
    DailyCheckin,
    DailyPlan,
    DevicePushToken,
    MealLog,
    StepLog,
    UserAuth,
    UserProfile,
    WearableData,
    WeeklyReport,
    WorkoutLog,
)

# ─── Security / JWT ───────────────────────────────────────────────────────────

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-to-a-long-random-secret-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30

bearer_scheme = HTTPBearer(auto_error=False)


def _prepare_password(password: str) -> bytes:
    """SHA-256 hash the password first so it is always exactly 32 bytes —
    well under bcrypt's 72-byte hard limit regardless of input length."""
    return hashlib.sha256(password.encode("utf-8")).digest()


def _hash_password(password: str) -> str:
    return _bcrypt_lib.hashpw(_prepare_password(password), _bcrypt_lib.gensalt()).decode("utf-8")


def _verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt_lib.checkpw(_prepare_password(plain), hashed.encode("utf-8"))


def _create_token(user_auth_id: int, email: str, user_profile_id: Optional[int]) -> str:
    expire = datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(user_auth_id), "email": email, "user_id": user_profile_id, "exp": expire},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


async def get_current_auth(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> UserAuth:
    """Dependency that validates JWT and returns the UserAuth record."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        auth_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    result = await db.execute(select(UserAuth).where(UserAuth.id == auth_id))
    auth = result.scalar_one_or_none()
    if not auth:
        raise HTTPException(status_code=401, detail="User not found")
    return auth


app = FastAPI(title="AI Fitness Coach API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost",          # Capacitor Android
        "capacitor://localhost",     # Capacitor iOS
        "ionic://localhost",
    ],
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


# ─── Auth Routes ──────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/api/auth/register")
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check duplicate email
    existing = await db.execute(select(UserAuth).where(UserAuth.email == data.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    auth = UserAuth(email=data.email.lower(), hashed_password=_hash_password(data.password))
    db.add(auth)
    await db.commit()
    await db.refresh(auth)
    token = _create_token(auth.id, auth.email, None)
    return {"access_token": token, "token_type": "bearer", "user_id": None, "has_profile": False}


@app.post("/api/auth/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserAuth).where(UserAuth.email == data.email.lower()))
    auth = result.scalar_one_or_none()
    if not auth or not _verify_password(data.password, auth.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = _create_token(auth.id, auth.email, auth.user_profile_id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": auth.user_profile_id,
        "has_profile": auth.user_profile_id is not None,
    }


@app.get("/api/auth/me")
async def auth_me(auth: UserAuth = Depends(get_current_auth)):
    return {"email": auth.email, "user_id": auth.user_profile_id, "has_profile": auth.user_profile_id is not None}


# ─── Push Token ───────────────────────────────────────────────────────────────

class PushTokenRequest(BaseModel):
    user_id: int
    token: str
    platform: str  # ios, android, web


@app.post("/api/push-token")
async def save_push_token(data: PushTokenRequest, db: AsyncSession = Depends(get_db)):
    # Upsert: one token per user per platform
    result = await db.execute(
        select(DevicePushToken).where(
            and_(DevicePushToken.user_id == data.user_id, DevicePushToken.platform == data.platform)
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.token = data.token
    else:
        db.add(DevicePushToken(user_id=data.user_id, token=data.token, platform=data.platform))
    await db.commit()
    return {"message": "Push token saved"}


# ─── User Routes ──────────────────────────────────────────────────────────────

@app.post("/api/users")
async def create_user(
    data: UserProfileCreate,
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    user = UserProfile(**data.model_dump())
    db.add(user)
    await db.commit()
    await db.refresh(user)
    # Link profile to auth account if JWT provided
    if credentials:
        try:
            payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            auth_id = int(payload["sub"])
            auth_result = await db.execute(select(UserAuth).where(UserAuth.id == auth_id))
            auth = auth_result.scalar_one_or_none()
            if auth:
                auth.user_profile_id = user.id
                await db.commit()
        except (JWTError, KeyError, ValueError):
            pass
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


# ─── Wearable / Health Data ───────────────────────────────────────────────────

class WearableDataCreate(BaseModel):
    user_id: int
    log_date: str
    sleep_score: Optional[int] = None
    sleep_hours: Optional[float] = None
    hrv_ms: Optional[float] = None
    resting_heart_rate: Optional[int] = None
    recovery_score: Optional[int] = None
    spo2_pct: Optional[float] = None
    steps: Optional[int] = None
    active_calories: Optional[int] = None
    device_type: str = "manual"


@app.post("/api/wearable")
async def log_wearable(data: WearableDataCreate, db: AsyncSession = Depends(get_db)):
    # Upsert by user + date
    result = await db.execute(
        select(WearableData).where(
            and_(
                WearableData.user_id == data.user_id,
                WearableData.log_date == date.fromisoformat(data.log_date),
            )
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        for k, v in data.model_dump(exclude={"user_id", "log_date"}).items():
            if v is not None:
                setattr(existing, k, v)
    else:
        db.add(WearableData(
            user_id=data.user_id,
            log_date=date.fromisoformat(data.log_date),
            **{k: v for k, v in data.model_dump(exclude={"user_id", "log_date"}).items() if v is not None},
        ))
    await db.commit()
    return {"message": "Wearable data saved"}


@app.get("/api/wearable/{user_id}")
async def get_wearable(user_id: int, days: int = 7, db: AsyncSession = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(WearableData).where(
            and_(WearableData.user_id == user_id, WearableData.log_date >= since)
        ).order_by(WearableData.log_date.desc())
    )
    records = result.scalars().all()
    return [
        {
            "id": r.id,
            "log_date": str(r.log_date),
            "sleep_score": r.sleep_score,
            "sleep_hours": r.sleep_hours,
            "hrv_ms": r.hrv_ms,
            "resting_heart_rate": r.resting_heart_rate,
            "recovery_score": r.recovery_score,
            "spo2_pct": r.spo2_pct,
            "steps": r.steps,
            "active_calories": r.active_calories,
            "device_type": r.device_type,
        }
        for r in records
    ]


# ─── Daily Check-in ───────────────────────────────────────────────────────────

class DailyCheckinCreate(BaseModel):
    user_id: int
    checkin_date: str
    mood: int           # 1-5
    energy_level: int   # 1-5
    sleep_quality: int  # 1-5
    stress_level: int   # 1-5
    muscle_soreness: int  # 1-5
    notes: str = ""


@app.post("/api/checkin")
async def daily_checkin(data: DailyCheckinCreate, db: AsyncSession = Depends(get_db)):
    checkin_date = date.fromisoformat(data.checkin_date)

    # Check if already checked in today
    result = await db.execute(
        select(DailyCheckin).where(
            and_(
                DailyCheckin.user_id == data.user_id,
                DailyCheckin.checkin_date == checkin_date,
            )
        )
    )
    existing = result.scalar_one_or_none()

    # Calculate streak
    yesterday = checkin_date - timedelta(days=1)
    streak_result = await db.execute(
        select(DailyCheckin).where(
            and_(
                DailyCheckin.user_id == data.user_id,
                DailyCheckin.checkin_date == yesterday,
            )
        )
    )
    yesterday_checkin = streak_result.scalar_one_or_none()
    streak = (yesterday_checkin.streak_days + 1) if yesterday_checkin else 1

    if existing:
        existing.mood = data.mood
        existing.energy_level = data.energy_level
        existing.sleep_quality = data.sleep_quality
        existing.stress_level = data.stress_level
        existing.muscle_soreness = data.muscle_soreness
        existing.notes = data.notes
        existing.streak_days = streak
        await db.commit()
        return {"message": "Check-in updated", "streak_days": streak}
    else:
        checkin = DailyCheckin(
            user_id=data.user_id,
            checkin_date=checkin_date,
            mood=data.mood,
            energy_level=data.energy_level,
            sleep_quality=data.sleep_quality,
            stress_level=data.stress_level,
            muscle_soreness=data.muscle_soreness,
            notes=data.notes,
            streak_days=streak,
        )
        db.add(checkin)
        await db.commit()
        await db.refresh(checkin)
        return {"message": "Check-in saved", "streak_days": streak}


@app.get("/api/checkin/{user_id}")
async def get_checkins(user_id: int, days: int = 30, db: AsyncSession = Depends(get_db)):
    since = date.today() - timedelta(days=days)
    result = await db.execute(
        select(DailyCheckin).where(
            and_(DailyCheckin.user_id == user_id, DailyCheckin.checkin_date >= since)
        ).order_by(DailyCheckin.checkin_date.desc())
    )
    checkins = result.scalars().all()
    return [
        {
            "id": c.id,
            "checkin_date": str(c.checkin_date),
            "mood": c.mood,
            "energy_level": c.energy_level,
            "sleep_quality": c.sleep_quality,
            "stress_level": c.stress_level,
            "muscle_soreness": c.muscle_soreness,
            "notes": c.notes,
            "streak_days": c.streak_days,
        }
        for c in checkins
    ]


# ─── Quick Food Decision ──────────────────────────────────────────────────────

class QuickFoodRequest(BaseModel):
    user_id: int
    restaurant: str
    meal_context: str = "general meal"
    calories_remaining: int = 600


@app.post("/api/food/quick-decision")
async def quick_food_decision(data: QuickFoodRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).where(UserProfile.id == data.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_dict = {
        "goal": user.goal,
        "dietary_restrictions": user.dietary_restrictions,
    }
    return ai_service.get_quick_food_decision(
        user_dict, data.restaurant, data.meal_context, data.calories_remaining
    )


# ─── Timed Workout Generator ──────────────────────────────────────────────────

class TimedWorkoutRequest(BaseModel):
    user_id: int
    available_minutes: int
    equipment: str = "no equipment"
    focus_area: Optional[str] = None


@app.post("/api/workouts/timed")
async def generate_timed_workout(data: TimedWorkoutRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).where(UserProfile.id == data.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_dict = {
        "name": user.name,
        "goal": user.goal,
        "fitness_level": user.fitness_level,
    }
    return ai_service.generate_timed_workout(
        user_dict, data.available_minutes, data.equipment, data.focus_area
    )


# ─── Body Recomposition Guidance ─────────────────────────────────────────────

@app.get("/api/recomposition/{user_id}")
async def recomposition_guidance(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_dict = {
        "age": user.age,
        "height_cm": user.height_cm,
        "weight_kg": user.weight_kg,
        "activity_level": user.activity_level,
        "fitness_level": user.fitness_level,
        "dietary_restrictions": user.dietary_restrictions,
        "goal": user.goal,
    }
    return ai_service.get_recomposition_guidance(user_dict)


# ─── Budget Meal Plan ─────────────────────────────────────────────────────────

@app.get("/api/budget-plan/{user_id}")
async def budget_meal_plan(
    user_id: int,
    weekly_budget: float = 50.0,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_dict = {
        "goal": user.goal,
        "activity_level": user.activity_level,
        "dietary_restrictions": user.dietary_restrictions,
    }
    return ai_service.get_budget_meal_plan(user_dict, weekly_budget)


@app.get("/api/meal-plan/{user_id}")
async def weekly_meal_plan(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Calculate a sensible calorie target if one isn't stored
    target = user.calorie_target or 2000
    user_dict = {
        "name": user.name,
        "goal": user.goal,
        "activity_level": user.activity_level,
        "dietary_restrictions": user.dietary_restrictions,
    }
    return ai_service.generate_weekly_meal_plan(user_dict, target)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}
