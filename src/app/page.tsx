"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ChefHat,
  Clock,
  ListChecks,
  Plus,
  RefreshCw,
  Save,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type {
  DetectedIngredient,
  MatchedRecipe,
  PantryItem,
  Recipe,
  RecipeTag,
  SwapSuggestion,
} from "@/lib/types";
import { listValidTags } from "@/lib/tag-filter";
import { formatMacros, formatMacrosCompact } from "@/lib/macro-formatter";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string | null;
  recipeId: string | null;
  purchased: boolean;
  addedAt: string;
}

interface Stats {
  recipes: number;
  scans: number;
  saved: number;
  shoppingListItems: number;
}

const ALL_TAGS = listValidTags();

const TAG_LABELS: Record<RecipeTag, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  "gluten-free": "Gluten-Free",
  "dairy-free": "Dairy-Free",
  keto: "Keto",
  whole30: "Whole30",
};

export default function HomePage() {
  const [manualText, setManualText] = useState(
    "tomatoes, garlic, olive oil, pasta, parmesan, basil",
  );
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [detected, setDetected] = useState<DetectedIngredient[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [matches, setMatches] = useState<MatchedRecipe[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeTags, setActiveTags] = useState<RecipeTag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    recipes: 0,
    scans: 0,
    saved: 0,
    shoppingListItems: 0,
  });
  const [swapsState, setSwapsState] = useState<{
    open: boolean;
    loading: boolean;
    recipe: Recipe | null;
    swaps: SwapSuggestion[];
  }>({ open: false, loading: false, recipe: null, swaps: [] });
  const [initialLoading, setInitialLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Load recipes + shopping list + stats on first render. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [recipesRes, listRes, statsRes] = await Promise.all([
          fetch("/api/recipes"),
          fetch("/api/shopping-list"),
          fetch("/api/stats"),
        ]);
        if (cancelled) return;
        if (recipesRes.ok) {
          const json = await recipesRes.json();
          setRecipes(Array.isArray(json.recipes) ? json.recipes : []);
        }
        if (listRes.ok) {
          const json = await listRes.json();
          setShoppingList(Array.isArray(json.items) ? json.items : []);
        }
        if (statsRes.ok) {
          const json = await statsRes.json();
          setStats(json);
        }
      } catch (e) {
        console.error("[init] error:", e);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Auto-match recipes against the manual pantry when recipes first load. */
  useEffect(() => {
    if (recipes.length === 0) return;
    if (matches.length > 0) return;
    runManualMatch(manualText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes.length]);

  const refreshShoppingList = useCallback(async () => {
    try {
      const res = await fetch("/api/shopping-list");
      if (res.ok) {
        const json = await res.json();
        setShoppingList(Array.isArray(json.items) ? json.items : []);
      }
    } catch (e) {
      console.error("[refresh] shopping list error:", e);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error("[refresh] stats error:", e);
    }
  }, []);

  const runManualMatch = useCallback(
    async (text: string) => {
      setScanLoading(true);
      try {
        const res = await fetch("/api/scan/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setDetected([]);
        setPantry(json.pantry ?? []);
        setMatches(json.matches ?? []);
      } catch (e) {
        console.error("[manual match] error:", e);
        toast.error("Could not match recipes");
      } finally {
        setScanLoading(false);
      }
    },
    [],
  );

  const runScan = useCallback(async () => {
    setScanLoading(true);
    try {
      if (photoBase64) {
        // Send multipart upload.
        const blob = await (await fetch(photoBase64)).blob();
        const form = new FormData();
        form.append("file", blob, photoName ?? "fridge.jpg");
        if (manualText.trim()) form.append("manualIngredients", manualText);
        const res = await fetch("/api/scan", { method: "POST", body: form });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setDetected(json.detected ?? []);
        setPantry(json.pantry ?? []);
        setMatches(json.matches ?? []);
        toast.success(`Detected ${(json.detected ?? []).length} ingredients`);
      } else {
        await runManualMatch(manualText);
      }
      refreshStats();
    } catch (e) {
      console.error("[scan] error:", e);
      toast.error("Scan failed");
    } finally {
      setScanLoading(false);
    }
  }, [photoBase64, photoName, manualText, runManualMatch, refreshStats]);

  const onFileSelected = useCallback(
    async (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoBase64(String(reader.result));
        setPhotoName(file.name);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const toggleTag = useCallback((tag: RecipeTag) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  /** Filter the matched recipes (or full list) by active tags + search query. */
  const filteredMatches: MatchedRecipe[] = useMemo(() => {
    const base =
      matches.length > 0
        ? matches
        : recipes.map((r) => ({
            recipe: r,
            matchPercent: 0,
            missingIngredients: r.ingredients.map((i) => i.name),
            matchedIngredients: [],
          }));
    let list = base;
    if (activeTags.length > 0) {
      list = list.filter((m) =>
        activeTags.every((t) => m.recipe.tags.includes(t)),
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.recipe.title.toLowerCase().includes(q) ||
          m.recipe.cuisine.toLowerCase().includes(q),
      );
    }
    return list;
  }, [matches, recipes, activeTags, searchQuery]);

  const saveRecipe = useCallback(
    async (recipe: Recipe) => {
      const isSaved = savedIds.has(recipe.id);
      try {
        const res = await fetch(`/api/recipes/${recipe.id}/save`, {
          method: isSaved ? "DELETE" : "POST",
        });
        if (!res.ok) throw new Error(await res.text());
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (isSaved) next.delete(recipe.id);
          else next.add(recipe.id);
          return next;
        });
        toast.success(isSaved ? "Removed from saved" : "Saved to favorites");
        refreshStats();
      } catch (e) {
        console.error("[save] error:", e);
        toast.error("Could not update saved state");
      }
    },
    [savedIds, refreshStats],
  );

  const fetchSwaps = useCallback(async (recipe: Recipe) => {
    setSwapsState({ open: true, loading: true, recipe, swaps: [] });
    try {
      const missing = recipe.ingredients.map((i) => i.name);
      const res = await fetch(`/api/recipes/${recipe.id}/swaps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missingIngredients: missing }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setSwapsState((s) => ({
        ...s,
        loading: false,
        swaps: Array.isArray(json.swaps) ? json.swaps : [],
      }));
    } catch (e) {
      console.error("[swaps] error:", e);
      setSwapsState((s) => ({ ...s, loading: false, swaps: [] }));
      toast.error("Could not load swaps");
    }
  }, []);

  const addMissingToShoppingList = useCallback(
    async (recipe: Recipe) => {
      const missing = recipe.ingredients
        .filter((i) => {
          // Re-check against the active pantry (rough): use the matches list to find this recipe.
          const m = matches.find((mm) => mm.recipe.id === recipe.id);
          if (!m) return true;
          return m.missingIngredients.includes(i.name);
        })
        .map((i) => ({ name: i.name, quantity: i.quantity, recipeId: recipe.id }));
      if (missing.length === 0) {
        toast.success("You already have everything for this recipe!");
        return;
      }
      let added = 0;
      for (const item of missing) {
        try {
          const res = await fetch("/api/shopping-list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          });
          if (res.ok) added += 1;
        } catch (e) {
          console.error("[add to list] error:", e);
        }
      }
      toast.success(`Added ${added} items to your list`);
      refreshShoppingList();
      refreshStats();
    },
    [matches, refreshShoppingList, refreshStats],
  );

  const togglePurchased = useCallback(
    async (item: ShoppingItem) => {
      try {
        const res = await fetch(`/api/shopping-list/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purchased: !item.purchased }),
        });
        if (!res.ok) throw new Error(await res.text());
        setShoppingList((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, purchased: !item.purchased } : i,
          ),
        );
      } catch (e) {
        console.error("[toggle purchased] error:", e);
        toast.error("Could not update item");
      }
    },
    [],
  );

  const deleteShoppingItem = useCallback(async (item: ShoppingItem) => {
    try {
      const res = await fetch(`/api/shopping-list/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      setShoppingList((prev) => prev.filter((i) => i.id !== item.id));
      refreshStats();
    } catch (e) {
      console.error("[delete shopping item] error:", e);
      toast.error("Could not delete item");
    }
  }, [refreshStats]);

  const removePantryItem = useCallback(
    (name: string) => {
      setPantry((prev) => prev.filter((p) => p.name !== name));
    },
    [],
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ChefHat className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-none">
                  AI Recipe Finder
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Cook with what you have.
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm">
              <StatPill label="Recipes" value={stats.recipes} />
              <StatPill label="Scans" value={stats.scans} />
              <StatPill label="Saved" value={stats.saved} />
              <StatPill label="List" value={stats.shoppingListItems} />
            </div>
          </div>
        </div>
      </header>

      {/* Main grid: left input | center matches | right shopping list */}
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* LEFT: photo + manual input + filters */}
          <section className="md:col-span-4 lg:col-span-3 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Snap your fridge
                </CardTitle>
                <CardDescription>
                  Upload a photo of your fridge or pantry for AI ingredient
                  detection. Or just type what you have below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="photo">Fridge / pantry photo</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onFileSelected(f);
                    }}
                  />
                  {photoBase64 && (
                    <div className="relative mt-2 rounded-md overflow-hidden border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoBase64}
                        alt="fridge preview"
                        className="h-32 w-full object-cover"
                      />
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => {
                          setPhotoBase64(null);
                          setPhotoName(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-1 hover:bg-black/80"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual">Or list ingredients manually</Label>
                  <Textarea
                    id="manual"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="tomatoes, pasta, garlic, olive oil, parmesan"
                    rows={5}
                    className="resize-y"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma, newline, or semicolon separated. Quantities are
                    stripped automatically.
                  </p>
                </div>
                <Button
                  onClick={runScan}
                  disabled={scanLoading}
                  className="w-full"
                  size="lg"
                >
                  {scanLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Matching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Find recipes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Detected / pantry chips */}
            {detected.length > 0 || pantry.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Your pantry ({pantry.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto scrollbar-thin">
                    {pantry.map((p) => (
                      <Badge
                        key={p.name}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {p.name}
                        <button
                          aria-label={`Remove ${p.name}`}
                          onClick={() => removePantryItem(p.name)}
                          className="ml-1 rounded-full hover:bg-background/60"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  {detected.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-3">
                      {detected.length} detected from photo (highest confidence:{" "}
                      {Math.round(
                        Math.max(...detected.map((d) => d.confidence ?? 0)) * 100,
                      )}
                      %).
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* Diet filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Diet filters</CardTitle>
                <CardDescription>
                  Stack multiple tags to narrow down the results.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {ALL_TAGS.map((tag) => (
                  <label
                    key={tag}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={activeTags.includes(tag)}
                      onCheckedChange={() => toggleTag(tag)}
                    />
                    <span className="text-sm">{TAG_LABELS[tag]}</span>
                  </label>
                ))}
              </CardContent>
            </Card>
          </section>

          {/* CENTER: matched recipes */}
          <section className="md:col-span-8 lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {matches.length > 0
                    ? "Top 5 recipes you can make now"
                    : "All recipes"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {filteredMatches.length} shown
                </p>
              </div>
              <Input
                placeholder="Search by title or cuisine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
            </div>

            {scanLoading && initialLoading ? (
              <RecipeSkeletonList />
            ) : filteredMatches.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <ChefHat className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  No recipes match your filters. Try clearing tags or adding
                  more ingredients to your pantry.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredMatches.slice(0, 10).map((m) => (
                  <RecipeCard
                    key={m.recipe.id}
                    match={m}
                    saved={savedIds.has(m.recipe.id)}
                    onSave={() => saveRecipe(m.recipe)}
                    onViewSwaps={() => fetchSwaps(m.recipe)}
                    onAddToList={() => addMissingToShoppingList(m.recipe)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* RIGHT: shopping list */}
          <aside className="md:col-span-12 lg:col-span-3">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Shopping list
                </CardTitle>
                <CardDescription>
                  Missing ingredients you add to your list.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {shoppingList.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No items yet. Use the &quot;Add missing to list&quot;
                    button on a recipe card.
                  </div>
                ) : (
                  <ScrollArea className="h-72 pr-2">
                    <ul className="space-y-2">
                      {shoppingList.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start gap-2 rounded-md border p-2"
                        >
                          <Checkbox
                            checked={item.purchased}
                            onCheckedChange={() => togglePurchased(item)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-sm font-medium truncate",
                                item.purchased && "line-through text-muted-foreground",
                              )}
                            >
                              {item.name}
                            </p>
                            {item.quantity && (
                              <p className="text-xs text-muted-foreground">
                                {item.quantity}
                              </p>
                            )}
                          </div>
                          <button
                            aria-label={`Delete ${item.name}`}
                            onClick={() => deleteShoppingItem(item)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
                {shoppingList.length > 0 && (
                  <div className="mt-4 pt-3 border-t text-xs text-muted-foreground flex justify-between">
                    <span>
                      {
                        shoppingList.filter((i) => i.purchased).length
                      }{" "}
                      of {shoppingList.length} purchased
                    </span>
                    <span>
                      {shoppingList.length} total
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <footer className="mt-auto border-t bg-muted/30">
        <div className="container mx-auto max-w-7xl px-4 py-4 text-center text-xs text-muted-foreground">
          AI Recipe Finder — vision ingredient extraction, recipe matching &
          swap suggestions. MVP runs entirely on a hardcoded dataset.
        </div>
      </footer>

      {/* Swaps Dialog */}
      <Dialog
        open={swapsState.open}
        onOpenChange={(o) =>
          setSwapsState((s) => ({ ...s, open: o }))
        }
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Swaps for {swapsState.recipe?.title}
            </DialogTitle>
            <DialogDescription>
              Substitute any ingredient you don&apos;t have on hand.
            </DialogDescription>
          </DialogHeader>
          {swapsState.loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : swapsState.swaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No swaps returned. Try another recipe or add the missing
              ingredients to your shopping list.
            </p>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-2">
              <ul className="space-y-2">
                {swapsState.swaps.map((s) => (
                  <li
                    key={s.ingredient}
                    className="rounded-md border p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{s.ingredient}</span>
                      <Badge variant="outline" className="text-xs">
                        {s.source === "table"
                          ? "table"
                          : s.source === "llm"
                            ? "AI"
                            : "—"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {s.substitute}
                    </p>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card px-2.5 py-1.5 text-center min-w-[64px]">
      <div className="text-base font-semibold leading-none">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

function RecipeCard({
  match,
  saved,
  onSave,
  onViewSwaps,
  onAddToList,
}: {
  match: MatchedRecipe;
  saved: boolean;
  onSave: () => void;
  onViewSwaps: () => void;
  onAddToList: () => void;
}) {
  const r = match.recipe;
  const pct = Math.round(match.matchPercent * 100);
  const total = r.ingredients.length;
  const matched = match.matchedIngredients.length;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              {r.title}
            </CardTitle>
            <CardDescription className="mt-1">
              {r.cuisine} • {r.difficulty}
            </CardDescription>
          </div>
          <Button
            variant={saved ? "default" : "outline"}
            size="sm"
            onClick={onSave}
            aria-pressed={saved}
            aria-label={saved ? "Unsave recipe" : "Save recipe"}
          >
            <Save className="h-3.5 w-3.5" />
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Match bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              You have {matched} of {total} ingredients
            </span>
            <span className="font-medium">{pct}% match</span>
          </div>
          <Progress value={pct} />
        </div>

        {/* Tags + meta */}
        <div className="flex flex-wrap gap-1.5">
          {r.tags.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px]">
              {t}
            </Badge>
          ))}
        </div>

        {/* Times + macros */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            prep {r.prepTime}m • cook {r.cookTime}m • serves {r.servings}
          </div>
          <div className="text-right font-mono text-muted-foreground">
            {formatMacrosCompact(r.macros)}
          </div>
        </div>

        <Separator />

        {/* Ingredients split */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-medium text-emerald-600 dark:text-emerald-400 mb-1">
              Have it ({matched})
            </p>
            <ul className="space-y-0.5 text-muted-foreground max-h-24 overflow-y-auto scrollbar-thin">
              {match.matchedIngredients.map((n) => (
                <li key={n}>{n}</li>
              ))}
              {match.matchedIngredients.length === 0 && (
                <li className="italic">—</li>
              )}
            </ul>
          </div>
          <div>
            <p className="font-medium text-rose-600 dark:text-rose-400 mb-1">
              Missing ({match.missingIngredients.length})
            </p>
            <ul className="space-y-0.5 text-muted-foreground max-h-24 overflow-y-auto scrollbar-thin">
              {match.missingIngredients.map((n) => (
                <li key={n}>{n}</li>
              ))}
              {match.missingIngredients.length === 0 && (
                <li className="italic">You have everything!</li>
              )}
            </ul>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {formatMacros(r.macros, r.servings)}
        </p>
      </CardContent>
      <CardFooter className="gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onAddToList}>
          <Plus className="h-3.5 w-3.5" />
          Add missing to list
        </Button>
        <Button variant="secondary" size="sm" onClick={onViewSwaps}>
          <Sparkles className="h-3.5 w-3.5" />
          View swaps
        </Button>
      </CardFooter>
    </Card>
  );
}

function RecipeSkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-1/4 mt-2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-2 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
