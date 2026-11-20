# AI-Powered Recipe Finder

> Snap a photo of your fridge or pantry, get **5 recipes you can make right now** — with missing-ingredient swaps and per-serving macros.

The MVP runs entirely on a **hardcoded recipe dataset** (35 recipes across 9 cuisines) and a **fuzzy pantry matcher**. A vision model extracts ingredients from a fridge photo via `zai.chat.completions.createVision`; for offline / mock setups, a deterministic `MockVisionProvider` keeps the UI demoable.

---

## MVP scope vs. stretch goals

| Feature | MVP | Stretch |
| --- | --- | --- |
| Ingredient extraction from a fridge photo | YES — via `zai.chat.completions.createVision` (with `MockVisionProvider` fallback) | OCR fallback for scanned PDFs / shopping receipts |
| Recipe dataset | 35 hardcoded recipes in `src/lib/recipe-data.ts` | Real Spoonacular API integration |
| Recipe matching | Pure-function `matchRecipes(pantry, recipes)` sorted by % | Embedding-based semantic match across cuisines |
| Missing-ingredient swaps | Hardcoded swap table + LLM escalation in `/api/recipes/[id]/swaps` | LLM-only with regional pantry awareness |
| Macros per serving | Already in recipe data; rendered as a small card | Dynamic macro recalculation when swaps are applied |
| Diet filter | vegetarian, vegan, gluten-free, dairy-free, keto, whole30 | Combined macro + diet filter |
| Save + shopping list | Persisted in SQLite via Prisma | Grocery delivery integration (Instacart, Whole Foods) |

### Stretch goals I'd build next

- **Real Spoonacular API** — the dataset has 35 recipes today; Spoonacular has ~13,000. Adding an `/api/spoonacular/search` proxy would let users search beyond the seeded dataset, while still keeping the hardcoded recipes as the offline fallback.
- **Real image OCR fallback** — when `createVision` returns low-confidence output (all items below 0.4), fall back to a Tesseract.js OCR pass over the same image and let the LLM clean up the OCR'd text into structured ingredients.
- **Pantry inventory tracking** — persist the pantry between sessions so the user doesn't have to re-scan every time. Add a "use up" mode that surfaces recipes prioritizing ingredients close to their expiry date.
- **Weekly meal plan** — extend the matcher to suggest 5 recipes that together use up the most of the pantry (knapsack-style) and emit a single consolidated shopping list.
- **Grocery delivery integration** — POST the shopping list to Instacart's developer API and offer a one-click "Order missing ingredients" button.

---

## Features

- **Photo ingredient extraction** — upload a fridge/pantry photo; the vision provider returns a JSON list of detected ingredients with confidence scores.
- **Manual fallback** — a textarea accepts comma / newline / semicolon-separated ingredients. Quantities like `2 cups flour` are auto-stripped to `flour`.
- **Fuzzy matching** — `tomatoes` matches `tomato`, `extra-virgin olive oil` matches `olive oil`, and the pantry is matched case-insensitively.
- **Top-5 ranked recipes** — `matchRecipes` returns the 5 recipes with the highest % of ingredients the pantry can satisfy.
- **Missing-ingredient swaps** — each recipe card exposes a "View swaps" dialog that shows a substitute for every missing ingredient (table first, LLM second).
- **Per-serving macros** — calories / protein / carbs / fat rendered on every card; the `macro-formatter` provides compact and full strings.
- **Diet filters** — toggle vegetarian / vegan / gluten-free / dairy-free / keto / whole30; filters stack with AND semantics.
- **Save recipe** — persists a `SavedRecipe` row; the save toggle is idempotent via the `@@unique([recipeId])` constraint.
- **Shopping list** — add all missing ingredients for a recipe in one click; mark items purchased; delete individually. Persisted in SQLite.
- **Stats header** — counters for recipes / scans / saved / shopping-list items refresh after every mutation.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 with shadcn/ui (New York) |
| Database | Prisma 6 + SQLite (`db/custom.db`) |
| Vision | `z-ai-web-dev-sdk` — `zai.chat.completions.createVision` |
| Toasts | `sonner` |
| Icons | `lucide-react` |
| Tests | `bun test` (bun:test) |

---

## Architecture (ASCII)

```
                       +------------------------+
                       |  browser (page.tsx)    |
                       |  photo | manual | filters |
                       +-----------+------------+
                                   |
                      fetch /api/* (relative paths)
                                   |
       +---------------------------+---------------------------+
       |                                                       |
+------v------+                                       +--------v--------+
| /api/scan   |  multipart file OR JSON                | /api/scan/manual |
| vision      |  --> ai.getVisionProvider              | parse + match    |
| .extractIngr|                                       | (no DB write)    |
+------+------+                                       +--------+---------+
       |                                                       |
       | persist PantryScan                                     |
       v                                                       v
+------+--------------+                          +----------------------+
| Prisma SQLite       |<-- ShoppingListItem ---| /api/shopping-list   |
| - PantryScan         |<-- SavedRecipe --------| /api/recipes/[id]/save
| - SavedRecipe        |                          +----------------------+
| - ShoppingListItem  |
+------+--------------+
       |
       v
+------+----------------------------------------+
| src/lib/recipe-data.ts  (35 hardcoded recipes)|
+------+----------------------------------------+
       |
       v
+------+----------------------------------+
| matchRecipes(pantry, RECIPES) -> top 5 |
+---------------------------------------+

  Swaps path:
  recipe card -> /api/recipes/[id]/swaps
                -> ingredient-swaps.getSwap() (fast path)
                -> ai.getChatProvider().complete() (LLM fallback)
                -> SwapSuggestion[]
```

