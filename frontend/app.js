const resultEl = document.getElementById("result");
const addItemButton = document.getElementById("add-item");
const computeButton = document.getElementById("compute");
const recipeItemsContainer = document.getElementById("recipe-items");
const itemTemplate = document.getElementById("item-template");
const weightUnitEl = document.getElementById("weight-unit");
const weightUnitLabelEl = document.getElementById("weight-unit-label");
const targetWeightUnitLabelEl = document.getElementById("target-weight-unit-label");
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
const deletePlanButton = document.getElementById("delete-plan");
const resetPlanButton = document.getElementById("reset-plan");
const planNameInput = document.getElementById("plan-name");
const planSelect = document.getElementById("plan-select");
const recipeNameInput = document.getElementById("recipe-name");
const recipeSelect = document.getElementById("recipe-select");
const saveRecipeButton = document.getElementById("save-recipe");
const loadRecipeButton = document.getElementById("load-recipe");
const deleteRecipeButton = document.getElementById("delete-recipe");
const usdaApiKeyInput = document.getElementById("usda-api-key");
const usdaFdcInput = document.getElementById("usda-fdc-id");
const usdaNameOverrideInput = document.getElementById("usda-name-override");
const usdaFetchButton = document.getElementById("usda-fetch");
const macroProteinValueEl = document.getElementById("macro-protein-value");
const macroFatValueEl = document.getElementById("macro-fat-value");
const macroCarbValueEl = document.getElementById("macro-carb-value");
const macroProteinBarEl = document.getElementById("macro-protein-bar");
const macroFatBarEl = document.getElementById("macro-fat-bar");
const macroCarbBarEl = document.getElementById("macro-carb-bar");
const macroRatioLabelEl = document.getElementById("macro-ratio-label");
const mealDistributionEl = document.getElementById("meal-distribution");
const ingredientHighlightsEl = document.getElementById("ingredient-highlights");
const waterProgressEl = document.getElementById("water-progress");
const waterCurrentEl = document.getElementById("water-current");
const waterTargetEl = document.getElementById("water-target");
const hydrationStatusEl = document.getElementById("hydration-status");
const macroCalorieSplitEl = document.getElementById("macro-calorie-split");
const proteinPerKgEl = document.getElementById("protein-per-kg");
const proteinUnitLabelEl = document.getElementById("protein-unit-label");
const capRatioEl = document.getElementById("cap-ratio");
const micronutrientSignalEl = document.getElementById("micronutrient-signal");
const diagnosticStatusEl = document.getElementById("diagnostic-status");

const merFactorMap = {
  neutered_adult: 1.6,
  intact_adult: 1.8,
  weight_loss: 1.1,
  weight_gain: 1.8,
  puppy_low: 2.0,
  puppy_high: 3.0,
};

const KG_PER_LB = 0.45359237;
const LB_PER_KG = 1 / KG_PER_LB;
const USDA_API_KEY_STORAGE = "usdaApiKey";

let currentWeightUnit = weightUnitEl?.value || "kg";

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

const toKg = (value, unit) => (unit === "kg" ? value : value * KG_PER_LB);

const convertWeightValue = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit) {
    return value;
  }
  return fromUnit === "kg" ? value * LB_PER_KG : value * KG_PER_LB;
};

const convertWeightInput = (input, fromUnit, toUnit) => {
  if (!input || input.value === "") {
    return;
  }
  const value = parseNumber(input.value);
  const converted = convertWeightValue(value, fromUnit, toUnit);
  input.value = formatNumber(converted);
};

