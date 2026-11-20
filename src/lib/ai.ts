/**
 * Vision-based ingredient extraction for the AI-Powered Recipe Finder.
 *
 * Wraps the z-ai-web-dev-sdk `zai.chat.completions.createVision` endpoint
 * with a strict JSON-schema prompt that returns a list of detected
 * ingredients. The interface `VisionProvider` is pluggable so a
 * `MockProvider` can return deterministic output for tests and offline demos.
 *
 * Also exposes `ChatProvider` (text-only) for swap suggestions, mirroring
 * the pattern from the parent project so the AI layer stays uniform.
 */

import type { DetectedIngredient } from "@/lib/types";

export interface VisionProvider {
  /**
   * Send a base64-encoded JPEG image (with optional mime prefix) and the
   * extraction prompt, returning a JSON-parsed list of detected ingredients.
   */
  extractIngredients(args: {
    imageBase64: string;
    prompt: string;
  }): Promise<DetectedIngredient[]>;
}

export interface ChatProvider {
  /** Send a single text message and return the assistant response string. */
  complete(args: {
    systemPrompt: string;
    userMessage: string;
  }): Promise<string>;
}

let cachedVisionProvider: VisionProvider | null = null;
let cachedChatProvider: ChatProvider | null = null;

class ZaiVisionProvider implements VisionProvider {
  async extractIngredients(args: {
    imageBase64: string;
    prompt: string;
  }): Promise<DetectedIngredient[]> {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    // The SDK's createVision expects an image URL or base64 data URI in the
    // user content. We always pass a data URI to avoid network round-trips.
    const imageUri = args.imageBase64.startsWith("data:")
      ? args.imageBase64
      : `data:image/jpeg;base64,${args.imageBase64}`;
    const completion = await (zai.chat.completions as any).createVision({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: args.prompt },
            { type: "image_url", image_url: { url: imageUri } },
          ],
        },
      ],
    });
    const content: string =
      typeof completion === "string"
        ? completion
        : (completion?.choices?.[0]?.message?.content ?? "");
    return parseIngredientJson(content);
  }
}

class MockVisionProvider implements VisionProvider {
  async extractIngredients(args: {
    imageBase64: string;
    prompt: string;
  }): Promise<DetectedIngredient[]> {
    // Deterministic demo: return a small but varied pantry. The MockProvider
    // exists so the UI stays demoable offline (no real photo upload needed).
    return [
      { name: "tomato", quantity: "2", confidence: 0.92 },
      { name: "garlic", quantity: "1 head", confidence: 0.88 },
      { name: "pasta", quantity: "200 g", confidence: 0.81 },
      { name: "olive oil", quantity: "1 bottle", confidence: 0.74 },
      { name: "parmesan", quantity: "1 wedge", confidence: 0.6 },
      { name: "basil", quantity: "1 bunch", confidence: 0.55 },
    ];
  }
}

class ZaiChatProvider implements ChatProvider {
  async complete(args: {
    systemPrompt: string;
    userMessage: string;
  }): Promise<string> {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: args.systemPrompt },
        { role: "user", content: args.userMessage },
      ],
      thinking: { type: "disabled" },
    });
    if (typeof completion === "string") return completion;
    return (completion as any)?.choices?.[0]?.message?.content ?? "";
  }
}

class MockChatProvider implements ChatProvider {
  async complete(args: {
    systemPrompt: string;
    userMessage: string;
  }): Promise<string> {
    return `{"swaps":[]}`;
  }
}

export function getVisionProvider(): VisionProvider {
  if (cachedVisionProvider) return cachedVisionProvider;
  if (process.env.PKC_DISABLE_LLM === "1" || process.env.RECIPE_DISABLE_LLM === "1") {
    cachedVisionProvider = new MockVisionProvider();
    return cachedVisionProvider;
  }
  try {
    cachedVisionProvider = new ZaiVisionProvider();
  } catch (e) {
    console.warn(
      "[ai] ZaiVisionProvider unavailable, using MockVisionProvider:",
      (e as Error).message,
    );
    cachedVisionProvider = new MockVisionProvider();
  }
  return cachedVisionProvider;
}

export function getChatProvider(): ChatProvider {
  if (cachedChatProvider) return cachedChatProvider;
  if (process.env.PKC_DISABLE_LLM === "1" || process.env.RECIPE_DISABLE_LLM === "1") {
    cachedChatProvider = new MockChatProvider();
    return cachedChatProvider;
  }
  try {
    cachedChatProvider = new ZaiChatProvider();
  } catch (e) {
    console.warn(
      "[ai] ZaiChatProvider unavailable, using MockChatProvider:",
      (e as Error).message,
    );
    cachedChatProvider = new MockChatProvider();
  }
  return cachedChatProvider;
}

/** Test-only: override the cached providers. */
export function __setVisionProviderForTest(p: VisionProvider | null) {
  cachedVisionProvider = p;
}

export function __setChatProviderForTest(p: ChatProvider | null) {
  cachedChatProvider = p;
}

/**
 * Parse the assistant's text response into a list of detected ingredients.
 * Tolerates ```json fences and leading/trailing prose. Returns [] on
 * malformed JSON rather than throwing.
 */
export function parseIngredientJson(content: string): DetectedIngredient[] {
  if (!content) return [];
  let text = content.trim();
  // Strip ```json ... ``` code fences if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // Find the first balanced JSON object.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return [];
  const slice = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    const arr = Array.isArray(parsed?.ingredients) ? parsed.ingredients : [];
    return arr
      .map((it: any) => ({
        name: String(it?.name ?? "").trim(),
        quantity: it?.quantity != null ? String(it.quantity).trim() : undefined,
        confidence:
          typeof it?.confidence === "number" ? it.confidence : undefined,
      }))
      .filter((it: DetectedIngredient) => it.name.length > 0);
  } catch {
    return [];
  }
}
