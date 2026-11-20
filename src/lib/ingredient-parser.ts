/**
 * Parse manual ingredient entry (textarea text) into a clean array of
 * ingredient names. Supports comma-separated, newline-separated, semicolon-
 * separated, and mixed input. Strips leading quantities and whitespace.
 *
 * Examples:
 *   "tomatoes, pasta, garlic"            -> ["tomatoes", "pasta", "garlic"]
 *   "2 tomatoes\n1 onion\nolive oil"      -> ["tomatoes", "onion", "olive oil"]
 *   "  chicken,  rice ; beans  "          -> ["chicken", "rice", "beans"]
 *   ""                                    -> []
 */

const SEPARATOR_RE = /[\n,;]+/;

/**
 * Strip a leading quantity from a single ingredient phrase, e.g.
 * "2 cups flour" -> "flour", "1.5 kg chicken" -> "chicken",
 * "1/2 tsp salt" -> "salt". Preserves multi-word ingredient names.
 */
export function stripLeadingQuantity(phrase: string): string {
  return phrase
    // 1. Strip a leading quantity like "2", "1/2", "1.5" (with optional
    //    trailing whitespace — \s* so a bare "2" also becomes "").
    .replace(/^\s*\d+([./]\d+)?\s*/i, "")
    // 2. Then strip a single leading unit word like "cups", "tbsp", "kg"
    //    (the digit prefix was already consumed above; \s* so a bare "cup"
    //    also becomes "").
    .replace(
      /^\s*(cup|cups|tbsp|tsp|teaspoon|teaspoons|tablespoon|tablespoons|g|kg|ml|l|oz|lb|lbs|pound|pounds|piece|pieces|clove|cloves|slice|slices|pinch|dash|small|medium|large|head|bunch|can|cans|stick|sticks|package|pkg|pack)\b\s*/i,
      "",
    )
    .trim();
}

export function parseManualIngredients(text: string): string[] {
  if (!text) return [];
  return text
    .split(SEPARATOR_RE)
    .map((raw) => stripLeadingQuantity(raw.trim()))
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0)
    // Drop duplicates (case-insensitive) while preserving order.
    .filter((s, i, arr) => {
      const lower = s.toLowerCase();
      return arr.findIndex((x) => x.toLowerCase() === lower) === i;
    });
}
