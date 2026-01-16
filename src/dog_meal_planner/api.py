from __future__ import annotations

from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from dog_meal_planner.models import Dog, Ingredient, Nutrients, Recipe, RecipeItem
from dog_meal_planner.nutrition import (
    MER_FACTORS,
    calories_to_grams,
    compute_meal_plan,
    compute_rer,
)
from dog_meal_planner.usda import USDAClient, ingredient_from_usda


app = FastAPI(title="Dog Meal Planner")


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


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


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


@app.post("/ingredient/from-usda")
async def ingredient_from_usda_endpoint(payload: USDAIngredientPayload) -> dict:
    client = USDAClient(api_key=payload.api_key)
    food = client.fetch_food(payload.fdc_id)
    ingredient = ingredient_from_usda(food, payload.name_override)
    return {
        "name": ingredient.name,
        "kcal_per_100g": ingredient.kcal_per_100g,
        "nutrients_per_100g": ingredient.nutrients_per_100g.__dict__,
    }


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