const updateWeightUnitLabels = (unit) => {
  const label = unit === "kg" ? "kg" : "lb";
  if (weightUnitLabelEl) {
    weightUnitLabelEl.textContent = label;
  }
  if (targetWeightUnitLabelEl) {
    targetWeightUnitLabelEl.textContent = label;
  }
  if (proteinUnitLabelEl) {
    proteinUnitLabelEl.textContent = label;
  }
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

const createRecipeItem = (item) => {
  const fragment = itemTemplate.content.cloneNode(true);
  const itemEl = fragment.querySelector(".recipe-item");

  if (item) {
    itemEl.querySelector("input[data-field='name']").value =
      item.ingredient?.name || "";
    itemEl.querySelector("input[data-field='kcal_per_100g']").value =
      item.ingredient?.kcal_per_100g ?? "";
    itemEl.querySelector("input[data-field='grams']").value = item.grams ?? "";
    const nutrients = item.ingredient?.nutrients_per_100g || {};
    itemEl.querySelectorAll(".nutrients input[data-field]").forEach((input) => {
      input.value = nutrients[input.dataset.field] ?? "";
    });
  }

  itemEl.querySelector(".remove").addEventListener("click", () => {
    itemEl.remove();
    refreshSummary();
  });
  itemEl.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => refreshSummary());
  });
  return fragment;
};

const addRecipeItem = (item) => {
  const fragment = createRecipeItem(item);
  recipeItemsContainer.appendChild(fragment);
};

