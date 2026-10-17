import { AppError } from "../../lib/errors";
import type { LlmProvider } from "../../services/ports";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 20_000;

/** Cheapest recent Gemini that writes decent Polish (OpenRouter, 17.10: $0.30 / $2.50 per 1M). */
export const DEFAULT_OPENROUTER_MODEL = "google/gemini-3.5-flash-lite";

export type OpenRouterOptions = {
  apiKey: string;
  model?: string;
};

export function createOpenRouterProvider(options: OpenRouterOptions): LlmProvider {
  const model = options.model ?? DEFAULT_OPENROUTER_MODEL;

  return {
    model,
    async complete({ system, user, maxTokens }) {
      let res: Response;
      try {
        res = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
            // Shown in the OpenRouter dashboard next to the spend.
            "X-Title": "Sawa",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: maxTokens,
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "TimeoutError") {
          throw new AppError("UPSTREAM_TIMEOUT", "LLM timed out", { cause: err });
        }
        throw new AppError("UPSTREAM_ERROR", "LLM unreachable", { cause: err });
      }
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 300);
        throw new AppError("UPSTREAM_ERROR", `OpenRouter answered ${res.status}: ${detail}`);
      }
      const body = (await res.json()) as {
        choices?: { message?: { content?: string | null } }[];
      };
      const content = body.choices?.[0]?.message?.content;
      if (!content) throw new AppError("UPSTREAM_ERROR", "OpenRouter answered without content");
      return content;
    },
  };
}
