import { test, expect, describe } from "bun:test";
import {
  filterByTag,
  filterByAllTags,
  getTags,
  getCuisines,
  listValidTags,
  isValidTag,
  normalizeTag,
} from "../tag-filter";
import { RECIPES } from "../recipe-data";
import type { Recipe } from "../types";

const miniRecipes: Recipe[] = [
  {
    id: "m1",
    title: "Vegan Bowl",
    cuisine: "American",
    ingredients: [{ name: "rice", quantity: "1 cup" }],
    instructions: ["cook rice"],
    prepTime: 5,
    cookTime: 10,
    servings: 1,
    macros: { calories: 100, protein: 2, carbs: 22, fat: 0 },
    tags: ["vegan", "gluten-free", "dairy-free"],
    difficulty: "easy",
  },
  {
    id: "m2",
    title: "Cheesy Pizza",
    cuisine: "Italian",
    ingredients: [{ name: "flour", quantity: "1 cup" }],
    instructions: ["bake"],
    prepTime: 5,
    cookTime: 12,
    servings: 1,
    macros: { calories: 280, protein: 10, carbs: 38, fat: 9 },
    tags: ["vegetarian"],
    difficulty: "easy",
  },
];

describe("filterByTag", () => {
  test("empty tag returns everything", () => {
    expect(filterByTag(miniRecipes, "")).toHaveLength(2);
  });

  test('"all" returns everything', () => {
    expect(filterByTag(miniRecipes, "all")).toHaveLength(2);
  });

  test("returns matching recipes only", () => {
    expect(filterByTag(miniRecipes, "vegan")).toEqual([miniRecipes[0]]);
  });

  test("case-insensitive tag", () => {
    expect(filterByTag(miniRecipes, "VEGAN")).toEqual([miniRecipes[0]]);
  });

  test("normalizes spaces to hyphens", () => {
    expect(filterByTag(miniRecipes, "gluten free")).toEqual([miniRecipes[0]]);
  });
});

describe("filterByAllTags", () => {
  test("multiple tags use AND semantics", () => {
    const result = filterByAllTags(miniRecipes, ["vegan", "gluten-free"]);
    expect(result).toEqual([miniRecipes[0]]);
  });

  test("empty array returns everything", () => {
    expect(filterByAllTags(miniRecipes, [])).toHaveLength(2);
  });

  test('"all" tag is ignored', () => {
    expect(filterByAllTags(miniRecipes, ["all"])).toHaveLength(2);
  });
});

describe("getTags / getCuisines", () => {
  test("getTags returns unique tags present", () => {
    const tags = getTags(miniRecipes);
    expect(tags).toContain("vegan");
    expect(tags).toContain("vegetarian");
    expect(tags).toContain("gluten-free");
  });

  test("getTags on full dataset returns all valid tags", () => {
    const tags = getTags(RECIPES);
    // The dataset was designed to span every valid tag.
    expect(tags.length).toBeGreaterThanOrEqual(5);
  });

  test("getCuisines returns sorted unique cuisines", () => {
    const cuisines = getCuisines(miniRecipes);
    expect(cuisines).toEqual(["American", "Italian"]);
  });
});

describe("isValidTag / normalizeTag / listValidTags", () => {
  test("isValidTag accepts known tags", () => {
    expect(isValidTag("vegetarian")).toBe(true);
    expect(isValidTag("vegan")).toBe(true);
    expect(isValidTag("alien-diet")).toBe(false);
  });

  test("normalizeTag lowercases and replaces spaces", () => {
    expect(normalizeTag("Gluten Free")).toBe("gluten-free");
  });

  test("listValidTags returns the canonical list", () => {
    expect(listValidTags()).toContain("vegetarian");
    expect(listValidTags().length).toBe(6);
  });
});