const buildPayload = () => {
  const kibbleNutrients = readNutrients(
    document.querySelector(".nutrients[data-prefix='kibble']")
  );

  const weightUnit = weightUnitEl?.value || "kg";
  const weightValue = parseNumber(document.getElementById("dog-weight").value);
  const targetWeightValue = parseOptionalNumber(
    document.getElementById("dog-target-weight").value
  );
  const weightKg = toKg(weightValue, weightUnit);
  const targetWeightKg =
    targetWeightValue === null ? null : toKg(targetWeightValue, weightUnit);

  const kibble = {
    name: document.getElementById("kibble-name").value.trim() || "Kibble",
    kcal_per_100g: parseNumber(document.getElementById("kibble-kcal").value),
    nutrients_per_100g: kibbleNutrients,
  };

  const meals = listMeals();

  return {
    dog: {
      weight_kg: weightKg,
      target_weight_kg: targetWeightKg,
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
  let calciumTotal = 0;
  let phosphorusTotal = 0;
  let ironTotal = 0;
  let zincTotal = 0;
  let vitaminATotal = 0;
  let vitaminDTotal = 0;
  let vitaminETotal = 0;

  buildRecipeItems().forEach(({ ingredient, grams }) => {
    const multiplier = grams / 100;
    kcalTotal += ingredient.kcal_per_100g * multiplier;
    proteinTotal += (ingredient.nutrients_per_100g.protein_g || 0) * multiplier;
    fatTotal += (ingredient.nutrients_per_100g.fat_g || 0) * multiplier;
    carbsTotal += (ingredient.nutrients_per_100g.carbs_g || 0) * multiplier;
    calciumTotal += (ingredient.nutrients_per_100g.calcium_mg || 0) * multiplier;
    phosphorusTotal += (ingredient.nutrients_per_100g.phosphorus_mg || 0) * multiplier;
    ironTotal += (ingredient.nutrients_per_100g.iron_mg || 0) * multiplier;
    zincTotal += (ingredient.nutrients_per_100g.zinc_mg || 0) * multiplier;
    vitaminATotal += (ingredient.nutrients_per_100g.vitamin_a_iu || 0) * multiplier;
    vitaminDTotal += (ingredient.nutrients_per_100g.vitamin_d_iu || 0) * multiplier;
    vitaminETotal += (ingredient.nutrients_per_100g.vitamin_e_mg || 0) * multiplier;
  });

  return {
    kcalTotal,
    proteinTotal,
    fatTotal,
    carbsTotal,
    calciumTotal,
    phosphorusTotal,
    ironTotal,
    zincTotal,
    vitaminATotal,
    vitaminDTotal,
    vitaminETotal,
  };
};

const calculateKibbleTotals = () => {
  const grams = parseNumber(document.getElementById("kibble-grams").value);
  const multiplier = grams / 100;
  const kcalPer100g = parseNumber(document.getElementById("kibble-kcal").value);
  const nutrients = readNutrients(
    document.querySelector(".nutrients[data-prefix='kibble']")
  );

  return {
    kcalTotal: kcalPer100g * multiplier,
    proteinTotal: (nutrients.protein_g || 0) * multiplier,
    fatTotal: (nutrients.fat_g || 0) * multiplier,
    carbsTotal: (nutrients.carbs_g || 0) * multiplier,
    calciumTotal: (nutrients.calcium_mg || 0) * multiplier,
    phosphorusTotal: (nutrients.phosphorus_mg || 0) * multiplier,
    ironTotal: (nutrients.iron_mg || 0) * multiplier,
    zincTotal: (nutrients.zinc_mg || 0) * multiplier,
    vitaminATotal: (nutrients.vitamin_a_iu || 0) * multiplier,
    vitaminDTotal: (nutrients.vitamin_d_iu || 0) * multiplier,
    vitaminETotal: (nutrients.vitamin_e_mg || 0) * multiplier,
  };
};

const combineTotals = (totalsA, totalsB) => ({
  kcalTotal: totalsA.kcalTotal + totalsB.kcalTotal,
  proteinTotal: totalsA.proteinTotal + totalsB.proteinTotal,
  fatTotal: totalsA.fatTotal + totalsB.fatTotal,
  carbsTotal: totalsA.carbsTotal + totalsB.carbsTotal,
  calciumTotal: totalsA.calciumTotal + totalsB.calciumTotal,
  phosphorusTotal: totalsA.phosphorusTotal + totalsB.phosphorusTotal,
  ironTotal: totalsA.ironTotal + totalsB.ironTotal,
  zincTotal: totalsA.zincTotal + totalsB.zincTotal,
  vitaminATotal: totalsA.vitaminATotal + totalsB.vitaminATotal,
  vitaminDTotal: totalsA.vitaminDTotal + totalsB.vitaminDTotal,
  vitaminETotal: totalsA.vitaminETotal + totalsB.vitaminETotal,
});

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

const updateDiagnosticPills = (messages) => {
  diagnosticStatusEl.innerHTML = "";
  messages.forEach(({ text, warning }) => {
    const pill = document.createElement("span");
    pill.className = `status-pill${warning ? " warning" : ""}`;
    pill.textContent = text;
    diagnosticStatusEl.appendChild(pill);
  });
};

const updateMacroBars = (protein, fat, carbs) => {
  const proteinCalories = protein * 4;
  const fatCalories = fat * 9;
  const carbCalories = carbs * 4;
  const totalCalories = proteinCalories + fatCalories + carbCalories;

  const ratio = (value) => (totalCalories > 0 ? (value / totalCalories) * 100 : 0);
  const proteinPct = ratio(proteinCalories);
  const fatPct = ratio(fatCalories);
  const carbPct = ratio(carbCalories);

  macroProteinValueEl.textContent = `${formatNumber(protein)}g`;
  macroFatValueEl.textContent = `${formatNumber(fat)}g`;
  macroCarbValueEl.textContent = `${formatNumber(carbs)}g`;
  macroProteinBarEl.style.width = `${proteinPct}%`;
  macroFatBarEl.style.width = `${fatPct}%`;
  macroCarbBarEl.style.width = `${carbPct}%`;

  const ratioLabel =
    totalCalories === 0
      ? "Awaiting macro inputs"
      : `P${formatNumber(proteinPct)} / F${formatNumber(fatPct)} / C${formatNumber(
          carbPct
        )}%`;
  macroRatioLabelEl.textContent = ratioLabel;
  macroCalorieSplitEl.textContent =
    totalCalories === 0
      ? "0% / 0% / 0%"
      : `${formatNumber(proteinPct)}% / ${formatNumber(fatPct)}% / ${formatNumber(
          carbPct
        )}%`;
};

const updateHydration = (weightKg) => {
  const waterIntake = parseNumber(document.getElementById("water-ml").value);
  const target = weightKg > 0 ? weightKg * 60 : 0;
  const progress = target > 0 ? Math.min((waterIntake / target) * 100, 140) : 0;

  waterProgressEl.style.width = `${progress}%`;
  waterCurrentEl.textContent = `${formatNumber(waterIntake)} ml logged`;
  waterTargetEl.textContent = `Target ${formatNumber(target)} ml`;
  hydrationStatusEl.textContent =
    target === 0
      ? "Set weight to calculate target"
      : waterIntake >= target
        ? "Hydration on track"
        : "Increase water intake";
};

const updateMealDistribution = (meals, totals) => {
  mealDistributionEl.innerHTML = "";
  if (!meals.length) {
    mealDistributionEl.innerHTML = "<p class='muted'>Add meals to see allocation.</p>";
    return;
  }

  const perMealKcal = totals.kcalTotal / meals.length;
  const perMealProtein = totals.proteinTotal / meals.length;
  const perMealFat = totals.fatTotal / meals.length;
  const perMealCarbs = totals.carbsTotal / meals.length;

  meals.forEach((meal) => {
    const row = document.createElement("div");
    row.className = "timeline-item";
    row.innerHTML = `
      <div>
        <h4>${meal}</h4>
        <p>${formatNumber(perMealKcal)} kcal</p>
      </div>
      <div class="timeline-macros">
        <span>P ${formatNumber(perMealProtein)}g</span>
        <span>F ${formatNumber(perMealFat)}g</span>
        <span>C ${formatNumber(perMealCarbs)}g</span>
      </div>
    `;
    mealDistributionEl.appendChild(row);
  });
};

const updateIngredientHighlights = (recipeTotals, kibbleTotals) => {
  ingredientHighlightsEl.innerHTML = "";
  const items = buildRecipeItems().map(({ ingredient, grams }) => ({
    name: ingredient.name,
    kcal: (ingredient.kcal_per_100g || 0) * (grams / 100),
  }));
  items.push({
    name: document.getElementById("kibble-name").value.trim() || "Kibble",
    kcal: kibbleTotals.kcalTotal,
  });

  const topItems = items
    .filter((item) => item.kcal > 0)
    .sort((a, b) => b.kcal - a.kcal)
    .slice(0, 3);

  if (!topItems.length) {
    ingredientHighlightsEl.innerHTML = "<li class='muted'>Add ingredients to see highlights.</li>";
    return;
  }

  topItems.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${item.name}</strong><span>${formatNumber(
      item.kcal
    )} kcal</span>`;
    ingredientHighlightsEl.appendChild(li);
  });
};

const refreshSummary = () => {
  const weightUnit = weightUnitEl?.value || "kg";
  const weightValue = parseNumber(document.getElementById("dog-weight").value);
  const weightKg = toKg(weightValue, weightUnit);
  const merFactorKey = document.getElementById("mer-factor").value;
  const merFactor = merFactorMap[merFactorKey] || 1.6;
  const rer = calculateRer(weightKg);
  const merTarget = rer * merFactor;
  const kibbleTotals = calculateKibbleTotals();
  const kibbleKcal = kibbleTotals.kcalTotal;
  const treatsKcal = parseNumber(document.getElementById("treats-kcal").value);
  const recipeTotals = calculateRecipeTotals();
  const combinedTotals = combineTotals(recipeTotals, kibbleTotals);
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

  updateMacroBars(combinedTotals.proteinTotal, combinedTotals.fatTotal, combinedTotals.carbsTotal);
  updateHydration(weightKg);
  updateMealDistribution(meals.length ? meals : ["breakfast", "dinner"], {
    ...combinedTotals,
    kcalTotal: totalKcal,
  });
  updateIngredientHighlights(recipeTotals, kibbleTotals);

  const proteinPerKg = weightKg > 0 ? combinedTotals.proteinTotal / weightKg : 0;
  const proteinPerUnit = weightValue > 0 ? combinedTotals.proteinTotal / weightValue : 0;
  const unitLabel = weightUnit === "kg" ? "kg" : "lb";
  proteinPerKgEl.textContent = `${formatNumber(proteinPerUnit)} g/${unitLabel}`;

  const capRatio =
    combinedTotals.phosphorusTotal > 0
      ? combinedTotals.calciumTotal / combinedTotals.phosphorusTotal
      : 0;
  capRatioEl.textContent =
    combinedTotals.calciumTotal === 0 && combinedTotals.phosphorusTotal === 0
      ? "--"
      : formatNumber(capRatio);

  const microInputs = [
    combinedTotals.calciumTotal,
    combinedTotals.phosphorusTotal,
    combinedTotals.ironTotal,
    combinedTotals.zincTotal,
    combinedTotals.vitaminATotal,
    combinedTotals.vitaminDTotal,
    combinedTotals.vitaminETotal,
  ];
  const availableMicros = microInputs.filter((value) => value > 0).length;
  micronutrientSignalEl.textContent =
    availableMicros === 0
      ? "Awaiting data"
      : `${availableMicros} micronutrients tracked`;

  const diagnosticMessages = [];
  if (proteinPerKg > 0 && proteinPerKg < 2.5) {
    diagnosticMessages.push({ text: "Protein density low", warning: true });
  } else if (proteinPerKg > 0) {
    diagnosticMessages.push({ text: "Protein density solid", warning: false });
  }
  if (capRatio > 0 && (capRatio < 1.1 || capRatio > 1.6)) {
    diagnosticMessages.push({ text: "Ca:P ratio outside ideal range", warning: true });
  } else if (capRatio > 0) {
    diagnosticMessages.push({ text: "Ca:P ratio aligned", warning: false });
  }
  if (availableMicros === 0) {
    diagnosticMessages.push({ text: "Add micronutrients for deeper analysis", warning: true });
  }
  updateDiagnosticPills(diagnosticMessages);
};

const collectFormState = () => {
  const state = {
    fields: {
      "weight-unit": weightUnitEl?.value || "kg",
      "dog-weight": document.getElementById("dog-weight").value,
      "dog-target-weight": document.getElementById("dog-target-weight").value,
      "dog-age": document.getElementById("dog-age").value,
      "dog-sex": document.getElementById("dog-sex").value,
      "dog-neutered": document.getElementById("dog-neutered").value,
      "dog-activity": document.getElementById("dog-activity").value,
      "mer-factor": document.getElementById("mer-factor").value,
      "treats-kcal": document.getElementById("treats-kcal").value,
      "water-ml": document.getElementById("water-ml").value,
      meals: document.getElementById("meals").value,
      "plan-name": planNameInput?.value || "",
      "recipe-name": recipeNameInput?.value || "",
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

const applyRecipeItems = (items) => {
  recipeItemsContainer.innerHTML = "";
  (items || []).forEach((item) => {
    const fragment = createRecipeItem(item);
    recipeItemsContainer.appendChild(fragment);
  });
  if (!items || items.length === 0) {
    addRecipeItem();
  }
};

const applyFormState = (state) => {
  if (!state) {
    return;
  }

  if (state.fields?.["weight-unit"] && weightUnitEl) {
    weightUnitEl.value = state.fields["weight-unit"];
    currentWeightUnit = weightUnitEl.value;
    updateWeightUnitLabels(currentWeightUnit);
  }

  Object.entries(state.fields || {}).forEach(([id, value]) => {
    if (id === "weight-unit") {
      return;
    }
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

  applyRecipeItems(state.recipeItems || []);

  refreshSummary();
};

const refreshPlans = async (selectedId) => {
  if (!planSelect) {
    return;
  }
  try {
    const response = await fetch("/plans");
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const plans = await response.json();
    const current = selectedId || planSelect.value;
    planSelect.innerHTML = "";
    if (!plans.length) {
      planSelect.innerHTML = "<option value=''>No saved plans</option>";
      return;
    }
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a saved plan";
    planSelect.appendChild(placeholder);
    plans.forEach((plan) => {
      const option = document.createElement("option");
      option.value = plan.id;
      option.textContent = plan.name;
      planSelect.appendChild(option);
    });
    if (current) {
      planSelect.value = current;
    }
  } catch (error) {
    planSelect.innerHTML = "<option value=''>Unable to load plans</option>";
  }
};

const savePlan = async () => {
  const name = planNameInput?.value.trim() || "";
  if (!name) {
    handleError("Enter a plan name before saving.");
    return;
  }
  const state = collectFormState();
  resultEl.textContent = "Saving plan...";
  try {
    const response = await fetch("/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, payload: state }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      handleError(`Request failed (${response.status}). ${errorText}`);
      return;
    }
    const data = await response.json();
    await refreshPlans(String(data.id));
    if (planSelect) {
      planSelect.value = String(data.id);
    }
    handleSuccess({ status: `Saved plan "${data.name}".` });
  } catch (error) {
    handleError(`Request failed. ${error}`);
  }
};

const loadPlan = async () => {
  if (!planSelect || !planSelect.value) {
    handleError("Select a saved plan to load.");
    return;
  }
  resultEl.textContent = "Loading plan...";
  try {
    const response = await fetch(`/plans/${planSelect.value}`);
    if (!response.ok) {
      const errorText = await response.text();
      handleError(`Request failed (${response.status}). ${errorText}`);
      return;
    }
    const data = await response.json();
    applyFormState(data.payload);
    if (planNameInput) {
      planNameInput.value = data.name;
    }
    handleSuccess({ status: `Loaded plan "${data.name}".` });
  } catch (error) {
    handleError(`Request failed. ${error}`);
  }
};

const deletePlan = async () => {
  if (!planSelect || !planSelect.value) {
    handleError("Select a saved plan to delete.");
    return;
  }
  resultEl.textContent = "Deleting plan...";
  try {
    const response = await fetch(`/plans/${planSelect.value}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const errorText = await response.text();
      handleError(`Request failed (${response.status}). ${errorText}`);
      return;
    }
    await refreshPlans("");
    handleSuccess({ status: "Deleted saved plan." });
  } catch (error) {
    handleError(`Request failed. ${error}`);
  }
};

