from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple

from dog_meal_planner.aafco import AAFCO_STANDARDS, evaluate_aafco
from dog_meal_planner.models import Dog, Ingredient, MealPlan, Nutrients, Recipe


RER_MULTIPLIER = 70.0
MER_FACTORS = {
    "neutered_adult": 1.6,
    "intact_adult": 1.8,
    "weight_loss": 1.1,
    "weight_gain": 1.8,
    "puppy_low": 2.0,
    "puppy_high": 3.0,
}


@dataclass(frozen=True)
class DailyCalories:
    rer: float
    mer: float


def compute_rer(weight_kg: float) -> float:
    return RER_MULTIPLIER * (weight_kg ** 0.75)


def compute_mer(rer: float, factor: float) -> float:
    return rer * factor


def calories_to_grams(desired_kcal: float, kcal_per_100g: float) -> float:
    if kcal_per_100g <= 0:
        raise ValueError("kcal_per_100g must be positive")
    return (desired_kcal / kcal_per_100g) * 100.0


def grams_to_calories(grams: float, kcal_per_100g: float) -> float:
    if grams < 0:
        raise ValueError("grams must be non-negative")
    return (grams / 100.0) * kcal_per_100g


def compute_daily_calories(dog: Dog, mer_factor: float) -> DailyCalories:
    rer = compute_rer(dog.weight_kg)
    mer = compute_mer(rer, mer_factor)
    return DailyCalories(rer=rer, mer=mer)


def compute_meal_plan(
    dog: Dog,
    mer_factor: float,
    kibble: Ingredient,
    kibble_grams: float,
    treats_kcal: float,
    recipe: Recipe,
    meals: Tuple[str, ...] = ("breakfast", "dinner"),
) -> MealPlan:
    daily = compute_daily_calories(dog, mer_factor)
    kibble_kcal = grams_to_calories(kibble_grams, kibble.kcal_per_100g)
    recipe_nutrients = recipe.total_nutrients()
    total_kcal = kibble_kcal + treats_kcal + recipe_nutrients.kcal
    remaining_kcal = max(daily.mer - kibble_kcal - treats_kcal, 0.0)
    homemade_kcal_budget = remaining_kcal
    nutrients_total = recipe_nutrients + Nutrients(kcal=kibble_kcal + treats_kcal)
    nutrients_per_1000 = normalize_per_1000_kcal(nutrients_total)
    aafco_warnings = evaluate_aafco(nutrients_per_1000, AAFCO_STANDARDS)
    per_meal_grams = split_recipe_by_meals(recipe, meals)

    return MealPlan(
        target_kcal=daily.mer,
        kibble_kcal=kibble_kcal,
        treats_kcal=treats_kcal,
        homemade_kcal_budget=homemade_kcal_budget,
        total_kcal=total_kcal,
        nutrients_total=nutrients_total,
        nutrients_per_1000_kcal=nutrients_per_1000,
        aafco_warnings=aafco_warnings,
        per_meal_grams=per_meal_grams,
    )


def normalize_per_1000_kcal(nutrients: Nutrients) -> Nutrients:
    if nutrients.kcal <= 0:
        return Nutrients()
    scale = 1000.0 / nutrients.kcal
    return Nutrients(
        kcal=1000.0,
        protein_g=nutrients.protein_g * scale,
        fat_g=nutrients.fat_g * scale,
        carbs_g=nutrients.carbs_g * scale,
        calcium_mg=nutrients.calcium_mg * scale,
        phosphorus_mg=nutrients.phosphorus_mg * scale,
        iron_mg=nutrients.iron_mg * scale,
        zinc_mg=nutrients.zinc_mg * scale,
        vitamin_a_iu=nutrients.vitamin_a_iu * scale,
        vitamin_d_iu=nutrients.vitamin_d_iu * scale,
        vitamin_e_mg=nutrients.vitamin_e_mg * scale,
    )


def split_recipe_by_meals(recipe: Recipe, meals: Tuple[str, ...]) -> Dict[str, float]:
    total_grams = sum(item.grams for item in recipe.items)
    if not meals:
        return {}
    per_meal = total_grams / len(meals)
    return {meal: per_meal for meal in meals}
