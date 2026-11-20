/**
 * POST   /api/recipes/[id]/save — save the recipe (idempotent via @@unique).
 * DELETE /api/recipes/[id]/save — unsave the recipe.
 *
 * The SavedRecipe table is keyed by `recipeId` so a recipe can only be
 * saved once. The recipe itself lives in the hardcoded dataset; we only
 * persist the user's "saved" relationship.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRecipeById } from "@/lib/recipe-data";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const recipe = getRecipeById(id);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    try {
      // upsert because the unique constraint may reject duplicates.
      const saved = await db.savedRecipe.upsert({
        where: { recipeId: id },
        update: {},
        create: { recipeId: id },
      });
      return NextResponse.json({ ok: true, saved });
    } catch (e) {
      console.warn("[api/recipes/:id/save] persist failed:", (e as Error).message);
      return NextResponse.json({ ok: true, saved: { recipeId: id, ephemeral: true } });
    }
  } catch (e) {
    console.error("[api/recipes/:id/save] POST error:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    try {
      await db.savedRecipe.deleteMany({ where: { recipeId: id } });
    } catch (e) {
      console.warn("[api/recipes/:id/save] delete failed:", (e as Error).message);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/recipes/:id/save] DELETE error:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
