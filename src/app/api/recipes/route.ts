/**
 * GET /api/recipes
 *
 * List recipes from the hardcoded dataset, with optional filters:
 *   ?cuisine=italian     — case-insensitive substring match
 *   ?tag=vegetarian      — only recipes carrying this diet tag
 *   ?q=pizza             — free-text search over title + ingredients
 *
 * Response: `{ recipes: Recipe[] }`
 */

import { NextRequest, NextResponse } from "next/server";
import { RECIPES, searchRecipes } from "@/lib/recipe-data";
import { filterByTag, getCuisines } from "@/lib/tag-filter";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const cuisine = (url.searchParams.get("cuisine") ?? "").toLowerCase();
    const tag = url.searchParams.get("tag") ?? "";
    const q = url.searchParams.get("q") ?? "";

    let list = RECIPES;
    if (q) list = searchRecipes(q);
    if (cuisine) list = list.filter((r) => r.cuisine.toLowerCase().includes(cuisine));
    if (tag) list = filterByTag(list, tag);

    const cuisines = getCuisines(RECIPES);

    return NextResponse.json({ recipes: list, cuisines });
  } catch (e) {
    console.error("[api/recipes] error:", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
