/**
 * POST /api/scan
 *
 * Accepts either a multipart upload (`file=photo`) OR a JSON body
 * `{ manualIngredients: string }`. When a photo is provided, the vision
 * provider extracts a JSON list of detected ingredients. Otherwise the
 * manual textarea string is parsed into ingredients.
 *
 * The resulting ingredient list is persisted as a `PantryScan` row and
 * used to match the top 5 recipes from the hardcoded dataset.
 *
 * Response:
 *   {
 *     scanId: string,
 *     detected: DetectedIngredient[],
 *     pantry: PantryItem[],
 *     matches: MatchedRecipe[]
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVisionProvider } from "@/lib/ai";
import { buildIngredientExtractionPrompt } from "@/lib/vision-prompt";
import { parseManualIngredients } from "@/lib/ingredient-parser";
import { matchRecipes } from "@/lib/recipe-matcher";
import { RECIPES } from "@/lib/recipe-data";
import type { DetectedIngredient, PantryItem } from "@/lib/types";

export const runtime = "nodejs";

function fileToBase64(buf: Buffer): string {
  return buf.toString("base64");
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let detected: DetectedIngredient[] = [];
    let manualText = "";
    let imagePath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const manual = form.get("manualIngredients");
      if (typeof manual === "string" && manual.trim().length > 0) {
        manualText = manual;
      }
      if (file instanceof File) {
        const buf = Buffer.from(await file.arrayBuffer());
        const b64 = fileToBase64(buf);
        imagePath = `data:${file.type || "image/jpeg"};base64,${b64.slice(0, 32)}...`;
        const provider = getVisionProvider();
        const prompt = buildIngredientExtractionPrompt();
        detected = await provider.extractIngredients({
          imageBase64: b64,
          prompt,
        });
      }
    } else {
      // JSON body
      const body = await req.json().catch(() => ({}));
      if (typeof body?.manualIngredients === "string") {
        manualText = body.manualIngredients;
      }
    }

    const manualList = parseManualIngredients(manualText);
    const pantry: PantryItem[] = [
      ...detected.map((d) => ({ name: d.name, quantity: d.quantity })),
      ...manualList.map((name) => ({ name })),
    ];
    // Dedupe by lowercased name while preserving order.
    const seen = new Set<string>();
    const deduped: PantryItem[] = [];
    for (const p of pantry) {
      const k = p.name.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        deduped.push(p);
      }
    }

    const matches = matchRecipes(deduped, RECIPES, { topN: 5 });

    // Persist the scan. If the DB is unavailable (e.g. before db:push),
    // we still return results without writing.
    let scanId = "ephemeral";
    try {
      const scan = await db.pantryScan.create({
        data: {
          imagePath,
          manualIngredients: manualText,
          detectedIngredients: JSON.stringify(detected),
        },
      });
      scanId = scan.id;
    } catch (e) {
      console.warn("[api/scan] persist failed (continuing):", (e as Error).message);
    }

    return NextResponse.json({
      scanId,
      detected,
      pantry: deduped,
      matches,
    });
  } catch (e) {
    console.error("[api/scan] error:", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
