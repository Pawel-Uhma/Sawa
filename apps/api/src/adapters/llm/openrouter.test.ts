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
});
