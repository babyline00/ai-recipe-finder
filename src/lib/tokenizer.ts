/**
 * Lightweight tokenizer used by fuzzy ingredient matching.
 *
 * Rules:
 *  - lowercase
 *  - strip punctuation and quantity prefixes ("2", "cups", "tbsp", etc.)
 *  - split on whitespace and non-alphanumeric
 *  - drop tokens shorter than 2 chars and common stop words
 *
 * Unlike a general text tokenizer, this one is tuned for ingredient names
 * like "1 cup buttermilk" -> ["buttermilk"] and "extra-virgin olive oil" ->
 * ["extra", "virgin", "olive", "oil"].
 */

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "then",
  "else",
  "for",
  "of",
  "to",
  "in",
  "on",
  "at",
  "by",
  "with",
  "from",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "cup",
  "cups",
  "tbsp",
  "tbsp",
  "tsp",
  "teaspoon",
  "teaspoons",
  "tablespoon",
  "tablespoons",
  "g",
  "kg",
  "ml",
  "l",
  "oz",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "piece",
  "pieces",
  "clove",
  "cloves",
  "slice",
  "slices",
  "pinch",
  "dash",
  "fresh",
  "ground",
  "powder",
]);

/** Singularize the simplest English plurals (tomatoes -> tomato). */
function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y"; // berries -> berry
  if (word.endsWith("oes")) return word.slice(0, -2); // tomatoes -> tomato
  if (word.endsWith("ses")) return word.slice(0, -2); // onionses -> onionse (rare)
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1); // eggs -> egg
  return word;
}

export function tokenize(text: string): string[] {
  if (!text) return [];
  // Strip leading quantities like "2", "1/2", "1.5" before tokenizing.
  const stripped = text
    .toLowerCase()
    .replace(/[`*_~#\[\](){}|>!]+/g, " ")
    .replace(/\b\d+([./]\d+)?\b/g, " ");
  const tokens: string[] = [];
  const re = /[\p{L}\p{N}]+/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const tok = m[0];
    if (tok.length < 2) continue;
    if (STOP_WORDS.has(tok)) continue;
    const sing = singularize(tok);
    if (sing !== tok && STOP_WORDS.has(sing)) continue;
    tokens.push(sing);
  }
  return tokens;
}

/**
 * Normalize an ingredient name for matching. Used to compare a pantry
 * ingredient like "Tomatoes" with a recipe ingredient like "tomato".
 */
export function normalizeIngredient(name: string): string {
  const toks = tokenize(name);
  return toks.join(" ").trim();
}

/**
 * Returns true if the two ingredient names are equivalent for matching
 * purposes — either they share a common token (e.g. "tomato" is in
 * "cherry tomato") or one is a substring of the other after normalization.
 */
export function ingredientsMatch(a: string, b: string): boolean {
  const na = normalizeIngredient(a);
  const nb = normalizeIngredient(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  // require at least one shared content token, with at least 4 chars to
  // avoid false positives like "oil" matching "foil".
  for (const t of ta) {
    if (t.length >= 4 && tb.has(t)) return true;
  }
  return false;
}
