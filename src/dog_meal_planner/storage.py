from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Iterator


BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = BASE_DIR / "data" / "dog_meal_planner.db"
DB_PATH = Path(os.getenv("DOG_MEAL_PLANNER_DB", DEFAULT_DB_PATH))
SCHEMA_PATH = BASE_DIR / "src" / "dog_meal_planner" / "db" / "schema.sql"


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.executescript(SCHEMA_PATH.read_text())
        conn.commit()


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
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
