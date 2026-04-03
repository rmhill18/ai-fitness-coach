import anthropic
import base64
import json
import os
from typing import Optional

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
MODEL = "claude-opus-4-6"


def _parse_json_response(text: str) -> dict:
    """Extract JSON from Claude's response text."""
    text = text.strip()
    # Try to find JSON block
    if "```json" in text:
        start = text.index("```json") + 7
        end = text.index("```", start)
        text = text[start:end].strip()
    elif "```" in text:
        start = text.index("```") + 3
        end = text.index("```", start)
        text = text[start:end].strip()
    # Find first { or [
    for i, ch in enumerate(text):
        if ch in "{[":
            text = text[i:]
            break
    # Trim trailing non-JSON
    for i in range(len(text) - 1, -1, -1):
        if text[i] in "}]":
            text = text[: i + 1]
            break
    return json.loads(text)


def generate_daily_plan(
    user: dict,
    recent_meals: list,
    recent_workouts: list,
    missed_workouts: int = 0,
) -> dict:
    """Generate a personalized daily fitness and nutrition plan."""
    history_summary = ""
    if recent_meals:
        avg_cal = sum(m.get("calories", 0) for m in recent_meals) / max(len(recent_meals), 1)
        history_summary += f"Recent avg daily calories: {avg_cal:.0f}. "
    if recent_workouts:
        history_summary += f"Last {len(recent_workouts)} workouts logged. "
    if missed_workouts > 0:
        history_summary += f"Missed {missed_workouts} workouts this week. "

    prompt = f"""You are an expert AI fitness coach. Generate a personalized daily plan for this user.

USER PROFILE:
- Name: {user.get('name', 'User')}
- Age: {user.get('age')} | Height: {user.get('height_cm')}cm | Weight: {user.get('weight_kg')}kg
- Goal: {user.get('goal', 'maintenance')}
- Activity Level: {user.get('activity_level', 'moderate')}
- Fitness Level: {user.get('fitness_level', 'intermediate')}
- Dietary Restrictions: {user.get('dietary_restrictions', 'none')}

RECENT HISTORY:
{history_summary or 'No recent history yet.'}

Generate a complete daily plan. Return ONLY valid JSON in this exact structure:
{{
  "calorie_target": <integer>,
  "protein_target_g": <integer>,
  "carb_target_g": <integer>,
  "fat_target_g": <integer>,
  "step_target": <integer>,
  "water_target_ml": <integer>,
  "ai_notes": "<motivational personalized message, 2-3 sentences>",
  "workout": {{
    "type": "<workout type, e.g. Upper Body Strength>",
    "duration_minutes": <integer>,
    "estimated_calories_burned": <integer>,
    "warmup": ["<exercise 1>", "<exercise 2>", "<exercise 3>"],
    "exercises": [
      {{"name": "<exercise>", "sets": <int>, "reps": "<reps or duration>", "rest_seconds": <int>, "notes": "<form tip>"}},
      ...
    ],
    "cooldown": ["<stretch 1>", "<stretch 2>", "<stretch 3>"]
  }},
  "meal_suggestions": {{
    "breakfast": {{"name": "<meal name>", "calories": <int>, "protein_g": <int>, "description": "<brief description>"}},
    "lunch": {{"name": "<meal name>", "calories": <int>, "protein_g": <int>, "description": "<brief description>"}},
    "dinner": {{"name": "<meal name>", "calories": <int>, "protein_g": <int>, "description": "<brief description>"}},
    "snack": {{"name": "<meal name>", "calories": <int>, "protein_g": <int>, "description": "<brief description>"}}
  }}
}}

Adapt the workout intensity and nutrition targets based on the user's goal and history.
If they missed workouts, increase accessibility/reduce intensity slightly to rebuild consistency."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)


def analyze_meal_photo(image_base64: str, media_type: str = "image/jpeg") -> dict:
    """Analyze a meal photo and estimate nutritional content."""
    prompt = """You are a registered dietitian and nutrition expert with extensive food recognition skills.