The flow is intentionally **stateless on the client** — every mutation (scan, save, add to list, mark purchased) round-trips to a small REST API and re-fetches the affected slice. This keeps the UI in sync with the DB without a state library.

---

## Setup

```bash
# 1. install deps (use bun for speed)
bun install

# 2. create the local SQLite db + tables
bun run db:push

# 3. copy .env.example -> .env and adjust if needed
cp .env.example .env

# 4. start the dev server
bun run dev
```

The app boots on **http://localhost:3000**.

### To run with the vision LLM disabled (offline demo mode)

```bash
PKC_DISABLE_LLM=1 bun run dev
```

When `PKC_DISABLE_LLM=1`, the `MockVisionProvider` returns a deterministic 6-item pantry so the UI stays demoable without uploading a real photo.

---

## Tests

```bash
bun test
```

Aim: **35+ tests** across 8 spec files in `src/lib/__tests__/`:

| Spec file | What it covers |
| --- | --- |
| `recipe-data.test.ts` | Every recipe has all required fields; ids are unique; `searchRecipes` works. |
| `recipe-matcher.test.ts` | `matchRecipes` sorts by match %; 100%, ~50%, 0% pantries; case-insensitive + plural matching. |
| `ingredient-swaps.test.ts` | `getSwap("buttermilk")`, `getSwap("egg")`, unknown -> null, phrase / case variants. |
| `vision-prompt.test.ts` | `buildIngredientExtractionPrompt` emits the JSON schema and forbids prose. |
| `ingredient-parser.test.ts` | `parseManualIngredients` handles comma / newline / mixed input + quantities. |
| `macro-formatter.test.ts` | `formatMacros`, `sumMacros`, `scaleMacros`, `totalMacrosForRecipe`. |
| `tag-filter.test.ts` | `filterByTag`, `filterByAllTags` (AND), `getTags`, `getCuisines`. |
| `ai.test.ts` | `MockVisionProvider` returns deterministic output; `parseIngredientJson` is tolerant. |

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | Absolute `file:` URL to the SQLite db. Default: `file:/home/z/my-project/apps/62-ai-recipe-finder/db/custom.db`. |
| `PKC_DISABLE_LLM` | no | `1` disables the vision + chat LLM calls and uses deterministic mocks. |
| `RECIPE_DISABLE_LLM` | no | Alias for `PKC_DISABLE_LLM` (kept for symmetry with the parent project). |

The `z-ai-web-dev-sdk` carries its own internal configuration; no separate `LLM_API_KEY` env var is required in the sandbox.

---

## Project structure

```
62-ai-recipe-finder/
├── prisma/
│   └── schema.prisma                # 4 models: Recipe, PantryScan, SavedRecipe, ShoppingListItem
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Geist font + Toaster
│   │   ├── page.tsx                 # 3-section UI: input | matches | shopping list
│   │   ├── globals.css              # Tailwind 4 + green accent theme
│   │   └── api/
│   │       ├── scan/route.ts        # POST: multipart file OR JSON manualIngredients
│   │       ├── scan/manual/route.ts # POST: { ingredients: string[] } -> match
│   │       ├── recipes/route.ts     # GET: ?cuisine=&tag=&q=
│   │       ├── recipes/[id]/route.ts            # GET single recipe + saved state
│   │       ├── recipes/[id]/swaps/route.ts      # POST: { missingIngredients } -> swaps
│   │       ├── recipes/[id]/save/route.ts       # POST save / DELETE unsave
│   │       ├── shopping-list/route.ts           # GET list / POST add item
│   │       ├── shopping-list/[id]/route.ts      # DELETE item / PATCH purchased
│   │       └── stats/route.ts                   # GET counters
│   ├── components/ui/               # 15 shadcn/ui components (copied from parent)
│   └── lib/
│       ├── types.ts                 # Recipe, PantryItem, MatchedRecipe, SwapSuggestion ...
│       ├── recipe-data.ts           # 35 hardcoded recipes + helpers
│       ├── recipe-matcher.ts       # matchRecipes, scoreRecipe, countMatchedIngredients
│       ├── ingredient-swaps.ts     # swap table + getSwap / getSwaps
│       ├── ingredient-parser.ts     # parseManualIngredients, stripLeadingQuantity
│       ├── macro-formatter.ts       # formatMacros, sumMacros, scaleMacros
│       ├── tag-filter.ts            # filterByTag, getTags, getCuisines
│       ├── vision-prompt.ts         # buildIngredientExtractionPrompt, buildSwapSuggestionPrompt
│       ├── tokenizer.ts             # tokenize, normalizeIngredient, ingredientsMatch
│       ├── ai.ts                    # VisionProvider + ChatProvider (Zai + Mock)
│       ├── db.ts                    # PrismaClient singleton
│       ├── utils.ts                 # cn (clsx + tailwind-merge)
│       └── __tests__/               # 8 spec files, 35+ tests
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json
├── eslint.config.mjs
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

---

## Case study

### Vision-based ingredient extraction

`POST /api/scan` accepts a multipart upload with a `file=photo` field. The route handler converts the file to a base64 string and calls `getVisionProvider().extractIngredients({ imageBase64, prompt })`. The `VisionProvider` interface is implemented twice:

- `ZaiVisionProvider` uses `zai.chat.completions.createVision` with a content array of `[{ type: "text", text: prompt }, { type: "image_url", image_url: { url: dataUri } }]`.
- `MockVisionProvider` returns a deterministic 6-item pantry, so the UI is fully demoable offline.

The prompt is built by the pure function `buildIngredientExtractionPrompt({ maxIngredients })` which (1) states the JSON schema explicitly, (2) forbids prose and markdown fences, and (3) asks for singular lowercase ingredient names with confidence values. The response is parsed by `parseIngredientJson`, a tolerant parser that strips ```json fences, finds the first balanced JSON object, and filters out empty ingredient names.

