-- SQLite schema for dog meal planner

CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    kcal_per_100g REAL NOT NULL,
    protein_g REAL DEFAULT 0,
    fat_g REAL DEFAULT 0,
    carbs_g REAL DEFAULT 0,
    calcium_mg REAL DEFAULT 0,
    phosphorus_mg REAL DEFAULT 0,
    iron_mg REAL DEFAULT 0,
    zinc_mg REAL DEFAULT 0,
    vitamin_a_iu REAL DEFAULT 0,
    vitamin_d_iu REAL DEFAULT 0,
    vitamin_e_mg REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    grams REAL NOT NULL,
    FOREIGN KEY(recipe_id) REFERENCES recipes(id),
    FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
);

CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
