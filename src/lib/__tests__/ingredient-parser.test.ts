import { test, expect, describe } from "bun:test";
import {
  parseManualIngredients,
  stripLeadingQuantity,
} from "../ingredient-parser";

describe("parseManualIngredients", () => {
  test("comma-separated input", () => {
    expect(parseManualIngredients("tomatoes, pasta, garlic, olive oil")).toEqual([
      "tomatoes",
      "pasta",
      "garlic",
      "olive oil",
    ]);
  });

  test("newline-separated input", () => {
    expect(parseManualIngredients("tomatoes\npasta\ngarlic")).toEqual([
      "tomatoes",
      "pasta",
      "garlic",
    ]);
  });

  test("mixed separators (commas, newlines, semicolons)", () => {
    expect(
      parseManualIngredients("tomatoes, pasta\nbasil; olive oil, parmesan"),
    ).toEqual(["tomatoes", "pasta", "basil", "olive oil", "parmesan"]);
  });

  test("handles leading quantities", () => {
    expect(parseManualIngredients("2 tomatoes\n1 onion\nolive oil")).toEqual([
      "tomatoes",
      "onion",
      "olive oil",
    ]);
  });

  test("handles cup / tbsp quantities", () => {
    expect(
      parseManualIngredients("2 cups flour, 1 tbsp sugar, 1/2 tsp salt"),
    ).toEqual(["flour", "sugar", "salt"]);
  });

  test("strips extra whitespace", () => {
    expect(parseManualIngredients("   chicken  ,   rice  ,  beans  ")).toEqual([
      "chicken",
      "rice",
      "beans",
    ]);
  });

  test("empty input returns []", () => {
    expect(parseManualIngredients("")).toEqual([]);
    expect(parseManualIngredients("   ")).toEqual([]);
  });

  test("dedupes case-insensitive duplicates", () => {
    expect(parseManualIngredients("Tomatoes, tomatoes, TOMATOES")).toEqual([
      "Tomatoes",
    ]);
  });

  test("drops entries that become empty after stripping quantity", () => {
    expect(parseManualIngredients("2, 3, tomato")).toEqual(["tomato"]);
  });
});

describe("stripLeadingQuantity", () => {
  test("removes leading integer", () => {
    expect(stripLeadingQuantity("2 tomatoes")).toBe("tomatoes");
  });

  test("removes leading fraction", () => {
    expect(stripLeadingQuantity("1/2 cup flour")).toBe("flour");
  });

  test("removes leading decimal", () => {
    expect(stripLeadingQuantity("1.5 kg chicken")).toBe("chicken");
  });

  test("leaves multi-word names without quantities intact", () => {
    expect(stripLeadingQuantity("extra-virgin olive oil")).toBe(
      "extra-virgin olive oil",
    );
  });
});
