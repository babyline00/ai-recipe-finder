/**
 * DELETE /api/shopping-list/[id]  — remove a shopping list item.
 * PATCH  /api/shopping-list/[id] — body { purchased: boolean } toggle purchased state.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    try {
      await db.shoppingListItem.delete({ where: { id } });
    } catch (e) {
      console.warn("[api/shopping-list/:id] delete failed:", (e as Error).message);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/shopping-list/:id] DELETE error:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const purchased = !!body?.purchased;
    let item;
    try {
      item = await db.shoppingListItem.update({
        where: { id },
        data: { purchased },
      });
    } catch (e) {
      console.warn(
        "[api/shopping-list/:id] update failed:",
        (e as Error).message,
      );
      item = { id, purchased, ephemeral: true };
    }
    return NextResponse.json({ item });
  } catch (e) {
    console.error("[api/shopping-list/:id] PATCH error:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
