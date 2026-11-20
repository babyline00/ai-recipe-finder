import { test, expect, describe } from "bun:test";
import { RECIPES, getRecipeById, searchRecipes, RECIPE_COUNT } from "../recipe-data";
import type { Recipe, RecipeTag } from "../types";

const VALID_TAGS: RecipeTag[] = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "dairy-free",
  "keto",
  "whole30",
];
const VALID_DIFFICULTIES = ["easy", "medium", "hard"];

describe("recipe-data — dataset shape", () => {
  test("dataset has between 30 and 50 recipes", () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(30);
    expect(RECIPES.length).toBeLessThanOrEqual(50);
    expect(RECIPE_COUNT).toBe(RECIPES.length);
  });

  test("every recipe has a non-empty title and id", () => {
    for (const r of RECIPES) {
      expect(typeof r.id).toBe("string");
      expect(r.id.length).toBeGreaterThan(0);
      expect(typeof r.title).toBe("string");
      expect(r.title.length).toBeGreaterThan(0);
    }
  });

  test("every recipe has a non-empty cuisine", () => {
    for (const r of RECIPES) {
      expect(typeof r.cuisine).toBe("string");
      expect(r.cuisine.length).toBeGreaterThan(0);
    }
  });

  test("every recipe has an ingredients array with at least 2 entries", () => {
    for (const r of RECIPES) {
      expect(Array.isArray(r.ingredients)).toBe(true);
      expect(r.ingredients.length).toBeGreaterThanOrEqual(2);
      for (const ing of r.ingredients) {
        expect(typeof ing.name).toBe("string");
        expect(ing.name.length).toBeGreaterThan(0);
        expect(typeof ing.quantity).toBe("string");
        expect(ing.quantity.length).toBeGreaterThan(0);
      }
    }
  });

  test("every recipe has an instructions array with at least 2 steps", () => {
    for (const r of RECIPES) {
      expect(Array.isArray(r.instructions)).toBe(true);
      expect(r.instructions.length).toBeGreaterThanOrEqual(2);
      for (const step of r.instructions) {
        expect(typeof step).toBe("string");
        expect(step.length).toBeGreaterThan(0);
      }
    }
  });

  test("every recipe has positive prepTime, cookTime and servings", () => {
    for (const r of RECIPES) {
      expect(typeof r.prepTime).toBe("number");
      expect(r.prepTime).toBeGreaterThanOrEqual(0);
      expect(typeof r.cookTime).toBe("number");
      expect(r.cookTime).toBeGreaterThanOrEqual(0);
      expect(typeof r.servings).toBe("number");
      expect(r.servings).toBeGreaterThan(0);
    }
  });

  test("every recipe has a complete macros object", () => {
    for (const r of RECIPES) {
      expect(typeof r.macros).toBe("object");
      expect(r.macros).not.toBeNull();
      for (const key of ["calories", "protein", "carbs", "fat"] as const) {
        expect(typeof r.macros[key]).toBe("number");
        expect(r.macros[key]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("every recipe has a tags array of valid diet tags", () => {
    for (const r of RECIPES) {
      expect(Array.isArray(r.tags)).toBe(true);
      expect(r.tags.length).toBeGreaterThan(0);
      for (const t of r.tags) {
        expect(VALID_TAGS).toContain(t);
      }
    }
  });

  test("every recipe has a valid difficulty", () => {
    for (const r of RECIPES) {
      expect(VALID_DIFFICULTIES).toContain(r.difficulty);
    }
  });

  test("recipe ids are unique", () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("recipe-data — helpers", () => {
  test("getRecipeById returns matching recipe", () => {
    const first = RECIPES[0];
    expect(getRecipeById(first.id)).toBe(first);
  });

  test("getRecipeById returns undefined for unknown id", () => {
    expect(getRecipeById("does-not-exist")).toBeUndefined();
  });

  test("searchRecipes by title returns matches", () => {
    const results = searchRecipes("pizza");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.title.toLowerCase()).toContain("pizza");
    }
  });

  test("searchRecipes by ingredient returns matches", () => {
    const results = searchRecipes("tofu");
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((r) => r.ingredients.some((i) => i.name.includes("tofu"))),
    ).toBe(true);
  });

  test("searchRecipes with empty query returns everything", () => {
    expect(searchRecipes("").length).toBe(RECIPES.length);
  });
});
