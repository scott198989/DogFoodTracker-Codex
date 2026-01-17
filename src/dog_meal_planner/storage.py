from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Iterator


BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = BASE_DIR / "data" / "dog_meal_planner.db"
SCHEMA_PATH = BASE_DIR / "src" / "dog_meal_planner" / "db" / "schema.sql"


def resolve_db_path() -> Path:
    env_path = os.getenv("DOG_MEAL_PLANNER_DB")
    if env_path:
        return Path(env_path)
    if os.getenv("VERCEL") or os.getenv("VERCEL_ENV"):
        return Path("/tmp") / "dog_meal_planner.db"
    return DEFAULT_DB_PATH


DB_PATH = resolve_db_path()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.executescript(SCHEMA_PATH.read_text())
        conn.commit()


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def db_session() -> Iterator[sqlite3.Connection]:
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
