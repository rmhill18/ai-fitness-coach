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
        thinking={"type": "adaptive"},
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
        thinking={"type": "adaptive"},
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
        thinking={"type": "adaptive"},
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


def get_fast_food_nutrition(restaurant: str, item: str, size: str = "regular") -> dict:
    """Estimate nutrition for a fast food or restaurant menu item."""
    prompt = f"""You are a registered dietitian with extensive knowledge of restaurant and fast food nutrition.
Estimate the nutritional content for this menu item:

Restaurant: {restaurant}
Item: {item}
Size/Variation: {size}

Use your knowledge of this restaurant's actual menu if you know it, otherwise estimate based on similar items.
Be realistic and accurate. If the item doesn't exist, estimate based on the closest match.

Return ONLY valid JSON:
{{
  "restaurant": "{restaurant}",
  "item_name": "<official or estimated item name>",
  "size": "{size}",
  "confidence": "<low|medium|high>",
  "calories": <integer>,
  "protein_g": <float>,
  "carbs_g": <float>,
  "fat_g": <float>,
  "saturated_fat_g": <float>,
  "fiber_g": <float>,
  "sugar_g": <float>,
  "sodium_mg": <float>,
  "health_score": <1-10 integer>,
  "notes": "<any relevant nutritional notes>",
  "healthier_alternatives": ["<alternative at same restaurant>", "<another option>"],
  "modifications": ["<modification to make it healthier>", "<another modification>"]
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)


def generate_quick_directive(user: dict, context: dict) -> dict:
    """Generate a simple, no-BS 'what to do today' plan."""
    sleep_note = ""
    if context.get("sleep_hours"):
        sleep_note = f"Last night's sleep: {context['sleep_hours']} hours (quality: {context.get('sleep_quality', 'unknown')}/10). "
    if context.get("mood"):
        sleep_note += f"Current mood: {context['mood']}/5. Energy: {context.get('energy', 5)}/10. "
    if context.get("missed_workouts"):
        sleep_note += f"Missed {context['missed_workouts']} workouts recently. "

    prompt = f"""You are a no-nonsense personal trainer. Give this user their exact plan for today in the simplest possible way.
No fluff, no options, just tell them exactly what to do.

USER: {user.get('name')}, Goal: {user.get('goal')}, Level: {user.get('fitness_level', 'intermediate')}
TODAY'S CONTEXT: {sleep_note or 'Normal day, feeling okay.'}

Create a brutally simple "here's exactly what you do today" directive.

