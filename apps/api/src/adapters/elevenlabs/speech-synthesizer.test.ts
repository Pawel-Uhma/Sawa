import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../lib/errors";
import { createElevenLabsSynthesizer, SAWA_MODEL_ID, SAWA_VOICE_ID } from "./speech-synthesizer";

const synth = createElevenLabsSynthesizer({ apiKey: "test-key" });

afterEach(() => vi.unstubAllGlobals());

describe("createElevenLabsSynthesizer", () => {
  it("posts the text with Sawa's voice and model and returns the audio", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "audio/mpeg" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await synth.synthesize("Cześć");

    expect(result).toEqual({ audio: new Uint8Array([1, 2, 3]), contentType: "audio/mpeg" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(`/v1/text-to-speech/${SAWA_VOICE_ID}`);
    expect(new Headers(init.headers).get("xi-api-key")).toBe("test-key");
    expect(JSON.parse(init.body as string)).toMatchObject({
      text: "Cześć",
      model_id: SAWA_MODEL_ID,
    });
  });

  it("turns an error answer into UPSTREAM_ERROR with the status", async () => {
    vi.stubGlobal(
      "fetch",
      async () => new Response('{"detail":"quota_exceeded"}', { status: 401 }),
    );
    const err = await synth.synthesize("Cześć").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ code: "UPSTREAM_ERROR", message: expect.stringContaining("401") });
  });

  it("turns a timeout into UPSTREAM_TIMEOUT", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new DOMException("timed out", "TimeoutError");
    });
    await expect(synth.synthesize("Cześć")).rejects.toMatchObject({ code: "UPSTREAM_TIMEOUT" });
  });
});
