import { test, expect, describe } from "bun:test";
import { getSwap, getSwaps, __SWAP_TABLE } from "../ingredient-swaps";

describe("getSwap", () => {
  test("buttermilk -> 1 cup milk + 1 tbsp lemon juice", () => {
    const swap = getSwap("buttermilk");
    expect(swap).not.toBeNull();
    expect(swap!.substitute).toContain("1 cup milk");
    expect(swap!.substitute).toContain("lemon juice");
    expect(swap!.found).toBe(true);
  });

  test("egg -> flaxseed + water (vegetarian sub)", () => {
    const swap = getSwap("egg");
    expect(swap).not.toBeNull();
    expect(swap!.substitute).toContain("flaxseed");
    expect(swap!.substitute).toContain("water");
    expect(swap!.preserves).toContain("vegetarian");
  });

  test("unknown ingredient -> null", () => {
    expect(getSwap("alien-spice-from-mars")).toBeNull();
  });

  test("empty input -> null", () => {
    expect(getSwap("")).toBeNull();
    expect(getSwap("   ")).toBeNull();
  });

  test("case-insensitive lookup", () => {
    const swap = getSwap("BUTTERMILK");
    expect(swap).not.toBeNull();
    expect(swap!.substitute).toContain("lemon juice");
  });

  test("plural form matches singular entry", () => {
    const swap = getSwap("eggs");
    expect(swap).not.toBeNull();
    expect(swap!.substitute).toContain("flaxseed");
  });

  test("handles phrase like 'whole milk' via suffix match", () => {
    const swap = getSwap("whole milk");
    expect(swap).not.toBeNull();
    expect(swap!.substitute).toContain("oat milk");
  });

  test("handles phrase like 'fresh basil' via substring match", () => {
    const swap = getSwap("fresh basil");
    expect(swap).not.toBeNull();
    expect(swap!.substitute).toContain("dried basil");
  });

  test("getSwaps returns array aligned to input", () => {
    const results = getSwaps(["buttermilk", "egg", "alien-spice-from-mars"]);
    expect(results).toHaveLength(3);
    expect(results[0]).not.toBeNull();
    expect(results[1]).not.toBeNull();
    expect(results[2]).toBeNull();
  });

  test("swap table is non-empty", () => {
    expect(__SWAP_TABLE.length).toBeGreaterThanOrEqual(15);
  });
});
