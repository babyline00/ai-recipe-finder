/**
 * POST /api/recipes/[id]/swaps
 *
 * Body: `{ missingIngredients: string[] }`.
 * For each missing ingredient, return a swap suggestion. The swap table
 * is consulted first (fast path, deterministic). If the table misses,
 * the chat provider is asked to produce JSON swap suggestions (best effort
 * — if the LLM is unavailable or returns malformed output, the table-only
 * result is returned with `source: "table" | "none"`).
 *
 * Response: `{ swaps: SwapSuggestion[] }`
 */

import { NextRequest, NextResponse } from "next/server";
import { getSwap } from "@/lib/ingredient-swaps";
import { getChatProvider, parseIngredientJson } from "@/lib/ai";
import { buildSwapSuggestionPrompt } from "@/lib/vision-prompt";
import type { SwapSuggestion } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const missing: string[] = Array.isArray(body?.missingIngredients)
      ? body.missingIngredients
          .map((i: unknown) => (typeof i === "string" ? i : String(i ?? "")))
          .filter((s: string) => s.length > 0)
      : [];

    const results: SwapSuggestion[] = [];
    const llmCandidates: string[] = [];

    for (const ing of missing) {
      const swap = getSwap(ing);
      if (swap && swap.found) {
        results.push({
          ingredient: ing,
          substitute: swap.substitute,
          source: "table",
        });
      } else {
        llmCandidates.push(ing);
      }
    }

    if (llmCandidates.length > 0) {
      try {
        const provider = getChatProvider();
        const raw = await provider.complete({
          systemPrompt:
            "You are a culinary substitution expert. Return STRICT JSON only.",
          userMessage: buildSwapSuggestionPrompt(llmCandidates),
        });
        // Reuse the JSON-tolerant parser from ai.ts (it looks for { ... }).
        const parsed: any = JSON.parse(raw);
        const arr: any[] = Array.isArray(parsed?.swaps) ? parsed.swaps : [];
        const byIngredient = new Map<string, string>();
        for (const item of arr) {
          if (typeof item?.ingredient === "string" && typeof item?.substitute === "string") {
            byIngredient.set(item.ingredient.toLowerCase(), item.substitute);
          }
        }
        for (const ing of llmCandidates) {
          const sub = byIngredient.get(ing.toLowerCase());
          results.push({
            ingredient: ing,
            substitute: sub ?? "No known substitute — consider omitting",
            source: sub ? "llm" : "none",
          });
        }
      } catch (e) {
        console.warn(
          "[api/recipes/:id/swaps] LLM swap failed, using table-only:",
          (e as Error).message,
        );
        for (const ing of llmCandidates) {
          results.push({
            ingredient: ing,
            substitute: "No known substitute — consider omitting",
            source: "none",
          });
        }
      }
    }

    return NextResponse.json({ id, swaps: results });
  } catch (e) {
    console.error("[api/recipes/:id/swaps] error:", e);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
