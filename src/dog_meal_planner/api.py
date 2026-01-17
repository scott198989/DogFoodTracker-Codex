from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from dog_meal_planner.models import Dog, Ingredient, Nutrients, Recipe, RecipeItem
from dog_meal_planner.nutrition import (
    MER_FACTORS,
    calories_to_grams,
    compute_meal_plan,
    compute_rer,
)
from dog_meal_planner.storage import db_session, init_db
from dog_meal_planner.usda import USDAClient, ingredient_from_usda


BASE_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(title="Dog Meal Planner")
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.on_event("startup")
async def startup() -> None:
    init_db()


class NutrientsPayload(BaseModel):
    kcal: float = 0
    protein_g: float = 0
    fat_g: float = 0
    carbs_g: float = 0
    calcium_mg: float = 0
    phosphorus_mg: float = 0
    iron_mg: float = 0
    zinc_mg: float = 0
    vitamin_a_iu: float = 0
    vitamin_d_iu: float = 0
    vitamin_e_mg: float = 0

    def to_model(self) -> Nutrients:
        return Nutrients(**self.model_dump())


class IngredientPayload(BaseModel):
    name: str
    kcal_per_100g: float
    nutrients_per_100g: NutrientsPayload = Field(default_factory=NutrientsPayload)

    def to_model(self) -> Ingredient:
        return Ingredient(
            name=self.name,
            kcal_per_100g=self.kcal_per_100g,
            nutrients_per_100g=self.nutrients_per_100g.to_model(),
        )


class RecipeItemPayload(BaseModel):
    ingredient: IngredientPayload
    grams: float

    def to_model(self) -> RecipeItem:
        return RecipeItem(ingredient=self.ingredient.to_model(), grams=self.grams)


class RecipePayload(BaseModel):
    items: List[RecipeItemPayload]

    def to_model(self) -> Recipe:
        return Recipe(items=[item.to_model() for item in self.items])


class DogPayload(BaseModel):
    weight_kg: float
    target_weight_kg: Optional[float] = None
    age_years: float
    sex: str
    neutered: bool
    activity: str

    def to_model(self) -> Dog:
        return Dog(**self.model_dump())


class ComputePlanPayload(BaseModel):
    dog: DogPayload
    mer_factor_key: str
    kibble: IngredientPayload
    kibble_grams: float
    treats_kcal: float
    recipe: RecipePayload
    meals: List[str] = Field(default_factory=lambda: ["breakfast", "dinner"])


class IngredientRecord(BaseModel):
    id: int
    name: str
    kcal_per_100g: float
    nutrients_per_100g: NutrientsPayload


class RecipeItemCreatePayload(BaseModel):
    grams: float
    ingredient_id: Optional[int] = None
    ingredient: Optional[IngredientPayload] = None


class RecipeCreatePayload(BaseModel):
    name: str
    items: List[RecipeItemCreatePayload] = Field(default_factory=list)


class RecipeItemRecord(BaseModel):
    id: int
    grams: float
    ingredient: IngredientRecord


class RecipeRecord(BaseModel):
    id: int
    name: str
    items: List[RecipeItemRecord]


class RecipeSummary(BaseModel):
    id: int
    name: str


class PlanPayload(BaseModel):
    name: str
    payload: Dict[str, Any]


class PlanRecord(BaseModel):
    id: int
    name: str
    payload: Dict[str, Any]
    created_at: str
    updated_at: str


class PlanSummary(BaseModel):
    id: int
    name: str
    updated_at: str


def nutrients_from_row(row: sqlite3.Row) -> Dict[str, float]:
    return {
        "kcal": row["kcal_per_100g"],
        "protein_g": row["protein_g"],
        "fat_g": row["fat_g"],
        "carbs_g": row["carbs_g"],
        "calcium_mg": row["calcium_mg"],
        "phosphorus_mg": row["phosphorus_mg"],
        "iron_mg": row["iron_mg"],
        "zinc_mg": row["zinc_mg"],
        "vitamin_a_iu": row["vitamin_a_iu"],
        "vitamin_d_iu": row["vitamin_d_iu"],
        "vitamin_e_mg": row["vitamin_e_mg"],
    }


