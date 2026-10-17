import { describe, expect, it, vi } from "vitest";
import { createFakePlacesRepository } from "../adapters/supabase/fake-places-repository";
import { AppError } from "../lib/errors";
import type { LlmProvider } from "./ports";
import { createPlaceResearch } from "./research-place";

const places = createFakePlacesRepository();
const page = { url: "https://stacjamuranow.pl/pl/mural-bowiego/", title: "Mural Bowiego" };
const found = JSON.stringify({ findings: [{ text: "Bowie kupił tu płytę.", url: page.url }] });

async function anyPlace() {
  const [first] = await places.listInBBox({ minLng: -180, minLat: -90, maxLng: 180, maxLat: 90 });
  const place = first && (await places.getById(first.id));
  if (!place) throw new Error("fake repository is empty");
  return place;
}

function webLlm(answer = found) {
  const completeWithWeb = vi.fn<NonNullable<LlmProvider["completeWithWeb"]>>(async () => ({
    content: answer,
    citations: [page],
  }));
  return { model: "fake", complete: vi.fn(), completeWithWeb };
}

describe("createPlaceResearch", () => {
  it("searches the web with the place's name and returns the findings", async () => {
    const place = await anyPlace();
    const llm = webLlm();
    const findings = await createPlaceResearch({ llm }).find(place);

    expect(findings).toEqual([{ text: "Bowie kupił tu płytę.", url: page.url, title: page.title }]);
    expect(llm.completeWithWeb.mock.calls[0]?.[0].user).toContain(place.name);
  });

  it("searches once per place", async () => {
    const place = await anyPlace();
    const llm = webLlm();
    const research = createPlaceResearch({ llm });
    await Promise.all([research.find(place), research.find(place)]);
    await research.find(place);
    expect(llm.completeWithWeb).toHaveBeenCalledTimes(1);
  });

  it("finds nothing when the provider cannot search", async () => {
    const llm = { model: "fake", complete: vi.fn() };
    expect(await createPlaceResearch({ llm }).find(await anyPlace())).toEqual([]);
  });

  it("finds nothing when the search fails, and searches again next time", async () => {
    const place = await anyPlace();
    const llm = webLlm();
    llm.completeWithWeb.mockRejectedValueOnce(new AppError("UPSTREAM_ERROR", "boom"));
    const onError = vi.fn();
    const research = createPlaceResearch({ llm, onError });

    expect(await research.find(place)).toEqual([]);
    expect(onError).toHaveBeenCalledOnce();
    expect(await research.find(place)).toHaveLength(1);
  });

  it("stops waiting after waitMs, and the late findings serve the next ask", async () => {
    const place = await anyPlace();
    let finish: (v: { content: string; citations: (typeof page)[] }) => void = () => {};
    const llm = webLlm();
    llm.completeWithWeb.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    const research = createPlaceResearch({ llm, waitMs: 5 });

    expect(await research.find(place)).toEqual([]);
    finish({ content: found, citations: [page] });
    expect(await research.find(place)).toHaveLength(1);
    expect(llm.completeWithWeb).toHaveBeenCalledTimes(1);
  });
});
