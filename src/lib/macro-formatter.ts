/**
 * Format and combine macro values (calories, protein, carbs, fat) for the UI.
 *
 * `formatMacros` returns a compact one-line string, e.g.
 *   "320 kcal | 18g protein | 22g carbs | 12g fat per serving"
 *
 * `formatMacrosCompact` returns a single space-separated token list, e.g.
 *   "320kcal 18p 22c 12f"
 *
 * `sumMacros` adds two macro objects (per-serving -> per-recipe totals).
 *
 * `scaleMacros` multiplies by a factor (servings multiplier).
 */

import type { Macros } from "@/lib/types";

export function formatMacros(macros: Macros, servings?: number): string {
  const label =
    servings && servings > 0 ? `per serving (serves ${servings})` : "per serving";
  return `${macros.calories} kcal | ${macros.protein}g protein | ${macros.carbs}g carbs | ${macros.fat}g fat ${label}`;
}

export function formatMacrosCompact(macros: Macros): string {
  return `${macros.calories}kcal ${macros.protein}p ${macros.carbs}c ${macros.fat}f`;
}

/** Sum two macros objects. Useful for "macros for the whole dish". */
export function sumMacros(a: Macros, b: Macros): Macros {
  return {
    calories: round(a.calories + b.calories),
    protein: round(a.protein + b.protein),
    carbs: round(a.carbs + b.carbs),
    fat: round(a.fat + b.fat),
  };
}

/** Sum an array of macros objects. Empty array -> zero macros. */
export function sumMacrosMany(arr: Macros[]): Macros {
  return arr.reduce<Macros>(
    (acc, m) => sumMacros(acc, m),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** Scale a per-serving macro by a factor (e.g. 2 servings -> 2x). */
export function scaleMacros(macros: Macros, factor: number): Macros {
  return {
    calories: round(macros.calories * factor),
    protein: round(macros.protein * factor),
    carbs: round(macros.carbs * factor),
    fat: round(macros.fat * factor),
  };
}

/**
 * Compute total macros for a whole recipe given per-serving macros and the
 * number of servings the recipe yields.
 */
export function totalMacrosForRecipe(macros: Macros, servings: number): Macros {
  return scaleMacros(macros, Math.max(0, servings));
}

/** Round to 1 decimal place; integers stay as integers. */
function round(n: number): number {
  return Math.round(n * 10) / 10;
}
