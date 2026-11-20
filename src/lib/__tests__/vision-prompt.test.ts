import { test, expect, describe } from "bun:test";
import {
  buildIngredientExtractionPrompt,
  buildSwapSuggestionPrompt,
} from "../vision-prompt";

describe("buildIngredientExtractionPrompt", () => {
  test("asks for JSON of { ingredients: [{ name, quantity, confidence }] }", () => {
    const prompt = buildIngredientExtractionPrompt();
    expect(prompt).toContain('"ingredients"');
    expect(prompt).toContain('"name"');
    expect(prompt).toContain('"quantity"');
    expect(prompt).toContain('"confidence"');
  });

  test("forbids prose and markdown fences", () => {
    const prompt = buildIngredientExtractionPrompt();
    expect(prompt.toLowerCase()).toContain("no prose");
    expect(prompt.toLowerCase()).toContain("no markdown fences");
  });

  test("sets a default maxIngredients of 25", () => {
    const prompt = buildIngredientExtractionPrompt();
    expect(prompt).toContain("25");
  });

  test("respects custom maxIngredients", () => {
    const prompt = buildIngredientExtractionPrompt({ maxIngredients: 10 });
    expect(prompt).toContain("10");
  });

  test("includes the hint when provided", () => {
    const prompt = buildIngredientExtractionPrompt({ hint: "vegetarian household" });
    expect(prompt).toContain("vegetarian household");
  });

  test("omits the hint line when none provided", () => {
    const prompt = buildIngredientExtractionPrompt();
    expect(prompt).not.toContain("User-provided context hint");
  });

  test("instructs singular lowercase names", () => {
    const prompt = buildIngredientExtractionPrompt();
    expect(prompt.toLowerCase()).toContain("singular");
    expect(prompt.toLowerCase()).toContain("lowercase");
  });
});

describe("buildSwapSuggestionPrompt", () => {
  test("asks for { swaps: [{ ingredient, substitute }] }", () => {
    const prompt = buildSwapSuggestionPrompt(["buttermilk"]);
    expect(prompt).toContain('"swaps"');
    expect(prompt).toContain('"ingredient"');
    expect(prompt).toContain('"substitute"');
  });

  test("lists the missing ingredients", () => {
    const prompt = buildSwapSuggestionPrompt(["buttermilk", "egg"]);
    expect(prompt).toContain("buttermilk");
    expect(prompt).toContain("egg");
  });

  test("empty list still produces a valid prompt", () => {
    const prompt = buildSwapSuggestionPrompt([]);
    expect(prompt).toContain('"swaps"');
    expect(prompt).toContain("0");
  });
});
