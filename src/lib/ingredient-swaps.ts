/**
 * Hardcoded ingredient swap table for the recipe finder.
 *
 * For each missing ingredient the user might lack, `getSwap` returns a
 * short user-facing substitute phrase (e.g. "1 cup buttermilk -> 1 cup
 * milk + 1 tbsp lemon juice"). When the LLM is disabled or offline, this
 * table alone produces useful swaps; with the LLM enabled, the table acts
 * as a fast path and the LLM handles unknown ingredients.
 *
 * Keys are lowercase canonical ingredient names. Matching is case-
 * insensitive and tolerant of plural forms (see `matchSwapKey`).
 */

interface SwapEntry {
  /** Canonical key, lowercase singular, e.g. "buttermilk". */
  key: string;
  /** User-facing substitute phrase, e.g. "1 cup milk + 1 tbsp lemon juice". */
  substitute: string;
  /** Tags this swap preserves (e.g. vegetarian, dairy-free). */
  preserves?: string[];
}

const SWAP_TABLE: SwapEntry[] = [
  // Dairy swaps
  {
    key: "buttermilk",
    substitute: "1 cup milk + 1 tbsp lemon juice (let stand 5 min)",
    preserves: ["vegetarian"],
  },
  {
    key: "heavy cream",
    substitute: "1/2 cup whole milk + 1/3 cup melted butter",
    preserves: ["vegetarian"],
  },
  {
    key: "sour cream",
    substitute: "1 cup plain greek yogurt",
    preserves: ["vegetarian"],
  },
  {
    key: "cream cheese",
    substitute: "1 cup greek yogurt + 2 tbsp butter (blended)",
    preserves: ["vegetarian"],
  },
  {
    key: "yogurt",
    substitute: "1 cup sour cream or 1 cup buttermilk",
    preserves: ["vegetarian"],
  },
  // Egg swaps (vegetarian / vegan)
  {
    key: "egg",
    substitute: "1 tbsp ground flaxseed + 3 tbsp water (let stand 5 min)",
    preserves: ["vegetarian", "vegan"],
  },
  {
    key: "eggs",
    substitute: "1 tbsp ground flaxseed + 3 tbsp water per egg (let stand 5 min)",
    preserves: ["vegetarian", "vegan"],
  },
  // Flour / starch swaps
  {
    key: "all-purpose flour",
    substitute: "1 cup oat flour (blend rolled oats) for gluten-free bakes",
    preserves: ["vegetarian", "vegan", "gluten-free"],
  },
  {
    key: "flour",
    substitute: "1 cup oat flour or 3/4 cup rice flour",
    preserves: ["vegetarian", "vegan", "gluten-free"],
  },
  {
    key: "cornstarch",
    substitute: "1 tbsp arrowroot powder or 2 tbsp all-purpose flour",
    preserves: ["vegetarian", "vegan"],
  },
  // Sugar / sweetener swaps
  {
    key: "brown sugar",
    substitute: "1 cup white sugar + 1 tbsp molasses",
    preserves: ["vegetarian", "vegan"],
  },
  {
    key: "sugar",
    substitute: "3/4 cup honey or 3/4 cup maple syrup (reduce other liquids by 1/4 cup)",
    preserves: ["vegetarian"],
  },
  {
    key: "honey",
    substitute: "3/4 cup maple syrup or agave nectar",
    preserves: ["vegetarian", "vegan"],
  },
  // Oil / fat swaps
  {
    key: "butter",
    substitute: "3/4 cup olive oil or 3/4 cup neutral vegetable oil",
    preserves: ["vegetarian", "vegan", "dairy-free"],
  },
  {
    key: "olive oil",
    substitute: "equal amount avocado oil, grapeseed oil, or melted butter",
    preserves: ["vegetarian", "vegan"],
  },
  {
    key: "vegetable oil",
    substitute: "equal amount canola oil, sunflower oil, or melted coconut oil",
    preserves: ["vegetarian", "vegan"],
  },
  // Acid swaps
  {
    key: "lemon juice",
    substitute: "1 tbsp white wine vinegar or 1/2 tsp citric acid in 1 tbsp water",
    preserves: ["vegetarian", "vegan"],
  },
  {
    key: "vinegar",
    substitute: "1 tbsp lemon juice or 1 tbsp lime juice",
    preserves: ["vegetarian", "vegan"],
  },
  // Stock / broth swaps
  {
    key: "chicken stock",
    substitute: "1 cup vegetable broth + 1 tsp soy sauce (for umami)",
    preserves: ["vegetarian", "vegan"],
  },
  {
    key: "chicken broth",
    substitute: "1 cup vegetable broth + 1 tsp soy sauce (for umami)",
    preserves: ["vegetarian", "vegan"],
  },
  {
    key: "vegetable broth",
    substitute: "1 cup water + 1 tsp miso paste or 1 vegetable bouillon cube",
    preserves: ["vegetarian", "vegan"],
  },
  // Soy sauce / umami swaps
  {
    key: "soy sauce",
    substitute: "1 tbsp tamari (gluten-free) or 1 tbsp coconut aminos (soy-free)",
    preserves: ["vegetarian", "vegan", "gluten-free"],
  },
  {
    key: "tamari",
    substitute: "1 tbsp soy sauce (not gluten-free) or 1 tbsp coconut aminos",
    preserves: ["vegetarian", "vegan"],
  },
  // Herb swaps
  {
    key: "basil",
    substitute: "1 tsp dried basil (use 1/3 the volume of fresh) or fresh mint",
    preserves: ["vegetarian", "vegan"],
  },
  {
    key: "cilantro",
    substitute: "equal amount fresh parsley (milder) or basil (sweet)",
    preserves: ["vegetarian", "vegan"],
  },
  {
    key: "parsley",
    substitute: "equal amount fresh cilantro or 1 tsp dried parsley",
    preserves: ["vegetarian", "vegan"],
  },
  // Allium swaps
  {
    key: "garlic",
    substitute: "1/4 tsp garlic powder per clove, or 1 tsp minced shallot",
    preserves: ["vegetarian", "vegan"],
  },
  {
    key: "onion",
    substitute: "1 shallot or 1 leek (white part only) or 1 tsp onion powder",
    preserves: ["vegetarian", "vegan"],
  },
  // Spice swaps
  {
    key: "paprika",
    substitute: "1 tsp smoked paprika or 1/2 tsp chili powder (milder)",
    preserves: ["vegetarian", "vegan"],
  },
  {
    key: "cumin",
    substitute: "1/2 tsp ground coriander + 1/4 tsp chili powder",
    preserves: ["vegetarian", "vegan"],
  },
  // Tomato swaps
  {
    key: "tomato paste",
    substitute: "2 tbsp tomato sauce simmered until reduced by half",
    preserves: ["vegetarian", "vegan"],
  },
  {
    key: "tomato sauce",
    substitute: "1 canned tomato + 1 tbsp water, blended smooth",
    preserves: ["vegetarian", "vegan"],
  },
  // Milk swaps
  {
    key: "milk",
    substitute: "1 cup soy milk, oat milk, or almond milk (dairy-free)",
    preserves: ["vegetarian", "vegan", "dairy-free"],
  },
  {
    key: "whole milk",
    substitute: "1 cup soy milk or 1 cup oat milk + 1 tsp oil for richness",
    preserves: ["vegetarian", "vegan", "dairy-free"],
  },
];

