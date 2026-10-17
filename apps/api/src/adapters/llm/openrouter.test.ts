import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../lib/errors";
import { createOpenRouterProvider, DEFAULT_OPENROUTER_MODEL } from "./openrouter";

const llm = createOpenRouterProvider({ apiKey: "test-key" });
const request = { system: "Jesteś Sawą.", user: "Miejsce: Kercelak", maxTokens: 100 };

afterEach(() => vi.unstubAllGlobals());

describe("createOpenRouterProvider", () => {
  it("sends both prompts with the key and returns the content", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ choices: [{ message: { content: '{"text":"Hej"}' } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await llm.complete(request)).toBe('{"text":"Hej"}');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer test-key");
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: DEFAULT_OPENROUTER_MODEL,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
      max_tokens: 100,
    });
  });

  it("turns an error answer into UPSTREAM_ERROR with the status", async () => {
    vi.stubGlobal("fetch", async () => new Response("no credits", { status: 402 }));
    const err = await llm.complete(request).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ code: "UPSTREAM_ERROR", message: expect.stringContaining("402") });
  });

  it("turns a timeout into UPSTREAM_TIMEOUT", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new DOMException("timed out", "TimeoutError");
    });
    await expect(llm.complete(request)).rejects.toMatchObject({ code: "UPSTREAM_TIMEOUT" });
  });

  it("searches the web with the plugin and returns the cited pages once each", async () => {
    const cite = (url: string, title = "") => ({
      type: "url_citation",
      url_citation: { url, title },
    });
    const fetchMock = vi.fn(async () =>
      Response.json({
        choices: [
          {
            message: {
              content: '{"findings":[]}',
              annotations: [
                cite("https://a.pl/x", "A"),
                cite("https://a.pl/x", "A"),
                cite("https://b.pl/"),
              ],
            },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const answer = await llm.completeWithWeb?.({ ...request, maxResults: 3 });
    expect(answer).toEqual({
      content: '{"findings":[]}',
      citations: [
        { url: "https://a.pl/x", title: "A" },
        { url: "https://b.pl/", title: "https://b.pl/" },
      ],
    });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      plugins: [{ id: "web", max_results: 3 }],
    });
  });

  it("streams the answer's pieces from server-sent events", async () => {
    const sse = [
      ": OPENROUTER PROCESSING\n\n",
      'data: {"choices":[{"delta":{"content":"{\\"text\\":"}}]}\n\ndata: {"choi',
      'ces":[{"delta":{"content":"\\"Hej\\"}"}}]}\n\n',
      "data: [DONE]\n\n",
    ];
    const fetchMock = vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(c) {
              for (const part of sse) c.enqueue(new TextEncoder().encode(part));
              c.close();
            },
          }),
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const pieces: string[] = [];
    for await (const piece of llm.stream?.(request) ?? []) pieces.push(piece);
    expect(pieces).toEqual(['{"text":', '"Hej"}']);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ stream: true });
  });
});
