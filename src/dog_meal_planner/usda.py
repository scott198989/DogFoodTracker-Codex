from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

import requests

from dog_meal_planner.models import Ingredient, Nutrients


@dataclass(frozen=True)
class USDAFood:
    fdc_id: int
    description: str
    nutrients_per_100g: Nutrients
    kcal_per_100g: float


class USDAClient:
    def __init__(self, api_key: str, base_url: str = "https://api.nal.usda.gov/fdc/v1") -> None:
        self.api_key = api_key
        self.base_url = base_url

    def fetch_food(self, fdc_id: int) -> USDAFood:
        url = f"{self.base_url}/food/{fdc_id}"
        response = requests.get(url, params={"api_key": self.api_key}, timeout=30)
        response.raise_for_status()
        payload = response.json()
        return self._parse_food(payload)

    def _parse_food(self, payload: Dict) -> USDAFood:
        nutrients = {item["nutrient"]["name"].lower(): item["amount"] for item in payload.get("foodNutrients", [])}
        kcal = nutrients.get("energy", 0.0)
        return USDAFood(
            fdc_id=payload["fdcId"],
            description=payload.get("description", "unknown"),
            nutrients_per_100g=Nutrients(
                kcal=kcal,
                protein_g=nutrients.get("protein", 0.0),
                fat_g=nutrients.get("total lipid (fat)", 0.0),
                carbs_g=nutrients.get("carbohydrate, by difference", 0.0),
                calcium_mg=nutrients.get("calcium, ca", 0.0),
                phosphorus_mg=nutrients.get("phosphorus, p", 0.0),
                iron_mg=nutrients.get("iron, fe", 0.0),
                zinc_mg=nutrients.get("zinc, zn", 0.0),
                vitamin_a_iu=nutrients.get("vitamin a, iu", 0.0),
                vitamin_d_iu=nutrients.get("vitamin d (d2 + d3)", 0.0),
                vitamin_e_mg=nutrients.get("vitamin e (alpha-tocopherol)", 0.0),
            ),
            kcal_per_100g=kcal,
        )


def ingredient_from_usda(food: USDAFood, name_override: Optional[str] = None) -> Ingredient:
    return Ingredient(
        name=name_override or food.description,
        kcal_per_100g=food.kcal_per_100g,
        nutrients_per_100g=food.nutrients_per_100g,
    )
