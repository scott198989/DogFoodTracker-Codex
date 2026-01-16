const resultEl = document.getElementById("result");
const addItemButton = document.getElementById("add-item");
const computeButton = document.getElementById("compute");
const recipeItemsContainer = document.getElementById("recipe-items");
const itemTemplate = document.getElementById("item-template");
const rerValueEl = document.getElementById("rer-value");
const merValueEl = document.getElementById("mer-value");
const merFactorLabelEl = document.getElementById("mer-factor-label");
const foodKcalEl = document.getElementById("food-kcal");
const perMealKcalEl = document.getElementById("per-meal-kcal");
const mealTagsEl = document.getElementById("meal-tags");
const mealPacingEl = document.getElementById("meal-pacing");
const recipeKcalEl = document.getElementById("recipe-kcal");
const recipeProteinEl = document.getElementById("recipe-protein");
const recipeFatEl = document.getElementById("recipe-fat");
const recipeCarbsEl = document.getElementById("recipe-carbs");
const statusRowEl = document.getElementById("status-row");
const kcalProgressEl = document.getElementById("kcal-progress");
const savePlanButton = document.getElementById("save-plan");
const loadPlanButton = document.getElementById("load-plan");
const resetPlanButton = document.getElementById("reset-plan");

const merFactorMap = {
  neutered_adult: 1.6,
  intact_adult: 1.8,
  weight_loss: 1.1,
  weight_gain: 1.8,
  puppy_low: 2.0,
  puppy_high: 3.0,
};

const parseNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const parseBool = (value) => value === "true";

const parseOptionalNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const formatNumber = (value) => {
  if (Number.isNaN(value) || value === null || value === undefined) {
    return "0";
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value);
};

const readNutrients = (container) => {
  const nutrients = {};
  container.querySelectorAll("input[data-field]").forEach((input) => {
    const field = input.dataset.field;
    nutrients[field] = parseNumber(input.value);
  });
  return nutrients;
};

const buildIngredient = (container) => {
  const name = container.querySelector("input[data-field='name']").value.trim();
  const kcalPer100g = parseNumber(
    container.querySelector("input[data-field='kcal_per_100g']").value
  );
  const nutrientInputs = container.querySelector(".nutrients");
  const nutrientsPer100g = nutrientInputs ? readNutrients(nutrientInputs) : {};

  return {
    name: name || "Unnamed ingredient",
    kcal_per_100g: kcalPer100g,
    nutrients_per_100g: nutrientsPer100g,
  };
};

const buildRecipeItems = () => {
  const items = [];
  recipeItemsContainer.querySelectorAll(".recipe-item").forEach((itemEl) => {
    const ingredient = buildIngredient(itemEl);
    const grams = parseNumber(
      itemEl.querySelector("input[data-field='grams']").value
    );
    items.push({ ingredient, grams });
  });
  return items;
};

const listMeals = () =>
  document
    .getElementById("meals")
    .value.split(",")
    .map((meal) => meal.trim())
    .filter((meal) => meal.length > 0);

const addRecipeItem = () => {
  const fragment = itemTemplate.content.cloneNode(true);
  const itemEl = fragment.querySelector(".recipe-item");
  itemEl.querySelector(".remove").addEventListener("click", () => {
    itemEl.remove();
    refreshSummary();
  });
  itemEl.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => refreshSummary());
  });
  recipeItemsContainer.appendChild(fragment);
};

const buildPayload = () => {
  const kibbleNutrients = readNutrients(
    document.querySelector(".nutrients[data-prefix='kibble']")
  );

  const kibble = {
    name: document.getElementById("kibble-name").value.trim() || "Kibble",
    kcal_per_100g: parseNumber(document.getElementById("kibble-kcal").value),
    nutrients_per_100g: kibbleNutrients,
  };

  const meals = listMeals();

  return {
    dog: {
      weight_kg: parseNumber(document.getElementById("dog-weight").value),
      target_weight_kg: parseOptionalNumber(
        document.getElementById("dog-target-weight").value
      ),
      age_years: parseNumber(document.getElementById("dog-age").value),
      sex: document.getElementById("dog-sex").value,
      neutered: parseBool(document.getElementById("dog-neutered").value),
      activity: document.getElementById("dog-activity").value.trim() || "unknown",
    },
    mer_factor_key: document.getElementById("mer-factor").value,
    kibble,
    kibble_grams: parseNumber(document.getElementById("kibble-grams").value),
    treats_kcal: parseNumber(document.getElementById("treats-kcal").value),
    recipe: {
      items: buildRecipeItems(),
    },
    meals: meals.length ? meals : ["breakfast", "dinner"],
  };
};

