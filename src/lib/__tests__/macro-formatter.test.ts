import { test, expect, describe } from "bun:test";
import {
  formatMacros,
  formatMacrosCompact,
  sumMacros,
  sumMacrosMany,
  scaleMacros,
  totalMacrosForRecipe,
} from "../macro-formatter";
import type { Macros } from "../types";

const m1: Macros = { calories: 320, protein: 18, carbs: 22, fat: 12 };
const m2: Macros = { calories: 200, protein: 8, carbs: 30, fat: 6 };

describe("formatMacros", () => {
  test("returns UI-friendly one-line string", () => {
    expect(formatMacros(m1)).toBe(
      "320 kcal | 18g protein | 22g carbs | 12g fat per serving",
    );
  });

  test("includes servings label when provided", () => {
    expect(formatMacros(m1, 4)).toBe(
      "320 kcal | 18g protein | 22g carbs | 12g fat per serving (serves 4)",
    );
  });

  test("compact formatter returns single-line tokens", () => {
    expect(formatMacrosCompact(m1)).toBe("320kcal 18p 22c 12f");
  });
});

describe("sumMacros", () => {
  test("adds two macro objects", () => {
    const sum = sumMacros(m1, m2);
    expect(sum.calories).toBe(520);
    expect(sum.protein).toBe(26);
    expect(sum.carbs).toBe(52);
    expect(sum.fat).toBe(18);
  });

  test("sumMacrosMany of empty -> zero macros", () => {
    const sum = sumMacrosMany([]);
    expect(sum).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  test("sumMacrosMany of three", () => {
    const sum = sumMacrosMany([m1, m2, m1]);
    expect(sum.calories).toBe(840);
    expect(sum.protein).toBe(44);
  });
});

describe("scaleMacros / totalMacrosForRecipe", () => {
  test("scaleMacros multiplies by factor", () => {
    const scaled = scaleMacros(m1, 2);
    expect(scaled.calories).toBe(640);
    expect(scaled.protein).toBe(36);
  });

  test("scaleMacros handles fractional factor with rounding", () => {
    const scaled = scaleMacros({ calories: 100, protein: 5, carbs: 3, fat: 2 }, 0.5);
    expect(scaled.calories).toBe(50);
    expect(scaled.protein).toBe(2.5);
  });

  test("totalMacrosForRecipe multiplies by servings", () => {
    const total = totalMacrosForRecipe(m1, 4);
    expect(total.calories).toBe(1280);
  });

  test("totalMacrosForRecipe with 0 servings -> zero macros", () => {
    const total = totalMacrosForRecipe(m1, 0);
    expect(total).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });
});
