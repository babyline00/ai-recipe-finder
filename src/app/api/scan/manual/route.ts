/**
 * POST /api/scan/manual
 *
 * Body: `{ ingredients: string[] }` OR `{ text: string }`.
 * Skip the photo and just match recipes against the provided ingredient list.
 * Lightweight wrapper around `matchRecipes` — does not persist a PantryScan.
 *
 * Response: `{ pantry: PantryItem[], matches: MatchedRecipe[] }`
 */

import { NextRequest, NextResponse } from "next/server";
import { matchRecipes } from "@/lib/recipe-matcher";
import { parseManualIngredients } from "@/lib/ingredient-parser";
import { RECIPES } from "@/lib/recipe-data";
import type { PantryItem } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let names: string[] = [];
    if (Array.isArray(body?.ingredients)) {
      names = body.ingredients
        .map((i: unknown) => (typeof i === "string" ? i : String(i ?? "")))
        .filter((s: string) => s.length > 0);
    } else if (typeof body?.text === "string") {
      names = parseManualIngredients(body.text);
    } else {
      return NextResponse.json(
        { error: "Body must be { ingredients: string[] } or { text: string }" },
        { status: 400 },
      );
    }

    const pantry: PantryItem[] = names.map((name) => ({ name }));
    const matches = matchRecipes(pantry, RECIPES, { topN: 5 });
    return NextResponse.json({ pantry, matches });
  } catch (e) {
    console.error("[api/scan/manual] error:", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