const formatResult = (data) => JSON.stringify(data, null, 2);

const handleError = (message) => {
  resultEl.textContent = message;
  resultEl.classList.add("error");
};

const handleSuccess = (data) => {
  resultEl.classList.remove("error");
  resultEl.textContent = formatResult(data);
};

const calculateRer = (weightKg) => {
  if (!weightKg || weightKg <= 0) {
    return 0;
  }
  return 70 * Math.pow(weightKg, 0.75);
};

const calculateRecipeTotals = () => {
  let kcalTotal = 0;
  let proteinTotal = 0;
  let fatTotal = 0;
  let carbsTotal = 0;

  buildRecipeItems().forEach(({ ingredient, grams }) => {
    const multiplier = grams / 100;
    kcalTotal += ingredient.kcal_per_100g * multiplier;
    proteinTotal += (ingredient.nutrients_per_100g.protein_g || 0) * multiplier;
    fatTotal += (ingredient.nutrients_per_100g.fat_g || 0) * multiplier;
    carbsTotal += (ingredient.nutrients_per_100g.carbs_g || 0) * multiplier;
  });

  return {
    kcalTotal,
    proteinTotal,
    fatTotal,
    carbsTotal,
  };
};

const updateMealTags = (meals) => {
  mealTagsEl.innerHTML = "";
  meals.forEach((meal) => {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = meal;
    mealTagsEl.appendChild(pill);
  });
};

const updateStatusPills = (merTarget, totalKcal) => {
  statusRowEl.innerHTML = "";
  const createPill = (text, isWarning = false) => {
    const pill = document.createElement("span");
    pill.className = `status-pill${isWarning ? " warning" : ""}`;
    pill.textContent = text;
    statusRowEl.appendChild(pill);
  };

  if (merTarget > 0) {
    const delta = totalKcal - merTarget;
    const sign = delta >= 0 ? "+" : "";
    createPill(`Δ ${sign}${formatNumber(delta)} kcal vs target`, Math.abs(delta) > 200);
  }
  if (totalKcal === 0) {
    createPill("Add food inputs to see totals", true);
  }
};

const refreshSummary = () => {
  const weight = parseNumber(document.getElementById("dog-weight").value);
  const merFactorKey = document.getElementById("mer-factor").value;
  const merFactor = merFactorMap[merFactorKey] || 1.6;
  const rer = calculateRer(weight);
  const merTarget = rer * merFactor;
  const kibbleKcal =
    (parseNumber(document.getElementById("kibble-kcal").value) *
      parseNumber(document.getElementById("kibble-grams").value)) /
    100;
  const treatsKcal = parseNumber(document.getElementById("treats-kcal").value);
  const recipeTotals = calculateRecipeTotals();
  const totalKcal = kibbleKcal + treatsKcal + recipeTotals.kcalTotal;
  const meals = listMeals();
  const perMeal = meals.length ? totalKcal / meals.length : 0;

  rerValueEl.textContent = formatNumber(rer);
  merValueEl.textContent = formatNumber(merTarget);
  merFactorLabelEl.textContent = `Factor ${merFactor}`;
  foodKcalEl.textContent = formatNumber(totalKcal);
  perMealKcalEl.textContent = `${formatNumber(perMeal)} per meal`;
  mealPacingEl.textContent = meals.length
    ? `${meals.length} meals → ${formatNumber(perMeal)} kcal each`
    : "Add meals to see the per-meal target.";
  updateMealTags(meals.length ? meals : ["breakfast", "dinner"]);
  recipeKcalEl.textContent = formatNumber(recipeTotals.kcalTotal);
  recipeProteinEl.textContent = formatNumber(recipeTotals.proteinTotal);
  recipeFatEl.textContent = formatNumber(recipeTotals.fatTotal);
  recipeCarbsEl.textContent = formatNumber(recipeTotals.carbsTotal);
  updateStatusPills(merTarget, totalKcal);

  const progress = merTarget > 0 ? Math.min((totalKcal / merTarget) * 100, 140) : 0;
  kcalProgressEl.style.width = `${progress}%`;
};