def ingredient_from_row(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "kcal_per_100g": row["kcal_per_100g"],
        "nutrients_per_100g": nutrients_from_row(row),
    }


def fetch_ingredient_or_404(conn: sqlite3.Connection, ingredient_id: int) -> sqlite3.Row:
    row = conn.execute(
        """
        SELECT id, name, kcal_per_100g, protein_g, fat_g, carbs_g, calcium_mg, phosphorus_mg,
               iron_mg, zinc_mg, vitamin_a_iu, vitamin_d_iu, vitamin_e_mg
        FROM ingredients
        WHERE id = ?
        """,
        (ingredient_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return row


def insert_ingredient(conn: sqlite3.Connection, payload: IngredientPayload) -> int:
    nutrients = payload.nutrients_per_100g
    cursor = conn.execute(
        """
        INSERT INTO ingredients (
            name, kcal_per_100g, protein_g, fat_g, carbs_g, calcium_mg, phosphorus_mg,
            iron_mg, zinc_mg, vitamin_a_iu, vitamin_d_iu, vitamin_e_mg
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload.name,
            payload.kcal_per_100g,
            nutrients.protein_g,
            nutrients.fat_g,
            nutrients.carbs_g,
            nutrients.calcium_mg,
            nutrients.phosphorus_mg,
            nutrients.iron_mg,
            nutrients.zinc_mg,
            nutrients.vitamin_a_iu,
            nutrients.vitamin_d_iu,
            nutrients.vitamin_e_mg,
        ),
    )
    return int(cursor.lastrowid)


def resolve_item_ingredient_id(
    conn: sqlite3.Connection, item: RecipeItemCreatePayload
) -> int:
    if item.ingredient_id is not None:
        fetch_ingredient_or_404(conn, item.ingredient_id)
        return item.ingredient_id
    if item.ingredient is None:
        raise HTTPException(status_code=400, detail="Recipe item requires ingredient data")
    return insert_ingredient(conn, item.ingredient)


def fetch_recipe_items(conn: sqlite3.Connection, recipe_id: int) -> List[Dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT recipe_items.id AS item_id,
               recipe_items.grams AS grams,
               ingredients.id AS id,
               ingredients.name AS name,
               ingredients.kcal_per_100g AS kcal_per_100g,
               ingredients.protein_g AS protein_g,
               ingredients.fat_g AS fat_g,
               ingredients.carbs_g AS carbs_g,
               ingredients.calcium_mg AS calcium_mg,
               ingredients.phosphorus_mg AS phosphorus_mg,
               ingredients.iron_mg AS iron_mg,
               ingredients.zinc_mg AS zinc_mg,
               ingredients.vitamin_a_iu AS vitamin_a_iu,
               ingredients.vitamin_d_iu AS vitamin_d_iu,
               ingredients.vitamin_e_mg AS vitamin_e_mg
        FROM recipe_items
        JOIN ingredients ON ingredients.id = recipe_items.ingredient_id
        WHERE recipe_items.recipe_id = ?
        ORDER BY recipe_items.id
        """,
        (recipe_id,),
    ).fetchall()
    return [
        {
            "id": row["item_id"],
            "grams": row["grams"],
            "ingredient": ingredient_from_row(row),
        }
        for row in rows
    ]


def fetch_recipe_or_404(conn: sqlite3.Connection, recipe_id: int) -> Dict[str, Any]:
    recipe_row = conn.execute(
        "SELECT id, name FROM recipes WHERE id = ?",
        (recipe_id,),
    ).fetchone()
    if not recipe_row:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {
        "id": recipe_row["id"],
        "name": recipe_row["name"],
        "items": fetch_recipe_items(conn, recipe_id),
    }


def fetch_plan_or_404(conn: sqlite3.Connection, plan_id: int) -> sqlite3.Row:
    row = conn.execute(
        "SELECT id, name, payload, created_at, updated_at FROM plans WHERE id = ?",
        (plan_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    return row


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/")
async def frontend() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.post("/compute-plan")
async def compute_plan(payload: ComputePlanPayload) -> dict:
    if payload.mer_factor_key not in MER_FACTORS:
        raise HTTPException(status_code=400, detail="Unknown mer_factor_key")
    plan = compute_meal_plan(
        dog=payload.dog.to_model(),
        mer_factor=MER_FACTORS[payload.mer_factor_key],
        kibble=payload.kibble.to_model(),
        kibble_grams=payload.kibble_grams,
        treats_kcal=payload.treats_kcal,
        recipe=payload.recipe.to_model(),
        meals=tuple(payload.meals),
    )
    return {
        "target_kcal": plan.target_kcal,
        "kibble_kcal": plan.kibble_kcal,
        "treats_kcal": plan.treats_kcal,
        "homemade_kcal_budget": plan.homemade_kcal_budget,
        "total_kcal": plan.total_kcal,
        "nutrients_total": plan.nutrients_total.__dict__,
        "nutrients_per_1000_kcal": plan.nutrients_per_1000_kcal.__dict__,
        "aafco_warnings": plan.aafco_warnings,
        "per_meal_grams": plan.per_meal_grams,
    }


class USDAIngredientPayload(BaseModel):
    api_key: str
    fdc_id: int
    name_override: Optional[str] = None
    save: bool = False


@app.post("/ingredient/from-usda")
async def ingredient_from_usda_endpoint(
    payload: USDAIngredientPayload,
    conn: sqlite3.Connection = Depends(db_session),
) -> dict:
    client = USDAClient(api_key=payload.api_key)
    food = client.fetch_food(payload.fdc_id)
    ingredient = ingredient_from_usda(food, payload.name_override)
    response = {
        "name": ingredient.name,
        "kcal_per_100g": ingredient.kcal_per_100g,
        "nutrients_per_100g": ingredient.nutrients_per_100g.__dict__,
    }
    if payload.save:
        ingredient_payload = IngredientPayload(
            name=ingredient.name,
            kcal_per_100g=ingredient.kcal_per_100g,
            nutrients_per_100g=NutrientsPayload(**ingredient.nutrients_per_100g.__dict__),
        )
        response["id"] = insert_ingredient(conn, ingredient_payload)
    return response


@app.post("/ingredient/manual")
async def ingredient_manual(payload: IngredientPayload) -> dict:
    ingredient = payload.to_model()
    return {
        "name": ingredient.name,
        "kcal_per_100g": ingredient.kcal_per_100g,
        "nutrients_per_100g": ingredient.nutrients_per_100g.__dict__,
    }


@app.post("/recipe")
async def recipe_endpoint(payload: RecipePayload) -> dict:
    recipe = payload.to_model()
    nutrients = recipe.total_nutrients()
    return {
        "kcal": nutrients.kcal,
        "nutrients": nutrients.__dict__,
    }


@app.get("/rer/{weight_kg}")
async def rer(weight_kg: float) -> dict:
    return {"rer": compute_rer(weight_kg)}


@app.get("/kcal-to-grams")
async def kcal_to_grams(desired_kcal: float, kcal_per_100g: float) -> dict:
    return {"grams": calories_to_grams(desired_kcal, kcal_per_100g)}


@app.get("/rer")
async def rer_with_unit(weight: float, unit: str = "kg") -> dict:
    unit_key = unit.lower()
    if unit_key not in {"kg", "lb", "lbs"}:
        raise HTTPException(status_code=400, detail="Unit must be kg or lb")
    weight_kg = weight if unit_key == "kg" else weight * 0.45359237
    return {"rer": compute_rer(weight_kg), "weight_kg": weight_kg}


@app.post("/ingredients", response_model=IngredientRecord)
async def create_ingredient(
    payload: IngredientPayload,
    conn: sqlite3.Connection = Depends(db_session),
) -> IngredientRecord:
    ingredient_id = insert_ingredient(conn, payload)
    row = fetch_ingredient_or_404(conn, ingredient_id)
    return IngredientRecord(**ingredient_from_row(row))


@app.get("/ingredients", response_model=List[IngredientRecord])
async def list_ingredients(
    conn: sqlite3.Connection = Depends(db_session),
) -> List[IngredientRecord]:
    rows = conn.execute(
        """
        SELECT id, name, kcal_per_100g, protein_g, fat_g, carbs_g, calcium_mg, phosphorus_mg,
               iron_mg, zinc_mg, vitamin_a_iu, vitamin_d_iu, vitamin_e_mg
        FROM ingredients
        ORDER BY name
        """
    ).fetchall()
    return [IngredientRecord(**ingredient_from_row(row)) for row in rows]


@app.get("/ingredients/{ingredient_id}", response_model=IngredientRecord)
async def get_ingredient(
    ingredient_id: int,
    conn: sqlite3.Connection = Depends(db_session),
) -> IngredientRecord:
    row = fetch_ingredient_or_404(conn, ingredient_id)
    return IngredientRecord(**ingredient_from_row(row))


@app.put("/ingredients/{ingredient_id}", response_model=IngredientRecord)
async def update_ingredient(
    ingredient_id: int,
    payload: IngredientPayload,
    conn: sqlite3.Connection = Depends(db_session),
) -> IngredientRecord:
    nutrients = payload.nutrients_per_100g
    cursor = conn.execute(
        """
        UPDATE ingredients
        SET name = ?, kcal_per_100g = ?, protein_g = ?, fat_g = ?, carbs_g = ?,
            calcium_mg = ?, phosphorus_mg = ?, iron_mg = ?, zinc_mg = ?,
            vitamin_a_iu = ?, vitamin_d_iu = ?, vitamin_e_mg = ?
        WHERE id = ?
        """,
        (
            payload.name,
            payload.kcal_per_100g,
            nutrients.protein_g,
            nutrients.fat_g,
            nutrients.carbs_g,
            nutrients.calcium_mg,
            nutrients.phosphorus_mg,
            nutrients.iron_mg,
            nutrients.zinc_mg,
            nutrients.vitamin_a_iu,
            nutrients.vitamin_d_iu,
            nutrients.vitamin_e_mg,
            ingredient_id,
        ),
    )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    row = fetch_ingredient_or_404(conn, ingredient_id)
    return IngredientRecord(**ingredient_from_row(row))


@app.delete("/ingredients/{ingredient_id}")
async def delete_ingredient(
    ingredient_id: int,
    conn: sqlite3.Connection = Depends(db_session),
) -> dict:
    try:
        cursor = conn.execute("DELETE FROM ingredients WHERE id = ?", (ingredient_id,))
    except sqlite3.IntegrityError as exc:
        raise HTTPException(
            status_code=409,
            detail="Ingredient is referenced by a recipe",
        ) from exc
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return {"status": "deleted"}


@app.post("/recipes", response_model=RecipeRecord)
async def create_recipe(
    payload: RecipeCreatePayload,
    conn: sqlite3.Connection = Depends(db_session),
) -> RecipeRecord:
    cursor = conn.execute("INSERT INTO recipes (name) VALUES (?)", (payload.name,))
    recipe_id = int(cursor.lastrowid)
    for item in payload.items:
        ingredient_id = resolve_item_ingredient_id(conn, item)
        conn.execute(
            "INSERT INTO recipe_items (recipe_id, ingredient_id, grams) VALUES (?, ?, ?)",
            (recipe_id, ingredient_id, item.grams),
        )
    return RecipeRecord(**fetch_recipe_or_404(conn, recipe_id))


@app.get("/recipes", response_model=List[RecipeSummary])
async def list_recipes(
    conn: sqlite3.Connection = Depends(db_session),
) -> List[RecipeSummary]:
    rows = conn.execute("SELECT id, name FROM recipes ORDER BY name").fetchall()
    return [RecipeSummary(id=row["id"], name=row["name"]) for row in rows]


@app.get("/recipes/{recipe_id}", response_model=RecipeRecord)
async def get_recipe(
    recipe_id: int,
    conn: sqlite3.Connection = Depends(db_session),
) -> RecipeRecord:
    return RecipeRecord(**fetch_recipe_or_404(conn, recipe_id))


@app.put("/recipes/{recipe_id}", response_model=RecipeRecord)
async def update_recipe(
    recipe_id: int,
    payload: RecipeCreatePayload,
    conn: sqlite3.Connection = Depends(db_session),
) -> RecipeRecord:
    cursor = conn.execute("UPDATE recipes SET name = ? WHERE id = ?", (payload.name, recipe_id))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Recipe not found")
    conn.execute("DELETE FROM recipe_items WHERE recipe_id = ?", (recipe_id,))
    for item in payload.items:
        ingredient_id = resolve_item_ingredient_id(conn, item)
        conn.execute(
            "INSERT INTO recipe_items (recipe_id, ingredient_id, grams) VALUES (?, ?, ?)",
            (recipe_id, ingredient_id, item.grams),
        )
    return RecipeRecord(**fetch_recipe_or_404(conn, recipe_id))


@app.delete("/recipes/{recipe_id}")
async def delete_recipe(
    recipe_id: int,
    conn: sqlite3.Connection = Depends(db_session),
) -> dict:
    conn.execute("DELETE FROM recipe_items WHERE recipe_id = ?", (recipe_id,))
    cursor = conn.execute("DELETE FROM recipes WHERE id = ?", (recipe_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"status": "deleted"}


@app.post("/plans", response_model=PlanRecord)
async def create_plan(
    payload: PlanPayload,
    conn: sqlite3.Connection = Depends(db_session),
) -> PlanRecord:
    payload_json = json.dumps(payload.payload, ensure_ascii=True)
    existing = conn.execute("SELECT id FROM plans WHERE name = ?", (payload.name,)).fetchone()
    if existing:
        conn.execute(
            "UPDATE plans SET payload = ?, updated_at = datetime('now') WHERE id = ?",
            (payload_json, existing["id"]),
        )
        plan_id = existing["id"]
    else:
        cursor = conn.execute(
            "INSERT INTO plans (name, payload) VALUES (?, ?)",
            (payload.name, payload_json),
        )
        plan_id = int(cursor.lastrowid)
    row = fetch_plan_or_404(conn, plan_id)
    return PlanRecord(
        id=row["id"],
        name=row["name"],
        payload=json.loads(row["payload"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@app.get("/plans", response_model=List[PlanSummary])
async def list_plans(
    conn: sqlite3.Connection = Depends(db_session),
) -> List[PlanSummary]:
    rows = conn.execute(
        "SELECT id, name, updated_at FROM plans ORDER BY updated_at DESC"
    ).fetchall()
    return [PlanSummary(id=row["id"], name=row["name"], updated_at=row["updated_at"]) for row in rows]


@app.get("/plans/{plan_id}", response_model=PlanRecord)
async def get_plan(
    plan_id: int,
    conn: sqlite3.Connection = Depends(db_session),
) -> PlanRecord:
    row = fetch_plan_or_404(conn, plan_id)
    return PlanRecord(
        id=row["id"],
        name=row["name"],
        payload=json.loads(row["payload"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@app.put("/plans/{plan_id}", response_model=PlanRecord)
async def update_plan(
    plan_id: int,
    payload: PlanPayload,
    conn: sqlite3.Connection = Depends(db_session),
) -> PlanRecord:
    payload_json = json.dumps(payload.payload, ensure_ascii=True)
    try:
        cursor = conn.execute(
            """
            UPDATE plans
            SET name = ?, payload = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (payload.name, payload_json, plan_id),
        )
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="Plan name already exists") from exc
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    row = fetch_plan_or_404(conn, plan_id)
    return PlanRecord(
        id=row["id"],
        name=row["name"],
        payload=json.loads(row["payload"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@app.delete("/plans/{plan_id}")
async def delete_plan(
    plan_id: int,
    conn: sqlite3.Connection = Depends(db_session),
) -> dict:
    cursor = conn.execute("DELETE FROM plans WHERE id = ?", (plan_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"status": "deleted"}
