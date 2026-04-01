"""Shared pytest fixtures for the AI Fitness Coach backend tests."""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_engine():
    """Spin up a fresh in-memory SQLite engine for each test."""
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_engine):
    """
    HTTP test client backed by the in-memory database.
    - get_db is overridden so every request uses the test session.
    - init_db is patched so the startup event never touches fitness.db.
    """
    TestSession = sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with TestSession() as session:
            try:
                yield session
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db

    with patch("main.init_db", new=AsyncMock(return_value=None)):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac

    app.dependency_overrides.clear()


# ── Reusable sample payloads ──────────────────────────────────────────────────

SAMPLE_USER = {
    "name": "Jane Doe",
    "age": 30,
    "height_cm": 168.0,
    "weight_kg": 65.0,
    "goal": "weight_loss",
    "activity_level": "moderate",
    "fitness_level": "intermediate",
    "dietary_restrictions": "",
}

SAMPLE_MEAL = {
    "user_id": 1,
    "log_date": "2024-01-15",
    "meal_type": "breakfast",
    "description": "Oatmeal with berries",
    "calories": 350.0,
    "protein_g": 12.0,
    "carbs_g": 60.0,
    "fat_g": 8.0,
}

SAMPLE_WORKOUT = {
    "user_id": 1,
    "log_date": "2024-01-15",
    "workout_type": "Upper Body Strength",
    "exercises": '[{"name": "Push-up", "sets": 3, "reps": "15"}]',
    "duration_minutes": 45,
    "calories_burned": 280.0,
    "perceived_effort": 7,
    "completed": True,
    "notes": "Felt strong today",
}
