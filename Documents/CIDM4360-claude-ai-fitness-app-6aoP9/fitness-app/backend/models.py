from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, Date
from sqlalchemy.sql import func
from database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    age = Column(Integer)
    height_cm = Column(Float)
    weight_kg = Column(Float)
    goal = Column(String(50))  # weight_loss, muscle_gain, maintenance, endurance
    activity_level = Column(String(50))  # sedentary, light, moderate, very_active
    fitness_level = Column(String(50))  # beginner, intermediate, advanced
    dietary_restrictions = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class DailyPlan(Base):
    __tablename__ = "daily_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    plan_date = Column(Date, index=True)
    workout_plan = Column(Text)       # JSON string
    calorie_target = Column(Integer)
    protein_target_g = Column(Integer)
    carb_target_g = Column(Integer)
    fat_target_g = Column(Integer)
    step_target = Column(Integer)
    water_target_ml = Column(Integer)
    ai_notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class MealLog(Base):
    __tablename__ = "meal_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    log_date = Column(Date, index=True)
    meal_type = Column(String(50))  # breakfast, lunch, dinner, snack
    description = Column(Text)
    calories = Column(Float)
    protein_g = Column(Float)
    carbs_g = Column(Float)
    fat_g = Column(Float)
    fiber_g = Column(Float, default=0)
    sugar_g = Column(Float, default=0)
    sodium_mg = Column(Float, default=0)
    vitamin_c_mg = Column(Float, default=0)
    calcium_mg = Column(Float, default=0)
    iron_mg = Column(Float, default=0)
    photo_analyzed = Column(Boolean, default=False)
    ai_analysis = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class WorkoutLog(Base):
    __tablename__ = "workout_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    log_date = Column(Date, index=True)
    workout_type = Column(String(100))
    exercises = Column(Text)    # JSON string
    duration_minutes = Column(Integer)
    calories_burned = Column(Float)
    perceived_effort = Column(Integer)  # 1-10
    completed = Column(Boolean, default=True)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class StepLog(Base):
    __tablename__ = "step_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    log_date = Column(Date, index=True)
    steps = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class WeeklyReport(Base):
    __tablename__ = "weekly_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    week_start = Column(Date, index=True)
    week_end = Column(Date)
    what_worked = Column(Text)
    what_didnt_work = Column(Text)
    recommendations = Column(Text)
    avg_calories = Column(Float)
    avg_steps = Column(Integer)
    workouts_completed = Column(Integer)
    workouts_missed = Column(Integer)
    weight_change_kg = Column(Float)
    full_report = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class BodyAnalysis(Base):
    __tablename__ = "body_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    analysis_date = Column(Date, index=True)
    estimated_bmi = Column(Float)
    bmi_category = Column(String(50))
    estimated_body_fat_pct = Column(Float)
    estimated_muscle_mass_pct = Column(Float)
    muscle_symmetry_score = Column(Float)
    posture_notes = Column(Text)
    ai_assessment = Column(Text)
    recommendations = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class WearableData(Base):
    __tablename__ = "wearable_data"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    log_date = Column(Date, index=True)
    sleep_score = Column(Integer)          # 0-100
    sleep_hours = Column(Float)
    hrv_ms = Column(Float)                 # Heart rate variability in ms
    resting_heart_rate = Column(Integer)   # bpm
    recovery_score = Column(Integer)       # 0-100
    spo2_pct = Column(Float)               # Blood oxygen %
    steps = Column(Integer)
    active_calories = Column(Integer)
    device_type = Column(String(50), default="manual")  # fitbit, apple_watch, oura, garmin, manual
    created_at = Column(DateTime, server_default=func.now())


class DailyCheckin(Base):
    __tablename__ = "daily_checkins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    checkin_date = Column(Date, index=True)
    mood = Column(Integer)           # 1-5
    energy_level = Column(Integer)   # 1-5
    sleep_quality = Column(Integer)  # 1-5
    stress_level = Column(Integer)   # 1-5
    muscle_soreness = Column(Integer)  # 1-5
    notes = Column(Text, default="")
    streak_days = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())


class UserAuth(Base):
    __tablename__ = "user_auth"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    user_profile_id = Column(Integer, nullable=True)  # linked after profile setup
    created_at = Column(DateTime, server_default=func.now())


class DevicePushToken(Base):
    __tablename__ = "device_push_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    token = Column(String(500), nullable=False)
    platform = Column(String(20))  # ios, android, web
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
