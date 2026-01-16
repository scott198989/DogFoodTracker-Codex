from dog_meal_planner.models import Dog, Ingredient, Nutrients, Recipe, RecipeItem
from dog_meal_planner.nutrition import (
    MER_FACTORS,
    calories_to_grams,
    compute_meal_plan,
    compute_rer,
    grams_to_calories,
)


def test_rer_mer_math():
    rer = compute_rer(10.0)
    assert round(rer, 2) == round(70 * (10.0 ** 0.75), 2)


def test_kcal_grams_roundtrip():
    grams = calories_to_grams(200, 400)
    assert grams == 50.0
    kcal = grams_to_calories(grams, 400)
    assert kcal == 200.0


def test_plan_aggregation():
    dog = Dog(
        weight_kg=20.0,
        target_weight_kg=20.0,
        age_years=3.0,
        sex="male",
        neutered=True,
        activity="moderate",
    )
    kibble = Ingredient(name="kibble", kcal_per_100g=350.0)
    recipe = Recipe(
        items=[
            RecipeItem(
                ingredient=Ingredient(
                    name="chicken",
                    kcal_per_100g=165.0,
                    nutrients_per_100g=Nutrients(protein_g=31.0, fat_g=3.6),
                ),
                grams=200.0,
            )
        ]
    )
    plan = compute_meal_plan(
        dog=dog,
        mer_factor=MER_FACTORS["neutered_adult"],
        kibble=kibble,
        kibble_grams=100.0,
        treats_kcal=50.0,
        recipe=recipe,
    )
    assert plan.total_kcal > 0
    assert plan.nutrients_total.protein_g > 0
