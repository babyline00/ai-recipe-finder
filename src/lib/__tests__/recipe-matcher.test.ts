import { test, expect, describe } from "bun:test";
import {
  matchRecipes,
  scoreRecipe,
  countMatchedIngredients,
} from "../recipe-matcher";
import { RECIPES } from "../recipe-data";
import type { PantryItem, Recipe } from "../types";

const pantryItem = (name: string): PantryItem => ({ name });

describe("matchRecipes — sorting by match %", () => {
  test("pantry with all ingredients -> 100%", () => {
    const target = RECIPES[0];
    const pantry: PantryItem[] = target.ingredients.map((i) => pantryItem(i.name));
    const matches = matchRecipes(pantry, RECIPES, { topN: 5 });
    const top = matches.find((m) => m.recipe.id === target.id);
    expect(top).toBeDefined();
    expect(top!.matchPercent).toBeCloseTo(1, 5);
    expect(top!.missingIngredients).toEqual([]);
  });

  test("pantry with half the ingredients -> ~50%", () => {
    const target = RECIPES[0];
    const half = target.ingredients.slice(0, Math.ceil(target.ingredients.length / 2));
    const pantry = half.map((i) => pantryItem(i.name));
    const matches = matchRecipes(pantry, RECIPES, { topN: 10 });
    const top = matches.find((m) => m.recipe.id === target.id);
    expect(top).toBeDefined();
    expect(top!.matchPercent).toBeGreaterThan(0.4);
    expect(top!.matchPercent).toBeLessThan(0.7);
  });

  test("empty pantry returns []", () => {
    expect(matchRecipes([], RECIPES)).toEqual([]);
  });

  test("case-insensitive ingredient matching", () => {
    const target = RECIPES[0];
    const pantry = target.ingredients.map((i) =>
      pantryItem(i.name.toUpperCase()),
    );
    const matches = matchRecipes(pantry, RECIPES, { topN: 5 });
    const top = matches.find((m) => m.recipe.id === target.id);
    expect(top).toBeDefined();
    expect(top!.matchPercent).toBeCloseTo(1, 5);
  });

  test("plural/singular matching (tomatoes matches tomato)", () => {
    const pantry = [pantryItem("tomatoes"), pantryItem("garlic"), pantryItem("olive oil")];
    const matches = matchRecipes(pantry, RECIPES, { topN: 20 });
    const pomodoro = matches.find((m) => m.recipe.title === "Spaghetti Pomodoro");
    expect(pomodoro).toBeDefined();
    expect(pomodoro!.matchedIngredients).toContain("tomato");
  });

  test("topN limits the number of results", () => {
    const pantry = RECIPES.slice(0, 6).flatMap((r) =>
      r.ingredients.map((i) => pantryItem(i.name)),
    );
    const top3 = matchRecipes(pantry, RECIPES, { topN: 3 });
    expect(top3.length).toBeLessThanOrEqual(3);
  });

  test("results are sorted by descending match percent", () => {
    const pantry = [pantryItem("tomato"), pantryItem("garlic"), pantryItem("olive oil")];
    const matches = matchRecipes(pantry, RECIPES, { topN: 5 });
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].matchPercent).toBeGreaterThanOrEqual(matches[i].matchPercent);
    }
  });

  test("missingIngredients lists what the pantry lacks", () => {
    const target = RECIPES[0];
    const pantry = [pantryItem(target.ingredients[0].name)];
    const result = scoreRecipe(target, pantry);
    expect(result.matchedIngredients).toContain(target.ingredients[0].name);
    expect(result.missingIngredients.length).toBeGreaterThan(0);
  });

  test("countMatchedIngredients reports matched and total", () => {
    const target = RECIPES[0];
    const pantry = [pantryItem(target.ingredients[0].name)];
    const counts = countMatchedIngredients(target, pantry);
    expect(counts.total).toBe(target.ingredients.length);
    expect(counts.matched).toBeGreaterThanOrEqual(1);
  });

  test("empty recipe ingredient list returns matchPercent 0 (safe)", () => {
    const emptyRecipe: Recipe = {
      id: "r-empty",
      title: "Empty",
      cuisine: "x",
      ingredients: [],
      instructions: ["do nothing"],
      prepTime: 0,
      cookTime: 0,
      servings: 1,
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      tags: [],
      difficulty: "easy",
    };
    const result = scoreRecipe(emptyRecipe, [pantryItem("tomato")]);
    expect(result.matchPercent).toBe(0);
    expect(result.matchedIngredients).toEqual([]);
    expect(result.missingIngredients).toEqual([]);
  });
});
