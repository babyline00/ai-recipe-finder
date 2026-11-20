/**
 * Prompt builder for vision-based ingredient extraction.
 *
 * The LLM is asked to look at a photo of the user's fridge or pantry and
 * return STRICT JSON of the form:
 *
 *   { "ingredients": [{ "name": string, "quantity": string, "confidence": number }] }
 *
 * `confidence` is a 0..1 float; `quantity` is a short freeform phrase
 * ("2 cups", "~200 g", "1 head"); `name` is a singular, lowercase
 * ingredient name ("tomato" not "Tomatoes").
 *
 * Keeping the prompt in a pure function lets us unit-test its shape
 * (must ask for the JSON schema, must forbid prose) without invoking
 * a real model.
 */

export interface ExtractionPromptOptions {
  /** Optional hint to bias detection, e.g. "vegetarian household". */
  hint?: string;
  /** Max number of ingredients to return. Default 25. */
  maxIngredients?: number;
}

export function buildIngredientExtractionPrompt(
  opts: ExtractionPromptOptions = {},
): string {
  const max = opts.maxIngredients ?? 25;
  const hintLine = opts.hint
    ? `\nUser-provided context hint (use cautiously): "${opts.hint}".`
    : "";
  return [
    "You are a vision model that inspects photos of home kitchens (fridges, pantries, countertops).",
    "Identify every visible food ingredient and return STRICT JSON only.",
    hintLine,
    "",
    "Output schema (no prose, no markdown fences):",
    '{ "ingredients": [ { "name": string, "quantity": string, "confidence": number } ] }',
    "",
    "Rules:",
    `1. Return at most ${max} ingredients, ordered by descending confidence.`,
    '2. "name" must be a singular, lowercase common ingredient name (e.g. "tomato", "olive oil", "parmesan").',
    '3. "quantity" must be a short freeform phrase estimating the visible amount (e.g. "2 cups", "~200 g", "1 head"). Use "?" if unsure.',
    '4. "confidence" is a 0..1 float reflecting how sure you are the item is actually present and labeled correctly.',
    "5. Skip non-food items, packaging, and utensils.",
    "6. If the photo is dark, blurry, or empty, return { \"ingredients\": [] }.",
    "7. Do NOT include any text outside the JSON object.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Prompt for swap suggestions. The model is asked to return STRICT JSON
 * of the form:
 *
 *   { "swaps": [{ "ingredient": string, "substitute": string }] }
 *
 * Each substitute is a short user-facing phrase, e.g.
 * "1 cup milk + 1 tbsp lemon juice".
 */
export function buildSwapSuggestionPrompt(missing: string[]): string {
  return [
    "You are a culinary substitution expert for home cooks.",
    "For each missing ingredient below, suggest ONE practical substitute made from common pantry staples.",
    "Return STRICT JSON only — no prose, no markdown fences.",
    "",
    "Output schema:",
    '{ "swaps": [ { "ingredient": string, "substitute": string } ] }',
    "",
    "Rules:",
    '1. "ingredient" echoes the input ingredient name (lowercase).',
    '2. "substitute" is a short user-facing phrase like "1 cup milk + 1 tbsp lemon juice" or "1 tbsp ground flaxseed + 3 tbsp water (let stand 5 min)".',
    "3. Prefer swaps that keep the dish's flavor profile and dietary tags intact.",
    "4. If no sensible substitute exists, omit that ingredient from the swaps array.",
    "5. Do NOT include any text outside the JSON object.",
    "",
    `Missing ingredients (${missing.length}): ${missing.join(", ")}`,
  ].join("\n");
}
