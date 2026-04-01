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


class SleepLog(Base):
    __tablename__ = "sleep_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    log_date = Column(Date, index=True)
    hours_slept = Column(Float)
    quality_score = Column(Integer)  # 1-10
    bedtime = Column(String(10))   # e.g. "22:30"
    wake_time = Column(String(10))  # e.g. "06:30"
    notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())


class CheckIn(Base):
    __tablename__ = "check_ins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    checkin_date = Column(Date, index=True)
    mood = Column(Integer)         # 1-5
    energy_level = Column(Integer) # 1-10
    stress_level = Column(Integer) # 1-10
    logged_meals = Column(Boolean, default=False)
    completed_workout = Column(Boolean, default=False)
    hit_water_goal = Column(Boolean, default=False)
    notes = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())


class NotificationSetting(Base):
    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True)
    meal_reminders = Column(Boolean, default=True)
    workout_reminders = Column(Boolean, default=True)
    checkin_reminders = Column(Boolean, default=True)
    water_reminders = Column(Boolean, default=True)
    morning_checkin_time = Column(String(5), default="07:00")
    meal_reminder_times = Column(Text, default='["08:00","12:00","18:00"]')  # JSON
    workout_reminder_time = Column(String(5), default="17:00")
    push_endpoint = Column(Text, default="")
    push_keys = Column(Text, default="")  # JSON with p256dh and auth
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class DeviceData(Base):
    __tablename__ = "device_data"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    log_date = Column(Date, index=True)
    device_type = Column(String(50), default="manual")  # fitbit, apple, garmin, oura, whoop, manual
    sleep_score = Column(Integer)        # 0-100
    sleep_hours = Column(Float)
    sleep_stages = Column(Text)          # JSON: {deep, light, rem, awake}
    hrv_ms = Column(Float)               # Heart rate variability in ms
    resting_hr = Column(Integer)         # Beats per minute
    steps = Column(Integer)
    active_calories = Column(Integer)
    total_calories = Column(Integer)
    active_minutes = Column(Integer)
    recovery_score = Column(Integer)     # 0-100
    readiness_score = Column(Integer)    # 0-100 (Oura style)
    spo2_pct = Column(Float)             # Blood oxygen %
    stress_score = Column(Integer)       # 0-100
    raw_data = Column(Text, default="{}")  # JSON raw device response
    created_at = Column(DateTime, server_default=func.now())
