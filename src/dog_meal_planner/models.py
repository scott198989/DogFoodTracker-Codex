from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass(frozen=True)
class Dog:
    weight_kg: float
    target_weight_kg: Optional[float]
    age_years: float
    sex: str
    neutered: bool
    activity: str


@dataclass(frozen=True)
class Nutrients:
    kcal: float = 0.0
    protein_g: float = 0.0
    fat_g: float = 0.0
    carbs_g: float = 0.0
    calcium_mg: float = 0.0
    phosphorus_mg: float = 0.0
    iron_mg: float = 0.0
    zinc_mg: float = 0.0
    vitamin_a_iu: float = 0.0
    vitamin_d_iu: float = 0.0
    vitamin_e_mg: float = 0.0

    def __add__(self, other: "Nutrients") -> "Nutrients":
        return Nutrients(
            kcal=self.kcal + other.kcal,
            protein_g=self.protein_g + other.protein_g,
            fat_g=self.fat_g + other.fat_g,
            carbs_g=self.carbs_g + other.carbs_g,
            calcium_mg=self.calcium_mg + other.calcium_mg,
            phosphorus_mg=self.phosphorus_mg + other.phosphorus_mg,
            iron_mg=self.iron_mg + other.iron_mg,
            zinc_mg=self.zinc_mg + other.zinc_mg,
            vitamin_a_iu=self.vitamin_a_iu + other.vitamin_a_iu,
            vitamin_d_iu=self.vitamin_d_iu + other.vitamin_d_iu,
            vitamin_e_mg=self.vitamin_e_mg + other.vitamin_e_mg,
        )


@dataclass(frozen=True)
class Ingredient:
    name: str
    kcal_per_100g: float
    nutrients_per_100g: Nutrients = field(default_factory=Nutrients)


@dataclass(frozen=True)
class RecipeItem:
    ingredient: Ingredient
    grams: float


@dataclass(frozen=True)
class Recipe:
    items: List[RecipeItem]

    def total_nutrients(self) -> Nutrients:
        total = Nutrients()
        for item in self.items:
            scale = item.grams / 100.0
            total += Nutrients(
                kcal=item.ingredient.kcal_per_100g * scale,
                protein_g=item.ingredient.nutrients_per_100g.protein_g * scale,
                fat_g=item.ingredient.nutrients_per_100g.fat_g * scale,
                carbs_g=item.ingredient.nutrients_per_100g.carbs_g * scale,
                calcium_mg=item.ingredient.nutrients_per_100g.calcium_mg * scale,
                phosphorus_mg=item.ingredient.nutrients_per_100g.phosphorus_mg * scale,
                iron_mg=item.ingredient.nutrients_per_100g.iron_mg * scale,
                zinc_mg=item.ingredient.nutrients_per_100g.zinc_mg * scale,
                vitamin_a_iu=item.ingredient.nutrients_per_100g.vitamin_a_iu * scale,
                vitamin_d_iu=item.ingredient.nutrients_per_100g.vitamin_d_iu * scale,
                vitamin_e_mg=item.ingredient.nutrients_per_100g.vitamin_e_mg * scale,
            )
        return total


@dataclass(frozen=True)
class MealPlan:
    target_kcal: float
    kibble_kcal: float
    treats_kcal: float
    homemade_kcal_budget: float
    total_kcal: float
    nutrients_total: Nutrients
    nutrients_per_1000_kcal: Nutrients
    aafco_warnings: Dict[str, str]
    per_meal_grams: Dict[str, float]