### Recipe matching

`matchRecipes(pantry, recipes, { topN, minMatchPercent })` is a **pure function**:

1. For each recipe, `scoreRecipe` walks the ingredient list and checks whether the pantry has a fuzzy match for each ingredient (via `ingredientsMatch` in `tokenizer.ts`). `ingredientsMatch` normalizes both sides (lowercase, singularized, stop-word filtered) and accepts the match if the two normalized strings share a content token of length >= 4 (e.g. "oil" is too short — `oil` and `foil` would falsely match — but `tomato` and `cherry tomato` share `tomato`).
2. `matchPercent = matched / total`.
3. Sort by `matchPercent` desc, tie-break by title asc, then id asc for deterministic output (important for tests).
4. Slice to `topN` (default 5).

Because the matcher is pure, every edge case (empty pantry, 100%, ~50%, case insensitivity, plural/singular) is covered by a unit test in `recipe-matcher.test.ts` without spinning up the API or DB.

### Swap suggestions

The "View swaps" dialog on each recipe card calls `POST /api/recipes/[id]/swaps` with the full ingredient list of that recipe. The handler:

1. Calls `getSwap(ing)` for each ingredient — this is the **fast path** against the hardcoded swap table (30+ entries: buttermilk, egg, butter, flour, sugar, broth, soy sauce, herbs, alliums, ...).
2. For ingredients the table misses, it batches them into one `getChatProvider().complete()` call with `buildSwapSuggestionPrompt(missing)` and parses the LLM's JSON.
3. Each result is tagged with `source: "table" | "llm" | "none"` so the UI can show a badge.

This hybrid approach gives instant, deterministic answers for common swaps (no network call) while still supporting arbitrary ingredients via the LLM when it's available.

### What I'd do differently

- **Real Spoonacular API**: 35 recipes is enough to demo the matcher but not enough to feel like a "real" product. I'd add an `/api/spoonacular/search` proxy that translates `?ingredients=` into a Spoonacular call, then merges the results with the hardcoded dataset so users always have a baseline even when the API is rate-limited.
- **Real image OCR fallback**: `createVision` is great when the photo is well-lit and the ingredients have clear labels, but it struggles with handwritten notes or back-of-the-box ingredient lists. I'd add a Tesseract.js pass for those cases and let the LLM clean up the OCR output.
- **Pantry inventory tracking**: today the pantry is ephemeral — every scan starts fresh. I'd add a `PantryItem` table with `quantity` and `expiresAt`, and a "use it up" mode that surfaces recipes prioritizing the soonest-to-expire items.
- **Weekly meal plan**: a knapsack-style optimizer that picks 5 recipes whose combined ingredient list best covers the pantry, with one consolidated shopping list for the gaps.
- **Grocery delivery integration**: POST the shopping list to Instacart's developer API and add an "Order missing ingredients" button.

### Resume bullet

> Built an AI-Powered Recipe Finder with Next.js 16 + TypeScript that extracts fridge ingredients from a photo via `zai.chat.completions.createVision`, matches them against 35 hardcoded recipes with a fuzzy pure-function matcher (plural/case-insensitive), suggests missing-ingredient swaps via a 30-entry table plus LLM fallback, and persists saved recipes + shopping lists in SQLite via Prisma — covered by 35+ unit tests across 8 spec files.

---

## License

MIT — see `LICENSE`.

---

## Push to GitHub

After committing locally, push with:

```bash
gh repo create ai-recipe-finder --public --source=. --remote=origin --push
```