const refreshRecipes = async (selectedId) => {
  if (!recipeSelect) {
    return;
  }
  try {
    const response = await fetch("/recipes");
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const recipes = await response.json();
    const current = selectedId || recipeSelect.value;
    recipeSelect.innerHTML = "";
    if (!recipes.length) {
      recipeSelect.innerHTML = "<option value=''>No saved recipes</option>";
      return;
    }
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a saved recipe";
    recipeSelect.appendChild(placeholder);
    recipes.forEach((recipe) => {
      const option = document.createElement("option");
      option.value = recipe.id;
      option.textContent = recipe.name;
      recipeSelect.appendChild(option);
    });
    if (current) {
      recipeSelect.value = current;
    }
  } catch (error) {
    recipeSelect.innerHTML = "<option value=''>Unable to load recipes</option>";
  }
};

const saveRecipe = async () => {
  const name = recipeNameInput?.value.trim() || "";
  if (!name) {
    handleError("Enter a recipe name before saving.");
    return;
  }
  const payload = {
    name,
    items: buildRecipeItems(),
  };
  const isUpdate = recipeSelect && recipeSelect.value;
  const url = isUpdate ? `/recipes/${recipeSelect.value}` : "/recipes";
  const method = isUpdate ? "PUT" : "POST";
  resultEl.textContent = "Saving recipe...";
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      handleError(`Request failed (${response.status}). ${errorText}`);
      return;
    }
    const data = await response.json();
    await refreshRecipes(String(data.id));
    if (recipeSelect) {
      recipeSelect.value = String(data.id);
    }
    handleSuccess({
      status: `${isUpdate ? "Updated" : "Saved"} recipe \"${data.name}\".`,
    });
  } catch (error) {
    handleError(`Request failed. ${error}`);
  }
};

