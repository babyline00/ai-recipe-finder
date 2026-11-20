/**
 * GET /api/stats
 *
 * Returns high-level counters for the dashboard header.
 *   { recipes, scans, saved, shoppingListItems }
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RECIPE_COUNT } from "@/lib/recipe-data";

export const runtime = "nodejs";

export async function GET() {
  let scans = 0;
  let saved = 0;
  let shoppingListItems = 0;
  try {
    scans = await db.pantryScan.count();
    saved = await db.savedRecipe.count();
    shoppingListItems = await db.shoppingListItem.count();
  } catch (e) {
    // DB may not be initialized yet (before db:push). Return zeros.
    console.warn("[api/stats] DB count failed:", (e as Error).message);
  }
  return NextResponse.json({
    recipes: RECIPE_COUNT,
    scans,
    saved,
    shoppingListItems,
  });
}