/** Lookup map for O(1) exact-match hits. */
const SWAP_BY_KEY = new Map<string, SwapEntry>(
  SWAP_TABLE.map((s) => [s.key.toLowerCase(), s]),
);

/**
 * Singularize the simplest English plurals (tomatoes -> tomato).
 * Mirrors the logic in tokenizer.ts so swap lookups align with how
 * recipe-data normalizes ingredient names.
 */
function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/** Normalize an ingredient name for swap-table lookup. */
function matchSwapKey(name: string): string {
  const lower = name.toLowerCase().trim();
  // Try exact, then singularized, then as a substring hint.
  if (SWAP_BY_KEY.has(lower)) return lower;
  const sing = singularize(lower);
  if (SWAP_BY_KEY.has(sing)) return sing;
  // Try matching on the last word (e.g. "whole milk" -> "milk").
  const lastWord = lower.split(/\s+/).pop() ?? "";
  if (lastWord && SWAP_BY_KEY.has(lastWord)) return lastWord;
  // Try matching where the key is a substring of the input (e.g.
  // "fresh basil" contains "basil").
  for (const key of SWAP_BY_KEY.keys()) {
    if (lower.includes(key)) return key;
  }
  return "";
}

export interface SwapResult {
  ingredient: string;
  substitute: string;
  found: boolean;
  preserves?: string[];
}

/** Return the swap entry for an ingredient name, or null if unknown. */
export function getSwap(ingredient: string): SwapResult | null {
  if (!ingredient) return null;
  const key = matchSwapKey(ingredient);
  if (!key) return null;
  const entry = SWAP_BY_KEY.get(key);
  if (!entry) return null;
  return {
    ingredient,
    substitute: entry.substitute,
    found: true,
    preserves: entry.preserves,
  };
}

/**
 * Bulk swap lookup. Returns results in the same order as the input.
 * Missing ingredients get a `null` entry so the caller can decide whether
 * to escalate to the LLM.
 */
export function getSwaps(ingredients: string[]): (SwapResult | null)[] {
  return ingredients.map((ing) => getSwap(ing));
}

/** Export the raw table for tests / debugging. */
export const __SWAP_TABLE = SWAP_TABLE;