const loadRecipe = async () => {
  if (!recipeSelect || !recipeSelect.value) {
    handleError("Select a saved recipe to load.");
    return;
  }
  resultEl.textContent = "Loading recipe...";
  try {
    const response = await fetch(`/recipes/${recipeSelect.value}`);
    if (!response.ok) {
      const errorText = await response.text();
      handleError(`Request failed (${response.status}). ${errorText}`);
      return;
    }
    const data = await response.json();
    if (recipeNameInput) {
      recipeNameInput.value = data.name;
    }
    applyRecipeItems(data.items || []);
    refreshSummary();
    handleSuccess({ status: `Loaded recipe \"${data.name}\".` });
  } catch (error) {
    handleError(`Request failed. ${error}`);
  }
};

const deleteRecipe = async () => {
  if (!recipeSelect || !recipeSelect.value) {
    handleError("Select a saved recipe to delete.");
    return;
  }
  resultEl.textContent = "Deleting recipe...";
  try {
    const response = await fetch(`/recipes/${recipeSelect.value}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const errorText = await response.text();
      handleError(`Request failed (${response.status}). ${errorText}`);
      return;
    }
    await refreshRecipes("");
    handleSuccess({ status: "Deleted saved recipe." });
  } catch (error) {
    handleError(`Request failed. ${error}`);
  }
};

const fetchUsdaIngredient = async () => {
  const apiKey = usdaApiKeyInput?.value.trim() || "";
  const fdcId = Number.parseInt(usdaFdcInput?.value || "", 10);
  const nameOverride = usdaNameOverrideInput?.value.trim() || null;

  if (!apiKey) {
    handleError("Enter a USDA API key before fetching.");
    return;
  }
  if (!fdcId || Number.isNaN(fdcId)) {
    handleError("Enter a valid USDA FDC ID.");
    return;
  }

  resultEl.textContent = "Fetching USDA ingredient...";
  try {
    const response = await fetch("/ingredient/from-usda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        fdc_id: fdcId,
        name_override: nameOverride,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      handleError(`Request failed (${response.status}). ${errorText}`);
      return;
    }
    const data = await response.json();
    addRecipeItem({
      ingredient: {
        name: data.name,
        kcal_per_100g: data.kcal_per_100g,
        nutrients_per_100g: data.nutrients_per_100g || {},
      },
      grams: 100,
    });
    refreshSummary();
    handleSuccess({ status: `Added USDA ingredient "${data.name}".` });
  } catch (error) {
    handleError(`Request failed. ${error}`);
  }
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
  if (weightUnitEl) {
    currentWeightUnit = weightUnitEl.value;
    updateWeightUnitLabels(currentWeightUnit);
  }
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
deletePlanButton.addEventListener("click", () => deletePlan());
resetPlanButton.addEventListener("click", () => resetPlan());
saveRecipeButton.addEventListener("click", () => saveRecipe());
loadRecipeButton.addEventListener("click", () => loadRecipe());
deleteRecipeButton.addEventListener("click", () => deleteRecipe());
usdaFetchButton.addEventListener("click", () => fetchUsdaIngredient());

if (weightUnitEl) {
  updateWeightUnitLabels(weightUnitEl.value);
  weightUnitEl.addEventListener("change", () => {
    const nextUnit = weightUnitEl.value;
    convertWeightInput(document.getElementById("dog-weight"), currentWeightUnit, nextUnit);
    convertWeightInput(
      document.getElementById("dog-target-weight"),
      currentWeightUnit,
      nextUnit
    );
    currentWeightUnit = nextUnit;
    updateWeightUnitLabels(currentWeightUnit);
  });
}

if (usdaApiKeyInput) {
  const storedKey = localStorage.getItem(USDA_API_KEY_STORAGE);
  if (storedKey) {
    usdaApiKeyInput.value = storedKey;
  }
  usdaApiKeyInput.addEventListener("input", () => {
    localStorage.setItem(USDA_API_KEY_STORAGE, usdaApiKeyInput.value);
  });
}

document.querySelectorAll("input, select").forEach((input) => {
  input.addEventListener("input", () => refreshSummary());
  input.addEventListener("change", () => refreshSummary());
});

addRecipeItem();
refreshSummary();
refreshPlans();
refreshRecipes();