Return ONLY valid JSON:
{{
  "greeting": "<1 sentence personalized greeting acknowledging their current state>",
  "workout_directive": {{
    "do_it": <true|false based on sleep/recovery>,
    "what": "<exact workout name, e.g. 30-min Upper Body>",
    "when": "<best time today, e.g. After work, 6pm>",
    "how_long": <minutes as integer>,
    "top_3_exercises": ["<exercise 1 with sets/reps>", "<exercise 2>", "<exercise 3>"],
    "skip_reason": "<if do_it is false, why to rest today>"
  }},
  "nutrition_directive": {{
    "calorie_target": <integer>,
    "protein_target_g": <integer>,
    "next_meal": "<name of what to eat for the next meal>",
    "next_meal_cals": <integer>,
    "avoid_today": "<1 thing to avoid>",
    "drink_water_oz": <integer>
  }},
  "one_thing": "<the single most important thing to do today for their goal>",
  "quick_wins": ["<tiny action they can do in 2 min>", "<another quick win>"]
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)


def generate_budget_meal_plan(user: dict, daily_budget_usd: float = 10.0) -> dict:
    """Generate a fitness meal plan optimized for low cost."""
    prompt = f"""You are a nutritionist specializing in budget fitness nutrition.
Create a full day meal plan for someone with a tight budget who wants to hit their fitness goals.

USER: {user.get('name')}, Goal: {user.get('goal')}
Stats: {user.get('weight_kg')}kg, {user.get('height_cm')}cm
Dietary restrictions: {user.get('dietary_restrictions', 'none')}
Daily food budget: ${daily_budget_usd:.2f}

Focus on:
- Cheap, accessible staples (rice, eggs, beans, oats, frozen veg, canned tuna/chicken)
- No supplements required
- Minimal cooking equipment needed
- High protein per dollar ratio
- Real grocery store items with realistic prices

Return ONLY valid JSON:
{{
  "daily_budget": {daily_budget_usd},
  "estimated_actual_cost": <float>,
  "calorie_total": <integer>,
  "protein_total_g": <integer>,
  "carb_total_g": <integer>,
  "fat_total_g": <integer>,
  "meals": [
    {{
      "meal_type": "<breakfast|lunch|dinner|snack>",
      "name": "<meal name>",
      "ingredients": ["<ingredient + amount + estimated cost>"],
      "estimated_cost": <float>,
      "calories": <integer>,
      "protein_g": <integer>,
      "prep_time_minutes": <integer>,
      "instructions": "<simple 1-2 sentence prep>"
    }}
  ],
  "weekly_grocery_list": ["<item + estimated price>"],
  "budget_tips": ["<money-saving tip>", "<another tip>", "<another tip>"],
  "protein_per_dollar": <float>
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)


def generate_time_based_workout(
    user: dict,
    available_minutes: int,
    equipment: str = "none",
    focus: Optional[str] = None,
) -> dict:
    """Generate a workout optimized for a specific time window."""
    prompt = f"""You are a personal trainer creating a time-optimized workout.
The user has EXACTLY {available_minutes} minutes available. Design the workout to fit this precisely.

USER: {user.get('name')}, Goal: {user.get('goal')}, Level: {user.get('fitness_level', 'intermediate')}
Available time: {available_minutes} minutes
Equipment available: {equipment or 'bodyweight only'}
Focus preference: {focus or 'balanced, based on goal'}

Design an efficient, effective workout that fits within {available_minutes} minutes including warmup and cooldown.
No fluff - maximize results in the time given.

Return ONLY valid JSON:
{{
  "workout_name": "<name reflecting time and focus>",
  "total_minutes": {available_minutes},
  "warmup_minutes": <integer>,
  "main_minutes": <integer>,
  "cooldown_minutes": <integer>,
  "equipment_needed": "<exact equipment>",
  "focus": "<muscle groups or type>",
  "estimated_calories": <integer>,
  "intensity": "<low|moderate|high|very high>",
  "format": "<circuit|straight sets|HIIT|EMOM|AMRAP|etc>",
  "warmup": [
    {{"exercise": "<name>", "duration_seconds": <int>}}
  ],
  "main_workout": [
    {{
      "exercise": "<name>",
      "sets": <int>,
      "reps_or_duration": "<e.g. 12 reps or 30 seconds>",
      "rest_seconds": <int>,
      "notes": "<form cue or modification>"
    }}
  ],
  "cooldown": [
    {{"exercise": "<stretch name>", "duration_seconds": <int>}}
  ],
  "why_this_works": "<1-2 sentences explaining why this is optimal for the time>"
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=2500,
        messages=[{"role": "user", "content": prompt}],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)


def generate_recomp_plan(user: dict, weeks: int = 8) -> dict:
    """Generate a body recomposition plan (simultaneous fat loss + muscle gain)."""
    bmi = user.get('weight_kg', 75) / ((user.get('height_cm', 170) / 100) ** 2)
    prompt = f"""You are an expert sports scientist specializing in body recomposition.
Create a detailed recomposition plan for this user.

USER: {user.get('name')}, Age: {user.get('age')}
Stats: {user.get('weight_kg')}kg, {user.get('height_cm')}cm, BMI: {bmi:.1f}
Level: {user.get('fitness_level', 'intermediate')}
Activity: {user.get('activity_level', 'moderate')}
Duration: {weeks} weeks

Body recomposition = losing fat AND gaining muscle simultaneously.
This requires precise nutrition cycling and strategic training.

Return ONLY valid JSON:
{{
  "overview": "<2-3 sentence explanation of the recomp strategy for this person>",
  "realistic_expectations": {{
    "fat_loss_kg_per_week": <float>,
    "muscle_gain_kg_per_week": <float>,
    "total_fat_loss_kg": <float>,
    "total_muscle_gain_kg": <float>,
    "timeframe_weeks": {weeks}
  }},
  "nutrition_strategy": {{
    "calorie_approach": "<maintenance|slight deficit|slight surplus cycling>",
    "training_day_calories": <integer>,
    "rest_day_calories": <integer>,
    "protein_g_per_kg": <float>,
    "daily_protein_g": <integer>,
    "carb_cycling": {{
      "training_day_carbs_g": <integer>,
      "rest_day_carbs_g": <integer>
    }},
    "fat_g": <integer>,
    "meal_timing": ["<meal timing tip>", "<pre-workout>", "<post-workout>"]
  }},
  "training_strategy": {{
    "sessions_per_week": <integer>,
    "training_split": "<e.g. Push/Pull/Legs or Upper/Lower>",
    "cardio_recommendation": "<type, frequency, duration>",
    "progressive_overload": "<specific approach>",
    "weekly_structure": [
      {{"day": "<Mon|Tue|Wed|Thu|Fri|Sat|Sun>", "session": "<what to do>"}}
    ]
  }},
  "key_principles": ["<critical principle 1>", "<principle 2>", "<principle 3>", "<principle 4>"],
  "weekly_checklist": ["<weekly tracking point>", "<another>"],
  "common_mistakes": ["<mistake to avoid>", "<another>"],
  "progress_metrics": ["<how to measure recomp progress>", "<another metric>"]
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=3000,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": prompt}],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)


def get_food_recommendation(
    user: dict,
    situation: str,
    context: Optional[str] = None,
) -> dict:
    """Give instant real-world food recommendations."""
    prompt = f"""You are a practical nutritionist giving real-time food advice.
The user needs immediate food guidance right now.

USER: {user.get('name')}, Goal: {user.get('goal')}
Calorie target: ~{user.get('calorie_target', 2000)} kcal/day
Dietary restrictions: {user.get('dietary_restrictions', 'none')}

SITUATION: {situation}
ADDITIONAL CONTEXT: {context or 'none'}

Give practical, immediately actionable advice. Be specific with real options, not generic.

Return ONLY valid JSON:
{{
  "situation_summary": "<acknowledge their situation in 1 sentence>",
  "top_recommendation": {{
    "what": "<exact food/meal recommendation>",
    "why": "<brief reason it fits their goal>",
    "calories": <estimated integer>,
    "protein_g": <estimated integer>
  }},
  "alternatives": [
    {{
      "what": "<alternative option>",
      "calories": <integer>,
      "protein_g": <integer>,
      "why_good": "<brief reason>"
    }}
  ],
  "what_to_avoid": "<specific thing to avoid in this situation and why>",
  "ordering_tip": "<if at restaurant, specific ordering modification>",
  "guilt_free_note": "<if they already ate something off-plan, how to adjust>",
  "macro_impact": "<how this fits into their daily targets>"
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=1500,
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
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": prompt}],
    )

    text = next(b.text for b in response.content if b.type == "text")
    return _parse_json_response(text)
