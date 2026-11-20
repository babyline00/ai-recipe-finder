/**
 * Filter recipes by diet tag and enumerate the unique set of tags across a
 * recipe collection. Pure functions so they're trivial to unit-test.
 */

import type { Recipe, RecipeTag } from "@/lib/types";

const VALID_TAGS: RecipeTag[] = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "dairy-free",
  "keto",
  "whole30",
];

const VALID_TAG_SET = new Set<string>(VALID_TAGS as string[]);

/** Returns true if the tag string is a known diet tag. */
export function isValidTag(tag: string): tag is RecipeTag {
  return VALID_TAG_SET.has(tag);
}

/** Normalize a user-supplied tag filter (lowercase, hyphenated). */
export function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, "-");
}

/**
 * Filter a list of recipes down to those carrying the given tag.
 * An empty or "all" tag returns the full list unchanged.
 */
export function filterByTag(recipes: Recipe[], tag: string): Recipe[] {
  if (!tag) return recipes;
  const norm = normalizeTag(tag);
  if (norm === "all") return recipes;
  return recipes.filter((r) => r.tags.some((t) => t === norm));
}

/**
 * Filter by multiple tags (AND semantics — a recipe must carry every tag).
 * Useful for stacking filters like "vegetarian + gluten-free".
 */
export function filterByAllTags(recipes: Recipe[], tags: string[]): Recipe[] {
  if (!tags.length) return recipes;
  const norms = tags.map(normalizeTag).filter((t) => t !== "all");
  if (!norms.length) return recipes;
  return recipes.filter((r) => norms.every((t) => r.tags.includes(t as RecipeTag)));
}

/** Return the unique set of tags present across a recipe list. */
export function getTags(recipes: Recipe[]): RecipeTag[] {
  const seen = new Set<RecipeTag>();
  for (const r of recipes) {
    for (const t of r.tags) {
      if (isValidTag(t)) seen.add(t);
    }
  }
  return VALID_TAGS.filter((t) => seen.has(t));
}

/** Returns a sorted list of unique cuisines present across a recipe list. */
export function getCuisines(recipes: Recipe[]): string[] {
  const seen = new Set<string>();
  for (const r of recipes) seen.add(r.cuisine);
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

/** Returns the list of valid diet tags. */
export function listValidTags(): RecipeTag[] {
  return [...VALID_TAGS];
}
