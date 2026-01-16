# Dog Meal Planner – Full Project Spec

This file contains two prompts:
- PROMPT FOR CLAUDE CODE
- PROMPT FOR CODEX

Nothing in this file should be parsed as UI. This is a pure backend + math engine spec.

============================================================
====================== CLAUDE PROMPT =======================
============================================================

# Dog Meal Planner – Full Backend MVP

You are a senior full-stack engineer and data engineer. Build a production-quality MVP backend for a Dog Meal Planner application.

The app allows users to calculate precise dog meals (homemade + kibble + treats) using real nutrition data and real math.

------------------------------------------------------------
GOALS
------------------------------------------------------------

- Accurate calorie calculation per dog
- Ingredient-level nutrition using USDA FoodData Central API
- Optional brand food support (manual entry or OpenFoodFacts)
- Recipe builder with grams
- Nutrient aggregation and deficiency warnings vs AAFCO guidelines
- Clean, testable backend API

------------------------------------------------------------
TECH REQUIREMENTS
------------------------------------------------------------

- Backend: Node.js (Fastify/Express) OR Python (FastAPI)
- DB: SQLite (default) or Postgres
- External APIs:
  - USDA FoodData Central
  - Optional: OpenFoodFacts
- Focus on backend + correctness, not UI

------------------------------------------------------------
CORE MATH ENGINE
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
target_kcal = MER
remaining_for_homemade = target_kcal - kibble_kcal - treats_kcal

kcal → grams:
grams = (desired_kcal / kcal_per_100g) × 100

Nutrient totals:
total = Σ(ingredient_grams × nutrient_per_100g / 100)

------------------------------------------------------------
NUTRIENTS TO TRACK (per 100g)
------------------------------------------------------------

- kcal
- protein (g)
- fat (g)
- carbs (g)
- calcium (mg)
- phosphorus (mg)
- iron (mg)
- zinc (mg)
- vitamin A (mcg)
- vitamin D (mcg)
- vitamin E (mg)

------------------------------------------------------------
AAFCO COMPARISON
------------------------------------------------------------

Table:

AAFCORequirement:
- nutrient
- min_per_1000kcal
- max_per_1000kcal (nullable)

Compute:
dog_intake_per_1000kcal = (total_nutrient / total_kcal) × 1000

Warn if below min or above max.

------------------------------------------------------------
DATA MODELS
------------------------------------------------------------

Dog:
- id
- name
- age_years
- sex
- neutered
- weight_kg
- target_weight_kg
- activity_level

Ingredient:
- id
- name
- source_type (USDA | BRAND | USER)
- source_id
- kcal_per_100g
- protein_g_per_100g
- fat_g_per_100g
- carbs_g_per_100g
- calcium_mg_per_100g
- phosphorus_mg_per_100g
- iron_mg_per_100g
- zinc_mg_per_100g
- vitamin_a_mcg_per_100g
- vitamin_d_mcg_per_100g
- vitamin_e_mg_per_100g

Recipe:
- id
- name
- meals_per_day

RecipeIngredient:
- recipe_id
- ingredient_id
- grams

FeedingPlan:
- dog_id
- recipe_id
- kibble_kcal
- treats_kcal
- homemade_kcal
- target_kcal

------------------------------------------------------------
EXTERNAL INTEGRATION
------------------------------------------------------------

USDA FoodData Central:
- Search foods
- Fetch by fdcId
- Normalize all nutrients to per-100g

------------------------------------------------------------
REST ENDPOINTS
------------------------------------------------------------

- POST /dog
- GET /dog/{id}
- GET /ingredient/search?q=...
- POST /ingredient/from-usda
- POST /ingredient/manual
- POST /recipe
- POST /recipe/{id}/ingredient
- POST /plan/compute

------------------------------------------------------------
/plan/compute RETURNS
------------------------------------------------------------

- target kcal
- kibble kcal
- treats kcal
- homemade kcal
- per-meal kcal
- per-ingredient grams per day
- per-ingredient grams per meal
- nutrient totals
- AAFCO warnings

------------------------------------------------------------
TESTING
------------------------------------------------------------

- RER/MER math
- kcal ↔ grams conversion
- nutrient aggregation
- AAFCO comparison

------------------------------------------------------------
DELIVERABLES
------------------------------------------------------------

- Full backend project
- DB schema
- Core calculation engine
- USDA integration service
- Seed data
- Example API calls
- README

------------------------------------------------------------
PRIORITY
------------------------------------------------------------

- Mathematical correctness
- Clean architecture
- Deterministic outputs
- Clarity over cleverness

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