const collectFormState = () => {
  const state = {
    fields: {
      "dog-weight": document.getElementById("dog-weight").value,
      "dog-target-weight": document.getElementById("dog-target-weight").value,
      "dog-age": document.getElementById("dog-age").value,
      "dog-sex": document.getElementById("dog-sex").value,
      "dog-neutered": document.getElementById("dog-neutered").value,
      "dog-activity": document.getElementById("dog-activity").value,
      "mer-factor": document.getElementById("mer-factor").value,
      "treats-kcal": document.getElementById("treats-kcal").value,
      meals: document.getElementById("meals").value,
      "kibble-name": document.getElementById("kibble-name").value,
      "kibble-kcal": document.getElementById("kibble-kcal").value,
      "kibble-grams": document.getElementById("kibble-grams").value,
    },
    kibbleNutrients: readNutrients(
      document.querySelector(".nutrients[data-prefix='kibble']")
    ),
    recipeItems: buildRecipeItems(),
  };

  return state;
};

const applyFormState = (state) => {
  if (!state) {
    return;
  }

  Object.entries(state.fields || {}).forEach(([id, value]) => {
    const input = document.getElementById(id);
    if (input) {
      input.value = value;
    }
  });

  const kibbleContainer = document.querySelector(".nutrients[data-prefix='kibble']");
  if (kibbleContainer && state.kibbleNutrients) {
    kibbleContainer.querySelectorAll("input[data-field]").forEach((input) => {
      input.value = state.kibbleNutrients[input.dataset.field] ?? "";
    });
  }

  recipeItemsContainer.innerHTML = "";
  (state.recipeItems || []).forEach((item) => {
    const fragment = itemTemplate.content.cloneNode(true);
    const itemEl = fragment.querySelector(".recipe-item");
    itemEl.querySelector("input[data-field='name']").value =
      item.ingredient?.name || "";
    itemEl.querySelector("input[data-field='kcal_per_100g']").value =
      item.ingredient?.kcal_per_100g ?? "";
    itemEl.querySelector("input[data-field='grams']").value = item.grams ?? "";
    const nutrients = item.ingredient?.nutrients_per_100g || {};
    itemEl.querySelectorAll(".nutrients input[data-field]").forEach((input) => {
      input.value = nutrients[input.dataset.field] ?? "";
    });
    itemEl.querySelector(".remove").addEventListener("click", () => {
      itemEl.remove();
      refreshSummary();
    });
    itemEl.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => refreshSummary());
    });
    recipeItemsContainer.appendChild(fragment);
  });

  refreshSummary();
};

const savePlan = () => {
  const state = collectFormState();
  localStorage.setItem("dogMealPlannerState", JSON.stringify(state));
  handleSuccess({ status: "Saved plan to local storage." });
};

const loadPlan = () => {
  const stored = localStorage.getItem("dogMealPlannerState");
  if (!stored) {
    handleError("No saved plan found in this browser.");
    return;
  }
  applyFormState(JSON.parse(stored));
  handleSuccess({ status: "Loaded saved plan." });
};

const resetPlan = () => {
  document.querySelectorAll("input, select").forEach((input) => {
    if (input.type === "number" || input.type === "text") {
      input.value = input.defaultValue || "";
    } else if (input.tagName === "SELECT") {
      input.value = input.querySelector("option")?.value || "";
    }
  });
  recipeItemsContainer.innerHTML = "";
  addRecipeItem();
  refreshSummary();
  handleSuccess({ status: "Reset to defaults." });
};

const computePlan = async () => {
  const payload = buildPayload();
  resultEl.textContent = "Computing...";
  try {
    const response = await fetch("/compute-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      handleError(`Request failed (${response.status}). ${errorText}`);
      return;
    }
    const data = await response.json();
    handleSuccess(data);
  } catch (error) {
    handleError(`Request failed. ${error}`);
  }
};

addItemButton.addEventListener("click", () => addRecipeItem());
computeButton.addEventListener("click", () => computePlan());
savePlanButton.addEventListener("click", () => savePlan());
loadPlanButton.addEventListener("click", () => loadPlan());
resetPlanButton.addEventListener("click", () => resetPlan());

document.querySelectorAll("input, select").forEach((input) => {
  input.addEventListener("input", () => refreshSummary());
  input.addEventListener("change", () => refreshSummary());
});

addRecipeItem();
refreshSummary();
