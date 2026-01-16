# Dog Meal Planner – Full Project Spec

This file contains two prompts:
- PROMPT FOR CLAUDE CODE
- PROMPT FOR CODEX

Nothing in this file should be parsed as UI. This is a pure backend + math engine spec.


============================================================
======================= CODEX PROMPT =======================
============================================================

# Dog Meal Planner – Nutrition Engine

You are an expert backend and systems engineer.

Build a backend service that computes precise dog meals from real nutrition data.

------------------------------------------------------------
RESPONSIBILITIES
------------------------------------------------------------

- Compute dog daily calorie needs
- Support:
  - Kibble calories
  - Treat calories
  - Homemade recipe calories
- Convert calories ↔ grams
- Aggregate nutrients
- Compare vs AAFCO standards
- Output warnings

------------------------------------------------------------
FORMULAS
------------------------------------------------------------

RER:
RER = 70 × (weight_kg ^ 0.75)

MER:
MER = RER × factor

Factors:
- Neutered adult: 1.6
- Intact adult: 1.8
- Weight loss: 1.1
- Weight gain: 1.8
- Puppy: 2.0–3.0

Allocation:
remaining_kcal = target_kcal - kibble_kcal - treats_kcal

kcal → grams:
grams = (desired_kcal / kcal_per_100g) × 100

------------------------------------------------------------
NUTRIENTS
------------------------------------------------------------

Track:
- kcal
- protein
- fat
- carbs
- calcium
- phosphorus
- iron
- zinc
- vitamin A
- vitamin D
- vitamin E

------------------------------------------------------------
DATA STRUCTURES
------------------------------------------------------------

Dog:
- weight_kg
- target_weight_kg
- age
- sex
- neutered
- activity

Ingredient:
- name
- kcal_per_100g
- macros
- micros

Recipe:
- list of (ingredient, grams)

------------------------------------------------------------
ENGINE MUST COMPUTE
------------------------------------------------------------

- target kcal
- homemade kcal budget
- total kcal
- per-meal portions
- total nutrients
- nutrients per 1000 kcal
- AAFCO warnings

------------------------------------------------------------
EXTERNAL DATA
------------------------------------------------------------

- Integrate USDA FoodData Central API
- Normalize foods to per-100g

------------------------------------------------------------
API
------------------------------------------------------------

- POST /compute-plan
- POST /ingredient/from-usda
- POST /ingredient/manual
- POST /recipe

------------------------------------------------------------
TESTS
------------------------------------------------------------

- RER/MER math
- kcal ↔ grams
- nutrient aggregation
- AAFCO comparison

------------------------------------------------------------
DELIVERABLES
------------------------------------------------------------

- Backend project
- Calculation engine
- API layer
- SQLite schema
- Example inputs & outputs

------------------------------------------------------------
PRIORITY RULES
------------------------------------------------------------

- Correctness > speed
- Explicit math
- Deterministic outputs
- No hand-wavy logic
