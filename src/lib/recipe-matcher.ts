/**
 * Recipe matching: given a pantry of ingredients the user has on hand, score
 * every recipe in the dataset by the fraction of its ingredients the pantry
 * can satisfy, and return the top N.
 *
 * Matching is fuzzy: pantry ingredient "tomatoes" matches recipe ingredient
 * "tomato", and "extra-virgin olive oil" matches "olive oil" via shared
 * content tokens (see `ingredientsMatch` in tokenizer.ts).
 *
 * `matchRecipes` is a pure function — no I/O, no side effects — so it's
 * trivially testable. The API layer composes it with persistence.
 */

import type {
  MatchedRecipe,
  PantryItem,
  Recipe,
} from "@/lib/types";
import { ingredientsMatch, normalizeIngredient } from "@/lib/tokenizer";

export interface MatchOptions {
  /** Max number of results to return. Default 5. */
  topN?: number;
  /** Min match percent (0..1) required to be included. Default 0. */
  minMatchPercent?: number;
}

/**
 * Compute the match percent for a single recipe against a pantry.
 * Returns the fraction (0..1) of the recipe's ingredients that the pantry
 * can satisfy, plus the lists of matched and missing ingredient names.
 */
export function scoreRecipe(
  recipe: Recipe,
  pantry: PantryItem[],
): MatchedRecipe {
  const normalizedPantry = pantry
    .map((p) => normalizeIngredient(p.name))
    .filter((n) => n.length > 0);

  if (recipe.ingredients.length === 0) {
    return {
      recipe,
      matchPercent: 0,
      missingIngredients: [],
      matchedIngredients: [],
    };
  }

  const matched: string[] = [];
  const missing: string[] = [];
  for (const ing of recipe.ingredients) {
    const has = normalizedPantry.some((p) => ingredientsMatch(p, ing.name));
    if (has) {
      matched.push(ing.name);
    } else {
      missing.push(ing.name);
    }
  }
  const matchPercent = matched.length / recipe.ingredients.length;
  return {
    recipe,
    matchPercent,
    missingIngredients: missing,
    matchedIngredients: matched,
  };
}

/**
 * Score every recipe in the dataset against the pantry and return the top N
 * sorted by descending match percent. Ties break alphabetically by title
 * for deterministic output (important for tests).
 */
export function matchRecipes(
  pantry: PantryItem[],
  recipes: Recipe[],
  opts: MatchOptions = {},
): MatchedRecipe[] {
  const topN = opts.topN ?? 5;
  const minMatch = opts.minMatchPercent ?? 0;
  if (!pantry.length) return [];
  const scored = recipes.map((r) => scoreRecipe(r, pantry));
  const filtered = scored.filter((s) => s.matchPercent >= minMatch);
  filtered.sort((a, b) => {
    if (b.matchPercent !== a.matchPercent) {
      return b.matchPercent - a.matchPercent;
    }
    // Tie-break: alphabetically by title, then by id for stability.
    if (a.recipe.title !== b.recipe.title) {
      return a.recipe.title.localeCompare(b.recipe.title);
    }
    return a.recipe.id.localeCompare(b.recipe.id);
  });
  return filtered.slice(0, topN);
}

/**
 * Pure helper: returns the count of pantry items that overlap a recipe's
 * ingredient list. Used by the UI to render "you have X of Y ingredients".
 */
export function countMatchedIngredients(
  recipe: Recipe,
  pantry: PantryItem[],
): { matched: number; total: number } {
  const normalizedPantry = pantry
    .map((p) => normalizeIngredient(p.name))
    .filter((n) => n.length > 0);
  let matched = 0;
  for (const ing of recipe.ingredients) {
    if (normalizedPantry.some((p) => ingredientsMatch(p, ing.name))) {
      matched += 1;
    }
  }
  return { matched, total: recipe.ingredients.length };
}
