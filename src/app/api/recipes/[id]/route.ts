/**
 * GET /api/recipes/[id]
 *
 * Returns a single recipe from the hardcoded dataset, plus its
 * persisted saved-state (whether the user has saved it).
 */

import { NextRequest, NextResponse } from "next/server";
import { getRecipeById } from "@/lib/recipe-data";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const recipe = getRecipeById(id);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    let saved = false;
    try {
      const row = await db.savedRecipe.findUnique({ where: { recipeId: id } });
      saved = !!row;
    } catch (e) {
      console.warn("[api/recipes/:id] saved check failed:", (e as Error).message);
    }
    return NextResponse.json({ recipe, saved });
  } catch (e) {
    console.error("[api/recipes/:id] error:", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
