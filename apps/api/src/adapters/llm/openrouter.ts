import { AppError } from "../../lib/errors";
import type { LlmProvider, LlmRequest, WebCitation } from "../../services/ports";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 20_000;
/** Searching and reading the pages takes longer than writing a story. */
const WEB_TIMEOUT_MS = 30_000;

/** Cheapest recent Gemini that writes decent Polish (OpenRouter, 17.10: $0.30 / $2.50 per 1M). */
export const DEFAULT_OPENROUTER_MODEL = "google/gemini-3.5-flash-lite";

export type OpenRouterOptions = {
  apiKey: string;
  model?: string;
};

type ChatAnswer = {
  choices?: {
    message?: {
      content?: string | null;
      annotations?: { type?: string; url_citation?: { url?: string; title?: string } }[];
    };
  }[];
};

type StreamEvent = {
  choices?: { delta?: { content?: string | null } }[];
  error?: { message?: string };
};

export function createOpenRouterProvider(options: OpenRouterOptions): LlmProvider {
  const model = options.model ?? DEFAULT_OPENROUTER_MODEL;

  async function send(
    { system, user, maxTokens }: LlmRequest,
    extra: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<Response> {
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
          ...extra,
        }),
        signal: AbortSignal.timeout(timeoutMs),
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
    return res;
  }

  async function chat(request: LlmRequest, extra: Record<string, unknown>, timeoutMs: number) {
    const res = await send(request, extra, timeoutMs);
    const message = ((await res.json()) as ChatAnswer).choices?.[0]?.message;
    if (!message?.content) {
      throw new AppError("UPSTREAM_ERROR", "OpenRouter answered without content");
    }
    return { content: message.content, annotations: message.annotations ?? [] };
  }

  return {
    model,
    async *stream(request) {
      const res = await send(request, { stream: true }, TIMEOUT_MS);
      if (!res.body) throw new AppError("UPSTREAM_ERROR", "OpenRouter answered without a body");
      // Server-sent events: `data: {json}` lines, `: comments` while the model warms up.
      let buffer = "";
      for await (const part of res.body.pipeThrough(new TextDecoderStream())) {
        buffer += part;
        for (let nl = buffer.indexOf("\n"); nl >= 0; nl = buffer.indexOf("\n")) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") return;
          const event = JSON.parse(data) as StreamEvent;
          if (event.error) {
            throw new AppError("UPSTREAM_ERROR", `OpenRouter stream: ${event.error.message ?? ""}`);
          }
          const delta = event.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        }
      }
    },
    async complete(request) {
      return (await chat(request, {}, TIMEOUT_MS)).content;
    },
    // OpenRouter's web plugin (Exa) searches with the user message and adds the pages to the prompt.
    async completeWithWeb({ maxResults, ...request }) {
      const { content, annotations } = await chat(
        request,
        { plugins: [{ id: "web", max_results: maxResults }], temperature: 0.3 },
        WEB_TIMEOUT_MS,
      );
      const citations: WebCitation[] = [];
      for (const a of annotations) {
        const url = a.url_citation?.url;
        if (a.type !== "url_citation" || !url || citations.some((c) => c.url === url)) continue;
        citations.push({ url, title: a.url_citation?.title || url });
      }
      return { content, citations };
    },
  };
}