Analyze this meal photo and provide a detailed nutritional estimate.

Be thorough but realistic. If you can't identify something clearly, make a reasonable estimate based on portion sizes and typical ingredients.

Return ONLY valid JSON in this exact structure:
{
  "description": "<detailed description of what you see in the photo>",
  "meal_name": "<what this meal is called>",
  "confidence": "<low|medium|high>",
  "calories": <integer>,
  "protein_g": <float>,
  "carbs_g": <float>,
  "fat_g": <float>,
  "fiber_g": <float>,
  "sugar_g": <float>,
  "sodium_mg": <float>,
  "vitamin_c_mg": <float>,
  "calcium_mg": <float>,
  "iron_mg": <float>,
  "health_score": <1-10 integer>,
  "health_notes": "<brief assessment of nutritional quality>",
  "components": [
    {"item": "<food item>", "estimated_portion": "<portion size>", "calories": <int>}
  ],
  "suggestions": ["<healthier alternative or addition>", ...]
}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_base64,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )

    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)


def analyze_progress(
    user: dict,
    recent_meals: list,
    recent_workouts: list,
    daily_plans: list,
    step_logs: list,
) -> dict:
    """Analyze why progress may or may not be happening based on data."""
    # Build data summary
    total_days = max(len(daily_plans), 1)
    completed_workouts = sum(1 for w in recent_workouts if w.get("completed", True))
    missed_workouts = total_days - completed_workouts

    avg_calories = (
        sum(m.get("calories", 0) for m in recent_meals) / max(len(recent_meals), 1)
    )
    avg_protein = (
        sum(m.get("protein_g", 0) for m in recent_meals) / max(len(recent_meals), 1)
    )
    avg_steps = (
        sum(s.get("steps", 0) for s in step_logs) / max(len(step_logs), 1)
    )
    calorie_target = daily_plans[0].get("calorie_target", 2000) if daily_plans else 2000

    prompt = f"""You are an expert fitness coach analyzing a client's progress data to identify roadblocks.

USER GOAL: {user.get('goal', 'maintenance')}
USER STATS: {user.get('weight_kg')}kg, {user.get('height_cm')}cm, {user.get('age')} years old

LAST 7 DAYS DATA:
- Average daily calories consumed: {avg_calories:.0f} kcal (target: {calorie_target} kcal)
- Average daily protein: {avg_protein:.0f}g
- Average daily steps: {avg_steps:.0f}
- Workouts completed: {completed_workouts} out of {total_days} planned
- Workouts missed: {missed_workouts}
- Meals logged: {len(recent_meals)}

Analyze this data and identify specific reasons why the user's progress may be stalling or succeeding.
Be specific, data-driven, and constructive.

Return ONLY valid JSON:
{{
  "overall_assessment": "<2-3 sentence overall summary>",
  "progress_score": <1-10 integer representing overall adherence>,
  "issues": [
    {{
      "category": "<Nutrition|Training|Recovery|Consistency|Hydration>",
      "severity": "<low|medium|high>",
      "issue": "<specific problem identified>",
      "data_evidence": "<what data shows this>",
      "fix": "<concrete actionable fix>"
    }}
  ],
  "wins": ["<positive thing they're doing well>", ...],
  "top_priority": "<single most important thing to fix this week>",
  "adjusted_recommendation": {{
    "calories": <adjusted calorie target>,
    "protein_g": <adjusted protein target>,
    "workouts_per_week": <recommended number>,
    "steps_per_day": <recommended steps>
  }}
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )

    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)


def generate_weekly_report(
    user: dict,
    week_meals: list,
    week_workouts: list,
    week_steps: list,
    daily_plans: list,
) -> dict:
    """Generate a comprehensive weekly fitness report."""
    completed = sum(1 for w in week_workouts if w.get("completed", True))
    planned = len(daily_plans) if daily_plans else 7
    missed = max(0, planned - completed)

    avg_cal = (
        sum(m.get("calories", 0) for m in week_meals) / max(len(week_meals), 1)
        if week_meals else 0
    )
    avg_protein = (
        sum(m.get("protein_g", 0) for m in week_meals) / max(len(week_meals), 1)
        if week_meals else 0
    )
    avg_steps = (
        sum(s.get("steps", 0) for s in week_steps) / max(len(week_steps), 1)
        if week_steps else 0
    )
    total_workout_mins = sum(w.get("duration_minutes", 0) for w in week_workouts)

    prompt = f"""You are an expert fitness coach writing a detailed weekly review report for your client.

