import { test, expect, describe } from "bun:test";
import {
  getVisionProvider,
  getChatProvider,
  parseIngredientJson,
  __setVisionProviderForTest,
  __setChatProviderForTest,
  type VisionProvider,
  type ChatProvider,
} from "../ai";
import type { DetectedIngredient } from "../types";

class MockVision implements VisionProvider {
  constructor(private readonly ingredients: DetectedIngredient[]) {}
  async extractIngredients(): Promise<DetectedIngredient[]> {
    return this.ingredients;
  }
}

class MockChat implements ChatProvider {
  async complete(): Promise<string> {
    return '{"swaps":[{"ingredient":"buttermilk","substitute":"1 cup milk + 1 tbsp lemon juice"}]}';
  }
}

describe("VisionProvider mock", () => {
  test("returns deterministic ingredient extraction", async () => {
    const expected: DetectedIngredient[] = [
      { name: "tomato", quantity: "2", confidence: 0.9 },
      { name: "basil", quantity: "1 bunch", confidence: 0.8 },
    ];
    __setVisionProviderForTest(new MockVision(expected));
    const provider = getVisionProvider();
    const result = await provider.extractIngredients({
      imageBase64: "",
      prompt: "",
    });
    expect(result).toEqual(expected);
    __setVisionProviderForTest(null);
  });

  test("mock returns 6 pantry items by default", async () => {
    // When no override is set and LLM is disabled, the MockVisionProvider
    // returns the deterministic pantry list.
    process.env.PKC_DISABLE_LLM = "1";
    __setVisionProviderForTest(null);
    const provider = getVisionProvider();
    const result = await provider.extractIngredients({
      imageBase64: "",
      prompt: "",
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((i) => i.name === "tomato")).toBe(true);
    delete process.env.PKC_DISABLE_LLM;
    __setVisionProviderForTest(null);
  });
});

describe("ChatProvider mock", () => {
  test("returns deterministic swap JSON", async () => {
    __setChatProviderForTest(new MockChat());
    const provider = getChatProvider();
    const out = await provider.complete({
      systemPrompt: "",
      userMessage: "",
    });
    const parsed = JSON.parse(out);
    expect(parsed.swaps[0].ingredient).toBe("buttermilk");
    expect(parsed.swaps[0].substitute).toContain("lemon juice");
    __setChatProviderForTest(null);
  });
});

describe("parseIngredientJson", () => {
  test("parses a clean JSON object", () => {
    const json =
      '{"ingredients":[{"name":"tomato","quantity":"2","confidence":0.9}]}';
    const result = parseIngredientJson(json);
    expect(result).toEqual([
      { name: "tomato", quantity: "2", confidence: 0.9 },
    ]);
  });

  test("strips ```json fences", () => {
    const fenced =
      '```json\n{"ingredients":[{"name":"basil","quantity":"1 bunch"}]}\n```';
    const result = parseIngredientJson(fenced);
    expect(result).toEqual([{ name: "basil", quantity: "1 bunch", confidence: undefined }]);
  });

  test("tolerates leading prose", () => {
    const withProse =
      'Here are the ingredients I see: {"ingredients":[{"name":"garlic","quantity":"3 cloves","confidence":0.7}]} thanks!';
    const result = parseIngredientJson(withProse);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("garlic");
  });

  test("returns [] for malformed JSON", () => {
    expect(parseIngredientJson("not json at all")).toEqual([]);
    expect(parseIngredientJson("")).toEqual([]);
    expect(parseIngredientJson("{}")).toEqual([]);
  });

  test("filters out empty ingredient names", () => {
    const json =
      '{"ingredients":[{"name":"tomato","quantity":"2"},{"name":"","quantity":"1"},{"name":"basil"}]}';
    const result = parseIngredientJson(json);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(["tomato", "basil"]);
  });
});
