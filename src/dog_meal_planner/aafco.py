from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

from dog_meal_planner.models import Nutrients


@dataclass(frozen=True)
class AAFCOStandard:
    name: str
    minimum: float
    units: str


# TODO: Replace placeholders with authoritative AAFCO minimums for adult maintenance per 1000 kcal.
AAFCO_STANDARDS: Dict[str, AAFCOStandard] = {
    "protein_g": AAFCOStandard("protein", 45.0, "g"),
    "fat_g": AAFCOStandard("fat", 13.0, "g"),
    "calcium_mg": AAFCOStandard("calcium", 1250.0, "mg"),
    "phosphorus_mg": AAFCOStandard("phosphorus", 1000.0, "mg"),
    "iron_mg": AAFCOStandard("iron", 7.5, "mg"),
    "zinc_mg": AAFCOStandard("zinc", 15.0, "mg"),
    "vitamin_a_iu": AAFCOStandard("vitamin A", 1250.0, "IU"),
    "vitamin_d_iu": AAFCOStandard("vitamin D", 125.0, "IU"),
    "vitamin_e_mg": AAFCOStandard("vitamin E", 12.5, "mg"),
}


def evaluate_aafco(nutrients_per_1000_kcal: Nutrients, standards: Dict[str, AAFCOStandard]) -> Dict[str, str]:
    warnings: Dict[str, str] = {}
    for field, standard in standards.items():
        value = getattr(nutrients_per_1000_kcal, field)
        if value < standard.minimum:
            warnings[field] = (
                f"{standard.name} below minimum: {value:.2f}{standard.units} "
                f"< {standard.minimum}{standard.units}"
            )
    return warnings
