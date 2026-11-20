/**
 * GET  /api/shopping-list       — list all shopping list items.
 * POST /api/shopping-list       — body { name, quantity?, recipeId? } add item.
 *
 * Each item can optionally be linked to a recipeId (the recipe that
 * surfaced the missing ingredient the user is adding to the list).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await db.shoppingListItem.findMany({
      orderBy: { addedAt: "desc" },
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[api/shopping-list] GET error:", e);
    return NextResponse.json({ items: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const quantity =
      typeof body?.quantity === "string" && body.quantity.trim()
        ? body.quantity.trim()
        : null;
    const recipeId =
      typeof body?.recipeId === "string" && body.recipeId.trim()
        ? body.recipeId.trim()
        : null;

    let item;
    try {
      item = await db.shoppingListItem.create({
        data: { name, quantity, recipeId },
      });
    } catch (e) {
      console.warn(
        "[api/shopping-list] persist failed:",
        (e as Error).message,
      );
      item = { id: "ephemeral", name, quantity, recipeId, addedAt: new Date().toISOString(), purchased: false };
    }
    return NextResponse.json({ item });
  } catch (e) {
    console.error("[api/shopping-list] POST error:", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
