const resultEl = document.getElementById("result");
const addItemButton = document.getElementById("add-item");
const computeButton = document.getElementById("compute");
const recipeItemsContainer = document.getElementById("recipe-items");
const itemTemplate = document.getElementById("item-template");

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

const addRecipeItem = () => {
  const fragment = itemTemplate.content.cloneNode(true);
  const itemEl = fragment.querySelector(".recipe-item");
  itemEl.querySelector(".remove").addEventListener("click", () => {
    itemEl.remove();
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

  const meals = document
    .getElementById("meals")
    .value.split(",")
    .map((meal) => meal.trim())
    .filter((meal) => meal.length > 0);

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

addRecipeItem();