CLIENT: {user.get('name')}, Goal: {user.get('goal')}

THIS WEEK'S DATA:
- Workouts completed: {completed}/{planned} ({missed} missed)
- Total workout time: {total_workout_mins} minutes
- Average daily calories: {avg_cal:.0f} kcal
- Average daily protein: {avg_protein:.0f}g
- Average daily steps: {avg_steps:.0f}
- Meals logged: {len(week_meals)} across {len(set(m.get('log_date','') for m in week_meals))} days

Write an encouraging but honest weekly review. Be specific and actionable.

Return ONLY valid JSON:
{{
  "headline": "<engaging 1-line week summary>",
  "overall_grade": "<A+|A|B+|B|C+|C|D|F>",
  "weekly_score": <1-100 integer>,
  "what_worked": [
    {{"title": "<what worked>", "detail": "<why it worked and impact>", "keep_doing": "<how to maintain this>"}}
  ],
  "what_didnt_work": [
    {{"title": "<what didn't work>", "detail": "<specific problem>", "impact": "<how it affected progress>", "fix": "<concrete next week action>"}}
  ],
  "stats_summary": {{
    "consistency_score": <0-100>,
    "nutrition_score": <0-100>,
    "activity_score": <0-100>,
    "recovery_score": <0-100>
  }},
  "next_week_focus": ["<priority 1>", "<priority 2>", "<priority 3>"],
  "motivational_message": "<personalized 2-3 sentence motivational closing>",
  "adjusted_plan": {{
    "increase": ["<things to do more of>"],
    "decrease": ["<things to reduce>"],
    "maintain": ["<things to keep the same>"]
  }}
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)


def analyze_body_photo(
    image_base64: str,
    height_cm: float,
    weight_kg: float,
    age: int,
    goal: str,
    media_type: str = "image/jpeg",
) -> dict:
    """Analyze a body photo to estimate body composition metrics."""
    bmi = weight_kg / ((height_cm / 100) ** 2)

    prompt = f"""You are an expert exercise physiologist and body composition specialist.
Analyze this body photo to provide a comprehensive physical assessment.

KNOWN STATS:
- Height: {height_cm}cm | Weight: {weight_kg}kg
- Calculated BMI: {bmi:.1f}
- Age: {age} | Goal: {goal}

Provide a professional, respectful, and constructive assessment. Focus on health and fitness potential.
Do not make negative comments about appearance - frame everything as opportunities for improvement.

Return ONLY valid JSON:
{{
  "bmi": {bmi:.1f},
  "bmi_category": "<Underweight|Normal weight|Overweight|Obese Class I|Obese Class II|Obese Class III>",
  "estimated_body_fat_pct": <float>,
  "estimated_muscle_mass_pct": <float>,
  "lean_mass_kg": <float>,
  "fat_mass_kg": <float>,
  "muscle_development": {{
    "upper_body": "<underdeveloped|developing|moderate|well-developed|highly developed>",
    "core": "<underdeveloped|developing|moderate|well-developed|highly developed>",
    "lower_body": "<underdeveloped|developing|moderate|well-developed|highly developed>",
    "overall_symmetry": "<poor|fair|good|excellent>"
  }},
  "posture_assessment": {{
    "overall": "<needs work|fair|good|excellent>",
    "notes": ["<posture observation>", ...]
  }},
  "body_type": "<Ectomorph|Mesomorph|Endomorph|Ecto-Mesomorph|Endo-Mesomorph>",
  "fitness_potential": "<brief note on their fitness potential based on body type>",
  "health_indicators": {{
    "cardiovascular_risk": "<low|moderate|high> - based on body composition",
    "metabolic_health_indicator": "<likely good|monitor|concern>"
  }},
  "goal_alignment": "<how their current physique aligns with their stated goal>",
  "recommendations": [
    {{"area": "<Training|Nutrition|Recovery|Lifestyle>", "recommendation": "<specific advice>", "priority": "<high|medium|low>"}}
  ],
  "encouragement": "<genuine 2-3 sentence motivational message acknowledging their journey>"
}}

Note: All estimates are visual approximations. Always recommend professional medical assessment for clinical decisions."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=3000,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_base64,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )

    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)


def get_quick_food_decision(
    user: dict,
    restaurant: str,
    meal_context: str,
    calories_remaining: int,
) -> dict:
    """Give an instant food ordering recommendation for a restaurant."""
    prompt = f"""You are a nutrition coach helping someone make the best food choice RIGHT NOW.

USER GOAL: {user.get('goal', 'maintenance')}
DIETARY RESTRICTIONS: {user.get('dietary_restrictions', 'none')}
RESTAURANT / FOOD SPOT: {restaurant}
CONTEXT: {meal_context}
CALORIES REMAINING TODAY: {calories_remaining} kcal

Give a quick, no-nonsense recommendation. Be practical and realistic — they're standing in line.

Return ONLY valid JSON:
{{
  "recommendation": "<exact item(s) to order, specific>",
  "why": "<1-2 sentence explanation of why this fits their goals>",
  "estimated_calories": <integer>,
  "estimated_protein_g": <integer>,
  "smart_swaps": ["<specific modification to make healthier, e.g. 'ask for no sauce'>", ...],
  "avoid": ["<item to skip and why, 1 line>", ...],
  "backup_option": "<second best choice if main unavailable>",
  "quick_tip": "<one practical in-the-moment tip>"
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)


def generate_timed_workout(
    user: dict,
    available_minutes: int,
    equipment: str,
    focus_area: Optional[str] = None,
) -> dict:
    """Generate a workout that fits a specific time window."""
    prompt = f"""You are a personal trainer creating a workout that fits a strict time limit.

USER: {user.get('name')}, Goal: {user.get('goal')}, Level: {user.get('fitness_level', 'intermediate')}
AVAILABLE TIME: {available_minutes} minutes TOTAL (including warmup and cooldown)
EQUIPMENT: {equipment}
FOCUS AREA: {focus_area or 'full body'}

Create an efficient, high-quality workout that fits EXACTLY in {available_minutes} minutes.
Every minute counts — no fluff. Make it feel achievable and complete.

Return ONLY valid JSON:
{{
  "workout_name": "<creative name for this session>",
  "total_minutes": {available_minutes},
  "format": "<circuit|HIIT|straight sets|AMRAP|superset>",
  "calories_estimate": <integer>,
  "difficulty": "<easy|moderate|hard>",
  "warmup": {{
    "duration_minutes": <int>,
    "exercises": ["<exercise>", "<exercise>", "<exercise>"]
  }},
  "main_workout": {{
    "duration_minutes": <int>,
    "structure": "<brief description of how rounds/sets work>",
    "exercises": [
      {{
        "name": "<exercise>",
        "duration_or_reps": "<e.g. 40 sec or 12 reps>",
        "rest": "<e.g. 20 sec>",
        "modification": "<easier option for beginners>"
      }}
    ]
  }},
  "cooldown": {{
    "duration_minutes": <int>,
    "exercises": ["<stretch>", "<stretch>"]
  }},
  "pro_tip": "<advice to maximize this short session>",
  "motivation": "<short energizing message>"
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)


def get_recomposition_guidance(user: dict) -> dict:
    """Generate body recomposition (lose fat + gain muscle simultaneously) guidance."""
    prompt = f"""You are a sports scientist specializing in body recomposition.

USER PROFILE:
- Age: {user.get('age')}, Height: {user.get('height_cm')}cm, Weight: {user.get('weight_kg')}kg
- Activity Level: {user.get('activity_level')}
- Fitness Level: {user.get('fitness_level')}
- Dietary Restrictions: {user.get('dietary_restrictions', 'none')}

Create a science-based body recomposition strategy to lose fat and gain muscle simultaneously.

Return ONLY valid JSON:
{{
  "overview": "<2-3 sentence explanation of their recomp potential and approach>",
  "calorie_strategy": {{
    "daily_calories": <integer>,
    "rationale": "<why this specific intake level>",
    "cycling": "<simple calorie cycling tip if applicable>"
  }},
  "macro_split": {{
    "protein_g": <integer>,
    "carbs_g": <integer>,
    "fat_g": <integer>,
    "protein_priority_reason": "<why protein is set at this level>"
  }},
  "training_approach": {{
    "weekly_sessions": <integer>,
    "strength_days": <integer>,
    "cardio_days": <integer>,
    "style": "<e.g. progressive overload with moderate rep ranges>",
    "key_principles": ["<principle>", "<principle>", "<principle>"]
  }},
  "timeline": {{
    "monthly_fat_loss_kg": <float>,
    "monthly_muscle_gain_kg": <float>,
    "milestones": ["<week 4 milestone>", "<week 8 milestone>", "<week 12 milestone>"]
  }},
  "top_tips": ["<evidence-based tip>", "<tip>", "<tip>"],
  "common_mistakes": ["<mistake to avoid>", "<mistake>", "<mistake>"],
  "progress_markers": ["<non-scale way to track recomp>", "<marker>", "<marker>"]
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)


def get_budget_meal_plan(user: dict, weekly_budget_usd: float) -> dict:
    """Generate a budget-friendly weekly meal plan."""
    prompt = f"""You are a nutrition coach specializing in affordable healthy eating.

USER PROFILE:
- Goal: {user.get('goal')}
- Activity Level: {user.get('activity_level')}
- Dietary Restrictions: {user.get('dietary_restrictions', 'none')}
WEEKLY FOOD BUDGET: ${weekly_budget_usd:.0f} USD

Create a practical, budget-friendly weekly meal plan that supports their fitness goals.
Focus on affordable protein sources, whole foods, and minimal food waste.
All prices should be realistic US grocery store estimates.

Return ONLY valid JSON:
{{
  "weekly_cost_estimate": <float>,
  "cost_per_day": <float>,
  "overview": "<brief strategy for eating well on this budget>",
  "staple_foods": [
    {{"food": "<food>", "weekly_cost_usd": <float>, "uses": ["<how to use it>"]}}
  ],
  "daily_template": {{
    "breakfast": {{"meal": "<name>", "cost_usd": <float>, "calories": <int>, "protein_g": <int>, "prep_minutes": <int>}},
    "lunch": {{"meal": "<name>", "cost_usd": <float>, "calories": <int>, "protein_g": <int>, "prep_minutes": <int>}},
    "dinner": {{"meal": "<name>", "cost_usd": <float>, "calories": <int>, "protein_g": <int>, "prep_minutes": <int>}},
    "snack": {{"meal": "<name>", "cost_usd": <float>, "calories": <int>, "protein_g": <int>, "prep_minutes": <int>}}
  }},
  "shopping_list": [
    {{"item": "<grocery item>", "quantity": "<amount>", "estimated_cost_usd": <float>}}
  ],
  "meal_prep_tips": ["<time and money saving tip>", "<tip>"],
  "budget_protein_sources": ["<affordable high-protein food>", "<source>", "<source>"],
  "total_daily_nutrition": {{
    "calories": <int>,
    "protein_g": <int>,
    "carbs_g": <int>,
    "fat_g": <int>
  }}
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)


def generate_adaptive_workout(
    user: dict,
    missed_workouts: int,
    upcoming_days: int,
    last_workout_type: Optional[str] = None,
) -> dict:
    """Generate an adaptive workout when previous workouts were missed."""
    prompt = f"""You are a personal trainer adapting a workout plan after missed sessions.

USER: {user.get('name')}, Goal: {user.get('goal')}, Level: {user.get('fitness_level', 'intermediate')}
Missed workouts this week: {missed_workouts}
Days left this week: {upcoming_days}
Last workout type: {last_workout_type or 'unknown'}

Create an adaptive workout that:
1. Makes up for missed sessions efficiently without overtraining
2. Is motivating and achievable (not punishing)
3. Focuses on the user's primary goal

Return ONLY valid JSON:
{{
  "strategy": "<brief explanation of the adaptive approach>",
  "workout_name": "<name for this session>",
  "duration_minutes": <integer>,
  "intensity": "<low|moderate|high>",
  "focus": "<main muscle groups or fitness quality>",
  "warmup": ["<exercise>", ...],
  "main_workout": [
    {{"name": "<exercise>", "sets": <int>, "reps": "<reps or duration>", "rest_seconds": <int>, "modification": "<easier option if needed>"}}
  ],
  "cooldown": ["<stretch>", ...],
  "estimated_calories": <integer>,
  "motivation": "<encouraging message about getting back on track>"
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)


def generate_weekly_meal_plan(user: dict, target_calories: int) -> dict:
    """Generate a personalized 7-day meal plan based on user goals and calorie target."""
    prompt = f"""You are a registered dietitian creating a personalized weekly meal plan.

USER PROFILE:
- Name: {user.get('name', 'User')}
- Goal: {user.get('goal')}
- Activity Level: {user.get('activity_level')}
- Dietary Restrictions: {user.get('dietary_restrictions', 'none')}
- Daily Calorie Target: {target_calories} kcal

Create a practical, enjoyable 7-day meal plan that supports their specific fitness goal.
Each day should have breakfast, lunch, dinner, and a snack. Vary meals across the week.

Return ONLY valid JSON in this exact structure:
{{
  "summary": "<1-2 sentence overview of this plan and why it fits their goal>",
  "daily_targets": {{
    "calories": {target_calories},
    "protein_g": <int>,
    "carbs_g": <int>,
    "fat_g": <int>
  }},
  "days": [
    {{
      "day": "Monday",
      "meals": {{
        "breakfast": {{"name": "<meal name>", "calories": <int>, "protein_g": <int>, "carbs_g": <int>, "fat_g": <int>, "prep_minutes": <int>}},
        "lunch":     {{"name": "<meal name>", "calories": <int>, "protein_g": <int>, "carbs_g": <int>, "fat_g": <int>, "prep_minutes": <int>}},
        "dinner":    {{"name": "<meal name>", "calories": <int>, "protein_g": <int>, "carbs_g": <int>, "fat_g": <int>, "prep_minutes": <int>}},
        "snack":     {{"name": "<meal name>", "calories": <int>, "protein_g": <int>, "carbs_g": <int>, "fat_g": <int>, "prep_minutes": <int>}}
      }},
      "day_totals": {{"calories": <int>, "protein_g": <int>, "carbs_g": <int>, "fat_g": <int>}}
    }}
  ],
  "hydration_tip": "<daily water intake recommendation>",
  "key_tips": ["<actionable nutrition tip>", "<tip>", "<tip>"]
}}
Include all 7 days: Monday through Sunday."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)
